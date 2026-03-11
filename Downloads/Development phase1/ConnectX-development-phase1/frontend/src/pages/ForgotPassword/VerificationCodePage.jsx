import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import './VerificationCode.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function VerificationCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Get email from navigation state or localStorage
  const email = location.state?.email || localStorage.getItem('forgot_password_email') || '';
  

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  // Store email for persistence
  useEffect(() => {
    if (email) {
      localStorage.setItem('forgot_password_email', email);
    }
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
    
    // Handle paste
    if (e.key === 'Enter' && code.every(digit => digit !== '')) {
      handleSubmit(e);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only allow 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      
      // Focus last input
      const lastInput = document.getElementById('code-input-5');
      if (lastInput) lastInput.focus();
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!email) {
      setError('Email not found. Please start over.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code: fullCode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store reset token and navigate to reset password page
        localStorage.setItem('reset_token', data.reset_token);
        localStorage.removeItem('forgot_password_email'); // Clean up
        navigate('/reset-password');
      } else {
        setError(data.detail || 'Invalid verification code');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email) return;
    
    setResendLoading(true);
    setError('');
    setResendSuccess(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        setTimeLeft(600); // Reset timer
        setCode(['', '', '', '', '', '']); // Clear code inputs
        
        // Focus first input
        const firstInput = document.getElementById('code-input-0');
        if (firstInput) firstInput.focus();
        
        // Hide success message after 3 seconds
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        setError(data.detail || 'Failed to resend code');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  const isExpired = timeLeft === 0;

  return (
    <div data-theme={theme} className="verification-body">
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

      <div className="verification-container">
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

        {/* Back to Forgot Password */}
        <button 
          className="back-to-forgot"
          onClick={() => navigate('/forgot-password')}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="verification-content">
          <div className="verification-header">
            <Shield className="verification-icon" size={48} />
            <h1>Enter Verification Code</h1>
            <p>
              We've sent a 6-digit code to <strong>{email}</strong>. 
              Enter it below to verify your identity.
            </p>
            <div className="timer">
              {isExpired ? (
                <span className="expired">Code expired</span>
              ) : (
                <span>Code expires in {formatTime(timeLeft)}</span>
              )}
            </div>
          </div>

          <form className="verification-form" onSubmit={handleSubmit}>
            <div className="code-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-input-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading || isExpired}
                  className="code-input"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {error && <div className="form-error">{error}</div>}
            
            {resendSuccess && (
              <div className="form-success">
                New verification code sent successfully!
              </div>
            )}

            <button 
              className="btn-submit" 
              type="submit" 
              disabled={loading || code.join('').length !== 6 || isExpired}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <div className="resend-section">
            <p>Didn't receive the code?</p>
            <button
              className="btn-resend"
              onClick={handleResendCode}
              disabled={resendLoading || resendLoading}
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Sending...
                </>
              ) : (
                'Resend Code'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
