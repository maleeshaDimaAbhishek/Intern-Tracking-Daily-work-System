import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendOTP, verifyOTP, resetPassword } from "../api/auth";
import "./ForgotPassword.css";
import logo from "../assets/logo.png";

// 3 steps
const STEPS = {
    EMAIL: "email",
    OTP: "otp",
    RESET: "reset",
};

function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.EMAIL);

    // Shared state across steps
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]); // 6 boxes
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ── Step 1: Send OTP ──────────────────────────────────────
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");
        try {
            await sendOTP(email);
            setSuccess("OTP sent! Check your email inbox.");
            setStep(STEPS.OTP);   // ← only reached if email exists
        } catch (err) {
            // ← now shows "No account found with this email address."
            setError(err.message || "Failed to send OTP.");
            // stays on Step 1 — user cannot proceed
        } finally {
            setLoading(false);
        }
    };

    // ── OTP box input handler ─────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return; // only digits
        const updated = [...otp];
        updated[index] = value;
        setOtp(updated);

        // Auto-focus next box
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        // Backspace moves focus back
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    // ── Step 2: Verify OTP ────────────────────────────────────
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join("");
        if (otpString.length < 6) {
            setError("Please enter all 6 digits.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await verifyOTP(email, otpString);
            setSuccess("OTP verified! Set your new password.");
            setStep(STEPS.RESET);
        } catch (err) {
            setError(err.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Reset Password ────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await resetPassword(email, newPassword);
            setSuccess("Password reset successfully! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2500);
        } catch (err) {
            setError(err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step indicator ────────────────────────────────────────
    const steps = [
        { key: STEPS.EMAIL, label: "Email", num: 1 },
        { key: STEPS.OTP, label: "Verify", num: 2 },
        { key: STEPS.RESET, label: "Reset", num: 3 },
    ];
    const currentIndex = steps.findIndex((s) => s.key === step);

    return (
        <div className="fp-container">
            <div className="fp-card">

                {/* Header */}
                <div className="fp-header">
                    <img src={logo} alt="SLT Mobitel" style={{ width: "150px", marginBottom: "1rem" }} />
                    <h2>Forgot Password</h2>
                    <p>We'll send an OTP to your email</p>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {steps.map((s, i) => (
                        <div key={s.key} className="step-item">
                            <div className={`step-circle ${i < currentIndex ? "done" :
                                i === currentIndex ? "active" : ""
                                }`}>
                                {i < currentIndex ? "✓" : s.num}
                            </div>
                            <span className={`step-label ${i === currentIndex ? "active" : ""}`}>
                                {s.label}
                            </span>
                            {i < steps.length - 1 && (
                                <div className={`step-line ${i < currentIndex ? "done" : ""}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Step 1: Email ── */}
                {step === STEPS.EMAIL && (
                    <form onSubmit={handleSendOTP} className="fp-form">
                        <div className="form-group">
                            <label>Your Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {error && <p className="msg error">⚠️ {error}</p>}
                        {success && <p className="msg success">{success}</p>}

                        <button type="submit" className="fp-btn" disabled={loading}>
                            {loading ? "Sending OTP..." : "Send OTP →"}
                        </button>
                    </form>
                )}

                {/* ── Step 2: OTP ── */}
                {step === STEPS.OTP && (
                    <form onSubmit={handleVerifyOTP} className="fp-form">
                        <p className="otp-sent-msg">
                            📬 OTP sent to <strong>{email}</strong>
                        </p>

                        {/* 6 individual OTP input boxes */}
                        <div className="otp-boxes">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className={`otp-box ${digit ? "filled" : ""}`}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        {error && <p className="msg error">⚠️ {error}</p>}
                        {success && <p className="msg success">{success}</p>}

                        <button type="submit" className="fp-btn" disabled={loading}>
                            {loading ? "Verifying..." : "Verify OTP →"}
                        </button>

                        {/* Resend */}
                        <button
                            type="button"
                            className="resend-btn"
                            onClick={() => {
                                setOtp(["", "", "", "", "", ""]);
                                setError("");
                                setStep(STEPS.EMAIL);
                            }}
                        >
                            ← Wrong email? Go back
                        </button>
                    </form>
                )}

                {/* ── Step 3: New Password ── */}
                {step === STEPS.RESET && (
                    <form onSubmit={handleResetPassword} className="fp-form">
                        <div className="form-group">
                            <label>New Password</label>
                            <div className="password-input-wrap">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 8 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password strength hint */}
                        {newPassword && (
                            <div className="password-strength">
                                <div className={`strength-bar ${newPassword.length >= 12 ? "strong" :
                                    newPassword.length >= 8 ? "medium" : "weak"
                                    }`} />
                                <span>{
                                    newPassword.length >= 12 ? "Strong" :
                                        newPassword.length >= 8 ? "Medium" : "Too short"
                                }</span>
                            </div>
                        )}

                        {error && <p className="msg error">⚠️ {error}</p>}
                        {success && <p className="msg success">✅ {success}</p>}

                        <button type="submit" className="fp-btn" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password ✓"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div className="fp-footer">
                    <Link to="/login">← Back to Login</Link>
                </div>

            </div>
        </div>
    );
}

export default ForgotPassword;