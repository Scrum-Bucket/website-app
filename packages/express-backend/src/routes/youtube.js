const express = require("express");
const { requireEnv } = require("../env");
const songServices = require("../songs/song-services.js");
const userServices = require("../user/user-services.js");
const {
  compileSingleSong,
  compileSongs,
  getSongs,
} = require("../youtube/youtube-services.js");

function createYoutubeRouter() {
  const router = express.Router();

  router.get("/youtube/:link", async (req, res) => {
    const { link } = req.params;

    try {
      const apikey = requireEnv("YOUTUBE_API_KEY");

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${link}&maxResults=1&key=${apikey}`,
        { method: "GET" }
      );

      const content = await response.json();
      const playlistId = content["items"][0]["id"];
      const playlistItems = await getSongs(playlistId, undefined);
      const songs = await compileSongs(playlistItems, playlistId);

      res.status(200).send(songs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/users/:id/playlists/youtube/:playlistId", async (req, res) => {
    const { id, playlistId } = req.params;
    const { playlistName = "My Playlist" } = req.body;

    try {
      const playlistItems = await getSongs(playlistId, undefined);
      const songs = (await compileSongs(playlistItems, playlistId)).slice(0, 20);

      const savedSongs = await Promise.all(
        songs.map((songData) => songServices.findOrCreateSong(songData))
      );

      const songIds = savedSongs.map((song) => song._id);

      await userServices.addSongsToPlaylist(id, playlistName, songIds);

      res.status(200).json(savedSongs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/users/:id/songs/youtube/:videoId", async (req, res) => {
    const { id, videoId } = req.params;
    const { playlistName = "My Playlist" } = req.body;

    try {
      const apikey = requireEnv("YOUTUBE_API_KEY");

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&maxResults=1&key=${apikey}`,
        { method: "GET" }
      );

      const content = await response.json();

      if (!content.items || content.items.length === 0) {
        res.status(404).json({ error: "YouTube video not found." });
        return;
      }

      const songData = compileSingleSong(content.items[0]);
      const savedSong = await songServices.findOrCreateSong(songData);

      await userServices.addSongsToPlaylist(id, playlistName, [savedSong._id]);

      res.status(200).json([savedSong]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createYoutubeRouter;
