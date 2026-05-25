export function getAccountPlaylistKey(username) {
  return `accountPlaylist:${username || "guest"}`;
}

export function getSongLink(song) {
  return song?.songLink || song?.link || song?.url || song?.videoUrl || "";
}

export function getSongVideoId(song) {
  if (song?.videoId) return song.videoId;
  if (song?.details?.videoId) return song.details.videoId;

  const songLink = getSongLink(song);
  if (!songLink) return "";

  try {
    const url = new URL(songLink);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (url.hostname.includes("youtube.com")) {
      return (
        url.searchParams.get("v") ||
        url.pathname.split("/").filter(Boolean).pop() ||
        ""
      );
    }
  } catch {
    return /^[a-zA-Z0-9_-]{11}$/.test(songLink) ? songLink : "";
  }

  return "";
}

export function getSongId(song) {
  return song?.id || song?._id || getSongVideoId(song) || getSongLink(song) || song?.details?.title;
}

export function getSongTitle(song) {
  return song?.details?.title || song?.title || "Untitled song";
}

export function getSongArtist(song) {
  return song?.details?.author || song?.details?.channelTitle || song?.artist || "";
}

export function readAccountPlaylist(username) {
  try {
    return JSON.parse(localStorage.getItem(getAccountPlaylistKey(username))) || [];
  } catch {
    return [];
  }
}

export function writeAccountPlaylist(username, playlist) {
  localStorage.setItem(getAccountPlaylistKey(username), JSON.stringify(playlist));
}
