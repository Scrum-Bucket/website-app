// song.js
const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema(
  {
    songLink: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  {
    collection: "songs",
    timestamps: true,
  }
);

module.exports = mongoose.model("Song", SongSchema);