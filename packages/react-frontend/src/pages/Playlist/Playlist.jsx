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

function getYoutubeInput(input) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return { type: null, id: "" };
  }

  try {
    const url = new URL(trimmedInput);
    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    if (playlistId) {
      return { type: "playlist", id: playlistId };
    }

    if (videoId) {
      return { type: "song", id: videoId };
    }

    if (url.hostname.includes("youtu.be")) {
      return {
        type: "song",
        id: url.pathname.split("/").filter(Boolean)[0] || "",
      };
    }

    return { type: null, id: "" };
  } catch {
    return {
      type: trimmedInput.length === 11 ? "song" : "playlist",
      id: trimmedInput,
    };
  }
}

function Playlist({ username }) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || "/home";
  const [playlistId, setPlaylistId] = useState(location.state?.playlistId || "");
  const [songs, setSongs] = useState(location.state?.songs || []);
  const [savedSongs, setSavedSongs] = useState(() => readAccountPlaylist(username));
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // state of error for wrong URL/ID
  // stores current error value 'error', and a function to update it 'setError'
  const [error, setError] = useState("");

  async function handleAddSong() {
    // clear previous errors
    setError("");

    const youtubeInput = getYoutubeInput(playlistId);

    // If input is empty, show error and stop
    if (!youtubeInput.id || !youtubeInput.type) {
      setError("Please enter a valid YouTube song or playlist URL/ID.");
      return;
    }

    setIsLoadingPlaylist(true);

    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        setError("You must be logged in to save a playlist.");
        return;
      }

      const endpoint =
        youtubeInput.type === "playlist"
          ? `${frontendLink}/users/${userId}/playlists/youtube/${youtubeInput.id}`
          : `${frontendLink}/users/${userId}/songs/youtube/${youtubeInput.id}`;
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistName: "My Playlist",
        }),
      });

      if (!res.ok) {
        setError("Invalid URL or ID."); // handle bad response from backend
        return;
      }

      const data = await res.json();

      // ensure backend returned expected format/list of songs
      if (!Array.isArray(data)) {
        setError("Invalid youtube response.");
        return;
      }

      setSongs(data);
    } catch (err) {
      console.error(err);
      // handle unexpected errors
      setError("Could not load playlist. Please check the URL or ID.");
    } finally {
      setIsLoadingPlaylist(false);
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
          <div className="playlist-header-buttons">
            <button type="button" onClick={() => navigate(returnTo)}>
              {returnTo === "/home" ? "Home" : "Back"}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate("/home/my-playlist", {
                  state: { returnTo, songs, playlistId },
                })
              }
            >
              My Playlist
            </button>
          </div>
        </header>

        <section className="playlist-add-row">
          <input
            type="text"
            value={playlistId}
            onChange={(event) => setPlaylistId(event.target.value)}
            placeholder="Enter YouTube song or playlist URL/ID"
          />
          <button type="button" onClick={handleAddSong} disabled={isLoadingPlaylist}>
            {isLoadingPlaylist ? "Loading..." : "Load"}
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
