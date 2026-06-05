const express = require("express");
const supertest = require("supertest");

process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || "test-token-secret";
process.env.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "test-youtube-key";

const createRoomsRouter = require("../src/routes/rooms.js");
const createUsersRouter = require("../src/routes/users.js");
const createYoutubeRouter = require("../src/routes/youtube.js");
const roomServices = require("../src/rooms/room-services.js");
const songServices = require("../src/songs/song-services.js");
const userServices = require("../src/user/user-services.js");
const { createRoomMemberToken } = require("../src/utils/room-member-token.js");

function makeApp(path, router, auth = { type: "frontend-user", userId: "user-1", sessionId: "session-1" }) {
  const app = express();
  app.use(express.json());
  // Inject auth so router tests can focus on route behavior
  app.use((req, _res, next) => {
    req.auth = auth;
    next();
  });
  app.use(path, router);
  return app;
}

function memberHeaders(roomCode = "PLAY1", memberName = "Captain") {
  return {
    "X-Room-Member-Token": createRoomMemberToken({ roomCode, memberName }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("users router covers current-user success, missing-user, delete, logout, heartbeat, and prefs", async () => {
  const app = makeApp("/users", createUsersRouter());

  jest.spyOn(userServices, "findUserById").mockResolvedValueOnce({
    _id: "user-1",
    userName: "Captain",
    passWord: "secret",
  });
  await supertest(app).get("/users/me").expect(200).expect(({ body }) => {
    expect(body.passWord).toBeUndefined();
    expect(body.authenticated).toBe(true);
  });

  userServices.findUserById.mockResolvedValueOnce(null);
  await supertest(app).get("/users/me").expect(404);

  jest.spyOn(userServices, "deleteUser").mockResolvedValueOnce({ _id: "user-1" });
  await supertest(app).delete("/users/me").expect(204);

  jest.spyOn(userServices, "logoutUser").mockResolvedValueOnce({ _id: "user-1", userName: "Captain" });
  await supertest(app).post("/users/me/logout").expect(200);

  jest.spyOn(userServices, "heartbeatUser").mockResolvedValueOnce({
    _id: "user-1",
    lastActiveAt: new Date(),
  });
  jest.spyOn(roomServices, "recordMemberHeartbeat").mockResolvedValueOnce({});
  await supertest(app)
    .post("/users/me/heartbeat")
    .send({ roomCode: "play1", roomMemberName: "Captain" })
    .expect(200);

  userServices.heartbeatUser.mockRejectedValueOnce(new Error("session expired"));
  await supertest(app).post("/users/me/heartbeat").send({}).expect(401);

  jest.spyOn(userServices, "changePrefs").mockResolvedValueOnce({ _id: "user-1", crab: {} });
  await supertest(app).patch("/users/me/prefs").send({ crab: {} }).expect(200);
});

test("users router covers rename, password, admin, and id-based branches", async () => {
  const app = makeApp("/users", createUsersRouter());

  await supertest(app).patch("/users/me/rename").send({}).expect(400);
  jest.spyOn(userServices, "renameUser").mockRejectedValueOnce(new Error("Username already taken"));
  await supertest(app).patch("/users/me/rename").send({ newUserName: "taken" }).expect(409);
  userServices.renameUser.mockRejectedValueOnce(new Error("bad name"));
  await supertest(app).patch("/users/me/rename").send({ newUserName: "bad" }).expect(400);
  userServices.renameUser.mockResolvedValueOnce({ _id: "user-1", userName: "NewName" });
  await supertest(app).patch("/users/me/rename").send({ newUserName: "NewName" }).expect(200);

  await supertest(app).patch("/users/me/password").send({}).expect(400);
  jest.spyOn(userServices, "changePassword").mockResolvedValueOnce({ _id: "user-1" });
  await supertest(app).patch("/users/me/password").send({ newPassword: "password123" }).expect(200);
  userServices.changePassword.mockRejectedValueOnce(new Error("Password too short"));
  await supertest(app).patch("/users/me/password").send({ newPassword: "short" }).expect(400);

  jest.spyOn(userServices, "getUsers").mockResolvedValueOnce([{ userName: "Captain" }]);
  await supertest(app).get("/users?userName=Captain").expect(200);

  jest.spyOn(userServices, "findUserById").mockResolvedValueOnce(null);
  await supertest(app).get("/users/missing").expect(404);
  userServices.findUserById.mockResolvedValueOnce({ _id: "user-2" });
  await supertest(app).get("/users/user-2").expect(200);

  jest.spyOn(userServices, "deleteUser").mockResolvedValueOnce(null);
  await supertest(app).delete("/users/missing").expect(404);
  userServices.deleteUser.mockResolvedValueOnce({ _id: "user-2" });
  await supertest(app).delete("/users/user-2").expect(204);

  jest.spyOn(userServices, "timeoutUser").mockResolvedValueOnce({ status: 2 });
  await supertest(app).post("/users/user-2/timeout").expect(200);
  jest.spyOn(userServices, "unbanUser").mockResolvedValueOnce({ status: 0 });
  await supertest(app).post("/users/user-2/unban").expect(200);
  jest.spyOn(userServices, "promoteToAdmin").mockResolvedValueOnce({ isAdmin: true });
  await supertest(app).post("/users/user-2/promote").expect(200);
  jest.spyOn(userServices, "demoteFromAdmin").mockResolvedValueOnce({ isAdmin: false });
  await supertest(app).post("/users/user-2/demote").expect(200);
  jest.spyOn(userServices, "isAdmin").mockResolvedValueOnce(true);
  await supertest(app).get("/users/user-2/admin-status").expect(200);
});

test("users router covers signup, login, legacy account-management errors and successes", async () => {
  const app = makeApp("/users", createUsersRouter());

  jest.spyOn(userServices, "registerUserSession").mockImplementation((_id, sessionId) =>
    Promise.resolve({ _id: "user-1", userName: "Captain", activeSessions: { [sessionId]: new Date() } })
  );
  jest.spyOn(userServices, "createUser").mockResolvedValueOnce({
    _id: "user-1",
    userName: "Captain",
    passWord: "secret",
  });
  await supertest(app).post("/users").send({ username: "Captain", password: "password123" }).expect(201);

  userServices.createUser.mockRejectedValueOnce(new Error("already exists"));
  await supertest(app).post("/users").send({ username: "Captain", password: "password123" }).expect(409);
  userServices.createUser.mockRejectedValueOnce(new Error("bad password"));
  await supertest(app).post("/users").send({ username: "Captain", password: "short" }).expect(400);

  jest.spyOn(userServices, "loginUser").mockResolvedValueOnce({
    _id: "user-1",
    userName: "Captain",
    passWord: "secret",
  });
  await supertest(app).post("/users/login").send({ username: "Captain", password: "password123" }).expect(200);
  userServices.loginUser.mockRejectedValueOnce(new Error("Invalid password"));
  await supertest(app).post("/users/login").send({ username: "Captain", password: "bad" }).expect(400);

  jest.spyOn(userServices, "logoutUser").mockRejectedValueOnce(new Error("User not found"));
  await supertest(app).post("/users/user-2/logout").expect(400);
  userServices.logoutUser.mockResolvedValueOnce({ _id: "user-2" });
  await supertest(app).post("/users/user-2/logout").expect(200);

  await supertest(app).patch("/users/user-2/rename").send({}).expect(400);
  jest.spyOn(userServices, "renameUser").mockRejectedValueOnce(new Error("Username already taken"));
  await supertest(app).patch("/users/user-2/rename").send({ newUserName: "taken" }).expect(409);
  userServices.renameUser.mockResolvedValueOnce({ _id: "user-2", userName: "New" });
  await supertest(app).patch("/users/user-2/rename").send({ newUserName: "New" }).expect(200);

  await supertest(app).patch("/users/user-2/password").send({}).expect(400);
  jest.spyOn(userServices, "changePassword").mockResolvedValueOnce({ _id: "user-2" });
  await supertest(app).patch("/users/user-2/password").send({ newPassword: "password123" }).expect(200);

  jest.spyOn(userServices, "changePrefs").mockResolvedValueOnce({ _id: "user-2", favorites: [] });
  await supertest(app).patch("/users/user-2/prefs").send({ favorites: [] }).expect(200);
});

test("rooms router covers create, listing, lookup, join, heartbeat, start, and options", async () => {
  const app = makeApp("/rooms", createRoomsRouter(), { type: "shared-token" });
  const room = { roomCode: "PLAY1", assignedMemberName: "Captain", members: ["Captain"] };

  jest.spyOn(roomServices, "getRooms").mockResolvedValueOnce([room]).mockResolvedValueOnce([room]);
  await supertest(app).get("/rooms").expect(200);
  await supertest(app).get("/rooms?roomCode=PLAY1").expect(200);

  jest.spyOn(roomServices, "getPublicRooms").mockResolvedValueOnce([room]);
  await supertest(app).get("/rooms?privacy=public").expect(200);

  jest.spyOn(roomServices, "findRoomByCode").mockResolvedValueOnce(null);
  await supertest(app).get("/rooms/PLAY1").expect(404);
  roomServices.findRoomByCode.mockResolvedValueOnce(room);
  await supertest(app).get("/rooms/PLAY1").expect(200);

  roomServices.findRoomByCode.mockResolvedValueOnce(null);
  jest.spyOn(roomServices, "addRoom").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms").send({ roomCode: "PLAY1", host: "Captain" }).expect(201);

  jest.spyOn(roomServices, "joinRoom").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/join").send({ userName: "Captain" }).expect(200);
  await supertest(app).post("/rooms/PLAY1/join").send({}).expect(400);

  jest.spyOn(roomServices, "recordMemberHeartbeat").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/heartbeat").set(memberHeaders()).expect(200);
  await supertest(app).post("/rooms/PLAY1/heartbeat").expect(403);

  jest.spyOn(roomServices, "startRoom").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/start").set(memberHeaders()).expect(200);

  jest.spyOn(roomServices, "updateRoomOptions").mockResolvedValueOnce(room);
  await supertest(app).patch("/rooms/PLAY1/options").set(memberHeaders()).send({ options: {} }).expect(200);
});

test("rooms router covers queue, vote, timer, completion, leave, delete, and error branches", async () => {
  const app = makeApp("/rooms", createRoomsRouter(), { type: "shared-token" });
  const room = { roomCode: "PLAY1", members: ["Captain"] };

  await supertest(app).post("/rooms/PLAY1/queue").set(memberHeaders()).send({}).expect(400);
  jest.spyOn(roomServices, "addSongToQueue").mockResolvedValueOnce(room);
  await supertest(app)
    .post("/rooms/PLAY1/queue")
    .set(memberHeaders())
    .send({
      songId: "song-1",
      name: "Song",
      artist: "Artist",
      songLink: "https://www.youtube.com/watch?v=VIDEOID1234",
      videoId: "VIDEOID1234",
      thumbnail: "https://img.youtube.com/vi/VIDEOID1234/default.jpg",
    })
    .expect(200);
  expect(roomServices.addSongToQueue).toHaveBeenCalledWith(
    "PLAY1",
    "song-1",
    "Song",
    "Artist",
    "Captain",
    "https://www.youtube.com/watch?v=VIDEOID1234",
    "VIDEOID1234",
    "https://img.youtube.com/vi/VIDEOID1234/default.jpg"
  );

  await supertest(app).post("/rooms/PLAY1/vote").set(memberHeaders()).send({ amount: 1 }).expect(400);
  await supertest(app).post("/rooms/PLAY1/vote").set(memberHeaders()).send({ entryId: "e", amount: 9 }).expect(400);
  jest.spyOn(roomServices, "voteSong").mockResolvedValueOnce(room);
  await supertest(app)
    .post("/rooms/PLAY1/vote")
    .set(memberHeaders())
    .send({ entryId: "entry-1", amount: 1 })
    .expect(200);

  jest.spyOn(roomServices, "deleteSongFromQueue").mockResolvedValueOnce(room);
  await supertest(app).delete("/rooms/PLAY1/queue/entry-1").set(memberHeaders()).expect(200);

  await supertest(app).post("/rooms/PLAY1/timer").set(memberHeaders()).send({ paused: "maybe" }).expect(400);
  jest.spyOn(roomServices, "setTimerPaused").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/timer").set(memberHeaders()).send({ paused: "false" }).expect(200);

  jest.spyOn(roomServices, "completeCurrentSong").mockResolvedValueOnce(room);
  await supertest(app)
    .post("/rooms/PLAY1/current-song/complete")
    .set(memberHeaders())
    .send({ entryId: "entry-1" })
    .expect(200);

  jest.spyOn(roomServices, "leaveRoom").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/leave").set(memberHeaders()).expect(200);
  await supertest(app).post("/rooms/PLAY1/leave").expect(400);

  jest.spyOn(roomServices, "deleteRoom").mockResolvedValueOnce(null);
  await supertest(app).delete("/rooms/id-1").expect(404);
  roomServices.deleteRoom.mockResolvedValueOnce(room);
  await supertest(app).delete("/rooms/id-1").expect(204);
});

test("rooms router covers service error branches and room-code collision handling", async () => {
  const app = makeApp("/rooms", createRoomsRouter(), { type: "shared-token" });
  const room = { roomCode: "PLAY1", assignedMemberName: "Captain", members: ["Captain"] };

  jest.spyOn(roomServices, "getPublicRooms").mockRejectedValueOnce(new Error("public failed"));
  await supertest(app).get("/rooms?privacy=public").expect(500);
  jest.spyOn(roomServices, "getRooms").mockRejectedValueOnce(new Error("list failed"));
  await supertest(app).get("/rooms").expect(500);

  jest.spyOn(roomServices, "findRoomByCode").mockRejectedValueOnce(new Error("Only the host can view"));
  await supertest(app).get("/rooms/PLAY1").expect(403);
  roomServices.findRoomByCode.mockRejectedValueOnce(new Error("lookup failed"));
  await supertest(app).get("/rooms/PLAY1").expect(500);

  roomServices.findRoomByCode.mockResolvedValueOnce(room);
  await supertest(app).post("/rooms").send({ roomCode: "PLAY1" }).expect(409);
  roomServices.findRoomByCode.mockResolvedValueOnce(null);
  jest.spyOn(roomServices, "addRoom").mockRejectedValueOnce({ code: 11000 });
  await supertest(app).post("/rooms").send({ roomCode: "PLAY2" }).expect(409);
  roomServices.findRoomByCode.mockResolvedValueOnce(null);
  roomServices.addRoom.mockRejectedValueOnce(new Error("create failed"));
  await supertest(app).post("/rooms").send({ roomCode: "PLAY3" }).expect(400);

  jest.spyOn(roomServices, "joinRoom").mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/join").send({ userName: "Captain" }).expect(404);
  roomServices.joinRoom.mockRejectedValueOnce(new Error("Room is full."));
  await supertest(app).post("/rooms/PLAY1/join").send({ userName: "Captain" }).expect(409);
  roomServices.joinRoom.mockRejectedValueOnce(new Error("join failed"));
  await supertest(app).post("/rooms/PLAY1/join").send({ userName: "Captain" }).expect(500);

  jest.spyOn(roomServices, "recordMemberHeartbeat").mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/heartbeat").set(memberHeaders()).expect(404);
  roomServices.recordMemberHeartbeat.mockRejectedValueOnce(new Error("heartbeat failed"));
  await supertest(app).post("/rooms/PLAY1/heartbeat").set(memberHeaders()).expect(500);

  jest.spyOn(roomServices, "startRoom").mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/start").set(memberHeaders()).expect(404);
  roomServices.startRoom.mockRejectedValueOnce(new Error("start failed"));
  await supertest(app).post("/rooms/PLAY1/start").set(memberHeaders()).expect(500);

  jest.spyOn(roomServices, "addSongToQueue").mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/queue").set(memberHeaders()).send({ songId: "song-1" }).expect(404);
  roomServices.addSongToQueue.mockRejectedValueOnce(new Error("queue failed"));
  await supertest(app).post("/rooms/PLAY1/queue").set(memberHeaders()).send({ songId: "song-1" }).expect(500);

  jest.spyOn(roomServices, "voteSong").mockRejectedValueOnce(new Error("vote failed"));
  await supertest(app)
    .post("/rooms/PLAY1/vote")
    .set(memberHeaders())
    .send({ entryId: "entry-1", amount: 1 })
    .expect(400);

  jest.spyOn(roomServices, "upvoteSong").mockResolvedValueOnce(room);
  await supertest(app).post("/rooms/PLAY1/upvote").send({ songId: "song-1" }).expect(200);
  await supertest(app).post("/rooms/PLAY1/upvote").send({}).expect(400);
  roomServices.upvoteSong.mockRejectedValueOnce(new Error("upvote failed"));
  await supertest(app).post("/rooms/PLAY1/upvote").send({ songId: "song-1" }).expect(400);

  await supertest(app).delete("/rooms/PLAY1/queue/entry-1").expect(403);
  roomServices.deleteSongFromQueue.mockRejectedValueOnce(new Error("delete queue failed"));
  await supertest(app).delete("/rooms/PLAY1/queue/entry-1").set(memberHeaders()).expect(400);

  await supertest(app).patch("/rooms/PLAY1/options").send({}).expect(403);
  roomServices.updateRoomOptions.mockResolvedValueOnce(null);
  await supertest(app).patch("/rooms/PLAY1/options").set(memberHeaders()).send({}).expect(404);
  roomServices.updateRoomOptions.mockRejectedValueOnce(new Error("options failed"));
  await supertest(app).patch("/rooms/PLAY1/options").set(memberHeaders()).send({}).expect(400);

  await supertest(app).post("/rooms/PLAY1/current-song/complete").send({}).expect(403);
  roomServices.completeCurrentSong.mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/current-song/complete").set(memberHeaders()).send({}).expect(404);
  roomServices.completeCurrentSong.mockRejectedValueOnce(new Error("complete failed"));
  await supertest(app).post("/rooms/PLAY1/current-song/complete").set(memberHeaders()).send({}).expect(400);

  roomServices.leaveRoom.mockResolvedValueOnce(null);
  await supertest(app).post("/rooms/PLAY1/leave").set(memberHeaders()).expect(404);
  roomServices.leaveRoom.mockRejectedValueOnce(new Error("leave failed"));
  await supertest(app).post("/rooms/PLAY1/leave").set(memberHeaders()).expect(500);

  roomServices.deleteRoom.mockRejectedValueOnce(new Error("delete failed"));
  await supertest(app).delete("/rooms/id-1").expect(500);
});

test("youtube router covers playlist import, single video import, lookup errors, and missing videos", async () => {
  const app = makeApp("", createYoutubeRouter(), { type: "shared-token" });

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ items: [{ id: "playlist-1" }] }) })
    .mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        items: [{ snippet: { title: "Song", resourceId: { videoId: "VIDEOID1234" } } }],
      }),
    });
  await supertest(app).get("/youtube/some-link").expect(200);

  global.fetch = jest.fn().mockRejectedValueOnce(new Error("network"));
  await supertest(app).get("/youtube/some-link").expect(500);

  jest.spyOn(songServices, "findOrCreateSong").mockResolvedValue({ _id: "song-1" });
  jest.spyOn(userServices, "addSongsToPlaylist").mockResolvedValue({});
  global.fetch = jest.fn().mockResolvedValueOnce({
    json: jest.fn().mockResolvedValue({
      items: [{ snippet: { title: "Song", resourceId: { videoId: "VIDEOID1234" } } }],
    }),
  });
  await supertest(app)
    .post("/users/user-1/playlists/youtube/playlist-1")
    .send({ playlistName: "Road Trip" })
    .expect(200);

  global.fetch = jest.fn().mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ items: [] }) });
  await supertest(app).post("/users/user-1/songs/youtube/VIDEOID1234").send({}).expect(404);

  global.fetch = jest.fn().mockResolvedValueOnce({
    json: jest.fn().mockResolvedValue({
      items: [{ id: "VIDEOID1234", snippet: { title: "Single Song" } }],
    }),
  });
  await supertest(app).post("/users/user-1/songs/youtube/VIDEOID1234").send({}).expect(200);
});
