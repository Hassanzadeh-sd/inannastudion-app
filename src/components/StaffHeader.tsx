import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '../theme';
import { useSession } from '../store/session';
import { BigButton } from './BigButton';

interface Props {
  title: string;
  subtitle?: string;
}

/** Shared staff-screen header with the "back to kiosk" action. */
export function StaffHeader({ title, subtitle }: Props) {
  const router = useRouter();
  const lock = useSession((s) => s.lock);
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <BigButton
        label="حالت نمایشگاه"
        variant="ghost"
        onPress={() => {
          lock();
          router.replace('/kiosk');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titles: { gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
});
