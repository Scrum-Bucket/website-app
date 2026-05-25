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
          entryId: { type: String },
          songId: { type: String, required: true },
          name: { type: String, default: "Unknown" },
          artist: { type: String, default: "Unknown" },
          score: { type: Number, default: 0 },
          upvotes: { type: Number, default: 0 },
          addedBy: { type: String, default: null },
        },
      ],
      default: [],
    },
    currentSong: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    roundSeconds: {
      type: Number,
      default: 120,
    },
    roundEndsAt: {
      type: Date,
      default: null,
    },
    timerPaused: {
      type: Boolean,
      default: false,
    },
    timerRemainingSeconds: {
      type: Number,
      default: 120,
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
