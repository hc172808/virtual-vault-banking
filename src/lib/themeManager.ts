// Theme definitions with HSL values for the design system
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  warning: string;
  warningForeground: string;
  success: string;
  successForeground: string;
  border: string;
  input: string;
  ring: string;
  bankingBlue: string;
  bankingBlueLight: string;
  bankingGreen: string;
  bankingAmber: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  icon: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Classic Blue',
    description: 'Professional banking blue theme',
    icon: '💙',
    light: {
      background: '240 10% 98%',
      foreground: '240 10% 15%',
      card: '0 0% 100%',
      cardForeground: '240 10% 15%',
      popover: '0 0% 100%',
      popoverForeground: '240 10% 15%',
      primary: '220 70% 25%',
      primaryForeground: '0 0% 100%',
      secondary: '220 20% 95%',
      secondaryForeground: '220 70% 25%',
      muted: '220 20% 95%',
      mutedForeground: '220 10% 45%',
      accent: '145 70% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 100%',
      warning: '45 85% 55%',
      warningForeground: '0 0% 100%',
      success: '145 70% 50%',
      successForeground: '0 0% 100%',
      border: '220 20% 88%',
      input: '220 20% 88%',
      ring: '220 70% 25%',
      bankingBlue: '220 70% 25%',
      bankingBlueLight: '220 70% 85%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '45 85% 55%',
    },
    dark: {
      background: '240 15% 8%',
      foreground: '240 10% 95%',
      card: '240 12% 12%',
      cardForeground: '240 10% 95%',
      popover: '240 12% 12%',
      popoverForeground: '240 10% 95%',
      primary: '220 70% 55%',
      primaryForeground: '240 15% 8%',
      secondary: '240 10% 18%',
      secondaryForeground: '240 10% 95%',
      muted: '240 10% 18%',
      mutedForeground: '240 5% 65%',
      accent: '145 70% 50%',
      accentForeground: '240 15% 8%',
      destructive: '0 85% 60%',
      destructiveForeground: '240 15% 8%',
      warning: '45 85% 55%',
      warningForeground: '240 15% 8%',
      success: '145 70% 50%',
      successForeground: '240 15% 8%',
      border: '240 10% 20%',
      input: '240 10% 20%',
      ring: '220 70% 55%',
      bankingBlue: '220 70% 55%',
      bankingBlueLight: '220 70% 30%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '45 85% 55%',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Finance',
    description: 'Rich green financial theme',
    icon: '💚',
    light: {
      background: '140 10% 98%',
      foreground: '140 10% 15%',
      card: '0 0% 100%',
      cardForeground: '140 10% 15%',
      popover: '0 0% 100%',
      popoverForeground: '140 10% 15%',
      primary: '152 70% 30%',
      primaryForeground: '0 0% 100%',
      secondary: '152 20% 95%',
      secondaryForeground: '152 70% 30%',
      muted: '152 20% 95%',
      mutedForeground: '152 10% 45%',
      accent: '38 92% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 100%',
      warning: '45 85% 55%',
      warningForeground: '0 0% 100%',
      success: '152 70% 40%',
      successForeground: '0 0% 100%',
      border: '152 20% 88%',
      input: '152 20% 88%',
      ring: '152 70% 30%',
      bankingBlue: '152 70% 30%',
      bankingBlueLight: '152 70% 85%',
      bankingGreen: '152 70% 40%',
      bankingAmber: '38 92% 50%',
    },
    dark: {
      background: '152 15% 8%',
      foreground: '152 10% 95%',
      card: '152 12% 12%',
      cardForeground: '152 10% 95%',
      popover: '152 12% 12%',
      popoverForeground: '152 10% 95%',
      primary: '152 70% 45%',
      primaryForeground: '152 15% 8%',
      secondary: '152 10% 18%',
      secondaryForeground: '152 10% 95%',
      muted: '152 10% 18%',
      mutedForeground: '152 5% 65%',
      accent: '38 92% 50%',
      accentForeground: '152 15% 8%',
      destructive: '0 85% 60%',
      destructiveForeground: '152 15% 8%',
      warning: '45 85% 55%',
      warningForeground: '152 15% 8%',
      success: '152 70% 45%',
      successForeground: '152 15% 8%',
      border: '152 10% 20%',
      input: '152 10% 20%',
      ring: '152 70% 45%',
      bankingBlue: '152 70% 45%',
      bankingBlueLight: '152 70% 25%',
      bankingGreen: '152 70% 45%',
      bankingAmber: '38 92% 50%',
    },
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    description: 'Elegant purple luxury theme',
    icon: '💜',
    light: {
      background: '270 10% 98%',
      foreground: '270 10% 15%',
      card: '0 0% 100%',
      cardForeground: '270 10% 15%',
      popover: '0 0% 100%',
      popoverForeground: '270 10% 15%',
      primary: '270 60% 40%',
      primaryForeground: '0 0% 100%',
      secondary: '270 20% 95%',
      secondaryForeground: '270 60% 40%',
      muted: '270 20% 95%',
      mutedForeground: '270 10% 45%',
      accent: '320 70% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 100%',
      warning: '45 85% 55%',
      warningForeground: '0 0% 100%',
      success: '145 70% 50%',
      successForeground: '0 0% 100%',
      border: '270 20% 88%',
      input: '270 20% 88%',
      ring: '270 60% 40%',
      bankingBlue: '270 60% 40%',
      bankingBlueLight: '270 60% 85%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '320 70% 50%',
    },
    dark: {
      background: '270 15% 8%',
      foreground: '270 10% 95%',
      card: '270 12% 12%',
      cardForeground: '270 10% 95%',
      popover: '270 12% 12%',
      popoverForeground: '270 10% 95%',
      primary: '270 60% 55%',
      primaryForeground: '270 15% 8%',
      secondary: '270 10% 18%',
      secondaryForeground: '270 10% 95%',
      muted: '270 10% 18%',
      mutedForeground: '270 5% 65%',
      accent: '320 70% 55%',
      accentForeground: '270 15% 8%',
      destructive: '0 85% 60%',
      destructiveForeground: '270 15% 8%',
      warning: '45 85% 55%',
      warningForeground: '270 15% 8%',
      success: '145 70% 50%',
      successForeground: '270 15% 8%',
      border: '270 10% 20%',
      input: '270 10% 20%',
      ring: '270 60% 55%',
      bankingBlue: '270 60% 55%',
      bankingBlueLight: '270 60% 25%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '320 70% 55%',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Gold',
    description: 'Warm orange and gold theme',
    icon: '🧡',
    light: {
      background: '30 10% 98%',
      foreground: '30 10% 15%',
      card: '0 0% 100%',
      cardForeground: '30 10% 15%',
      popover: '0 0% 100%',
      popoverForeground: '30 10% 15%',
      primary: '25 85% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '30 20% 95%',
      secondaryForeground: '25 85% 45%',
      muted: '30 20% 95%',
      mutedForeground: '30 10% 45%',
      accent: '45 92% 50%',
      accentForeground: '30 10% 15%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 100%',
      warning: '45 85% 55%',
      warningForeground: '30 10% 15%',
      success: '145 70% 50%',
      successForeground: '0 0% 100%',
      border: '30 20% 88%',
      input: '30 20% 88%',
      ring: '25 85% 45%',
      bankingBlue: '25 85% 45%',
      bankingBlueLight: '30 85% 85%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '45 92% 50%',
    },
    dark: {
      background: '25 15% 8%',
      foreground: '30 10% 95%',
      card: '25 12% 12%',
      cardForeground: '30 10% 95%',
      popover: '25 12% 12%',
      popoverForeground: '30 10% 95%',
      primary: '25 85% 55%',
      primaryForeground: '25 15% 8%',
      secondary: '25 10% 18%',
      secondaryForeground: '30 10% 95%',
      muted: '25 10% 18%',
      mutedForeground: '30 5% 65%',
      accent: '45 92% 55%',
      accentForeground: '25 15% 8%',
      destructive: '0 85% 60%',
      destructiveForeground: '25 15% 8%',
      warning: '45 85% 55%',
      warningForeground: '25 15% 8%',
      success: '145 70% 50%',
      successForeground: '25 15% 8%',
      border: '25 10% 20%',
      input: '25 10% 20%',
      ring: '25 85% 55%',
      bankingBlue: '25 85% 55%',
      bankingBlueLight: '25 85% 25%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '45 92% 55%',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep dark theme for night use',
    icon: '🌙',
    light: {
      background: '220 15% 96%',
      foreground: '220 15% 10%',
      card: '0 0% 100%',
      cardForeground: '220 15% 10%',
      popover: '0 0% 100%',
      popoverForeground: '220 15% 10%',
      primary: '220 80% 35%',
      primaryForeground: '0 0% 100%',
      secondary: '220 15% 92%',
      secondaryForeground: '220 80% 35%',
      muted: '220 15% 92%',
      mutedForeground: '220 10% 40%',
      accent: '200 80% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 100%',
      warning: '45 85% 55%',
      warningForeground: '0 0% 100%',
      success: '145 70% 50%',
      successForeground: '0 0% 100%',
      border: '220 15% 85%',
      input: '220 15% 85%',
      ring: '220 80% 35%',
      bankingBlue: '220 80% 35%',
      bankingBlueLight: '220 80% 85%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '200 80% 50%',
    },
    dark: {
      background: '220 20% 4%',
      foreground: '220 10% 95%',
      card: '220 18% 8%',
      cardForeground: '220 10% 95%',
      popover: '220 18% 8%',
      popoverForeground: '220 10% 95%',
      primary: '200 80% 55%',
      primaryForeground: '220 20% 4%',
      secondary: '220 15% 12%',
      secondaryForeground: '220 10% 95%',
      muted: '220 15% 12%',
      mutedForeground: '220 5% 60%',
      accent: '200 80% 60%',
      accentForeground: '220 20% 4%',
      destructive: '0 85% 60%',
      destructiveForeground: '220 20% 4%',
      warning: '45 85% 55%',
      warningForeground: '220 20% 4%',
      success: '145 70% 50%',
      successForeground: '220 20% 4%',
      border: '220 15% 15%',
      input: '220 15% 15%',
      ring: '200 80% 55%',
      bankingBlue: '200 80% 55%',
      bankingBlueLight: '200 80% 20%',
      bankingGreen: '145 70% 50%',
      bankingAmber: '200 80% 60%',
    },
  },
];

const THEME_STORAGE_KEY = 'stablecoin-theme';
const MODE_STORAGE_KEY = 'stablecoin-mode';

export const getStoredTheme = (): string => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem(THEME_STORAGE_KEY) || 'default';
};

