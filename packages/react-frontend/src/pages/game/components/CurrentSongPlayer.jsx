import YouTubeSongPlayer from "./YouTubeSongPlayer";

function CurrentSongPlayer({ canControl, onComplete, shouldPlayAudio, song }) {
  if (!shouldPlayAudio) {
    return (
      <section className="vote-current-song" aria-label="Current song">
        <div className="vote-song-player-missing">
          <p>The host is playing this song on their computer.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="vote-current-song" aria-label="Current song">
      <YouTubeSongPlayer song={song} onEnded={canControl ? onComplete : undefined} />
    </section>
  );
}

export default CurrentSongPlayer;
