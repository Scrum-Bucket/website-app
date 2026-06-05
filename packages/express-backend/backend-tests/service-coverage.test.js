const bcrypt = require("bcrypt");
const mockingoose = require("mockingoose").default;

const songModel = require("../src/songs/song.js");
const songServices = require("../src/songs/song-services.js");
const userModel = require("../src/user/user.js");
const userServices = require("../src/user/user-services.js");
const youtubeServices = require("../src/youtube/youtube-services.js");
const {
  attachRoomMemberToken,
  createRoomMemberToken,
  verifyRoomMemberToken,
} = require("../src/utils/room-member-token.js");
const { generateRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } = require("../src/utils/room-code.js");
const { getAuthenticatedUserId, userResponse } = require("../src/utils/user-response.js");

const originalTokenSecret = process.env.TOKEN_SECRET;
const originalYoutubeApiKey = process.env.YOUTUBE_API_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  mockingoose.resetAll();
  process.env.TOKEN_SECRET = "test-token-secret";
  process.env.YOUTUBE_API_KEY = "test-youtube-key";
});

afterAll(() => {
  if (originalTokenSecret === undefined) delete process.env.TOKEN_SECRET;
  else process.env.TOKEN_SECRET = originalTokenSecret;

  if (originalYoutubeApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originalYoutubeApiKey;
});

test("createUser rejects short passwords and duplicate usernames", async () => {
  await expect(userServices.createUser("shorty", "short")).rejects.toThrow(
    "Password must be at least 8 characters long"
  );

  userModel.findOne = jest.fn().mockResolvedValue({ _id: "existing", userName: "taken" });

  await expect(userServices.createUser("taken", "password123")).rejects.toThrow(
    "An account with this username already exists."
  );
});

test("createUser maps duplicate save errors to a user-facing message", async () => {
  userModel.findOne = jest.fn().mockResolvedValue(null);
  mockingoose(userModel).toReturn(new Error("duplicate key error"), "save");

  await expect(userServices.createUser("new-user", "password123")).rejects.toThrow(
    "An account with this username already exists"
  );
});

test("loginUser rejects invalid passwords", async () => {
  userModel.findOne = jest.fn().mockResolvedValue({
    _id: "user-1",
    userName: "chris",
    passWord: await bcrypt.hash("password123", 10),
    status: 1,
  });

  await expect(userServices.loginUser("chris", "wrong-password")).rejects.toThrow(
    "Invalid password"
  );
});

test("session helpers validate session state and update active sessions", async () => {
  await expect(userServices.registerUserSession("user-1")).rejects.toThrow(
    "Session id is required"
  );
  await expect(userServices.heartbeatUser("user-1")).rejects.toThrow("Session id is required");

  userModel.findById = jest.fn().mockResolvedValueOnce(null);
  await expect(userServices.heartbeatUser("missing", "session-1")).rejects.toThrow(
    "User not found"
  );

  userModel.findById = jest.fn().mockResolvedValueOnce({ _id: "user-1", status: 0 });
  await expect(userServices.heartbeatUser("user-1", "session-1")).rejects.toThrow(
    "User is not logged in"
  );

  const activeUser = {
    _id: "user-1",
    status: 1,
    activeSessions: new Map([["old-session", new Date().toISOString()]]),
  };
  userModel.findById = jest.fn().mockResolvedValueOnce(activeUser);
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ ...activeUser, lastActiveAt: new Date() });

  await userServices.heartbeatUser("user-1", "new-session");

  expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
    "user-1",
    expect.objectContaining({
      activeSessions: expect.objectContaining({
        "old-session": expect.any(String),
        "new-session": expect.any(String),
      }),
    }),
    { new: true }
  );
});

