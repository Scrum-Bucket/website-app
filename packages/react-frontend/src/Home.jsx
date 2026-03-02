import React from "react";
import "./home.css";

function Home({ onJoinRoom }) {
  return (
    <div className="home-page">
      <div className="home-window">
        <div className="home-top-row">
          <img
            className="home-logo"
            src="https://via.placeholder.com/90"
            alt="logo"
          />
          <button className="menu-btn" aria-label="menu">
            &#9776;
          </button>
        </div>

        <div className="home-cards-row">
          <div className="home-card">
            <img src="https://via.placeholder.com/120" alt="Host" />
            <button type="button">Host</button>
          </div>

          <div className="home-card">
            <img src="https://via.placeholder.com/120" alt="Join Room" />
            <button type="button" onClick={onJoinRoom}>Join Room</button>
          </div>

          <div className="home-card">
            <img src="https://via.placeholder.com/120" alt="Playlist" />
            <button type="button">Playlist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
