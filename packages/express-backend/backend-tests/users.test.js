const userSchema = require("../src/user/user.js");
const userServices = require("../src/user/user-services.js");
const songsSchema = require("../src/songs/song.js");
const songsServices = require("../src/songs/song-services.js");
const mockingoose = require("mockingoose").default;
const bcrypt = require("bcrypt");

const defaultCrab = { color: "#e74c3c", hat: "" };
const pirateCrab = { color: "#3498db", hat: "pirate_captain_hat.png" };

let userModel;
let songModel;

beforeAll(async () => {
  userModel = userSchema;
});

afterAll(async () => {});

beforeEach(async () => {
  jest.clearAllMocks();
  mockingoose.resetAll();
});

afterEach(async () => {});

test("get all users", async () => {
  userModel.find = jest.fn().mockResolvedValue([]);

  const users = await userServices.getUsers();

  expect(users).toBeDefined();
  expect(users.length).toBeGreaterThanOrEqual(0);

  expect(userModel.find.mock.calls.length).toBe(1);
  expect(userModel.find).toHaveBeenCalledWith();
});

test("get songs", async () => {
  const dummySongs = [
    {
      songLink: "1234",
      details: ["John Doe"],
    },
  ];
  songModel = songsSchema;
  songModel.find = jest.fn().mockResolvedValue(dummySongs);

  const foundSongs = await songsServices.getSongs("1234");
  expect(foundSongs).toBeDefined();
  expect(foundSongs).toHaveLength(1);
  expect(foundSongs[0].songLink).toBe(dummySongs[0].songLink);
  expect(foundSongs[0].details).toStrictEqual(dummySongs[0].details);

  expect(songModel.find.mock.calls.length).toBe(1);
  expect(songModel.find).toHaveBeenCalledWith({ songLink: "1234" });
});

test("get users by name", async () => {
  const result = [
    {
      userName: "Joe",
      status: 0,
      favorites: [],
      crab: [],
    },
  ];
  userModel.find = jest.fn().mockResolvedValue(result);

  const userName = "Joe";
  const users = await userServices.getUsers(userName);

  expect(users).toBeDefined();
  expect(users.length).toBeGreaterThan(0);
  users.forEach(
    (user) => expect(user.userName).toBe(userName)
  );

  expect(userModel.find.mock.calls.length).toBe(1);
  expect(userModel.find).toHaveBeenCalledWith({ userName: userName });
});

test("get user by id", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 0,
    favorites: [],
    crab: [],
  };
  userModel.findById = jest.fn().mockResolvedValue(dummyUser);

  const foundUser = await userServices.findUserById("1234");
  expect(foundUser).toBeDefined();
  expect(foundUser.id).toBe(dummyUser.id);
  expect(foundUser.userName).toBe(dummyUser.userName);
  expect(foundUser.status).toBe(dummyUser.status);
  expect(foundUser.favorites).toBe(dummyUser.favorites);
  expect(foundUser.crab).toBe(dummyUser.crab);

  expect(userModel.findById.mock.calls.length).toBe(1);
  expect(userModel.findById).toHaveBeenCalledWith("1234");
});

test("Create user", async () => {
  const addedUser = {
    _id: "1234",
    userName: "John Doe",
    passWord: "hashedpassword",
    status: 0,
    favorites: [],
    crab: defaultCrab,
  };
  const toBeAdded = {
    _id: "1234",
    userName: "John Doe",
    passWord: "hashedpassword",
    status: 0,
    favorites: [],
    crab: defaultCrab,
  };

  mockingoose(userModel).toReturn(addedUser, "save");
  const result = await userServices.createUser(toBeAdded.userName, toBeAdded.passWord);

  expect(result).toBeTruthy();
  expect(result.userName).toBe(toBeAdded.userName);
  expect(result.status).toBe(toBeAdded.status);
  expect(result.favorites).toStrictEqual(toBeAdded.favorites);
  expect(result.crab).toStrictEqual(toBeAdded.crab);
  expect(result).toHaveProperty("_id");
});

