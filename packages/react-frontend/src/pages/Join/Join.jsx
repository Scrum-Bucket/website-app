import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./join.css";
import logoImage from "../../assets/logo.png";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";

function formatPublicRoom(room, index) {
  const members = Array.isArray(room.members) ? room.members : [];

  return {
    id: room._id || room.id || index + 1,
    name: room.currentSong || "No song playing",
    host: room.host || "Host Name",
    listeners: members.length,
    code: room.roomCode || "Room Code",
  };
}

function Join() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadPublicRooms() {
      const response = await authFetch(`${frontendLink}/rooms?privacy=public`);
      if (!response.ok) {
        throw new Error("Failed to fetch public rooms");
      }

      const publicRooms = await response.json();
      const formattedRooms = publicRooms.map(formatPublicRoom);

      if (active) {
        setRooms((roomList) => [...roomList, ...formattedRooms]);
      }
    }

    loadPublicRooms().catch((error) => console.error(error));

    return () => {
      active = false;
    };
  }, []);

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
            <input type="text" placeholder="Search for Room Name" />
            <button aria-label="join by code" onClick={() => navigate("/home/code")} type="button">
              =
            </button>
          </div>
        </section>

        <section className="join-list">
          {rooms.map((room) => (
            <article className="join-song-row" key={room.id} onClick={() => navigate("/home/code")}>
              <div className="join-album-cover">{room.code}</div>
              <div className="join-song-meta">
                <span>{room.name}</span>
                <span>{room.host}</span>
                <span>{room.listeners} listeners</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Join;
