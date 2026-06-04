// song.js
const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema(
  {
    // youtube link or normalized song url
    songLink: {
      type: String,
      required: true,
      trim: true,
    },

    // title, artist, video id, or other youtube metadata
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
