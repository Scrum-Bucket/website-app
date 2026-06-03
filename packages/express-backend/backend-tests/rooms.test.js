const Room = require("../src/rooms/room.js");
const roomServices = require("../src/rooms/room-services.js");
const User = require("../src/user/user.js");

function makeRoom(overrides = {}) {
  const room = {
    roomCode: "PLAY1",
    members: [],
    queue: [],
    currentSong: null,
    roundSeconds: 120,
    roundEndsAt: new Date(Date.now() - 1000),
    timerPaused: false,
    timerRemainingSeconds: 0,
    started: true,
    markModified: jest.fn(),
    save: jest.fn(),
    ...overrides,
  };

  room.save.mockResolvedValue(room);
  room.toObject = () => ({
    roomCode: room.roomCode,
    members: room.members,
    queue: room.queue,
    currentSong: room.currentSong,
    roundSeconds: room.roundSeconds,
    roundEndsAt: room.roundEndsAt,
    timerPaused: room.timerPaused,
    timerRemainingSeconds: room.timerRemainingSeconds,
    options: room.options,
    started: room.started,
    host: room.host,
  });

  return room;
}

beforeEach(() => {
  jest.clearAllMocks();
  User.find = jest.fn().mockResolvedValue([]);
});

test("expired round selects winning song and pauses voting for playback", async () => {
  const room = makeRoom({
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        artist: "The Bells",
        songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        score: 8,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(room.save).toHaveBeenCalled();
  expect(result.currentSong.name).toBe("Hellfire");
  expect(result.currentSong.songLink).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  expect(result.queue).toStrictEqual([]);
  expect(result.timerPaused).toBe(true);
  expect(result.roundEndsAt).toBeNull();
});

test("completing current song clears playback and restarts voting timer", async () => {
  const room = makeRoom({
    host: "Captain",
    currentSong: {
      entryId: "entry-1",
      songId: "song-1",
      name: "Hellfire",
      songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    roundEndsAt: null,
    timerPaused: true,
    timerRemainingSeconds: 120,
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.completeCurrentSong("PLAY1", "entry-1", "Captain");

  expect(room.save).toHaveBeenCalled();
  expect(room.markModified).toHaveBeenCalledWith("currentSong");
  expect(result.currentSong).toBeNull();
  expect(result.timerPaused).toBe(false);
  expect(result.timerRemainingSeconds).toBe(120);
  expect(result.roundEndsAt).toBeInstanceOf(Date);
});

test("joining assigns a numbered room nickname when the display name already exists", async () => {
  const room = makeRoom({
    started: false,
    members: ["Tony", "Tony 2"],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.joinRoom("PLAY1", "Tony");

  expect(room.members).toStrictEqual(["Tony", "Tony 2", "Tony 3"]);
  expect(result.assignedMemberName).toBe("Tony 3");
});

test("guest joins receive an anonymous sea creature room nickname", async () => {
  jest.spyOn(Math, "random").mockReturnValue(0);
  const room = makeRoom({
    started: false,
    members: ["Anonymous Fish"],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.joinRoom("PLAY1", "Guest");

  expect(room.members).toStrictEqual(["Anonymous Fish", "Anonymous Fish 2"]);
  expect(result.assignedMemberName).toBe("Anonymous Fish 2");

  Math.random.mockRestore();
});

test("joining fails when a room already has 30 members", async () => {
  const room = makeRoom({
    started: false,
    members: Array.from({ length: 30 }, (_, index) => `Player ${index + 1}`),
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  await expect(roomServices.joinRoom("PLAY1", "Tony")).rejects.toThrow("Room is full.");
  expect(room.members).toHaveLength(30);
  expect(room.save).not.toHaveBeenCalled();
});

test("leaving removes the assigned room nickname", async () => {
  const room = makeRoom({
    started: false,
    members: ["Captain", "Anonymous Fish"],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.leaveRoom("PLAY1", "Anonymous Fish");

  expect(room.save).toHaveBeenCalled();
  expect(result.members).toStrictEqual(["Captain"]);
});

test("host leaving closes the room", async () => {
  const room = makeRoom({
    host: "Captain",
    started: false,
    members: ["Captain", "Anonymous Fish"],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);
  Room.findOneAndDelete = jest.fn().mockResolvedValue(room);

  const result = await roomServices.leaveRoom("PLAY1", "Captain");

  expect(Room.findOneAndDelete).toHaveBeenCalledWith({ roomCode: "PLAY1" });
  expect(room.save).not.toHaveBeenCalled();
  expect(result.closed).toBe(true);
  expect(result.members).toStrictEqual([]);
});

test("inactive participant is removed from the room", async () => {
  const room = makeRoom({
    host: "Captain",
    started: false,
    members: ["Captain", "Sailor"],
    memberActivity: {
      Captain: new Date().toISOString(),
      Sailor: new Date(Date.now() - 120000).toISOString(),
    },
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(room.save).toHaveBeenCalled();
  expect(result.members).toStrictEqual(["Captain"]);
});

test("room member heartbeat refreshes guest activity", async () => {
  const staleActivity = new Date(Date.now() - 60000).toISOString();
  const room = makeRoom({
    host: "Captain",
    started: false,
    members: ["Captain", "Anonymous Fish"],
    memberActivity: {
      Captain: new Date().toISOString(),
      "Anonymous Fish": staleActivity,
    },
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  await roomServices.recordMemberHeartbeat("PLAY1", "Anonymous Fish");

  expect(room.save).toHaveBeenCalled();
  expect(new Date(room.memberActivity["Anonymous Fish"]).getTime()).toBeGreaterThan(
    new Date(staleActivity).getTime()
  );
});

test("inactive host closes the room", async () => {
  const room = makeRoom({
    host: "Captain",
    started: false,
    members: ["Captain", "Sailor"],
    memberActivity: {
      Captain: new Date(Date.now() - 120000).toISOString(),
      Sailor: new Date().toISOString(),
    },
  });
  Room.findOne = jest.fn().mockResolvedValue(room);
  Room.findOneAndDelete = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(Room.findOneAndDelete).toHaveBeenCalledWith({ roomCode: "PLAY1" });
  expect(result).toBeNull();
});

test("host can update room options", async () => {
  const room = makeRoom({
    host: "Captain",
    started: false,
    roundEndsAt: null,
    timerRemainingSeconds: 120,
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.updateRoomOptions("PLAY1", "Captain", {
    roundSeconds: 21,
    continuousPlaylistMode: "removeVotes",
    removeSelectedSong: true,
    playOnAllDevices: false,
    pauseVotingWhenTimerPaused: true,
  });

  expect(room.save).toHaveBeenCalled();
  expect(result.options).toStrictEqual({
    roundSeconds: 21,
    continuousPlaylistMode: "removeVotes",
    removeSelectedSong: true,
    playOnAllDevices: false,
    pauseVotingWhenTimerPaused: true,
  });
  expect(result.roundSeconds).toBe(21);
});

test("only host can start room", async () => {
  const room = makeRoom({
    host: "Captain",
    started: false,
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  await expect(roomServices.startRoom("PLAY1", "Sailor")).rejects.toThrow(
    "Only the host can start the room"
  );
  expect(room.save).not.toHaveBeenCalled();
});

test("vote amount is applied one step at a time", async () => {
  const room = makeRoom({
    started: false,
    roundEndsAt: null,
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        score: 8,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.voteSong("PLAY1", "entry-1", 1);

  expect(result.queue[0].score).toBe(9);
  expect(room.save).toHaveBeenCalled();
});

test("voting can be locked while the host pauses the timer", async () => {
  const room = makeRoom({
    timerPaused: true,
    roundEndsAt: null,
    timerRemainingSeconds: 60,
    options: {
      roundSeconds: 120,
      continuousPlaylistMode: "removeSongs",
      removeSelectedSong: false,
      playOnAllDevices: true,
      pauseVotingWhenTimerPaused: true,
    },
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        artist: "The Bells",
        score: 8,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  await expect(roomServices.voteSong("PLAY1", "entry-1", 1)).rejects.toThrow("Voting is paused");
  expect(room.save).not.toHaveBeenCalled();
});

test("expired round can keep songs and remove votes", async () => {
  const room = makeRoom({
    options: {
      roundSeconds: 120,
      continuousPlaylistMode: "removeVotes",
      playOnAllDevices: true,
    },
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        artist: "The Bells",
        score: 8,
        upvotes: 8,
      },
      {
        entryId: "entry-2",
        songId: "song-2",
        name: "Sail Away",
        artist: "The Bells",
        score: 2,
        upvotes: 2,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(result.currentSong.name).toBe("Hellfire");
  expect(result.queue).toHaveLength(2);
  expect(result.queue.every((entry) => entry.score === 0 && entry.upvotes === 0)).toBe(true);
});

test("expired round can remove the selected song separately from vote cleanup", async () => {
  const room = makeRoom({
    options: {
      roundSeconds: 120,
      continuousPlaylistMode: "removeVotes",
      removeSelectedSong: true,
      playOnAllDevices: true,
    },
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        artist: "The Bells",
        score: 8,
      },
      {
        entryId: "entry-2",
        songId: "song-2",
        name: "Sail Away",
        artist: "The Bells",
        score: 2,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(result.currentSong.name).toBe("Hellfire");
  expect(result.queue).toHaveLength(1);
  expect(result.queue[0].name).toBe("Sail Away");
  expect(result.queue[0].score).toBe(0);
});

test("expired round can start queue playback without clearing the remaining queue", async () => {
  const room = makeRoom({
    options: {
      roundSeconds: 120,
      continuousPlaylistMode: "playQueue",
      removeSelectedSong: false,
      playOnAllDevices: true,
    },
    queue: [
      {
        entryId: "entry-1",
        songId: "song-1",
        name: "Hellfire",
        artist: "The Bells",
        score: 8,
      },
      {
        entryId: "entry-2",
        songId: "song-2",
        name: "Sail Away",
        artist: "The Bells",
        score: 2,
      },
    ],
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.findRoomByCode("PLAY1");

  expect(result.currentSong.name).toBe("Hellfire");
  expect(result.queue).toHaveLength(1);
  expect(result.queue[0].name).toBe("Sail Away");
  expect(result.timerPaused).toBe(true);
  expect(result.roundEndsAt).toBeNull();
});

test("completing a song in queue playback starts the next queued song before voting", async () => {
  const room = makeRoom({
    host: "Captain",
    options: {
      roundSeconds: 120,
      continuousPlaylistMode: "playQueue",
      removeSelectedSong: false,
      playOnAllDevices: true,
    },
    currentSong: {
      entryId: "entry-1",
      songId: "song-1",
      name: "Hellfire",
    },
    queue: [
      {
        entryId: "entry-2",
        songId: "song-2",
        name: "Sail Away",
        artist: "The Bells",
        score: 2,
      },
    ],
    roundEndsAt: null,
    timerPaused: true,
    timerRemainingSeconds: 120,
  });
  Room.findOne = jest.fn().mockResolvedValue(room);

  const result = await roomServices.completeCurrentSong("PLAY1", "entry-1", "Captain");

  expect(result.currentSong.name).toBe("Sail Away");
  expect(result.queue).toStrictEqual([]);
  expect(result.timerPaused).toBe(true);
  expect(result.roundEndsAt).toBeNull();
});
