import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./host.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import { getSessionUser } from "../../authSession";
import frontendLink from "../../frontendLink";
import { setRoomMemberSession } from "../Room/roomMemberSession";

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function Host({ username }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleCreateRoom() {
    setError("");
    const host = username || getSessionUser().username || "guest";
    const roomCode = createRoomCode();
    const fallbackRoom = {
      roomCode,
      host,
      members: [host],
      queue: [],
      started: false,
    };

    try {
      const response = await authFetch(`${frontendLink}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, host, privacy: "public" }),
      });

      if (!response.ok) {
        throw new Error("Could not create room.");
      }

      const createdRoom = await response.json();
      setRoomMemberSession(roomCode, {
        memberName: createdRoom.assignedMemberName || host,
        token: createdRoom.roomMemberToken,
      });
      navigate(`/home/room/${roomCode}`);
    } catch {
      setRoomMemberSession(roomCode, { memberName: host });
      setError("Using a local test room because the backend is unavailable.");
      navigate(`/home/room/${roomCode}`, { state: { room: fallbackRoom } });
    }
  }

  return (
    <div className="host-page">
      <OtherBackground />
      <p className="host-title">Host a Room</p>
      <button className="host-btn" type="button" onClick={handleCreateRoom}>
        Create Room
      </button>
      {error && <p className="host-error">{error}</p>}
      <button className="host-btn" type="button" onClick={() => navigate("/home")}>
        Back to Home
      </button>
    </div>
  );
}

export default Host;
