import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import type {
  WizardStep,
  TransferGoal,
  ITunesPlaylist,
  ITunesTrack,
  TransferSummary,
} from "@tunetransfer/shared";
import { getPathForStep } from "@/lib/stepRoutes";

interface SpotifyUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

interface TransferStore {
  // Wizard navigation
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  replaceStep: (step: WizardStep) => void;

  // Welcome screen
  transferGoal: TransferGoal | null;
  setTransferGoal: (goal: TransferGoal) => void;

  // Library data
  playlists: ITunesPlaylist[];
  tracks: Map<number, ITunesTrack>;
  setLibrary: (playlists: ITunesPlaylist[], tracks: Map<number, ITunesTrack>) => void;

  // Playlist selection
  selectedPlaylistIds: Set<string>;
  togglePlaylist: (persistentId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Spotify auth
  spotifyUser: SpotifyUser | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  isAuthenticating: boolean;
  setIsAuthenticating: (v: boolean) => void;
  setSpotifyAuth: (user: SpotifyUser, token: string, refreshToken: string, step?: WizardStep) => void;
  clearSpotifyAuth: () => void;

  // Transfer results
  transferSummary: TransferSummary | null;
  setTransferSummary: (summary: TransferSummary) => void;
  completeTransfer: (summary: TransferSummary) => void;

  // Reset
  reset: () => void;
}

// ── Custom JSON serialization for Map and Set ────────────────

function customReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { __type: "Map", entries: [...value] };
  }
  if (value instanceof Set) {
    return { __type: "Set", values: [...value] };
  }
  return value;
}

function customReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__type" in value) {
    const tagged = value as { __type: string; entries?: unknown[]; values?: unknown[] };
    if (tagged.__type === "Map" && tagged.entries) {
      return new Map(tagged.entries as [unknown, unknown][]);
    }
    if (tagged.__type === "Set" && tagged.values) {
      return new Set(tagged.values);
    }
  }
  return value;
}

// ── Store with persist middleware ─────────────────────────────

export const useTransferStore = create<TransferStore>()(
  persist(
    (set, get) => ({
      currentStep: "welcome",
      setStep: (step) => {
        set({ currentStep: step });
        const path = getPathForStep(step);
        if (window.location.pathname !== path) {
          window.history.pushState({ step }, "", path);
        }
      },
      replaceStep: (step) => {
        set({ currentStep: step });
        const path = getPathForStep(step);
        window.history.replaceState({ step }, "", path);
      },

      transferGoal: null,
      setTransferGoal: (goal) => set({ transferGoal: goal }),

      playlists: [],
      tracks: new Map(),
      setLibrary: (playlists, tracks) => set({ playlists, tracks }),

      selectedPlaylistIds: new Set(),
      togglePlaylist: (persistentId) =>
        set((state) => {
          const next = new Set(state.selectedPlaylistIds);
          if (next.has(persistentId)) {
            next.delete(persistentId);
          } else {
            next.add(persistentId);
          }
          return { selectedPlaylistIds: next };
        }),
      selectAll: () =>
        set((state) => ({
          selectedPlaylistIds: new Set(state.playlists.map((p) => p.persistentId)),
        })),
      deselectAll: () => set({ selectedPlaylistIds: new Set() }),

      spotifyUser: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      isAuthenticating: false,
      setIsAuthenticating: (v) => set({ isAuthenticating: v }),
      setSpotifyAuth: (user, token, refreshToken, step) => {
        set({
          spotifyUser: user,
          spotifyAccessToken: token,
          spotifyRefreshToken: refreshToken,
          isAuthenticating: false,
          ...(step ? { currentStep: step } : {}),
        });
        if (step) {
          window.history.replaceState({ step }, "", getPathForStep(step));
        }
      },
      clearSpotifyAuth: () =>
        set({ spotifyUser: null, spotifyAccessToken: null, spotifyRefreshToken: null, isAuthenticating: false }),

      transferSummary: null,
      setTransferSummary: (summary) => set({ transferSummary: summary }),
      completeTransfer: (summary) => {
        set({ transferSummary: summary, currentStep: "results" });
        const path = getPathForStep("results");
        if (window.location.pathname !== path) {
          window.history.pushState({ step: "results" }, "", path);
        }
      },

      reset: () => {
        set({
          currentStep: "welcome",
          transferGoal: null,
          playlists: [],
          tracks: new Map(),
          selectedPlaylistIds: new Set(),
          spotifyUser: null,
          spotifyAccessToken: null,
          spotifyRefreshToken: null,
          isAuthenticating: false,
          transferSummary: null,
        });
        sessionStorage.removeItem("tunetransfer-session");
        window.history.replaceState({ step: "welcome" }, "", "/");
      },
    }),
    {
      name: "tunetransfer-session",
      storage: createJSONStorage(() => sessionStorage, {
        replacer: customReplacer,
        reviver: customReviver,
      }),
      // Exclude isAuthenticating and all action functions from persistence
      partialize: (state) => ({
        currentStep: state.currentStep,
        transferGoal: state.transferGoal,
        playlists: state.playlists,
        tracks: state.tracks,
        selectedPlaylistIds: state.selectedPlaylistIds,
        spotifyUser: state.spotifyUser,
        spotifyAccessToken: state.spotifyAccessToken,
        spotifyRefreshToken: state.spotifyRefreshToken,
        transferSummary: state.transferSummary,
      }),
    }
  )
);

// ── Hydration hook ───────────────────────────────────────────
// Returns false until sessionStorage has been read into the store.
// Use this to gate rendering and prevent flash of default state.

export const useHasHydrated = () =>
  useSyncExternalStore(
    useTransferStore.persist.onFinishHydration,
    () => useTransferStore.persist.hasHydrated()
  );
