import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radius, spacing } from '../../../theme';
import { BigButton } from '../../../components/BigButton';
import { Chip } from '../../../components/Chip';
import { StarRating } from '../../../components/StarRating';
import { STATUS_FA } from '../../../components/LeadListItem';
import {
  getLead,
  softDeleteLead,
  updateLead,
  type Lead,
  type LeadPatch,
  type LeadStatus,
} from '../../../db/leads.repo';
import { getSetting } from '../../../db/settings.repo';
import { IS_EMPLOYEE_APP } from '../../../lib/variant';
import { updateServerLead } from '../../../lib/server-leads';
import { useServerLeads } from '../../../store/server-leads';
import { bumpLeadsVersion } from '../../../store/leads-version';
import { FOLLOWUP_CHIPS } from '../../../constants/team';
import { formatFaDateTime, ltrIsolate } from '../../../lib/digits';
import { formatPhoneFa } from '../../../lib/phone';
import { pushSoon } from '../../../lib/sync';
import { useIsCompact } from '../../../hooks/use-compact';

const CHIP_SEPARATOR = '، ';

function splitFollowup(followup: string | null): { chips: string[]; extra: string } {
  if (!followup) return { chips: [], extra: '' };
  const parts = followup.split(CHIP_SEPARATOR);
  const chips = parts.filter((p) => (FOLLOWUP_CHIPS as readonly string[]).includes(p));
  const extra = parts.filter((p) => !(FOLLOWUP_CHIPS as readonly string[]).includes(p)).join(CHIP_SEPARATOR);
  return { chips, extra };
}

export default function LeadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const compact = useIsCompact();
  const serverStore = useServerLeads();

  const [serverMode, setServerMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [name, setName] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [extraPlan, setExtraPlan] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const isServer = IS_EMPLOYEE_APP || (await getSetting('server_mode')) === '1';
      setServerMode(isServer);
      const lead: Lead | null = isServer
        ? (useServerLeads.getState().leads.find((l) => l.id === id) ?? null)
        : await getLead(id);
      if (!lead) {
        router.back();
        return;
      }
      setPhone(lead.phone);
      setCreatedAt(lead.created_at);
      setName(lead.name ?? '');
      setRating(lead.rating);
      setNote(lead.note ?? '');
      const f = splitFollowup(lead.followup);
      setChips(f.chips);
      setExtraPlan(f.extra);
      setStatus(lead.status);
      setLoaded(true);
    })();
  }, [id, router]);

  const toggleChip = (chip: string) =>
    setChips((c) => (c.includes(chip) ? c.filter((x) => x !== chip) : [...c, chip]));

  const save = async () => {
    if (!id) return;
    const followup = [...chips, extraPlan.trim()].filter(Boolean).join(CHIP_SEPARATOR);
    const patch: LeadPatch = {
      name: name.trim() || null,
      rating: rating || null,
      note: note.trim() || null,
      followup: followup || null,
      status,
    };
    if (serverMode) {
      const ok = await updateServerLead(id, patch);
      if (!ok) {
        ToastAndroid.show('ذخیره روی سرور ناموفق بود؛ اینترنت را بررسی کنید', ToastAndroid.LONG);
        return;
      }
      void serverStore.refresh();
    } else {
      await updateLead(id, patch);
      bumpLeadsVersion();
      pushSoon();
    }
    ToastAndroid.show('ذخیره شد', ToastAndroid.SHORT);
    router.back();
  };

  const remove = () => {
    Alert.alert('حذف مشتری', 'اطلاعات این مشتری حذف شود؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          await softDeleteLead(id);
          bumpLeadsVersion();
          pushSoon();
          router.back();
        },
      },
    ]);
  };

  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.phone}>{ltrIsolate(formatPhoneFa(phone))}</Text>
            <Text style={styles.date}>
              ثبت: {formatFaDateTime(createdAt)}
              {serverMode ? ' • سرور' : ''}
            </Text>
          </View>
          <BigButton label="بازگشت" variant="ghost" onPress={() => router.back()} />
        </View>

        <View style={[styles.columns, compact && styles.columnsCompact]}>
          <View style={styles.col}>
            <Text style={styles.label}>نام</Text>
            <TextInput
              disableFullscreenUI
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="نام و نام خانوادگی"
              placeholderTextColor={colors.textFaint}
              maxLength={60}
            />

            <Text style={styles.label}>امتیاز</Text>
            <StarRating value={rating} onChange={(v) => setRating(v || null)} size={44} />

            <Text style={styles.label}>وضعیت</Text>
            <View style={styles.chipRow}>
              {(Object.keys(STATUS_FA) as LeadStatus[]).map((s) => (
                <Chip
                  key={s}
                  label={STATUS_FA[s]}
                  selected={status === s}
                  onPress={() => setStatus(s)}
                />
              ))}
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>برنامه پیگیری</Text>
            <View style={styles.chipRow}>
              {FOLLOWUP_CHIPS.map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  selected={chips.includes(chip)}
                  onPress={() => toggleChip(chip)}
                />
              ))}
            </View>
            <TextInput
              disableFullscreenUI
              style={styles.input}
              value={extraPlan}
              onChangeText={setExtraPlan}
              placeholder="برنامه دیگر…"
              placeholderTextColor={colors.textFaint}
              maxLength={200}
            />

            <Text style={styles.label}>یادداشت</Text>
            <TextInput
              disableFullscreenUI
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="مثلاً: به سرویس عکاسی صنعتی علاقه داشت"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <BigButton label="ذخیره" size="lg" onPress={save} style={styles.saveButton} />
          {!serverMode ? <BigButton label="حذف" variant="danger" onPress={remove} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phone: { fontFamily: fonts.black, fontSize: 34, color: colors.accentSoft },
  date: { fontFamily: fonts.regular, fontSize: 14, color: colors.textFaint },
  columns: { flexDirection: 'row', gap: spacing.xl },
  columnsCompact: { flexDirection: 'column', gap: spacing.md },
  col: { flex: 1, gap: spacing.sm },
  label: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 19,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    textAlign: 'right',
  },
  noteInput: { minHeight: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  saveButton: { flex: 1 },
});
