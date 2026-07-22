import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import { useState } from "react";
import "./NavBar.css";
import logo from "../assets/logo.png";
function ThemeButton({ resolvedTheme, setTheme }) {
    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
        >
            {resolvedTheme === "light" ? "🌙" : "☀️"}
        </button>
    );
}
function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const { themePreference, resolvedTheme, setTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const isAdminOrSupervisor = user?.role === "admin" || user?.role === "supervisor";
    return (
        <nav className="navbar">
            {/*left side-brand*/}
            <div className="navbar-brand">
                <button
                    className={`hamburger ${isMenuOpen ? "open" : ""}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? "✕" : "☰"}
                </button>

                <img src={logo} alt="SLT Mobitel" className="navbar-logo" />

            </div>
            {/*middle-navlinks*/}
            <div className={`navbar-links ${isMenuOpen ? "show" : ""}`}>
                <div className="mobile-theme">
                    <ThemeButton resolvedTheme={resolvedTheme} setTheme={setTheme} />
                </div>
                <NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
                {user?.role === "supervisor" || user?.role === "intern" ? (
                    <NavLink to="/daily-work" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Daily Work</NavLink>
                ) : null}
                {isAdminOrSupervisor ? (
                    <NavLink to="/projects" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Projects</NavLink>
                ) : null}
                {isAdminOrSupervisor ? (
                    <NavLink to="/users" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Users</NavLink>
                ) : null}
                {user?.role === "admin" ? (
                    <NavLink to="/supervisors" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Supervisors</NavLink>
                ) : null}
                {/* Apply for Leave — intern only, per earlier decision */}
                {user?.role === "intern" ? (
                    <NavLink to="/leave/apply" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Apply for Leave
                    </NavLink>
                ) : null}

                {/* My Leaves — visible to everyone, shows their own history */}
                {user?.role === "intern" ? (
                    <NavLink to="/leave/my" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        My Leaves
                    </NavLink>
                ) : null}

                {/* Leave Approvals — admin + supervisor only */}
                {user?.role === "supervisor" ? (
                    <NavLink to="/leave/approvals" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Leave Approvals
                    </NavLink>
                ) : null}

                {/* Leave history view — admin sees org-wide, supervisor sees
                    only their own team (the backend scopes this automatically
                    via GET /leave/, same endpoint, different result per role).
                    This is the only place a supervisor can see medical
                    certificates for requests they already decided on, since
                    those disappear from "Leave Approvals" once acted upon. */}
                {isAdminOrSupervisor ? (
                    <NavLink to="/leave/all" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {user?.role === "admin" ? "All Leaves" : "Leave History"}
                    </NavLink>
                ) : null}

                {/*Only show Projects link to admins*/}


                {isAdminOrSupervisor ? (
                    <NavLink to="/reports" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Reports
                    </NavLink>
                ) : null}


            </div>
            {/*Right side — user info + logout*/}
            <div className="navbar-user">
                <NotificationBell />
                <span className={`role-pill ${user?.role}`}>{user?.role}</span>
                <span className="user-email">{user?.email}</span>
                <div className="desktop-theme">
                    <ThemeButton resolvedTheme={resolvedTheme} setTheme={setTheme} />
                </div>
                <button onClick={handleLogout} className="logout-btn">Sign Out</button>
            </div>
        </nav>
    );
}
export default NavBar;
