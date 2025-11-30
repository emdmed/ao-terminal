/**
 * DEPRECATED: This file is kept for backwards compatibility.
 * Please use theme-config.js and ThemeContext instead.
 */

import { themes as allThemes, loadTheme as loadThemeNew } from './theme-config';

// Export only the terminal portion of themes for backwards compatibility
export const themes = Object.fromEntries(
  Object.entries(allThemes).map(([key, theme]) => [key, theme.terminal])
);

export function loadTheme() {
  return loadThemeNew();
}

export function saveTheme(themeName) {
  // This is now handled by ThemeContext
  console.warn('saveTheme is deprecated. Use ThemeContext.changeTheme instead.');
}
