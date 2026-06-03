const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode() {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    return ROOM_CODE_CHARS[index];
  }).join("");
}

function normalizeRoomCode(roomCode) {
  return (roomCode || "").trim().toUpperCase();
}

module.exports = {
  ROOM_CODE_CHARS,
  ROOM_CODE_LENGTH,
  generateRoomCode,
  normalizeRoomCode,
};
