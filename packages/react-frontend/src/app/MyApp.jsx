// src/MyApp.jsx
import React, { useState } from "react";

function MyApp({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Login failed");
        return;
      }

      await response.json();
      setErrorMessage("");
      onLogin(trimmedUsername);
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

      await response.json();
      setErrorMessage("");
      onLogin(trimmedUsername);
    } catch (error) {
      setErrorMessage("Connection error. Is the backend running?");
      console.log(error);
    }
  }

  return (
    <div className="page">
      <div className="floating">
        <div className="row">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="button-row">
          <button type="button" className="login-button" onClick={handleLogin}>
            Log In
          </button>
          <button type="button" className="signup-button" onClick={handleSignup}>
            Sign Up
          </button>
        </div>
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        <p className="demo-accounts">Demo accounts: nick/music123 or demo/password1</p>
      </div>
    </div>
  );
}

export default MyApp;
