import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function SongPicker({ isGuest, onAddSong, onLoginRequired, songs }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const filteredSongs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return songs;
    }

    return songs.filter((song) => song.name.toLowerCase().includes(normalizedSearch));
  }, [songs, searchTerm]);
  const handleOpenPlaylist = () => {
    if (isGuest) {
      onLoginRequired?.();
      return;
    }

    navigate("/home/playlist", {
      state: {
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  return (
    <aside className="vote-song-picker" aria-label="Choose songs">
      <div className="vote-panel-heading">
        <p className="vote-panel-kicker">Song window</p>
        <button className="vote-add-songs-link" type="button" onClick={handleOpenPlaylist}>
          Add songs
        </button>
      </div>

      {songs.length ? (
        <>
          <input
            className="vote-song-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search songs"
            aria-label="Search songs by title"
          />

          {filteredSongs.length ? (
            <div className="vote-song-list">
              {filteredSongs.map((song) => (
                <button
                  className="vote-song-option"
                  type="button"
                  onClick={() => onAddSong(song)}
                  key={song.id}
                >
                  <span>{song.name}</span>
                  <small>
                    {song.artist} / {song.source}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="vote-song-empty">No matching songs</p>
          )}
        </>
      ) : (
        <p className="vote-song-empty">No songs available</p>
      )}
    </aside>
  );
}

export default SongPicker;
