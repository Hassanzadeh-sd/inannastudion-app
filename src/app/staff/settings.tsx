import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, spacing } from '../../theme';
import { StaffHeader } from '../../components/StaffHeader';
import { BigButton } from '../../components/BigButton';
import { getSetting, setSetting } from '../../db/settings.repo';
import { pushPending } from '../../lib/sync';
import { useSyncStatus } from '../../store/sync-status';
import { shareCsv, shareXlsx } from '../../lib/exporter';
import { formatFaDateTime, toPersianDigits } from '../../lib/digits';

const PHASE_FA: Record<string, string> = {
  idle: 'در انتظار',
  syncing: 'در حال ارسال…',
  ok: 'موفق',
  error: 'خطا',
  unconfigured: 'پیکربندی نشده',
};

export default function SettingsScreen() {
  const router = useRouter();
  const sync = useSyncStatus();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getSetting('sync_url'), getSetting('sync_token')]).then(([u, t]) => {
      if (u) setUrl(u);
      if (t) setToken(t);
    });
  }, []);

  const saveSync = async () => {
    await setSetting('sync_url', url.trim());
    await setSetting('sync_token', token.trim());
    ToastAndroid.show('تنظیمات ذخیره شد', ToastAndroid.SHORT);
  };

  const syncNow = async () => {
    setBusy(true);
    const result = await pushPending(true);
    setBusy(false);
    ToastAndroid.show(
      result.ok
        ? `ارسال شد (${toPersianDigits(result.pushed)} مورد)`
        : `خطا: ${result.error ?? ''}`,
      ToastAndroid.LONG,
    );
  };

  const doExport = async (kind: 'csv' | 'xlsx') => {
    try {
      const count = kind === 'csv' ? await shareCsv() : await shareXlsx();
      ToastAndroid.show(`${toPersianDigits(count)} سرنخ در فایل`, ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show('خروجی گرفتن ناموفق بود', ToastAndroid.LONG);
    }
  };

  return (
    <View style={styles.root}>
      <StaffHeader title="تنظیمات" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.columns}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>پشتیبان‌گیری روی سرور</Text>
            <Text style={styles.label}>آدرس سرور</Text>
            <TextInput
              style={styles.ltrInput}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/lead-api"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.label}>توکن دسترسی</Text>
            <TextInput
              style={styles.ltrInput}
              value={token}
              onChangeText={setToken}
              placeholder="token"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.row}>
              <BigButton label="ذخیره تنظیمات" variant="ghost" onPress={saveSync} />
              <BigButton
                label={busy ? '…' : 'همگام‌سازی'}
                onPress={syncNow}
                disabled={busy}
              />
            </View>
            <Text style={styles.statusText}>
              وضعیت: {PHASE_FA[sync.phase] ?? sync.phase}
              {' • '}در صف: {toPersianDigits(sync.pendingCount)}
              {sync.lastSyncAt ? ` • آخرین ارسال: ${formatFaDateTime(sync.lastSyncAt)}` : ''}
            </Text>
            {sync.lastError ? <Text style={styles.errorText}>{sync.lastError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>خروجی سرنخ‌ها</Text>
            <View style={styles.row}>
              <BigButton label="فایل CSV" onPress={() => doExport('csv')} />
              <BigButton label="فایل Excel" onPress={() => doExport('xlsx')} />
            </View>
            <Text style={styles.hint}>
              فایل از طریق تلگرام یا ایمیل قابل ارسال است و در Excel با متن فارسی درست باز می‌شود
            </Text>

            <Text style={styles.sectionTitle}>امنیت</Text>
            <BigButton
              label="تغییر رمز کارکنان"
              variant="ghost"
              onPress={() => router.push('/pin?mode=change')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  columns: { flexDirection: 'row', gap: spacing.xl },
  section: { flex: 1, gap: spacing.sm },
  sectionTitle: {
    fontFamily: fonts.black,
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  ltrInput: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  statusText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  errorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.textFaint },
});
