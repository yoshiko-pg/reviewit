// Theme configuration
export const LIGHT_THEMES = [
  { id: 'github', label: 'GitHub Light' },
  { id: 'vsLight', label: 'VS Light' },
  { id: 'oneLight', label: 'One Light' },
  { id: 'gruvboxMaterialLight', label: 'Gruvbox Material Light' },
  { id: 'nightOwlLight', label: 'Night Owl Light' },
];

export const DARK_THEMES = [
  { id: 'vsDark', label: 'VS Dark' },
  { id: 'oneDark', label: 'One Dark' },
  { id: 'gruvboxMaterialDark', label: 'Gruvbox Material Dark' },
  { id: 'nightOwl', label: 'Night Owl' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'okaidia', label: 'Okaidia' },
];

export const ALL_THEMES = [...LIGHT_THEMES, ...DARK_THEMES];

// Built-in themes don't require CSS management

export function isLightTheme(themeId: string): boolean {
  return LIGHT_THEMES.some((theme) => theme.id === themeId);
}

export function isDarkTheme(themeId: string): boolean {
  return DARK_THEMES.some((theme) => theme.id === themeId);
}

export function getThemesForBackgroundColor(backgroundColor: 'light' | 'dark') {
  return backgroundColor === 'light' ? LIGHT_THEMES : DARK_THEMES;
}
