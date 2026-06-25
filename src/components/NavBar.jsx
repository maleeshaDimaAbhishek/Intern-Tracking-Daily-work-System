import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import "./NavBar.css";
import logo from "../assets/logo.png";

function NavBar() {
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
                <img src={logo} alt="SLT Mobitel" className="navbar-logo" />
            </div>
            {/*middle-navlinks*/}
            <div className="navbar-links">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
                <NavLink to="/daily-work" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Daily Work</NavLink>

                {/* Apply for Leave — intern only, per earlier decision */}
                {user?.role === "intern" ? (
                    <NavLink to="/leave/apply" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Apply for Leave
                    </NavLink>
                ) : null}

                {/* My Leaves — visible to everyone, shows their own history */}
                <NavLink to="/leave/my" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    My Leaves
                </NavLink>

                {/* Leave Approvals — admin + supervisor only */}
                {isAdminOrSupervisor ? (
                    <NavLink to="/leave/approvals" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Leave Approvals
                    </NavLink>
                ) : null}

                {/* All Leaves — admin only, org-wide view */}
                {user?.role === "supervisor" ? (
                    <NavLink to="/leave/all" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        All Leaves
                    </NavLink>
                ) : null}

                {/*Only show Projects link to admins*/}
                {isAdminOrSupervisor ? (
                    <NavLink to="/projects" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Projects</NavLink>
                ) : null}
                {isAdminOrSupervisor ? (
                    <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Users</NavLink>
                ) : null}
                {isAdminOrSupervisor ? (
                    <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Reports
                    </NavLink>
                ) : null}
            </div>
            {/*Right side — user info + logout*/}
            <div className="navbar-user">
                <NotificationBell />
                <div className="theme-switcher" role="group" aria-label="Theme switcher">
                    <button
                        type="button"
                        className={`theme-option ${themePreference === "light" ? "active" : ""}`}
                        onClick={() => setTheme("light")}
                        aria-pressed={themePreference === "light"}
                    >
                        ☀️
                    </button>
                    <button
                        type="button"
                        className={`theme-option ${themePreference === "dark" ? "active" : ""}`}
                        onClick={() => setTheme("dark")}
                        aria-pressed={themePreference === "dark"}
                    >
                        🌗
                    </button>
                </div>
                <span className={`role-pill ${user?.role}`}>{user?.role}</span>
                <span className="user-email">{user?.email}</span>
                <button onClick={handleLogout} className="logout-btn">Sign Out</button>
            </div>
        </nav>
    );
}
export default NavBar;