import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import { createCrabIcon } from "../profile/crabColor";

const hatImages = import.meta.glob("../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const DEFAULT_USERS = [
  { id: "captain", name: "Captain" },
  { id: "sailor", name: "Sailor" },
  { id: "dj", name: "DJ" },
  { id: "guest", name: "Guest" },
];

const DEFAULT_SONGS = [
  { id: "dummy-lagoon", name: "Lagoon Lights", artist: "Blue Reef", source: "Dummy" },
  { id: "dummy-tide", name: "High Tide", artist: "The Shells", source: "Dummy" },
  { id: "dummy-dock", name: "Dock Party", artist: "Captain Keys", source: "Dummy" },
  { id: "dummy-sunset", name: "Sunset Queue", artist: "Marina Mix", source: "Dummy" },
  { id: "dummy-current", name: "Current Drift", artist: "Waveform", source: "Dummy" },
  { id: "dummy-reef", name: "Reef Rush", artist: "Coral Club", source: "Dummy" },
  { id: "dummy-bass", name: "Bass Boat", artist: "Harbor Sound", source: "Dummy" },
  { id: "dummy-moon", name: "Moonlit Marina", artist: "Night Wake", source: "Dummy" },
];

const ROUND_SECONDS = 120;
const MIN_SCORE = -20;
const MAX_SCORE = 40;
const STACK_CARD_HEIGHT = 86;
const STACK_CARD_GAP = 30;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeUsers(users) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const name =
      typeof user === "string" ? user : user.name || user.userName || `User ${index + 1}`;

    return {
      id: user.id || user.userId || name,
      name,
    };
  });
}

function normalizeSongs(songs) {
  const sourceSongs = songs?.length ? [...songs, ...DEFAULT_SONGS] : DEFAULT_SONGS;

  return sourceSongs.map((song, index) => ({
    id: song.songId || song.id || `${song.name || "song"}-${index}`,
    name: song.name || song.title || song.details?.title || `Song ${index + 1}`,
    artist: song.artist || song.details?.artist || "Unknown artist",
    source: song.source || (song.songId ? "Room queue" : "Dummy"),
  }));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function createEntry(song) {
  return {
    entryId: `${song.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    song,
    score: 0,
  };
}

function VoteMovingBoxItem({ entry, stackIndex, onVote }) {
  const { song, score } = entry;

  return (
    <article
      className="vote-box-row"
      style={{ transform: `translateY(${stackIndex * (STACK_CARD_HEIGHT + STACK_CARD_GAP)}px)` }}
    >
      <div className="vote-box-bar" aria-label={`${song.name} score ${score}`}>
        <button
          type="button"
          className="vote-box-button vote-box-button--up"
          onClick={() => onVote(entry.entryId, 1)}
          aria-label={`Upvote ${song.name}`}
        >
          Up
        </button>
        <span className="vote-box-score">{score}</span>
        <div className="vote-box-track">
          <span className="vote-box-track-title">{song.name}</span>
          <span className="vote-box-track-artist">{song.artist}</span>
        </div>
        <button
          type="button"
          className="vote-box-button vote-box-button--down"
          onClick={() => onVote(entry.entryId, -1)}
          aria-label={`Downvote ${song.name}`}
        >
          Down
        </button>
      </div>
    </article>
  );
}

function SongPicker({ songs, onAddSong }) {
  return (
    <aside className="vote-song-picker" aria-label="Choose songs">
      <div className="vote-panel-heading">
        <p className="vote-panel-kicker">Song window</p>
        <h2>Add dummy songs</h2>
      </div>

      <div className="vote-song-list">
        {songs.map((song) => (
          <button
            className="vote-song-option"
            type="button"
            onClick={() => onAddSong(song)}
            key={song.id}
          >
            <span>{song.name}</span>
            <small>{song.artist} / {song.source}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CrabLane({ users, crabIcon }) {
  return (
    <div className="vote-crab-lane" aria-label="Players">
      {users.map((user, index) => (
        <div
          className="vote-player-crab"
          style={{ animationDelay: `${index * 0.18}s` }}
          key={user.id}
        >
          <img src={crabIcon} alt="" aria-hidden="true" />
          <span>{user.name}</span>
        </div>
      ))}
    </div>
  );
}

function VoteMovingBox({ users, availableSongs }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const songs = useMemo(() => normalizeSongs(availableSongs), [availableSongs]);
  const [entries, setEntries] = useState([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);
  const rankedEntries = useMemo(
    () => [...entries].sort((a, b) => b.score - a.score),
    [entries]
  );
  const stackHeight = entries.length
    ? entries.length * STACK_CARD_HEIGHT + (entries.length - 1) * STACK_CARD_GAP
    : 260;

  useEffect(() => {
    let isActive = true;
    const savedColor = localStorage.getItem("profileCrabColor") || "#e74c3c";
    const savedHat = localStorage.getItem("profileCrabHat") || "";
    const hatSource = savedHat ? hatImages[`../../assets/hats/${savedHat}`] || "" : "";

    createCrabIcon(UserCrabIcon, savedColor, hatSource).then((nextIcon) => {
      if (isActive) {
        setCrabIcon(nextIcon);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const completeRound = useCallback(() => {
    setEntries((currentEntries) => {
      if (!currentEntries.length) return currentEntries;

      const winningEntry = currentEntries.reduce((leader, entry) =>
        entry.score > leader.score ? entry : leader
      );

      setNowPlaying({
        ...winningEntry.song,
        score: winningEntry.score,
      });

      return [];
    });
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft((currentTime) => Math.max(currentTime - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (timeLeft !== 0) return;

    completeRound();
    setTimeLeft(ROUND_SECONDS);
  }, [completeRound, timeLeft]);

  const handleAddSong = (song) => {
    setEntries((currentEntries) => [...currentEntries, createEntry(song)]);
  };

  const handleVote = (entryId, amount) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.entryId === entryId
          ? { ...entry, score: clamp(entry.score + amount, MIN_SCORE, MAX_SCORE) }
          : entry
      )
    );
  };

  return (
    <section className="vote-game-shell" aria-label="Vote moving box game">
      <SongPicker songs={songs} onAddSong={handleAddSong} />

      <div className="vote-play-area">
        <main className="vote-arena">
          <header className="vote-round-status">
            <div className="vote-timer-card">
              <p className="vote-panel-kicker">Round timer</p>
              <strong className="vote-timer-value">{formatTime(timeLeft)}</strong>
            </div>
            <div>
              <p className="vote-panel-kicker">Now playing</p>
              <strong>{nowPlaying ? nowPlaying.name : "Waiting for winner"}</strong>
              {nowPlaying && <span>{nowPlaying.artist}</span>}
            </div>
          </header>

          <div
            className={`vote-box-game${entries.length ? " vote-box-game--stacked" : ""}`}
            style={{ minHeight: stackHeight }}
          >
            {entries.map((entry) => {
              const stackIndex = rankedEntries.findIndex(
                (rankedEntry) => rankedEntry.entryId === entry.entryId
              );

              return (
                <VoteMovingBoxItem
                  entry={entry}
                  stackIndex={stackIndex}
                  onVote={handleVote}
                  key={entry.entryId}
                />
              );
            })}

            {!entries.length && (
              <div className="vote-empty-round">
                Add songs from the left window to start the next vote.
              </div>
            )}
          </div>
        </main>

        <CrabLane users={normalizedUsers} crabIcon={crabIcon} />
      </div>
    </section>
  );
}

export default VoteMovingBox;
