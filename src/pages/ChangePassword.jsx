import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/users";
import { useAuth } from "../context/AuthContext";
import "./ChangePassword.css";
import logo from "../assets/logo.png";

function ChangePassword() {
  const navigate = useNavigate();
  const { user, logout, clearFirstLogin } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getStrength = (pwd) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 8) return "weak";
    if (pwd.length < 12) return "medium";
    return "strong";
  };

  const strength = getStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      clearFirstLogin();          // ← clears the flag in context + localStorage
      navigate("/dashboard");     // ← now allowed in
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-container">
      <div className="cp-card">

        {/* Header */}
        <div className="cp-header">
          <img src={logo} alt="SLT Mobitel" style={{ width: "150px", marginBottom: "1rem" }} />
          <h2>Set Your Password</h2>
          <p>Welcome, <strong>{user?.email?.split("@")[0]}</strong>!</p>
          <p className="cp-subtitle">
            You're using a temporary password. Please set a new one to continue.
          </p>
        </div>

        {/* Warning banner */}
        <div className="cp-warning">
          <span>⚠️</span>
          <p>You must change your password before accessing the system.</p>
        </div>

        <form onSubmit={handleSubmit} className="cp-form">

          <div className="form-group">
            <label>New Password</label>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Strength bar */}
            {strength && (
              <div className="strength-row">
                <div className={`strength-bar ${strength}`} />
                <span className={`strength-label ${strength}`}>
                  {strength === "weak" ? "Too short" :
                    strength === "medium" ? "Good" : "Strong ✓"}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {/* Match indicator */}
            {confirmPassword && (
              <p className={`match-msg ${newPassword === confirmPassword ? "match" : "no-match"}`}>
                {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
              </p>
            )}
          </div>

          {error && <p className="msg error">⚠️ {error}</p>}

          <button type="submit" className="cp-btn" disabled={loading}>
            {loading ? "Saving..." : "Set New Password & Continue →"}
          </button>

        </form>

        {/* Allow logout if they want to exit */}
        <div className="cp-footer">
          <button className="logout-link" onClick={logout}>
            Sign out instead
          </button>
        </div>

      </div>
    </div>
  );
}

export default ChangePassword;