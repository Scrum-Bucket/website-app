//song-services.js
const mongoose = require("mongoose");
const song = require("./song.js");

mongoose.set("debug", true);

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

//
async function findOrCreateSong(songData) {
  // returns song object
  const existingSong = await song.findOne({ songLink: songData.songLink });

  if (existingSong) {
    return existingSong;
  }

  // make the song if it doesnt exist
  const newSong = new song(songData);
  return await newSong.save();
}

// search for a song by a keyword in details array
function searchSong(keyword) {
  if (!keyword) return song.find();
  return song.find({
    "details.title": { $regex: keyword, $options: "i" },
  });
}

module.exports = {
  getSongs,
  findSongById,
  addSong,
  deleteSong,
  findOrCreateSong,
  searchSong,
};
