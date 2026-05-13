import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./playlist.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import frontendLink from "../../frontendLink";

import {
  getSongArtist,
  getSongId,
  getSongTitle,
  readAccountPlaylist,
  writeAccountPlaylist,
} from "./playlistStorage";

function getPlaylistId(input) {
  try {
    const url = new URL(input);
    return url.searchParams.get("list") || null;
  } catch {
    return input.trim(); // if its not a URL, treat as ID
  }
}

function Playlist({ username }) {
  const navigate = useNavigate();
  // Now its a PlaylistID
  const [playlistId, setPlaylistId] = useState("");
  const [songs, setSongs] = useState([]);
  const [savedSongs, setSavedSongs] = useState(() => readAccountPlaylist(username));

  // state of error for wrong URL/ID
  // stores current error value 'error', and a function to update it 'setError'
  const [error, setError] = useState("");

  async function handleAddSong() {

    // clear previous errors
    setError("");

    const parsedId = getPlaylistId(playlistId);

    // If input is empty, show error and stop
    if (!parsedId) {
      setError("Please enter a playlist URL or ID.");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        setError("You must be logged in to save a playlist.");
        return;
      }

      const res = await fetch(`${frontendLink}/users/${userId}/playlists/youtube/${parsedId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistName: "My Playlist",
        }),
      });

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

  function handleAddToAccountPlaylist(song) {
    const nextSong = {
      id: getSongId(song),
      title: getSongTitle(song),
      artist: getSongArtist(song),
    };

    if (!nextSong.id) {
      nextSong.id = nextSong.title;
    }

    if (savedSongs.some((savedSong) => savedSong.id === nextSong.id)) {
      setError("That song is already in your playlist.");
      return;
    }

    const nextSavedSongs = [...savedSongs, nextSong];
    setSavedSongs(nextSavedSongs);
    writeAccountPlaylist(username, nextSavedSongs);
    setError("");
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
          <button type="button" onClick={() => navigate("/home/my-playlist")}>
            My Playlist
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
            <article className="playlist-song-row" key={getSongId(song) || index}>
              <div className="playlist-song-meta">
                <span>{getSongTitle(song)}</span>
                {getSongArtist(song) && <small>{getSongArtist(song)}</small>}
              </div>
              <button type="button" onClick={() => handleAddToAccountPlaylist(song)}>
                Add
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Playlist;