test("delete by id", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 0,
    favorites: [],
    crab: [],
  };
  userModel.findByIdAndDelete = jest.fn().mockResolvedValue(dummyUser);

  const deleteResult = await userServices.deleteUser({ _id: dummyUser._id });
  expect(deleteResult).toBeTruthy();
  expect(deleteResult.userName).toBe(dummyUser.userName);

  expect(userModel.findByIdAndDelete.mock.calls.length).toBe(1);
  expect(userModel.findByIdAndDelete).toHaveBeenCalledWith({
    _id: dummyUser._id,
  });
});

test("login test", async () => {
  const expectedUser = {
    _id: "1234",
    userName: "John Doe",
    passWord: await bcrypt.hash("password123", 10),
    status: 1,
    favorites: [],
    crab: [],
  };

  mockingoose(userModel).toReturn(expectedUser, "findOne");
  mockingoose(userModel).toReturn({ ...expectedUser, status: 1 }, "findOneAndUpdate");
  mockingoose(userModel).toReturn({ ...expectedUser, status: 1 }, "findByIdAndUpdate");

  const updatedUser = await userServices.loginUser(expectedUser.userName, "password123");

  expect(updatedUser).toBeDefined();
  expect(updatedUser.status).toBe(1);
});

test("login fail - user timed out", async () => {
  const expectedUser = {
    _id: "1234",
    userName: "John Doe",
    passWord: await bcrypt.hash("password123", 10),
    status: 2,
    favorites: [],
    crab: [],
  };
  mockingoose(userModel).toReturn(expectedUser, "findOne");

  await expect(userServices.loginUser(expectedUser.userName, "password123")).rejects.toThrow(
    "User is timed out"
  );
});

test("login fail - user not found", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 2,
    favorites: [],
    crab: [],
  };

  userModel.findById = jest.fn().mockResolvedValue(null);

  await expect(userServices.loginUser(dummyUser._id)).rejects.toThrow("User not found");
});

test("logout test", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };
  userModel.findById = jest.fn().mockResolvedValue(dummyUser);

  const foundUser = await userServices.findUserById("1234");
  expect(foundUser.status).toBe(dummyUser.status);

  const expectedUser = {
    _id: "1234",
    userName: "John Doe",
    status: 0,
    favorites: [],
    crab: [],
  };
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(expectedUser);

  const updatedUser = await userServices.logoutUser(dummyUser._id);

  expect(updatedUser).toBeDefined();
  expect(updatedUser.status).toBe(0);
});

test("logout fail - user not found", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };

  userModel.findById = jest.fn().mockResolvedValue(null);

  await expect(userServices.logoutUser(dummyUser._id)).rejects.toThrow("User not found");
});

test("timeout test", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };
  userModel.findById = jest.fn().mockResolvedValue(dummyUser);

  const foundUser = await userServices.findUserById("1234");
  expect(foundUser.status).toBe(dummyUser.status);

  const expectedUser = {
    _id: "1234",
    userName: "John Doe",
    status: 2,
    favorites: [],
    crab: [],
  };
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(expectedUser);

  const updatedUser = await userServices.timeoutUser(dummyUser._id);

  expect(updatedUser).toBeDefined();
  expect(updatedUser.status).toBe(2);
});

test("timeout fail - user not found", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };

  userModel.findById = jest.fn().mockResolvedValue(null);

  await expect(userServices.timeoutUser(dummyUser._id)).rejects.toThrow("User not found");
});

test("change preferences test", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };
  userModel.findById = jest.fn().mockResolvedValue(dummyUser);

  const foundUser = await userServices.findUserById("1234");
  expect(foundUser.status).toBe(dummyUser.status);

  const expectedUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: ["Viva La Vida"],
    crab: pirateCrab,
  };
  userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(expectedUser);

  const result = await userServices.changePrefs(dummyUser._id, {
    favorites: ["Viva La Vida"],
    crab: pirateCrab,
  });

  expect(result).toBeDefined();
  expect(result.favorites).toStrictEqual(["Viva La Vida"]);
  expect(result.crab).toStrictEqual(pirateCrab);
  expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
    dummyUser._id,
    { favorites: ["Viva La Vida"], crab: pirateCrab },
    { new: true }
  );
});

test("change preferences fail - user not found", async () => {
  const dummyUser = {
    _id: "1234",
    userName: "John Doe",
    status: 1,
    favorites: [],
    crab: [],
  };

  userModel.findById = jest.fn().mockResolvedValue(null);

  await expect(userServices.changePrefs(dummyUser._id, {})).rejects.toThrow("User not found");
});
