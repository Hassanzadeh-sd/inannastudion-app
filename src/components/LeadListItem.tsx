import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import type { Lead, LeadStatus } from '../db/leads.repo';
import { formatFaDateTime, ltrIsolate } from '../lib/digits';
import { formatPhoneFa } from '../lib/phone';

export const STATUS_FA: Record<LeadStatus, string> = {
  new: 'جدید',
  contacted: 'تماس گرفته شد',
  done: 'انجام شد',
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: colors.accentSoft,
  contacted: colors.textMuted,
  done: colors.success,
};

interface Props {
  lead: Lead;
  onPress: (id: string) => void;
}

export const LeadListItem = memo(function LeadListItem({ lead, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(lead.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.nameRow}>
          {lead.name ? (
            <Text style={styles.name} numberOfLines={1}>
              {lead.name}
            </Text>
          ) : (
            <Text style={styles.noName}>بدون نام</Text>
          )}
          <Text style={[styles.status, { color: STATUS_COLOR[lead.status] }]}>
            {STATUS_FA[lead.status]}
          </Text>
        </View>
        <Text style={styles.phone}>{ltrIsolate(formatPhoneFa(lead.phone))}</Text>
        <Text style={styles.date}>{formatFaDateTime(lead.created_at)}</Text>
      </View>
      <Text style={styles.stars}>
        <Text style={{ color: colors.star }}>{'★'.repeat(lead.rating ?? 0)}</Text>
        <Text style={{ color: colors.starOff }}>{'★'.repeat(5 - (lead.rating ?? 0))}</Text>
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.8 },
  main: { gap: 2, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, maxWidth: 320 },
  noName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  status: { fontFamily: fonts.medium, fontSize: 14 },
  phone: { fontFamily: fonts.medium, fontSize: 18, color: colors.accentSoft },
  date: { fontFamily: fonts.regular, fontSize: 13, color: colors.textFaint },
  stars: { fontSize: 24, letterSpacing: 2 },
});
