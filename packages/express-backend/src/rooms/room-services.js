const Room = require("./room.js");
const User = require("../user/user.js");
const { normalizeCrabProfile } = require("../user/user-services.js");

const ROUND_SECONDS = 120;
const MIN_SCORE = -20;
const MAX_SCORE = 40;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function makeEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getEntryScore(entry) {
  return Number.isFinite(entry.score) ? entry.score : entry.upvotes || 0;
}

function getWinningEntry(queue) {
  if (!queue.length) return null;

  return queue.reduce((leader, entry) =>
    getEntryScore(entry) > getEntryScore(leader) ? entry : leader
  );
}

function secondsUntil(date, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now) / 1000));
}

function getMemberName(member, index) {
  if (typeof member === "string") {
    return member;
  }

  return member?.name || member?.userName || member?.id || `User ${index + 1}`;
}

function getMemberId(member, index) {
  if (typeof member === "string") {
    return member;
  }

  return member?.id || member?.userId || member?._id || getMemberName(member, index);
}

async function attachMemberProfiles(room) {
  if (!room) return room;

  const roomObject = typeof room.toObject === "function" ? room.toObject() : { ...room };
  const members = Array.isArray(roomObject.members) ? roomObject.members : [];
  const memberNames = members.map(getMemberName).filter(Boolean);
  const users = memberNames.length
    ? await User.find({ userName: { $in: memberNames } })
    : [];
  const crabsByUserName = new Map(
    users.map((user) => [user.userName, normalizeCrabProfile(user.crab)])
  );

  roomObject.memberProfiles = members.map((member, index) => {
    const name = getMemberName(member, index);

    return {
      id: getMemberId(member, index),
      name,
      crab: crabsByUserName.get(name) || normalizeCrabProfile(member?.crab),
    };
  });

  return roomObject;
}

async function attachMemberProfilesToRooms(rooms) {
  return Promise.all(rooms.map((room) => attachMemberProfiles(room)));
}

async function syncRoomGameState(room) {
  if (!room) return room;

  let changed = false;

  if (!room.roundSeconds) {
    room.roundSeconds = ROUND_SECONDS;
    changed = true;
  }

  if (room.timerRemainingSeconds == null) {
    room.timerRemainingSeconds = room.roundSeconds;
    changed = true;
  }

  if (room.started && !room.timerPaused && !room.roundEndsAt) {
    room.roundEndsAt = new Date(Date.now() + room.timerRemainingSeconds * 1000);
    changed = true;
  }

  if (room.started && !room.timerPaused && room.roundEndsAt && secondsUntil(room.roundEndsAt) <= 0) {
    const winningEntry = getWinningEntry(room.queue);

    if (winningEntry) {
      room.currentSong = {
        songId: winningEntry.songId,
        name: winningEntry.name,
        artist: winningEntry.artist,
        score: getEntryScore(winningEntry),
      };
      room.queue = [];
    }

    room.timerRemainingSeconds = room.roundSeconds;
    room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);
    changed = true;
  }

  if (changed) {
    return room.save();
  }

  return room;
}

async function syncRooms(rooms) {
  return Promise.all(rooms.map((room) => syncRoomGameState(room)));
}

async function getRooms(roomCode) {
  const rooms = roomCode ? await Room.find({ roomCode }) : await Room.find();
  return attachMemberProfilesToRooms(await syncRooms(rooms));
}

async function getPublicRooms() {
  const rooms = await Room.find({ privacy: "public" });
  return attachMemberProfilesToRooms(await syncRooms(rooms));
}

function findRoomById(id) {
  return Room.findById(id);
}

async function findRoomByCode(roomCode) {
  const room = await Room.findOne({ roomCode });
  return attachMemberProfiles(await syncRoomGameState(room));
}

async function addRoom(roomCode, host = null) {
  const newRoom = new Room({
    roomCode,
    host,
    members: host ? [host] : [],
    queue: [],
    currentSong: null,
    roundSeconds: ROUND_SECONDS,
    roundEndsAt: null,
    timerPaused: false,
    timerRemainingSeconds: ROUND_SECONDS,
    started: false,
  });
  return attachMemberProfiles(await newRoom.save());
}

async function joinRoom(roomCode, userName) {
  const room = await Room.findOneAndUpdate(
    { roomCode },
    { $addToSet: { members: userName } },
    { new: true }
  );
  return attachMemberProfiles(await syncRoomGameState(room));
}

async function startRoom(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;

  room.started = true;
  room.roundSeconds = room.roundSeconds || ROUND_SECONDS;
  room.timerPaused = false;
  room.timerRemainingSeconds = room.roundSeconds;
  room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);

  return attachMemberProfiles(await room.save());
}

async function addSongToQueue(roomCode, songId, name, artist, addedBy = null) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) return null;

  room.queue.push({
    entryId: makeEntryId(),
    songId,
    name,
    artist,
    score: 0,
    upvotes: 0,
    addedBy,
  });

  return attachMemberProfiles(await room.save());
}

async function voteSong(roomCode, entryId, amount) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) throw new Error("Room not found");

  const idx = room.queue.findIndex((s) => s.entryId === entryId || s.songId === entryId);
  if (idx === -1) throw new Error("Song not in queue");

  const nextScore = clamp(getEntryScore(room.queue[idx]) + amount, MIN_SCORE, MAX_SCORE);

  room.queue[idx].score = nextScore;
  room.queue[idx].upvotes = nextScore;
  room.queue.sort((a, b) => getEntryScore(b) - getEntryScore(a));

  room.markModified("queue");
  return attachMemberProfiles(await room.save());
}

function upvoteSong(roomCode, songId) {
  return voteSong(roomCode, songId, 1);
}

async function deleteSongFromQueue(roomCode, entryId, userName) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) throw new Error("Room not found");

  const entry = room.queue.find((song) => song.entryId === entryId || song.songId === entryId);
  if (!entry) throw new Error("Song not in queue");

  if (room.host !== userName && entry.addedBy !== userName) {
    throw new Error("Only the host or the user who added this song can delete it");
  }

  room.queue = room.queue.filter((song) => {
    if (entry.entryId) return song.entryId !== entry.entryId;
    return song.songId !== entry.songId;
  });
  room.markModified("queue");
  return attachMemberProfiles(await room.save());
}

async function setTimerPaused(roomCode, paused, userName) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) throw new Error("Room not found");
  if (room.host !== userName) throw new Error("Only the host can pause the timer");

  if (paused && !room.timerPaused) {
    room.timerRemainingSeconds = room.roundEndsAt
      ? secondsUntil(room.roundEndsAt)
      : room.timerRemainingSeconds || room.roundSeconds || ROUND_SECONDS;
    room.roundEndsAt = null;
    room.timerPaused = true;
  } else if (!paused && room.timerPaused) {
    room.timerPaused = false;
    room.roundEndsAt = new Date(Date.now() + room.timerRemainingSeconds * 1000);
  }

  return attachMemberProfiles(await room.save());
}

async function leaveRoom(roomCode, userName) {
  const room = await Room.findOneAndUpdate(
    { roomCode },
    { $pull: { members: userName } },
    { new: true }
  );
  return attachMemberProfiles(room);
}

function deleteRoom(id) {
  return Room.findByIdAndDelete(id);
}

module.exports = {
  getRooms,
  findRoomById,
  findRoomByCode,
  addRoom,
  joinRoom,
  startRoom,
  addSongToQueue,
  upvoteSong,
  voteSong,
  deleteSongFromQueue,
  setTimerPaused,
  leaveRoom,
  deleteRoom,
  getPublicRooms,
};
