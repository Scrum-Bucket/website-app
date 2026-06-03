import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./room.css";
import GameBackground from "../../../animationFiles/game-background.jsx";
import { authFetch } from "../../authFetch";
import { HEARTBEAT_MS, getSessionUser, sendUserHeartbeat } from "../../authSession";
import LoginRequiredModal from "../../app/LoginRequiredModal";
import frontendLink from "../../frontendLink";
import VoteMovingBox from "../game/VoteMovingBox";
import { readStoredCrabProfile } from "../profile/crabColor";
import {
  clearRoomMemberSession,
  getRoomMemberName,
  roomMemberHeaders,
  sendRoomMemberHeartbeat,
} from "./roomMemberSession";

const API = frontendLink;
const ACTIVE_POLL_MS = 1500;
const BACKGROUND_POLL_MS = 10000;
const LOBBY_POLL_MS = 5000;
const PLAYBACK_POLL_MS = 3000;
const DEFAULT_ROOM_OPTIONS = {
  roundSeconds: 120,
  continuousPlaylistMode: "removeSongs",
  removeSelectedSong: false,
  playOnAllDevices: true,
  pauseVotingWhenTimerPaused: false,
};
const ROOM_CLOSED_NOTICE = "The room was closed because the host left or lost connection.";
const ROOM_CONNECTION_NOTICE = "You were sent home because the room connection was interrupted.";
const ROOM_REMOVED_NOTICE = "You were removed from the room because this tab stopped responding.";

function getMemberName(member, index) {
  if (typeof member === "string") {
    return member;
  }

  return member?.name || member?.userName || member?.id || `Player ${index + 1}`;
}

function roomHasMember(room, memberName) {
  const members = room?.memberProfiles?.length ? room.memberProfiles : room?.members || [];

  return members.some((member, index) => getMemberName(member, index) === memberName);
}

function getRoomMemberProfiles(room, username, userId) {
  const sourceMembers = room?.memberProfiles?.length ? room.memberProfiles : room?.members || [];
  const currentUserName = username || "guest";

  return sourceMembers.map((member, index) => {
    const name = getMemberName(member, index);

    return {
      id: typeof member === "string" ? member : member.id || member.userId || name,
      name,
      crab: member.crab || (name === currentUserName ? readStoredCrabProfile(userId) : undefined),
    };
  });
}

function getRoomPollDelay(room) {
  if (typeof document !== "undefined" && document.hidden) {
    return BACKGROUND_POLL_MS;
  }

  if (!room?.started) {
    return LOBBY_POLL_MS;
  }

  if (room.currentSong) {
    return PLAYBACK_POLL_MS;
  }

  return ACTIVE_POLL_MS;
}

