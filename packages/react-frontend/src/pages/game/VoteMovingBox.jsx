import React, { useEffect, useMemo, useState } from "react";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import { createCrabIcon } from "../profile/crabColor";

const hatImages = import.meta.glob("../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const DEFAULT_USERS = [
  { id: "captain", name: "Captain", initialScore: 3 },
  { id: "sailor", name: "Sailor", initialScore: 0 },
  { id: "dj", name: "DJ", initialScore: -2 },
  { id: "guest", name: "Guest", initialScore: 5 },
];

const MIN_SCORE = -20;
const MAX_SCORE = 40;

const CARD_HEIGHT = 120; // px — height of each card
const CARD_GAP = 14;    // px — gap between cards

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeUsers(users) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const name =
      typeof user === "string" ? user : user.name || user.userName || `User ${index + 1}`;

    return {
      id: user.id || user.userId || name,
      name,
      initialScore: Number.isFinite(user.initialScore) ? user.initialScore : 0,
      crabCount: Number.isFinite(user.crabCount) ? clamp(user.crabCount, 1, 3) : 1,
    };
  });
}

function VoteMovingBox({ users }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);

  const [scores, setScores] = useState(() =>
    Object.fromEntries(normalizedUsers.map((u) => [u.id, u.initialScore]))
  );
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  // Keep scores in sync when users list changes
  useEffect(() => {
    setScores((prev) =>
      Object.fromEntries(
        normalizedUsers.map((u) => [u.id, prev[u.id] ?? u.initialScore])
      )
    );
  }, [normalizedUsers]);

  // Load tinted crab icon from localStorage
  useEffect(() => {
    let active = true;
    const savedColor = localStorage.getItem("profileCrabColor") || "#e74c3c";
    const savedHat = localStorage.getItem("profileCrabHat") || "";
    const hatSource = savedHat ? hatImages[`../../assets/hats/${savedHat}`] || "" : "";

    createCrabIcon(UserCrabIcon, savedColor, hatSource).then((icon) => {
      if (active) setCrabIcon(icon);
    });

    return () => {
      active = false;
    };
  }, []);

  function handleVote(userId, amount) {
    setScores((prev) => ({
      ...prev,
      [userId]: clamp((prev[userId] ?? 0) + amount, MIN_SCORE, MAX_SCORE),
    }));
  }

  // Sort users by score descending to get rank order (highest = top = index 0)
  const ranked = useMemo(() => {
    return [...normalizedUsers].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
    );
  }, [normalizedUsers, scores]);

  // Total container height so the parent can size itself
  const containerHeight =
    normalizedUsers.length * CARD_HEIGHT + (normalizedUsers.length - 1) * CARD_GAP;

  return (
    <section
      className="vote-box-game"
      aria-label="Vote moving box game"
      style={{ height: containerHeight }}
    >
      {normalizedUsers.map((user) => {
        const rank = ranked.findIndex((u) => u.id === user.id);
        const topPx = rank * (CARD_HEIGHT + CARD_GAP);
        const score = scores[user.id] ?? 0;

        return (
          <article
            key={user.id}
            className="vote-box-card"
            style={{ transform: `translateY(${topPx}px)` }}
            aria-label={`${user.name}, score ${score}`}
          >
            <div className="vote-box-inner">
              <img
                className="vote-box-crab"
                src={crabIcon}
                alt=""
                aria-hidden="true"
              />

              <div className="vote-box-info">
                <p className="vote-box-user-name">{user.name}</p>
                <span className="vote-box-score">{score}</span>
              </div>

              <div className="vote-box-buttons">
                <button
                  type="button"
                  className="vote-box-button vote-box-button--up"
                  onClick={() => handleVote(user.id, 1)}
                  aria-label={`Upvote ${user.name}`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="vote-box-button vote-box-button--down"
                  onClick={() => handleVote(user.id, -1)}
                  aria-label={`Downvote ${user.name}`}
                >
                  ▼
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default VoteMovingBox;
