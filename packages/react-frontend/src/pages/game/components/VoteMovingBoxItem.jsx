import { useEffect, useRef } from "react";
import { VOTE_BOX_COLORS } from "../gameConfig/constants";

function VoteMovingBoxItem({
  canDelete,
  entry,
  isVotingPaused,
  onDelete,
  onHeightChange,
  onVote,
  topOffset,
}) {
  const rowRef = useRef(null);
  const { song, score } = entry;
  const color = VOTE_BOX_COLORS[entry.colorIndex % VOTE_BOX_COLORS.length];

  useEffect(() => {
    const row = rowRef.current;
    if (!row || !onHeightChange) return undefined;

    const measure = () => {
      onHeightChange(entry.entryId, Math.ceil(row.getBoundingClientRect().height));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(row);

    return () => observer.disconnect();
  }, [entry.entryId, onHeightChange]);

  return (
    <article
      className="vote-box-row"
      ref={rowRef}
      style={{
        "--vote-box-start": color.start,
        "--vote-box-middle": color.middle,
        "--vote-box-end": color.end,
        transform: `translateY(${topOffset}px)`,
      }}
    >
      <div className="vote-box-bar" aria-label={`${song.name} score ${score}`}>
        <span className="vote-box-score">{score}</span>
        <div className="vote-box-track">
          {song.thumbnail && (
            <img className="vote-song-thumbnail" src={song.thumbnail} alt="" aria-hidden="true" />
          )}
          <div className="vote-box-track-text">
            <span className="vote-box-track-title">{song.name}</span>
            <span className="vote-box-track-artist">{song.artist}</span>
          </div>
        </div>
        <div className="vote-box-actions">
          <button
            type="button"
            className="vote-box-button vote-box-button--up"
            onClick={() => onVote(entry.entryId, 1)}
            disabled={isVotingPaused}
            aria-label={`Upvote ${song.name}`}
          >
            Up
          </button>
          <button
            type="button"
            className="vote-box-button vote-box-button--down"
            onClick={() => onVote(entry.entryId, -1)}
            disabled={isVotingPaused}
            aria-label={`Downvote ${song.name}`}
          >
            Down
          </button>
          {canDelete && (
            <button
              type="button"
              className="vote-box-button vote-box-button--delete"
              onClick={() => onDelete(entry.entryId)}
              aria-label={`Delete ${song.name}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default VoteMovingBoxItem;
