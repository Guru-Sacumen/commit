import React, { useState, useEffect } from 'react';
import { useAuth } from '../../common/hooks/useAuth';
import TOTPSetupModal from '../../components/TOTPSetupModal';
import './UserProfile.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function UserProfile() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch user data');
      
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEnableTOTP = async () => {
    // If MFA is not enabled, enable it first
    if (!userData.mfa_enabled) {
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/mfa/enable`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to enable MFA');

        // Refresh user data and then show TOTP setup
        await fetchUserData();
        setShowTOTPSetup(true);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      setShowTOTPSetup(true);
    }
    
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleDisableTOTP = async () => {
    if (!window.confirm('Are you sure you want to disable Google Authenticator? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/totp/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to disable TOTP');

      setSuccess('Google Authenticator has been disabled successfully');
      await fetchUserData(); // Refresh user data
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPSetupComplete = () => {
    setShowTOTPSetup(false);
    setSuccess('Google Authenticator has been enabled successfully!');
    fetchUserData(); // Refresh user data
  };

  if (!userData) {
    return null;
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <h1>User Profile</h1>
        <p>Manage your account settings and security preferences</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')} className="alert-close">×</button>
        </div>
      )}

      <div className="profile-sections">
        {/* User Information Section */}
        <div className="profile-section">
          <h2>User Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <div className="info-value">{userData.full_name}</div>
            </div>
            <div className="info-item">
              <label>Email</label>
              <div className="info-value">{userData.email}</div>
            </div>
            <div className="info-item">
              <label>Role</label>
              <div className="info-value">
                <span className={`role-badge ${userData.role?.toLowerCase()}`}>
                  {userData.role}
                </span>
              </div>
            </div>
            <div className="info-item">
              <label>Authentication Provider</label>
              <div className="info-value">{userData.auth_provider}</div>
            </div>
            <div className="info-item">
              <label>Account Created</label>
              <div className="info-value">
                {new Date(userData.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="profile-section">
          <h2>Security Settings</h2>
          <div className="security-options">
            <div className="security-item">
              <div className="security-info">
                <h3>Multi-Factor Authentication (MFA)</h3>
                <p>
                  Enable MFA to add an extra layer of security to your account with time-based one-time passwords
                </p>
                <div className="totp-status">
                  Status: 
                  <span className={`status-badge ${userData.mfa_enabled ? 'enabled' : 'disabled'}`}>
                    {userData.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="security-actions">
                {!userData.mfa_enabled ? (
                  <button
                    onClick={handleEnableTOTP}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Enabling...' : 'Enable MFA'}
                  </button>
                ) : (
                  <button
                    onClick={handleDisableTOTP}
                    disabled={loading}
                    className="btn btn-danger"
                  >
                    {loading ? 'Disabling...' : 'Disable MFA'}
                  </button>
                )}
              </div>
            </div>

            {userData.mfa_enabled && (
              <div className="security-item">
                <div className="security-info">
                  <h3>Google Authenticator (TOTP)</h3>
                  <p>
                    Configure your Google Authenticator app to generate 6-digit codes
                  </p>
                  <div className="totp-status">
                    Status: 
                    <span className={`status-badge ${userData.totp_verified ? 'enabled' : 'disabled'}`}>
                      {userData.totp_verified ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="security-actions">
                  {!userData.totp_verified ? (
                    <button
                      onClick={() => setShowTOTPSetup(true)}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      Setup Authenticator
                    </button>
                  ) : (
                    <button
                      onClick={handleDisableTOTP}
                      disabled={loading}
                      className="btn btn-danger"
                    >
                      {loading ? 'Disabling...' : 'Remove Authenticator'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!userData.mfa_enabled && (
              <div className="security-note">
                <strong>Note:</strong> When you enable MFA, you'll be able to setup Google Authenticator for enhanced security. 
                This is recommended but optional for your account.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOTP Setup Modal */}
      {showTOTPSetup && userData && (
        <TOTPSetupModal
          isOpen={showTOTPSetup}
          onClose={() => setShowTOTPSetup(false)}
          onSetupComplete={handleTOTPSetupComplete}
          user={userData}
        />
      )}
    </div>
  );
}
