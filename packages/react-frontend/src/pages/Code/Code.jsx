import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./code.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import logoImage from "../../assets/logo.png";
import roomImage from "../../assets/room.png";
import crabImage from "../../assets/user-crab.png";
import houseImage from "../../assets/House.PNG";
import frontendLink from "../../frontendLink";
import { setRoomMemberSession } from "../Room/roomMemberSession";

const API = frontendLink;

function Code({ username }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a room code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const checkRes = await authFetch(`${API}/rooms/${trimmed}`);
      if (!checkRes.ok) {
        const errorData = await checkRes.json().catch(() => ({}));
        setError(errorData.error || "Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }

      const joinRes = await authFetch(`${API}/rooms/${trimmed}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username || "guest" }),
      });

      if (!joinRes.ok) {
        const errorData = await joinRes.json().catch(() => ({}));
        setError(errorData.error || "Could not join room. Try again.");
        setLoading(false);
        return;
      }

      const joinedRoom = await joinRes.json();
      setRoomMemberSession(trimmed, {
        memberName: joinedRoom.assignedMemberName || username || "guest",
        token: joinedRoom.roomMemberToken,
      });
      navigate(`/home/room/${trimmed}`);
    } catch {
      setError("Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") handleJoin();
  }

  return (
    <div className="code-page">
      <OtherBackground />

      <div className="code-layout">
        <main className="code-window">
          <header className="code-header">
            <div className="code-brand-lockup">
              <img className="code-logo" src={logoImage} alt="Crab Rave logo" />
              <h1>Join by Code</h1>
            </div>
            <button
              className="code-home-btn"
              type="button"
              onClick={() => navigate("/home")}
              aria-label="Back to home"
            >
              <img src={houseImage} alt="" aria-hidden="true" />
            </button>
          </header>

          <div className="code-panel pixel-bubble-card">
            <img className="code-side-icon" src={roomImage} alt="" aria-hidden="true" />
            <section className="code-join-box" aria-label="Room code entry">
              <input
                className="code-input"
                type="text"
                placeholder="ROOM CODE"
                value={code}
                maxLength={12}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                aria-label="Room code"
              />
              <button
                className="code-join-btn"
                type="button"
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? "..." : "Join"}
              </button>
            </section>
            <img className="code-side-icon" src={crabImage} alt="" aria-hidden="true" />

            {error && <p className="code-error">{error}</p>}

            <button
              className="code-secondary-btn"
              type="button"
              onClick={() => navigate("/home/join")}
            >
              Browse public rooms
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Code;
