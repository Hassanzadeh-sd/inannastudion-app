import { useWindowDimensions } from 'react-native';

/**
 * Compact = phone-sized width (employee phones in portrait). The exhibition
 * tablet in landscape stays on the wide two-pane layouts.
 */
export function useIsCompact(): boolean {
  const { width } = useWindowDimensions();
  return width < 700;
}
