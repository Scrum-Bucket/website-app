import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";
import UserCrabIcon from "../../assets/user-crab.png";
import frontendLink from "../../frontendLink";

function getHueFromHex(hexColor) {
  const normalizedColor = hexColor.replace("#", "");
  const red = parseInt(normalizedColor.slice(0, 2), 16) / 255;
  const green = parseInt(normalizedColor.slice(2, 4), 16) / 255;
  const blue = parseInt(normalizedColor.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return 0;
  }

  if (max === red) {
    return Math.round(60 * (((green - blue) / delta) % 6));
  }

  if (max === green) {
    return Math.round(60 * ((blue - red) / delta + 2));
  }

  return Math.round(60 * ((red - green) / delta + 4));
}

function Profile({ username }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(username || "Guest");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("isAdmin") === "true");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const verifyAdmin = async () => {
      try {
        const response = await fetch(`${frontendLink}/users/${userId}/admin-status`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const isAdminStatus = data.isAdmin === true;
        setIsAdmin(isAdminStatus);
        localStorage.setItem("isAdmin", isAdminStatus ? "true" : "false");
      } catch (err) {
        console.error("Failed to verify admin status:", err);
      }
    };

    verifyAdmin();
  }, []);

  const savedCrabColor = localStorage.getItem("profileCrabColor") || "#e74c3c";
  const crabHue = localStorage.getItem("profileCrabHue") || String(getHueFromHex(savedCrabColor));

  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      // If no userId, just navigate to login
      navigate("/");
      return;
    }

    try {
      // Call backend logout endpoint
      const response = await fetch(`${frontendLink}/users/${userId}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Clear authentication data from localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("isAdmin");

      // Navigate to login screen
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Clear localStorage anyway and navigate to login on error
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("isAdmin");
      navigate("/");
    }
  };

  const handleAdminPanel = () => {
    navigate("/home/admin");
  };

  const handleRenameUser = async () => {
    const userId = localStorage.getItem("userId");
    const currentUsername = localStorage.getItem("username");

    if (!userId) {
      console.error("No user ID found");
      return;
    }

    // Prompt user for new username
    const newUsername = prompt("Enter your new username:", currentUsername);

    // User cancelled the prompt
    if (newUsername === null) {
      return;
    }

    // Check if username is empty or unchanged
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) {
      alert("Username cannot be empty");
      return;
    }

    if (trimmedUsername === currentUsername) {
      alert("New username must be different from current username");
      return;
    }

    try {
      // Call backend rename endpoint
      const response = await fetch(`${frontendLink}/users/${userId}/rename`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newUserName: trimmedUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rename failed");
      }

      // Update localStorage with new username
      localStorage.setItem("username", trimmedUsername);

      // Update the display name state to show the new username immediately
      setDisplayName(trimmedUsername);
    } catch (error) {
      console.error("Rename error:", error);
      console.error("Error message:", error.message);
      alert("Failed to rename user: " + error.message);
    }
  };

  const handleChangePassword = async () => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No user ID found");
      return;
    }

    const newPassword = prompt("Enter your new password (at least 8 characters):");
    if (newPassword === null) {
      return;
    }

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    try {
      const response = await fetch(`${frontendLink}/users/${userId}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword: trimmedPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Password change failed");
      }
    } catch (error) {
      console.error("Password change error:", error);
      console.error("Error message:", error.message);
      alert("Failed to change password: " + error.message);
    }
  };

  const handleDeleteUser = async () => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No user ID found");
      return;
    }

    // Ask for confirmation
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      // Call backend delete endpoint
      const response = await fetch(`${frontendLink}/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      // Clear authentication data from localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");

      // Navigate to login screen
      navigate("/");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete user: " + error.message);
    }
  };

  return (
    <div className="profile-page">
      <OtherBackground />
      <div className="profile-window">
        <header className="profile-header">
          <h1>Profile</h1>
          <button type="button" className="profile-home-btn" onClick={() => navigate("/home")}>
            <img src={HouseIcon} alt="Back to Home" />
          </button>
        </header>

        <section className="profile-details">
          <div className="profile-icon-row">
            <button
              type="button"
              className="profile-edit-crab-btn"
              onClick={() => navigate("/home/profile/edit-crab")}
              aria-label="Edit profile icon color"
              title="Edit profile icon color"
            >
              <img
                src={UserCrabIcon}
                alt=""
                aria-hidden="true"
                style={{ "--crab-hue": `${crabHue}deg` }}
              />
            </button>
          </div>
          <div className="profile-row">
            <span>Username</span>
            <strong>{displayName}</strong>
          </div>
          <div className="profile-row">
            <span>Account type</span>
            <strong>{displayName === "Guest" ? "Guest" : isAdmin ? "Admin" : "User"}</strong>
          </div>
        </section>

        <section className="profile-actions">
          <button
            className="profile-action-btn"
            style={{ "--btn-color": "#e74c3c", "--btn-hover-color": "#c0392b" }}
            type="button"
            onClick={handleDeleteUser}
          >
            Delete User
          </button>
          <button
            className="profile-action-btn"
            style={{ "--btn-color": "#4aa6dd", "--btn-hover-color": "#2980b9" }}
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            className="profile-action-btn"
            style={{ "--btn-color": "#27ae60", "--btn-hover-color": "#229954" }}
            type="button"
            onClick={handleRenameUser}
          >
            Rename User
          </button>
          <button
            className="profile-action-btn"
            style={{ "--btn-color": "#f1c40f", "--btn-hover-color": "#d4b10f" }}
            type="button"
            onClick={handleChangePassword}
          >
            Change Password
          </button>
        </section>

        <section className="Admin-actions">
          {isAdmin && (
            <>
              <button
                className="profile-action-btn"
                style={{ "--btn-color": "#a4a4a4", "--btn-hover-color": "#838383" }}
                type="button"
                onClick={handleAdminPanel}
              >
                Admin Panel
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;
