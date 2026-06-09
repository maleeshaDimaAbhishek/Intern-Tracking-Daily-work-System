import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const THEME_KEY = "theme";
const SUPPORTED_THEMES = ["light", "dark", "system"];

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getResolvedTheme = (preference) => {
  return preference === "system" ? getSystemTheme() : preference;
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return SUPPORTED_THEMES.includes(saved) ? saved : "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const preference = SUPPORTED_THEMES.includes(saved) ? saved : "system";
    return getResolvedTheme(preference);
  });

  // Setup theme listener and apply changes
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const nextTheme = getResolvedTheme(themePreference);
      applyTheme(nextTheme);
      setResolvedTheme(nextTheme);
    };

    updateTheme();
    localStorage.setItem(THEME_KEY, themePreference);

    // Listen to system theme changes only if using "system" preference
    if (themePreference === "system") {
      media.addEventListener("change", updateTheme);
      return () => media.removeEventListener("change", updateTheme);
    }
  }, [themePreference]);

  const setTheme = (preference) => {
    if (SUPPORTED_THEMES.includes(preference)) {
      setThemePreference(preference);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const value = {
    themePreference,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
