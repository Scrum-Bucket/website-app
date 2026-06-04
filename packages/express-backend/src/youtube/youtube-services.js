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

function compileSingleSong(videoItem) {
  const videoId = videoItem.id;

  return {
    songLink: `https://www.youtube.com/watch?v=${videoId}`,
    details: {
      title: videoItem.snippet.title,
      videoId,
    },
  };
}

function isValidSong(item) {
  const title = item.snippet.title;
  return title !== "Private video" && title !== "Deleted video";
}

async function compileSongs(playlistItems, playlistId) {
  const songs = [];
  for (const item of playlistItems["items"]) {
    if (isValidSong(item)) {
      const videoId = item.snippet.resourceId.videoId;

      songs.push({
        songLink: `https://www.youtube.com/watch?v=${videoId}`,
        details: {
          title: item.snippet.title,
          videoId,
        },
      });
    }
  }

  while (playlistItems["nextPageToken"] !== undefined) {
    console.log("Next Page Token:", playlistItems["nextPageToken"]);
    console.log("Current Songs Count:", songs.length);
    const nextPageResponse = await getSongs(playlistId, playlistItems["nextPageToken"]);
    console.log("Next Page token", nextPageResponse["nextPageToken"]);

    for (const item of nextPageResponse["items"]) {
      if (isValidSong(item)) {
        const videoId = item.snippet.resourceId.videoId;

        songs.push({
          songLink: `https://www.youtube.com/watch?v=${videoId}`,
          details: {
            title: item.snippet.title,
            videoId,
          },
        });
      }
    }

    playlistItems = nextPageResponse;
  }
  console.log("Extracted Songs:", songs);
  return songs;
}

module.exports = {
  compileSingleSong,
  compileSongs,
  getSongs,
  isValidSong,
};
