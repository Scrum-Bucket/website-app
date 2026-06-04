import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./join.css";
import logoImage from "../../assets/logo.png";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import { getSessionUser } from "../../authSession";
import frontendLink from "../../frontendLink";
import { setRoomMemberSession } from "../Room/roomMemberSession";

const publicRooms = [];

function Join() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(publicRooms);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;

    function formatPublicRoom(room, index) {
      const members = Array.isArray(room.members) ? room.members : [];
      const currentSongName =
        typeof room.currentSong === "string" ? room.currentSong : room.currentSong?.name;

      return {
        id: room._id || room.id || index + 1,
        name: currentSongName || "No song playing",
        host: room.host || "Host Name",
        listeners: members.length,
        code: room.roomCode || "Room Code",
      };
    }
    async function loadPublicRooms() {
      const response = await authFetch(`${frontendLink}/rooms?privacy=public`);
      if (!response.ok) {
        throw new Error("Failed to fetch public rooms");
      }

      const publicRooms = await response.json();
      const formattedRooms = publicRooms.map(formatPublicRoom);

      if (active) {
        setRooms(formattedRooms);
      }
    }

    loadPublicRooms().catch((error) => console.error(error));

    return () => {
      active = false;
    };
  }, []);

  async function joinRoom(code) {
    const normalizedCode = code.trim().toUpperCase();
    const currentUsername = getSessionUser().username || "guest";
    const response = await authFetch(`${frontendLink}/rooms/${normalizedCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: currentUsername }),
    });

    if (!response.ok) {
      throw new Error("Failed to join room");
    }

    const joinedRoom = await response.json();
    setRoomMemberSession(normalizedCode, {
      memberName: joinedRoom.assignedMemberName || currentUsername,
      token: joinedRoom.roomMemberToken,
    });

    return normalizedCode;
  }

  const filteredRooms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return rooms;

    return rooms.filter((room) =>
      [room.name, room.host, room.code].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [rooms, searchTerm]);

  return (
    <div className="join-page">
      <OtherBackground />
      <div className="join-window">
        <header className="join-top-row">
          <img className="join-logo" src={logoImage} alt="logo" />
          <button
            className="join-menu-btn"
            aria-label="back home"
            onClick={() => navigate("/home")}
          >
            &#9776;
          </button>
        </header>

        <section className="join-search-wrap">
          <div className="join-search-bar">
            <input
              type="search"
              placeholder="Search public rooms"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search public rooms"
            />
            <button aria-label="join by code" onClick={() => navigate("/home/code")} type="button">
              #
            </button>
          </div>
        </section>

        <section className="join-list">
          {filteredRooms.map((room) => (
            <button
              className="join-room-row"
              key={room.id}
              onClick={async () => {
                try {
                  const joinedCode = await joinRoom(room.code);
                  navigate("/home/room/" + joinedCode);
                } catch (error) {
                  console.error(error);
                }
              }}
              type="button"
            >
              <div className="join-room-code">{room.code}</div>
              <div className="join-room-meta">
                <span>{room.name}</span>
                <span>Hosted by {room.host}</span>
                <span>{room.listeners} listeners</span>
              </div>
            </button>
          ))}

          {!filteredRooms.length && (
            <div className="join-empty-state">
              <p>No public rooms match that search.</p>
              <button type="button" onClick={() => setSearchTerm("")}>
                Clear search
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Join;
