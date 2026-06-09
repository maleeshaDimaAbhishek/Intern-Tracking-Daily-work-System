import { useState } from "react";
import "./Login.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const formatApiError = (detail) => {
    if (!detail) return "Login failed";
    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const field = Array.isArray(item.loc) ? item.loc.join(".") : "";
            if (item.msg && field) return `${field}: ${item.msg}`;
            if (item.msg) return item.msg;
          }
          return "Invalid input";
        })
        .join(", ");
    }

    if (typeof detail === "object" && detail.msg) return detail.msg;
    return "Login failed";
  };

  const parseJsonSafely = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const requestLogin = async () => {
    const firstResponse = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const firstData = await parseJsonSafely(firstResponse);
    if (firstResponse.status !== 422) return { response: firstResponse, data: firstData };

    const needsUsernameField =
      Array.isArray(firstData?.detail) &&
      firstData.detail.some(
        (issue) => Array.isArray(issue?.loc) && issue.loc.includes("username")
      );

    if (!needsUsernameField) return { response: firstResponse, data: firstData };

    const secondResponse = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }).toString(),
    });

    const secondData = await parseJsonSafely(secondResponse);
    return { response: secondResponse, data: secondData };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Parse JSON — if server returns non-JSON this will throw SyntaxError
      let data;
      try {
        data = await response.json();
      } catch {
        setError("Server error. Check your backend logs.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.detail || "Login failed.");
        setLoading(false);
        return;
      }

      // Decode JWT payload
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const userData = { id: payload.sub, role: payload.role, email };

      // Pass is_first_login flag to context
      login(data.access_token, userData, data.is_first_login);

      // Redirect based on first login status
      if (data.is_first_login) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      console.error("Login error:", err);
      setError("Cannot connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="SLT Mobitel" className="login-logo" />
          <h2>EmpDiary</h2>
          <p>Sign in to your account</p>
        </div>
        {sessionExpired && (
          <div className="session-expired-banner">
            <span>⏰</span>
            <div>
              <p className="expired-title">Session Expired</p>
              <p className="expired-msg">Please sign in again to continue.</p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required />
          </div>
          {/* Display error message if login fails */}
          {error && <p className="error-message">{error}</p>}
          <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: "0.85rem", color: "#667eea", textDecoration: "none" }}
            >
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>


  );
}
export default Login;
