import {
  STACK_CARD_GAP,
  STACK_CARD_HEIGHT,
  VOTE_BOX_COLORS,
} from "./constants";

function VoteMovingBoxItem({ canDelete, entry, isVotingPaused, onDelete, onVote, stackIndex }) {
  const { song, score } = entry;
  const color = VOTE_BOX_COLORS[entry.colorIndex % VOTE_BOX_COLORS.length];

  return (
    <article
      className="vote-box-row"
      style={{
        "--vote-box-start": color.start,
        "--vote-box-middle": color.middle,
        "--vote-box-end": color.end,
        transform: `translateY(${stackIndex * (STACK_CARD_HEIGHT + STACK_CARD_GAP)}px)`,
      }}
    >
      <div className="vote-box-bar" aria-label={`${song.name} score ${score}`}>
        <span className="vote-box-score">{score}</span>
        <div className="vote-box-track">
          <span className="vote-box-track-title">{song.name}</span>
          <span className="vote-box-track-artist">{song.artist}</span>
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
