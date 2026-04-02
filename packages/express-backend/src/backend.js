//backend.js
const express = require("express");
const cors = require("cors"); //frontend to backend
const userServices = require("./user/user-services.js");
const songServices = require("./songs/song-services.js");

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

function setDatabaseConn(conn) {
  userServices.setDatabaseConn(conn);
}

// get all users or filter by userName
app.get("/users", async (req, res) => {
  const { userName } = req.query;
  await userServices
    .getUsers(userName)
    .then((users) => res.json(users))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/users/:id", async (req, res) => {
  await userServices
    .findUserById(req.params.id)
    .then((user) => {
      if (!user) return res.status(404).send("User not found.");
      res.json(user);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// createUser
app.post("/users", async (req, res) => {
  const { userName } = req.body;
  await userServices
    .createUser(userName)
    .then((created) => res.status(201).json(created))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// deleteUser
app.delete("/users/:id", async (req, res) => {
  await userServices
    .deleteUser(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("User not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// loginUser
app.post("/users/:id/login", async (req, res) => {
  await userServices
    .loginUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// logoutUser
app.post("/users/:id/logout", async (req, res) => {
  await userServices
    .logoutUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// timeoutUser
app.post("/users/:id/timeout", async (req, res) => {
  await userServices
    .timeoutUser(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// changePrefs: send { favorites: [...], crab: [...] } in body, both optional
app.patch("/users/:id/prefs", async (req, res) => {
  await userServices
    .changePrefs(req.params.id, req.body)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.get("/", (req, res) => {
  res.send("Backend running.");
});

//song functions below!

// get all songs or filter by songLink
app.get("/songs", async (req, res) => {
  const { songLink } = req.query;
  await songServices
    .getSongs(songLink)
    .then((songs) => res.json(songs))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// search by keyword in details must be before /songs/:id
app.get("/songs/search", async (req, res) => {
  const { keyword } = req.query;
  await songServices
    .searchSong(keyword)
    .then((songs) => res.json(songs))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/songs/:id", async (req, res) => {
  await songServices
    .findSongById(req.params.id)
    .then((song) => {
      if (!song) return res.status(404).send("Song not found.");
      res.json(song);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// addSong send { songLink, details } in body
app.post("/songs", async (req, res) => {
  const { songLink, details } = req.body;
  await songServices
    .addSong(songLink, details)
    .then((created) => res.status(201).json(created))
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.delete("/songs/:id", async (req, res) => {
  await songServices
    .deleteSong(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("Song not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

module.exports = { app, setDatabaseConn };
