import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // i think its best to just use mongo 
    /*
    userID: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    */
    userName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
      unique: true,
      index: true,
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

export default mongoose.model("User", UserSchema);