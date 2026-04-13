// src/main.jsx
import React, { useState } from "react";
import ReactDOMClient from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MyApp from "./app/MyApp";
import Home from "./pages/Home/Home";
import Host from "./pages/host/host";
import Join from "./pages/Join/Join";
import Code from "./pages/Code/Code";
import Room from "./pages/Room/Room";
import Playlist from "./pages/Playlist/Playlist";

import "./login.css";

const container = document.getElementById("root");
const root = ReactDOMClient.createRoot(container);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  if (!isLoggedIn) {
    return (
      <MyApp
        onLogin={(loggedInUsername) => {
          setUsername(loggedInUsername);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home username={username} />} />
        <Route path="/home/host" element={<Host />} />
        <Route path="/home/join" element={<Join />} />
        <Route path="/home/code" element={<Code />} />
        <Route path="/home/room" element={<Room />} />
        <Route path="/home/playlist" element={<Playlist />} />
      </Routes>
    </BrowserRouter>
  );
}

root.render(<App />);
