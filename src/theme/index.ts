/**
 * Design tokens for استودیو اینانا — "fantasy" edition.
 * Deep space-violet surfaces, gold→magenta gradient accents, sharp corners.
 */
export const colors = {
  bg: '#0E0A18',
  surface: '#1B1329',
  surfaceRaised: '#271A3D',
  border: '#43306B',
  accent: '#F3C14F',
  accentSoft: '#F7D68A',
  accent2: '#E8579B',
  violet: '#9D6BFF',
  onAccent: '#241335',
  text: '#F7F2FF',
  textMuted: '#B3A6CF',
  textFaint: '#786C96',
  success: '#5FD68B',
  danger: '#FF6B6B',
  star: '#F3C14F',
  starOff: '#4A3A6B',
} as const;

/** Gradient stops (start → end) used by primary buttons and backdrops. */
export const gradients = {
  button: ['#F3C14F', '#E8579B'] as const,
  backdrop: ['#221238', '#0E0A18'] as const,
  card: ['#2A1C44', '#1B1329'] as const,
};

export const fonts = {
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  bold: 'Vazirmatn_700Bold',
  black: 'Vazirmatn_800ExtraBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

/** Sharp-corner scale. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  pill: 999,
} as const;
