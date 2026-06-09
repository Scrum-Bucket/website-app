const Room = require("./room.js");
const User = require("../user/user.js");
const { normalizeCrabProfile } = require("../user/user-services.js");

const ROUND_SECONDS = 120;
const MIN_SCORE = -20;
const MAX_SCORE = 40;
const MAX_ROOM_MEMBERS = 30;
const MEMBER_HEARTBEAT_TIMEOUT_MS = Number(process.env.ROOM_MEMBER_HEARTBEAT_TIMEOUT_MS) || 75000;
const PUBLIC_ROOMS_CACHE_MS = Number(process.env.PUBLIC_ROOMS_CACHE_MS) || 10000;
const MIN_ROUND_SECONDS = 0;
const MAX_ROUND_SECONDS = 900;
const VOTE_BOX_COLOR_COUNT = 10;
const DEFAULT_ROOM_OPTIONS = Object.freeze({
  roundSeconds: ROUND_SECONDS,
  continuousPlaylistMode: "removeSongs",
  removeSelectedSong: false,
  playOnAllDevices: true,
  pauseVotingWhenTimerPaused: false,
});
const CONTINUOUS_PLAYLIST_MODES = new Set([
  "removeSongs",
  "removeVotes",
  "keepAll",
  "playQueue",
]);
const ROOM_PRIVACY_MODES = new Set(["public", "private"]);
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
const roomLocks = new Map();
let publicRoomsCache = {
  expiresAt: 0,
  rooms: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRoomOptions(options = {}) {
  const roundSeconds = Number(options.roundSeconds);
  const continuousPlaylistMode = CONTINUOUS_PLAYLIST_MODES.has(options.continuousPlaylistMode)
    ? options.continuousPlaylistMode
    : DEFAULT_ROOM_OPTIONS.continuousPlaylistMode;

  return {
    roundSeconds: Number.isFinite(roundSeconds)
      ? clamp(Math.round(roundSeconds), MIN_ROUND_SECONDS, MAX_ROUND_SECONDS)
      : DEFAULT_ROOM_OPTIONS.roundSeconds,
    continuousPlaylistMode,
    removeSelectedSong:
      typeof options.removeSelectedSong === "boolean"
        ? options.removeSelectedSong
        : DEFAULT_ROOM_OPTIONS.removeSelectedSong,
    playOnAllDevices:
      typeof options.playOnAllDevices === "boolean"
        ? options.playOnAllDevices
        : DEFAULT_ROOM_OPTIONS.playOnAllDevices,
    pauseVotingWhenTimerPaused:
      typeof options.pauseVotingWhenTimerPaused === "boolean"
        ? options.pauseVotingWhenTimerPaused
        : DEFAULT_ROOM_OPTIONS.pauseVotingWhenTimerPaused,
  };
}

function getRoomOptions(room) {
  return normalizeRoomOptions(room?.options);
}

function normalizeRoomPrivacy(privacy) {
  return ROOM_PRIVACY_MODES.has(privacy) ? privacy : "public";
}

function isWinningEntry(entry, winningEntry) {
  if (!winningEntry) return false;

  return (entry.entryId || entry.songId) === (winningEntry.entryId || winningEntry.songId);
}

function applyQueueCleanupMode(queue, winningEntry, options) {
  // Apply the host selected cleanup rule after a round winner is picked
  let nextQueue =
    options.continuousPlaylistMode === "removeSongs"
      ? []
      : queue.filter((entry) => !(options.removeSelectedSong && isWinningEntry(entry, winningEntry)));

  if (options.continuousPlaylistMode === "playQueue") {
    return queue.filter((entry) => !isWinningEntry(entry, winningEntry));
  }

  if (options.continuousPlaylistMode === "removeVotes") {
    nextQueue = nextQueue.map((entry) => ({
      ...entry,
      score: 0,
      upvotes: 0,
    }));
  }

  return nextQueue;
}

function makeEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNextQueueColorIndex(queue = []) {
  // Reuse the first open color so stacked vote cards stay readable
  const usedColorIndexes = new Set(
    queue
      .map((entry) => entry.colorIndex)
      .filter((colorIndex) => Number.isInteger(colorIndex))
  );

  for (let colorIndex = 0; colorIndex < VOTE_BOX_COLOR_COUNT; colorIndex += 1) {
    if (!usedColorIndexes.has(colorIndex)) {
      return colorIndex;
    }
  }

  return queue.length % VOTE_BOX_COLOR_COUNT;
}

function getRandomGuestMemberName() {
  const index = Math.floor(Math.random() * GUEST_MEMBER_NAMES.length);

  return GUEST_MEMBER_NAMES[index];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getUniqueMemberName(baseName, members = []) {
  // Add a number when a room nickname is already taken
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

function invalidatePublicRoomsCache() {
  publicRoomsCache = {
    expiresAt: 0,
    rooms: null,
  };
}

async function withRoomLock(roomCode, task) {
  // Serialize joins per room to avoid duplicate names and capacity races
  const lockKey = roomCode || "room";
  const previousLock = roomLocks.get(lockKey) || Promise.resolve();
  let releaseLock;
  const nextLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  const queueEntry = previousLock.catch(() => {}).then(() => nextLock);

  roomLocks.set(lockKey, queueEntry);
  await previousLock.catch(() => {});

  try {
    return await task();
  } finally {
    releaseLock();
    if (roomLocks.get(lockKey) === queueEntry) {
      roomLocks.delete(lockKey);
    }
  }
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
    thumbnail: entry.thumbnail || "",
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

function getMemberActivity(room) {
  const source = room?.memberActivity || {};

  if (source instanceof Map) {
    return Object.fromEntries(source);
  }

  return typeof source === "object" && !Array.isArray(source) ? { ...source } : {};
}

function setMemberActivity(room, activity) {
  room.memberActivity = activity;
  if (typeof room.markModified === "function") {
    room.markModified("memberActivity");
  }
}

function touchRoomMember(room, memberName, at = new Date()) {
  if (!room || !memberName) return;

  const activity = getMemberActivity(room);
  activity[memberName] = at.toISOString();
  setMemberActivity(room, activity);
}

async function pruneInactiveMembers(room, now = Date.now()) {
  if (!room) return room;

  // Drop members whose browser stopped sending heartbeats
  const members = Array.isArray(room.members) ? room.members : [];
  const activity = getMemberActivity(room);
  let changed = false;
  const hostWasMember =
    Boolean(room.host) && members.some((member, index) => getMemberName(member, index) === room.host);

  const activeMembers = members.filter((member, index) => {
    const memberName = getMemberName(member, index);
    if (!activity[memberName]) {
      activity[memberName] = new Date(now).toISOString();
      changed = true;
    }

    const lastSeenAt = new Date(activity[memberName]).getTime();
    const isActive = Number.isFinite(lastSeenAt) && now - lastSeenAt <= MEMBER_HEARTBEAT_TIMEOUT_MS;

    if (!isActive) {
      delete activity[memberName];
      changed = true;
    }

    return isActive;
  });

  if (activeMembers.length !== members.length) {
    room.members = activeMembers;
    changed = true;
  }

  const hostIsStillActive = activeMembers.some(
    (member, index) => getMemberName(member, index) === room.host
  );

  if (hostWasMember && !hostIsStillActive) {
    await Room.findOneAndDelete({ roomCode: room.roomCode });
    return null;
  }

  if (changed) {
    setMemberActivity(room, activity);
    return room.save();
  }

  return room;
}

async function attachMemberProfiles(room) {
  if (!room) return room;

  // Hide internal heartbeat data before returning rooms to clients
  const roomObject = typeof room.toObject === "function" ? room.toObject() : { ...room };
  roomObject.options = getRoomOptions(roomObject);
  delete roomObject.memberActivity;
  delete roomObject.__v;
  const members = Array.isArray(roomObject.members) ? roomObject.members : [];
  const memberNames = members.map(getMemberName).filter(Boolean);
  const users = memberNames.length ? await User.find({ userName: { $in: memberNames } }) : [];
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

  // Preserve privacy field so room filtering can work correctly downstream
  if (room.privacy) {
    roomObject.privacy = room.privacy;
  }

  return roomObject;
}

async function attachMemberProfilesToRooms(rooms) {
  return Promise.all(rooms.map((room) => attachMemberProfiles(room)));
}

async function syncRoomGameState(room) {
  if (!room) return room;

  // Keep timers and playback state current on every room read
  room = await pruneInactiveMembers(room);
  if (!room) return null;

  let changed = false;
  const roomOptions = getRoomOptions(room);

  if (JSON.stringify(room.options || {}) !== JSON.stringify(roomOptions)) {
    room.options = roomOptions;
    changed = true;
  }

  if (room.roundSeconds == null) {
    room.roundSeconds = roomOptions.roundSeconds;
    changed = true;
  }

  if (room.timerRemainingSeconds == null) {
    room.timerRemainingSeconds = room.roundSeconds ?? roomOptions.roundSeconds;
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
      room.queue = applyQueueCleanupMode(room.queue, winningEntry, roomOptions);
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
  const now = Date.now();
  if (publicRoomsCache.rooms && publicRoomsCache.expiresAt > now) {
    return publicRoomsCache.rooms;
  }

  // Cache public room browsing briefly to reduce repeated database reads
  const rooms = await Room.find({ privacy: "public" });
  // Defensive: filter to ensure only explicitly public rooms are included
  // This protects against mocks or buggy DBs that ignore the query filter
  const filtered = Array.isArray(rooms) ? rooms.filter((r) => r && r.privacy === "public") : [];
  const publicRooms = await attachMemberProfilesToRooms(await syncRooms(filtered));
  publicRoomsCache = {
    expiresAt: now + PUBLIC_ROOMS_CACHE_MS,
    rooms: publicRooms,
  };

  return publicRooms;
}

async function pruneInactiveRooms() {
  const rooms = await Room.find();
  await syncRooms(rooms);
}

function findRoomById(id) {
  return Room.findById(id);
}

async function findRoomByCode(roomCode) {
  const room = await Room.findOne({ roomCode });
  return attachMemberProfiles(await syncRoomGameState(room));
}

async function addRoom(roomCode, host = null, privacy = "public") {
  const hostMemberName = host ? getUniqueMemberName(getRoomMemberBaseName(host), []) : null;
  const newRoom = new Room({
    roomCode,
    host: hostMemberName,
    members: hostMemberName ? [hostMemberName] : [],
    memberActivity: hostMemberName ? { [hostMemberName]: new Date().toISOString() } : {},
    queue: [],
    currentSong: null,
    roundSeconds: ROUND_SECONDS,
    roundEndsAt: null,
    timerPaused: false,
    timerRemainingSeconds: ROUND_SECONDS,
    options: { ...DEFAULT_ROOM_OPTIONS },
    started: false,
    privacy: normalizeRoomPrivacy(privacy),
  });
  const createdRoom = attachAssignedMemberName(
    await attachMemberProfiles(await newRoom.save()),
    hostMemberName
  );
  invalidatePublicRoomsCache();
  return createdRoom;
}

async function joinRoom(roomCode, userName) {
  return withRoomLock(roomCode, async () => {
    const room = await Room.findOne({ roomCode });
    if (!room) return null;

    const members = Array.isArray(room.members) ? room.members : [];

    if (members.length >= MAX_ROOM_MEMBERS) {
      throw new Error("Room is full.");
    }

    await syncRoomGameState(room);

    // Store the assigned nickname so guests keep a stable room identity
    const assignedMemberName = getUniqueMemberName(
      getRoomMemberBaseName(userName),
      members
    );

    room.members.push(assignedMemberName);
    touchRoomMember(room, assignedMemberName);

    const joinedRoom = attachAssignedMemberName(
      await attachMemberProfiles(await room.save()),
      assignedMemberName
    );
    invalidatePublicRoomsCache();
    return joinedRoom;
  });
}

async function recordMemberHeartbeat(roomCode, memberName) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;

  const members = Array.isArray(room.members) ? room.members : [];
  const isMember = members.some((member, index) => getMemberName(member, index) === memberName);
  if (!isMember) return attachMemberProfiles(await syncRoomGameState(room));

  touchRoomMember(room, memberName);
  return attachMemberProfiles(await syncRoomGameState(await room.save()));
}

async function startRoom(roomCode, userName) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;
  if (room.host !== userName) throw new Error("Only the host can start the room");

  room.started = true;
  room.currentSong = null;
  const roomOptions = getRoomOptions(room);
  room.options = roomOptions;
  room.roundSeconds = roomOptions.roundSeconds;
  room.timerPaused = false;
  room.timerRemainingSeconds = room.roundSeconds;
  room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);

  const startedRoom = await attachMemberProfiles(await room.save());
  invalidatePublicRoomsCache();
  return startedRoom;
}

async function addSongToQueue(
  roomCode,
  songId,
  name,
  artist,
  addedBy = null,
  songLink = "",
  videoId = "",
  thumbnail = ""
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
  thumbnail,
  score: 0,
  upvotes: 0,
  colorIndex: getNextQueueColorIndex(room.queue),
  addedBy,
});

  return attachMemberProfiles(await room.save());
}

