import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, spacing } from '../../../theme';
import { StaffHeader } from '../../../components/StaffHeader';
import { Chip } from '../../../components/Chip';
import { LeadListItem } from '../../../components/LeadListItem';
import { getLeadCounts, listLeads, type Lead, type LeadSort } from '../../../db/leads.repo';
import { getSetting } from '../../../db/settings.repo';
import { IS_EMPLOYEE_APP } from '../../../lib/variant';
import { useLeadsVersion } from '../../../store/leads-version';
import { useServerLeads } from '../../../store/server-leads';
import { toAsciiDigits, toPersianDigits } from '../../../lib/digits';

type Completeness = 'incomplete' | 'complete' | 'all';

const COMPLETENESS: { key: Completeness; label: string }[] = [
  { key: 'incomplete', label: 'ناقص' },
  { key: 'complete', label: 'تکمیل‌شده' },
  { key: 'all', label: 'همه' },
];

const SORTS: { key: LeadSort; label: string }[] = [
  { key: 'newest', label: 'جدیدترین' },
  { key: 'rating', label: 'بالاترین امتیاز' },
];

/** Complete = an employee has attached both a name and a rating. */
function isComplete(lead: Lead): boolean {
  return !!lead.name && lead.rating != null;
}

function applyFilters(
  rows: Lead[],
  completeness: Completeness,
  query: string,
  sort: LeadSort,
): Lead[] {
  let out = rows.filter((l) => !l.deleted_at);
  if (completeness === 'incomplete') out = out.filter((l) => !isComplete(l));
  else if (completeness === 'complete') out = out.filter(isComplete);
  const q = toAsciiDigits(query.trim());
  if (q) {
    out = out.filter(
      (l) =>
        l.phone.includes(q) ||
        (l.name ?? '').toLowerCase().includes(q.toLowerCase()),
    );
  }
  return [...out].sort((a, b) =>
    sort === 'rating'
      ? (b.rating ?? 0) - (a.rating ?? 0) || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at),
  );
}

export default function LeadsListScreen() {
  const router = useRouter();
  const version = useLeadsVersion((s) => s.version);
  const server = useServerLeads();
  const [serverMode, setServerMode] = useState<boolean | null>(null);
  const [completeness, setCompleteness] = useState<Completeness>(
    IS_EMPLOYEE_APP ? 'incomplete' : 'all',
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LeadSort>('newest');
  const [localRows, setLocalRows] = useState<Lead[]>([]);
  const [subtitle, setSubtitle] = useState('');

  useEffect(() => {
    getSetting('server_mode').then((v) => setServerMode(IS_EMPLOYEE_APP || v === '1'));
  }, []);

  // Server mode: poll the shared list while this screen is open.
  useEffect(() => {
    if (!serverMode) return undefined;
    void server.refresh();
    const t = setInterval(() => void server.refresh(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMode]);

  // Local mode: reload this device's rows when anything changes.
  useEffect(() => {
    if (serverMode !== false) return;
    let cancelled = false;
    (async () => {
      const [rows, counts] = await Promise.all([listLeads('all', 'newest'), getLeadCounts()]);
      if (cancelled) return;
      setLocalRows(rows);
      setSubtitle(
        `${toPersianDigits(counts.total)} مشتری • ${toPersianDigits(counts.needsDetails)} بدون نام`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [serverMode, version]);

  // Server mode subtitle from the live list.
  useEffect(() => {
    if (!serverMode) return;
    const active = server.leads.filter((l) => !l.deleted_at);
    const incomplete = active.filter((l) => !isComplete(l)).length;
    setSubtitle(
      `${toPersianDigits(active.length)} مشتری • ${toPersianDigits(incomplete)} ناقص • سرور`,
    );
  }, [serverMode, server.leads]);

  const baseRows = serverMode ? server.leads : localRows;
  const leads = applyFilters(baseRows, completeness, query, sort);

  const openLead = useCallback(
    (id: string) => router.push(`/staff/leads/${id}`),
    [router],
  );

  return (
    <View style={styles.root}>
      <StaffHeader title="ثبت اطلاعات مشتریان" subtitle={subtitle} />
      {serverMode && server.error ? (
        <Text style={styles.serverError}>اتصال به سرور برقرار نشد؛ اینترنت و تنظیمات را بررسی کنید</Text>
      ) : null}
      <View style={styles.filters}>
        <View style={styles.chipRow}>
          {COMPLETENESS.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              selected={completeness === c.key}
              onPress={() => setCompleteness(c.key)}
            />
          ))}
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="جستجو: نام یا شماره…"
            placeholderTextColor={colors.textFaint}
            disableFullscreenUI
            clearButtonMode="while-editing"
          />
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
          {serverMode ? (
            <Chip
              small
              label={server.loading ? 'در حال دریافت…' : 'به‌روزرسانی'}
              selected={false}
              onPress={() => void server.refresh()}
            />
          ) : null}
        </View>
      </View>
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeadListItem lead={item} onPress={openLead} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query
              ? 'مشتری‌ای با این جستجو پیدا نشد'
              : completeness === 'incomplete'
                ? 'هیچ مشتری ناقصی نمانده؛ همه تکمیل شده‌اند'
                : 'هنوز مشتری‌ای ثبت نشده است'}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  search: {
    flexGrow: 1,
    minWidth: 180,
    minHeight: 44,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'right',
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  serverError: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
