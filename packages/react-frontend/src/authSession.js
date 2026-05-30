import { authFetch } from "./authFetch";
import frontendLink from "./frontendLink";
import { clearStoredCrabProfile } from "./pages/profile/crabColor";

export const HEARTBEAT_MS = 5000;

export function clearStoredAuth() {
  const userId = localStorage.getItem("userId");

  if (userId) {
    clearStoredCrabProfile(userId);
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("username");
  localStorage.removeItem("userId");
  localStorage.removeItem("isAdmin");
}

export async function sendUserHeartbeat(room = {}) {
  const body = {};

  if (room.roomCode && room.roomMemberName) {
    body.roomCode = room.roomCode;
    body.roomMemberName = room.roomMemberName;
  }

  const response = await authFetch(`${frontendLink}/users/me/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    clearStoredAuth();
    throw new Error("User session expired");
  }

  return response.json();
}
