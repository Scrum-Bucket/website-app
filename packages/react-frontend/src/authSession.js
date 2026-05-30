import { authFetch } from "./authFetch";
import frontendLink from "./frontendLink";
import { clearStoredCrabProfile } from "./pages/profile/crabColor";

export const HEARTBEAT_MS = 5000;

export function getSessionUser() {
  return {
    username: sessionStorage.getItem("username") || "",
    userId: sessionStorage.getItem("userId") || "",
    isAdmin: sessionStorage.getItem("isAdmin") === "true",
    token: sessionStorage.getItem("userAuthToken") || "",
  };
}

export function setSessionUser(userData, fallbackUsername = "") {
  sessionStorage.setItem("username", userData.userName || fallbackUsername);
  sessionStorage.setItem("userId", userData._id || "");
  sessionStorage.setItem("isAdmin", userData.isAdmin ? "true" : "false");

  if (userData.sessionToken) {
    sessionStorage.setItem("userAuthToken", userData.sessionToken);
  }

  localStorage.setItem("username", userData.userName || fallbackUsername);
  localStorage.setItem("userId", userData._id || "");
  localStorage.setItem("isAdmin", userData.isAdmin ? "true" : "false");
  localStorage.removeItem("authToken");
}

export function clearStoredAuth() {
  const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

  if (userId) {
    clearStoredCrabProfile(userId);
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("username");
  localStorage.removeItem("userId");
  localStorage.removeItem("isAdmin");
  sessionStorage.removeItem("userAuthToken");
  sessionStorage.removeItem("username");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("isAdmin");
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
