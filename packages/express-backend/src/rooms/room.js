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
    memberActivity: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    queue: {
      type: [
        {
          entryId: { type: String },
          songId: { type: String, required: true },
          name: { type: String, default: "Unknown" },
          artist: { type: String, default: "Unknown" },
          songLink: { type: String, default: "" },
          videoId: { type: String, default: "" },
          score: { type: Number, default: 0 },
          upvotes: { type: Number, default: 0 },
          colorIndex: { type: Number },
          addedBy: { type: String, default: null },
          thumbnail: { type: String, default: "" },
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
    options: {
      roundSeconds: { type: Number, default: 120 },
      continuousPlaylistMode: {
        type: String,
        enum: ["removeSongs", "removeVotes", "keepAll", "playQueue"],
        default: "removeSongs",
      },
      removeSelectedSong: { type: Boolean, default: false },
      playOnAllDevices: { type: Boolean, default: true },
      pauseVotingWhenTimerPaused: { type: Boolean, default: false },
    },
    host: {
      type: String,
      default: null,
    },
    started: {
      type: Boolean,
      default: false,
    },
    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
  },
  {
    collection: "rooms",
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", RoomSchema);
