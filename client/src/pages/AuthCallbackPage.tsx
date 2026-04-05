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

interface AuthCallbackPageProps {
  onDone: () => void;
}

/**
 * Handles the Spotify OAuth redirect.
 *
 * Mounted by CurrentPage when URL contains ?code= or ?error=.
 * Stays mounted (via isCallback flag in CurrentPage) even after URL is cleaned,
 * so error UI remains visible. Calls onDone() when the flow is complete and
 * the user should see the next page.
 */
export function AuthCallbackPage({ onDone }: AuthCallbackPageProps) {
  const setSpotifyAuth = useTransferStore((s) => s.setSpotifyAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const errorParam = params.get("error");

      if (errorParam) {
        window.history.replaceState({ step: "connect" }, "", "/connect");
        setError(`Spotify authorization denied: ${errorParam}`);
        return;
      }

      if (!code) {
        window.history.replaceState({ step: "connect" }, "", "/connect");
        setError("No authorization code received");
        return;
      }

      // Verify state matches (CSRF protection)
      const storedState = getStoredState();
      if (state !== storedState) {
        clearAuthStorage();
        window.history.replaceState({ step: "connect" }, "", "/connect");
        setError("State mismatch \u2014 possible security issue. Please try again.");
        return;
      }

      const codeVerifier = getStoredVerifier();
      if (!codeVerifier) {
        window.history.replaceState({ step: "connect" }, "", "/connect");
        setError("Missing code verifier \u2014 please try connecting again.");
        return;
      }

      try {
        const tokens = await exchangeCodeForToken(code, codeVerifier);
        const profile = await fetchSpotifyProfile(tokens.access_token);

        // Atomic update: set user + token + step all at once = one render.
        // setSpotifyAuth uses replaceState internally, so the URL updates
        // from /?code=... to /connect without adding a history entry.
        clearAuthStorage();
        setSpotifyAuth(profile, tokens.access_token, tokens.refresh_token, "connect");

        // Signal CurrentPage to unmount us and render ConnectPage
        onDone();
      } catch (err) {
        clearAuthStorage();
        window.history.replaceState({ step: "connect" }, "", "/connect");
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, [setSpotifyAuth, onDone]);

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
            onClick={() => {
              // Navigate to connect page and unmount this callback page
              useTransferStore.getState().replaceStep("connect");
              onDone();
            }}
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
