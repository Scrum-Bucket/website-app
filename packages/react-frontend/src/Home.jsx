import React from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import logoImage from "./assets/logo.png";
import wifiImage from "./assets/wifi.png";
import roomImage from "./assets/room.png";
import musicNoteImage from "./assets/musicnote.png";
import Background from "../animationFiles/home-background.jsx";

function Home({ username }) {
  const navigate = useNavigate();

  return (
    <div className="home-page">
       <Background />
      <div className="home-window">
        <div className="home-top-row">
          <img className="home-logo" src={logoImage} alt="logo" />
          <button className="menu-btn" aria-label="menu">
            &#9776;
          </button>
        </div>

        <p className="home-username">Welcome, {username}</p>

        <div className="home-cards-row">
          <div className="home-card">
            <img src={wifiImage} alt="wifi" />
            <button type="button">Host</button>
          </div>

          <div className="home-card">
            <img src={roomImage} alt="room" />
            <button type="button" onClick={() => navigate("/home/join")}>
              Join Room
            </button>
          </div>

          <div className="home-card">
            <img src={musicNoteImage} alt="music note" />
            <button type="button" onClick={() => navigate("/home/playlist")}>
              Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
