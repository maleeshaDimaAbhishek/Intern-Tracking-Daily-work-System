import { useTheme as useThemeContext } from "../context/ThemeContext";

/**
 * Custom hook to access theme functionality
 * 
 * Returns:
 *   - themePreference: "light" | "dark" | "system" - user's theme preference
 *   - resolvedTheme: "light" | "dark" - currently active theme
 *   - isDark: boolean - shorthand for resolvedTheme === "dark"
 *   - setTheme: (preference) => void - set theme preference
 *   - toggleTheme: () => void - toggle between light and dark
 * 
 * Usage:
 *   const { resolvedTheme, setTheme } = useTheme();
 */
export function useTheme() {
  return useThemeContext();
}
