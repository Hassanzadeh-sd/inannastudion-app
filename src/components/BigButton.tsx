import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients, radius, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: Props) {
  const labelStyle = [
    styles.label,
    size === 'lg' && styles.labelLg,
    variant === 'primary' ? styles.labelOnAccent : styles.labelOnDark,
    variant === 'danger' && styles.labelDanger,
  ];

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.shadow,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={gradients.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, size === 'lg' && styles.lg]}
        >
          <Text style={labelStyle}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.dangerOutline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    paddingVertical: 20,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  shadow: {
    borderRadius: radius.sm,
    elevation: 4,
    shadowColor: '#B4711A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  dangerOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.bold, fontSize: 18 },
  labelLg: { fontSize: 24 },
  labelOnAccent: { color: colors.onAccent },
  labelOnDark: { color: colors.text },
  labelDanger: { color: colors.danger },
});
