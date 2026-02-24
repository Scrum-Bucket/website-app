import React from "react";
import "./join.css";

const songs = [
  { id: 1, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 2, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 3, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 4, name: "Song Name", artist: "Artist Name", album: "Album Name" },
];

function Join({ onBackHome, onOpenRoom, onOpenCode }) {
  return (
    <div className="join-page">
      <div className="join-window">
        <header className="join-top-row">
          <div className="join-logo" aria-label="logo">
            <span className="join-logo-mark">J</span>
          </div>
          <button className="join-menu-btn" aria-label="back home" onClick={onBackHome}>
            &#9776;
          </button>
        </header>

        <section className="join-search-wrap">
          <div className="join-search-bar">
            <input type="text" placeholder="Search for Room Name" />
            <button aria-label="join by code" onClick={onOpenCode} type="button">=</button>
          </div>
        </section>

        <section className="join-list">
          {songs.map((song) => (
            <article className="join-song-row" key={song.id} onClick={onOpenRoom}>
              <div className="join-album-cover">Album Cover</div>
              <div className="join-song-meta">
                <span>{song.name}</span>
                <span>{song.artist}</span>
                <span>{song.album}</span>
              </div>
              <div className="join-votes">
                <button className="upvote-btn" type="button">
                  Upvote
                </button>
                <button className="downvote-btn" type="button">
                  Downvote
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Join;
