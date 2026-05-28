const Room = require("./room.js");
const User = require("../user/user.js");
const { normalizeCrabProfile } = require("../user/user-services.js");

const ROUND_SECONDS = 120;
const MIN_SCORE = -20;
const MAX_SCORE = 40;
const MAX_ROOM_MEMBERS = 30;
const GUEST_MEMBER_NAMES = [
  "Anonymous Fish",
  "Anonymous Crab",
  "Anonymous Octopus",
  "Anonymous Seahorse",
  "Anonymous Jellyfish",
  "Anonymous Starfish",
  "Anonymous Dolphin",
  "Anonymous Squid",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function makeEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRandomGuestMemberName() {
  const index = Math.floor(Math.random() * GUEST_MEMBER_NAMES.length);

  return GUEST_MEMBER_NAMES[index];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getUniqueMemberName(baseName, members = []) {
  const normalizedBaseName = (baseName || "Anonymous Fish").trim() || "Anonymous Fish";
  const existingNames = new Set(members.map((member, index) => getMemberName(member, index)));

  if (!existingNames.has(normalizedBaseName)) {
    return normalizedBaseName;
  }

  const numberedNamePattern = new RegExp(`^${escapeRegExp(normalizedBaseName)} (\\d+)$`);
  let highestSuffix = 1;

  for (const name of existingNames) {
    const match = numberedNamePattern.exec(name);

    if (match) {
      highestSuffix = Math.max(highestSuffix, Number(match[1]));
    }
  }

  return `${normalizedBaseName} ${highestSuffix + 1}`;
}

function getRoomMemberBaseName(userName) {
  const trimmedName = (userName || "").trim();

  return trimmedName === "Guest" || trimmedName.toLowerCase() === "guest"
    ? getRandomGuestMemberName()
    : trimmedName || getRandomGuestMemberName();
}

function attachAssignedMemberName(room, assignedMemberName) {
  if (!room) return room;

  return {
    ...room,
    assignedMemberName,
  };
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

function makeCurrentSong(entry) {
  return {
    entryId: entry.entryId,
    songId: entry.songId,
    name: entry.name,
    artist: entry.artist,
    songLink: entry.songLink || "",
    videoId: entry.videoId || "",
    score: getEntryScore(entry),
    playbackStartedAt: new Date(),
  };
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

  if (room.started && !room.currentSong && !room.timerPaused && !room.roundEndsAt) {
    room.roundEndsAt = new Date(Date.now() + room.timerRemainingSeconds * 1000);
    changed = true;
  }

  if (
    room.started &&
    !room.currentSong &&
    !room.timerPaused &&
    room.roundEndsAt &&
    secondsUntil(room.roundEndsAt) <= 0
  ) {
    const winningEntry = getWinningEntry(room.queue);

    if (winningEntry) {
      room.currentSong = makeCurrentSong(winningEntry);
      room.queue = [];
      room.timerPaused = true;
      room.timerRemainingSeconds = room.roundSeconds;
      room.roundEndsAt = null;
    } else {
      room.timerRemainingSeconds = room.roundSeconds;
      room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);
    }

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
  const hostMemberName = host ? getUniqueMemberName(getRoomMemberBaseName(host), []) : null;
  const newRoom = new Room({
    roomCode,
    host: hostMemberName,
    members: hostMemberName ? [hostMemberName] : [],
    queue: [],
    currentSong: null,
    roundSeconds: ROUND_SECONDS,
    roundEndsAt: null,
    timerPaused: false,
    timerRemainingSeconds: ROUND_SECONDS,
    started: false,
  });
  return attachAssignedMemberName(await attachMemberProfiles(await newRoom.save()), hostMemberName);
}

async function joinRoom(roomCode, userName) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) return null;

  const members = Array.isArray(room.members) ? room.members : [];

  if (members.length >= MAX_ROOM_MEMBERS) {
    throw new Error("Room is full.");
  }

  const assignedMemberName = getUniqueMemberName(
    getRoomMemberBaseName(userName),
    members
  );

  room.members.push(assignedMemberName);

  return attachAssignedMemberName(await attachMemberProfiles(await room.save()), assignedMemberName);
}

async function startRoom(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;

  room.started = true;
  room.currentSong = null;
  room.roundSeconds = room.roundSeconds || ROUND_SECONDS;
  room.timerPaused = false;
  room.timerRemainingSeconds = room.roundSeconds;
  room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);

  return attachMemberProfiles(await room.save());
}

async function addSongToQueue(
  roomCode,
  songId,
  name,
  artist,
  addedBy = null,
  songLink = "",
  videoId = ""
) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) return null;

  room.queue.push({
    entryId: makeEntryId(),
    songId,
    name,
    artist,
    songLink,
    videoId,
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
  if (room.currentSong) throw new Error("Cannot change the voting timer while a song is playing");

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

async function completeCurrentSong(roomCode, entryId = null, userName = null) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;
  if (room.host && room.host !== userName) {
    throw new Error("Only the host can restart voting after playback");
  }

  if (
    room.currentSong &&
    entryId &&
    room.currentSong.entryId &&
    room.currentSong.entryId !== entryId
  ) {
    return attachMemberProfiles(await syncRoomGameState(room));
  }

  if (room.currentSong) {
    room.currentSong = null;
    room.roundSeconds = room.roundSeconds || ROUND_SECONDS;
    room.timerPaused = false;
    room.timerRemainingSeconds = room.roundSeconds;
    room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);
    room.markModified("currentSong");

    return attachMemberProfiles(await room.save());
  }

  return attachMemberProfiles(await syncRoomGameState(room));
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
  completeCurrentSong,
  leaveRoom,
  deleteRoom,
  getPublicRooms,
};
