const backend = require("../src/backend.js");
const supertest = require("supertest");
const mockingoose = require("mockingoose").default;
const userModel = require("../src/user/user.js");
const songModel = require("../src/songs/song.js");
const bcrypt = require("bcrypt");

beforeEach(() => {
  jest.clearAllMocks();
  mockingoose.resetAll();
});

test("test app runs", async () => {
  const result = await supertest(backend.app).get("/").expect(200);
  expect(result.text).toBe("Backend running.");
});

test(" get /users ", async () => {
  const mockedUsers = [
    {
      //_id: "1234",
      userName: "Joe",
      status: 0,
      playlist: [1, 2],
      crab: [],
    },
  ];

  mockingoose(userModel).toReturn(mockedUsers, "find");

  const result = await supertest(backend.app).get("/users").expect(200);

  console.log("Result body:", result.body);
  //expect(result.body).toHaveLength(1);
  expect(result.body[0].userName).toBe("Joe");
  expect(result.body[0].status).toBe(0);
  expect(result.body[0].playlist).toStrictEqual([1, 2]);
});

test("get /users fail - database error", async () => {
  mockingoose(userModel).toReturn(new Error("Database failed"), "find");

  const result = await supertest(backend.app).get("/users").expect(500);
  expect(result.body.error).toBe("Database failed");
});

test(" get /users by id fail - database error", async () => {
  mockingoose(userModel).toReturn(new Error("Database failed"), "findOne");

  const result = await supertest(backend.app).get("/users/507f1f77bcf86cd799439011").expect(500);

  expect(result.body.error).toBe("Database failed");
});

test(" get /users by id", async () => {
  const mockedUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "Joe",
    status: 0,
    playlist: [1, 2],
    crab: [],
  };

  mockingoose(userModel).toReturn(mockedUser, "findOne");

  const result = await supertest(backend.app).get("/users/1234").expect(200);

  expect(result.body._id).toBe("507f1f77bcf86cd799439011");
  expect(result.body.userName).toBe("Joe");
  expect(result.body.status).toBe(0);
  expect(result.body.playlist).toStrictEqual([1, 2]);
});

test(" get /users by id fail - user not found", async () => {
  mockingoose(userModel).toReturn(undefined);

  const result = await supertest(backend.app).get("/users/1234").expect(404);
  expect(result.status).toBe(404);
});

test(" get /users by id fail - database error", async () => {
  mockingoose(userModel).toReturn(new Error("Database failed"), "findOne");

  const result = await supertest(backend.app).get("/users/1234").expect(500);
  expect(result.body.error).toBe("Database failed");
});

test("create user", async () => {
  console.log("Testing create user endpoint...");
  const mockedUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "Joe",
    passWord: "hashedpassword",
    status: 0,
    playlist: [],
    crab: [],
  };
  mockingoose(userModel).toReturn(mockedUser, "save");

  const result = await supertest(backend.app)
    .post("/users")
    .set("Content-Type", "application/json")
    .send({ username: "Joe", password: "password123" })
    .expect(201);

  expect(result.body._id).toBe("507f1f77bcf86cd799439011");
  expect(result.body.userName).toBe("Joe");
  expect(result.body.passWord).toBe("hashedpassword");
  expect(result.body.status).toBe(0);
  expect(result.body.playlist).toStrictEqual([]);
  expect(result.body.crab).toStrictEqual([]);
});

test("create user fail - bad request", async () => {
  mockingoose(userModel).toReturn(new Error("Validation failed"), "save");

  const result = await supertest(backend.app).post("/users").send({ userName: "Joe" }).expect(400);

  expect(result.body.error).toBe("Password must be at least 8 characters long");
});

test("delete user", async () => {
  const dummyUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "Joe",
    status: 0,
    playlist: [],
    crab: [],
  };

  userModel.findByIdAndDelete = jest.fn().mockResolvedValue(dummyUser);

  await supertest(backend.app).delete("/users/507f1f77bcf86cd799439011").expect(204);
});

test("delete user fail - user not found", async () => {
  userModel.findByIdAndDelete = jest.fn().mockResolvedValue(null);

  const result = await supertest(backend.app).delete("/users/507f1f77bcf86cd799439011").expect(404);

  expect(result.text).toBe("User not found.");
});

test("delete user fail - database error", async () => {
  userModel.findByIdAndDelete = jest.fn().mockRejectedValue(new Error("Database failed"));

  await supertest(backend.app).delete("/users/507f1f77bcf86cd799439011").expect(500);
});

