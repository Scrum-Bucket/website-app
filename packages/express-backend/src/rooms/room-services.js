// room-services.js
const room = require("./room.js");

function getRooms(roomCode) {
  if (!roomCode) return room.find();
  return room.find({ roomCode });
}

function findRoomById(id) {
  return room.findById(id);
}

function findRoomByCode(roomCode) {
  return room.findOne({ roomCode });
}

function addRoom(roomCode, host = null) {
  const newRoom = new room({
    roomCode,
    host,
    members: host ? [host] : [],
    queue: [],
    currentSong: null,
  });
  return newRoom.save();
}

function joinRoom(roomCode, userName) {
  return room.findOneAndUpdate({ roomCode }, { $addToSet: { members: userName } }, { new: true });
}

function leaveRoom(roomCode, userName) {
  return room.findOneAndUpdate({ roomCode }, { $pull: { members: userName } }, { new: true });
}

function deleteRoom(id) {
  return room.findByIdAndDelete(id);
}

module.exports = {
  getRooms,
  findRoomById,
  findRoomByCode,
  addRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
};
