import React, { useState, useEffect } from 'react';
import './TOTPSetupModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function TOTPSetupModal({ isOpen, onClose, onSetupComplete, user }) {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('setup'); // 'setup' or 'verify'

  useEffect(() => {
    if (isOpen && user) {
      setupTOTP();
    }
  }, [isOpen, user]);

  const setupTOTP = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('connectx_token');
      const response = await fetch(`${API_BASE_URL}/auth/totp/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to setup TOTP');
      }

      const data = await response.json();
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('connectx_token');
      const response = await fetch(`${API_BASE_URL}/auth/totp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid verification code');
      }

      onSetupComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(secret);
    // You could add a toast notification here
  };

  if (!isOpen) return null;

  return (
    <div className="totp-modal-overlay">
      <div className="totp-modal">
        <div className="totp-modal-header">
          <h2>Setup Google Authenticator</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="totp-modal-content">
          {step === 'setup' && (
            <div className="totp-setup-step">
              <div className="loading-spinner" />
              <p>Setting up Google Authenticator...</p>
            </div>
          )}

          {step === 'verify' && (
            <div className="totp-verify-step">
              <div>
              <div className="qr-section">
                <h3>Scan QR Code</h3>
                <p>Use your Google Authenticator app to scan this QR code:</p>
                {qrCode && (
                  <img 
                    src={`data:image/png;base64,${qrCode}`} 
                    alt="TOTP QR Code" 
                    className="qr-code"
                  />
                )}
              </div>

              <div className="manual-section">
                <h3>Or Enter Manually</h3>
                <p>Can't scan? Enter this code in your app:</p>
                <div className="secret-display">
                  <code>{secret}</code>
                  <button 
                    className="copy-btn" 
                    onClick={copySecretToClipboard}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              </div>
              <div>
              <div className="verification-section">
                <h3>Verify Setup</h3>
                <p>Enter the 6-digit code from your app:</p>
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="totp-input"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="totp-actions">
                <button 
                  className="btn-secondary" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={verifyTOTP}
                  disabled={loading || !verificationCode || verificationCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
