import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./code.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";

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
      // Verify the room exists
      const checkRes = await authFetch(`${API}/rooms/${trimmed}`);
      if (!checkRes.ok) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }

      // Join the room
      const joinRes = await authFetch(`${API}/rooms/${trimmed}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username || "guest" }),
      });

      if (!joinRes.ok) {
        setError("Could not join room. Try again.");
        setLoading(false);
        return;
      }

      const joinedRoom = await joinRes.json();
      localStorage.setItem(
        `roomMemberName:${trimmed}`,
        joinedRoom.assignedMemberName || username || "guest"
      );
      navigate(`/home/room/${trimmed}`);
    } catch {
      setError("Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleJoin();
  }

  return (
    <div className="code-page">
      <OtherBackground />
      <p className="code-title">Join by Code</p>

      <div className="code-panel">
        <div className="code-logo" aria-label="logo">
          <span>J</span>
        </div>

        <section className="code-join-box">
          <input
            className="code-input"
            type="text"
            placeholder="Enter room code"
            value={code}
            maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            aria-label="Room code"
          />
          <button className="code-join-btn" type="button" onClick={handleJoin} disabled={loading}>
            {loading ? "…" : "Join by\ncode"}
          </button>
        </section>

        {error && <p className="code-error">{error}</p>}

        <button className="code-browse-btn" type="button" onClick={() => navigate("/home/join")}>
          Browse public rooms
        </button>

        <button className="code-browse-btn" type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Code;
