# Dark Mode System Documentation

## Overview

The application now has a centralized, optimized dark mode system that:
- Maintains user theme preferences in localStorage
- Supports three theme options: `light`, `dark`, and `system`
- Prevents theme flash on page load
- Automatically responds to system theme changes
- Provides easy access to theme functionality throughout the app

## Architecture

### Files Involved

1. **`src/context/ThemeContext.jsx`** - Central theme management context
2. **`src/hooks/useTheme.js`** - Custom hook for accessing theme functionality
3. **`src/main.jsx`** - Early theme initialization to prevent flash
4. **`src/App.jsx`** - ThemeProvider wrapper
5. **`src/index.css`** - CSS variables and dark mode styles
6. **`src/components/NavBar.jsx`** - Uses the theme context

### CSS Variables

Light theme (default):
```css
--bg: #f0f2f5;
--text: #333;
--text-soft: #555;
--surface: #ffffff;
--surface-2: #f8f9fa;
--muted: #888;
--border: #e5e7eb;
--primary: #667eea;
--active-bg: #ede9fe;
--danger: #e53e3e;
--shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
```

Dark theme (`data-theme="dark"`):
```css
--bg: #0f172a;
--text: #e5e7eb;
--text-soft: #cbd5e1;
--surface: #111827;
--surface-2: #1f2937;
--muted: #94a3b8;
--border: #334155;
--primary: #93a7ff;
--active-bg: #312e81;
--danger: #f87171;
--shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
```

## Usage

### In Components

```jsx
import { useTheme } from "../hooks/useTheme";

function MyComponent() {
  const { themePreference, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {resolvedTheme}</p>
      <p>User preference: {themePreference}</p>
      
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("system")}>System</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### useTheme Hook API

```typescript
interface ThemeContext {
  themePreference: "light" | "dark" | "system";  // User's preference
  resolvedTheme: "light" | "dark";                // Actually applied theme
  isDark: boolean;                                 // Shorthand for resolvedTheme === "dark"
  setTheme: (preference: string) => void;         // Set theme preference
  toggleTheme: () => void;                        // Toggle between light/dark
}
```

## Theme Switching Flow

1. **Initialization** → `main.jsx` reads stored preference from localStorage and applies it before React renders
2. **Provider Mount** → `ThemeContext` mounts in `App.jsx` and takes over theme management
3. **User Action** → `setTheme()` updates preference and localStorage
4. **System Change** → If using "system" preference, automatically applies theme when OS preference changes
5. **CSS Update** → Theme CSS variable values change via `data-theme` attribute

## Styling Components for Dark Mode

### Method 1: Using CSS Variables (Recommended)

```css
.card {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
```

### Method 2: Using Data Attribute Selector

```css
:root[data-theme="dark"] .card {
  background: #111827;
  color: #e5e7eb;
}
```

## How It Works

### Flow Diagram

```
main.jsx (Early Init)
    ↓
    └→ Apply stored theme to avoid flash
    
App.jsx
    ↓
    └→ ThemeProvider wraps AuthProvider
    
ThemeContext
    ├→ Read localStorage for preference
    ├→ Determine resolved theme (system or preference)
    ├→ Apply data-theme attribute to <html>
    └→ Listen to system theme changes if needed
    
Components
    └→ Call useTheme() hook to access theme data
```

### Key Optimizations

1. **Flash Prevention**: Theme applied in `main.jsx` before React renders
2. **Centralization**: All theme logic in one place (ThemeContext)
3. **Efficiency**: System theme listener only active when preference="system"
4. **Persistence**: Theme preference saved to localStorage automatically
5. **Flexibility**: Components can easily toggle, detect, or use current theme

## Browser Support

- Works with all modern browsers
- Uses CSS variables (IE 11+)
- Uses `prefers-color-scheme` media query (Chrome 76+, Firefox 67+, Safari 12.1+)
- Fallback to light theme for older browsers

## Persistence

Theme preference is stored in localStorage with key `"theme"` and persists across sessions:
- User selects "light" → stored as "light"
- User selects "dark" → stored as "dark"
- User selects "system" → stored as "system"

## Troubleshooting

### Theme not applying
- Check that `ThemeProvider` wraps the app in `App.jsx`
- Verify CSS variables are defined in `index.css`

### Flash on page load
- Ensure `initializeTheme()` is called in `main.jsx` before rendering

### System theme not responding
- Only works when preference is "system"
- Requires `prefers-color-scheme` media query support

## Future Enhancements

- Add theme scheduling (e.g., dark at sunset)
- Add more theme options (e.g., "auto-schedule")
- Add theme customization (e.g., custom color palettes)
- Sync theme preference to user backend
