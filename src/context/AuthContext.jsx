import { createContext, use, useContext, useState } from "react";
//create a context for auth
const AuthContext = createContext(null);
//provider wraps whole app and provides auth state
export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
    const [isFirstLogin, setIsFirstLogin] = useState(localStorage.getItem("is_first_login") === "true");
    //check if session expired on initial load
    const [sessionExpired, setSessionExpired] = useState(
        sessionStorage.getItem("session_expired") === "true" || sessionStorage.getItem("sessionExpired") === "true"
    );
    const login = (tokenValue, userData, isFirstLogin = false) => {
        localStorage.setItem("token", tokenValue);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("is_first_login",String(isFirstLogin));
        //clear session expired flag on login
        sessionStorage.removeItem("session_expired");
        sessionStorage.removeItem("sessionExpired");
        setSessionExpired(false);
        setToken(tokenValue);
        setUser(userData);
        setIsFirstLogin(isFirstLogin)
    };
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("is_first_login");
        sessionStorage.removeItem("session_expired");
        sessionStorage.removeItem("sessionExpired");
        setSessionExpired(false);
        setIsFirstLogin(false);
        setToken(null);
        setUser(null);
    };
    const clearFirstLogin = () => {                                 // ← NEW
        localStorage.setItem("is_first_login", "false");
        setIsFirstLogin(false);
    };
    return (
        <AuthContext.Provider value={{ token, user, login, logout, isFirstLogin, clearFirstLogin, sessionExpired }}>
            {children}
        </AuthContext.Provider>
    );
}
export function useAuth() {
    return useContext(AuthContext);
}