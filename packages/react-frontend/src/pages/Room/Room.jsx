import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./room.css";
import GameBackground from "../../../animationFiles/game-background.jsx";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import LoginRequiredModal from "../../app/LoginRequiredModal";
import frontendLink from "../../frontendLink";
import VoteMovingBox from "../game/VoteMovingBox";
import { readStoredCrabProfile } from "../profile/crabColor";

const API = frontendLink;
const POLL_MS = 2000;
const DEFAULT_ROOM_OPTIONS = {
  roundSeconds: 120,
  continuousPlaylistMode: "removeSongs",
  removeSelectedSong: false,
  playOnAllDevices: true,
};

function getStoredRoomMemberName(roomCode, username) {
  if (!roomCode || typeof sessionStorage === "undefined") {
    return username || "guest";
  }

  return sessionStorage.getItem(`roomMemberName:${roomCode}`) || username || "guest";
}

function getMemberName(member, index) {
  if (typeof member === "string") {
    return member;
  }

  return member?.name || member?.userName || member?.id || `Player ${index + 1}`;
}

function getRoomMemberProfiles(room, username) {
  const sourceMembers = room?.memberProfiles?.length ? room.memberProfiles : room?.members || [];
  const currentUserName = username || "guest";

  return sourceMembers.map((member, index) => {
    const name = getMemberName(member, index);

    return {
      id: typeof member === "string" ? member : member.id || member.userId || name,
      name,
      crab: member.crab || (name === currentUserName ? readStoredCrabProfile() : undefined),
    };
  });
}

function Room({ username }) {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const roomMemberName = getStoredRoomMemberName(roomCode, username);

  const [room, setRoom] = useState(location.state?.room || null);
  const [localGameStarted, setLocalGameStarted] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!roomCode) {
      setRoom({
        roomCode: "TEST",
        host: username || "guest",
        members: [username || "guest", "Player 2", "Player 3"],
        queue: [],
        started: false,
      });
      return;
    }

    try {
      const res = await authFetch(`${API}/rooms/${roomCode}`);
      if (!res.ok) {
        setRoom({
          roomCode,
          host: username || "guest",
          members: [username || "guest", "Player 2", "Player 3"],
          queue: [],
          started: false,
        });
        return;
      }

      const data = await res.json();
      setRoom(data);
    } catch {
      setRoom({
        roomCode,
        host: username || "guest",
        members: [username || "guest", "Player 2", "Player 3"],
        queue: [],
        started: false,
      });
    }
  }, [location.state?.room, roomCode, username]);

  useEffect(() => {
    const initialFetchId = setTimeout(fetchRoom, 0);
    const pollId = setInterval(fetchRoom, POLL_MS);

    return () => {
      clearTimeout(initialFetchId);
      clearInterval(pollId);
    };
  }, [fetchRoom]);

  async function handleStart() {
    setLocalGameStarted(true);

    if (!roomCode) {
      setRoom((currentRoom) => ({
        ...currentRoom,
        started: true,
        roundSeconds: 120,
        roundEndsAt: new Date(Date.now() + 120000).toISOString(),
        timerPaused: false,
        timerRemainingSeconds: 120,
      }));
      return;
    }

    try {
      const res = await authFetch(`${API}/rooms/${roomCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const updated = await res.json();
        setRoom(updated);
      }
    } catch {
      // Local test mode can still start without the backend.
    }
  }

  async function handleLeave() {
    await leaveRoom("/home");
  }

  async function leaveRoom(destination) {
    try {
      await authFetch(`${API}/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username || "guest" }),
      });
    } finally {
      sessionStorage.removeItem(`roomMemberName:${roomCode}`);
      navigate(destination);
    }
  }

  if (!room) {
    return (
      <div className="room-page">
        <OtherBackground />
        <div className="room-loading">Connecting...</div>
      </div>
    );
  }

  const isHost = room.host === (username || "guest");
  const gameStarted = room.started || localGameStarted;

  if (!gameStarted) {
    return (
      <div className="room-page">
        <OtherBackground />
        <div className="room-window">
          <header className="room-top-row">
            <div className="room-logo" aria-label="logo">
              <span>J</span>
            </div>
            <div className="room-id-bar">
              <span className="room-id-label">ROOM CODE: {room.roomCode}</span>
            </div>
            <button
              className="room-menu-btn"
              type="button"
              aria-label="leave room"
              onClick={handleLeave}
            >
              x
            </button>
          </header>

          <div className="room-lobby">
            <h2 className="room-lobby-title">Waiting for host to start...</h2>

            <div className="room-lobby-members">
              <p className="room-lobby-members-label">Players in room</p>
              <ul className="room-members-list">
                {room.members.map((member) => (
                  <li key={member} className="room-member-item">
                    {member}
                    {member === room.host ? " Host" : ""}
                  </li>
                ))}
              </ul>
            </div>

            {isHost && (
              <button className="room-start-btn" type="button" onClick={handleStart}>
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <GameBackground />

      <header className="room-top-row">
        <div className="room-logo" aria-label="logo">
          <span>J</span>
        </div>
        <div className="room-id-bar">
          <span className="room-id-label">ROOM: {room.roomCode}</span>
        </div>
        <button
          className="room-menu-btn"
          type="button"
          aria-label="leave room"
          onClick={handleLeave}
        >
          x
        </button>
      </header>

      <VoteMovingBox users={room.members.map((member) => ({ id: member, name: member }))} />
    </div>
  );
}

export default Room;
