import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import CrownIcon from "../../assets/hats/crown.png";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";
import {
  getSongArtist,
  getSongId,
  getSongLink,
  getSongVideoId,
  getSongTitle,
  readAccountPlaylist,
} from "../Playlist/playlistStorage";
import {
  createCrabIcon,
  getHatSourceForCrab,
  normalizeCrabProfile,
  readStoredCrabProfile,
} from "../profile/crabColor";

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
const VOTE_PLAYBACK_ARENA_HEIGHT = 640;

let youtubeApiPromise;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve(window.YT);
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

function getPlayableVideoId(song) {
  return getSongVideoId(song) || getSongVideoId({ songLink: song?.songLink });
}

function normalizeUsers(users, currentUserName) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const name =
      typeof user === "string" ? user : user.name || user.userName || `User ${index + 1}`;
    const savedCrab =
      typeof user === "object" && user?.crab
        ? user.crab
        : name === currentUserName
          ? readStoredCrabProfile()
          : {};

    return {
      id: user.id || user.userId || name,
      name,
      crab: normalizeCrabProfile(savedCrab),
    };
  });
}

function normalizeSongs(songs) {
  const sourceSongs = Array.isArray(songs) ? songs : [];

  return sourceSongs.map((song, index) => ({
    id: getSongId(song) || `${getSongTitle(song)}-${index}`,
    name: getSongTitle(song),
    artist: getSongArtist(song) || "Unknown artist",
    songLink: getSongLink(song),
    videoId: getSongVideoId(song),
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
        songLink: entry.songLink || "",
        videoId: entry.videoId || "",
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
    entryId: song.entryId || "",
    songId: song.songId || song.id || "",
    name: song.name || song.title || "Untitled song",
    artist: song.artist || "",
    songLink: song.songLink || "",
    videoId: song.videoId || "",
    score: getQueueEntryScore(song),
  };
}

function getWinningQueueEntry(queue) {
  const entries = Array.isArray(queue) ? queue : [];
  if (!entries.length) return null;

  return entries.reduce((leader, entry) =>
    getQueueEntryScore(entry) > getQueueEntryScore(leader) ? entry : leader
  );
}

function makeCurrentSongFromQueueEntry(entry) {
  return {
    entryId: entry.entryId || entry.songId,
    songId: entry.songId,
    name: entry.name,
    artist: entry.artist,
    songLink: entry.songLink || "",
    videoId: entry.videoId || "",
    score: getQueueEntryScore(entry),
  };
}

function getRoomTimeLeft(room, now) {
  const roundSeconds = room?.roundSeconds || ROUND_SECONDS;

  if (room?.timerPaused) {
    return clamp(room.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (now == null) {
    return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
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

function YouTubeSongPlayer({ onEnded, song }) {
  const playerHostRef = useRef(null);
  const playerRef = useRef(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const videoId = getPlayableVideoId(song);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    endedRef.current = false;

    if (!videoId) {
      return undefined;
    }

    let isActive = true;

    loadYouTubeApi().then((YT) => {
      if (!isActive || !YT?.Player || !playerHostRef.current) {
        return;
      }

      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onStateChange(event) {
            if (event.data === YT.PlayerState.ENDED && !endedRef.current) {
              endedRef.current = true;
              onEndedRef.current?.();
            }
          },
        },
      });
    });

    return () => {
      isActive = false;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [song?.entryId, videoId]);

  if (!videoId) {
    return (
      <div className="vote-song-player-missing">
        <p>This winning song does not have a playable YouTube link saved.</p>
      </div>
    );
  }

  return <div className="vote-song-player-frame" ref={playerHostRef} />;
}

function CurrentSongPlayer({ canControl, onComplete, song }) {
  return (
    <section className="vote-current-song" aria-label="Current song">

      <YouTubeSongPlayer song={song} onEnded={canControl ? onComplete : undefined} />

      {canControl && (
        <button className="vote-finish-song-btn" type="button" onClick={onComplete}>
          Restart voting
        </button>
      )}
    </section>
  );
}

function SongPicker({ isGuest, onAddSong, onLoginRequired, songs }) {
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
    if (isGuest) {
      onLoginRequired?.();
      return;
    }

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

function CrabLane({ hostName, users }) {
  const [crabIcons, setCrabIcons] = useState({});

  useEffect(() => {
    let isActive = true;

    Promise.all(
      users.map(async (user) => {
        const hatSource = getHatSourceForCrab(user.crab, hatImages);
        const crabIcon = await createCrabIcon(UserCrabIcon, user.crab.color, hatSource);

        return [user.id, crabIcon];
      })
    ).then((nextCrabIcons) => {
      if (isActive) {
        setCrabIcons(Object.fromEntries(nextCrabIcons));
      }
    });

    return () => {
      isActive = false;
    };
  }, [users]);

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
            <img src={crabIcons[user.id] || UserCrabIcon} alt="" aria-hidden="true" />
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

function VoteMovingBox({ hostName, onLoginRequired, onRoomUpdate, room, roomCode, users, username }) {
  const currentUserName = username || "guest";
  const normalizedUsers = useMemo(
    () => normalizeUsers(users, currentUserName),
    [users, currentUserName]
  );
  const songs = useMemo(() => normalizeSongs(readAccountPlaylist(username)), [username]);
  const [localRoom, setLocalRoom] = useState(room);
  const [now, setNow] = useState(null);
  const completedPlaybackRef = useRef(null);
  const isCurrentUserHost = hostName === currentUserName;
  const isGuest = username === "Guest";
  const activeRoom = roomCode ? room : localRoom;
  const entries = useMemo(() => normalizeQueueEntries(activeRoom?.queue), [activeRoom?.queue]);
  const timeLeft = getRoomTimeLeft(activeRoom, now);
  const isTimerPaused = Boolean(activeRoom?.timerPaused);
  const nowPlaying = normalizeCurrentSong(activeRoom?.currentSong);
  const nowPlayingKey = nowPlaying?.entryId || nowPlaying?.songId || nowPlaying?.name || "";
  const rankedEntries = useMemo(
    () => [...entries].sort((a, b) => b.score - a.score),
    [entries]
  );
  const stackHeight = entries.length
    ? entries.length * STACK_CARD_HEIGHT + (entries.length - 1) * STACK_CARD_GAP
    : 260;
  const voteArenaHeight = clamp(
    nowPlaying ? VOTE_PLAYBACK_ARENA_HEIGHT : stackHeight + VOTE_ARENA_CHROME_HEIGHT,
    VOTE_ARENA_MIN_HEIGHT,
    VOTE_ARENA_MAX_HEIGHT
  );

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };
    updateNow();

    const timerId = setInterval(updateNow, 1000);

    return () => clearInterval(timerId);
  }, []);

  const applyRoomUpdate = useCallback(
    (nextRoom) => {
      if (!nextRoom) return;

      if (!roomCode) {
        setLocalRoom(nextRoom);
      }

      onRoomUpdate?.(nextRoom);
    },
    [onRoomUpdate, roomCode]
  );

  const updateRoomFromResponse = async (response) => {
    if (response.ok) {
      applyRoomUpdate(await response.json());
    }
  };

  const updateLocalRoom = useCallback(
    (updater) => {
      const nextRoom = updater(activeRoom || {});
      applyRoomUpdate(nextRoom);
    },
    [activeRoom, applyRoomUpdate]
  );

  useEffect(() => {
    completedPlaybackRef.current = null;
  }, [nowPlayingKey]);

  useEffect(() => {
    if (
      roomCode ||
      !activeRoom?.started ||
      activeRoom.currentSong ||
      activeRoom.timerPaused ||
      now == null ||
      timeLeft > 0
    ) {
      return;
    }

    const winningEntry = getWinningQueueEntry(activeRoom.queue);

    const updateTimerId = setTimeout(() => {
      updateLocalRoom((currentRoom) => {
        if (winningEntry) {
          return {
            ...currentRoom,
            currentSong: makeCurrentSongFromQueueEntry(winningEntry),
            queue: [],
            timerPaused: true,
            timerRemainingSeconds: currentRoom.roundSeconds || ROUND_SECONDS,
            roundEndsAt: null,
          };
        }

        return {
          ...currentRoom,
          timerRemainingSeconds: currentRoom.roundSeconds || ROUND_SECONDS,
          roundEndsAt: new Date(
            Date.now() + (currentRoom.roundSeconds || ROUND_SECONDS) * 1000
          ).toISOString(),
        };
      });
    }, 0);

    return () => clearTimeout(updateTimerId);
  }, [activeRoom, now, roomCode, timeLeft, updateLocalRoom]);

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
            songLink: song.songLink,
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
          songLink: song.songLink,
          videoId: song.videoId,
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
    if (!isCurrentUserHost || nowPlaying) {
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

  const handleCurrentSongComplete = async () => {
    if (!nowPlaying) {
      return;
    }

    const completedKey = nowPlayingKey || "current-song";
    if (completedPlaybackRef.current === completedKey) {
      return;
    }
    completedPlaybackRef.current = completedKey;

    if (roomCode) {
      await updateRoomFromResponse(
        await authFetch(`${API}/rooms/${roomCode}/current-song/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: nowPlaying.entryId, userName: currentUserName }),
        })
      );
      return;
    }

    updateLocalRoom((currentRoom) => ({
      ...currentRoom,
      currentSong: null,
      timerPaused: false,
      timerRemainingSeconds: currentRoom.roundSeconds || ROUND_SECONDS,
      roundEndsAt: new Date(
        Date.now() + (currentRoom.roundSeconds || ROUND_SECONDS) * 1000
      ).toISOString(),
    }));
  };

  return (
    <section className="vote-game-shell" aria-label="Vote moving box game">
      <SongPicker
        isGuest={isGuest}
        onAddSong={handleAddSong}
        onLoginRequired={onLoginRequired}
        songs={songs}
      />

      <div className="vote-play-area">
        <main
          className="vote-arena"
          style={{ "--vote-arena-height": `${voteArenaHeight}px` }}
        >
          <header className="vote-round-status">
            <div className="vote-timer-card">
              <p className="vote-panel-kicker">{nowPlaying ? "Song timer" : "Round timer"}</p>
              <strong className="vote-timer-value">
                {nowPlaying ? "Playing" : formatTime(timeLeft)}
              </strong>
              {isCurrentUserHost && !nowPlaying && (
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
            className={`vote-box-game${entries.length && !nowPlaying ? " vote-box-game--stacked" : ""}`}
          >
            {nowPlaying ? (
              <CurrentSongPlayer
                canControl={isCurrentUserHost}
                onComplete={handleCurrentSongComplete}
                song={nowPlaying}
              />
            ) : (
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
            )}
          </div>
        </main>

        <CrabLane users={normalizedUsers} hostName={hostName} />
      </div>
    </section>
  );
}

export default VoteMovingBox;
