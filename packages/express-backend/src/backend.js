//backend.js
const express = require("express");
const cors = require("cors"); //frontend to backend
const { requireEnv } = require("./env");
const {
  authenticateUser,
  clearUserAuthCookie,
  setUserAuthCookie,
  signin,
  signinPage,
  signout,
} = require("./auth");
const userServices = require("./user/user-services.js");
const songServices = require("./songs/song-services.js");
const roomServices = require("./rooms/room-services.js");

const app = express();
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

app.set("trust proxy", 1);

function normalizeCorsOrigin(origin) {
  if (!origin) return "";

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

function firstHeaderValue(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getRequestOrigin(req) {
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) || req.protocol;
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) || req.headers.host;

  return host ? `${protocol}://${host}` : "";
}

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => normalizeCorsOrigin(origin.trim()))
  .filter(Boolean);

const defaultAllowedOrigins = [
  "https://polite-sea-008d19c10.7.azurestaticapps.net",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function isAllowedCorsOrigin(origin) {
  const normalizedOrigin = normalizeCorsOrigin(origin);
  const configuredOrigins = allowedOrigins.length
    ? allowedOrigins
    : defaultAllowedOrigins.map(normalizeCorsOrigin);
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

  return configuredOrigins.includes(normalizedOrigin) || isLocalDevOrigin;
}

function isSameOriginRequest(origin, req) {
  return normalizeCorsOrigin(origin) === normalizeCorsOrigin(getRequestOrigin(req));
}

app.use((req, res, next) =>
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (isAllowedCorsOrigin(origin) || isSameOriginRequest(origin, req)) {
        return callback(null, true);
      }

      console.warn("Rejected CORS origin:", {
        origin,
        requestOrigin: getRequestOrigin(req),
        allowedOrigins: allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins,
      });
      return callback(new Error("Not allowed by CORS"));
    },
  })(req, res, next)
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function generateRoomCode() {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    return ROOM_CODE_CHARS[index];
  }).join("");
}

function normalizeRoomCode(roomCode) {
  return (roomCode || "").trim().toUpperCase();
}

function userResponse(user) {
  const userData = typeof user.toObject === "function" ? user.toObject() : user;
  delete userData.passWord;

  return { ...userData, authenticated: true };
}

app.get("/signin", signinPage);
app.post("/signin", signin);
app.get("/signout", signout);
app.post("/signout", signout);

app.get("/", (req, res) => {
  res.send("Backend running.");
});

app.use(authenticateUser);

