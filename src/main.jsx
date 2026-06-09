import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css' // Global theme styles
import './index.css'
import App from './App.jsx'

// Prevent theme flash by applying stored theme before rendering
const initializeTheme = () => {
  const THEME_KEY = "theme";
  const SUPPORTED_THEMES = ["light", "dark", "system"];
  
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  
  const saved = localStorage.getItem(THEME_KEY);
  const preference = SUPPORTED_THEMES.includes(saved) ? saved : "system";
  const resolvedTheme = preference === "system" ? getSystemTheme() : preference;
  
  document.documentElement.setAttribute("data-theme", resolvedTheme);
};

initializeTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
