const SPOTIFY_API = "https://api.spotify.com/v1";

export interface SpotifySearchResult {
  uri: string;
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
}

// ── Config ───────────────────────────────────────────────────

const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 15_000; // 15s — abort any single HTTP call after this
const MAX_RETRY_WAIT_S = 30; // Respect Spotify's Retry-After up to 30s

export type OnRetryCallback = (waitSeconds: number, retriesLeft: number) => void;

// ── Rate-limit aware fetch wrapper ───────────────────────────

async function spotifyFetch(
  url: string,
  options: RequestInit,
  onRetry?: OnRetryCallback,
  retries = MAX_RETRIES,
): Promise<Response> {
  // Add a timeout so fetch can never hang forever
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const mergedOptions: RequestInit = {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal,
  };

  let res: Response;
  try {
    res = await fetch(url, mergedOptions);
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.error(`[spotify] Fetch timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
      throw new Error(`Spotify API timed out (${FETCH_TIMEOUT_MS}ms)`);
    }
    throw err;
  }

  // Handle rate limiting (429) — wait (capped) and retry
  if (res.status === 429 && retries > 0) {
    const raw = parseInt(res.headers.get("Retry-After") || "2", 10);
    const waitSeconds = Math.min(raw, MAX_RETRY_WAIT_S);
    console.warn(`[spotify] Rate limited — waiting ${waitSeconds}s (Retry-After was ${raw}s, ${retries} retries left)`);
    onRetry?.(waitSeconds, retries);
    await delay(waitSeconds * 1000);
    return spotifyFetch(url, options, onRetry, retries - 1);
  }

  // Handle token expiry (401) — log it clearly
  if (res.status === 401) {
    console.error(`[spotify] 401 Unauthorized — access token may have expired`);
  }

  return res;
}

// ── Search ───────────────────────────────────────────────────

export async function searchTracks(
  query: string,
  token: string,
  options?: { limit?: number; onRetry?: OnRetryCallback },
): Promise<SpotifySearchResult[]> {
  const limit = options?.limit ?? 5;
  const url = `${SPOTIFY_API}/search?type=track&q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await spotifyFetch(
    url,
    { headers: { Authorization: `Bearer ${token}` } },
    options?.onRetry,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify search failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const items = data?.tracks?.items ?? [];

  return items.map((item: any) => ({
    uri: item.uri,
    id: item.id,
    name: item.name,
    artist: (item.artists ?? []).map((a: any) => a.name).join(", "),
    album: item.album?.name ?? "",
    durationMs: item.duration_ms ?? 0,
  }));
}

// ── Preflight Check ──────────────────────────────────────────

export async function preflightCheck(
  token: string,
): Promise<{ ok: true; userId: string; latencyMs: number } | { ok: false; error: string; status: number }> {
  const start = Date.now();
  try {
    const res = await spotifyFetch(
      `${SPOTIFY_API}/me`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body, status: res.status };
    }

    const data = await res.json();
    return { ok: true, userId: data.id, latencyMs };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error", status: 0 };
  }
}

// ── Create Playlist ──────────────────────────────────────────

export async function createPlaylist(
  userId: string,
  name: string,
  token: string,
): Promise<{ id: string; url: string }> {
  const res = await spotifyFetch(`${SPOTIFY_API}/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, public: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create playlist (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { id: data.id, url: data.external_urls?.spotify ?? "" };
}

// ── Add Tracks ───────────────────────────────────────────────

export async function addTracksToPlaylist(
  playlistId: string,
  uris: string[],
  token: string,
): Promise<void> {
  // Spotify allows max 100 URIs per request
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    const res = await spotifyFetch(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to add tracks (${res.status}): ${body}`);
    }
  }
}

// ── Token Refresh ────────────────────────────────────────────

export async function refreshSpotifyToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status})`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
  };
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
