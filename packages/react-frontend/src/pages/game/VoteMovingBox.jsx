import React, { useEffect, useMemo, useReducer, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import CrownIcon from "../../assets/hats/crown.png";
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
const VOTE_ARENA_MIN_HEIGHT = 500;
const VOTE_ARENA_MAX_HEIGHT = 745;
const VOTE_ARENA_CHROME_HEIGHT = 132;

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

function createEntry(song, addedBy) {
  return {
    entryId: `${song.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    song,
    score: 0,
    addedBy,
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
        entries: [...state.entries, createEntry(action.song, action.addedBy)],
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
    case "deleteSong":
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.entryId !== action.entryId),
      };
    default:
      return state;
  }
}

function VoteMovingBoxItem({ canDelete, entry, onDelete, onVote, stackIndex }) {
  const { song, score } = entry;

  return (
    <article
      className="vote-box-row"
      style={{ transform: `translateY(${stackIndex * (STACK_CARD_HEIGHT + STACK_CARD_GAP)}px)` }}
    >
      <div className="vote-box-bar" aria-label={`${song.name} score ${score}`}>
        <span className="vote-box-score">{score}</span>
        <div className="vote-box-track">
          <span className="vote-box-track-title">{song.name}</span>
          <span className="vote-box-track-artist">{song.artist}</span>
        </div>
        <div className="vote-box-actions">
          <button
            type="button"
            className="vote-box-button vote-box-button--up"
            onClick={() => onVote(entry.entryId, 1)}
            aria-label={`Upvote ${song.name}`}
          >
            Up
          </button>
          <button
            type="button"
            className="vote-box-button vote-box-button--down"
            onClick={() => onVote(entry.entryId, -1)}
            aria-label={`Downvote ${song.name}`}
          >
            Down
          </button>
          {canDelete && (
            <button
              type="button"
              className="vote-box-button vote-box-button--delete"
              onClick={() => onDelete(entry.entryId)}
              aria-label={`Delete ${song.name}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SongPicker({ songs, onAddSong }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const filteredSongs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return songs;
    }

    return songs.filter((song) => song.name.toLowerCase().includes(normalizedSearch));
  }, [songs, searchTerm]);
  const handleOpenPlaylist = () => {
    navigate("/home/playlist", {
      state: {
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  return (
    <aside className="vote-song-picker" aria-label="Choose songs">
      <div className="vote-panel-heading">
        <p className="vote-panel-kicker">Song window</p>
        <button className="vote-add-songs-link" type="button" onClick={handleOpenPlaylist}>
          Add songs
        </button>
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

function CrabLane({ crabIcon, hostName, users }) {
  return (
    <div className="vote-crab-lane" aria-label="Players">
      {users.map((user, index) => {
        const isHost = user.id === hostName || user.name === hostName;

        return (
          <div
            className="vote-player-crab"
            style={{ animationDelay: `${index * 0.18}s` }}
            key={user.id}
          >
            <img src={crabIcon} alt="" aria-hidden="true" />
            <div
              className={`vote-player-card${isHost ? " vote-player-card--host" : ""}`}
              aria-label={isHost ? `${user.name}, host` : user.name}
            >
              {isHost && (
                <img
                  className="vote-host-crown"
                  src={CrownIcon}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span>{user.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VoteMovingBox({ hostName, users, username }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const songs = useMemo(() => normalizeSongs(readAccountPlaylist(username)), [username]);
  const [{ entries, timeLeft, nowPlaying }, dispatch] = useReducer(gameReducer, {
    entries: [],
    timeLeft: ROUND_SECONDS,
    nowPlaying: null,
  });
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const currentUserName = username || "guest";
  const isCurrentUserHost = hostName === currentUserName;
  const rankedEntries = useMemo(
    () => [...entries].sort((a, b) => b.score - a.score),
    [entries]
  );
  const stackHeight = entries.length
    ? entries.length * STACK_CARD_HEIGHT + (entries.length - 1) * STACK_CARD_GAP
    : 260;
  const voteArenaHeight = clamp(
    stackHeight + VOTE_ARENA_CHROME_HEIGHT,
    VOTE_ARENA_MIN_HEIGHT,
    VOTE_ARENA_MAX_HEIGHT
  );

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
    if (isTimerPaused) {
      return undefined;
    }

    const timerId = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isTimerPaused]);

  const handleAddSong = (song) => {
    dispatch({ type: "addSong", song, addedBy: currentUserName });
  };

  const handleVote = (entryId, amount) => {
    dispatch({ type: "vote", entryId, amount });
  };

  const handleDeleteSong = (entryId) => {
    const entry = entries.find((candidate) => candidate.entryId === entryId);

    if (isCurrentUserHost || entry?.addedBy === currentUserName) {
      dispatch({ type: "deleteSong", entryId });
    }
  };

  return (
    <section className="vote-game-shell" aria-label="Vote moving box game">
      <SongPicker songs={songs} onAddSong={handleAddSong} />

      <div className="vote-play-area">
        <main
          className="vote-arena"
          style={{ "--vote-arena-height": `${voteArenaHeight}px` }}
        >
          <header className="vote-round-status">
            <div className="vote-timer-card">
              <p className="vote-panel-kicker">Round timer</p>
              <strong className="vote-timer-value">{formatTime(timeLeft)}</strong>
              {isCurrentUserHost && (
                <button
                  className="vote-timer-toggle"
                  type="button"
                  onClick={() => setIsTimerPaused((isPaused) => !isPaused)}
                >
                  {isTimerPaused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
            <div>
              <p className="vote-panel-kicker">Now playing</p>
              <strong>{nowPlaying ? nowPlaying.name : "Waiting for winner"}</strong>
              {nowPlaying && <span>{nowPlaying.artist}</span>}
            </div>
          </header>

          <div
            className={`vote-box-game${entries.length ? " vote-box-game--stacked" : ""}`}
          >
            <div className="vote-box-scroll-area" style={{ minHeight: stackHeight }}>
              {entries.map((entry) => {
                const stackIndex = rankedEntries.findIndex(
                  (rankedEntry) => rankedEntry.entryId === entry.entryId
                );

                return (
                  <VoteMovingBoxItem
                    canDelete={isCurrentUserHost || entry.addedBy === currentUserName}
                    entry={entry}
                    onDelete={handleDeleteSong}
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
          </div>
        </main>

        <CrabLane users={normalizedUsers} crabIcon={crabIcon} hostName={hostName} />
      </div>
    </section>
  );
}

export default VoteMovingBox;
