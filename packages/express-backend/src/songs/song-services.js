//song-services.js
const mongoose = require("mongoose");
const song = require("./song.js");

mongoose.set("debug", true);

//only need this in user services
/*
mongoose
  // change to atlas DB link later
  .connect("mongodb://localhost:27017/songs")
  .catch((error) => console.log(error));
*/

function getSongs(songLink) {
  if (!songLink) return song.find();
  return song.find({ songLink });
}

function findSongById(id) {
  return song.findById(id);
}

function addSong(songLink, details = []) {
  const newSong = new song({ songLink, details });
  return newSong.save();
}

function deleteSong(id) {
  return song.findByIdAndDelete(id);
}

// searchSong two search by a keyword in details array
function searchSong(keyword) {
  if (!keyword) return song.find();
  return song.find({
    details: { $elemMatch: { $regex: keyword, $options: "i" } },
  });
}

module.exports = {
  getSongs,
  findSongById,
  addSong,
  deleteSong,
  searchSong,
};
