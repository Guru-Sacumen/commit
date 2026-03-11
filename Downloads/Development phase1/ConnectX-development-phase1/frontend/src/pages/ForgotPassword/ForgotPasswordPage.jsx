import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import "./ForgotPassword.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState(""); // Store submitted email

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setSubmittedEmail(email); // Store the email before clearing
        setEmail(""); // Clear email form
      } else {
        setError(data.detail || "Failed to send verification code");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme} className="forgot-password-body">
      <div className="bg-shape shape-1" />
      <div className="bg-shape shape-2" />

      {/* Theme Toggle - Top Right */}
      <div
        className="theme-toggle-container"
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 1000,
        }}
      >
        <ThemeToggle />
      </div>

      <div className="forgot-password-container">
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
        <button className="back-to-login" onClick={() => navigate("/login")}>
          <ArrowLeft size={20} />
          Back to Login
        </button>

        <div className="forgot-password-content">
          {!success && (
            <div className="forgot-password-header">
              <Mail className="forgot-password-icon" size={48} />
              <h1>Forgot Password?</h1>
              <p>
                No worries! Enter your email address below and we'll send you a
                6-digit verification code to reset your password.
              </p>
            </div>
          )}

          {!success ? (
            <form className="forgot-password-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <div className="success-message">
              <div className="success-icon">✉️</div>
              <h2>Check Your Email</h2>
              <p>
                We've sent a 6-digit verification code to your email address.
                The code will expire in 10 minutes.
              </p>
              <div className="next-steps">
                <p>
                  <strong>Next steps:</strong>
                </p>
                <ol>
                  <li>
                    Check your email inbox, find the verification code, and
                    enter it on the verification page.
                  </li>{" "}
                </ol>
              </div>
              <button
                className="btn-verify-code"
                onClick={() => {
                  navigate("/verify-code", {
                    state: { email: submittedEmail },
                  });
                }}
              >
                Enter Verification Code
              </button>
            </div>
          )}

          <div className="form-footer">
            <span className="toggle-link" onClick={() => navigate("/login")}>
              Remember your password? Sign in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
