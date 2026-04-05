import { useCallback, useState } from "react";
import { useTransferStore } from "@/store/transferStore";
import { DropZone } from "@/components/upload/DropZone";
import { parseITunesXml } from "@/lib/xmlParser";
import { Button } from "@/components/ui/Button";

export function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLibrary = useTransferStore((s) => s.setLibrary);
  const playlists = useTransferStore((s) => s.playlists);
  const setStep = useTransferStore((s) => s.setStep);

  // Derive parsed state from store — survives refresh
  const parsed = playlists.length > 0;

  const handleFileRead = useCallback(
    (content: string) => {
      setIsLoading(true);
      setError(null);

      // Use setTimeout to let the UI update with loading state
      setTimeout(() => {
        try {
          const library = parseITunesXml(content);

          if (library.playlists.length === 0) {
            setError("No playlists found in this file. Make sure you exported your full library.");
            setIsLoading(false);
            return;
          }

          setLibrary(library.playlists, library.tracks);
          setIsLoading(false);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to parse the XML file.",
          );
          setIsLoading(false);
        }
      }, 100);
    },
    [setLibrary],
  );

  const totalTracks = playlists.reduce((sum, p) => sum + p.tracks.length, 0);

  return (
    <div className="flex flex-col items-center text-center pt-4">
      <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-2">
        Upload your library
      </h2>
      <p className="text-sm text-charcoal-700/60 mb-8 max-w-md">
        Export your library from the Music app (File &rarr; Library &rarr; Export
        Library), then drop the XML file here.
      </p>

      <DropZone onFileRead={handleFileRead} isLoading={isLoading} error={error} parsed={parsed} />

      {parsed && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-6 text-sm text-charcoal-700/60">
            <span>
              <span className="font-semibold text-charcoal-800">
                {playlists.length}
              </span>{" "}
              playlists
            </span>
            <span>
              <span className="font-semibold text-charcoal-800">
                {totalTracks.toLocaleString()}
              </span>{" "}
              tracks
            </span>
          </div>
          <Button onClick={() => setStep("review")}>
            Review playlists
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
      )}
    </div>
  );
}
