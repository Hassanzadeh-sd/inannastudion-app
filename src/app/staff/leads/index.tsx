import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '../../../theme';
import { StaffHeader } from '../../../components/StaffHeader';
import { Chip } from '../../../components/Chip';
import { LeadListItem } from '../../../components/LeadListItem';
import {
  getLeadCounts,
  listLeads,
  type Lead,
  type LeadFilter,
  type LeadSort,
} from '../../../db/leads.repo';
import { useLeadsVersion } from '../../../store/leads-version';
import { toPersianDigits } from '../../../lib/digits';

const FILTERS: { key: LeadFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'needs_details', label: 'بدون نام' },
  { key: 'new', label: 'جدید' },
  { key: 'contacted', label: 'تماس گرفته شد' },
  { key: 'done', label: 'انجام شد' },
];

const SORTS: { key: LeadSort; label: string }[] = [
  { key: 'newest', label: 'جدیدترین' },
  { key: 'rating', label: 'بالاترین امتیاز' },
];

export default function LeadsListScreen() {
  const router = useRouter();
  const version = useLeadsVersion((s) => s.version);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [sort, setSort] = useState<LeadSort>('newest');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subtitle, setSubtitle] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rows, counts] = await Promise.all([listLeads(filter, sort), getLeadCounts()]);
      if (cancelled) return;
      setLeads(rows);
      setSubtitle(
        `${toPersianDigits(counts.total)} سرنخ • ${toPersianDigits(counts.needsDetails)} بدون نام`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, sort, version]);

  const openLead = useCallback(
    (id: string) => router.push(`/staff/leads/${id}`),
    [router],
  );

  return (
    <View style={styles.root}>
      <StaffHeader title="سرنخ‌های نمایشگاه" subtitle={subtitle} />
      <View style={styles.filters}>
        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </View>
        <View style={styles.chipRow}>
          {SORTS.map((s) => (
            <Chip
              key={s.key}
              small
              label={s.label}
              selected={sort === s.key}
              onPress={() => setSort(s.key)}
            />
          ))}
        </View>
      </View>
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeadListItem lead={item} onPress={openLead} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === 'all' ? 'هنوز سرنخی ثبت نشده است' : 'موردی با این فیلتر پیدا نشد'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
