import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./edit-crab.css";
import OtherBackground from "../../../animationFiles/other-background.jsx";
import HouseIcon from "../../assets/House.PNG";
import UserCrabIcon from "../../assets/user-crab.png";

function getHueFromHex(hexColor) {
  const normalizedColor = hexColor.replace("#", "");
  const red = parseInt(normalizedColor.slice(0, 2), 16) / 255;
  const green = parseInt(normalizedColor.slice(2, 4), 16) / 255;
  const blue = parseInt(normalizedColor.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return 0;
  }

  if (max === red) {
    return Math.round(60 * (((green - blue) / delta) % 6));
  }

  if (max === green) {
    return Math.round(60 * ((blue - red) / delta + 2));
  }

  return Math.round(60 * ((red - green) / delta + 4));
}

function EditCrab() {
  const navigate = useNavigate();
  const [crabColor, setCrabColor] = useState(
    localStorage.getItem("profileCrabColor") || "#e74c3c"
  );
  const crabHue = getHueFromHex(crabColor);

  const handleColorChange = (event) => {
    const nextColor = event.target.value;
    const nextHue = getHueFromHex(nextColor);

    setCrabColor(nextColor);
    localStorage.setItem("profileCrabColor", nextColor);
    localStorage.setItem("profileCrabHue", String(nextHue));
  };

  return (
    <div className="edit-crab-page">
      <OtherBackground />
      <div className="edit-crab-window">
        <header className="edit-crab-header">
          <h1>Edit Icon</h1>
          <button type="button" className="edit-crab-home-btn" onClick={() => navigate("/home/profile")}>
            <img src={HouseIcon} alt="Back to Profile" />
          </button>
        </header>

        <section className="edit-crab-preview-wrap">
          <img
            className="edit-crab-preview"
            src={UserCrabIcon}
            alt="Profile icon preview"
            style={{ "--crab-hue": `${crabHue}deg` }}
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
          <button type="button" className="edit-crab-save-btn" onClick={() => navigate("/home/profile")}>
            Save
          </button>
        </section>
      </div>
    </div>
  );
}

export default EditCrab;
