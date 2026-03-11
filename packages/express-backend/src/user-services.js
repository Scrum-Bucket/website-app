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

function addUser(user) {
  const userToAdd = new userModel(user);
  return userToAdd.save();
}

function updateUserById(id, user) {
  return userModel.findByIdAndUpdate(id, user, {
    new: true,
    runValidators: true,
  });
}

function patchUserById(id, patch) {
  return userModel.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  });
}

function deleteUserById(id) {
  return userModel.findByIdAndDelete(id);
}

export default {
  getUsers,
  findUserById,
  addUser,
  updateUserById,
  patchUserById,
  deleteUserById,
};