//backend.js
const express = require("express");
const cors = require("cors"); //frontend to backend
const userServices = require("./user/user-services.js");
const songServices = require("./songs/song-services.js");
const path = require("path");

const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "config", "database.env"),
});

const app = express();

app.use(cors());
app.use(express.json());

//endpoint to search for a youtube song

/*
Note about these changes:
- The URL says :link, yet the code reads req.body.id
- Also makes front end call simple -> 'fetch("/youtube/PLAYLIST_ID")'
- Now it reads the playlist value from the URL, rather than looking in req.body
*/
app.get("/youtube/:link", async (req, res) => {
  const { link } = req.params;
  const apikey = process.env.YOUTUBE_API_KEY;
  const promise = fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${link}&maxResults=1&key=${apikey}`,
    {
      method: "GET",
    }
  )
    .then(async (response) => {
      const content = await response.json();
      const playlistId = content["items"][0]["id"];
      const playlistItems = await getSongs(playlistId, undefined);
      console.log("YouTube API Response:", content);
      const songs = await compileSongs(playlistItems, playlistId);
      res.status(200).send(songs);
    })
    .catch((error) => res.status(500).json({ error: error.message }));
  return promise;
});

async function getSongs(id, pageToken) {
  const apikey = process.env.YOUTUBE_API_KEY;
  if (pageToken !== undefined) {
    return fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${apikey}&pageToken=${pageToken}`,
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

  return fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${apikey}`,
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

async function compileSongs(playlistItems, playlistId) {
  const songs = [];
  for (const item of playlistItems["items"]) {
    if (
      item.snippet.title !== "Private video" &&
      item.snippet.title !== "Deleted video" &&
      item.snippet.thumbnails?.default?.url
    ) {
      songs.push({
        songLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        details: {
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.default.url,
          description: item.snippet.description,
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
      if (item.snippet.title !== "Private video" && item.snippet.title !== "Deleted video") {
        songs.push({
          songLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          details: {
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default.url,
            description: item.snippet.description,
          },
        });
      }
    }

    playlistItems = nextPageResponse;
  }
  console.log("Extracted Songs:", songs);
  return songs;
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
  console.log("Received create user request with body:", req.body);
  const userName = req.body.username;
  const passWord = req.body.password;

  await userServices
    .createUser(userName, passWord)
    .then((created) => res.status(201).json(created))
    .catch((err) => {
      if (
        err.message?.includes("already exists") ||
        err.code === 11000 ||
        (err.message && err.message.toLowerCase().includes("duplicate key"))
      ) {
        return res.status(409).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    });
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

// loginUser - expects { username, password } in body
app.post("/users/login", async (req, res) => {
  const { username, password } = req.body;
  await userServices
    .loginUser(username, password)
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

// renameUser - expects { newUserName } in body
app.patch("/users/:id/rename", async (req, res) => {
  const { newUserName } = req.body;
  if (!newUserName) {
    return res.status(400).json({ error: "newUserName is required" });
  }
  await userServices
    .renameUser(req.params.id, newUserName)
    .then((user) => res.json(user))
    .catch((err) => {
      if (err.message.includes("already taken")) {
        return res.status(409).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    });
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

module.exports = { app, getSongs };
