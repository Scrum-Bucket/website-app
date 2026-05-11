import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./host.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import frontendLink from "../../frontendLink";

function Host({ username }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleCreateRoom() {
    setError("");

    try {
      const response = await fetch(`${frontendLink}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Could not create room.");
        return;
      }

      const createdRoom = await response.json();
      navigate(`/home/room/${createdRoom.roomCode}`);
    } catch {
      setError("Connection error. Is the backend running?");
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
