// user-services.js
const bcrypt = require("bcrypt");
const userModel = require("./user.js");

const DEFAULT_CRAB_PROFILE = Object.freeze({
  color: "#e74c3c",
  hat: "",
});
const CRAB_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_CRAB_HAT_LENGTH = 80;

function getActiveSessions(user) {
  // maps from mongoose need to become plain objects
  const source = user?.activeSessions || {};

  if (source instanceof Map) {
    return Object.fromEntries(source);
  }

  return typeof source === "object" && !Array.isArray(source) ? { ...source } : {};
}

function normalizeCrabProfile(crab = {}) {
  // keep saved crab profiles safe and predictable
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

async function getUsers(userName) {
  // no username means get all users
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

async function createUser(userName, passWord) {
  console.log("checking password: ", passWord);
  // reject weak passwords before hashing
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

async function deleteUser(id) {
  // remove user by mongo id
  return await userModel.findByIdAndDelete(id);
}

async function loginUser(userName, password) {
  // check password and mark the user active
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

async function logoutUser(id) {
  // clear active session state on logout
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(
    id,
    { status: 0, lastActiveAt: null, activeSessions: {} },
    { new: true }
  );
}

async function registerUserSession(id, sessionId) {
  // track each tab/session separately
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
  // update the last active time for this session
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

async function logoutInactiveUsers(maxInactiveMs) {
  // remove stale sessions and logout users with none left
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

async function timeoutUser(id) {
  // status 2 means the user is timed out
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { status: 2 }, { new: true });
}

async function unbanUser(id) {
  // reset a timed out user back to logged out
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { status: 0 }, { new: true });
}

async function addSongsToPlaylist(id, playlistName, songIds) {
  // add youtube song ids to a named playlist
  const user = await userModel.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  let playlist = user.playlists.find((p) => p.name === playlistName);

  if (!playlist) {
    // create the playlist when it is missing
    user.playlists.push({
      name: playlistName,
      songs: songIds,
    });
  } else {
    // keep existing playlists free of duplicate songs
    for (const songId of songIds) {
      if (!playlist.songs.some((existingId) => existingId.toString() === songId.toString())) {
        playlist.songs.push(songId);
      }
    }
  }

  return await user.save();
}

async function changePrefs(id, { favorites, playlist, crab }) {
  // update favorites, playlist, or crab profile
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (playlist !== undefined) update.playlist = playlist;
  if (crab !== undefined) update.crab = normalizeCrabProfile(crab);

  return await userModel.findByIdAndUpdate(id, update, { new: true });
}

async function renameUser(id, newUserName) {
  // rename only when the new username is available
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const existingUser = await userModel.findOne({ userName: newUserName });
  if (existingUser && existingUser._id.toString() !== id) {
    throw new Error("Username already taken");
  }

  return await userModel.findByIdAndUpdate(id, { userName: newUserName }, { new: true });
}

async function changePassword(id, newPassword) {
  // validate and hash the new password
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await userModel.findByIdAndUpdate(id, { passWord: hashedPassword }, { new: true });
}

async function promoteToAdmin(id) {
  // give a user admin access
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { isAdmin: true }, { new: true });
}

async function demoteFromAdmin(id) {
  // remove admin access
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return await userModel.findByIdAndUpdate(id, { isAdmin: false }, { new: true });
}

async function isAdmin(id) {
  // return just the admin flag
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
