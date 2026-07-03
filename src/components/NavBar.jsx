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
                {isAdminOrSupervisor ? (
                    <NavLink to="/projects" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Projects</NavLink>
                ) : null}
                {isAdminOrSupervisor ? (
                    <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Users</NavLink>
                ) : null}
                {user?.role === "admin" ? (
                    <NavLink to="/supervisors" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Supervisors</NavLink>
                ) : null}
                {/* Apply for Leave — intern only, per earlier decision */}
                {user?.role === "intern" ? (
                    <NavLink to="/leave/apply" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Apply for Leave
                    </NavLink>
                ) : null}

                {/* My Leaves — visible to everyone, shows their own history */}
                {user?.role === "intern" ? (
                    <NavLink to="/leave/my" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        My Leaves
                    </NavLink>
                ) : null}

                {/* Leave Approvals — admin + supervisor only */}
                {user?.role === "supervisor" ? (
                    <NavLink to="/leave/approvals" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
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
                    <NavLink to="/leave/all" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {user?.role === "admin" ? "All Leaves" : "Leave History"}
                    </NavLink>
                ) : null}

                {/*Only show Projects link to admins*/}
                
                
                {isAdminOrSupervisor ? (
                    <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        Reports
                    </NavLink>
                ) : null}
            </div>
            {/*Right side — user info + logout*/}
            <div className="navbar-user">
                <NotificationBell />
                <span className={`role-pill ${user?.role}`}>{user?.role}</span>
                <span className="user-email">{user?.email}</span>
                <button onClick={handleLogout} className="logout-btn">Sign Out</button>
                <div className="theme-switcher" role="group" aria-label="Theme switcher">
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() =>
                            setTheme(resolvedTheme === "light" ? "dark" : "light")
                        }
                        aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"
                            } mode`}
                    >
                        {resolvedTheme === "light" ? "☀️" : "🌙"}
                    </button>
                </div>
            </div>
        </nav>
    );
}
export default NavBar;