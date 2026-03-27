// === iTunes Types ===

export interface ITunesTrack {
  trackId: number;
  name: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  totalTimeMs: number;
  trackNumber?: number;
  discNumber?: number;
  year?: number;
}

export interface ITunesPlaylist {
  name: string;
  playlistId: number;
  persistentId: string;
  tracks: ITunesTrack[];
  isFolder: boolean;
  isMaster: boolean;
}

export interface ParsedLibrary {
  tracks: Map<number, ITunesTrack>;
  playlists: ITunesPlaylist[];
}

// === Spotify Types ===

export interface SpotifyMatch {
  spotifyUri: string;
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  confidence: number;
}

// === Spotify Auth Types ===

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  images: { url: string; height: number; width: number }[];
  email?: string;
  product?: string;
}

export interface TokenExchangeRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// === Transfer Types ===

export type MatchResult =
  | { status: "matched"; source: ITunesTrack; match: SpotifyMatch }
  | { status: "unmatched"; source: ITunesTrack; reason: string };

export interface PlaylistTransferResult {
  playlistName: string;
  spotifyPlaylistId: string | null;
  spotifyPlaylistUrl: string | null;
  totalTracks: number;
  matchedCount: number;
  unmatchedCount: number;
  results: MatchResult[];
}

export interface TransferSummary {
  totalPlaylists: number;
  totalTracks: number;
  totalMatched: number;
  totalUnmatched: number;
  playlists: PlaylistTransferResult[];
}

// === SSE Event Types ===

export type TransferEvent =
  | { type: "playlist:start"; playlistName: string; trackCount: number }
  | {
      type: "track:matched";
      playlistName: string;
      track: string;
      confidence: number;
    }
  | {
      type: "track:unmatched";
      playlistName: string;
      track: string;
      reason: string;
    }
  | {
      type: "playlist:created";
      playlistName: string;
      spotifyUrl: string;
    }
  | {
      type: "playlist:complete";
      playlistName: string;
      matched: number;
      unmatched: number;
    }
  | { type: "transfer:complete"; summary: TransferSummary }
  | { type: "error"; message: string };

// === App State Types ===

export type WizardStep =
  | "welcome"
  | "upload"
  | "review"
  | "connect"
  | "transfer"
  | "results";

export type TransferGoal = "playlists" | "liked-songs" | "full-library";
