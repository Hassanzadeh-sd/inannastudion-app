import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  small?: boolean;
}

export function Chip({ label, selected, onPress, small = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, small && styles.small, selected && styles.selected]}
    >
      <Text style={[styles.label, small && styles.labelSmall, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  small: { paddingVertical: 4, paddingHorizontal: 12 },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted },
  labelSmall: { fontSize: 14 },
  labelSelected: { color: colors.onAccent, fontFamily: fonts.bold },
});
