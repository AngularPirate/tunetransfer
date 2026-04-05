/**
 * Spotify OAuth 2.0 with PKCE
 *
 * Flow:
 * 1. Generate code_verifier (random 128 chars) + code_challenge (SHA-256 + base64url)
 * 2. Redirect to Spotify authorize URL with PKCE challenge
 * 3. Spotify redirects back with ?code= → exchange via backend for tokens
 * 4. Fetch user profile with access token
 *
 * No external libraries needed — uses Web Crypto API for PKCE.
 */

// ── PKCE Helpers ──────────────────────────────────────────────

function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => possible[v % possible.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── SessionStorage Keys ───────────────────────────────────────

const VERIFIER_KEY = "spotify_code_verifier";
const STATE_KEY = "spotify_auth_state";

// ── Auth Redirect ─────────────────────────────────────────────

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
  "user-read-email",
].join(" ");

/**
 * Initiates the Spotify OAuth flow.
 * Generates PKCE challenge, stores verifier in sessionStorage,
 * and redirects the browser to Spotify's authorization page.
 */
export async function redirectToSpotifyAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID environment variable");
  }

  // Spotify banned "localhost" in Nov 2025. For local dev, use 127.0.0.1 (loopback IP).
  // Loopback IPs are the only exception where http:// is allowed.
  // In production, window.location.origin will be https://yourdomain.com
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const redirectUri = isLocal
    ? `http://127.0.0.1:${window.location.port}/callback`
    : `${window.location.origin}/callback`;
  const codeVerifier = generateRandomString(128);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
  const state = generateRandomString(32);

  // Store for verification after redirect
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

// ── SessionStorage Access ─────────────────────────────────────

export function getStoredVerifier(): string | null {
  return sessionStorage.getItem(VERIFIER_KEY);
}

export function getStoredState(): string | null {
  return sessionStorage.getItem(STATE_KEY);
}

export function clearAuthStorage(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}

// ── Token Exchange ────────────────────────────────────────────

/**
 * Sends the authorization code + PKCE verifier to the backend,
 * which exchanges them (with client_secret) for tokens.
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? `http://127.0.0.1:${window.location.port}/callback`
        : `${window.location.origin}/callback`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Token exchange failed" }));
    throw new Error(err.error || "Token exchange failed");
  }

  return res.json();
}

// ── Token Refresh ─────────────────────────────────────────────

/**
 * Refreshes an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error("Token refresh failed");
  }

  return res.json();
}

// ── Profile Fetch ─────────────────────────────────────────────

/**
 * Fetches the authenticated user's Spotify profile.
 */
export async function fetchSpotifyProfile(
  accessToken: string
): Promise<{ id: string; displayName: string; imageUrl: string | null }> {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Spotify profile");
  }

  const data = await res.json();

  return {
    id: data.id,
    displayName: data.display_name || data.id,
    imageUrl: data.images?.[0]?.url ?? null,
  };
}