function Room({ username }) {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const roomMemberName = getRoomMemberName(roomCode, username || "guest");

  const [room, setRoom] = useState(location.state?.room || null);
  const [localGameStarted, setLocalGameStarted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const roomPollDelay = getRoomPollDelay(room);

  const goHomeWithNotice = useCallback(
    (roomNotice) => {
      if (roomCode) {
        clearRoomMemberSession(roomCode);
      }

      navigate("/home", {
        replace: true,
        state: { roomNotice },
      });
    },
    [navigate, roomCode]
  );

  const fetchRoom = useCallback(async () => {
    if (!roomCode) {
      setRoom({
        roomCode: "TEST",
        host: roomMemberName,
        members: [roomMemberName],
        queue: [],
        started: false,
      });
      return;
    }

    try {
      const res = await authFetch(`${API}/rooms/${roomCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          goHomeWithNotice(ROOM_CLOSED_NOTICE);
          return;
        }

        goHomeWithNotice(ROOM_CONNECTION_NOTICE);
        return;
      }

      const data = await res.json();
      if (!roomHasMember(data, roomMemberName)) {
        goHomeWithNotice(data.closed ? ROOM_CLOSED_NOTICE : ROOM_REMOVED_NOTICE);
        return;
      }

      setRoom(data);
    } catch {
      goHomeWithNotice(ROOM_CONNECTION_NOTICE);
    }
  }, [goHomeWithNotice, roomCode, roomMemberName]);

  useEffect(() => {
    let active = true;
    let pollId;

    async function pollRoom() {
      await fetchRoom();

      if (active) {
        pollId = setTimeout(pollRoom, roomPollDelay);
      }
    }

    pollId = setTimeout(pollRoom, 0);

    return () => {
      active = false;
      clearTimeout(pollId);
    };
  }, [fetchRoom, roomPollDelay]);

  useEffect(() => {
    if (!roomCode) {
      return undefined;
    }

    let active = true;

    async function heartbeatRoomMembership() {
      try {
        if (username === "Guest") {
          await sendRoomMemberHeartbeat(roomCode);
        } else {
          await sendUserHeartbeat({ roomCode, roomMemberName });
        }
      } catch {
        if (active) {
          goHomeWithNotice(ROOM_CONNECTION_NOTICE);
        }
      }
    }

    heartbeatRoomMembership();
    const heartbeatId = setInterval(heartbeatRoomMembership, HEARTBEAT_MS);

    return () => {
      active = false;
      clearInterval(heartbeatId);
    };
  }, [goHomeWithNotice, roomCode, roomMemberName, username]);

  async function handleStart() {
    setLocalGameStarted(true);

    if (!roomCode) {
      setRoom((currentRoom) => ({
        ...currentRoom,
        started: true,
        roundSeconds: 120,
        roundEndsAt: new Date(Date.now() + 120000).toISOString(),
        timerPaused: false,
        timerRemainingSeconds: 120,
      }));
      return;
    }

    try {
      const res = await authFetch(`${API}/rooms/${roomCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...roomMemberHeaders(roomCode) },
      });

      if (res.ok) {
        const updated = await res.json();
        setRoom(updated);
      }
    } catch {
      // Local test mode can still start without the backend.
    }
  }

  async function handleLeave() {
    await leaveRoom("/home");
  }

  async function leaveRoom(destination) {
    try {
      await authFetch(`${API}/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...roomMemberHeaders(roomCode) },
      });
    } finally {
      clearRoomMemberSession(roomCode);
      navigate(destination);
    }
  }

  async function handleLoginPromptConfirm() {
    await leaveRoom("/");
  }

  async function handleSaveOptions(nextOptions) {
    setOptionsError("");

    try {
      const response = await authFetch(`${API}/rooms/${roomCode}/options`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...roomMemberHeaders(roomCode) },
        body: JSON.stringify({
          options: nextOptions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setOptionsError(errorData.error || "Could not save options.");
        return;
      }

      const updated = await response.json();
      setRoom(updated);
      setShowOptions(false);
    } catch {
      setOptionsError("Could not save options.");
    }
  }

  if (!room) {
    return (
      <div className="room-page">
        <GameBackground />
        <div className="room-loading">Connecting...</div>
      </div>
    );
  }

  const isHost = room.host === roomMemberName;
  const gameStarted = room.started || localGameStarted;
  const memberProfiles = getRoomMemberProfiles(room, roomMemberName, getSessionUser().userId);
  const roomOptions = { ...DEFAULT_ROOM_OPTIONS, ...(room.options || {}) };

  if (!gameStarted) {
    return (
      <div className="room-page">
        <GameBackground />
        <div className="room-window">
          <header className="room-top-row">
            <div className="room-logo" aria-label="logo">
              <span>J</span>
            </div>
            <div className="room-id-bar">
              <span className="room-id-label">ROOM CODE: {room.roomCode}</span>
              {isHost && (
                <button
                  className="room-options-btn"
                  type="button"
                  onClick={() => setShowOptions(true)}
                >
                  Options
                </button>
              )}
            </div>
            <button
              className="room-menu-btn"
              type="button"
              aria-label="leave room"
              onClick={handleLeave}
            >
              x
            </button>
          </header>

          <div className="room-lobby">
            <h2 className="room-lobby-title">Waiting for host to start...</h2>
            <div className="room-lobby-members">
              <p className="room-lobby-members-label">Players in room</p>
              <ul className="room-members-list">
                {memberProfiles.map((member) => (
                  <li key={member.id} className="room-member-item">
                    {member.name}
                    {member.name === room.host ? " Host" : ""}
                  </li>
                ))}
              </ul>
            </div>

            {isHost && (
              <button className="room-start-btn" type="button" onClick={handleStart}>
                Start Game
              </button>
            )}
          </div>

          {showOptions ? (
            <RoomOptionsModal
              error={optionsError}
              options={roomOptions}
              onClose={() => setShowOptions(false)}
              onSave={handleSaveOptions}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <GameBackground />

      <header className="room-top-row">
        <div className="room-logo" aria-label="logo">
          <span>J</span>
        </div>
        <div className="room-id-bar">
          <span className="room-id-label">ROOM: {room.roomCode}</span>
          {isHost && (
            <button className="room-options-btn" type="button" onClick={() => setShowOptions(true)}>
              Options
            </button>
          )}
        </div>
        <button
          className="room-menu-btn"
          type="button"
          aria-label="leave room"
          onClick={handleLeave}
        >
          x
        </button>
      </header>

      <VoteMovingBox
        accountUsername={username}
        room={room}
        roomCode={roomCode}
        onRoomUpdate={setRoom}
        users={memberProfiles}
        hostName={room.host}
        isGuest={username === "Guest"}
        playOnAllDevices={roomOptions.playOnAllDevices}
        username={roomMemberName}
        onLoginRequired={() => setShowLoginPrompt(true)}
      />

      {showLoginPrompt ? (
        <LoginRequiredModal
          onConfirm={handleLoginPromptConfirm}
          onCancel={() => setShowLoginPrompt(false)}
        />
      ) : null}

      {showOptions ? (
        <RoomOptionsModal
          error={optionsError}
          options={roomOptions}
          onClose={() => setShowOptions(false)}
          onSave={handleSaveOptions}
        />
      ) : null}
    </div>
  );
}

function RoomOptionsModal({ error, onClose, onSave, options }) {
  const [roundSeconds, setRoundSeconds] = useState(options.roundSeconds);
  const [continuousPlaylistMode, setContinuousPlaylistMode] = useState(
    options.continuousPlaylistMode
  );
  const [removeSelectedSong, setRemoveSelectedSong] = useState(options.removeSelectedSong);
  const [playOnAllDevices, setPlayOnAllDevices] = useState(options.playOnAllDevices);
  const [pauseVotingWhenTimerPaused, setPauseVotingWhenTimerPaused] = useState(
    options.pauseVotingWhenTimerPaused
  );

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      roundSeconds: Number(roundSeconds),
      continuousPlaylistMode,
      removeSelectedSong,
      playOnAllDevices,
      pauseVotingWhenTimerPaused,
    });
  }

  return (
    <div className="room-options-overlay" role="presentation">
      <form
        className="room-options-window"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Room options"
      >
        <header className="room-options-header">
          <h2>Options</h2>
          <button type="button" onClick={onClose} aria-label="Close options">
            x
          </button>
        </header>

        <label className="room-options-field" htmlFor="round-seconds">
          <span>Timer seconds</span>
          <input
            id="round-seconds"
            type="number"
            min="0"
            max="900"
            step="1"
            value={roundSeconds}
            onChange={(event) => setRoundSeconds(event.target.value)}
          />
        </label>

        <fieldset className="room-options-field">
          <legend>Continuous playlist</legend>
          <label>
            <input
              type="radio"
              name="continuousPlaylistMode"
              value="removeSongs"
              checked={continuousPlaylistMode === "removeSongs"}
              onChange={(event) => setContinuousPlaylistMode(event.target.value)}
            />
            Remove all songs from queue
          </label>
          <label>
            <input
              type="radio"
              name="continuousPlaylistMode"
              value="removeVotes"
              checked={continuousPlaylistMode === "removeVotes"}
              onChange={(event) => setContinuousPlaylistMode(event.target.value)}
            />
            Remove all votes
          </label>
          <label>
            <input
              type="radio"
              name="continuousPlaylistMode"
              value="playQueue"
              checked={continuousPlaylistMode === "playQueue"}
              onChange={(event) => setContinuousPlaylistMode(event.target.value)}
            />
            Play queue before voting again
          </label>
          <label>
            <input
              type="radio"
              name="continuousPlaylistMode"
              value="keepAll"
              checked={continuousPlaylistMode === "keepAll"}
              onChange={(event) => setContinuousPlaylistMode(event.target.value)}
            />
            Remove nothing
          </label>
        </fieldset>

        <label className="room-options-check">
          <input
            type="checkbox"
            checked={removeSelectedSong}
            onChange={(event) => setRemoveSelectedSong(event.target.checked)}
            disabled={continuousPlaylistMode === "removeSongs" || continuousPlaylistMode === "playQueue"}
          />
          Remove selected song from queue
        </label>

        <label className="room-options-check">
          <input
            type="checkbox"
            checked={playOnAllDevices}
            onChange={(event) => setPlayOnAllDevices(event.target.checked)}
          />
          Play songs on other users' computers
        </label>

        <label className="room-options-check">
          <input
            type="checkbox"
            checked={pauseVotingWhenTimerPaused}
            onChange={(event) => setPauseVotingWhenTimerPaused(event.target.checked)}
          />
          Pause voting when timer is paused
        </label>

        {error ? <p className="room-options-error">{error}</p> : null}

        <div className="room-options-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default Room;
