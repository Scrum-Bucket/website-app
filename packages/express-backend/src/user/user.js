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
    passWord: {
      type: String,
      required: true,
      trim: true,
      minlength: 60,
      maxlength: 60, //Forced to be 60 chars long by bcrypt
      unique: false,
      index: true,
    },
    // 0 = logged out, 1 = logged in, 2 = timed out
    status: {
      type: Number,
      default: 0,
    },
    playlist: {
      type: [Number], // SongIDs
      default: [],
    },
    favorites: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    crab: {
      type: [Number],
      default: [],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
