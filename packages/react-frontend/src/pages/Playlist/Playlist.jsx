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

  // state of error for wrong URL/ID
  // stores current error value 'error', and a function to update it 'setError'
  const [error, setError] = useState("");

  async function handleAddSong() {

    // clear previous errors
    setError("");

    const trimmedId = playlistId.trim();

    // If input is empty, show error and stop
    if (!trimmedId) {
      setError("Please enter a playlist URL or ID.");
      return;
    }

    try {
      const res = await fetch(`${frontendLink}/youtube/${trimmedId}`);
      if (!res.ok) {
        setError("Invalid playlist URL or ID."); // handle bad response from backend
        return;
      }
      const data = await res.json();

      // ensure backend returned expected format/list of songs
      if (!Array.isArray(data)) {
        setError("Invalid playlist response."); 
        return;
      }

      setSongs(data);
      setPlaylistId("");

    } catch (err) {
      console.error(err);
      // handle unexpected errors
      setError("Could not load playlist. Please check the URL or ID."); 
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
            placeholder="Enter playlist URL or ID"
          />
          <button type="button" onClick={handleAddSong}>
            Add Song
          </button>
        </section>
        {error && <p className="playlist-error">{error}</p>}
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
