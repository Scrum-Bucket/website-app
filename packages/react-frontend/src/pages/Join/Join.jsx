import React from "react";
import { useNavigate } from "react-router-dom";
import "./join.css";
import logoImage from "../../assets/logo.png";
import OtherBackground from "../../../animationFiles/other-background.jsx";

const songs = [
  { id: 1, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 2, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 3, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 4, name: "Song Name", artist: "Artist Name", album: "Album Name" },
];

function Join() {
  const navigate = useNavigate();

  return (
    <div className="join-page">
      <OtherBackground />
      <div className="join-window">
        <header className="join-top-row">
          <img className="join-logo" src={logoImage} alt="logo" />
          <button
            className="join-menu-btn"
            aria-label="back home"
            onClick={() => navigate("/home")}
          >
            &#9776;
          </button>
        </header>

        <section className="join-search-wrap">
          <div className="join-search-bar">
            <input type="text" placeholder="Search for Room Name" />
            <button aria-label="join by code" onClick={() => navigate("/home/code")} type="button">
              =
            </button>
          </div>
        </section>

        <section className="join-list">
          {songs.map((song) => (
            <article className="join-song-row" key={song.id} onClick={() => navigate("/home/code")}>
              <div className="join-album-cover">Album Cover</div>
              <div className="join-song-meta">
                <span>{song.name}</span>
                <span>{song.artist}</span>
                <span>{song.album}</span>
              </div>
              
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Join;
