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

function VoteMovingBox({ users }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);

  const [scores, setScores] = useState(() =>
    Object.fromEntries(normalizedUsers.map((u) => [u.id, u.initialScore]))
  );
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  // Keep scores in sync when users list changes
  useEffect(() => {
<<<<<<<<< Temporary merge branch 1
    let isActive = true;
=========
    setScores((prev) =>
      Object.fromEntries(
        normalizedUsers.map((u) => [u.id, prev[u.id] ?? u.initialScore])
      )
    );
  }, [normalizedUsers]);

  // Load tinted crab icon from localStorage
  useEffect(() => {
    let active = true;
>>>>>>>>> Temporary merge branch 2
    const savedColor = localStorage.getItem("profileCrabColor") || "#e74c3c";
    const savedHat = localStorage.getItem("profileCrabHat") || "";
    const hatSource = savedHat ? hatImages[`../../assets/hats/${savedHat}`] || "" : "";

    createCrabIcon(UserCrabIcon, savedColor, hatSource).then((icon) => {
      if (active) setCrabIcon(icon);
    });

    return () => {
      active = false;
    };
  }, []);

  function handleVote(userId, amount) {
    setScores((prev) => ({
      ...prev,
      [userId]: clamp((prev[userId] ?? 0) + amount, MIN_SCORE, MAX_SCORE),
    }));
  }

  // Sort users by score descending to get rank order (highest = top = index 0)
  const ranked = useMemo(() => {
    return [...normalizedUsers].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
    );
  }, [normalizedUsers, scores]);

  // Total container height so the parent can size itself
  const containerHeight =
    normalizedUsers.length * CARD_HEIGHT + (normalizedUsers.length - 1) * CARD_GAP;

  return (
    <section className="vote-current-song" aria-label="Current song">
      <YouTubeSongPlayer song={song} onEnded={canControl ? onComplete : undefined} />
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
                  ▲
                </button>
                <button
                  type="button"
                  className="vote-box-button vote-box-button--down"
                  onClick={() => handleVote(user.id, -1)}
                  aria-label={`Downvote ${user.name}`}
                >
                  ▼
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
                shouldPlayAudio={shouldPlayAudio}
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
