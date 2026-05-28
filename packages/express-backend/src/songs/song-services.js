//song-services.js
const mongoose = require("mongoose");
const song = require("./song.js");

mongoose.set("debug", true);

function isYouTubeVideoId(value) {
  return /^[a-zA-Z0-9_-]{11}$/.test(value || "");
}

function getSongVideoId(songData = {}) {
  if (isYouTubeVideoId(songData.videoId)) return songData.videoId;
  if (isYouTubeVideoId(songData.details?.videoId)) return songData.details.videoId;

  const songLink = songData.songLink || "";
  if (!songLink) return "";

  try {
    const url = new URL(songLink);

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0] || "";

      return isYouTubeVideoId(videoId) ? videoId : "";
    }

    if (url.hostname.includes("youtube.com")) {
      const queryVideoId = url.searchParams.get("v");
      const pathVideoId = url.pathname.split("/").filter(Boolean).pop() || "";
      const videoId = isYouTubeVideoId(queryVideoId) ? queryVideoId : pathVideoId;

      return isYouTubeVideoId(videoId) ? videoId : "";
    }
  } catch {
    return isYouTubeVideoId(songLink) ? songLink : "";
  }

  return "";
}

function normalizeSongData(songData = {}) {
  const videoId = getSongVideoId(songData);
  const songLink = songData.songLink || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
  const details =
    songData.details && typeof songData.details === "object" && !Array.isArray(songData.details)
      ? { ...songData.details }
      : {};

  if (videoId) {
    details.videoId = videoId;
  }

  return {
    ...songData,
    songLink,
    details,
  };
}

function getSongs(songLink) {
  if (!songLink) return song.find();
  return song.find({ songLink });
}

function findSongById(id) {
  return song.findById(id);
}

function addSong(songLink, details = []) {
  const newSong = new song(normalizeSongData({ songLink, details }));
  return newSong.save();
}

function deleteSong(id) {
  return song.findByIdAndDelete(id);
}

//
async function findOrCreateSong(songData) {
  const normalizedSongData = normalizeSongData(songData);
  // returns song object
  const existingSong = await song.findOne({ songLink: normalizedSongData.songLink });

  if (existingSong) {
    const videoId = getSongVideoId(existingSong);

    if (!videoId && normalizedSongData.details?.videoId) {
      existingSong.details = {
        ...(existingSong.details && typeof existingSong.details === "object"
          ? existingSong.details
          : {}),
        videoId: normalizedSongData.details.videoId,
      };

      return existingSong.save();
    }

    return existingSong;
  }

  // make the song if it doesnt exist
  const newSong = new song(normalizedSongData);
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
