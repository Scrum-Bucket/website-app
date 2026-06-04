const jwt = require("jsonwebtoken");
const { requireEnv } = require("../env");
const { normalizeRoomCode } = require("./room-code.js");

const ROOM_MEMBER_TOKEN_EXPIRES_IN = process.env.ROOM_MEMBER_TOKEN_EXPIRES_IN || "6h";

function createRoomMemberToken({ roomCode, memberName }) {
  // Sign the room nickname so clients cannot impersonate another member
  return jwt.sign(
    {
      type: "room-member",
      roomCode: normalizeRoomCode(roomCode),
      memberName,
    },
    requireEnv("TOKEN_SECRET"),
    { expiresIn: ROOM_MEMBER_TOKEN_EXPIRES_IN }
  );
}

function getRoomMemberToken(req) {
  return req.headers["x-room-member-token"] || req.body?.roomMemberToken || "";
}

function verifyRoomMemberToken(token, roomCode) {
  if (!token) return null;

  try {
    // Room tokens are scoped to one room code
    const decoded = jwt.verify(token, requireEnv("TOKEN_SECRET"));
    const tokenRoomCode = normalizeRoomCode(decoded.roomCode);

    if (decoded.type !== "room-member" || tokenRoomCode !== normalizeRoomCode(roomCode)) {
      return null;
    }

    return {
      roomCode: tokenRoomCode,
      memberName: decoded.memberName,
    };
  } catch {
    return null;
  }
}

function attachRoomMemberToken(room, roomCode, memberName) {
  if (!room || !memberName) return room;

  return {
    ...room,
    roomMemberToken: createRoomMemberToken({ roomCode, memberName }),
  };
}

function getVerifiedRoomMember(req, roomCode) {
  return verifyRoomMemberToken(getRoomMemberToken(req), roomCode);
}

module.exports = {
  attachRoomMemberToken,
  createRoomMemberToken,
  getVerifiedRoomMember,
  verifyRoomMemberToken,
};
