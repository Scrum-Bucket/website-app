import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MyApp from "./MyApp";
import Home from "../pages/Home/Home";
import Host from "../pages/host/host";
import Join from "../pages/Join/Join";
import Code from "../pages/Code/Code";
import Room from "../pages/Room/Room";
import Playlist from "../pages/Playlist/Playlist";
import Profile from "../pages/profile/profile";
import Admin from "../pages/admin/Admin";
import EditCrab from "../pages/profile/edit-crab";

export function GuestGuard({ username, children }) {
  return username === "Guest" ? (
    <Navigate to="/" state={{ loginError: "Must log in first" }} replace />
  ) : (
    children
  );
}

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <Routes>
        <Route
          path="/"
          element={
            <MyApp
              onLogin={(loggedInUsername) => {
                setUsername(loggedInUsername);
                setIsLoggedIn(true);
              }}
            />
          }
        />
        <Route
          path="/home"
          element={isLoggedIn ? <Home username={username} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/home/host"
          element={
            isLoggedIn ? (
              <GuestGuard username={username}>
                <Host />
              </GuestGuard>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/home/join"
          element={isLoggedIn ? <Join /> : <Navigate to="/" replace />}
        />
        <Route
          path="/home/code"
          element={isLoggedIn ? <Code username={username} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/home/room"
          element={isLoggedIn ? <Room username={username} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/home/room/:roomCode"
          element={isLoggedIn ? <Room username={username} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/home/playlist"
          element={
            isLoggedIn ? (
              <GuestGuard username={username}>
                <Playlist />
              </GuestGuard>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/home/profile"
          element={
            isLoggedIn ? (
              <GuestGuard username={username}>
                <Profile username={username} />
              </GuestGuard>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/home/admin"
          element={
            isLoggedIn ? (
              <GuestGuard username={username}>
                <Admin />
              </GuestGuard>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/home/profile/edit-crab"
          element={
            isLoggedIn ? (
              <GuestGuard username={username}>
                <EditCrab />
              </GuestGuard>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn ? "/home" : "/"} replace />} />
    </Routes>
  );
}

export default App;

