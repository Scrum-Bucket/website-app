import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import CrownIcon from "../../assets/hats/crown.png";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";
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

const API = frontendLink;
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

function makeLocalEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getQueueEntryScore(entry) {
  return Number.isFinite(entry?.score) ? entry.score : entry?.upvotes || 0;
}

function normalizeQueueEntries(queue) {
  const sourceQueue = Array.isArray(queue) ? queue : [];

  return sourceQueue.map((entry, index) => {
    const songId = entry.songId || entry.id || `${entry.name || "song"}-${index}`;

    return {
      entryId: entry.entryId || songId,
      song: {
        id: songId,
        name: entry.name || entry.title || "Untitled song",
        artist: entry.artist || "Unknown artist",
        source: entry.source || "Room queue",
      },
      score: getQueueEntryScore(entry),
      addedBy: entry.addedBy || null,
    };
  });
}

function normalizeCurrentSong(song) {
  if (!song) {
    return null;
  }

  if (typeof song === "string") {
    return { name: song, artist: "" };
  }

  return {
    name: song.name || song.title || "Untitled song",
    artist: song.artist || "",
    score: getQueueEntryScore(song),
  };
}

function getRoomTimeLeft(room, now) {
  const roundSeconds = room?.roundSeconds || ROUND_SECONDS;

  if (room?.timerPaused) {
    return clamp(room.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (room?.roundEndsAt) {
    return clamp(Math.ceil((new Date(room.roundEndsAt).getTime() - now) / 1000), 0, roundSeconds);
  }

  return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
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

function VoteMovingBox({ hostName, onRoomUpdate, room, roomCode, users, username }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const songs = useMemo(() => normalizeSongs(readAccountPlaylist(username)), [username]);
  const [localRoom, setLocalRoom] = useState(room);
  const [now, setNow] = useState(Date.now());
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);
  const currentUserName = username || "guest";
  const isCurrentUserHost = hostName === currentUserName;
  const activeRoom = roomCode ? room : localRoom;
  const entries = useMemo(() => normalizeQueueEntries(activeRoom?.queue), [activeRoom?.queue]);
  const timeLeft = getRoomTimeLeft(activeRoom, now);
  const isTimerPaused = Boolean(activeRoom?.timerPaused);
  const nowPlaying = normalizeCurrentSong(activeRoom?.currentSong);
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
    setLocalRoom(room);
  }, [room]);

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
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const applyRoomUpdate = (nextRoom) => {
    if (!nextRoom) return;

    if (!roomCode) {
      setLocalRoom(nextRoom);
    }

    onRoomUpdate?.(nextRoom);
  };

  const updateRoomFromResponse = async (response) => {
    if (response.ok) {
      applyRoomUpdate(await response.json());
    }
  };

  const updateLocalRoom = (updater) => {
    const nextRoom = updater(activeRoom || {});
    applyRoomUpdate(nextRoom);
  };

  const handleAddSong = async (song) => {
    if (roomCode) {
      await updateRoomFromResponse(
        await authFetch(`${API}/rooms/${roomCode}/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: song.id,
            name: song.name,
            artist: song.artist,
            addedBy: currentUserName,
          }),
        })
      );
      return;
    }

    updateLocalRoom((currentRoom) => ({
      ...currentRoom,
      queue: [
        ...(currentRoom.queue || []),
        {
          entryId: makeLocalEntryId(),
          songId: song.id,
          name: song.name,
          artist: song.artist,
          score: 0,
          upvotes: 0,
          addedBy: currentUserName,
        },
      ],
    }));
  };

  const handleVote = async (entryId, amount) => {
    if (roomCode) {
      await updateRoomFromResponse(
        await authFetch(`${API}/rooms/${roomCode}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId, amount }),
        })
      );
      return;
    }

    updateLocalRoom((currentRoom) => ({
      ...currentRoom,
      queue: (currentRoom.queue || []).map((entry) =>
        (entry.entryId || entry.songId) === entryId
          ? {
              ...entry,
              score: clamp(getQueueEntryScore(entry) + amount, MIN_SCORE, MAX_SCORE),
              upvotes: clamp(getQueueEntryScore(entry) + amount, MIN_SCORE, MAX_SCORE),
            }
          : entry
      ),
    }));
  };

  const handleDeleteSong = async (entryId) => {
    const entry = entries.find((candidate) => candidate.entryId === entryId);

    if (!isCurrentUserHost && entry?.addedBy !== currentUserName) {
      return;
    }

    if (roomCode) {
      await updateRoomFromResponse(
        await authFetch(`${API}/rooms/${roomCode}/queue/${encodeURIComponent(entryId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userName: currentUserName }),
        })
      );
      return;
    }

    updateLocalRoom((currentRoom) => ({
      ...currentRoom,
      queue: (currentRoom.queue || []).filter((queuedSong) => {
        const queuedEntryId = queuedSong.entryId || queuedSong.songId;
        return queuedEntryId !== entryId;
      }),
    }));
  };

  const handleTimerToggle = async () => {
    if (!isCurrentUserHost) {
      return;
    }

    const paused = !isTimerPaused;

    if (roomCode) {
      await updateRoomFromResponse(
        await authFetch(`${API}/rooms/${roomCode}/timer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paused, userName: currentUserName }),
        })
      );
      return;
    }

    updateLocalRoom((currentRoom) => ({
      ...currentRoom,
      timerPaused: paused,
      timerRemainingSeconds: paused ? timeLeft : currentRoom.timerRemainingSeconds || timeLeft,
      roundEndsAt: paused
        ? null
        : new Date(Date.now() + (currentRoom.timerRemainingSeconds || timeLeft) * 1000).toISOString(),
    }));
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
                  onClick={handleTimerToggle}
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