export const getStoredMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  // Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const setStoredTheme = (themeId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }
};

export const setStoredMode = (mode: 'light' | 'dark'): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }
};

export const applyTheme = (themeId: string, mode: 'light' | 'dark'): void => {
  const theme = themes.find(t => t.id === themeId) || themes[0];
  const colors = mode === 'dark' ? theme.dark : theme.light;
  
  const root = document.documentElement;
  
  // Apply all color variables
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-foreground', colors.cardForeground);
  root.style.setProperty('--popover', colors.popover);
  root.style.setProperty('--popover-foreground', colors.popoverForeground);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.primaryForeground);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--muted-foreground', colors.mutedForeground);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.accentForeground);
  root.style.setProperty('--destructive', colors.destructive);
  root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
  root.style.setProperty('--warning', colors.warning);
  root.style.setProperty('--warning-foreground', colors.warningForeground);
  root.style.setProperty('--success', colors.success);
  root.style.setProperty('--success-foreground', colors.successForeground);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input', colors.input);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--banking-blue', colors.bankingBlue);
  root.style.setProperty('--banking-blue-light', colors.bankingBlueLight);
  root.style.setProperty('--banking-green', colors.bankingGreen);
  root.style.setProperty('--banking-amber', colors.bankingAmber);
  
  // Also apply sidebar colors based on the theme
  root.style.setProperty('--sidebar-background', colors.background);
  root.style.setProperty('--sidebar-foreground', colors.foreground);
  root.style.setProperty('--sidebar-primary', colors.primary);
  root.style.setProperty('--sidebar-primary-foreground', colors.primaryForeground);
  root.style.setProperty('--sidebar-accent', colors.secondary);
  root.style.setProperty('--sidebar-accent-foreground', colors.secondaryForeground);
  root.style.setProperty('--sidebar-border', colors.border);
  root.style.setProperty('--sidebar-ring', colors.ring);
  
  // Toggle dark mode class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const initializeTheme = (): void => {
  const themeId = getStoredTheme();
  const mode = getStoredMode();
  applyTheme(themeId, mode);
};
