//user.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // user id just use mongoDB _id 
    userName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
      unique: true,
      index: true,
    },
    // 0 = logged out, 1 = logged in, 2 = timed out
    status: {
      type: Number,
      default: 0,
    },
    favorites: {
      type: [Number], // SongIDs
      default: [],
    },
    crab: {
      type: [Number],
      default: [],
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);