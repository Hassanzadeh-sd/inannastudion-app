/**
 * Design tokens for استادیو اینانا — brand edition.
 * Warm cream surfaces with olive green and campfire amber, matching the
 * Inanna Studio camping logo (cream / olive / amber / charcoal).
 */
export const colors = {
  bg: '#F7F4EC',
  surface: '#FFFFFF',
  surfaceRaised: '#FBF8F0',
  border: '#E0D8C3',
  /** Amber fill (sun/fire). Always pair with `onAccent` text. */
  accent: '#E9A13B',
  /** Bronze: accent-toned TEXT/icons on light backgrounds (4.5:1+). */
  accentSoft: '#A66A16',
  /** Fire orange: gradient end, selected borders. */
  accent2: '#D97B2C',
  /** Olive green from the logo's forest/tents. */
  secondary: '#5F6B3A',
  onAccent: '#2C2417',
  text: '#2B2B22',
  textMuted: '#6E6A58',
  textFaint: '#9C977F',
  success: '#4F7D3A',
  danger: '#C24A33',
  star: '#E9A13B',
  starOff: '#DDD5BF',
} as const;

/** Gradient stops (start → end) used by primary buttons and backdrops. */
export const gradients = {
  button: ['#F0AC45', '#DC8130'] as const,
  backdrop: ['#FBF8F1', '#F1EBDB'] as const,
  card: ['#FFFFFF', '#FAF6EC'] as const,
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
