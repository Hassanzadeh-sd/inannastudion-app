import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, fonts, radius, spacing } from '../theme';
import type { Person } from '../constants/team';
import { buildVCard } from '../lib/vcard';
import { ltrIsolate } from '../lib/digits';
import { formatPhoneFa } from '../lib/phone';

interface Props {
  person: Person;
  width: number;
}

export function QrBusinessCard({ person, width }: Props) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.info}>
        <Text style={styles.brandMark}>✦</Text>
        <Text style={styles.company}>{person.company}</Text>
        <Text style={styles.name}>{person.name}</Text>
        {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
        <View style={styles.contacts}>
          {person.phones.map((phone) => (
            <Text key={phone} style={styles.phone}>
              {ltrIsolate(formatPhoneFa(phone))}
            </Text>
          ))}
          {person.email ? <Text style={styles.email}>{ltrIsolate(person.email)}</Text> : null}
        </View>
      </View>
      <View style={styles.qrBox}>
        <View style={styles.qrWhite}>
          <QRCode
            value={buildVCard(person)}
            size={280}
            ecl="M"
            backgroundColor="#FFFFFF"
            color="#17121F"
          />
        </View>
        <Text style={styles.hint}>برای ذخیره مخاطب، کد را با دوربین گوشی اسکن کنید</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  info: { flex: 1, gap: spacing.xs },
  brandMark: { fontSize: 34, color: colors.accent, marginBottom: spacing.sm },
  company: { fontFamily: fonts.medium, fontSize: 18, color: colors.accentSoft },
  name: { fontFamily: fonts.black, fontSize: 34, color: colors.text },
  role: { fontFamily: fonts.regular, fontSize: 20, color: colors.textMuted },
  contacts: { marginTop: spacing.lg, gap: spacing.xs },
  phone: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 17, color: colors.textMuted },
  qrBox: { alignItems: 'center', gap: spacing.md },
  qrWhite: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    maxWidth: 320,
    textAlign: 'center',
  },
});
