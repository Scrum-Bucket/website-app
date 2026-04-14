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

  function handleLogin() {
    const trimmedUsername = username.trim();

    //replace with login API call to backend
    const matchingAccount = DUMMY_ACCOUNTS.find(
      (account) => account.userName === trimmedUsername && account.password === password
    );

    const promise = fetch(`http://localhost:8000/users`, {
      method: "POST"
    }).then(async (response) => {
      if (!response.ok){
        setErrorMessage(`Error: ${response.status}`)
      }

    }).catch((error) => console.log(error));


    if (!matchingAccount) {
      setErrorMessage("Invalid username or password.");
      return;
    }

    setErrorMessage("");
    onLogin(matchingAccount.userName);
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
