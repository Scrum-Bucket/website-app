//user-services.js
const bcrypt = require("bcrypt");
const userModel = require("./user.js");

const DEFAULT_CRAB_PROFILE = Object.freeze({
  color: "#e74c3c",
  hat: "",
});
const CRAB_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_CRAB_HAT_LENGTH = 80;

function getActiveSessions(user) {
  const source = user?.activeSessions || {};

  if (source instanceof Map) {
    return Object.fromEntries(source);
  }

  return typeof source === "object" && !Array.isArray(source) ? { ...source } : {};
}

function normalizeCrabProfile(crab = {}) {
  if (!crab || typeof crab !== "object" || Array.isArray(crab)) {
    return { ...DEFAULT_CRAB_PROFILE };
  }

  const color =
    typeof crab.color === "string" && CRAB_COLOR_PATTERN.test(crab.color)
      ? crab.color
      : DEFAULT_CRAB_PROFILE.color;
  const hat = typeof crab.hat === "string" ? crab.hat.trim().slice(0, MAX_CRAB_HAT_LENGTH) : "";

  return { color, hat };
}

//allows get all
async function getUsers(userName) {
  if (!userName) {
    console.log("No userName provided, returning all users");
    const allUsers = await userModel.find();
    console.log("Found users: ", allUsers);

    return allUsers;
  }
  return await userModel.find({ userName });
}

async function findUserById(id) {
  return await userModel.findById(id);
}

// defaults defined in schema
async function createUser(userName, passWord) {
  console.log("checking password: ", passWord);
  // Validate password before hashing
  if (!passWord || passWord.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const existingUser = await userModel.findOne({ userName });
  if (existingUser) {
    throw new Error("An account with this username already exists.");
  }

  const hashedPassword = await bcrypt.hash(passWord, 10);
  const newUser = new userModel({
    userName,
    passWord: hashedPassword,
    status: 1,
    lastActiveAt: new Date(),
    activeSessions: {},
  });
  try {
    return await newUser.save();
  } catch (err) {
    if (
      err.code === 11000 ||
      (err.message && err.message.toLowerCase().includes("duplicate key"))
    ) {
      throw new Error(
        "An account with this username already exists. Please choose a different username or log in."
      );
    }
    throw err;
  }
}

// nukes it
async function deleteUser(id) {
  return await userModel.findByIdAndDelete(id);
}

//if not async youd check status b4 mongoDB fetches it
//set status to 1 if they exist and arent timed out
async function loginUser(userName, password) {
  const user = await userModel.findOne({ userName });
  if (!user) throw new Error("User not found");

  const isPasswordValid = await bcrypt.compare(password, user.passWord);
  if (!isPasswordValid) throw new Error("Invalid password");
  if (user.status === 2) throw new Error("User is timed out");

  console.log("User logged in, updating status to 1");
  return await userModel.findByIdAndUpdate(
    user._id,
    { status: 1, lastActiveAt: new Date() },
    { new: true }
  );
}

// logoutUser: set status back to 0
async function logoutUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  //new:true means return user after its updated
  return await userModel.findByIdAndUpdate(
    id,
    { status: 0, lastActiveAt: null, activeSessions: {} },
    { new: true }
  );
}

async function registerUserSession(id, sessionId) {
  if (!sessionId) throw new Error("Session id is required");
  const now = new Date();

  return await userModel.findByIdAndUpdate(
    id,
    {
      status: 1,
      lastActiveAt: now,
      [`activeSessions.${sessionId}`]: now.toISOString(),
    },
    { new: true }
  );
}

async function heartbeatUser(id, sessionId) {
  if (!sessionId) throw new Error("Session id is required");
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  if (user.status !== 1) throw new Error("User is not logged in");

  const now = new Date();
  const activeSessions = getActiveSessions(user);
  activeSessions[sessionId] = now.toISOString();

  return await userModel.findByIdAndUpdate(
    id,
    { lastActiveAt: now, activeSessions },
    { new: true }
  );
}