app.get("/youtube/:link", async (req, res) => {
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

app.post("/users/:id/playlists/youtube/:playlistId", async (req, res) => {
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

async function getSongs(id, pageToken) {
  const apikey = requireEnv("YOUTUBE_API_KEY");
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

function isValidSong(item) {
  const title = item.snippet.title;
  return title !== "Private video" && title !== "Deleted video";
}

async function compileSongs(playlistItems, playlistId) {
  const songs = [];
  for (const item of playlistItems["items"]) {
    if (isValidSong(item)) {
      songs.push({
        songLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        details: {
          title: item.snippet.title,
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
        songs.push({
          songLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          details: {
            title: item.snippet.title,
          },
        });
      }
    }

    playlistItems = nextPageResponse;
  }
  console.log("Extracted Songs:", songs);
  return songs;
}

// ── Users ─────────────────────────────────────────────────────────────────────

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
    .then((created) => {
      setUserAuthCookie(req, res, created);
      res.status(201).json(userResponse(created));
    })
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
    .then((user) => {
      setUserAuthCookie(req, res, user);
      res.json(userResponse(user));
    })
    .catch((err) => res.status(400).json({ error: err.message }));
});

// logoutUser
app.post("/users/:id/logout", async (req, res) => {
  await userServices
    .logoutUser(req.params.id)
    .then((user) => {
      clearUserAuthCookie(req, res);
      res.json(user);
    })
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

// changePassword - expects { newPassword } in body
app.patch("/users/:id/password", async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "newPassword is required" });
  }

  await userServices
    .changePassword(req.params.id, newPassword)
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

// unbanUser - remove timeout status
app.post("/users/:id/unban", async (req, res) => {
  await userServices
    .unbanUser(req.params.id)
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

// promoteToAdmin - promote user to admin
app.post("/users/:id/promote", async (req, res) => {
  // Verify that the requester is an admin (optional - implement your own auth check)
  await userServices
    .promoteToAdmin(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// demoteFromAdmin - demote admin to regular user
app.post("/users/:id/demote", async (req, res) => {
  // Verify that the requester is an admin (optional - implement your own auth check)
  await userServices
    .demoteFromAdmin(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// isAdmin - check if user is admin
app.get("/users/:id/admin-status", async (req, res) => {
  await userServices
    .isAdmin(req.params.id)
    .then((isAdminStatus) => res.json({ isAdmin: isAdminStatus }))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// ── Songs ─────────────────────────────────────────────────────────────────────

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
  if (!songLink) return res.status(400).json({ error: "songLink is required." });
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

// ── Rooms ─────────────────────────────────────────────────────────────────────

// GET /rooms  – list all rooms (optionally filter by ?roomCode=)
app.get("/rooms", async (req, res) => {
  const { roomCode } = req.query;
  await roomServices
    .getRooms(roomCode)
    .then((rooms) => res.json(rooms))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// GET /rooms/:roomCode  – get a single room by its code
app.get("/rooms/:roomCode", async (req, res) => {
  await roomServices
    .findRoomByCode(req.params.roomCode)
    .then((room) => {
      if (!room) return res.status(404).json({ error: "Room not found." });
      res.json(room);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// POST /rooms/:roomCode/join  – join a room  { userName }
app.post("/rooms", async (req, res) => {
  const requestedRoomCode = normalizeRoomCode(req.body.roomCode);
  const host = (req.body.host || req.body.userName || req.body.username || "").trim() || null;
  const maxAttempts = requestedRoomCode ? 1 : 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const roomCode = requestedRoomCode || generateRoomCode();

    try {
      const existingRoom = await roomServices.findRoomByCode(roomCode);
      if (existingRoom) {
        if (requestedRoomCode) {
          return res.status(409).json({ error: "Room code already exists." });
        }
        continue;
      }

      const created = await roomServices.addRoom(roomCode, host);
      return res.status(201).json(created);
    } catch (err) {
      if (err.code === 11000) {
        if (requestedRoomCode) {
          return res.status(409).json({ error: "Room code already exists." });
        }
        continue;
      }

      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(500).json({ error: "Could not create a unique room code." });
});

app.post("/rooms/:roomCode/join", async (req, res) => {
  const { userName } = req.body;
  if (!userName) return res.status(400).json({ error: "userName is required." });
  await roomServices
    .joinRoom(req.params.roomCode, userName)
    .then((room) => {
      if (!room) return res.status(404).json({ error: "Room not found." });
      res.json(room);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// POST /rooms/:roomCode/start  – host starts the game
app.post("/rooms/:roomCode/start", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);

  await roomServices
    .startRoom(roomCode)
    .then((room) => {
      if (!room) return res.status(404).json({ error: "Room not found." });
      res.json(room);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// POST /rooms/:roomCode/queue  – add a song  { songId, name, artist }
app.post("/rooms/:roomCode/queue", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  const { songId, name, artist } = req.body;
  if (!songId) return res.status(400).json({ error: "songId is required." });
  await roomServices
    .addSongToQueue(roomCode, songId, name || "Unknown", artist || "Unknown")
    .then((room) => {
      if (!room) return res.status(404).json({ error: "Room not found." });
      res.json(room);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// POST /rooms/:roomCode/upvote  – upvote a song  { songId }
app.post("/rooms/:roomCode/upvote", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: "songId is required." });
  await roomServices
    .upvoteSong(roomCode, songId)
    .then((room) => res.json(room))
    .catch((err) => res.status(400).json({ error: err.message }));
});

// POST /rooms/:roomCode/leave  – leave a room  { userName }
app.post("/rooms/:roomCode/leave", async (req, res) => {
  const { userName } = req.body;
  if (!userName) return res.status(400).json({ error: "userName is required." });
  await roomServices
    .leaveRoom(req.params.roomCode, userName)
    .then((room) => {
      if (!room) return res.status(404).json({ error: "Room not found." });
      res.json(room);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// DELETE /rooms/:id  – delete a room by MongoDB id
app.delete("/rooms/:id", async (req, res) => {
  await roomServices
    .deleteRoom(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("Room not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

module.exports = { app, getSongs };
