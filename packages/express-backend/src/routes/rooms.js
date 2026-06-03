const express = require("express");
const roomServices = require("../rooms/room-services.js");
const {
  generateRoomCode,
  normalizeRoomCode,
} = require("../utils/room-code.js");

function createRoomsRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { roomCode, privacy } = req.query;

    if (!roomCode && privacy === "public") {
      await roomServices
        .getPublicRooms()
        .then((rooms) => res.json(rooms))
        .catch((err) => res.status(500).json({ error: err.message }));
    } else {
      await roomServices
        .getRooms(roomCode)
        .then((rooms) => res.json(rooms))
        .catch((err) => res.status(500).json({ error: err.message }));
    }
  });

  router.get("/:roomCode", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);

    await roomServices
      .findRoomByCode(roomCode)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => {
        if (err.message === "Room is full.") {
          return res.status(409).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
      });
  });

  router.post("/", async (req, res) => {
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

  router.post("/:roomCode/join", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { userName } = req.body;
    if (!userName) return res.status(400).json({ error: "userName is required." });
    await roomServices
      .joinRoom(roomCode, userName)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/:roomCode/start", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);

    await roomServices
      .startRoom(roomCode)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/:roomCode/queue", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { songId, name, artist, addedBy, songLink, videoId } = req.body;
    if (!songId) return res.status(400).json({ error: "songId is required." });
    await roomServices
      .addSongToQueue(
        roomCode,
        songId,
        name || "Unknown",
        artist || "Unknown",
        addedBy || null,
        songLink || "",
        videoId || ""
      )
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/:roomCode/vote", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { entryId, amount } = req.body;
    if (!entryId) return res.status(400).json({ error: "entryId is required." });
    await roomServices
      .voteSong(roomCode, entryId, Number(amount) || 0)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:roomCode/upvote", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: "songId is required." });
    await roomServices
      .upvoteSong(roomCode, songId)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.delete("/:roomCode/queue/:entryId", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { userName } = req.body;
    await roomServices
      .deleteSongFromQueue(roomCode, req.params.entryId, userName)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:roomCode/timer", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { paused, userName } = req.body;
    await roomServices
      .setTimerPaused(roomCode, Boolean(paused), userName)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.patch("/:roomCode/options", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { userName, options = {} } = req.body;

    await roomServices
      .updateRoomOptions(roomCode, userName, options)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:roomCode/current-song/complete", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { entryId, userName } = req.body;

    await roomServices
      .completeCurrentSong(roomCode, entryId, userName)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:roomCode/leave", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { userName } = req.body;
    if (!userName) return res.status(400).json({ error: "userName is required." });
    await roomServices
      .leaveRoom(roomCode, userName)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.delete("/:id", async (req, res) => {
    await roomServices
      .deleteRoom(req.params.id)
      .then((deleted) => {
        if (!deleted) return res.status(404).send("Room not found.");
        res.status(204).send();
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  return router;
}

module.exports = createRoomsRouter;
