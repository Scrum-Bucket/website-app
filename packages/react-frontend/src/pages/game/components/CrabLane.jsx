import { useEffect, useState } from "react";
import UserCrabIcon from "../../../assets/user-crab.png";
import CrownIcon from "../../../assets/hats/crown.png";
import {
  createCrabIcon,
  getHatSourceForCrab,
} from "../../profile/crabColor";

const hatImages = import.meta.glob("../../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

function CrabLane({ hostName, users }) {
  const [crabIcons, setCrabIcons] = useState({});

  useEffect(() => {
    let isActive = true;

    Promise.all(
      users.map(async (user) => {
        const hatSource = getHatSourceForCrab(user.crab, hatImages);
        const crabIcon = await createCrabIcon(UserCrabIcon, user.crab.color, hatSource);

        return [user.id, crabIcon];
      })
    ).then((nextCrabIcons) => {
      if (isActive) {
        setCrabIcons(Object.fromEntries(nextCrabIcons));
      }
    });

    return () => {
      isActive = false;
    };
  }, [users]);

  return (
    <div className="vote-crab-lane" aria-label="Players">
      {users.map((user, index) => {
        const isHost = user.id === hostName || user.name === hostName;

        return (
          <div
            className="vote-player-crab"
            style={{ animationDelay: `${index * 0.18}s` }}
            key={user.id}
          >
            <img src={crabIcons[user.id] || UserCrabIcon} alt="" aria-hidden="true" />
            <div
              className={`vote-player-card${isHost ? " vote-player-card--host" : ""}`}
              aria-label={isHost ? `${user.name}, host` : user.name}
            >
              {isHost && (
                <img className="vote-host-crown" src={CrownIcon} alt="" aria-hidden="true" />
              )}
              <span>{user.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CrabLane;
