import React from "react";
import { useNavigate } from "react-router-dom";
import "./room.css";

const queueSongs = [
  { id: 1, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 2, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 3, name: "Song Name", artist: "Artist Name", album: "Album Name" },
  { id: 4, name: "Song Name", artist: "Artist Name", album: "Album Name" },
];

function Room() {
  const navigate = useNavigate();

  return (
    <div className="room-page">
      <p className="room-title">Room</p>

      <div className="room-window">
        <header className="room-top-row">
          <div className="room-logo" aria-label="logo">
            <span>J</span>
          </div>

          <div className="room-id-bar">
            <span className="room-id-label">ROOM ID</span>
            <button className="room-qr-btn" type="button">
              QR
              <br />
              CODE
            </button>
          </div>

          <button
            className="room-menu-btn"
            type="button"
            aria-label="back home"
            onClick={() => navigate("/home")}
          >
            |||
          </button>
        </header>

        <section className="room-content">
          <aside className="room-side-panel" />

          <main className="room-main-panel">
            <section className="room-now-playing">
              <div className="room-now-art" aria-label="Now playing album art" />
              <div className="room-now-bars">
                <span />
                <span />
                <span />
              </div>
            </section>

            <section className="room-queue-list">
              {queueSongs.map((song) => (
                <article className="room-song-row" key={song.id}>
                  <div className="room-album-cover">Album Cover</div>

                  <div className="room-song-meta">
                    <span>{song.name}</span>
                    <span>{song.artist}</span>
                    <span>{song.album}</span>
                  </div>

                  <div className="room-votes">
                    <button className="room-upvote-btn" type="button">
                      Upvote
                    </button>
                    <button className="room-downvote-btn" type="button">
                      Downvote
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <button className="room-add-btn" type="button" aria-label="add song">
              +
            </button>
          </main>
        </section>
      </div>
    </div>
  );
}

export default Room;
