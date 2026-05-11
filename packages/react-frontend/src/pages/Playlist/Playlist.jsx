import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./playlist.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import frontendLink from "../../frontendLink";

function Playlist() {
  const navigate = useNavigate();
  // Now its a PlaylistID
  const [playlistId, setPlaylistId] = useState("");
  const [songs, setSongs] = useState([]);

  async function handleAddSong() {
    const trimmedId = playlistId.trim();

    if (!trimmedId) return;

    try {
      const res = await fetch(`${frontendLink}/youtube/${trimmedId}`);
      const data = await res.json();
      setSongs(data);
      setPlaylistId("");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="playlist-page">
      <OtherBackground />
      <div className="playlist-window">
        <header className="playlist-header">
          <h1>Playlist</h1>
          <button type="button" onClick={() => navigate("/home")}>
            Back to Home
          </button>
        </header>

        <section className="playlist-add-row">
          <input
            type="text"
            value={playlistId}
            onChange={(event) => setPlaylistId(event.target.value)}
            placeholder="Enter playlist ID"
          />
          <button type="button" onClick={handleAddSong}>
            Add Song
          </button>
        </section>

        <section className="playlist-list">
          {songs.map((song, index) => (
            <p key={index}>{song.details.title}</p>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Playlist;
