import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Image } from 'expo-image';
import { colors, fonts, radius, spacing } from '../theme';
import type { Person } from '../constants/team';
import { buildVCard } from '../lib/vcard';
import { ltrIsolate } from '../lib/digits';
import { formatPhoneFa } from '../lib/phone';

interface Props {
  person: Person;
  width: number;
  /** Phone-sized layout: stacked column, scaled QR. */
  compact?: boolean;
}

export function QrBusinessCard({ person, width, compact = false }: Props) {
  const qrSize = compact ? Math.min(240, width - 120) : 280;
  const Wrapper = compact ? ScrollView : View;
  return (
    <Wrapper
      style={[styles.card, { width }, compact && styles.cardCompact]}
      contentContainerStyle={compact ? styles.compactContent : undefined}
    >
      <View style={[styles.info, compact && styles.infoCompact]}>
        <Image
          source={require('../../assets/images/logo-emblem.png')}
          style={styles.emblem}
          contentFit="contain"
        />
        <Text style={styles.company}>{person.company}</Text>
        <Text style={[styles.name, compact && styles.nameCompact]}>{person.name}</Text>
        {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
        <View style={[styles.contacts, compact && styles.contactsCompact]}>
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
            size={qrSize}
            ecl="M"
            backgroundColor="#FFFFFF"
            color="#2B2B22"
          />
        </View>
        <Text style={styles.hint}>برای ذخیره مخاطب، کد را با دوربین گوشی اسکن کنید</Text>
      </View>
    </Wrapper>
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
  cardCompact: {
    flexDirection: 'column',
    padding: spacing.lg,
  },
  compactContent: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  info: { flex: 1, gap: spacing.xs },
  infoCompact: { flex: 0, alignSelf: 'stretch', alignItems: 'center' },
  emblem: { width: 96, height: 70, marginBottom: spacing.sm },
  company: { fontFamily: fonts.medium, fontSize: 18, color: colors.accentSoft },
  name: { fontFamily: fonts.black, fontSize: 34, color: colors.text },
  nameCompact: { fontSize: 26 },
  role: { fontFamily: fonts.regular, fontSize: 20, color: colors.textMuted },
  contacts: { marginTop: spacing.lg, gap: spacing.xs },
  contactsCompact: { marginTop: spacing.sm, alignItems: 'center' },
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
