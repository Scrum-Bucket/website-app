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
const MAX_TRAVEL = 92;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeUsers(users) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const name = typeof user === "string" ? user : user.name || user.userName || `User ${index + 1}`;

    return {
      id: user.id || user.userId || name,
      name,
      initialScore: Number.isFinite(user.initialScore) ? user.initialScore : 0,
      crabCount: Number.isFinite(user.crabCount) ? clamp(user.crabCount, 1, 3) : 1,
    };
  });
}

function getMoveOffset(score) {
  const clampedScore = clamp(score, MIN_SCORE, MAX_SCORE);
  const scoreRange = MAX_SCORE - MIN_SCORE;
  const normalizedScore = (clampedScore - MIN_SCORE) / scoreRange;

  return MAX_TRAVEL - normalizedScore * MAX_TRAVEL * 2;
}

function VoteMovingBoxItem({ user, score, crabIcon, onVote }) {
  const moveOffset = getMoveOffset(score);

  return (
    <article className="vote-box-card">
      <div className="vote-box-stage" aria-label={`${user.name} score position`}>
        <div
          className="vote-box-bar"
          style={{ transform: `translateY(${moveOffset}px)` }}
        >
          <button
            type="button"
            className="vote-box-button vote-box-button--up"
            onClick={() => onVote(user.id, 1)}
            aria-label={`Upvote ${user.name}`}
          >
            Up
          </button>
          <span className="vote-box-score">{score}</span>
          <button
            type="button"
            className="vote-box-button vote-box-button--down"
            onClick={() => onVote(user.id, -1)}
            aria-label={`Downvote ${user.name}`}
          >
            Down
          </button>
        </div>
        <div className="vote-box-crabs">
          {Array.from({ length: user.crabCount }).map((_, index) => (
            <img
              className="vote-box-crab"
              src={crabIcon}
              alt=""
              aria-hidden="true"
              key={`${user.id}-crab-${index}`}
            />
          ))}
        </div>
      </div>

      <p className="vote-box-user-name">{user.name}</p>
    </article>
  );
}

function VoteMovingBox({ users }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const [scores, setScores] = useState(() =>
    Object.fromEntries(normalizedUsers.map((user) => [user.id, user.initialScore]))
  );
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  useEffect(() => {
    setScores((currentScores) =>
      Object.fromEntries(
        normalizedUsers.map((user) => [
          user.id,
          currentScores[user.id] ?? user.initialScore,
        ])
      )
    );
  }, [normalizedUsers]);

  useEffect(() => {
    let isActive = true;
    const savedColor = localStorage.getItem("profileCrabColor") || "#e74c3c";
    const savedHat = localStorage.getItem("profileCrabHat") || "";
    const hatSource = savedHat ? hatImages[`../../assets/hats/${savedHat}`] || "" : "";

    createCrabIcon(UserCrabIcon, savedColor, hatSource).then((nextIcon) => {
      if (isActive) {
        setCrabIcon(nextIcon);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const handleVote = (userId, amount) => {
    setScores((currentScores) => ({
      ...currentScores,
      [userId]: clamp((currentScores[userId] ?? 0) + amount, MIN_SCORE, MAX_SCORE),
    }));
  };

  return (
    <section className="vote-box-game" aria-label="Vote moving box game">
      {normalizedUsers.map((user) => (
        <VoteMovingBoxItem
          user={user}
          score={scores[user.id] ?? 0}
          crabIcon={crabIcon}
          onVote={handleVote}
          key={user.id}
        />
      ))}
    </section>
  );
}

export default VoteMovingBox;
