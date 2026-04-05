import { Router, type Request, type Response } from "express";

const router: Router = Router();

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/**
 * POST /api/auth/token
 * Exchange an authorization code for access + refresh tokens.
 * The client_secret stays server-side — the frontend never sees it.
 */
router.post("/token", async (req: Request, res: Response) => {
  const { code, code_verifier, redirect_uri } = req.body;

  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ error: "Missing required fields: code, code_verifier, redirect_uri" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in environment");
    return res.status(500).json({ error: "Server missing Spotify credentials" });
  }

  try {
    console.log("[auth/token] redirect_uri:", redirect_uri);
    console.log("[auth/token] client_id:", clientId);

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Spotify token exchange failed:", data);
      return res.status(response.status).json({
        error: data.error_description || data.error || "Token exchange failed",
      });
    }

    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Token exchange error:", err);
    return res.status(500).json({ error: "Failed to exchange token" });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an expired access token using the refresh token.
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Missing refresh_token" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Server missing Spotify credentials" });
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Spotify token refresh failed:", data);
      return res.status(response.status).json({
        error: data.error_description || data.error || "Token refresh failed",
      });
    }

    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refresh_token, // Spotify may not return a new one
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    return res.status(500).json({ error: "Failed to refresh token" });
  }
});

export default router;
