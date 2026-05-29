import React, { useEffect, useMemo, useState } from "react";
import "./VoteMovingBox.css";
import UserCrabIcon from "../../assets/user-crab.png";
import CrownIcon from "../../assets/hats/crown.png";
import {
  createCrabIcon,
  getHatSourceForCrab,
  normalizeCrabProfile,
} from "../profile/crabColor";

const hatImages = import.meta.glob("../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const DEFAULT_USERS = [
  { id: "captain", name: "Captain" },
  { id: "sailor", name: "Sailor" },
  { id: "dj", name: "DJ" },
  { id: "guest", name: "Guest" },
];

const MIN_SCORE = -20;
const MAX_SCORE = 40;
const STACK_CARD_HEIGHT = 86;
const STACK_CARD_GAP = 30;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeUsers(users) {
  const sourceUsers = users?.length ? users : DEFAULT_USERS;

  return sourceUsers.map((user, index) => {
    const isObject = user && typeof user === "object";
    const name = isObject ? user.name || user.userName || `Player ${index + 1}` : String(user);

    return {
      id: isObject ? user.id || user.userId || name : name,
      name,
      crab: normalizeCrabProfile(isObject ? user.crab : {}),
      initialScore: Number.isFinite(user?.initialScore) ? user.initialScore : 0,
      isHost: Boolean(user?.isHost),
    };
  });
}

function CrabAvatar({ crab }) {
  const [icon, setIcon] = useState(UserCrabIcon);

  useEffect(() => {
    let active = true;
    const normalizedCrab = normalizeCrabProfile(crab);
    const hatSource = getHatSourceForCrab(normalizedCrab, hatImages);

    createCrabIcon(UserCrabIcon, normalizedCrab.color, hatSource).then((createdIcon) => {
      if (active) {
        setIcon(createdIcon);
      }
    });

    return () => {
      active = false;
    };
  }, [crab]);

  return <img src={icon} alt="" aria-hidden="true" />;
}

function VoteMovingBox({ users }) {
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);
  const [scores, setScores] = useState(() =>
    Object.fromEntries(normalizedUsers.map((user) => [user.id, user.initialScore]))
  );

  useEffect(() => {
    setScores((previousScores) =>
      Object.fromEntries(
        normalizedUsers.map((user) => [
          user.id,
          previousScores[user.id] ?? user.initialScore,
        ])
      )
    );
  }, [normalizedUsers]);

  const rankedUsers = useMemo(
    () =>
      [...normalizedUsers].sort(
        (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
      ),
    [normalizedUsers, scores]
  );

  const stackHeight =
    normalizedUsers.length * STACK_CARD_HEIGHT +
    Math.max(0, normalizedUsers.length - 1) * STACK_CARD_GAP;

  function handleVote(userId, amount) {
    setScores((previousScores) => ({
      ...previousScores,
      [userId]: clamp((previousScores[userId] ?? 0) + amount, MIN_SCORE, MAX_SCORE),
    }));
  }

  return (
    <section className="vote-game-shell" aria-label="Voting game">
      <aside className="vote-song-picker" aria-label="Round status">
        <div className="vote-panel-heading">
          <p className="vote-panel-kicker">Players</p>
          <strong>Vote stack</strong>
        </div>

        <div className="vote-song-empty">
          Use the up and down buttons to move players in the vote stack.
        </div>
      </aside>

      <main className="vote-play-area">
        <section className="vote-arena" style={{ "--vote-arena-height": `${stackHeight + 132}px` }}>
          <header className="vote-round-status">
            <div>
              <p className="vote-panel-kicker">Round</p>
              <strong>Voting</strong>
              <span>{normalizedUsers.length} players connected</span>
            </div>
            <div>
              <p className="vote-panel-kicker">Leader</p>
              <strong>{rankedUsers[0]?.name || "Waiting"}</strong>
              <span>Score {scores[rankedUsers[0]?.id] ?? 0}</span>
            </div>
          </header>

          <div className="vote-box-game vote-box-game--stacked">
            <div className="vote-box-scroll-area" style={{ minHeight: stackHeight }}>
              {normalizedUsers.map((user) => {
                const stackIndex = rankedUsers.findIndex((rankedUser) => rankedUser.id === user.id);

                return (
                  <article
                    className="vote-box-row"
                    key={user.id}
                    style={{
                      transform: `translateY(${stackIndex * (STACK_CARD_HEIGHT + STACK_CARD_GAP)}px)`,
                    }}
                  >
                    <div className="vote-box-bar">
                      <CrabAvatar crab={user.crab} />

                      <div className="vote-box-track">
                        <span className="vote-box-track-title">{user.name}</span>
                        <span className="vote-box-track-artist">
                          Rank {stackIndex + 1}
                        </span>
                      </div>

                      <div className="vote-box-actions">
                        <span className="vote-box-score">{scores[user.id] ?? 0}</span>
                        <button
                          type="button"
                          className="vote-box-button vote-box-button--up"
                          onClick={() => handleVote(user.id, 1)}
                          aria-label={`Upvote ${user.name}`}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="vote-box-button vote-box-button--down"
                          onClick={() => handleVote(user.id, -1)}
                          aria-label={`Downvote ${user.name}`}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="vote-crab-lane" aria-label="Players">
          {rankedUsers.map((user, index) => (
            <div className="vote-player-crab" key={user.id}>
              <CrabAvatar crab={user.crab} />
              <div className={index === 0 ? "vote-player-card vote-player-card--host" : "vote-player-card"}>
                {index === 0 && <img className="vote-host-crown" src={CrownIcon} alt="" />}
                <span>{user.name}</span>
              </div>
            </div>
          ))}
        </section>
      </main>
    </section>
  );
}

export default VoteMovingBox;
