import React from "react";
import "./LoginRequiredModal.css";

function LoginRequiredModal({ onConfirm, onCancel }) {
  return (
    <div className="login-required-overlay" role="presentation">
      <div
        className="login-required-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
      >
        <p id="login-required-title" className="login-required-message">
          <span>You need to log in first.</span>
          <span>Navigate to the login page?</span>
        </p>
        <div className="login-required-actions">
          <button type="button" onClick={onConfirm}>
            Yes
          </button>
          <button type="button" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredModal;
