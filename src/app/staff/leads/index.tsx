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
import { getSetting } from '../../../db/settings.repo';
import { useLeadsVersion } from '../../../store/leads-version';
import { useServerLeads } from '../../../store/server-leads';
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

function applyFilterSort(rows: Lead[], filter: LeadFilter, sort: LeadSort): Lead[] {
  let out = rows.filter((l) => !l.deleted_at);
  if (filter === 'needs_details') out = out.filter((l) => !l.name);
  else if (filter !== 'all') out = out.filter((l) => l.status === filter);
  out = [...out].sort((a, b) =>
    sort === 'rating'
      ? (b.rating ?? 0) - (a.rating ?? 0) || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at),
  );
  return out;
}

export default function LeadsListScreen() {
  const router = useRouter();
  const version = useLeadsVersion((s) => s.version);
  const server = useServerLeads();
  const [serverMode, setServerMode] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [sort, setSort] = useState<LeadSort>('newest');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subtitle, setSubtitle] = useState('');

  useEffect(() => {
    getSetting('server_mode').then((v) => setServerMode(v === '1'));
  }, []);

  // Employee mode: poll the shared server list while this screen is open.
  useEffect(() => {
    if (!serverMode) return undefined;
    void server.refresh();
    const t = setInterval(() => void server.refresh(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMode]);

  useEffect(() => {
    if (serverMode === null) return;
    if (serverMode) {
      const rows = applyFilterSort(server.leads, filter, sort);
      setLeads(rows);
      const active = server.leads.filter((l) => !l.deleted_at);
      const needs = active.filter((l) => !l.name).length;
      setSubtitle(
        `${toPersianDigits(active.length)} مشتری • ${toPersianDigits(needs)} بدون نام • سرور`,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const [rows, counts] = await Promise.all([listLeads(filter, sort), getLeadCounts()]);
      if (cancelled) return;
      setLeads(rows);
      setSubtitle(
        `${toPersianDigits(counts.total)} مشتری • ${toPersianDigits(counts.needsDetails)} بدون نام`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [serverMode, filter, sort, version, server.leads]);

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
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === 'all' ? 'هنوز مشتری‌ای ثبت نشده است' : 'موردی با این فیلتر پیدا نشد'}
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
  serverError: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