test("login test", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    passWord: await bcrypt.hash("password123", 10),
    status: 0,
    playlist: [],
    crab: [],
  };

  const loggedInUser = {
    ...existingUser,
    status: 1,
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn(loggedInUser, "findOneAndUpdate");

  const result = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "John Doe", password: "password123" })
    .expect(200);

  expect(result.body.status).toBe(1);
});

test("login test fail - user not found", async () => {
  mockingoose(userModel).toReturn(undefined, "findOne");

  const result = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "John Doe", password: "password123" })
    .expect(400);

  expect(result.body.error).toBe("User not found");
});

test("login test fail - user is timed out", async () => {
  const timedOutUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    passWord: await bcrypt.hash("password123", 10),
    status: 2,
    playlist: [],
    crab: [],
  };

  mockingoose(userModel).toReturn(timedOutUser, "findOne");

  const result = await supertest(backend.app)
    .post("/users/login")
    .send({ username: "John Doe", password: "password123" })
    .expect(400);

  expect(result.body.error).toBe("User is timed out");
});

test("logout test", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    status: 1,
    playlist: [],
    crab: [],
  };

  const loggedOutUser = {
    ...existingUser,
    status: 0,
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn(loggedOutUser, "findOneAndUpdate");

  const result = await supertest(backend.app)
    .post("/users/507f1f77bcf86cd799439011/logout")
    .expect(200);

  expect(result.body.status).toBe(0);
});

test("logout test fail - user not found", async () => {
  mockingoose(userModel).toReturn(undefined, "findOne");

  const result = await supertest(backend.app)
    .post("/users/507f1f77bcf86cd799439011/logout")
    .expect(400);

  expect(result.body.error).toBe("User not found");
});

test("timeout test", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    status: 1,
    playlist: [],
    crab: [],
  };

  const loggedOutUser = {
    ...existingUser,
    status: 2,
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn(loggedOutUser, "findOneAndUpdate");

  const result = await supertest(backend.app)
    .post("/users/507f1f77bcf86cd799439011/timeout")
    .expect(200);

  expect(result.body.status).toBe(2);
});

test("timeout test fail - user not found", async () => {
  mockingoose(userModel).toReturn(undefined, "findOne");

  const result = await supertest(backend.app)
    .post("/users/507f1f77bcf86cd799439011/timeout")
    .expect(400);

  expect(result.body.error).toBe("User not found");
});

test("change prefs test", async () => {
  const existingUser = {
    _id: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    status: 0,
    playlist: [],
    crab: [],
  };

  const updatedUser = {
    ...existingUser,
    playlist: [1, 2],
    crab: [3],
  };

  mockingoose(userModel).toReturn(existingUser, "findOne");
  mockingoose(userModel).toReturn(updatedUser, "findOneAndUpdate");

  const result = await supertest(backend.app)
    .patch("/users/507f1f77bcf86cd799439011/prefs")
    .send({ playlist: [1, 2], crab: [3] })
    .expect(200);

  expect(result.body.playlist).toStrictEqual([1, 2]);
  expect(result.body.crab).toStrictEqual([3]);
});

test("change prefs test fail - user not found", async () => {
  mockingoose(userModel).toReturn(undefined, "findOne");

  const result = await supertest(backend.app)
    .patch("/users/507f1f77bcf86cd799439011/prefs")
    .send({ playlist: [1, 2] })
    .expect(400);

  expect(result.body.error).toBe("User not found");
});

test("get /songs", async () => {
  const mockedSongs = [
    {
      _id: "507f1f77bcf86cd799439021",
      songLink: "https://youtube.com/watch?v=abc",
      details: ["pop", "2024"],
    },
  ];

  mockingoose(songModel).toReturn(mockedSongs, "find");

  const result = await supertest(backend.app).get("/songs").expect(200);

  expect(result.body).toHaveLength(1);
  expect(result.body[0].songLink).toBe("https://youtube.com/watch?v=abc");
  expect(result.body[0].details).toStrictEqual(["pop", "2024"]);
});

test("get /songs fail - database error", async () => {
  mockingoose(songModel).toReturn(new Error("Database failed"), "find");

  const result = await supertest(backend.app).get("/songs").expect(500);

  expect(result.body.error).toBe("Database failed");
});

test("get /songs/search", async () => {
  const mockedSongs = [
    {
      _id: "507f1f77bcf86cd799439021",
      songLink: "https://youtube.com/watch?v=abc",
      details: ["chill rap"],
    },
  ];

  mockingoose(songModel).toReturn(mockedSongs, "find");

  const result = await supertest(backend.app).get("/songs/search?keyword=rap").expect(200);

  expect(result.body).toHaveLength(1);
  expect(result.body[0].details).toStrictEqual(["chill rap"]);
});

