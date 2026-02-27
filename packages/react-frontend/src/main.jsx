// src/main.jsx
import React, { useState } from "react";
import ReactDOMClient from "react-dom/client";
import MyApp from "./MyApp";
import Home from "./Home";
import Join from "./Join";
import Code from "./Code";
import Room from "./Room";

import "./login.css";

const container = document.getElementById("root");
const root = ReactDOMClient.createRoot(container);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState("home");

  if (!isLoggedIn) {
    return <MyApp onLogin={() => setIsLoggedIn(true)} />;
  }

  if (screen === "join") {
    return (
      <Join
        onBackHome={() => setScreen("home")}
        onOpenRoom={() => setScreen("room")}
        onOpenCode={() => setScreen("code")}
      />
    );
  }

  if (screen === "code") {
    return (
      <Code
        onBackHome={() => setScreen("home")}
        onBrowsePublic={() => setScreen("join")}
        onJoinCode={() => setScreen("room")}
      />
    );
  }

  if (screen === "room") {
    return <Room onBackHome={() => setScreen("home")} />;
  }

  return <Home onJoinRoom={() => setScreen("join")} />;
}

root.render(<App />);
