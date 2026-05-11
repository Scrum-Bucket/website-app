import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./room.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import VoteMovingBox from "../game/VoteMovingBox";

const API = "http://localhost:8000";
const POLL_MS = 2000;

function Room({ username }) {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [room, setRoom] = useState(location.state?.room || null);
  const [error, setError] = useState("");
  const [localGameStarted, setLocalGameStarted] = useState(false);
  const pollRef = useRef(null);

  // ── Fetch room state ──────────────────────────────────────────────────────
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

    if (location.state?.room) {
      return;
    }

    try {
      const res = await fetch(`${API}/rooms/${roomCode}`);
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
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchRoom]);

  // ── Upvote ────────────────────────────────────────────────────────────────
  async function handleUpvote(songId) {
    try {
      const res = await fetch(`${API}/rooms/${roomCode}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRoom(updated);
      }
    } catch {
      // silent — next poll will sync
    }
  }

  // ── Host: start game ──────────────────────────────────────────────────────
  async function handleStart() {
    setLocalGameStarted(true);

    try {
      const res = await fetch(`${API}/rooms/${roomCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const updated = await res.json();
        setRoom(updated);
      }
    } catch {
      // silent
    }
  }

  // ── Leave room ────────────────────────────────────────────────────────────
  async function handleLeave() {
    try {
      await fetch(`${API}/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username || "guest" }),
      });
    } finally {
      navigate("/home");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="room-page">
        <OtherBackground />
        <div className="room-error-box">
          <p>{error}</p>
          <button type="button" onClick={() => navigate("/home")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-page">
        <OtherBackground />
        <div className="room-loading">Connecting…</div>
      </div>
    );
  }

  const isHost = room.host === (username || "guest");
  const gameStarted = room.started || localGameStarted;

  // ── Lobby ─────────────────────────────────────────────────────────────────
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
              ✕
            </button>
          </header>

          <div className="room-lobby">
            <h2 className="room-lobby-title">Waiting for host to start…</h2>

            <div className="room-lobby-members">
              <p className="room-lobby-members-label">Players in room</p>
              <ul className="room-members-list">
                {room.members.map((m) => (
                  <li key={m} className="room-member-item">
                    {m}
                    {m === room.host ? " 👑" : ""}
                  </li>
                ))}
              </ul>
            </div>

            {isHost && (
              <button
                className="room-start-btn"
                type="button"
                onClick={handleStart}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  return (
    <div className="room-page">
      <OtherBackground />
      <div className="room-window">
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
            ✕
          </button>
        </header>

        <section className="room-content">
          <aside className="room-side-panel">
            <p className="room-side-label">Players</p>
            <ul className="room-members-list room-members-list--side">
              {room.members.map((m) => (
                <li key={m} className="room-member-item">
                  {m}
                  {m === room.host ? " 👑" : ""}
                </li>
              ))}
            </ul>
          </aside>

          <main className="room-main-panel">
            <VoteMovingBox users={room.members.map((member) => ({ id: member, name: member }))} />
          </main>
        </section>
      </div>
    </div>
  );
}

export default Room;
