const express = require("express");
const roomServices = require("../rooms/room-services.js");
const { createRateLimiter } = require("../http/rate-limit.js");
const {
  generateRoomCode,
  normalizeRoomCode,
} = require("../utils/room-code.js");
const {
  attachRoomMemberToken,
  getVerifiedRoomMember,
} = require("../utils/room-member-token.js");

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function getTrustedMemberName(req, roomCode) {
  return getVerifiedRoomMember(req, roomCode)?.memberName || "";
}

function getRoomMutationRateLimitKey(req) {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  const memberToken = req.headers["x-room-member-token"];
  const clientAddress =
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  return `${roomCode}:${memberToken || clientAddress}`;
}

const roomMutationRateLimiter = createRateLimiter({
  keyGenerator: getRoomMutationRateLimitKey,
  maxRequests: Number(process.env.ROOM_MUTATION_RATE_LIMIT_MAX) || 240,
  message: "Too many room actions. Please slow down and try again.",
  windowMs: Number(process.env.ROOM_MUTATION_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
});

function limitRoomMutations(req, res, next) {
  if (["POST", "PATCH", "DELETE"].includes(req.method)) {
    return roomMutationRateLimiter(req, res, next);
  }

  return next();
}

function createRoomsRouter() {
  const router = express.Router();

  router.use("/:roomCode", limitRoomMutations);

  router.get("/", async (req, res) => {
    const { roomCode, privacy } = req.query;

    if (!roomCode && privacy === "public") {
      await roomServices
        .getPublicRooms()
        .then((rooms) => res.json(rooms))
        .catch((err) => res.status(500).json({ error: err.message }));
    } else if (roomCode) {
      await roomServices
        .getRooms(roomCode)
        .then((rooms) => res.json(rooms))
        .catch((err) => res.status(500).json({ error: err.message }));
    } else {
      await roomServices
        .getRooms()
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
        if (err.message.startsWith("Only the host")) {
          return res.status(403).json({ error: err.message });
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
        return res
          .status(201)
          .json(attachRoomMemberToken(created, roomCode, created.assignedMemberName));
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
        res.json(attachRoomMemberToken(room, roomCode, room.assignedMemberName));
      })
      .catch((err) => {
        if (err.message === "Room is full.") {
          return res.status(409).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
      });
  });

  router.post("/:roomCode/heartbeat", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const memberName = getTrustedMemberName(req, roomCode);
    if (!memberName) return res.status(403).json({ error: "Valid room member token required." });

    await roomServices
      .recordMemberHeartbeat(roomCode, memberName)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/:roomCode/start", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const memberName = getTrustedMemberName(req, roomCode);
    if (!memberName) return res.status(403).json({ error: "Valid room member token required." });

    await roomServices
      .startRoom(roomCode, memberName)
      .then((room) => {
        if (!room) return res.status(404).json({ error: "Room not found." });
        res.json(room);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/:roomCode/queue", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { songId, name, artist, songLink, videoId } = req.body;
    const memberName = getTrustedMemberName(req, roomCode);
    if (!songId) return res.status(400).json({ error: "songId is required." });
    if (!memberName) return res.status(403).json({ error: "Valid room member token required." });
    await roomServices
      .addSongToQueue(
        roomCode,
        songId,
        name || "Unknown",
        artist || "Unknown",
        memberName,
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
    const memberName = getTrustedMemberName(req, roomCode);
    if (!entryId) return res.status(400).json({ error: "entryId is required." });
    if (!memberName) return res.status(403).json({ error: "Valid room member token required." });
    if (![1, -1].includes(Number(amount))) {
      return res.status(400).json({ error: "Vote amount must be 1 or -1." });
    }
    await roomServices
      .voteSong(roomCode, entryId, Number(amount))
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
    const userName = getTrustedMemberName(req, roomCode);
    if (!userName) return res.status(403).json({ error: "Valid room member token required." });
    await roomServices
      .deleteSongFromQueue(roomCode, req.params.entryId, userName)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:roomCode/timer", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const paused = parseBoolean(req.body.paused);
    const userName = getTrustedMemberName(req, roomCode);
    if (paused === null) return res.status(400).json({ error: "paused must be true or false." });
    if (!userName) return res.status(403).json({ error: "Valid room member token required." });
    await roomServices
      .setTimerPaused(roomCode, paused, userName)
      .then((room) => res.json(room))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.patch("/:roomCode/options", async (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { options = {} } = req.body;
    const userName = getTrustedMemberName(req, roomCode);
    if (!userName) return res.status(403).json({ error: "Valid room member token required." });

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
    const { entryId } = req.body;
    const userName = getTrustedMemberName(req, roomCode);
    if (!userName) return res.status(403).json({ error: "Valid room member token required." });

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
    const userName = getTrustedMemberName(req, roomCode);
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
