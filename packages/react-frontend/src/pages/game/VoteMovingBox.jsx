import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./VoteMovingBox.css";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";
import { readAccountPlaylist } from "../Playlist/playlistStorage";
import CrabLane from "./components/CrabLane";
import CurrentSongPlayer from "./components/CurrentSongPlayer";
import SongPicker from "./components/SongPicker";
import VoteMovingBoxItem from "./components/VoteMovingBoxItem";
import {
  MAX_SCORE,
  MIN_SCORE,
  ROUND_SECONDS,
  STACK_CARD_GAP,
  STACK_CARD_HEIGHT,
  VOTE_ARENA_CHROME_HEIGHT,
  VOTE_ARENA_MAX_HEIGHT,
  VOTE_ARENA_MIN_HEIGHT,
  VOTE_PLAYBACK_ARENA_HEIGHT,
} from "./config/constants";
import {
  clamp,
  formatTime,
  getNextQueueColorIndex,
  getQueueAfterWinnerStarts,
  getQueueEntryScore,
  getRoomTimeLeft,
  getWinningQueueEntry,
  isSameQueueEntry,
  makeCurrentSongFromQueueEntry,
  makeLocalEntryId,
  normalizeCurrentSong,
  normalizeQueueEntries,
  normalizeSongs,
  normalizeUsers,
} from "./utils/gameUtils";
import { createRoomActionExecutor } from "./utils/roomActionTemplate";
import { roomMemberHeaders } from "../Room/roomMemberSession";

const API = frontendLink;

