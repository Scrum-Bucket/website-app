export function getAccountPlaylistKey(username) {
  return `accountPlaylist:${username || "guest"}`;
}

function isYouTubeVideoId(value) {
  return /^[a-zA-Z0-9_-]{11}$/.test(value || "");
}

export function getSongLink(song) {
  return song?.songLink || song?.link || song?.url || song?.videoUrl || "";
}

export function getSongVideoId(song) {
  if (isYouTubeVideoId(song?.videoId)) return song.videoId;
  if (isYouTubeVideoId(song?.details?.videoId)) return song.details.videoId;
  if (isYouTubeVideoId(song?.id)) return song.id;
  if (isYouTubeVideoId(song?._id)) return song._id;

  const songLink = getSongLink(song);
  if (!songLink) return "";

  try {
    const url = new URL(songLink);

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0] || "";

      return isYouTubeVideoId(videoId) ? videoId : "";
    }

    if (url.hostname.includes("youtube.com")) {
      const queryVideoId = url.searchParams.get("v");
      const pathVideoId = url.pathname.split("/").filter(Boolean).pop() || "";
      const videoId = isYouTubeVideoId(queryVideoId) ? queryVideoId : pathVideoId;

      return isYouTubeVideoId(videoId) ? videoId : "";
    }
  } catch {
    return isYouTubeVideoId(songLink) ? songLink : "";
  }

  return "";
}

export function getYouTubeWatchLink(videoId) {
  return isYouTubeVideoId(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : "";
}

export function getSongId(song) {
  return getSongVideoId(song) || song?.id || song?._id || getSongLink(song) || song?.details?.title;
}

export function getSongTitle(song) {
  return song?.details?.title || song?.title || "Untitled song";
}

export function getSongArtist(song) {
  return song?.details?.author || song?.details?.channelTitle || song?.artist || "";
}

export function normalizePlayableSong(song) {
  const videoId = getSongVideoId(song);

  if (!videoId) {
    return null;
  }

  return {
    id: videoId,
    title: getSongTitle(song),
    artist: getSongArtist(song),
    songLink: getSongLink(song) || getYouTubeWatchLink(videoId),
    videoId,
  };
}

export function readAccountPlaylist(username) {
  const playlistKey = getAccountPlaylistKey(username);

  try {
    const savedPlaylist = JSON.parse(localStorage.getItem(playlistKey)) || [];
    const playableSongs = savedPlaylist.map(normalizePlayableSong).filter(Boolean);

    if (playableSongs.length !== savedPlaylist.length) {
      writeAccountPlaylist(username, playableSongs);
    }

    return playableSongs;
  } catch {
    return [];
  }
}

export function writeAccountPlaylist(username, playlist) {
  const playableSongs = playlist.map(normalizePlayableSong).filter(Boolean);

  localStorage.setItem(getAccountPlaylistKey(username), JSON.stringify(playableSongs));
}
