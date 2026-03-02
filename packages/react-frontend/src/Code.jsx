import React from "react";
import "./code.css";

function Code({ onBackHome, onJoinCode, onBrowsePublic }) {
  return (
    <div className="code-page">
      <p className="code-title">Join by Code or Public</p>

      <div className="code-panel">
        <div className="code-logo" aria-label="logo">
          <span>J</span>
        </div>

        <section className="code-join-box">
          <span className="code-id">A1B2C3</span>
          <button className="code-join-btn" type="button" onClick={onJoinCode}>
            Join by
            <br />
            code
          </button>
        </section>

        <button className="code-browse-btn" type="button" onClick={onBrowsePublic}>
          Browse public rooms
        </button>

        <button className="code-browse-btn" type="button" onClick={onBackHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Code;
