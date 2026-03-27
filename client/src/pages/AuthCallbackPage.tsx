import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import {
  getStoredVerifier,
  getStoredState,
  clearAuthStorage,
  exchangeCodeForToken,
  fetchSpotifyProfile,
} from "@/lib/spotifyAuth";

/**
 * Handles the Spotify OAuth redirect.
 *
 * Rendered when the URL contains ?code= or ?error= (detected in App.tsx).
 * Exchanges the auth code for tokens, fetches the user profile,
 * stores everything in Zustand, then clears the URL.
 */
export function AuthCallbackPage() {
  const setSpotifyAuth = useTransferStore((s) => s.setSpotifyAuth);
  const setStep = useTransferStore((s) => s.setStep);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const errorParam = params.get("error");

      // Clean the URL immediately so a refresh doesn't re-trigger
      window.history.replaceState({}, "", "/");

      if (errorParam) {
        setError(`Spotify authorization denied: ${errorParam}`);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      // Verify state matches (CSRF protection)
      const storedState = getStoredState();
      if (state !== storedState) {
        setError("State mismatch \u2014 possible security issue. Please try again.");
        clearAuthStorage();
        return;
      }

      const codeVerifier = getStoredVerifier();
      if (!codeVerifier) {
        setError("Missing code verifier \u2014 please try connecting again.");
        return;
      }

      try {
        // Exchange code for tokens via backend
        const tokens = await exchangeCodeForToken(code, codeVerifier);

        // Fetch user profile with the new access token
        const profile = await fetchSpotifyProfile(tokens.access_token);

        // Store everything and navigate to the connect step
        clearAuthStorage();
        setSpotifyAuth(profile, tokens.access_token, tokens.refresh_token);
        setStep("connect");
      } catch (err) {
        clearAuthStorage();
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, [setSpotifyAuth, setStep]);

  if (error) {
    return (
      <div className="flex flex-col items-center text-center pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
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
            Connection failed
          </h2>
          <p className="text-sm text-charcoal-700/60 mb-6 max-w-sm">{error}</p>
          <button
            onClick={() => setStep("connect")}
            className="text-sm font-medium text-sage-600 hover:text-sage-500 transition-colors cursor-pointer"
          >
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center pt-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-8 h-8 border-2 border-sage-500/20 border-t-sage-500 rounded-full animate-spin" />
        <p className="text-sm text-charcoal-700/60">Connecting to Spotify...</p>
      </motion.div>
    </div>
  );
}
