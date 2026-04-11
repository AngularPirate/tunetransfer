import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import { Button } from "@/components/ui/Button";
import type { PlaylistTransferResult } from "@tunetransfer/shared";

// ── Confetti + Musical Notes ─────────────���─────────────────

const NOTES = ["♪", "♫", "♩", "♬"];
const CONFETTI_COLORS = [
  "#5a9a6a", // sage
  "#7ab88a", // light sage
  "#e8b931", // gold
  "#d4896a", // warm coral
  "#8b6fc0", // soft purple
  "#e07a9a", // pink
  "#5ba3cf", // sky blue
];
const PARTICLE_COUNT = 50;

interface Particle {
  id: number;
  isNote: boolean;
  note?: string;
  color: string;
  x: number;       // % from left
  delay: number;    // seconds
  duration: number; // seconds
  size: number;     // px
  rotation: number; // degrees end rotation
  drift: number;    // horizontal drift in px
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const isNote = Math.random() < 0.3; // 30% are musical notes
    return {
      id: i,
      isNote,
      note: isNote ? NOTES[Math.floor(Math.random() * NOTES.length)] : undefined,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      size: isNote ? 12 + Math.random() * 8 : 6 + Math.random() * 4,
      rotation: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 80,
    };
  });
}

function Confetti() {
  const particles = useMemo(() => generateParticles(), []);
  const fallDistance = typeof window !== "undefined" ? window.innerHeight + 80 : 1000;

  console.log("[confetti] mounted with", particles.length, "particles, fallDistance=", fallDistance);

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
      }}
    >
      {particles.map((p) => {
        const style: React.CSSProperties & Record<string, string | number> = {
          position: "absolute",
          top: -40,
          left: `${p.x}%`,
          animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          "--drift": `${p.drift}px`,
          "--fall": `${fallDistance}px`,
          "--rot": `${p.rotation}deg`,
          willChange: "transform, opacity",
        };

        if (p.isNote) {
          style.fontSize = p.size;
          style.color = p.color;
          style.lineHeight = 1;
        } else {
          style.width = p.size;
          style.height = p.size * 0.6;
          style.backgroundColor = p.color;
          style.borderRadius = 1;
        }

        return (
          <div key={p.id} style={style}>
            {p.isNote ? p.note : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────

function StatCard({
  value,
  label,
  accent,
  className,
}: {
  value: number;
  label: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/60 ring-1 ring-charcoal-800/8 rounded-2xl px-6 py-4 text-center flex-1 ${className ?? ""}`}
    >
      <p
        className={`text-2xl font-serif font-semibold ${
          accent ? "text-sage-600" : "text-charcoal-900"
        }`}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-charcoal-700/45 mt-0.5">{label}</p>
    </div>
  );
}

// ── Playlist Card ──────────────────────────────────────────

function PlaylistCard({ result }: { result: PlaylistTransferResult }) {
  const [expanded, setExpanded] = useState(false);
  const percent = result.totalTracks > 0
    ? Math.round((result.matchedCount / result.totalTracks) * 100)
    : 0;

  const unmatchedTracks = result.results.filter((r) => r.status === "unmatched");

  return (
    <div className="bg-white/60 ring-1 ring-charcoal-800/8 rounded-2xl px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {result.spotifyPlaylistUrl ? (
            <a
              href={result.spotifyPlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-charcoal-800 hover:text-sage-600 transition-colors truncate"
            >
              {result.playlistName}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block ml-1 -mt-0.5"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : (
            <span className="text-sm font-semibold text-charcoal-800 truncate">
              {result.playlistName}
            </span>
          )}
        </div>
        <span className="text-xs text-charcoal-700/45 whitespace-nowrap ml-3">
          {result.matchedCount}/{result.totalTracks} matched
        </span>
      </div>

      <div className="bg-charcoal-800/5 rounded-full h-1.5 overflow-hidden mb-2">
        <div
          className="bg-sage-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {unmatchedTracks.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-charcoal-700/40 hover:text-charcoal-700/60 transition-colors cursor-pointer"
        >
          {expanded ? "Hide" : "Show"} {unmatchedTracks.length} unmatched
          {unmatchedTracks.length === 1 ? " track" : " tracks"}
        </button>
      )}

      {expanded && unmatchedTracks.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-charcoal-800/5 pt-3">
          {unmatchedTracks.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-charcoal-700/50 truncate mr-2">
                {r.source.artist} — {r.source.name}
              </span>
              <span className="text-charcoal-700/30 whitespace-nowrap">
                {r.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Results Page ────────────────���──────────────────────────

export function ResultsPage() {
  const transferSummary = useTransferStore((s) => s.transferSummary);
  const reset = useTransferStore((s) => s.reset);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasShown = useRef(false);

  // Fire confetti once transferSummary is available (may arrive after first render)
  useEffect(() => {
    if (!transferSummary || hasShown.current) return;
    hasShown.current = true;
    setShowConfetti(true);
  }, [transferSummary]);

  // Auto-hide confetti after 5s
  useEffect(() => {
    if (!showConfetti) return;
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  if (!transferSummary) {
    return null;
  }

  const { totalTracks, totalMatched, totalUnmatched, playlists } = transferSummary;

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="flex flex-col items-center text-center pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-charcoal-900 mb-1">
            Transfer complete
          </h2>
          <p className="text-base text-charcoal-700/50 max-w-sm mx-auto mb-8">
            Time to jam.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="flex gap-3 w-full max-w-md mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="flex-1"
          >
            <StatCard value={totalTracks} label="Total tracks" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            <StatCard value={totalMatched} label="Matched" accent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex-1"
          >
            <StatCard value={totalUnmatched} label="Unmatched" />
          </motion.div>
        </div>

        {/* Per-playlist breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-md space-y-3 mb-10"
        >
          {playlists.map((p) => (
            <PlaylistCard key={p.playlistName} result={p} />
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" onClick={reset}>
            Start over
          </Button>
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>
              Open Spotify
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Button>
          </a>
        </motion.div>
      </div>
    </>
  );
}
