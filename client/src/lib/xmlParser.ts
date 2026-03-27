import type { ITunesTrack, ITunesPlaylist, ParsedLibrary } from "@tunetransfer/shared";

/**
 * Parse an iTunes Library XML file (plist format) into structured data.
 * Runs entirely in the browser using DOMParser.
 */
export function parseITunesXml(xmlString: string): ParsedLibrary {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML file. Please upload a valid iTunes Library XML.");
  }

  // The root structure is: <plist><dict>...</dict></plist>
  const rootDict = doc.querySelector("plist > dict");
  if (!rootDict) {
    throw new Error("Not a valid iTunes Library file.");
  }

  // Parse the top-level dict to find "Tracks" and "Playlists"
  const rootEntries = parseDictEntries(rootDict);
  const tracksDict = rootEntries.get("Tracks");
  const playlistsArray = rootEntries.get("Playlists");

  // Parse tracks
  const tracks = new Map<number, ITunesTrack>();
  if (tracksDict && tracksDict.nodeName === "dict") {
    const trackEntries = parseDictEntries(tracksDict);
    for (const [, trackNode] of trackEntries) {
      if (trackNode.nodeName === "dict") {
        const track = parseTrack(trackNode);
        if (track) {
          tracks.set(track.trackId, track);
        }
      }
    }
  }

  // Parse playlists
  const playlists: ITunesPlaylist[] = [];
  if (playlistsArray && playlistsArray.nodeName === "array") {
    const playlistDicts = Array.from(playlistsArray.children).filter(
      (el) => el.nodeName === "dict",
    );
    for (const playlistDict of playlistDicts) {
      const playlist = parsePlaylist(playlistDict, tracks);
      if (playlist) {
        playlists.push(playlist);
      }
    }
  }

  return { tracks, playlists };
}

/**
 * Parse a <dict> element into a Map of key -> value element pairs.
 * iTunes plist dicts alternate <key> and value elements.
 */
function parseDictEntries(dictEl: Element): Map<string, Element> {
  const entries = new Map<string, Element>();
  const children = Array.from(dictEl.children);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeName === "key" && i + 1 < children.length) {
      const key = child.textContent || "";
      const value = children[i + 1];
      entries.set(key, value);
      i++; // skip the value element
    }
  }

  return entries;
}

function getStringValue(entries: Map<string, Element>, key: string): string {
  const el = entries.get(key);
  return el?.textContent?.trim() || "";
}

function getIntValue(entries: Map<string, Element>, key: string): number | undefined {
  const el = entries.get(key);
  if (el && el.nodeName === "integer") {
    const val = parseInt(el.textContent || "", 10);
    return isNaN(val) ? undefined : val;
  }
  return undefined;
}

function getBoolValue(entries: Map<string, Element>, key: string): boolean {
  const el = entries.get(key);
  return el?.nodeName === "true";
}

function parseTrack(dictEl: Element): ITunesTrack | null {
  const entries = parseDictEntries(dictEl);

  const trackId = getIntValue(entries, "Track ID");
  const name = getStringValue(entries, "Name");
  const artist = getStringValue(entries, "Artist");

  // Skip tracks without essential metadata
  if (trackId === undefined || !name) return null;

  // Skip non-music items (podcasts, movies, etc.)
  const kind = getStringValue(entries, "Kind");
  if (kind && !kind.toLowerCase().includes("audio") && !kind.toLowerCase().includes("music")) {
    // Allow tracks without a "Kind" field, but filter out known non-music types
    if (kind.toLowerCase().includes("video") || kind.toLowerCase().includes("podcast")) {
      return null;
    }
  }

  return {
    trackId,
    name,
    artist: artist || "Unknown Artist",
    album: getStringValue(entries, "Album") || "Unknown Album",
    albumArtist: getStringValue(entries, "Album Artist") || undefined,
    genre: getStringValue(entries, "Genre") || undefined,
    totalTimeMs: getIntValue(entries, "Total Time") || 0,
    trackNumber: getIntValue(entries, "Track Number"),
    discNumber: getIntValue(entries, "Disc Number"),
    year: getIntValue(entries, "Year"),
  };
}

function parsePlaylist(
  dictEl: Element,
  tracks: Map<number, ITunesTrack>,
): ITunesPlaylist | null {
  const entries = parseDictEntries(dictEl);

  const name = getStringValue(entries, "Name");
  const playlistId = getIntValue(entries, "Playlist ID");
  const persistentId = getStringValue(entries, "Playlist Persistent ID");

  if (!name || playlistId === undefined || !persistentId) return null;

  // Filter out system/built-in playlists
  const isMaster = getBoolValue(entries, "Master");
  const isFolder = getBoolValue(entries, "Folder");
  const distinguishedKind = getIntValue(entries, "Distinguished Kind");

  // Distinguished Kind > 0 means it's a system playlist (Purchased, Music, Movies, etc.)
  if (isMaster || distinguishedKind) return null;

  // Parse playlist track references
  const playlistItems = entries.get("Playlist Items");
  const playlistTracks: ITunesTrack[] = [];

  if (playlistItems && playlistItems.nodeName === "array") {
    const itemDicts = Array.from(playlistItems.children).filter(
      (el) => el.nodeName === "dict",
    );
    for (const itemDict of itemDicts) {
      const itemEntries = parseDictEntries(itemDict);
      const trackId = getIntValue(itemEntries, "Track ID");
      if (trackId !== undefined) {
        const track = tracks.get(trackId);
        if (track) {
          playlistTracks.push(track);
        }
      }
    }
  }

  // Skip empty playlists and folder playlists
  if (isFolder || playlistTracks.length === 0) return null;

  return {
    name,
    playlistId,
    persistentId,
    tracks: playlistTracks,
    isFolder,
    isMaster,
  };
}
