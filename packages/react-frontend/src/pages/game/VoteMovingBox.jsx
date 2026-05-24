import React, { useEffect, useMemo, useReducer, useState } from "react";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import {
  getSongArtist,
  getSongId,
  getSongTitle,
  readAccountPlaylist,
} from "../Playlist/playlistStorage";
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
  const sourceSongs = Array.isArray(songs) ? songs : [];

  return sourceSongs.map((song, index) => ({
    id: getSongId(song) || `${getSongTitle(song)}-${index}`,
    name: getSongTitle(song),
    artist: getSongArtist(song) || "Unknown artist",
    source: song.source || "My Playlist",
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

function finishRound(entries) {
  if (!entries.length) {
    return { entries, nowPlaying: null };
  }

  const winningEntry = entries.reduce((leader, entry) =>
    entry.score > leader.score ? entry : leader
  );

  return {
    entries: [],
    nowPlaying: {
      ...winningEntry.song,
      score: winningEntry.score,
    },
  };
}

function gameReducer(state, action) {
  switch (action.type) {
    case "tick": {
      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }

      const nextRound = finishRound(state.entries);

      return {
        ...state,
        entries: nextRound.entries,
        nowPlaying: nextRound.nowPlaying || state.nowPlaying,
        timeLeft: ROUND_SECONDS,
      };
    }
    case "addSong":
      return {
        ...state,
        entries: [...state.entries, createEntry(action.song)],
      };
    case "vote":
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.entryId === action.entryId
            ? { ...entry, score: clamp(entry.score + action.amount, MIN_SCORE, MAX_SCORE) }
            : entry
        ),
      };
    default:
      return state;
  }
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
  const [searchTerm, setSearchTerm] = useState("");
  const filteredSongs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return songs;
    }

    return songs.filter((song) => song.name.toLowerCase().includes(normalizedSearch));
  }, [songs, searchTerm]);

  return (
    <aside className="vote-song-picker" aria-label="Choose songs">
      <div className="vote-panel-heading">
        <p className="vote-panel-kicker">Song window</p>
        <h2>Add songs</h2>
      </div>

      {songs.length ? (
        <>
          <input
            className="vote-song-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search songs"
            aria-label="Search songs by title"
          />

          {filteredSongs.length ? (
            <div className="vote-song-list">
              {filteredSongs.map((song) => (
                <button
                  className="vote-song-option"
                  type="button"
                  onClick={() => onAddSong(song)}
                  key={song.id}
                >
                  <span>{song.name}</span>
                  <small>
                    {song.artist} / {song.source}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="vote-song-empty">No matching songs</p>
          )}
        </>
      ) : (
        <p className="vote-song-empty">No songs available</p>
      )}
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
          <div className="vote-player-card">
            <span>{user.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VoteMovingBox({ users, username }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const songs = useMemo(() => normalizeSongs(readAccountPlaylist(username)), [username]);
  const [{ entries, timeLeft, nowPlaying }, dispatch] = useReducer(gameReducer, {
    entries: [],
    timeLeft: ROUND_SECONDS,
    nowPlaying: null,
  });
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

  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const handleAddSong = (song) => {
    dispatch({ type: "addSong", song });
  };

  const handleVote = (entryId, amount) => {
    dispatch({ type: "vote", entryId, amount });
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
