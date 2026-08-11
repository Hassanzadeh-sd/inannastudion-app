import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radius, spacing } from '../theme';
import { useSession } from '../store/session';
import { IS_EMPLOYEE_APP } from '../lib/variant';
import { useIsCompact } from '../hooks/use-compact';

interface Props {
  title: string;
  subtitle?: string;
}

/**
 * Shared staff-screen header. The kiosk app can drop back to visitor mode;
 * the employee app only locks. On phones the action shrinks to an icon so it
 * never crowds the title.
 */
export function StaffHeader({ title, subtitle }: Props) {
  const router = useRouter();
  const compact = useIsCompact();
  const lock = useSession((s) => s.lock);

  const onPress = () => {
    lock();
    if (!IS_EMPLOYEE_APP) router.replace('/kiosk');
  };

  const label = IS_EMPLOYEE_APP ? 'قفل' : 'حالت نمایشگاه';
  const icon = IS_EMPLOYEE_APP ? 'lock-outline' : 'monitor-dashboard';

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.action,
          compact && styles.actionCompact,
          pressed && styles.actionPressed,
        ]}
      >
        <MaterialCommunityIcons name={icon} size={compact ? 22 : 20} color={colors.text} />
        {!compact ? <Text style={styles.actionLabel}>{label}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titles: { gap: 2, flexShrink: 1 },
  title: { fontFamily: fonts.black, fontSize: 28, color: colors.text },
  titleCompact: { fontSize: 21 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  actionCompact: { minWidth: 44, paddingHorizontal: spacing.sm },
  actionPressed: { opacity: 0.7 },
  actionLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
});
