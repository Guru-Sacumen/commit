import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import './ResetPassword.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if reset token exists
  useEffect(() => {
    const resetToken = localStorage.getItem('reset_token');
    if (!resetToken) {
      navigate('/forgot-password');
    }
  }, [navigate]);

  const validatePassword = (pwd) => {
    const requirements = [
      { test: pwd.length >= 8, message: 'At least 8 characters' },
      { test: /[A-Z]/.test(pwd), message: 'One uppercase letter' },
      { test: /[a-z]/.test(pwd), message: 'One lowercase letter' },
      { test: /\d/.test(pwd), message: 'One number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(pwd), message: 'One special character' }
    ];
    
    return requirements;
  };

  const passwordRequirements = validatePassword(password);
  const isPasswordValid = passwordRequirements.every(req => req.test);
  const doPasswordsMatch = password === confirmPassword && password !== '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    const resetToken = localStorage.getItem('reset_token');
    if (!resetToken) {
      setError('Reset token not found. Please start over.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: resetToken,
          new_password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Clean up
        localStorage.removeItem('reset_token');
        localStorage.removeItem('forgot_password_email');
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div data-theme={theme} className="reset-password-body">
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

        <div className="reset-password-container">
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

          <div className="success-content">
            <CheckCircle className="success-icon" size={64} />
            <h1>Password Reset Successful!</h1>
            <p>
              Your password has been successfully reset. 
              You can now use your new password to sign in to your account.
            </p>
            
            <button 
              className="btn-login"
              onClick={() => navigate('/login')}
            >
              Sign In with New Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="reset-password-body">
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

      <div className="reset-password-container">
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

        {/* Back to Login */}
        <button 
          className="back-to-login"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={20} />
          Back to Login
        </button>

        <div className="reset-password-content">
          <div className="reset-password-header">
            <Lock className="reset-password-icon" size={48} />
            <h1>Reset Password</h1>
            <p>
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>

          <form className="reset-password-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="password">New Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
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

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  {passwordRequirements.map((req, index) => (
                    <li key={index} className={req.test ? 'valid' : 'invalid'}>
                      {req.test ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {req.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="password-match">
                <div className={`match-indicator ${doPasswordsMatch ? 'valid' : 'invalid'}`}>
                  {doPasswordsMatch ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <button 
              className="btn-submit" 
              type="submit" 
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="form-footer">
            <span
              className="toggle-link"
              onClick={() => navigate('/login')}
            >
              Remember your password? Sign in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
