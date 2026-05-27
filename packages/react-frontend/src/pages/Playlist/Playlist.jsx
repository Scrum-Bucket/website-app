import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./playlist.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";

import {
  getSongArtist,
  getSongId,
  getSongLink,
  getSongTitle,
  getSongVideoId,
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
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || "/home";
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

    const res = await authFetch(`${frontendLink}/users/${userId}/playlists/youtube/${parsedId}`, {
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

function handleToggleAccountPlaylist(song) {
  const nextSong = normalizeSong(song);

  const isAlreadySaved = savedSongs.some((savedSong) => savedSong.id === nextSong.id);

  if (isAlreadySaved) {
    const nextSavedSongs = savedSongs.filter((savedSong) => savedSong.id !== nextSong.id);
    setSavedSongs(nextSavedSongs);
    writeAccountPlaylist(username, nextSavedSongs);
    setError("");
    return;
  }

  const nextSavedSongs = [...savedSongs, nextSong];
  setSavedSongs(nextSavedSongs);
  writeAccountPlaylist(username, nextSavedSongs);
  setError("");
}

function normalizeSong(song) {
  const nextSong = {
    id: getSongId(song),
    title: getSongTitle(song),
    artist: getSongArtist(song),
    songLink: getSongLink(song),
    videoId: getSongVideoId(song),
  };

  if (!nextSong.id) {
    nextSong.id = nextSong.title;
  }

  return nextSong;
}

function handleAddAllSongs() {
  const existingIds = new Set(savedSongs.map((song) => song.id));
  const newSongs = songs.map(normalizeSong).filter((song) => !existingIds.has(song.id));

  const nextSavedSongs = [...savedSongs, ...newSongs];
  setSavedSongs(nextSavedSongs);
  writeAccountPlaylist(username, nextSavedSongs);
  setError("");
}

function handleRemoveAllSongs() {
  const playlistSongIds = new Set(songs.map((song) => normalizeSong(song).id));
  const nextSavedSongs = savedSongs.filter((song) => !playlistSongIds.has(song.id));

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
          <button type="button" onClick={() => navigate(returnTo)}>
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/home/my-playlist", { state: { returnTo } })}
          >
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
        {songs.length > 0 && (
          <section className="playlist-add-row">
            <button type="button" onClick={handleAddAllSongs}>
              Add All
            </button>
            <button type="button" onClick={handleRemoveAllSongs}>
              Remove All
            </button>
          </section>
        )}
        <section className="playlist-list">
          {songs.map((song, index) => (
            <article className="playlist-song-row" key={getSongId(song) || index}>
              <div className="playlist-song-meta">
                <span>{getSongTitle(song)}</span>
                {getSongArtist(song) && <small>{getSongArtist(song)}</small>}
              </div>
              <button type="button" onClick={() => handleToggleAccountPlaylist(song)}>
              {/* Decides what text button should show: Add or Remove.
                  If any saved song has the same id as the current song, display Remove. */}
                {savedSongs.some((savedSong) => savedSong.id === normalizeSong(song).id)
                  ? "Remove"
                  : "Add"}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Playlist;
