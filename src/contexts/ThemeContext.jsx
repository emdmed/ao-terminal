import { createContext, useContext, useState, useEffect } from 'react';
import { themes, loadTheme, saveTheme } from '../themes/theme-config';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => loadTheme());

  // Apply theme to CSS variables whenever theme changes
  useEffect(() => {
    const theme = themes[currentTheme];
    if (!theme) {
      console.warn(`Theme "${currentTheme}" not found, falling back to kanagawa`);
      setCurrentTheme('kanagawa');
      return;
    }

    const root = document.documentElement;
    const { ui } = theme;

    // Apply all UI color variables
    Object.entries(ui).forEach(([key, value]) => {
      // Convert camelCase to kebab-case for CSS variables
      const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${cssVarName}`, value);
    });

    // Apply theme type (light/dark) as data attribute
    root.setAttribute('data-theme', theme.type);

    // Update body background color for terminal background
    document.body.style.backgroundColor = theme.terminal.background;
    document.body.style.color = theme.terminal.foreground;

    // Save theme preference
    saveTheme(currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    } else {
      console.warn(`Theme "${themeName}" does not exist`);
    }
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    changeTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