function VoteMovingBox({
  accountUsername,
  hostName,
  isGuest = false,
  onLoginRequired,
  onRoomUpdate,
  playOnAllDevices = true,
  room,
  roomCode,
  users,
  username,
}) {
  const currentUserName = username || "guest";
  const normalizedUsers = useMemo(
    () => normalizeUsers(users, currentUserName),
    [users, currentUserName]
  );
  const songs = useMemo(
    () => normalizeSongs(readAccountPlaylist(accountUsername || username)),
    [accountUsername, username]
  );
  const [localRoom, setLocalRoom] = useState(room);
  const [now, setNow] = useState(null);
  const completedPlaybackRef = useRef(null);
  const isCurrentUserHost = hostName === currentUserName;
  const shouldPlayAudio = playOnAllDevices || isCurrentUserHost;
  const activeRoom = roomCode ? room : localRoom;
  const activeRoomOptions = useMemo(() => activeRoom?.options || {}, [activeRoom?.options]);
  const entries = useMemo(() => normalizeQueueEntries(activeRoom?.queue), [activeRoom?.queue]);
  const timeLeft = getRoomTimeLeft(activeRoom, now);
  const isTimerPaused = Boolean(activeRoom?.timerPaused);
  const nowPlaying = normalizeCurrentSong(activeRoom?.currentSong);
  const nowPlayingKey = nowPlaying?.entryId || nowPlaying?.songId || nowPlaying?.name || "";
  const willContinueQueuePlayback =
    activeRoomOptions.continuousPlaylistMode === "playQueue" && entries.length > 0;
  const isVotingPaused =
    Boolean(activeRoomOptions.pauseVotingWhenTimerPaused) && isTimerPaused && !nowPlaying;
  const rankedEntries = useMemo(() => [...entries].sort((a, b) => b.score - a.score), [entries]);
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

  const updateRoomFromResponse = useCallback(async (response) => {
    if (response.ok) {
      applyRoomUpdate(await response.json());
    }
  }, [applyRoomUpdate]);

  const updateLocalRoom = useCallback(
    (updater) => {
      const nextRoom = updater(activeRoom || {});
      applyRoomUpdate(nextRoom);
    },
    [activeRoom, applyRoomUpdate]
  );
  const executeRoomAction = useMemo(
    () =>
      createRoomActionExecutor({
        getRoomCode: () => roomCode,
        updateRoomFromResponse,
      }),
    [roomCode, updateRoomFromResponse]
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
            queue: getQueueAfterWinnerStarts(
              currentRoom.queue,
              winningEntry,
              currentRoom.options || activeRoomOptions
            ),
            timerPaused: true,
            timerRemainingSeconds: currentRoom.roundSeconds ?? ROUND_SECONDS,
            roundEndsAt: null,
          };
        }

        return {
          ...currentRoom,
          timerRemainingSeconds: currentRoom.roundSeconds ?? ROUND_SECONDS,
          roundEndsAt: new Date(
            Date.now() + (currentRoom.roundSeconds ?? ROUND_SECONDS) * 1000
          ).toISOString(),
        };
      });
    }, 0);

    return () => clearTimeout(updateTimerId);
  }, [activeRoom, activeRoomOptions, now, roomCode, timeLeft, updateLocalRoom]);

  const handleAddSong = async (song) => {
    await executeRoomAction({
      remoteAction: (activeRoomCode) =>
        authFetch(`${API}/rooms/${activeRoomCode}/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...roomMemberHeaders(activeRoomCode) },
          body: JSON.stringify({
            songId: song.id,
            name: song.name,
            artist: song.artist,
            songLink: song.songLink,
            videoId: song.videoId,
            addedBy: currentUserName,
          }),
        }),
      localAction: () =>
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
              colorIndex: getNextQueueColorIndex(currentRoom.queue || []),
              addedBy: currentUserName,
            },
          ],
        })),
    });
  };

  const handleVote = async (entryId, amount) => {
    if (isVotingPaused) {
      return;
    }

    await executeRoomAction({
      remoteAction: (activeRoomCode) =>
        authFetch(`${API}/rooms/${activeRoomCode}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...roomMemberHeaders(activeRoomCode) },
          body: JSON.stringify({ entryId, amount }),
        }),
      localAction: () =>
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
        })),
    });
  };

  const handleDeleteSong = async (entryId) => {
    const entry = entries.find((candidate) => candidate.entryId === entryId);

    if (!isCurrentUserHost && entry?.addedBy !== currentUserName) {
      return;
    }

    await executeRoomAction({
      remoteAction: (activeRoomCode) =>
        authFetch(`${API}/rooms/${activeRoomCode}/queue/${encodeURIComponent(entryId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...roomMemberHeaders(activeRoomCode) },
        }),
      localAction: () =>
        updateLocalRoom((currentRoom) => ({
          ...currentRoom,
          queue: (currentRoom.queue || []).filter((queuedSong) => {
            const queuedEntryId = queuedSong.entryId || queuedSong.songId;
            return queuedEntryId !== entryId;
          }),
        })),
    });
  };

  const handleTimerToggle = async () => {
    if (!isCurrentUserHost || nowPlaying) {
      return;
    }

    const paused = !isTimerPaused;

    await executeRoomAction({
      remoteAction: (activeRoomCode) =>
        authFetch(`${API}/rooms/${activeRoomCode}/timer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...roomMemberHeaders(activeRoomCode) },
          body: JSON.stringify({ paused }),
        }),
      localAction: () =>
        updateLocalRoom((currentRoom) => ({
          ...currentRoom,
          timerPaused: paused,
          timerRemainingSeconds: paused ? timeLeft : currentRoom.timerRemainingSeconds || timeLeft,
          roundEndsAt: paused
            ? null
            : new Date(
                Date.now() + (currentRoom.timerRemainingSeconds || timeLeft) * 1000
              ).toISOString(),
        })),
    });
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

    await executeRoomAction({
      remoteAction: (activeRoomCode) =>
        authFetch(`${API}/rooms/${activeRoomCode}/current-song/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...roomMemberHeaders(activeRoomCode) },
          body: JSON.stringify({ entryId: nowPlaying.entryId }),
        }),
      localAction: () =>
        updateLocalRoom((currentRoom) => ({
          ...currentRoom,
          timerRemainingSeconds: currentRoom.roundSeconds ?? ROUND_SECONDS,
          ...(() => {
            if ((currentRoom.options || activeRoomOptions).continuousPlaylistMode !== "playQueue") {
              return {
                currentSong: null,
                timerPaused: false,
                roundEndsAt: new Date(
                  Date.now() + (currentRoom.roundSeconds ?? ROUND_SECONDS) * 1000
                ).toISOString(),
              };
            }

            const nextEntry = getWinningQueueEntry(currentRoom.queue);

            if (!nextEntry) {
              return {
                currentSong: null,
                timerPaused: false,
                roundEndsAt: new Date(
                  Date.now() + (currentRoom.roundSeconds ?? ROUND_SECONDS) * 1000
                ).toISOString(),
              };
            }

            return {
              currentSong: makeCurrentSongFromQueueEntry(nextEntry),
              queue: (currentRoom.queue || []).filter(
                (entry) => !isSameQueueEntry(entry, nextEntry)
              ),
              timerPaused: true,
              roundEndsAt: null,
            };
          })(),
        })),
    });
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
        <main className="vote-arena" style={{ "--vote-arena-height": `${voteArenaHeight}px` }}>
          <header className="vote-round-status">
            <div className="vote-timer-card">
              <p className="vote-panel-kicker">{nowPlaying ? "Song timer" : "Round timer"}</p>
              {nowPlaying && isCurrentUserHost ? (
                <button
                  className="vote-finish-song-btn"
                  type="button"
                  onClick={handleCurrentSongComplete}
                >
                  {willContinueQueuePlayback ? "Next song" : "Restart voting"}
                </button>
              ) : (
                <strong className="vote-timer-value">
                  {nowPlaying ? "Playing" : formatTime(timeLeft)}
                </strong>
              )}
              {isCurrentUserHost && !nowPlaying && (
                <button className="vote-timer-toggle" type="button" onClick={handleTimerToggle}>
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
                      isVotingPaused={isVotingPaused}
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
