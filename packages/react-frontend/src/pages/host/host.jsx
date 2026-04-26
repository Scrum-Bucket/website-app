import { useNavigate } from "react-router-dom";
import "./host.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";

function Host() {
  const navigate = useNavigate();

  return (
    <div className="host-page">
      <OtherBackground />
      <p className="host-title">Host a Room</p>
      <button
        className="host-btn"
        type="button"
        onClick={() => navigate("/home/room")}
      >
        Create Room
      </button>
      <button
        className="host-btn"
        type="button"
        onClick={() => navigate("/home")}
      >
        Back to Home
      </button>
    </div>
  );
}

export default Host;
