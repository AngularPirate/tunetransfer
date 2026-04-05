import type { ITunesTrack, SpotifyMatch } from "@tunetransfer/shared";
import type { SpotifySearchResult } from "./spotify.js";

const MIN_CONFIDENCE = 0.6;

// ── Levenshtein distance ────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  const dp: number[] = Array.from({ length: bl + 1 }, (_, i) => i);

  for (let i = 1; i <= al; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[bl];
}

function stringSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(la, lb) / maxLen;
}

function durationSimilarity(a: number, b: number): number {
  const diff = Math.abs(a - b);
  if (diff <= 3000) return 1;
  if (diff >= 30000) return 0;
  return 1 - (diff - 3000) / 27000;
}

// ── Scoring ─────────────────────────────────────────────────

function scoreMatch(source: ITunesTrack, candidate: SpotifySearchResult): number {
  return (
    0.4 * stringSimilarity(source.name, candidate.name) +
    0.35 * stringSimilarity(source.artist, candidate.artist) +
    0.15 * stringSimilarity(source.album, candidate.album) +
    0.1 * durationSimilarity(source.totalTimeMs, candidate.durationMs)
  );
}

// ── Public API ──────────────────────────────────────────────

export function findBestMatch(
  source: ITunesTrack,
  candidates: SpotifySearchResult[]
): SpotifyMatch | null {
  if (candidates.length === 0) return null;

  let best: SpotifySearchResult | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const score = scoreMatch(source, c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best || bestScore < MIN_CONFIDENCE) return null;

  return {
    spotifyUri: best.uri,
    spotifyId: best.id,
    name: best.name,
    artist: best.artist,
    album: best.album,
    durationMs: best.durationMs,
    confidence: Math.round(bestScore * 100) / 100,
  };
}

function cleanTrackName(name: string): string {
  return name
    // Remove feat/ft patterns in brackets
    .replace(/\s*[\(\[](feat\.?|ft\.?|featuring)[^\)\]]*[\)\]]/gi, "")
    // Remove feat/ft at end
    .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, "")
    // Remove remix/version info in brackets
    .replace(/\s*[\(\[][^\)\]]*remix[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*[\(\[][^\)\]]*version[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*[\(\[][^\)\]]*mix[^\)\]]*[\)\]]/gi, "")
    // Remove special chars
    .replace(/['"]/g, "")
    .trim();
}

export function buildSearchQuery(track: ITunesTrack): string {
  const cleanName = cleanTrackName(track.name);
  const cleanArtist = track.artist.replace(/['"]/g, "");

  return `track:${cleanName} artist:${cleanArtist}`;
}

/**
 * Fallback: simpler freeform query without field filters.
 * Spotify sometimes matches better without track:/artist: prefixes.
 */
export function buildFallbackQuery(track: ITunesTrack): string {
  const cleanName = cleanTrackName(track.name);
  const cleanArtist = track.artist
    .replace(/['"]/g, "")
    .split(/[,&]/)[0] // Use just the first/primary artist
    .trim();

  return `${cleanArtist} ${cleanName}`;
}
