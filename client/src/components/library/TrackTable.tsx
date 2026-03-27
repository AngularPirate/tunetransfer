import type { ITunesTrack } from "@tunetransfer/shared";

interface TrackTableProps {
  tracks: ITunesTrack[];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackTable({ tracks }: TrackTableProps) {
  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-charcoal-700/40 uppercase tracking-wider border-b border-charcoal-800/8">
            <th className="py-2 pr-3 w-8">#</th>
            <th className="py-2 pr-3">Title</th>
            <th className="py-2 pr-3">Artist</th>
            <th className="py-2 pr-3 hidden md:table-cell">Album</th>
            <th className="py-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => (
            <tr
              key={`${track.trackId}-${i}`}
              className="border-b border-charcoal-800/5 last:border-0"
            >
              <td className="py-2 pr-3 text-charcoal-700/30 tabular-nums">
                {i + 1}
              </td>
              <td className="py-2 pr-3 font-medium text-charcoal-800 truncate max-w-48">
                {track.name}
              </td>
              <td className="py-2 pr-3 text-charcoal-700/60 truncate max-w-36">
                {track.artist}
              </td>
              <td className="py-2 pr-3 text-charcoal-700/40 truncate max-w-36 hidden md:table-cell">
                {track.album}
              </td>
              <td className="py-2 text-right text-charcoal-700/40 tabular-nums">
                {formatTime(track.totalTimeMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
