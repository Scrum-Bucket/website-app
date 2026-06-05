const { requireEnv } = require("../env");

async function getSongs(id, pageToken) {
  const apikey = requireEnv("YOUTUBE_API_KEY");
  const pageTokenQuery = pageToken !== undefined ? `&pageToken=${pageToken}` : "";

  return fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${apikey}${pageTokenQuery}`,
    { method: "GET" }
  )
    .then(async (response) => {
      const content = await response.json();
      return content;
    })
    .catch((error) => {
      throw new Error("failed to get playlist items: " + error);
    });
}

function compileSong(item) {
  const snippet = item.snippet || {};
  const videoId = snippet.resourceId?.videoId || item.id;
  const artist = normalizeArtistName(
    snippet.videoOwnerChannelTitle || snippet.channelTitle || "Unknown Artist"
  );

  return {
    songLink: `https://www.youtube.com/watch?v=${videoId}`,
    details: {
      title: snippet.title,
      videoId,
      artist,
      thumbnail: getBestThumbnailUrl(snippet.thumbnails),
    },
  };
}

function normalizeArtistName(artist = "") {
  return String(artist).replace(/\s*-\s*topic$/i, "").trim() || "Unknown Artist";
}

function compileSingleSong(videoItem) {
  return compileSong(videoItem);
}

function getBestThumbnailUrl(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

function isValidSong(item) {
  const title = item.snippet.title;
  return title !== "Private video" && title !== "Deleted video";
}

async function compileSongs(playlistItems, playlistId) {
  const songs = [];
  for (const item of playlistItems["items"]) {
    if (isValidSong(item)) {
      songs.push(compileSong(item));
    }
  }

  while (playlistItems["nextPageToken"] !== undefined) {
    const nextPageResponse = await getSongs(playlistId, playlistItems["nextPageToken"]);

    for (const item of nextPageResponse["items"]) {
      if (isValidSong(item)) {
        songs.push(compileSong(item));
      }
    }

    playlistItems = nextPageResponse;
  }
  return songs;
}

module.exports = {
  compileSong,
  compileSingleSong,
  compileSongs,
  getSongs,
  isValidSong,
  normalizeArtistName,
};
