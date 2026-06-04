// user.js
const mongoose = require("mongoose");

const DEFAULT_CRAB_COLOR = "#e74c3c";

const UserSchema = new mongoose.Schema(
  {
    // public username shown around the app
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
      maxlength: 60, // forced to be 60 chars long by bcrypt
      unique: false,
      index: true,
    },
    playlists: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            default: "Untitled Playlist",
          },
          songs: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Song",
            },
          ],
        },
      ],
      default: [],
    },
    // 0 logged out, 1 logged in, 2 timed out
    status: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    activeSessions: {
      // stores session id to last heartbeat time
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    favorites: {
      type: [Number], // song ids
      default: [],
    },
    crab: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        color: DEFAULT_CRAB_COLOR,
        hat: "",
      }),
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
