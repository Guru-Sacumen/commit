import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../common/hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import TOTPVerification from '../../components/TOTPVerification';
import TOTPSetupModal from '../../components/TOTPSetupModal';
import './login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function decodeTokenPayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTOTPVerification, setShowTOTPVerification] = useState(false);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) return;

    setLoading(true);
    try {
      // First, try to get a token using the regular login endpoint
      const formBody = new URLSearchParams();
      formBody.append('username', email);
      formBody.append('password', password);

      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(errorText || `Login failed (${loginResponse.status})`);
      }

      const tokenData = await loginResponse.json();
      const token = tokenData.access_token;

      // Store token temporarily
      localStorage.setItem('connectx_token', token);

      // Get user details to check TOTP status
      const meResponse = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error('Failed to get user details');
      }

      const userData = await meResponse.json();
      
      // Check if user needs TOTP setup
      if (userData.mfa_enabled && !userData.totp_verified) {
        // User needs to setup TOTP first
        setCurrentUser(userData);
        setShowTOTPSetup(true);
        return;
      }

      // Check if user needs TOTP verification
      if (userData.mfa_enabled && userData.totp_verified) {
        // User has TOTP set up, need to verify
        setPendingCredentials({ email, password });
        setShowTOTPVerification(true);
        return;
      }

      // No TOTP required, proceed with normal login
      handleSuccessfulLogin(tokenData);

    } catch (err) {
      console.error(err);
      setError('Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const handleSuccessfulLogin = async (tokenData) => {
    const token = tokenData.access_token;
    
    // Prefer tenant from JWT payload to avoid stale/default tenant mismatch
    const tokenPayload = decodeTokenPayload(token);
    const tenantFromToken = tokenPayload?.tenant_id;
    if (tenantFromToken) {
      localStorage.setItem('connectx_tenant_id', tenantFromToken);
    }

    // Get user data for navigation
    let userData = {
      email: email,
      role: 'user',
      full_name: email.split('@')[0], // Default to email prefix
    };

    const meRes = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (meRes.ok) {
      const me = await meRes.json();
      if (me.role) userData.role = me.role;
      if (me.email) userData.email = me.email;
      if (me.full_name) userData.full_name = me.full_name;
      if (me.superadmin !== undefined) userData.superadmin = me.superadmin;
    }

    // Fallback tenant id from env (only if JWT did not include one)
    if (!tenantFromToken) {
      const tenantId = import.meta.env.VITE_TENANT_ID;
      if (tenantId) {
        localStorage.setItem('connectx_tenant_id', tenantId);
      }
    }

    // Use the auth context login function
    login(token, userData);
    
    // Navigate based on user role
    if (userData.superadmin) {
      console.log('LoginPage - Superadmin login, navigating to /admin/overview');
      navigate('/admin/overview');
    } else {
      console.log('LoginPage - Regular user login, navigating to /integration-library');
      navigate('/integration-library');
    }
  };

  const handleTOTPVerify = async (totpCode) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-with-totp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: pendingCredentials.email,
          password: pendingCredentials.password,
          totp_token: totpCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowTOTPVerification(false);
        setPendingCredentials(null);
        handleSuccessfulLogin(data);
      } else {
        throw new Error(data.detail || 'Invalid TOTP token');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPCancel = () => {
    setShowTOTPVerification(false);
    setPendingCredentials(null);
    setError('');
  };

  const handleTOTPSetupComplete = () => {
    setShowTOTPSetup(false);
    // Navigate to dashboard after successful TOTP setup
    if (currentUser?.superadmin) {
      navigate('/admin/overview');
    } else {
      navigate('/integration-library');
    }
  };

  return (
    <div data-theme={theme} className="login-body">
      <div className="bg-shape shape-1" />
      <div className="bg-shape shape-2" />

      {/* Theme Toggle - Top Right */}
      <div className="theme-toggle-container" style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <ThemeToggle />
      </div>

      <div className="login-container">
        <div className="logo-container">
          <img
            src="https://dummyimage.com/200x48/0a1526/ffffff&text=ConnectX"
            alt="ConnectX"
            className="main-logo"
          />
          <div className="powered-by">
            <span>POWERED BY</span>
            <img
              src="https://dummyimage.com/80x16/0a1526/ffffff&text=Sacumen"
              alt="Sacumen"
            />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Work Email</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : isSigningUp ? 'Create account' : 'Sign in'}
          </button>

          <div className="form-footer">
            <span
              className="toggle-link"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </span>
          </div>
          <button
            type="button"
            className="google-login-btn"
            disabled={loading}
            onClick={async () => {
              // naive prompt-based Google flow stub
              const subject = window.prompt('Enter Google subject ID (e.g. from OAuth)');
              if (!subject) return;
              setLoading(true);
              try {
                const res = await fetch(`${API_BASE_URL}/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, full_name: '', google_subject: subject }),
                });
                if (!res.ok) {
                  throw new Error('Google sign-in failed');
                }
                // Robust parsing for Google flow as well
                const raw = await res.text();
                let parsed = null;
                if (raw) {
                  try {
                    parsed = JSON.parse(raw);
                  } catch {
                    parsed = raw.trim();
                  }
                }
                const token =
                  (parsed && typeof parsed === 'object' && (parsed.access_token || parsed.token)) ||
                  (typeof parsed === 'string' && parsed) ||
                  null;
                if (!token) throw new Error('No access token returned from /auth/google');
                localStorage.setItem('connectx_token', token);
                const meRes = await fetch(`${API_BASE_URL}/me`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (meRes.ok) {
                  const me = await meRes.json();
                  if (me.role) localStorage.setItem('connectx_role', me.role);
                  if (me.email) localStorage.setItem('connectx_email', me.email);
                  if (me.full_name) localStorage.setItem('connectx_full_name', me.full_name);
                }
                navigate('/integration-library');
              } catch (err) {
                console.error(err);
                setError('Google login failed.');
              } finally {
                setLoading(false);
              }
            }}
          >
            Sign in with Google
          </button>
        </form>
      </div>

      {/* TOTP Verification Modal */}
      {showTOTPVerification && (
        <TOTPVerification
          onVerify={handleTOTPVerify}
          onCancel={handleTOTPCancel}
          error={error}
          loading={loading}
        />
      )}

      {/* TOTP Setup Modal */}
      {showTOTPSetup && currentUser && (
        <TOTPSetupModal
          isOpen={showTOTPSetup}
          onClose={() => setShowTOTPSetup(false)}
          onSetupComplete={handleTOTPSetupComplete}
          user={currentUser}
        />
      )}
    </div>
  );
}