test("logoutInactiveUsers preserves fresh sessions and logs out stale users", async () => {
  const now = Date.now();
  userModel.find = jest.fn().mockResolvedValue([
    {
      _id: "active-user",
      activeSessions: {
        fresh: new Date(now).toISOString(),
        stale: new Date(now - 120000).toISOString(),
      },
    },
    {
      _id: "stale-user",
      activeSessions: {
        stale: new Date(now - 120000).toISOString(),
      },
    },
  ]);
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

  const result = await userServices.logoutInactiveUsers(60000);

  expect(result.modifiedCount).toBe(2);
  expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
    "active-user",
    expect.objectContaining({
      status: 1,
      activeSessions: { fresh: expect.any(String) },
    })
  );
  expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
    "stale-user",
    expect.objectContaining({
      status: 0,
      lastActiveAt: null,
      activeSessions: {},
    })
  );
});

test("playlist and account update services cover create, update, and not-found branches", async () => {
  const existingPlaylist = { name: "Favorites", songs: [{ toString: () => "song-1" }] };
  const user = {
    _id: "user-1",
    playlists: [existingPlaylist],
    save: jest.fn().mockResolvedValue({ _id: "user-1", playlists: [existingPlaylist] }),
  };
  userModel.findById = jest.fn().mockResolvedValue(user);

  await userServices.addSongsToPlaylist("user-1", "Favorites", ["song-1", "song-2"]);
  expect(existingPlaylist.songs).toHaveLength(2);

  await userServices.addSongsToPlaylist("user-1", "Road Trip", ["song-3"]);
  expect(user.playlists).toHaveLength(2);

  userModel.findById = jest.fn().mockResolvedValue(null);
  await expect(userServices.addSongsToPlaylist("missing", "Favorites", [])).rejects.toThrow(
    "User not found"
  );
});

test("rename, password, admin, and crab profile services cover validation branches", async () => {
  userModel.findById = jest.fn().mockResolvedValue({ _id: "user-1", userName: "old-name" });
  userModel.findOne = jest.fn().mockResolvedValue({ _id: { toString: () => "other-user" } });

  await expect(userServices.renameUser("user-1", "taken")).rejects.toThrow("Username already taken");

  userModel.findOne = jest.fn().mockResolvedValue(null);
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: "user-1", userName: "new-name" });
  await expect(userServices.renameUser("user-1", "new-name")).resolves.toMatchObject({
    userName: "new-name",
  });

  await expect(userServices.changePassword("user-1", "short")).rejects.toThrow(
    "Password must be at least 8 characters long"
  );

  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: "user-1", isAdmin: true });
  await expect(userServices.promoteToAdmin("user-1")).resolves.toMatchObject({ isAdmin: true });

  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: "user-1", isAdmin: false });
  await expect(userServices.demoteFromAdmin("user-1")).resolves.toMatchObject({ isAdmin: false });

  userModel.findById = jest.fn().mockResolvedValue({ _id: "user-1", isAdmin: true });
  await expect(userServices.isAdmin("user-1")).resolves.toBe(true);

  expect(userServices.normalizeCrabProfile({ color: "not-a-color", hat: 12 })).toStrictEqual({
    color: "#e74c3c",
    hat: "",
  });
});

test("song services normalize YouTube ids from links and update existing songs missing video ids", async () => {
  const savedExistingSong = {
    songLink: "legacy-song-link",
    details: { title: "Never Gonna Give You Up", videoId: "dQw4w9WgXcQ" },
  };
  const existingSong = {
    songLink: "legacy-song-link",
    details: { title: "Never Gonna Give You Up" },
    save: jest.fn().mockResolvedValue(savedExistingSong),
  };
  songModel.findOne = jest.fn().mockResolvedValue(existingSong);

  const result = await songServices.findOrCreateSong({
    videoId: "dQw4w9WgXcQ",
    details: { title: "Never Gonna Give You Up" },
  });

  expect(result.details.videoId).toBe("dQw4w9WgXcQ");
  expect(existingSong.save).toHaveBeenCalled();
});

test("song services find, create, delete, and search through expected model calls", async () => {
  songModel.find = jest.fn().mockResolvedValue([]);
  await songServices.getSongs();
  expect(songModel.find).toHaveBeenCalledWith();

  songModel.findById = jest.fn().mockResolvedValue({ _id: "song-1" });
  await expect(songServices.findSongById("song-1")).resolves.toMatchObject({ _id: "song-1" });

  songModel.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: "song-1" });
  await expect(songServices.deleteSong("song-1")).resolves.toMatchObject({ _id: "song-1" });

  songModel.find = jest.fn().mockResolvedValue([]);
  await songServices.searchSong("sail");
  expect(songModel.find).toHaveBeenCalledWith({
    "details.title": { $regex: "sail", $options: "i" },
  });

  songModel.find = jest.fn().mockResolvedValue([]);
  await songServices.searchSong("");
  expect(songModel.find).toHaveBeenCalledWith();
});

