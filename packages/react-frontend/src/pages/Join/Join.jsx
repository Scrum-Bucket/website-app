import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./join.css";
import logoImage from "../../assets/logo.png";
import OtherBackground from "../../../animationFiles/other-background.jsx";

const publicRooms = [
  { id: 1, name: "Beach Mix", host: "Nick", listeners: 5, code: "BEACH1" },
  { id: 2, name: "Study Beats", host: "Demo", listeners: 3, code: "STUDY2" },
  { id: 3, name: "Party Queue", host: "Alex", listeners: 8, code: "PARTY3" },
  { id: 4, name: "Road Trip", host: "Sam", listeners: 4, code: "ROAD04" },
];

function Join() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRooms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return publicRooms;

    return publicRooms.filter((room) =>
      [room.name, room.host, room.code].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [searchTerm]);

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
              onClick={() => navigate("/home/code")}
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