async function voteSong(roomCode, entryId, amount) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) throw new Error("Room not found");

  // Votes are one step at a time and clamped to the game limits
  const roomOptions = getRoomOptions(room);
  if (room.timerPaused && !room.currentSong && roomOptions.pauseVotingWhenTimerPaused) {
    throw new Error("Voting is paused");
  }

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
      : (room.timerRemainingSeconds ?? room.roundSeconds ?? ROUND_SECONDS);
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
    const roomOptions = getRoomOptions(room);
    room.options = roomOptions;
    room.roundSeconds = roomOptions.roundSeconds;

    if (roomOptions.continuousPlaylistMode === "playQueue") {
      const nextEntry = getWinningEntry(room.queue);

      if (nextEntry) {
        room.currentSong = makeCurrentSong(nextEntry);
        room.queue = room.queue.filter((entry) => !isWinningEntry(entry, nextEntry));
        room.timerPaused = true;
        room.timerRemainingSeconds = room.roundSeconds;
        room.roundEndsAt = null;
        room.markModified("queue");
        room.markModified("currentSong");

        const nextRoom = await attachMemberProfiles(await room.save());
        invalidatePublicRoomsCache();
        return nextRoom;
      }
    }

    room.currentSong = null;
    room.timerPaused = false;
    room.timerRemainingSeconds = room.roundSeconds;
    room.roundEndsAt = new Date(Date.now() + room.roundSeconds * 1000);
    room.markModified("currentSong");

    const nextRoom = await attachMemberProfiles(await room.save());
    invalidatePublicRoomsCache();
    return nextRoom;
  }

  return attachMemberProfiles(await syncRoomGameState(room));
}

