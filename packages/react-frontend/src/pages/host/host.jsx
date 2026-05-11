import { useNavigate } from "react-router-dom";
import "./host.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";

const API = "http://localhost:8000";

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function Host() {
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    const host = localStorage.getItem("username") || "guest";
    const roomCode = createRoomCode();
    const fallbackRoom = {
      roomCode,
      host,
      members: [host, "Player 2", "Player 3"],
      queue: [],
      started: false,
    };

    try {
      const response = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, host }),
      });

      if (!response.ok) {
        throw new Error("Create room failed");
      }

      navigate(`/home/room/${roomCode}`);
    } catch {
      navigate(`/home/room/${roomCode}`, { state: { room: fallbackRoom } });
    }
  };

  return (
    <div className="host-page">
      <OtherBackground />
      <p className="host-title">Host a Room</p>
      <button className="host-btn" type="button" onClick={handleCreateRoom}>
        Create Room
      </button>
      <button className="host-btn" type="button" onClick={() => navigate("/home")}>
        Back to Home
      </button>
    </div>
  );
}

export default Host;
