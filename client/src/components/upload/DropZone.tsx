import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";

interface DropZoneProps {
  onFileRead: (content: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function DropZone({ onFileRead, isLoading, error }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xml")) {
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          onFileRead(text);
        }
      };
      reader.readAsText(file);
    },
    [onFileRead],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        animate={{
          borderColor: isDragOver ? "rgb(90, 154, 106)" : "rgba(42, 42, 42, 0.15)",
          backgroundColor: isDragOver ? "rgba(90, 154, 106, 0.05)" : "rgba(255, 255, 255, 0.4)",
        }}
        transition={{ duration: 0.15 }}
        className="
          border-2 border-dashed rounded-3xl p-12 text-center
          cursor-pointer hover:border-sage-500/40 hover:bg-sage-500/[0.03]
          transition-colors duration-200
        "
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-charcoal-700/60">Parsing your library...</p>
          </div>
        ) : fileName && !error ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(90, 154, 106)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm font-medium text-sage-600">{fileName}</p>
          </div>
        ) : (
          <>
            <p className="text-charcoal-700/50 text-sm">
              Drop your{" "}
              <span className="font-medium text-charcoal-800">Library.xml</span>{" "}
              file here
            </p>
            <p className="text-charcoal-700/30 text-xs mt-2">or click to browse</p>
          </>
        )}
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 text-center mt-4"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
