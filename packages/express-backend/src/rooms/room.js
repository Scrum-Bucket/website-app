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
      type: [String], 
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
  },
  {
    collection: "rooms",
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", RoomSchema);