import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./edit-crab.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";
import UserCrabIcon from "../../assets/user-crab.png";
import { authFetch } from "../../authFetch";
import frontendLink from "../../frontendLink";
import {
  createCrabIcon,
  getHatSourceForCrab,
  readStoredCrabProfile,
  writeStoredCrabProfile,
} from "./crabColor";

const hatImages = import.meta.glob("../../assets/hats/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const hats = Object.entries(hatImages).map(([path, source]) => {
  const fileName = path.split("/").pop();
  const label = fileName
    .replace(".png", "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return { fileName, label, source };
});

function EditCrab() {
  const navigate = useNavigate();
  const initialUserId = localStorage.getItem("userId");
  const storedCrabProfile = readStoredCrabProfile(initialUserId);
  const [crabColor, setCrabColor] = useState(storedCrabProfile.color);
  const [crabHat, setCrabHat] = useState(storedCrabProfile.hat);
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  useEffect(() => {
    let isActive = true;

    const syncSavedCrab = async () => {
      try {
        const response = await authFetch(`${frontendLink}/users/me`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data._id) {
          localStorage.setItem("userId", data._id);
        }
        if (data.userName) {
          localStorage.setItem("username", data.userName);
        }

        const savedCrab = writeStoredCrabProfile(data.crab, data._id);

        if (isActive) {
          setCrabColor(savedCrab.color);
          setCrabHat(savedCrab.hat);
        }
      } catch (error) {
        console.error("Failed to load saved crab:", error);
      }
    };

    syncSavedCrab();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const hatSource = getHatSourceForCrab({ color: crabColor, hat: crabHat }, hatImages);

    createCrabIcon(UserCrabIcon, crabColor, hatSource).then((nextIcon) => {
      if (isActive) {
        setCrabIcon(nextIcon);
      }
    });

    return () => {
      isActive = false;
    };
  }, [crabColor, crabHat]);

  const handleColorChange = (event) => {
    setCrabColor(event.target.value);
  };

  const handleHatChange = (nextHat) => {
    setCrabHat(nextHat);
  };

  const handleSave = async () => {
    const nextCrab = {
      color: crabColor,
      hat: crabHat,
    };
    const userId = localStorage.getItem("userId");

    try {
      const response = await authFetch(`${frontendLink}/users/me/prefs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crab: nextCrab }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Could not save crab.");
      }

      const savedUser = await response.json();
      writeStoredCrabProfile(savedUser.crab || nextCrab, savedUser._id || userId);
      navigate("/home/profile");
    } catch (error) {
      console.error("Failed to save crab:", error);
      alert("Failed to save crab: " + error.message);
    }
  };

  return (
    <div className="edit-crab-page">
      <OtherBackground />
      <div className="edit-crab-window">
        <header className="edit-crab-header">
          <h1>Edit Icon</h1>
          <button
            type="button"
            className="edit-crab-home-btn"
            onClick={() => navigate("/home/profile")}
          >
            <img src={HouseIcon} alt="Back to Profile" />
          </button>
        </header>

        <section className="edit-crab-preview-wrap">
          <img className="edit-crab-preview" src={crabIcon} alt="Profile icon preview" />
        </section>

        <section className="edit-crab-controls">
          <label className="edit-crab-color-label" htmlFor="crab-color">
            <span>Icon color</span>
            <input
              id="crab-color"
              type="color"
              value={crabColor}
              onChange={handleColorChange}
              aria-label="Choose profile icon color"
            />
          </label>
          <div className="edit-crab-hats" aria-label="Choose profile hat">
            <button
              type="button"
              className={`edit-crab-hat-btn${crabHat === "" ? " is-selected" : ""}`}
              onClick={() => handleHatChange("")}
            >
              None
            </button>
            {hats.map((hat) => (
              <button
                type="button"
                className={`edit-crab-hat-btn${crabHat === hat.fileName ? " is-selected" : ""}`}
                key={hat.fileName}
                onClick={() => handleHatChange(hat.fileName)}
                aria-label={hat.label}
                title={hat.label}
              >
                <img src={hat.source} alt="" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" className="edit-crab-save-btn" onClick={handleSave}>
            Save
          </button>
        </section>
      </div>
    </div>
  );
}

export default EditCrab;
