import React, { useState } from 'react';
import './TOTPVerification.css';

export default function TOTPVerification({ onVerify, onCancel, error, loading }) {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6) {
      onVerify(code);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="totp-verification-container">
      <div className="totp-verification-card">
        <div className="totp-verification-header">
          <h2>Two-Factor Authentication</h2>
          <p>Enter the 6-digit code from your Google Authenticator app</p>
        </div>

        <form onSubmit={handleSubmit} className="totp-verification-form">
          <div className="code-input-group">
            <input
              type="text"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={handleChange}
              placeholder="000000"
              className="code-input w-full"
              autoFocus
            />
            <div className="code-dots">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`dot ${i < code.length ? 'filled' : ''}`} />
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="verification-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-verify"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        <div className="help-section">
          <h3>Need help?</h3>
          <ul>
            <li>Make sure your device's time is correct</li>
            <li>Try generating a new code from your app</li>
            <li>Contact your administrator if you continue to have issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
