import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { toPersianDigits } from '../lib/digits';

interface Props {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  /** Key height in dp; keypad fills its container's width. */
  keyHeight?: number;
}

/**
 * Numeric keypad laid out left-to-right (1 2 3 …) like a phone dial pad,
 * regardless of the app-wide RTL flip.
 */
export function PersianKeypad({ onDigit, onBackspace, onClear, keyHeight = 88 }: Props) {
  const rowStyle = [styles.row, I18nManager.isRTL && styles.rowReversed];

  const digitKey = (d: string) => (
    <Pressable
      key={d}
      onPress={() => onDigit(d)}
      style={({ pressed }) => [styles.key, { height: keyHeight }, pressed && styles.keyPressed]}
    >
      <Text style={styles.digit}>{toPersianDigits(d)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.pad}>
      <View style={rowStyle}>{['1', '2', '3'].map(digitKey)}</View>
      <View style={rowStyle}>{['4', '5', '6'].map(digitKey)}</View>
      <View style={rowStyle}>{['7', '8', '9'].map(digitKey)}</View>
      <View style={rowStyle}>
        <Pressable
          onPress={onClear}
          disabled={!onClear}
          style={({ pressed }) => [
            styles.key,
            styles.keyMuted,
            { height: keyHeight },
            !onClear && styles.keyHidden,
            pressed && styles.keyPressed,
          ]}
        >
          <Text style={styles.action}>پاک کردن</Text>
        </Pressable>
        {digitKey('0')}
        <Pressable
          onPress={onBackspace}
          style={({ pressed }) => [
            styles.key,
            styles.keyMuted,
            { height: keyHeight },
            pressed && styles.keyPressed,
          ]}
        >
          <Text style={[styles.digit, styles.backspace]}>⌫</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowReversed: { flexDirection: 'row-reverse' },
  key: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyMuted: { backgroundColor: colors.surface },
  keyHidden: { opacity: 0 },
  keyPressed: { backgroundColor: colors.accent },
  digit: { fontFamily: fonts.bold, fontSize: 36, color: colors.text },
  backspace: { fontSize: 30, color: colors.textMuted },
  action: { fontFamily: fonts.medium, fontSize: 18, color: colors.textMuted },
});
