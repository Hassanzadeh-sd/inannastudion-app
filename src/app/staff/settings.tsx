import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
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
  const [smsKey, setSmsKey] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('');
  const [serverMode, setServerMode] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting('sync_url'),
      getSetting('sync_token'),
      getSetting('sms_api_key'),
      getSetting('sms_template'),
      getSetting('server_mode'),
    ]).then(([u, t, k, tpl, sm]) => {
      if (u) setUrl(u);
      if (t) setToken(t);
      if (k) setSmsKey(k);
      if (tpl) setSmsTemplate(tpl);
      setServerMode(sm === '1');
    });
  }, []);

  const toggleServerMode = async (value: boolean) => {
    setServerMode(value);
    await setSetting('server_mode', value ? '1' : '');
    ToastAndroid.show(
      value ? 'حالت همکار فعال شد؛ فهرست مشتریان از سرور خوانده می‌شود' : 'حالت همکار غیرفعال شد',
      ToastAndroid.SHORT,
    );
  };

  const saveSync = async () => {
    await setSetting('sync_url', url.trim());
    await setSetting('sync_token', token.trim());
    ToastAndroid.show('تنظیمات ذخیره شد', ToastAndroid.SHORT);
  };

  const saveSms = async () => {
    await setSetting('sms_api_key', smsKey.trim());
    await setSetting('sms_template', smsTemplate.trim());
    ToastAndroid.show(
      smsKey.trim() && smsTemplate.trim()
        ? 'کد تأیید پیامکی فعال شد'
        : 'کد تأیید پیامکی غیرفعال است',
      ToastAndroid.SHORT,
    );
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
      ToastAndroid.show(`${toPersianDigits(count)} مشتری در فایل`, ToastAndroid.SHORT);
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

            <Text style={styles.sectionTitle}>حالت همکار</Text>
            <View style={styles.switchRow}>
              <Switch
                value={serverMode}
                onValueChange={toggleServerMode}
                thumbColor={serverMode ? colors.accent : colors.textFaint}
                trackColor={{ false: colors.surfaceRaised, true: colors.accent2 }}
              />
              <Text style={styles.switchLabel}>نمایش و ویرایش مشتریان از سرور</Text>
            </View>
            <Text style={styles.hint}>
              برای گوشی همکاران روشن کنید: فهرست مشتریان همه دستگاه‌ها را زنده می‌بینند و تکمیل
              می‌کنند (نیازمند اینترنت). روی تبلت نمایشگاه خاموش بماند؛ ثبت شماره در هر حالت
              آفلاین کار می‌کند
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>کد تأیید پیامکی (کلوپ مشتریان)</Text>
            <Text style={styles.label}>کلید API کاوه‌نگار</Text>
            <TextInput
              style={styles.ltrInput}
              value={smsKey}
              onChangeText={setSmsKey}
              placeholder="Kavenegar API Key"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>نام قالب تأیید (template)</Text>
            <TextInput
              style={styles.ltrInput}
              value={smsTemplate}
              onChangeText={setSmsTemplate}
              placeholder="verify-template"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.row}>
              <BigButton label="ذخیره" variant="ghost" onPress={saveSms} />
            </View>
            <Text style={styles.hint}>
              با کلید و قالب خالی، عضویت بدون کد تأیید ثبت می‌شود؛ اگر ارسال پیامک هم ناموفق باشد،
              شماره باز هم ذخیره می‌شود
            </Text>

            <Text style={styles.sectionTitle}>خروجی اطلاعات مشتریان</Text>
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
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, flexShrink: 1 },
  statusText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  errorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.textFaint },
});
