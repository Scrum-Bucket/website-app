//user-services.js
const bcrypt = require("bcrypt");
const userModel = require("./user.js");

const DEFAULT_CRAB_PROFILE = Object.freeze({
  color: "#e74c3c",
  hat: "",
});
const CRAB_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_CRAB_HAT_LENGTH = 80;

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
  const newUser = new userModel({ userName, passWord: hashedPassword, status: 1, lastActiveAt: new Date() });
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
  return await userModel.findByIdAndUpdate(id, { status: 0, lastActiveAt: null }, { new: true });
}

async function heartbeatUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  if (user.status !== 1) throw new Error("User is not logged in");

  return await userModel.findByIdAndUpdate(id, { lastActiveAt: new Date() }, { new: true });
}

async function logoutInactiveUsers(maxInactiveMs) {
  const cutoff = new Date(Date.now() - maxInactiveMs);

  return await userModel.updateMany(
    { status: 1, lastActiveAt: { $lt: cutoff } },
    { status: 0, lastActiveAt: null }
  );
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
