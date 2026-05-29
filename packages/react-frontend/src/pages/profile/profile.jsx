import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";
import UserCrabIcon from "../../assets/user-crab.png";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";
import {
  clearStoredCrabProfile,
  createCrabIcon,
  getHatSourceForCrab,
  readStoredCrabProfile,
  writeStoredCrabProfile,
} from "./crabColor";

const hatImages = import.meta.glob("../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

function Profile({ username }) {
  const navigate = useNavigate();
  const initialUserId = localStorage.getItem("userId");
  const [displayName, setDisplayName] = useState(username || "Guest");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("isAdmin") === "true");
  const [crabProfile, setCrabProfile] = useState(() => readStoredCrabProfile(initialUserId));
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  useEffect(() => {
    const syncUserProfile = async () => {
      try {
        const response = await authFetch(`${frontendLink}/users/me`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();

        if (data.userName) {
          setDisplayName(data.userName);
          localStorage.setItem("username", data.userName);
        }

        if (data._id) {
          localStorage.setItem("userId", data._id);
        }

        setIsAdmin(data.isAdmin === true);
        localStorage.setItem("isAdmin", data.isAdmin === true ? "true" : "false");
        setCrabProfile(writeStoredCrabProfile(data.crab, data._id));
      } catch (err) {
        console.error("Failed to sync user profile:", err);
      }
    };

    syncUserProfile();
  }, [username]);

  useEffect(() => {
    let isActive = true;
    const hatSource = getHatSourceForCrab(crabProfile, hatImages);

    createCrabIcon(UserCrabIcon, crabProfile.color, hatSource).then((nextIcon) => {
      if (isActive) {
        setCrabIcon(nextIcon);
      }
    });

    return () => {
      isActive = false;
    };
  }, [crabProfile]);

  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      // If no userId, just navigate to login
      navigate("/");
      return;
    }

    try {
      // Call backend logout endpoint
      const response = await authFetch(`${frontendLink}/users/me/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Clear authentication data from localStorage
      clearStoredCrabProfile(userId);
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("isAdmin");

      // Navigate to login screen
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Clear localStorage anyway and navigate to login on error
      clearStoredCrabProfile(userId);
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
      const response = await authFetch(`${frontendLink}/users/me/rename`, {
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
      const response = await authFetch(`${frontendLink}/users/me/password`, {
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
      const response = await authFetch(`${frontendLink}/users/me`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      // Clear authentication data from localStorage
      clearStoredCrabProfile(userId);
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("isAdmin");

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
              <img src={crabIcon} alt="" aria-hidden="true" />
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
