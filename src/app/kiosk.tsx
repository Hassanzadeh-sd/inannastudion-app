import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { colors, fonts, radius, spacing } from '../theme';
import { PersianKeypad } from '../components/PersianKeypad';
import { BigButton } from '../components/BigButton';
import { captureLead, setLeadName } from '../db/leads.repo';
import { bumpLeadsVersion } from '../store/leads-version';
import { isValidIranMobile, formatPhoneFa } from '../lib/phone';
import { ltrIsolate } from '../lib/digits';
import { pushSoon } from '../lib/sync';

type Phase = 'idle' | 'phone' | 'name' | 'thanks';

const NAME_AUTOSKIP_MS = 20_000;
const THANKS_RESET_MS = 5_000;
const PHONE_IDLE_RESET_MS = 60_000;
const HOTSPOT_TAPS = 5;
const HOTSPOT_WINDOW_MS = 3_000;

export default function KioskScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const leadIdRef = useRef<string | null>(null);
  const hotspotTaps = useRef<number[]>([]);

  // Swallow the hardware back button while the kiosk is front and center.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      return () => {
        sub.remove();
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      };
    }, []),
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setPhone('');
    setName('');
    leadIdRef.current = null;
  }, []);

  // Phase timers: thanks auto-reset, name auto-skip, abandoned-entry reset.
  useEffect(() => {
    if (phase === 'thanks') {
      const t = setTimeout(reset, THANKS_RESET_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'name') {
      const t = setTimeout(() => setPhase('thanks'), NAME_AUTOSKIP_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'phone') {
      const t = setTimeout(reset, PHONE_IDLE_RESET_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, phone, reset]);

  const onHotspotTap = () => {
    const now = Date.now();
    hotspotTaps.current = [...hotspotTaps.current.filter((t) => now - t < HOTSPOT_WINDOW_MS), now];
    if (hotspotTaps.current.length >= HOTSPOT_TAPS) {
      hotspotTaps.current = [];
      router.push('/pin');
    }
  };

  const submitPhone = async () => {
    if (!isValidIranMobile(phone)) return;
    // Insert immediately: if the visitor walks away mid-name, the number is kept.
    leadIdRef.current = await captureLead(phone);
    bumpLeadsVersion();
    pushSoon();
    setPhase('name');
  };

  const submitName = async () => {
    const trimmed = name.trim();
    if (trimmed && leadIdRef.current) {
      await setLeadName(leadIdRef.current, trimmed);
      bumpLeadsVersion();
      pushSoon();
    }
    setPhase('thanks');
  };

  return (
    <View style={styles.root}>
      {phase === 'idle' && (
        <Pressable style={styles.idle} onPress={() => setPhase('phone')}>
          <Text style={styles.brandMark}>✦</Text>
          <Text style={styles.brandTitle}>استودیو اینانا</Text>
          <View style={styles.divider} />
          <Text style={styles.idlePrompt}>برای ثبت شماره تماس، صفحه را لمس کنید</Text>
        </Pressable>
      )}

      {phase === 'phone' && (
        <View style={styles.split}>
          <View style={styles.pane}>
            <Text style={styles.paneTitle}>شماره موبایل خود را وارد کنید</Text>
            <View style={styles.phoneDisplay}>
              <Text style={styles.phoneText}>
                {phone ? ltrIsolate(formatPhoneFa(phone)) : 'مثال: ۰۹۱۲ ۳۴۵ ۶۷۸۹'}
              </Text>
            </View>
            <BigButton
              label="ثبت شماره"
              size="lg"
              disabled={!isValidIranMobile(phone)}
              onPress={submitPhone}
            />
            <BigButton label="انصراف" variant="ghost" onPress={reset} />
          </View>
          <View style={styles.pane}>
            <PersianKeypad
              keyHeight={92}
              onDigit={(d) => setPhone((p) => (p.length < 11 ? p + d : p))}
              onBackspace={() => setPhone((p) => p.slice(0, -1))}
              onClear={() => setPhone('')}
            />
          </View>
        </View>
      )}

      {phase === 'name' && (
        <View style={styles.center}>
          <Text style={styles.paneTitle}>نام شما (اختیاری)</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="نام و نام خانوادگی"
            placeholderTextColor={colors.textFaint}
            autoFocus
            maxLength={60}
            onSubmitEditing={submitName}
            returnKeyType="done"
          />
          <View style={styles.nameActions}>
            <BigButton label="ثبت نام" size="lg" onPress={submitName} disabled={!name.trim()} />
            <BigButton label="رد شدن" variant="ghost" size="lg" onPress={() => setPhase('thanks')} />
          </View>
        </View>
      )}

      {phase === 'thanks' && (
        <View style={styles.center}>
          <Text style={styles.thanksMark}>✓</Text>
          <Text style={styles.thanksTitle}>متشکریم!</Text>
          <Text style={styles.thanksBody}>کارشناسان استودیو اینانا با شما تماس می‌گیرند</Text>
        </View>
      )}

      {/* Hidden staff hotspot: 5 taps in the top-start corner within 3 s. */}
      <Pressable style={styles.hotspot} onPress={onHotspotTap} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  idle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  brandMark: { fontSize: 64, color: colors.accent },
  brandTitle: { fontFamily: fonts.black, fontSize: 72, color: colors.text },
  divider: { width: 120, height: 2, backgroundColor: colors.accent, marginVertical: spacing.md },
  idlePrompt: { fontFamily: fonts.medium, fontSize: 26, color: colors.textMuted },
  split: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  pane: { flex: 1, gap: spacing.lg, justifyContent: 'center' },
  paneTitle: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, textAlign: 'center' },
  phoneDisplay: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  phoneText: { fontFamily: fonts.bold, fontSize: 40, color: colors.accentSoft },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  nameInput: {
    fontFamily: fonts.medium,
    fontSize: 30,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '70%',
    textAlign: 'right',
  },
  nameActions: { flexDirection: 'row', gap: spacing.md },
  thanksMark: { fontSize: 80, color: colors.success },
  thanksTitle: { fontFamily: fonts.black, fontSize: 56, color: colors.text },
  thanksBody: { fontFamily: fonts.regular, fontSize: 26, color: colors.textMuted },
  hotspot: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: 72,
    height: 72,
  },
});
