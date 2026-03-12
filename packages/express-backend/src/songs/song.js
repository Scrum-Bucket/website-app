// song.js
import mongoose from "mongoose";

const SongSchema = new mongoose.Schema(
  {

    songLink: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: [String],
      default: [],
    },
  },
  {
    collection: "songs",
    timestamps: true,
  }
);

export default mongoose.model("Song", SongSchema);