import { Router, type Request, type Response } from "express";
import type {
  ITunesTrack,
  TransferEvent,
  MatchResult,
  PlaylistTransferResult,
  TransferSummary,
} from "@tunetransfer/shared";
import {
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
  delay,
  refreshSpotifyToken,
  preflightCheck,
} from "../lib/spotify.js";
import { findBestMatch, buildSearchQuery, buildFallbackQuery } from "../lib/matcher.js";

const router: Router = Router();

// ── Helpers ──────────────────────────────────────────────────

const TRACK_TIMEOUT_MS = 30_000; // 30s max per track (includes retries)

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// ── Types ────────────────────────────────────────────────────

interface TransferRequestBody {
  playlists: Array<{ name: string; tracks: ITunesTrack[] }>;
  spotifyAccessToken: string;
  spotifyRefreshToken?: string;
  spotifyUserId: string;
}

// ── Preflight endpoint ───────────────────────────────────────

/**
 * POST /api/transfer/preflight
 * Quick check that the Spotify token works and API is reachable.
 */
router.post("/preflight", async (req: Request, res: Response) => {
  const { spotifyAccessToken } = req.body as { spotifyAccessToken: string };

  if (!spotifyAccessToken) {
    return res.status(400).json({ ok: false, error: "Missing spotifyAccessToken" });
  }

  const result = await preflightCheck(spotifyAccessToken);
  return res.json(result);
});

// ── Main transfer endpoint ───────────────────────────────────

/**
 * POST /api/transfer/start
 * Streams SSE events as it matches and transfers playlists to Spotify.
 */
