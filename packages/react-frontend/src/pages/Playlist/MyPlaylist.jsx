import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./playlist.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { readAccountPlaylist, writeAccountPlaylist } from "./playlistStorage";

function MyPlaylist({ username }) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || "/home";
  const [songs, setSongs] = useState(() => readAccountPlaylist(username));

  function handleRemoveSong(songId) {
    const nextSongs = songs.filter((song) => song.id !== songId);
    setSongs(nextSongs);
    writeAccountPlaylist(username, nextSongs);
  }

  return (
    <div className="playlist-page">
      <OtherBackground />
      <div className="playlist-window">
        <header className="playlist-header">
          <h1>My Playlist</h1>
          <button
            type="button"
            onClick={() => navigate("/home/playlist", { state: { returnTo } })}
          >
            Add Songs
          </button>
          <button type="button" onClick={() => navigate(returnTo)}>
            Back
          </button>
        </header>

        <section className="playlist-list">
          {songs.length === 0 ? (
            <p>Your playlist is empty.</p>
          ) : (
            songs.map((song) => (
              <article className="playlist-song-row" key={song.id}>
                <div className="playlist-song-meta">
                  <span>{song.title}</span>
                  {song.artist && <small>{song.artist}</small>}
                </div>
                <button type="button" onClick={() => handleRemoveSong(song.id)}>
                  Remove
                </button>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default MyPlaylist;
