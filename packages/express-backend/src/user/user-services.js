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

  const hashedPassword = await bcrypt.hash(passWord, 10);
  const newUser = new userModel({ userName, passWord: hashedPassword });
  return await newUser.save();
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

// changePrefs: update favorites and/or crab lists
async function changePrefs(id, { favorites, crab }) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (crab !== undefined) update.crab = crab;

  return await userModel.findByIdAndUpdate(id, update, { new: true });
}

module.exports = {
  getUsers,
  findUserById,
  createUser,
  deleteUser,
  loginUser,
  logoutUser,
  timeoutUser,
  changePrefs,
};
