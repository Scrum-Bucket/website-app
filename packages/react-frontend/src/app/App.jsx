import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import MyApp from "./MyApp";
import LoginRequiredModal from "./LoginRequiredModal";
import Home from "../pages/Home/Home";
import Host from "../pages/host/host";
import Join from "../pages/Join/Join";
import Code from "../pages/Code/Code";
import Room from "../pages/Room/Room";
import Playlist from "../pages/Playlist/Playlist";
import MyPlaylist from "../pages/Playlist/MyPlaylist";
import Profile from "../pages/profile/profile";
import Admin from "../pages/admin/Admin";
import EditCrab from "../pages/profile/edit-crab";
import { HEARTBEAT_MS, getSessionUser, sendUserHeartbeat } from "../authSession";

export function GuestGuard({ username, children }) {
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(true);

  if (username !== "Guest") {
    return children;
  }

  return (
    <>
      <Home username={username} onLoginRequired={() => setShowLoginPrompt(true)} />
      {showLoginPrompt ? (
        <LoginRequiredModal onConfirm={() => navigate("/")} onCancel={() => setShowLoginPrompt(false)} />
      ) : null}
    </>
  );
}

export function App() {
  const savedSession = getSessionUser();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(savedSession.username));
  const [username, setUsername] = useState(savedSession.username);
  const [userId, setUserId] = useState(savedSession.userId);

  useEffect(() => {
    if (!isLoggedIn || username === "Guest") {
      return undefined;
    }

    let active = true;

    async function heartbeat() {
      try {
        await sendUserHeartbeat();
      } catch {
        if (active) {
          setUsername("");
          setUserId("");
          setIsLoggedIn(false);
        }
      }
    }

    heartbeat();
    const heartbeatId = setInterval(heartbeat, HEARTBEAT_MS);

    return () => {
      active = false;
      clearInterval(heartbeatId);
    };
  }, [isLoggedIn, username]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MyApp
            onLogin={(loginUser) => {
              setUsername(loginUser.username);
              setUserId(loginUser.userId || "");
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
              <Host username={username} />
            </GuestGuard>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="/home/join" element={isLoggedIn ? <Join /> : <Navigate to="/" replace />} />
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
              <Playlist userId={userId} username={username} />
            </GuestGuard>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/home/my-playlist"
        element={
          isLoggedIn ? (
            <GuestGuard username={username}>
              <MyPlaylist username={username} />
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
