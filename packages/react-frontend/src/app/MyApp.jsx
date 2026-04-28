// src/MyApp.jsx
import React, { useState } from "react";

const DUMMY_ACCOUNTS = [
  { userName: "nick", password: "music123" },
  { userName: "demo", password: "password1" },
];

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
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Login failed");
        return;
      }

      const user = await response.json();
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
        <button type="button" className="login-button" onClick={handleLogin}>
          Log In
        </button>
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        <p className="demo-accounts">Demo accounts: nick/music123 or demo/password1</p>
      </div>
    </div>
  );
}

export default MyApp;
