import { create } from "zustand";
import type {
  WizardStep,
  TransferGoal,
  ITunesPlaylist,
  ITunesTrack,
  TransferSummary,
} from "@tunetransfer/shared";

interface SpotifyUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

interface TransferStore {
  // Wizard navigation
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;

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
  setSpotifyAuth: (user: SpotifyUser, token: string, refreshToken: string) => void;
  clearSpotifyAuth: () => void;

  // Transfer results
  transferSummary: TransferSummary | null;
  setTransferSummary: (summary: TransferSummary) => void;

  // Reset
  reset: () => void;
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  currentStep: "welcome",
  setStep: (step) => set({ currentStep: step }),

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
  setSpotifyAuth: (user, token, refreshToken) =>
    set({ spotifyUser: user, spotifyAccessToken: token, spotifyRefreshToken: refreshToken }),
  clearSpotifyAuth: () =>
    set({ spotifyUser: null, spotifyAccessToken: null, spotifyRefreshToken: null }),

  transferSummary: null,
  setTransferSummary: (summary) => set({ transferSummary: summary }),

  reset: () =>
    set({
      currentStep: "welcome",
      transferGoal: null,
      playlists: [],
      tracks: new Map(),
      selectedPlaylistIds: new Set(),
      spotifyUser: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      transferSummary: null,
    }),
}));
