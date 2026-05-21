export interface ThemePreset {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    card: string;
    text: string;
    textMuted: string;
    glowColor: string;
    glowActive: string;
    border: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'afterglow-original',
    name: 'Afterglow Classic',
    type: 'dark',
    colors: {
      primary: '#ff3e00',
      secondary: '#ff8a00',
      accent: '#00d4ff',
      bg: '#050505',
      card: '#121212',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      glowColor: 'rgba(255, 62, 0, 0.3)',
      glowActive: 'rgba(255, 62, 0, 0.6)',
      border: 'rgba(255, 255, 255, 0.05)'
    }
  },
  {
    id: 'vaporwave-dark',
    name: 'Vaporwave Slate (Dark)',
    type: 'dark',
    colors: {
      primary: '#ff5e00', // Sunset Neon Porange (Orange emphasis)
      secondary: '#ff007f', // Sunset Neon Pink
      accent: '#8d81ae', // Elegant medium slate purple (not plum!)
      bg: '#1f1c2d', // Strictly purple/indigo slate sunset bg (not plum!)
      card: '#2e2942', // Beautiful slate purple card for perfect white text contrast
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.45)',
      glowColor: 'rgba(255, 94, 0, 0.4)', // Warm glowing sunset porange glow
      glowActive: 'rgba(255, 0, 127, 0.7)',
      border: 'rgba(141, 129, 174, 0.2)'
    }
  },
  {
    id: 'synthwave-dark',
    name: 'Synthwave Twilight (Dark)',
    type: 'dark',
    colors: {
      primary: '#ff007f',
      secondary: '#7b1fa2',
      accent: '#ff00e6',
      bg: '#0e0419',
      card: '#1a0b36',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      glowColor: 'rgba(255, 0, 127, 0.35)',
      glowActive: 'rgba(255, 0, 127, 0.65)',
      border: 'rgba(255, 0, 127, 0.15)'
    }
  },
  {
    id: 'monochrome-dark',
    name: 'Pure Slate Gray (Dark)',
    type: 'dark',
    colors: {
      primary: '#ffffff', // Pure crisp white
      secondary: '#d4d4d4', // Pure beautiful light gray
      accent: '#a3a3a3', // Pure silver gray
      bg: '#404040', // Pure medium gray backdrop (strictly gray, no black or blue)
      card: '#525252', // Slightly lighter pure gray card layer for gorgeous readability
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.5)',
      glowColor: 'rgba(255, 255, 255, 0.15)',
      glowActive: 'rgba(255, 255, 255, 0.3)',
      border: 'rgba(255, 255, 255, 0.1)'
    }
  },
  {
    id: 'phoenix-dark',
    name: 'Phoenix Ember (Dark)',
    type: 'dark',
    colors: {
      primary: '#ff4500',
      secondary: '#ffaa00',
      accent: '#ff0000',
      bg: '#0d0400',
      card: '#200b05',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      glowColor: 'rgba(255, 69, 0, 0.35)',
      glowActive: 'rgba(255, 69, 0, 0.65)',
      border: 'rgba(255, 69, 0, 0.15)'
    }
  },
  {
    id: 'vaporwave-light',
    name: 'Misty Slate Purple (Light)',
    type: 'light',
    colors: {
      primary: '#ff5e00', // Sunset Neon Porange (Orange emphasis)
      secondary: '#ff007f', // Sunset Neon Pink
      accent: '#65558f', // High-contrast medium slate purple
      bg: '#f6f5fa', // Extremely light slate-lavender backdrop
      card: '#e8e5f2', // Pale cool slate purple misty background card
      text: '#1a142c', // Crisp dark twilight midnight text (superb contrast!)
      textMuted: 'rgba(26, 20, 44, 0.54)',
      glowColor: 'rgba(255, 94, 0, 0.15)',
      glowActive: 'rgba(255, 0, 127, 0.4)',
      border: 'rgba(101, 85, 143, 0.15)'
    }
  },
  {
    id: 'synthwave-light',
    name: 'Synthwave Pastel (Light)',
    type: 'light',
    colors: {
      primary: '#c2185b',
      secondary: '#7b1fa2',
      accent: '#d81b60',
      bg: '#fbf5fd',
      card: '#f3e5f5',
      text: '#2e001f',
      textMuted: 'rgba(46, 0, 31, 0.5)',
      glowColor: 'rgba(194, 24, 91, 0.15)',
      glowActive: 'rgba(194, 24, 91, 0.35)',
      border: 'rgba(194, 24, 91, 0.1)'
    }
  },
  {
    id: 'monochrome-light',
    name: 'Pure Slate Gray (Light)',
    type: 'light',
    colors: {
      primary: '#171717', // Pure premium anthracite neutral gray
      secondary: '#737373', // Pure balanced mid gray
      accent: '#262626', // Pure dark gray accents
      bg: '#f5f5f5', // Pure light neutral gray backdrop
      card: '#e5e5e5', // Elegant pure gray card border container
      text: '#171717',
      textMuted: 'rgba(23, 23, 23, 0.55)',
      glowColor: 'rgba(23, 23, 23, 0.06)',
      glowActive: 'rgba(23, 23, 23, 0.18)',
      border: 'rgba(23, 23, 23, 0.08)'
    }
  },
  {
    id: 'phoenix-light',
    name: 'Phoenix Sunrise (Light)',
    type: 'light',
    colors: {
      primary: '#d32f2f',
      secondary: '#f57c00',
      accent: '#e65100',
      bg: '#fffbee',
      card: '#ffe0b2',
      text: '#3e1800',
      textMuted: 'rgba(62, 24, 0, 0.5)',
      glowColor: 'rgba(211, 47, 47, 0.15)',
      glowActive: 'rgba(211, 47, 47, 0.35)',
      border: 'rgba(211, 47, 47, 0.1)'
    }
  }
];

export const applyThemePreset = (themeId: string) => {
  const theme = THEME_PRESETS.find(t => t.id === themeId) || THEME_PRESETS[0];
  const root = document.documentElement;

  // Set individual CSS custom properties
  root.style.setProperty('--afterglow-primary', theme.colors.primary);
  root.style.setProperty('--afterglow-secondary', theme.colors.secondary);
  root.style.setProperty('--afterglow-accent', theme.colors.accent);
  root.style.setProperty('--afterglow-bg', theme.colors.bg);
  root.style.setProperty('--afterglow-card', theme.colors.card);
  root.style.setProperty('--afterglow-text', theme.colors.text);
  root.style.setProperty('--afterglow-text-muted', theme.colors.textMuted);
  root.style.setProperty('--afterglow-glow-color', theme.colors.glowColor);
  root.style.setProperty('--afterglow-glow-active', theme.colors.glowActive);
  root.style.setProperty('--afterglow-border', theme.colors.border);

  // Manage body classes for light/dark contexts
  if (theme.type === 'light') {
    root.classList.add('theme-light');
    root.classList.remove('theme-dark');
  } else {
    root.classList.add('theme-dark');
    root.classList.remove('theme-light');
  }
};
