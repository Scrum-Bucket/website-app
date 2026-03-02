import mongoose from "mongoose";
import userModel from "./user.js"; 

mongoose.set("debug", true);

mongoose
  .connect("mongodb://localhost:27017/users")
  .catch((error) => console.log(error));

// REMOVE this block from services (it belongs in backend.js)
// app.get("/users", ...)

function getUsers() {
  return userModel.find({});
  
function getUsers(name, job) {
  let promise;
  if (name === undefined && job === undefined) {
    promise = userModel.find();
  } else if (name && !job) {
    promise = findUserByName(name);
  } else if (job && !name) {
    promise = findUserByJob(job);
  }
  return promise;
}

function findUserById(id) {
  return userModel.findById(id);
}

function addUser(user) {
  const userToAdd = new userModel(user);
  return userToAdd.save();
}

function findUserByName(name) {
  return userModel.find({ name });
}

function findUserByNameAndJob(name, job) {
  return userModel.find({ name, job });
}

function findUserByJob(job) {
  return userModel.find({ job });
}

function deleteUserById(id) {
  return userModel.findByIdAndDelete(id);
}

export default {
  addUser,
  getUsers,
  findUserById,
  findUserByName,
  findUserByJob,
  findUserByNameAndJob,
  deleteUserById,
};