test("get /songs/search fail - database error", async () => {
  mockingoose(songModel).toReturn(new Error("Database failed"), "find");

  const result = await supertest(backend.app).get("/songs/search?keyword=rap").expect(500);

  expect(result.body.error).toBe("Database failed");
});

test("get /songs by id", async () => {
  const mockedSong = {
    _id: "507f1f77bcf86cd799439021",
    songLink: "https://youtube.com/watch?v=abc",
    details: ["pop"],
  };

  mockingoose(songModel).toReturn(mockedSong, "findOne");

  const result = await supertest(backend.app).get("/songs/507f1f77bcf86cd799439021").expect(200);

  expect(result.body._id).toBe("507f1f77bcf86cd799439021");
  expect(result.body.songLink).toBe("https://youtube.com/watch?v=abc");
  expect(result.body.details).toStrictEqual(["pop"]);
});

test("get /songs by id fail - not found", async () => {
  mockingoose(songModel).toReturn(undefined, "findOne");

  const result = await supertest(backend.app).get("/songs/507f1f77bcf86cd799439021").expect(404);

  expect(result.text).toBe("Song not found.");
});

test("get /songs by id fail - database error", async () => {
  mockingoose(songModel).toReturn(new Error("Database failed"), "findOne");

  const result = await supertest(backend.app).get("/songs/507f1f77bcf86cd799439021").expect(500);

  expect(result.body.error).toBe("Database failed");
});

test("create song", async () => {
  const mockedSong = {
    _id: "507f1f77bcf86cd799439021",
    songLink: "https://youtube.com/watch?v=abc",
    details: ["pop"],
  };

  mockingoose(songModel).toReturn(mockedSong, "save");

  const result = await supertest(backend.app)
    .post("/songs")
    .send({ songLink: "https://youtube.com/watch?v=abc", details: ["pop"] })
    .expect(201);

  expect(result.body.songLink).toBe("https://youtube.com/watch?v=abc");
  expect(result.body.details).toStrictEqual(["pop"]);
});

test("create song fail - bad request", async () => {
  mockingoose(songModel).toReturn(new Error("Validation failed"), "save");

  const result = await supertest(backend.app)
    .post("/songs")
    .send({ songLink: "https://youtube.com/watch?v=abc", details: ["pop"] })
    .expect(400);

  expect(result.body.error).toBe("Validation failed");
});

test("delete song", async () => {
  songModel.findByIdAndDelete = jest.fn().mockResolvedValue({
    _id: "507f1f77bcf86cd799439021",
    songLink: "https://youtube.com/watch?v=abc",
    details: ["pop"],
  });

  await supertest(backend.app).delete("/songs/507f1f77bcf86cd799439021").expect(204);
});

test("delete song fail - not found", async () => {
  songModel.findByIdAndDelete = jest.fn().mockResolvedValue(null);

  const result = await supertest(backend.app).delete("/songs/507f1f77bcf86cd799439021").expect(404);

  expect(result.text).toBe("Song not found.");
});

test("delete song fail - database error", async () => {
  songModel.findByIdAndDelete = jest.fn().mockRejectedValue(new Error("Database failed"));

  const result = await supertest(backend.app).delete("/songs/507f1f77bcf86cd799439021").expect(500);

  expect(result.body.error).toBe("Database failed");
});

test("youtube playlist test", async () => {
  const result = await supertest(backend.app)
    .get("/youtube/:link")
    .send({ id: "PLTdZagM8WNQAUNBCb9JeqhOwao2yu8F8H&si=FCFSU4sTtUAeUujg" })
    .expect(200);

  expect(result.body).toBeDefined();
  expect(result.body[0]["songLink"]).toBeDefined();
});

test("youtube playlist items test", async () => {
  const result = await backend.getSongs("PLFPk5ONFpYvWsnAYJqm6Li4qtg367uUbv", undefined);

  expect(result["kind"]).toBe("youtube#playlistItemListResponse");
});

test("youtube playlist fail", async () => {
  const result = await supertest(backend.app)
    .get("/youtube/:link")
    .send({ id: "invalid_playlist_id" })
    .expect(500);

  expect(result.error).toBeDefined();
});

test("youtube playlist items fail", async () => {
  const result = await backend.getSongs("invalid_playlist_id", undefined);
  expect(result.error).toBeDefined();
});
