import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DailyWork from "./pages/DailyWork";
import Projects from "./pages/Projects";
import Users from "./pages/Users";
import ForgotPassword from "./pages/ForgotPassword";
import DownloadReport from "./pages/DownloadReport";
import ChangePassword from "./pages/ChangePassword";
import Supervisors from "./pages/Supervisors";




function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/daily-work" element={
              <ProtectedRoute>
                <Layout><DailyWork /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/projects" element={
              <ProtectedRoute adminOnly={true}>
                <Layout><Projects /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute adminOnly={true}>
                <Layout><Users /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute adminOnly={true}>
                <Layout><DownloadReport /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/supervisors" element={
              <ProtectedRoute adminOnly={true}>
                <Layout><Supervisors /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />

          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;