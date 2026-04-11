import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import { Button } from "@/components/ui/Button";
import { SpotifyLoginButton } from "@/components/auth/SpotifyLoginButton";

export function ConnectPage() {
  const spotifyUser = useTransferStore((s) => s.spotifyUser);
  const isAuthenticating = useTransferStore((s) => s.isAuthenticating);
  const setStep = useTransferStore((s) => s.setStep);
  const [authError, setAuthError] = useState<string | null>(null);

  // Show spinner while the OAuth callback is exchanging tokens
  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center text-center pt-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-sage-500/20 border-t-sage-500 rounded-full animate-spin" />
          <p className="text-sm text-charcoal-700/60">Connecting to Spotify...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-charcoal-900 mb-2">
          {spotifyUser ? "You\u2019re connected" : "Connect to Spotify"}
        </h2>
        <p className="text-sm text-charcoal-700/60 max-w-sm mx-auto mb-10">
          {spotifyUser
            ? "Your Spotify account is ready. Let\u2019s start the transfer."
            : "Sign in so we can create playlists in your account. We\u2019ll only request permission to manage your playlists."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      >
        {spotifyUser ? (
          <div className="bg-white/60 ring-1 ring-charcoal-800/8 rounded-2xl px-8 py-6 flex flex-col items-center gap-4 mb-10">
            {spotifyUser.imageUrl ? (
              <img
                src={spotifyUser.imageUrl}
                alt=""
                className="w-16 h-16 rounded-full object-cover ring-2 ring-sage-500/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sage-500/10 flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-sage-600"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-charcoal-800">
                {spotifyUser.displayName}
              </p>
              <p className="text-xs text-sage-600 flex items-center justify-center gap-1 mt-0.5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-center gap-4">
            <SpotifyLoginButton onError={setAuthError} />
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  role="alert"
                  className="max-w-sm w-full bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs text-left flex items-start gap-2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold mb-0.5">Couldn&rsquo;t start Spotify sign-in</p>
                    <p className="text-red-700/80 leading-snug">{authError}</p>
                  </div>
                  <button
                    onClick={() => setAuthError(null)}
                    className="text-red-700/60 hover:text-red-700 cursor-pointer flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" onClick={() => setStep("review")}>
          Back
        </Button>
        {spotifyUser && (
          <Button onClick={() => setStep("transfer")}>
            Start transfer
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        )}
      </motion.div>
    </div>
  );
}
