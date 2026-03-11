import mongoose from "mongoose";
import userModel from "./user.js";

mongoose.set("debug", true);

mongoose
  .connect("mongodb://localhost:27017/users")
  .catch((error) => console.log(error));

function getUsers(userName) {
  if (!userName) return userModel.find();
  return userModel.find({ userName });
}

function findUserById(id) {
  return userModel.findById(id);
}

// createUser: make a new user, default status = logged out
function createUser(userName) {
  const newUser = new userModel({ userName });
  return newUser.save();
}

// deleteUser: just nuke it
function deleteUser(id) {
  return userModel.findByIdAndDelete(id);
}

// loginUser: set status to 1 if they exist and arent timed out
async function loginUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  if (user.status === 2) throw new Error("User is timed out");
  return userModel.findByIdAndUpdate(id, { status: 1 }, { new: true });
}

// logoutUser: set status back to 0
async function logoutUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return userModel.findByIdAndUpdate(id, { status: 0 }, { new: true });
}

// timeoutUser: status 2, basically a soft ban
async function timeoutUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");
  return userModel.findByIdAndUpdate(id, { status: 2 }, { new: true });
}

// changePrefs: update favorites and/or crab lists
async function changePrefs(id, { favorites, crab }) {
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (crab !== undefined) update.crab = crab;

  return userModel.findByIdAndUpdate(id, update, { new: true });
}

export default {
  getUsers,
  findUserById,
  createUser,
  deleteUser,
  loginUser,
  logoutUser,
  timeoutUser,
  changePrefs,
};