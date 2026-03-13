//backend.js
const express = require("express");
const cors = require("cors");//frontend to backend
const userServices = require("./user/user-services.js");
const songServices = require("./songs/song-services.js");

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

app.get("/users/:id", (req, res) => {
  userServices.findUserById(req.params.id)
    .then((user) => {
      if (!user) return res.status(404).send("User not found.");
      res.json(user);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// createUser
app.post("/users", (req, res) => {
  const { userName } = req.body;
  userServices.createUser(userName)
    .then((created) => res.status(201).json(created))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// deleteUser
app.delete("/users/:id", (req, res) => {
  userServices.deleteUser(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("User not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// loginUser
app.post("/users/:id/login", (req, res) => {
  userServices.loginUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// logoutUser
app.post("/users/:id/logout", (req, res) => {
  userServices.logoutUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// timeoutUser
app.post("/users/:id/timeout", (req, res) => {
  userServices.timeoutUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// changePrefs: send { favorites: [...], crab: [...] } in body, both optional
app.patch("/users/:id/prefs", (req, res) => {
  userServices.changePrefs(req.params.id, req.body)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.get("/", (req, res) => {
  res.send("Backend running.");
});

//song functions below!

// get all songs or filter by songLink
app.get("/songs", (req, res) => {
  const { songLink } = req.query;
  songServices.getSongs(songLink)
    .then((songs) => res.json(songs))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// search by keyword in details must be before /songs/:id
app.get("/songs/search", (req, res) => {
  const { keyword } = req.query;
  songServices.searchSong(keyword)
    .then((songs) => res.json(songs))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/songs/:id", (req, res) => {
  songServices.findSongById(req.params.id)
    .then((song) => {
      if (!song) return res.status(404).send("Song not found.");
      res.json(song);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// addSong send { songLink, details } in body
app.post("/songs", (req, res) => {
  const { songLink, details } = req.body;
  songServices.addSong(songLink, details)
    .then((created) => res.status(201).json(created))
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.delete("/songs/:id", (req, res) => {
  songServices.deleteSong(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("Song not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

module.exports = app;