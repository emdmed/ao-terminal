export const themes = {
  default: {
    foreground: '#34d399',
    background: '#000000',
    cursor: '#34d399',
    cursorAccent: '#000000',
    selectionBackground: '#34d39933',
    selectionForeground: '#34d399',
    black: '#000000',
    red: '#34d399',
    green: '#34d399',
    yellow: '#34d399',
    blue: '#34d399',
    magenta: '#34d399',
    cyan: '#34d399',
    white: '#34d399',
    brightBlack: '#34d399',
    brightRed: '#34d399',
    brightGreen: '#34d399',
    brightYellow: '#34d399',
    brightBlue: '#34d399',
    brightMagenta: '#34d399',
    brightCyan: '#34d399',
    brightWhite: '#34d399',
  },
};

export function loadTheme() {
  const savedTheme = localStorage.getItem('terminal-theme');
  // Ensure the theme exists in our themes object
  if (savedTheme && themes[savedTheme]) {
    return savedTheme;
  }
  // Clear invalid theme from localStorage and return default
  localStorage.removeItem('terminal-theme');
  return 'default';
}

export function saveTheme(themeName) {
  localStorage.setItem('terminal-theme', themeName);
}
