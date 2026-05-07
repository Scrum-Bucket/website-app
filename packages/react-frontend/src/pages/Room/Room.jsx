import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./room.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";

const API = "http://localhost:8000";
const POLL_MS = 2000;

function Room({ username }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  // ── Fetch room state ──────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    if (!roomCode) {
      setError("Room code is missing.");
      return;
    }
    try {
      const res = await fetch(`${API}/rooms/${roomCode}`);
      if (!res.ok) {
        setError("Room not found.");
        return;
      }
      const data = await res.json();
      setRoom(data);
    } catch {
      setError("Lost connection to server.");
    }
  }, [roomCode]);

  useEffect(() => {
    fetchRoom();
    if (!roomCode) return undefined;
    pollRef.current = setInterval(fetchRoom, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchRoom, roomCode]);

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

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (!room.started) {
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
                disabled={room.queue.length === 0}
              >
                {room.queue.length === 0 ? "Add songs to start" : "Start Game"}
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
            <section className="room-now-playing">
              <div className="room-now-art" aria-label="Now playing album art" />
              <div className="room-now-bars">
                <span />
                <span />
                <span />
              </div>
            </section>

            <p className="room-queue-hint">Upvote to move a song up the queue!</p>

            <section className="room-queue-list">
              {room.queue.length === 0 && <p className="room-empty">No songs in queue yet.</p>}
              {room.queue.map((song, index) => (
                <article
                  className={`room-song-row${index === 0 ? " room-song-row--top" : ""}`}
                  key={song.songId}
                >
                  <div className="room-song-rank">#{index + 1}</div>

                  <div className="room-song-meta">
                    <span className="room-song-name">{song.name}</span>
                    <span className="room-song-artist">{song.artist}</span>
                  </div>

                  <div className="room-votes">
                    <span className="room-vote-count">{song.upvotes}</span>
                    <button
                      className="room-upvote-btn"
                      type="button"
                      onClick={() => handleUpvote(song.songId)}
                      aria-label={`Upvote ${song.name}`}
                    >
                      ▲ Upvote
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </main>
        </section>
      </div>
    </div>
  );
}

export default Room;
