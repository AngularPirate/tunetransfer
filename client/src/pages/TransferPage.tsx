import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import type { TransferEvent } from "@tunetransfer/shared";

interface TrackEvent {
  id: number;
  track: string;
  matched: boolean;
  confidence?: number;
}

const STALL_TIMEOUT_MS = 45_000; // Show warning if no event for 45s

export function TransferPage() {
  const playlists = useTransferStore((s) => s.playlists);
  const selectedPlaylistIds = useTransferStore((s) => s.selectedPlaylistIds);
  const spotifyAccessToken = useTransferStore((s) => s.spotifyAccessToken);
  const spotifyRefreshToken = useTransferStore((s) => s.spotifyRefreshToken);
  const spotifyUser = useTransferStore((s) => s.spotifyUser);
  const setSpotifyAuth = useTransferStore((s) => s.setSpotifyAuth);
  const setTransferSummary = useTransferStore((s) => s.setTransferSummary);
  const setStep = useTransferStore((s) => s.setStep);

  const [currentPlaylist, setCurrentPlaylist] = useState<string | null>(null);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const [completedPlaylists, setCompletedPlaylists] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrackCount, setCurrentTrackCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<TrackEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const startedRef = useRef(false);
  const eventIdRef = useRef(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  const selected = playlists.filter((p) =>
    selectedPlaylistIds.has(p.persistentId)
  );

  const canStart = !!spotifyAccessToken && !!spotifyUser && selected.length > 0;

  // Reset stall timer on every SSE event
  const resetStallTimer = useCallback(() => {
    setStalled(false);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => setStalled(true), STALL_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (startedRef.current || !canStart) return;
    startedRef.current = true;

    const payload = selected.map((p) => ({ name: p.name, tracks: p.tracks }));

    setTotalPlaylists(payload.length);

    const controller = new AbortController();
    controllerRef.current = controller;

    (async () => {
      try {
        // Refresh the Spotify token before starting
        let token = spotifyAccessToken!;
        if (spotifyRefreshToken) {
          try {
            const refreshRes = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: spotifyRefreshToken }),
              signal: controller.signal,
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              token = data.access_token;
              setSpotifyAuth(
                spotifyUser!,
                data.access_token,
                data.refresh_token ?? spotifyRefreshToken
              );
            }
          } catch {
            // If refresh fails, try with the existing token
          }
        }

        // Preflight check — validate Spotify API is reachable before starting
        try {
          const preflightRes = await fetch("/api/transfer/preflight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spotifyAccessToken: token }),
            signal: controller.signal,
          });
          const preflight = await preflightRes.json();
          if (!preflight.ok) {
            setError(
              preflight.status === 401
                ? "Spotify access token expired. Please re-connect your Spotify account."
                : `Spotify API check failed: ${preflight.error}`
            );
            return;
          }
          console.log(`[preflight] Spotify OK — userId=${preflight.userId}, latency=${preflight.latencyMs}ms`);
        } catch {
          setError("Could not reach the server. Please check your connection.");
          return;
        }

        // Start the transfer — kick off stall timer
        resetStallTimer();

        const res = await fetch("/api/transfer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlists: payload,
            spotifyAccessToken: token,
            spotifyRefreshToken: spotifyRefreshToken,
            spotifyUserId: spotifyUser!.id,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          setError(text || "Transfer request failed");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);

            let event: TransferEvent;
            try {
              event = JSON.parse(json);
            } catch {
              continue;
            }

            resetStallTimer();
            handleEvent(event);
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message ?? "Transfer failed");
        }
      } finally {
        if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      }
    })();

    return () => {
      controller.abort();
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [canStart]);

  function handleEvent(event: TransferEvent) {
    switch (event.type) {
      case "playlist:start":
        setCurrentPlaylist(event.playlistName);
        setCurrentTrackIndex(0);
        setCurrentTrackCount(event.trackCount);
        setMatchedCount(0);
        setUnmatchedCount(0);
        setRecentEvents([]);
        setRetryStatus(null);
        break;

      case "track:matched":
        setCurrentTrackIndex((i) => i + 1);
        setMatchedCount((c) => c + 1);
        setRetryStatus(null);
        addRecentEvent(event.track, true, event.confidence);
        break;

      case "track:unmatched":
        setCurrentTrackIndex((i) => i + 1);
        setUnmatchedCount((c) => c + 1);
        setRetryStatus(null);
        addRecentEvent(event.track, false);
        break;

      case "track:retrying":
        setRetryStatus(`Rate limited — retrying in ${event.waitSeconds}s...`);
        break;

      case "playlist:complete":
        setCompletedPlaylists((c) => c + 1);
        setRetryStatus(null);
        break;

      case "transfer:complete":
        setTransferSummary(event.summary);
        setStep("results");
        break;

      case "error":
        setError(event.message);
        break;
    }
  }

  function addRecentEvent(track: string, matched: boolean, confidence?: number) {
    const id = ++eventIdRef.current;
    setRecentEvents((prev) => [{ id, track, matched, confidence }, ...prev].slice(0, 5));
  }

  const overallProgress =
    totalPlaylists > 0
      ? ((completedPlaylists + (currentTrackCount > 0 ? currentTrackIndex / currentTrackCount : 0)) /
          totalPlaylists) *
        100
      : 0;

  const trackProgress =
    currentTrackCount > 0 ? (currentTrackIndex / currentTrackCount) * 100 : 0;

  // ── Missing prerequisites ──────────────────────────────────
  if (!canStart && !startedRef.current) {
    return (
      <div className="flex flex-col items-center text-center pt-12">
        <FadeIn up>
          <div className="w-12 h-12 rounded-full bg-charcoal-800/5 flex items-center justify-center mb-4 mx-auto">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-charcoal-700/40"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">
            Not ready to transfer
          </h2>
          <p className="text-sm text-charcoal-700/60 mb-6 max-w-sm">
            {!spotifyAccessToken
              ? "You need to connect your Spotify account first."
              : selected.length === 0
                ? "No playlists selected. Go back and choose which playlists to transfer."
                : "Something went wrong. Please try again."}
          </p>
          <Button
            variant="ghost"
            onClick={() =>
              setStep(!spotifyAccessToken ? "connect" : "review")
            }
          >
            Go back
          </Button>
        </FadeIn>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center text-center pt-12">
        <FadeIn up>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">
            Transfer failed
          </h2>
          <p className="text-sm text-charcoal-700/60 mb-6 max-w-sm">{error}</p>
          <Button variant="ghost" onClick={() => setStep("connect")}>
            Go back
          </Button>
        </FadeIn>
      </div>
    );
  }

  // ── Active transfer ────────────────────────────────────────
  return (
    <div className="flex flex-col items-center text-center pt-4">
      <FadeIn up>
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-charcoal-900 mb-2">
          Transferring your music
        </h2>
        <p className="text-sm text-charcoal-700/60 max-w-sm mx-auto mb-8">
          Sit tight — we're matching your tracks on Spotify.
        </p>
      </FadeIn>

      {/* Stall warning */}
      {stalled && (
        <div className="w-full max-w-md mb-4 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-amber-800">
            Transfer appears stalled — the server may be rate-limited.
          </p>
          <button
            className="text-xs font-medium text-amber-700 hover:text-amber-900 underline ml-3"
            onClick={() => {
              controllerRef.current?.abort();
              setError("Transfer cancelled");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Overall progress — prominent bar with percentage */}
      <FadeIn up delay={150} className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-charcoal-800">
            Overall progress
          </span>
          <span className="text-sm font-semibold text-sage-600">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="bg-charcoal-800/8 rounded-full h-3.5 overflow-hidden">
          <motion.div
            className="bg-sage-500 h-3.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-charcoal-700/40 mt-2">
          {completedPlaylists} of {totalPlaylists} playlists complete
        </p>
      </FadeIn>

      {/* Current playlist card */}
      {currentPlaylist && (
        <FadeIn up delay={250} className="bg-white/60 ring-1 ring-charcoal-800/8 rounded-2xl px-8 py-6 w-full max-w-md mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-sage-500/20 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-charcoal-800">
              {currentPlaylist}
            </p>
          </div>

          <div className="bg-charcoal-800/5 rounded-full h-1.5 overflow-hidden mb-3">
            <motion.div
              className="bg-sage-500/60 h-1.5 rounded-full"
              animate={{ width: `${trackProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>

          <div className="flex justify-center gap-6 text-xs text-charcoal-700/50">
            <span>
              {currentTrackIndex} of {currentTrackCount} tracks
            </span>
            <span className="text-sage-600">
              {matchedCount} matched
            </span>
            {unmatchedCount > 0 && (
              <span className="text-charcoal-700/40">
                {unmatchedCount} missed
              </span>
            )}
          </div>

          {/* Rate limit / retry indicator */}
          {retryStatus && (
            <p className="text-xs text-amber-600 mt-3 animate-pulse">
              {retryStatus}
            </p>
          )}
        </FadeIn>
      )}

      {/* Live feed */}
      {recentEvents.length > 0 && (
        <div className="w-full max-w-md space-y-1.5">
          <AnimatePresence mode="popLayout">
            {recentEvents.map((evt) => (
              <motion.div
                key={evt.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between text-xs px-3 py-1.5"
              >
                <span
                  className={`truncate mr-3 ${
                    evt.matched
                      ? "text-charcoal-700/60"
                      : "text-charcoal-700/30"
                  }`}
                >
                  {evt.track}
                </span>
                {evt.matched ? (
                  <span className="text-sage-600 whitespace-nowrap flex items-center gap-1">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {evt.confidence ? `${Math.round(evt.confidence * 100)}%` : ""}
                  </span>
                ) : (
                  <span className="text-charcoal-700/30 whitespace-nowrap">
                    missed
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
