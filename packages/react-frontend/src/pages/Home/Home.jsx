import React from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import logoImage from "../../assets/logo.png";
import wifiImage from "../../assets/wifi.png";
import roomImage from "../../assets/room.png";
import musicNoteImage from "../../assets/musicnote.png";
import Background from "../../../animationFiles/home-background.jsx";

function Home({ username }) {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Background />

      <div className="home-layout">
        <div className="home-header-bubble pixel-bubble-card">
          <div className="home-top-row">
            <img className="home-logo" src={logoImage} alt="logo" />
            <button
              type="button"
              className="profile-btn pixel-bubble-btn"
              aria-label="profile"
              onClick={() => navigate("/home/profile")}
            >
              Profile
            </button>
          </div>

          <p className="home-username">Welcome, {username}</p>
        </div>

        <div className="home-cards-row">
          <div className="home-card pixel-bubble-card">
            <img src={wifiImage} alt="wifi" />
            <button
              type="button"
              className="pixel-bubble-btn"
              onClick={() => navigate("/home/host")}
            >
              Host
            </button>
          </div>

          <div className="home-card pixel-bubble-card">
            <img src={roomImage} alt="room" />
            <button
              type="button"
              className="pixel-bubble-btn"
              onClick={() => navigate("/home/code")}
            >
              Join Room
            </button>
          </div>

          <div className="home-card pixel-bubble-card">
            <img src={musicNoteImage} alt="music note" />
            <button
              type="button"
              className="pixel-bubble-btn"
              onClick={() => navigate("/home/playlist")}
            >
              Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
