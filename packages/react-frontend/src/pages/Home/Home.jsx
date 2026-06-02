import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./home.css";
import logoImage from "../../assets/logo.png";
import wifiImage from "../../assets/wifi.png";
import roomImage from "../../assets/room.png";
import musicNoteImage from "../../assets/musicnote.png";
import Background from "../../../animationFiles/home-background.jsx";

function Home({ username, onLoginRequired }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = username === "Guest";
  const [roomNotice, setRoomNotice] = useState(location.state?.roomNotice || "");

  useEffect(() => {
    if (!location.state?.roomNotice) {
      return undefined;
    }

    const showNoticeTimer = setTimeout(() => {
      setRoomNotice(location.state.roomNotice);
    }, 0);
    navigate(".", { replace: true, state: {} });

    const noticeTimer = setTimeout(() => {
      setRoomNotice("");
    }, 7000);

    return () => {
      clearTimeout(showNoticeTimer);
      clearTimeout(noticeTimer);
    };
  }, [location.state, navigate]);

  function openProtectedPage(path) {
    if (isGuest && onLoginRequired) {
      onLoginRequired();
      return;
    }

    navigate(path);
  }

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
              onClick={() => openProtectedPage("/home/profile")}
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
              onClick={() => openProtectedPage("/home/host")}
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
              onClick={() => openProtectedPage("/home/playlist")}
            >
              Playlist
            </button>
          </div>
        </div>

        {roomNotice ? (
          <div className="home-room-notice" role="status" aria-live="polite">
            {roomNotice}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Home;
