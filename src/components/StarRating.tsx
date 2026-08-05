import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
}

export function StarRating({ value, onChange, size = 40 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value != null && star <= value;
        return (
          <Pressable
            key={star}
            disabled={!onChange}
            onPress={() => onChange?.(star === value ? 0 : star)}
            hitSlop={8}
          >
            <Text
              style={{
                fontSize: size,
                lineHeight: size * 1.25,
                color: filled ? colors.star : colors.starOff,
              }}
            >
              ★
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
