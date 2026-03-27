import { motion } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import { Button } from "@/components/ui/Button";
import type { TransferGoal } from "@tunetransfer/shared";

const GOALS: { key: TransferGoal; title: string; description: string }[] = [
  {
    key: "playlists",
    title: "My playlists",
    description: "Transfer specific playlists you've built over time",
  },
  {
    key: "liked-songs",
    title: "My liked songs",
    description: "Move your collection of saved and loved tracks",
  },
  {
    key: "full-library",
    title: "Everything",
    description: "Transfer your entire library — playlists, songs, all of it",
  },
];

export function WelcomePage() {
  const transferGoal = useTransferStore((s) => s.transferGoal);
  const setTransferGoal = useTransferStore((s) => s.setTransferGoal);
  const setStep = useTransferStore((s) => s.setStep);

  return (
    <div className="flex flex-col items-center text-center pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-charcoal-900 mb-4">
          Move your music,
          <br />
          effortlessly.
        </h1>
        <p className="text-lg text-charcoal-700/70 max-w-md mx-auto mb-12">
          Transfer your Apple Music library to Spotify in minutes.
          No account linking required — just an export file.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="w-full max-w-md mb-10"
      >
        <p className="text-sm font-medium text-charcoal-700/60 uppercase tracking-wider mb-4">
          What are you moving?
        </p>
        <div className="flex flex-col gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal.key}
              onClick={() => setTransferGoal(goal.key)}
              className={`
                w-full text-left px-5 py-4 rounded-2xl
                transition-all duration-200 ease-out cursor-pointer
                ${
                  transferGoal === goal.key
                    ? "bg-sage-500/10 ring-2 ring-sage-500 shadow-sm"
                    : "bg-white/60 ring-1 ring-charcoal-800/8 hover:ring-charcoal-800/15 hover:shadow-sm"
                }
              `}
            >
              <span
                className={`
                  block text-sm font-semibold mb-0.5
                  ${transferGoal === goal.key ? "text-sage-600" : "text-charcoal-800"}
                `}
              >
                {goal.title}
              </span>
              <span className="block text-sm text-charcoal-700/55">
                {goal.description}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Button
          size="lg"
          disabled={!transferGoal}
          onClick={() => setStep("upload")}
        >
          Get started
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="mt-16 flex items-center gap-8 text-charcoal-700/30"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-wider">From</span>
          <span className="text-sm font-semibold text-charcoal-700/50">Apple Music</span>
        </div>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-wider">To</span>
          <span className="text-sm font-semibold text-charcoal-700/50">Spotify</span>
        </div>
      </motion.div>
    </div>
  );
}
