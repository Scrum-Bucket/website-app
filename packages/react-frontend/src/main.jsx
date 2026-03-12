// src/main.jsx
import React, { useState } from "react";
import ReactDOMClient from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

  if (!isLoggedIn) {
    return <MyApp onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/join" element={<Join />} />
        <Route path="/home/code" element={<Code />} />
        <Route path="/home/room" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

root.render(<App />);
