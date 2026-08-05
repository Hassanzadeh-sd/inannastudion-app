/**
 * Design tokens for استودیو اینانا.
 * Dark aubergine surface with a champagne-gold accent; Vazirmatn everywhere.
 */
export const colors = {
  bg: '#17121F',
  surface: '#221A2E',
  surfaceRaised: '#2C2239',
  border: '#3A2E4A',
  accent: '#D9A84E',
  accentSoft: '#E7C98B',
  onAccent: '#221A2E',
  text: '#F5F0E8',
  textMuted: '#A79BB8',
  textFaint: '#6F6482',
  success: '#7FC98B',
  danger: '#E07A6B',
  star: '#E9B94F',
  starOff: '#4A3E5C',
} as const;

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

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
