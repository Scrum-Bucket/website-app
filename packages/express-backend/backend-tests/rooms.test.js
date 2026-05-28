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
