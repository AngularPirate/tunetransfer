import { useState } from "react";
import { motion } from "framer-motion";
import { useTransferStore } from "@/store/transferStore";
import { PlaylistCard } from "@/components/library/PlaylistCard";
import { TrackTable } from "@/components/library/TrackTable";
import { Button } from "@/components/ui/Button";

export function LibraryPage() {
  const playlists = useTransferStore((s) => s.playlists);
  const selectedIds = useTransferStore((s) => s.selectedPlaylistIds);
  const togglePlaylist = useTransferStore((s) => s.togglePlaylist);
  const selectAll = useTransferStore((s) => s.selectAll);
  const deselectAll = useTransferStore((s) => s.deselectAll);
  const setStep = useTransferStore((s) => s.setStep);

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const activePlaylist = playlists.find((p) => p.persistentId === activePlaylistId);
  const allSelected = selectedIds.size === playlists.length;

  const selectedTrackCount = playlists
    .filter((p) => selectedIds.has(p.persistentId))
    .reduce((sum, p) => sum + p.tracks.length, 0);

  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-2">
          Review your playlists
        </h2>
        <p className="text-sm text-charcoal-700/60">
          Select the playlists you want to transfer to Spotify.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Playlist list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs font-medium text-sage-600 hover:text-sage-500 transition-colors cursor-pointer"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-charcoal-700/40">
              {playlists.length} playlists
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-[28rem] overflow-y-auto pr-1">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.persistentId}
                playlist={playlist}
                isSelected={selectedIds.has(playlist.persistentId)}
                isActive={activePlaylistId === playlist.persistentId}
                onToggle={() => togglePlaylist(playlist.persistentId)}
                onClick={() =>
                  setActivePlaylistId(
                    activePlaylistId === playlist.persistentId
                      ? null
                      : playlist.persistentId,
                  )
                }
                onActivate={() => setActivePlaylistId(playlist.persistentId)}
              />
            ))}
          </div>
        </div>

        {/* Track preview */}
        <div className="flex-1 min-w-0">
          {activePlaylist ? (
            <motion.div
              key={activePlaylist.persistentId}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white/50 rounded-2xl p-5 ring-1 ring-charcoal-800/8"
            >
              <h3 className="text-sm font-semibold text-charcoal-800 mb-1">
                {activePlaylist.name}
              </h3>
              <p className="text-xs text-charcoal-700/45 mb-4">
                {activePlaylist.tracks.length} tracks
              </p>
              <TrackTable tracks={activePlaylist.tracks} />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-charcoal-700/30">
              Click a playlist to preview its tracks
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("upload")}>
          Back
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-charcoal-700/50">
            <span className="font-semibold text-charcoal-800">
              {selectedIds.size}
            </span>{" "}
            playlists ({selectedTrackCount.toLocaleString()} tracks)
          </span>
          <Button
            disabled={selectedIds.size === 0}
            onClick={() => setStep("connect")}
          >
            Continue
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
        </div>
      </div>
    </div>
  );
}
