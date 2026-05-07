//user-services.js
const bcrypt = require("bcrypt");
const userModel = require("./user.js");

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
  const newUser = new userModel({ userName, passWord: hashedPassword });
  try {
    return await newUser.save();
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.toLowerCase().includes("duplicate key"))) {
      throw new Error("An account with this username already exists. Please choose a different username or log in.");
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
  return await userModel.findByIdAndUpdate(user._id, { status: 1 }, { new: true });
}

// logoutUser: set status back to 0
async function logoutUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  //new:true means return user after its updated
  return await userModel.findByIdAndUpdate(id, { status: 0 }, { new: true });
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

// changePrefs: update favorites and/or crab lists
async function changePrefs(id, { favorites, crab }) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (crab !== undefined) update.crab = crab;

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
  timeoutUser,
  unbanUser,
  changePrefs,
  renameUser,
  changePassword,
  promoteToAdmin,
  demoteFromAdmin,
  isAdmin,
};
