import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";

function Profile({ username }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(username || "Guest");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("isAdmin") === "true");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const verifyAdmin = async () => {
      try {
        const response = await fetch(`http://localhost:8000/users/${userId}/admin-status`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (err) {
        console.error("Failed to verify admin status:", err);
      }
    };

    verifyAdmin();
  }, []);


  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      // If no userId, just navigate to login
      navigate("/");
      return;
    }

    try {
      // Call backend logout endpoint
      const response = await fetch(`http://localhost:8000/users/${userId}/logout`, {
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

  const handlePromoteUser = async () => {
    const userId = prompt("Enter the user ID to promote to admin:");
    if (!userId) return;

    try {
      const response = await fetch(`http://localhost:8000/users/${userId.trim()}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Promotion failed");
      }

      alert("User promoted to admin successfully");
    } catch (error) {
      console.error("Promotion error:", error);
      alert("Failed to promote user: " + error.message);
    }
  };

  const handleDemoteUser = async () => {
    const userId = prompt("Enter the user ID to demote from admin:");
    if (!userId) return;

    try {
      const response = await fetch(`http://localhost:8000/users/${userId.trim()}/demote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Demotion failed");
      }

      alert("Admin demoted to regular user successfully");
    } catch (error) {
      console.error("Demotion error:", error);
      alert("Failed to demote user: " + error.message);
    }
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
      const response = await fetch(`http://localhost:8000/users/${userId}/rename`, {
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
      const response = await fetch(`http://localhost:8000/users/${userId}/password`, {
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
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
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
          <div className="profile-row">
            <span>Username</span>
            <strong>{displayName}</strong>
          </div>
          <div className="profile-row">
            <span>Account type</span>
            <strong>{displayName === "Guest" ? "Guest" : (isAdmin ? "Admin" : "User")}</strong>
          </div>
        </section>

        <section className="profile-actions">
          <button className="profile-action-btn" style={{'--btn-color': '#e74c3c', '--btn-hover-color': '#c0392b'}} type="button" onClick={handleDeleteUser}>Delete User</button>
          <button className="profile-action-btn" style={{'--btn-color': '#4aa6dd', '--btn-hover-color': '#2980b9'}} type="button" onClick={handleLogout}>Logout</button>
          <button className="profile-action-btn" style={{'--btn-color': '#27ae60', '--btn-hover-color': '#229954'}} type="button" onClick={handleRenameUser}>Rename User</button>
          <button className="profile-action-btn" style={{'--btn-color': '#f1c40f', '--btn-hover-color': '#d4b10f'}} type="button" onClick={handleChangePassword}>Change Password</button>
          
          {isAdmin && (
            <>
              <button className="profile-action-btn" style={{'--btn-color': '#9b59b6', '--btn-hover-color': '#8e44ad'}} type="button" onClick={handleAdminPanel}>Admin Panel</button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;
