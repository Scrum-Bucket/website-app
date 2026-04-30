const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    members: {
      type: [String],
      default: [],
    },
    queue: {
      type: [
        {
          songId: { type: String, required: true },
          name: { type: String, default: "Unknown" },
          artist: { type: String, default: "Unknown" },
          upvotes: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    currentSong: {
      type: String,
      default: null,
    },
    host: {
      type: String,
      default: null,
    },
    started: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "rooms",
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", RoomSchema);