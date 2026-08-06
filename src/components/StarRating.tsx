import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../theme';
import { toPersianDigits } from '../lib/digits';

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
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`امتیاز ${toPersianDigits(star)}`}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <MaterialCommunityIcons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? colors.star : colors.starOff}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.92 }] },
});
