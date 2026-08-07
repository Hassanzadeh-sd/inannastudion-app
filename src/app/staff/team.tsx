import { Linking, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fonts, radius, spacing } from '../../theme';
import { StaffHeader } from '../../components/StaffHeader';
import { BigButton } from '../../components/BigButton';
import { TEAM } from '../../constants/team';
import { ltrIsolate } from '../../lib/digits';
import { formatPhoneFa, normalizePhone } from '../../lib/phone';

async function copyPhone(phone: string) {
  await Clipboard.setStringAsync(normalizePhone(phone));
  ToastAndroid.show('شماره کپی شد', ToastAndroid.SHORT);
}

async function callPhone(phone: string) {
  try {
    // The tablet is Wi-Fi-only (no dialer); fall back to copying.
    await Linking.openURL(`tel:${normalizePhone(phone)}`);
  } catch {
    await copyPhone(phone);
  }
}

export default function TeamScreen() {
  return (
    <View style={styles.root}>
      <StaffHeader title="تیم استادیو اینانا" subtitle="شماره و اطلاعات همکاران" />
      <ScrollView contentContainerStyle={styles.list}>
        {TEAM.map((person) => (
          <View key={person.id} style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.name}>{person.name}</Text>
              {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
              {person.email ? <Text style={styles.email}>{ltrIsolate(person.email)}</Text> : null}
            </View>
            <View style={styles.phones}>
              {person.phones.map((phone) => (
                <View key={phone} style={styles.phoneRow}>
                  <Text style={styles.phone}>{ltrIsolate(formatPhoneFa(phone))}</Text>
                  <BigButton label="کپی" variant="ghost" onPress={() => copyPhone(phone)} />
                  <BigButton label="تماس" variant="ghost" onPress={() => callPhone(phone)} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  info: { gap: 2, flexShrink: 1 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  role: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted },
  email: { fontFamily: fonts.regular, fontSize: 14, color: colors.textFaint },
  phones: { gap: spacing.sm },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phone: { fontFamily: fonts.bold, fontSize: 20, color: colors.accentSoft },
});
