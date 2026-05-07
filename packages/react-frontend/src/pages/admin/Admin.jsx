import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";

function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminVerified, setAdminVerified] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/home/profile");
      return;
    }

    const verifyAdmin = async () => {
      try {
        const response = await fetch(`http://localhost:8000/users/${userId}/admin-status`);
        if (!response.ok) {
          throw new Error("Unable to verify admin status");
        }
        const data = await response.json();
        if (!data.isAdmin) {
          navigate("/home/profile");
          return;
        }
        setAdminVerified(true);
        fetchUsers();
      } catch (err) {
        console.error("Admin verify error:", err);
        navigate("/home/profile");
      }
    };

    verifyAdmin();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/promote`, {
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
      fetchUsers();
    } catch (error) {
      console.error("Promotion error:", error);
      alert("Failed to promote user: " + error.message);
    }
  };

  const handleDemoteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/demote`, {
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
      fetchUsers();
    } catch (error) {
      console.error("Demotion error:", error);
      alert("Failed to demote user: " + error.message);
    }
  };

  const handleTimeoutUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/timeout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ban failed");
      }

      alert("User has been banned");
      fetchUsers();
    } catch (error) {
      console.error("Ban error:", error);
      alert("Failed to ban user: " + error.message);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/unban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unban failed");
      }

      alert("User has been unbanned");
      fetchUsers();
    } catch (error) {
      console.error("Unban error:", error);
      alert("Failed to unban user: " + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Deletion failed");
      }

      alert("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Deletion error:", error);
      alert("Failed to delete user: " + error.message);
    }
  };

  if (!adminVerified) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-page">
      <OtherBackground />
      <div className="admin-container">
        <header className="admin-header">
          <h1>Admin Panel</h1>
          <button type="button" className="admin-home-btn" onClick={() => navigate("/home/profile")}>
            <img src={HouseIcon} alt="Back to Profile" />
          </button>
        </header>

        {error && <div className="admin-error">{error}</div>}

        <section className="admin-controls">
          <button
            className="admin-control-btn"
            type="button"
            onClick={fetchUsers}
            style={{'--btn-color': '#3498db', '--btn-hover-color': '#2980b9'}}
          >
            Refresh Users
          </button>
        </section>

        <section className="admin-users">
          <h2>User Management</h2>
          {loading ? (
            <div className="admin-loading">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="admin-no-users">No users found</div>
          ) : (
            <div className="admin-users-list">
              {users.map((user) => (
                <div key={user._id} className="admin-user-card">
                  <div className="admin-user-info">
                    <div className="admin-user-name">
                      <strong>{user.userName}</strong>
                      {user.isAdmin && <span className="admin-badge">ADMIN</span>}
                    </div>
                    <div className="admin-user-details">
                      <div>ID: {user._id}</div>
                      <div>Status: {user.status === 0 ? "Logged Out" : user.status === 1 ? "Logged In" : "Banned"}</div>
                      <div>Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="admin-user-actions">
                    {user.isAdmin ? (
                      <button
                        className="admin-action-btn demote"
                        type="button"
                        onClick={() => handleDemoteUser(user._id)}
                      >
                        Demote from Admin
                      </button>
                    ) : (
                      <button
                        className="admin-action-btn promote"
                        type="button"
                        onClick={() => handlePromoteUser(user._id)}
                      >
                        Promote to Admin
                      </button>
                    )}
                    {user.status === 2 ? (
                      <button
                        className="admin-action-btn unban"
                        type="button"
                        onClick={() => handleUnbanUser(user._id)}
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        className="admin-action-btn timeout"
                        type="button"
                        onClick={() => handleTimeoutUser(user._id)}
                      >
                        Ban User
                      </button>
                    )}
                    <button
                      className="admin-action-btn delete"
                      type="button"
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Admin;
