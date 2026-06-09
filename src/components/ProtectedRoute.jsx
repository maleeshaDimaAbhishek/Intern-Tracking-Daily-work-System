import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children,adminOnly=false }) {
    const{token,user,isFirstLogin}=useAuth();
      // Not logged in → go to login page
    if(!token){
        return <Navigate to="/login" replace/>
    }
    if(isFirstLogin){
        return <Navigate to="/change-password" replace/>
    }
    // Page is admin-only but user is not admin → go to dashboard
    const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor';
    if(adminOnly && !isAdminOrSupervisor){
        return <Navigate to="/dashboard" replace/>
    }
    // All good → show the page
    return children;
}
export default ProtectedRoute;
