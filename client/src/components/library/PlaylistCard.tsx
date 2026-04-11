import type { ITunesPlaylist } from "@tunetransfer/shared";

interface PlaylistCardProps {
  playlist: ITunesPlaylist;
  isSelected: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClick: () => void;
  onActivate: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function PlaylistCard({
  playlist,
  isSelected,
  isActive,
  onToggle,
  onClick,
  onActivate,
}: PlaylistCardProps) {
  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.totalTimeMs, 0);

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer
        transition-all duration-150
        ${
          isActive
            ? "bg-sage-500/10 ring-1 ring-sage-500/30"
            : "hover:bg-charcoal-800/[0.03]"
        }
      `}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
          onActivate();
        }}
        className={`
          w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
          transition-all duration-150 cursor-pointer
          ${
            isSelected
              ? "bg-sage-500 border-sage-500"
              : "border-charcoal-800/20 hover:border-sage-500/50"
          }
        `}
      >
        {isSelected && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal-800 truncate">
          {playlist.name}
        </p>
        <p className="text-xs text-charcoal-700/45">
          {playlist.tracks.length} tracks &middot; {formatDuration(totalDuration)}
        </p>
      </div>
    </div>
  );
}