test("song services create normalized songs from YouTube URL variants", async () => {
  mockingoose(songModel).toReturn(
    {
      songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      details: { videoId: "dQw4w9WgXcQ" },
    },
    "save"
  );

  const shortLinkSong = await songServices.addSong("https://youtu.be/dQw4w9WgXcQ", []);
  expect(shortLinkSong.details.videoId).toBe("dQw4w9WgXcQ");

  mockingoose(songModel).toReturn(
    {
      songLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      details: { videoId: "dQw4w9WgXcQ" },
    },
    "save"
  );

  const pathSong = await songServices.addSong("https://www.youtube.com/embed/dQw4w9WgXcQ", {});
  expect(pathSong.details.videoId).toBe("dQw4w9WgXcQ");

  mockingoose(songModel).toReturn(
    {
      songLink: "not-a-url-but-video",
      details: {},
    },
    "save"
  );

  const invalidSong = await songServices.addSong("not-a-url-but-video", ["legacy details"]);
  expect(invalidSong.details).toStrictEqual({});

  mockingoose(songModel).toReturn(
    {
      songLink: "https://example.com/watch?v=dQw4w9WgXcQ",
      details: {},
    },
    "save"
  );

  const nonYoutubeSong = await songServices.addSong(
    "https://example.com/watch?v=dQw4w9WgXcQ",
    { title: "Not YouTube" }
  );
  expect(nonYoutubeSong.details.videoId).toBeUndefined();
});

test("findOrCreateSong returns existing songs with video ids or creates missing songs", async () => {
  const existingSong = {
    songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    details: { title: "Existing", videoId: "dQw4w9WgXcQ" },
  };
  songModel.findOne = jest.fn().mockResolvedValueOnce(existingSong);

  await expect(
    songServices.findOrCreateSong({
      songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    })
  ).resolves.toBe(existingSong);

  songModel.findOne = jest.fn().mockResolvedValueOnce(null);
  mockingoose(songModel).toReturn(
    {
      songLink: "https://www.youtube.com/watch?v=abcdefghijk",
      details: { videoId: "abcdefghijk" },
    },
    "save"
  );

  const createdSong = await songServices.findOrCreateSong({ videoId: "abcdefghijk" });
  expect(createdSong.details.videoId).toBe("abcdefghijk");
});

test("song normalization accepts nested video ids and empty song links", async () => {
  mockingoose(songModel).toReturn(
    {
      songLink: "https://www.youtube.com/watch?v=nestedID123",
      details: { videoId: "nestedID123" },
    },
    "save"
  );

  const nestedVideoSong = await songServices.addSong("", { videoId: "nestedID123" });
  expect(nestedVideoSong.songLink).toBe("https://www.youtube.com/watch?v=nestedID123");
  expect(nestedVideoSong.details.videoId).toBe("nestedID123");

  mockingoose(songModel).toReturn(
    {
      songLink: "",
      details: {},
    },
    "save"
  );

  const emptySong = await songServices.addSong("", {});
  expect(emptySong.songLink).toBe("");
  expect(emptySong.details).toStrictEqual({});
});

