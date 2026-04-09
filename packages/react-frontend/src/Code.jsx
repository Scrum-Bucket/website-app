import React from "react";
import { useNavigate } from "react-router-dom";
import "./code.css";

function Code() {
  const navigate = useNavigate();

  return (
    <div className="code-page">
      <p className="code-title">Join by Code or Public</p>

      <div className="code-panel">
        <div className="code-logo" aria-label="logo">
          <span>J</span>
        </div>

        <section className="code-join-box">
          <span className="code-id">A1B2C3</span>
          <button className="code-join-btn" type="button" onClick={() => navigate("/home/room")}>
            Join by
            <br />
            code
          </button>
        </section>

        <button className="code-browse-btn" type="button" onClick={() => navigate("/home/join")}>
          Browse public rooms
        </button>

        <button className="code-browse-btn" type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Code;
