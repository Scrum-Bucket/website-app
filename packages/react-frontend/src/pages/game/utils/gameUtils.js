import {
  DEFAULT_USERS,
  ROUND_SECONDS,
  VOTE_BOX_COLORS,
} from "../gameConfig/constants";
import {
  getSongArtist,
  getSongId,
  getSongLink,
  getSongThumbnail,
  getSongVideoId,
  getSongTitle,
} from "../../Playlist/playlistStorage";
import {
  normalizeCrabProfile,
  readStoredCrabProfile,
} from "../../profile/crabColor";

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeUsers(users, currentUserName) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const name =
      typeof user === "string" ? user : user.name || user.userName || `User ${index + 1}`;
    const savedCrab =
      typeof user === "object" && user?.crab
        ? user.crab
        : name === currentUserName
          ? readStoredCrabProfile()
          : {};

    return {
      id: user.id || user.userId || name,
      name,
      crab: normalizeCrabProfile(savedCrab),
    };
  });
}

export function normalizeSongs(songs) {
  const sourceSongs = Array.isArray(songs) ? songs : [];

  return sourceSongs.map((song, index) => ({
    id: getSongId(song) || `${getSongTitle(song)}-${index}`,
    name: getSongTitle(song),
    artist: getSongArtist(song) || "Unknown artist",
    thumbnail: getSongThumbnail(song),
    songLink: getSongLink(song),
    videoId: getSongVideoId(song),
    source: song.source || "My Playlist",
  }));
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function makeLocalEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getQueueEntryScore(entry) {
  return Number.isFinite(entry?.score) ? entry.score : entry?.upvotes || 0;
}

function getStableColorIndex(value) {
  const text = String(value || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % VOTE_BOX_COLORS.length;
  }

  return hash;
}

export function getNextQueueColorIndex(queue = []) {
  const usedColorIndexes = new Set(
    queue
      .map((entry) => entry.colorIndex)
      .filter((colorIndex) => Number.isInteger(colorIndex))
  );

  for (let colorIndex = 0; colorIndex < VOTE_BOX_COLORS.length; colorIndex += 1) {
    if (!usedColorIndexes.has(colorIndex)) {
      return colorIndex;
    }
  }

  return queue.length % VOTE_BOX_COLORS.length;
}

export function normalizeQueueEntries(queue) {
  const sourceQueue = Array.isArray(queue) ? queue : [];

  return sourceQueue.map((entry, index) => {
    const songId = entry.songId || entry.id || `${entry.name || "song"}-${index}`;
    const entryId = entry.entryId || songId;

    return {
      entryId,
      song: {
        id: songId,
        name: entry.name || entry.title || "Untitled song",
        artist: entry.artist || "Unknown artist",
        thumbnail: entry.thumbnail || "",
        songLink: entry.songLink || "",
        videoId: entry.videoId || "",
        source: entry.source || "Room queue",
      },
      score: getQueueEntryScore(entry),
      colorIndex: Number.isInteger(entry.colorIndex)
        ? entry.colorIndex
        : getStableColorIndex(entryId),
      addedBy: entry.addedBy || null,
    };
  });
}

export function normalizeCurrentSong(song) {
  if (!song) {
    return null;
  }

  if (typeof song === "string") {
    return { name: song, artist: "" };
  }

  return {
    entryId: song.entryId || "",
    songId: song.songId || song.id || "",
    name: song.name || song.title || "Untitled song",
    artist: song.artist || "",
    thumbnail: song.thumbnail || "",
    songLink: song.songLink || "",
    videoId: song.videoId || "",
    score: getQueueEntryScore(song),
  };
}

export function getWinningQueueEntry(queue) {
  const entries = Array.isArray(queue) ? queue : [];
  if (!entries.length) return null;

  return entries.reduce((leader, entry) =>
    getQueueEntryScore(entry) > getQueueEntryScore(leader) ? entry : leader
  );
}

export function makeCurrentSongFromQueueEntry(entry) {
  return {
    entryId: entry.entryId || entry.songId,
    songId: entry.songId,
    name: entry.name,
    artist: entry.artist,
    thumbnail: entry.thumbnail || "",
    songLink: entry.songLink || "",
    videoId: entry.videoId || "",
    score: getQueueEntryScore(entry),
  };
}

export function isSameQueueEntry(entry, targetEntry) {
  if (!targetEntry) return false;

  return (entry.entryId || entry.songId) === (targetEntry.entryId || targetEntry.songId);
}

export function getConfiguredRoundSeconds(room) {
  return room?.options?.roundSeconds ?? room?.roundSeconds ?? ROUND_SECONDS;
}

export function getQueueAfterWinnerStarts(queue, winningEntry, options = {}) {
  const sourceQueue = Array.isArray(queue) ? queue : [];

  if (options.continuousPlaylistMode === "playQueue") {
    return sourceQueue.filter((entry) => !isSameQueueEntry(entry, winningEntry));
  }

  return [];
}

export function getRoomTimeLeft(room, now) {
  const roundSeconds = getConfiguredRoundSeconds(room);

  if (room?.timerPaused) {
    return clamp(room.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (now == null) {
    return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (room?.roundEndsAt) {
    return clamp(Math.ceil((new Date(room.roundEndsAt).getTime() - now) / 1000), 0, roundSeconds);
  }

  return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
}
