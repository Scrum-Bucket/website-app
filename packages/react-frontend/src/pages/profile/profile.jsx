import React from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";

function Profile({ username }) {
  const navigate = useNavigate();
  const displayName = username || "Guest";

  return (
    <div className="profile-page">
      <OtherBackground />
      <div className="profile-window">
        <header className="profile-header">
          <h1>Profile</h1>
          <button type="button" onClick={() => navigate("/home")}>Back to Home</button>
        </header>

        <section className="profile-details">
          <div className="profile-row">
            <span>Username</span>
            <strong>{displayName}</strong>
          </div>
          <div className="profile-row">
            <span>Account type</span>
            <strong>{displayName === "Guest" ? "Guest" : "User"}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Profile;
