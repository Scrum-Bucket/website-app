import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./edit-crab.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";
import UserCrabIcon from "../../assets/user-crab.png";
import { createCrabIcon } from "./crabColor";

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
  const [crabColor, setCrabColor] = useState(
    localStorage.getItem("profileCrabColor") || "#e74c3c"
  );
  const [crabHat, setCrabHat] = useState(localStorage.getItem("profileCrabHat") || "");
  const [crabIcon, setCrabIcon] = useState(UserCrabIcon);

  useEffect(() => {
    let isActive = true;
    const selectedHat = hats.find((hat) => hat.fileName === crabHat);

    createCrabIcon(UserCrabIcon, crabColor, selectedHat?.source || "").then((nextIcon) => {
      if (isActive) {
        setCrabIcon(nextIcon);
      }
    });

    return () => {
      isActive = false;
    };
  }, [crabColor, crabHat]);

  const handleColorChange = (event) => {
    const nextColor = event.target.value;

    setCrabColor(nextColor);
    localStorage.setItem("profileCrabColor", nextColor);
  };

  const handleHatChange = (nextHat) => {
    setCrabHat(nextHat);

    if (nextHat) {
      localStorage.setItem("profileCrabHat", nextHat);
    } else {
      localStorage.removeItem("profileCrabHat");
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
          <img
            className="edit-crab-preview"
            src={crabIcon}
            alt="Profile icon preview"
          />
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
          <button type="button" className="edit-crab-save-btn" onClick={() => navigate("/home/profile")}>
            Save
          </button>
        </section>
      </div>
    </div>
  );
}

export default EditCrab;
