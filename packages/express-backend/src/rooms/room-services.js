const Room = require("./room.js");

function getRooms(roomCode) {
  if (!roomCode) return Room.find();
  return Room.find({ roomCode });
}

function findRoomById(id) {
  return Room.findById(id);
}

function findRoomByCode(roomCode) {
  return Room.findOne({ roomCode });
}

function addRoom(roomCode, host = null) {
  const newRoom = new Room({
    roomCode,
    host,
    members: host ? [host] : [],
    queue: [],
    currentSong: null,
    started: false,
  });
  return newRoom.save();
}

function joinRoom(roomCode, userName) {
  return Room.findOneAndUpdate(
    { roomCode },
    { $addToSet: { members: userName } },
    { new: true }
  );
}

function startRoom(roomCode) {
  return Room.findOneAndUpdate(
    { roomCode },
    { $set: { started: true } },
    { new: true }
  );
}

function addSongToQueue(roomCode, songId, name, artist) {
  return Room.findOneAndUpdate(
    { roomCode },
    { $push: { queue: { songId, name, artist, upvotes: 0 } } },
    { new: true }
  );
}

// Increment upvotes for a song and bubble it up past any song above it with fewer upvotes
async function upvoteSong(roomCode, songId) {
  const room = await Room.findOne({ roomCode });
  if (!room) throw new Error("Room not found");

  const idx = room.queue.findIndex((s) => s.songId === songId);
  if (idx === -1) throw new Error("Song not in queue");

  room.queue[idx].upvotes += 1;

  // Bubble the song up while the song above it has fewer upvotes
  let i = idx;
  while (i > 0 && room.queue[i].upvotes > room.queue[i - 1].upvotes) {
    const temp = room.queue[i];
    room.queue[i] = room.queue[i - 1];
    room.queue[i - 1] = temp;
    i -= 1;
  }

  room.markModified("queue");
  return room.save();
}

function leaveRoom(roomCode, userName) {
  return Room.findOneAndUpdate(
    { roomCode },
    { $pull: { members: userName } },
    { new: true }
  );
}

function deleteRoom(id) {
  return Room.findByIdAndDelete(id);
}

module.exports = {
  getRooms,
  findRoomById,
  findRoomByCode,
  addRoom,
  joinRoom,
  leaveRoom,
  startRoom,
  addSongToQueue,
  upvoteSong,
  leaveRoom,
  deleteRoom,
};
