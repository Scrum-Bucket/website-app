import { useEffect, useRef, useState } from "react";
import {
  getPlayableVideoId,
  loadYouTubeApi,
} from "./youtubeApi";

function YouTubeSongPlayer({ onEnded, song }) {
  const playerHostRef = useRef(null);
  const playerRef = useRef(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const bufferingTimeoutRef = useRef(null);
  const videoId = getPlayableVideoId(song);
  const [playerError, setPlayerError] = useState({ videoId: "", message: "" });
  const activePlayerError = playerError.videoId === videoId ? playerError.message : "";

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    endedRef.current = false;

    function clearBufferingTimeout() {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }

    function startBufferingTimeout() {
      clearBufferingTimeout();
      bufferingTimeoutRef.current = setTimeout(() => {
        if (isActive) {
          setPlayerError({ videoId, message: "This song got stuck loading." });
        }
      }, 10000);
    }

    if (!videoId) {
      return undefined;
    }

    let isActive = true;
    const timeoutId = setTimeout(() => {
      if (isActive && !playerRef.current) {
        setPlayerError({ videoId, message: "This song is taking too long to load." });
      }
    }, 8000);

    loadYouTubeApi().then((YT) => {
      if (!isActive || !YT?.Player || !playerHostRef.current) {
        if (isActive) {
          setPlayerError({ videoId, message: "The YouTube player could not load." });
        }
        return;
      }

      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady() {
            clearTimeout(timeoutId);
          },
          onError() {
            if (isActive) {
              clearBufferingTimeout();
              setPlayerError({ videoId, message: "This YouTube song could not be played here." });
            }
          },
          onStateChange(event) {
            if (event.data === YT.PlayerState.PLAYING) {
              clearTimeout(timeoutId);
              clearBufferingTimeout();
            }

            if (event.data === YT.PlayerState.BUFFERING) {
              startBufferingTimeout();
            }

            if (event.data === YT.PlayerState.ENDED && !endedRef.current) {
              clearBufferingTimeout();
              endedRef.current = true;
              onEndedRef.current?.();
            }
          },
        },
      });
    });

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      clearBufferingTimeout();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [song?.entryId, videoId]);

  if (!videoId || activePlayerError) {
    return (
      <div className="vote-song-player-missing">
        <p>
          {activePlayerError || "This winning song does not have a playable YouTube link saved."}
        </p>
        {song?.songLink ? (
          <a href={song.songLink} target="_blank" rel="noreferrer">
            Open song
          </a>
        ) : null}
      </div>
    );
  }

  return <div className="vote-song-player-frame" ref={playerHostRef} />;
}

export default YouTubeSongPlayer;