router.post("/start", async (req: Request, res: Response) => {
  const { playlists, spotifyAccessToken, spotifyRefreshToken, spotifyUserId } =
    req.body as TransferRequestBody;

  // Validate before starting SSE
  if (!playlists?.length || !spotifyAccessToken || !spotifyUserId) {
    return res.status(400).json({
      error: "Missing required fields: playlists, spotifyAccessToken, spotifyUserId",
    });
  }

  console.log(`[transfer] Starting transfer: ${playlists.length} playlists, user=${spotifyUserId}`);

  // Set up SSE — flush headers immediately so proxies don't buffer
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Disable Nagle's algorithm to ensure each write flushes immediately
  res.socket?.setNoDelay(true);
  res.flushHeaders();

  // Track client disconnect via the RESPONSE close event (not request close,
  // which fires as soon as the POST body is consumed).
  let clientDisconnected = false;
  res.on("close", () => {
    clientDisconnected = true;
    console.log("[transfer] Client disconnected");
  });

  function send(event: TransferEvent) {
    if (clientDisconnected) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  try {
    const playlistResults: PlaylistTransferResult[] = [];

    // Token management: refresh proactively before expiry
    let currentToken = spotifyAccessToken;
    let tokenRefreshedAt = Date.now();
    const TOKEN_REFRESH_INTERVAL = 20 * 60 * 1000; // Refresh every 20 min (tokens last 60 min)

    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    async function ensureFreshToken() {
      if (!spotifyRefreshToken) return;
      if (Date.now() - tokenRefreshedAt < TOKEN_REFRESH_INTERVAL) return;
      try {
        const clientId = process.env.SPOTIFY_CLIENT_ID!;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
        const refreshed = await refreshSpotifyToken(spotifyRefreshToken, clientId, clientSecret);
        currentToken = refreshed.access_token;
        tokenRefreshedAt = Date.now();
        console.log("[transfer] Token refreshed successfully");
      } catch (err) {
        console.error("[transfer] Token refresh failed:", err);
        throw new Error("Spotify token refresh failed — please reconnect your Spotify account and try again.");
      }
    }

    for (const playlist of playlists) {
      if (clientDisconnected) break;

      // Proactively refresh token before each playlist
      await ensureFreshToken();

      console.log(`[transfer] Starting "${playlist.name}" (${playlist.tracks.length} tracks)`);

      send({
        type: "playlist:start",
        playlistName: playlist.name,
        trackCount: playlist.tracks.length,
      });

      const matchResults: MatchResult[] = [];
      const matchedUris: string[] = [];

      for (const track of playlist.tracks) {
        if (clientDisconnected) break;

        const trackLabel = `${track.artist} — ${track.name}`;

        // onRetry callback — sends SSE event when rate-limited
        const onRetry = (waitSeconds: number) => {
          send({
            type: "track:retrying",
            playlistName: playlist.name,
            track: trackLabel,
            waitSeconds,
          });
        };

        try {
          // Wrap entire track search in a timeout so nothing can hang forever
          const match = await withTimeout(
            (async () => {
              // Primary search with field filters
              const query = buildSearchQuery(track);
              const candidates = await searchTracks(query, currentToken, { onRetry });
              let result = findBestMatch(track, candidates);

              // Fallback: freeform search if field-filtered search found nothing
              if (!result) {
                const fallbackQuery = buildFallbackQuery(track);
                console.log(`[fallback] "${trackLabel}" → q="${fallbackQuery}"`);
                const fallbackCandidates = await searchTracks(fallbackQuery, currentToken, { onRetry });
                result = findBestMatch(track, fallbackCandidates);
                if (!result && fallbackCandidates.length > 0) {
                  console.log(`[miss] Top result was: "${fallbackCandidates[0].artist} — ${fallbackCandidates[0].name}"`);
                } else if (!result) {
                  console.log(`[miss] Spotify returned 0 results for fallback query`);
                }
              }

              return result;
            })(),
            TRACK_TIMEOUT_MS,
            trackLabel,
          );

          if (match) {
            consecutiveErrors = 0; // Reset on success
            matchResults.push({ status: "matched", source: track, match });
            matchedUris.push(match.spotifyUri);
            send({
              type: "track:matched",
              playlistName: playlist.name,
              track: trackLabel,
              confidence: match.confidence,
            });
          } else {
            matchResults.push({
              status: "unmatched",
              source: track,
              reason: "No confident match found",
            });
            send({
              type: "track:unmatched",
              playlistName: playlist.name,
              track: trackLabel,
              reason: "No confident match found",
            });
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : "Search failed";
          console.error(`[transfer] Track error for "${trackLabel}":`, reason);

          consecutiveErrors++;

          // If we get many consecutive errors, the token is likely dead — abort
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            const is401 = reason.includes("401");
            const abortMsg = is401
              ? "Spotify token expired — please reconnect and try again."
              : `Transfer aborted after ${MAX_CONSECUTIVE_ERRORS} consecutive failures: ${reason}`;
            console.error(`[transfer] Aborting: ${abortMsg}`);
            send({ type: "error", message: abortMsg });
            res.end();
            return;
          }

          matchResults.push({
            status: "unmatched",
            source: track,
            reason,
          });
          send({
            type: "track:unmatched",
            playlistName: playlist.name,
            track: trackLabel,
            reason,
          });
        }

        await delay(1000); // 1s between tracks — stays under Spotify's ~30 req/30s dev mode limit
      }

      if (clientDisconnected) break;

      // Create Spotify playlist and add matched tracks
      let spotifyPlaylistId: string | null = null;
      let spotifyPlaylistUrl: string | null = null;

      if (matchedUris.length > 0) {
        try {
          const created = await createPlaylist(
            spotifyUserId,
            playlist.name,
            currentToken,
          );
          spotifyPlaylistId = created.id;
          spotifyPlaylistUrl = created.url;

          send({
            type: "playlist:created",
            playlistName: playlist.name,
            spotifyUrl: created.url,
          });

          await addTracksToPlaylist(created.id, matchedUris, currentToken);
          console.log(`[transfer] Created playlist "${playlist.name}" with ${matchedUris.length} tracks`);
        } catch (err) {
          // Playlist creation/population failed — log and continue with next playlist
          console.error(`[transfer] Failed to create/populate playlist "${playlist.name}":`, err);
        }
      }

      const matchedCount = matchResults.filter((r) => r.status === "matched").length;
      const unmatchedCount = matchResults.filter((r) => r.status === "unmatched").length;

      console.log(`[transfer] Completed "${playlist.name}": ${matchedCount} matched, ${unmatchedCount} unmatched`);

      send({
        type: "playlist:complete",
        playlistName: playlist.name,
        matched: matchedCount,
        unmatched: unmatchedCount,
      });

      playlistResults.push({
        playlistName: playlist.name,
        spotifyPlaylistId,
        spotifyPlaylistUrl,
        totalTracks: playlist.tracks.length,
        matchedCount,
        unmatchedCount,
        results: matchResults,
      });
    }

    if (!clientDisconnected) {
      const summary: TransferSummary = {
        totalPlaylists: playlistResults.length,
        totalTracks: playlistResults.reduce((s, p) => s + p.totalTracks, 0),
        totalMatched: playlistResults.reduce((s, p) => s + p.matchedCount, 0),
        totalUnmatched: playlistResults.reduce((s, p) => s + p.unmatchedCount, 0),
        playlists: playlistResults,
      };

      console.log(`[transfer] Complete: ${summary.totalMatched}/${summary.totalTracks} matched across ${summary.totalPlaylists} playlists`);
      send({ type: "transfer:complete", summary });
    }
  } catch (err) {
    console.error("[transfer] Fatal error:", err);
    send({
      type: "error",
      message: err instanceof Error ? err.message : "Transfer failed",
    });
  }

  res.end();
});

export default router;
