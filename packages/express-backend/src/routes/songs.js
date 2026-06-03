const express = require("express");
const songServices = require("../songs/song-services.js");

function createSongsRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { songLink } = req.query;
    await songServices
      .getSongs(songLink)
      .then((songs) => res.json(songs))
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.get("/search", async (req, res) => {
    const { keyword } = req.query;
    await songServices
      .searchSong(keyword)
      .then((songs) => res.json(songs))
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.get("/:id", async (req, res) => {
    await songServices
      .findSongById(req.params.id)
      .then((song) => {
        if (!song) return res.status(404).send("Song not found.");
        res.json(song);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/", async (req, res) => {
    const { songLink, details } = req.body;
    if (!songLink) return res.status(400).json({ error: "songLink is required." });
    await songServices
      .addSong(songLink, details)
      .then((created) => res.status(201).json(created))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.delete("/:id", async (req, res) => {
    await songServices
      .deleteSong(req.params.id)
      .then((deleted) => {
        if (!deleted) return res.status(404).send("Song not found.");
        res.status(204).send();
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  return router;
}

module.exports = createSongsRouter;
