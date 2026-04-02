//user-services.js

//Find the database file in the config folder and load the link
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../config/database.env"),
});
//Specific variable needed
//const database = process.env.MONGODB_URI;
//^for now we use local database until cloud DB works
const database = "mongodb://localhost:27017/users";

import mongoose from "mongoose";
import user from "./user.js";

mongoose.set("debug", true);

mongoose
  //changes this to atlas DB link later
  .connect(database)
  .catch((error) => console.log(error));

//allows get all
function getUsers(userName) {
  if (!userName) return user.find(); //if no users return all
  return user.find({ userName });
}

function findUserById(id) {
  return user.findById(id);
}

// defaults defined in schema
function createUser(userName) {
  const newUser = new user({ userName });
  return newUser.save();
}

// nukes it
function deleteUser(id) {
  return user.findByIdAndDelete(id);
}

//if not async youd check status b4 mongoDB fetches it
//set status to 1 if they exist and arent timed out
async function loginUser(id) {
  const user = await user.findById(id);
  if (!user) throw new Error("User not found");
  if (user.status === 2) throw new Error("User is timed out");
  return user.findByIdAndUpdate(id, { status: 1 }, { new: true });
}

// logoutUser: set status back to 0
async function logoutUser(id) {
  const user = await user.findById(id);
  if (!user) throw new Error("User not found");
  //new:true means return user after its updated
  return user.findByIdAndUpdate(id, { status: 0 }, { new: true });
}

// timeoutUser: status 2 basically soft ban
async function timeoutUser(id) {
  const user = await user.findById(id);
  if (!user) throw new Error("User not found");
  return user.findByIdAndUpdate(id, { status: 2 }, { new: true });
}

// changePrefs: update favorites and/or crab lists
async function changePrefs(id, { favorites, crab }) {
  const user = await user.findById(id);
  if (!user) throw new Error("User not found");

  const update = {};
  if (favorites !== undefined) update.favorites = favorites;
  if (crab !== undefined) update.crab = crab;

  return user.findByIdAndUpdate(id, update, { new: true });
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