async function logoutUserSession(id, sessionId) {
  if (!sessionId) throw new Error("Session id is required");
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const activeSessions = getActiveSessions(user);
  delete activeSessions[sessionId];

  const sessionTimes = Object.values(activeSessions)
    .map((lastSeenAt) => new Date(lastSeenAt).getTime())
    .filter(Number.isFinite);
  const lastActiveAt = sessionTimes.length ? new Date(Math.max(...sessionTimes)) : null;

  return await userModel.findByIdAndUpdate(
    id,
    {
      status: lastActiveAt ? 1 : 0,
      lastActiveAt,
      activeSessions,
    },
    { new: true }
  );
}

async function logoutInactiveUsers(maxInactiveMs) {
  const cutoff = new Date(Date.now() - maxInactiveMs);
  const users = await userModel.find({ status: 1 });
  const updates = [];

  for (const user of users) {
    const activeSessions = getActiveSessions(user);
    const freshSessions = {};

    for (const [sessionId, lastSeenAt] of Object.entries(activeSessions)) {
      const lastSeenTime = new Date(lastSeenAt).getTime();

      if (Number.isFinite(lastSeenTime) && lastSeenTime >= cutoff.getTime()) {
        freshSessions[sessionId] = lastSeenAt;
      }
    }

    const freshSessionTimes = Object.values(freshSessions).map((lastSeenAt) =>
      new Date(lastSeenAt).getTime()
    );
    const lastActiveAt = freshSessionTimes.length
      ? new Date(Math.max(...freshSessionTimes))
      : null;

    updates.push(
      userModel.findByIdAndUpdate(user._id, {
        status: lastActiveAt ? 1 : 0,
        lastActiveAt,
        activeSessions: freshSessions,
      })
    );
  }

  await Promise.all(updates);
  return { modifiedCount: updates.length };
}

// timeoutUser: status 2 basically soft ban
async function timeoutUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { status: 2 }, { new: true });
}

// unbanUser: remove timeout by setting status back to 0
async function unbanUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { status: 0 }, { new: true });
}

// id is user id
async function addSongsToPlaylist(id, playlistName, songIds) {
  // get the user
  const user = await userModel.findById(id);

  // Cant find the user
  if (!user) {
    throw new Error("User not found");
  }

  // p = one playlist (possibly multiple playlists)
  let playlist = user.playlists.find((p) => p.name === playlistName);

  // if playlist doesnt exist
  if (!playlist) {
    // add new one to user's list of playlists
    user.playlists.push({
      name: playlistName,
      songs: songIds,
    });
  } else {
    // if it does exist go through each song
    for (const songId of songIds) {
      // avoid duplicates
      if (!playlist.songs.some((existingId) => existingId.toString() === songId.toString())) {
        playlist.songs.push(songId);
      }
    }
  }

  return await user.save();
}

// changePrefs: update favorite songs and/or saved crab profile
async function changePrefs(id, { favorites, playlist, crab }) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (playlist !== undefined) update.playlist = playlist;
  if (crab !== undefined) update.crab = normalizeCrabProfile(crab);

  return await userModel.findByIdAndUpdate(id, update, { new: true });
}

// renameUser: update userName
async function renameUser(id, newUserName) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const existingUser = await userModel.findOne({ userName: newUserName });
  if (existingUser && existingUser._id.toString() !== id) {
    throw new Error("Username already taken");
  }

  return await userModel.findByIdAndUpdate(id, { userName: newUserName }, { new: true });
}

// changePassword: update passWord after validation
async function changePassword(id, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await userModel.findByIdAndUpdate(id, { passWord: hashedPassword }, { new: true });
}

// promoteToAdmin: set isAdmin to true
async function promoteToAdmin(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { isAdmin: true }, { new: true });
}

// demoteFromAdmin: set isAdmin to false
async function demoteFromAdmin(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { isAdmin: false }, { new: true });
}

// isAdmin: check if user is admin
async function isAdmin(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return user.isAdmin;
}

module.exports = {
  getUsers,
  findUserById,
  createUser,
  deleteUser,
  loginUser,
  logoutUser,
  registerUserSession,
  heartbeatUser,
  logoutUserSession,
  logoutInactiveUsers,
  timeoutUser,
  unbanUser,
  addSongsToPlaylist,
  changePrefs,
  renameUser,
  changePassword,
  promoteToAdmin,
  demoteFromAdmin,
  isAdmin,
  DEFAULT_CRAB_PROFILE,
  normalizeCrabProfile,
};
