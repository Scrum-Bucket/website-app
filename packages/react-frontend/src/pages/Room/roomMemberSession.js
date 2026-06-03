import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";

export function getRoomMemberName(roomCode, fallbackName = "guest") {
  if (!roomCode || typeof sessionStorage === "undefined") {
    return fallbackName;
  }

  return sessionStorage.getItem(`roomMemberName:${roomCode}`) || fallbackName;
}

export function getRoomMemberToken(roomCode) {
  if (!roomCode || typeof sessionStorage === "undefined") {
    return "";
  }

  return sessionStorage.getItem(`roomMemberToken:${roomCode}`) || "";
}

export function setRoomMemberSession(roomCode, { memberName, token }) {
  if (!roomCode || typeof sessionStorage === "undefined") {
    return;
  }

  if (memberName) {
    sessionStorage.setItem(`roomMemberName:${roomCode}`, memberName);
  }

  if (token) {
    sessionStorage.setItem(`roomMemberToken:${roomCode}`, token);
  }
}

export function clearRoomMemberSession(roomCode) {
  if (!roomCode || typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(`roomMemberName:${roomCode}`);
  sessionStorage.removeItem(`roomMemberToken:${roomCode}`);
}

export function roomMemberHeaders(roomCode) {
  const token = getRoomMemberToken(roomCode);
  return token ? { "X-Room-Member-Token": token } : {};
}

export async function sendRoomMemberHeartbeat(roomCode) {
  const response = await authFetch(`${frontendLink}/rooms/${roomCode}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...roomMemberHeaders(roomCode) },
  });

  if (!response.ok) {
    throw new Error("Room member heartbeat failed.");
  }

  return response.json();
}