async function updateRoomOptions(roomCode, userName, nextOptions = {}) {
  const room = await syncRoomGameState(await Room.findOne({ roomCode }));
  if (!room) return null;
  if (room.host !== userName) throw new Error("Only the host can change room options");

  const currentOptions = getRoomOptions(room);
  const roomOptions = normalizeRoomOptions({
    ...currentOptions,
    ...nextOptions,
  });

  room.options = roomOptions;

  if (!room.started || !room.currentSong) {
    room.roundSeconds = roomOptions.roundSeconds;

    if (room.timerPaused || !room.roundEndsAt) {
      room.timerRemainingSeconds = roomOptions.roundSeconds;
    } else {
      room.timerRemainingSeconds = roomOptions.roundSeconds;
      room.roundEndsAt = new Date(Date.now() + roomOptions.roundSeconds * 1000);
    }
  }

  const updatedRoom = await attachMemberProfiles(await room.save());
  invalidatePublicRoomsCache();
  return updatedRoom;
}

async function leaveRoom(roomCode, userName) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;

  if (room.host === userName) {
    await Room.findOneAndDelete({ roomCode });
    invalidatePublicRoomsCache();

    return {
      roomCode,
      closed: true,
      members: [],
      memberProfiles: [],
    };
  }

  room.members = (room.members || []).filter((member, index) => getMemberName(member, index) !== userName);
  const activity = getMemberActivity(room);
  delete activity[userName];
  setMemberActivity(room, activity);

  const updatedRoom = await attachMemberProfiles(await room.save());
  invalidatePublicRoomsCache();
  return updatedRoom;
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
  updateRoomOptions,
  leaveRoom,
  deleteRoom,
  getPublicRooms,
  pruneInactiveRooms,
  recordMemberHeartbeat,
};
