// src/MyApp.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function MyApp({ onLogin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectError, setRedirectError] = useState(location.state?.loginError || "");

  useEffect(() => {
    if (location.state?.loginError) {
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  async function handleLogin() {
    const trimmedUsername = username.trim();

    try {
      const response = await fetch(`http://localhost:8000/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Login failed");
        return;
      }

      const userData = await response.json();
      setErrorMessage("");
      
      // Store username, userId, and admin status in localStorage
      localStorage.setItem("username", userData.userName);
      localStorage.setItem("userId", userData._id);
      localStorage.setItem("isAdmin", userData.isAdmin ? "true" : "false");
      
      onLogin(trimmedUsername);
      navigate("/home");
    } catch (error) {
      setErrorMessage("Connection error. Is the backend running?");
      console.log(error);
    }
  }

  async function handleSignup() {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 2) {
      setErrorMessage("Username must be at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Signup failed");
        return;
      }

      const userData = await response.json();
      setErrorMessage("");
      
      // Store username, userId, and admin status in localStorage
      localStorage.setItem("username", userData.userName);
      localStorage.setItem("userId", userData._id);
      localStorage.setItem("isAdmin", userData.isAdmin ? "true" : "false");
      
      onLogin(trimmedUsername);
      navigate("/home");
    } catch (error) {
      setErrorMessage("Connection error. Is the backend running?");
      console.log(error);
    }
  }

  function handleGuestLogin() {
    onLogin("Guest");
    navigate("/home");
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleLogin();
  }

  return (
    <div className="page">
      <div className="floating" style={{ minWidth: '840px', padding: '48px' }}>
        <form className="login-row" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrorMessage("");
              setRedirectError("");
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage("");
              setRedirectError("");
            }}
          />
          <button type="submit" className="login-button">
            Log In
          </button>
        </form>
        <button type="button" className="other-button" onClick={handleGuestLogin}>
          Continue as Guest
        </button>
        <button type="button" className="other-button" onClick={handleSignup}>
          Sign Up
        </button>
        {(errorMessage || redirectError) ? <p className="auth-error">{errorMessage || redirectError}</p> : null}
        <p className="demo-accounts">Demo accounts: nick/music123 or demo/password1</p>
      </div>
    </div>
  );
}

export default MyApp;