test("youtube services compile valid songs, skip invalid videos, and follow pagination", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({
      items: [
        {
          id: "playlist-item-next",
          snippet: {
            title: "Next Page Song",
            channelTitle: "Next Page Channel - Topic",
            thumbnails: { medium: { url: "https://img.youtube.com/next.jpg" } },
            resourceId: { videoId: "NEXTVIDEO12" },
          },
        },
      ],
    }),
  });

  const result = await youtubeServices.compileSongs(
    {
      items: [
        {
          id: "playlist-item-first",
          snippet: {
            title: "First Song",
            videoOwnerChannelTitle: "First Artist - Topic",
            channelTitle: "First Channel",
            thumbnails: {
              default: { url: "https://img.youtube.com/default.jpg" },
              high: { url: "https://img.youtube.com/high.jpg" },
            },
            resourceId: { videoId: "FIRSTVIDEO1" },
          },
        },
        {
          snippet: {
            title: "Private video",
            thumbnails: { default: { url: "https://img.youtube.com/private.jpg" } },
            resourceId: { videoId: "PRIVATEVID1" },
          },
        },
      ],
      nextPageToken: "next-token",
    },
    "playlist-1"
  );

  expect(result).toHaveLength(2);
  expect(result.map((song) => song.details.title)).toStrictEqual(["First Song", "Next Page Song"]);
  expect(result.map((song) => song.details.artist)).toStrictEqual([
    "First Artist",
    "Next Page Channel",
  ]);
  expect(result.map((song) => song.details.videoId)).toStrictEqual(["FIRSTVIDEO1", "NEXTVIDEO12"]);
  expect(result.map((song) => song.songLink)).toStrictEqual([
    "https://www.youtube.com/watch?v=FIRSTVIDEO1",
    "https://www.youtube.com/watch?v=NEXTVIDEO12",
  ]);
  expect(result[0].details.thumbnail).toBe("https://img.youtube.com/high.jpg");
  expect(result[1].details.thumbnail).toBe("https://img.youtube.com/next.jpg");
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("pageToken=next-token"),
    { method: "GET" }
  );
});

test("youtube helpers compile single songs and surface fetch failures", async () => {
  expect(
    youtubeServices.compileSingleSong({
      id: "VIDEOID1234",
      snippet: {
        title: "Single Song",
        channelTitle: "Single Artist",
        thumbnails: { standard: { url: "https://img.youtube.com/single.jpg" } },
      },
    })
  ).toStrictEqual({
    songLink: "https://www.youtube.com/watch?v=VIDEOID1234",
    details: {
      title: "Single Song",
      videoId: "VIDEOID1234",
      artist: "Single Artist",
      thumbnail: "https://img.youtube.com/single.jpg",
    },
  });
  expect(
    youtubeServices.compileSong({
      id: "NOARTIST123",
      snippet: { title: "Mystery Song" },
    }).details.artist
  ).toBe("Unknown Artist");
  expect(youtubeServices.normalizeArtistName("King Gizzard & The Lizard Wizard - Topic")).toBe(
    "King Gizzard & The Lizard Wizard"
  );
  expect(youtubeServices.isValidSong({ snippet: { title: "Deleted video" } })).toBe(false);

  global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

  await expect(youtubeServices.getSongs("playlist-1")).rejects.toThrow(
    "failed to get playlist items"
  );
});

test("room member token and response utilities handle valid and invalid branches", () => {
  const token = createRoomMemberToken({ roomCode: "abc123", memberName: "Captain" });

  expect(verifyRoomMemberToken(token, "ABC123")).toMatchObject({
    roomCode: "ABC123",
    memberName: "Captain",
  });
  expect(verifyRoomMemberToken(token, "OTHER1")).toBeNull();
  expect(verifyRoomMemberToken("bad-token", "ABC123")).toBeNull();
  expect(attachRoomMemberToken(null, "ABC123", "Captain")).toBeNull();
  expect(attachRoomMemberToken({ roomCode: "ABC123" }, "ABC123", "")).toStrictEqual({
    roomCode: "ABC123",
  });

  const responseUser = userResponse({
    toObject: () => ({ userName: "chris", passWord: "secret" }),
  });
  expect(responseUser).toStrictEqual({ userName: "chris", authenticated: true });

  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  expect(getAuthenticatedUserId({ auth: { type: "shared-token" } }, res)).toBeNull();
  expect(res.status).toHaveBeenCalledWith(401);
  expect(getAuthenticatedUserId({ auth: { type: "frontend-user", userId: "user-1" } }, res)).toBe(
    "user-1"
  );

  expect(normalizeRoomCode(" abc123 ")).toBe("ABC123");
  expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
});
