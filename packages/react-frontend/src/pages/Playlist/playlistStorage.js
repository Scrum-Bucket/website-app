export function getAccountPlaylistKey(username) {
  return `accountPlaylist:${username || "guest"}`;
}

export function getSongId(song) {
  return song?.id || song?.videoId || song?.details?.videoId || song?.details?.title;
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
