import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./playlist.css";

function Playlist() {
  const navigate = useNavigate();
  const [songInput, setSongInput] = useState("");
  const [songs, setSongs] = useState(["Song Name 1", "Song Name 2"]);

  function handleAddSong() {
    const trimmedSong = songInput.trim();

    if (!trimmedSong) {
      return;
    }

    setSongs((prevSongs) => [...prevSongs, trimmedSong]);
    setSongInput("");
  }

  return (
    <div className="playlist-page">
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
            placeholder="Enter song name"
            value={songInput}
            onChange={(event) => setSongInput(event.target.value)}
          />
          <button type="button" onClick={handleAddSong}>
            Add Song
          </button>
        </section>

        <section className="playlist-list">
          {songs.map((song, index) => (
            <p key={`${song}-${index}`}>{song}</p>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Playlist;
