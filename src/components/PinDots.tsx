import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  length: number;
  filled: number;
}

export function PinDots({ length, filled }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textFaint,
  },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
});
