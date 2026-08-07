import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { colors, fonts, gradients, radius, spacing } from '../theme';
import { PersianKeypad } from '../components/PersianKeypad';
import { PinDots } from '../components/PinDots';
import { BigButton } from '../components/BigButton';
import { captureLead, setLeadName, setLeadVerified } from '../db/leads.repo';
import { bumpLeadsVersion } from '../store/leads-version';
import { isValidIranMobile, formatPhoneFa } from '../lib/phone';
import { ltrIsolate, toPersianDigits } from '../lib/digits';
import { pushSoon } from '../lib/sync';
import { generateOtpCode, getOtpConfig, sendOtpSms } from '../lib/otp';
import { useIsCompact } from '../hooks/use-compact';

type Phase = 'idle' | 'phone' | 'verify' | 'name' | 'thanks';

/**
 * Wide screens (tablet): two panes side by side. Compact screens (employee
 * phones, portrait): a single scrollable column, keypad under the content.
 */
function withKioskLayout(
  compact: boolean,
  content: React.ReactNode,
  keypad: React.ReactNode,
) {
  if (compact) {
    return (
      <ScrollView contentContainerStyle={styles.compactScroll}>
        {content}
        {keypad}
      </ScrollView>
    );
  }
  return (
    <View style={styles.split}>
      <View style={styles.pane}>{content}</View>
      <View style={styles.pane}>{keypad}</View>
    </View>
  );
}

const NAME_AUTOSKIP_MS = 20_000;
const THANKS_RESET_MS = 5_000;
const PHONE_IDLE_RESET_MS = 60_000;
const VERIFY_IDLE_MS = 90_000;
const RESEND_COOLDOWN_MS = 45_000;
const OTP_LENGTH = 4;
const HOTSPOT_TAPS = 5;
const HOTSPOT_WINDOW_MS = 3_000;

export default function KioskScreen() {
  const router = useRouter();
  const compact = useIsCompact();
  const [phase, setPhase] = useState<Phase>('idle');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const leadIdRef = useRef<string | null>(null);
  const otpCodeRef = useRef<string | null>(null);
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
    setCodeInput('');
    setOtpError(null);
    leadIdRef.current = null;
    otpCodeRef.current = null;
  }, []);

  // Phase timers: thanks auto-reset, name auto-skip, abandoned-entry resets.
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
    if (phase === 'verify') {
      // Visitor walked away mid-verification: the number is already saved.
      const t = setTimeout(() => setPhase('thanks'), VERIFY_IDLE_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, phone, codeInput, reset]);

  // 1-second tick for the resend countdown.
  useEffect(() => {
    if (phase !== 'verify') return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const onHotspotTap = () => {
    const ts = Date.now();
    hotspotTaps.current = [...hotspotTaps.current.filter((t) => ts - t < HOTSPOT_WINDOW_MS), ts];
    if (hotspotTaps.current.length >= HOTSPOT_TAPS) {
      hotspotTaps.current = [];
      router.push('/pin');
    }
  };

  const sendCode = async (): Promise<boolean> => {
    const config = await getOtpConfig();
    if (!config) return false;
    const code = otpCodeRef.current ?? generateOtpCode();
    const sent = await sendOtpSms(config, phone, code);
    if (sent) {
      otpCodeRef.current = code;
      setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS);
    }
    return sent;
  };

  const submitPhone = async () => {
    if (!isValidIranMobile(phone)) return;
    // Insert immediately: whatever happens next, the number is kept.
    leadIdRef.current = await captureLead(phone);
    bumpLeadsVersion();
    pushSoon();
    // SMS verification only when configured and the SMS actually goes out.
    if (await sendCode()) {
      setCodeInput('');
      setOtpError(null);
      setPhase('verify');
    } else {
      setPhase('name');
    }
  };

  const submitCode = async (entered: string) => {
    if (entered === otpCodeRef.current) {
      if (leadIdRef.current) {
        await setLeadVerified(leadIdRef.current);
        bumpLeadsVersion();
        pushSoon();
      }
      setPhase('name');
    } else {
      setOtpError('کد اشتباه است؛ دوباره تلاش کنید');
      setCodeInput('');
    }
  };

  useEffect(() => {
    if (phase === 'verify' && codeInput.length === OTP_LENGTH) void submitCode(codeInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeInput, phase]);

  const submitName = async () => {
    const trimmed = name.trim();
    if (trimmed && leadIdRef.current) {
      await setLeadName(leadIdRef.current, trimmed);
      bumpLeadsVersion();
      pushSoon();
    }
    setPhase('thanks');
  };

  const resendSeconds = Math.max(0, Math.ceil((resendReadyAt - now) / 1000));

  return (
    <LinearGradient colors={gradients.backdrop} style={styles.root}>
      {phase === 'idle' && (
        <Pressable style={styles.idle} onPress={() => setPhase('phone')}>
          <Image
            source={require('../../assets/images/logo-full.png')}
            style={[styles.logo, compact && styles.logoCompact]}
            contentFit="contain"
          />
          <Text style={styles.clubTitle}>کلوپ مشتریان اینانا</Text>
          <View style={styles.divider} />
          <Text style={styles.idlePrompt}>برای عضویت، صفحه را لمس کنید</Text>
        </Pressable>
      )}

      {phase === 'phone' &&
        withKioskLayout(
          compact,
          <>
            <Text style={styles.paneTitle}>شماره موبایل خود را وارد کنید</Text>
            <View style={styles.phoneDisplay}>
              <Text style={[styles.phoneText, !phone && styles.phonePlaceholder]}>
                {phone ? ltrIsolate(formatPhoneFa(phone)) : ltrIsolate('۰۹۱۲ ۳۴۵ ۶۷۸۹')}
              </Text>
            </View>
            <BigButton
              label="عضویت در کلوپ"
              size="lg"
              disabled={!isValidIranMobile(phone)}
              onPress={submitPhone}
            />
            <BigButton label="انصراف" variant="ghost" onPress={reset} />
          </>,
          <PersianKeypad
            keyHeight={compact ? 60 : 92}
            onDigit={(d) => setPhone((p) => (p.length < 11 ? p + d : p))}
            onBackspace={() => setPhone((p) => p.slice(0, -1))}
            onClear={() => setPhone('')}
          />,
        )}

      {phase === 'verify' &&
        withKioskLayout(
          compact,
          <>
            <Text style={styles.paneTitle}>کد تأیید پیامک‌شده را وارد کنید</Text>
            <Text style={styles.verifySub}>
              کد به شماره {ltrIsolate(formatPhoneFa(phone))} ارسال شد
            </Text>
            <PinDots length={OTP_LENGTH} filled={codeInput.length} />
            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}
            <View style={styles.verifyActions}>
              <BigButton
                label={
                  resendSeconds > 0
                    ? `ارسال مجدد (${toPersianDigits(resendSeconds)})`
                    : 'ارسال مجدد کد'
                }
                variant="ghost"
                disabled={resendSeconds > 0}
                onPress={() => void sendCode()}
              />
              <BigButton label="رد شدن" variant="ghost" onPress={() => setPhase('name')} />
            </View>
          </>,
          <PersianKeypad
            keyHeight={compact ? 60 : 92}
            onDigit={(d) => setCodeInput((c) => (c.length < OTP_LENGTH ? c + d : c))}
            onBackspace={() => setCodeInput((c) => c.slice(0, -1))}
          />,
        )}

      {phase === 'name' && (
        // Top-aligned so the soft keyboard (bottom half in landscape) never
        // covers the input; fullscreen extract mode is disabled on the input.
        <View style={styles.nameWrap}>
          <Text style={styles.paneTitle}>نام شما (اختیاری)</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="نام و نام خانوادگی"
            placeholderTextColor={colors.textFaint}
            autoFocus
            disableFullscreenUI
            maxLength={60}
            onSubmitEditing={submitName}
            returnKeyType="done"
          />
          <View style={styles.nameActions}>
            <BigButton label="ثبت نام" size="lg" onPress={submitName} disabled={!name.trim()} />
            <BigButton
              label="رد شدن"
              variant="ghost"
              size="lg"
              onPress={() => {
                setName('');
                setPhase('thanks');
              }}
            />
          </View>
        </View>
      )}

      {phase === 'thanks' && (
        <View style={styles.center}>
          <Image
            source={require('../../assets/images/logo-emblem.png')}
            style={styles.thanksEmblem}
            contentFit="contain"
          />
          <Text style={styles.thanksTitle}>
            {name.trim() ? `${name.trim()} عزیز` : 'متشکریم!'}
          </Text>
          <Text style={styles.thanksBody}>به کلوپ مشتریان اینانا خوش آمدید</Text>
        </View>
      )}

      {/* Hidden staff hotspot: 5 taps in the top-start corner within 3 s. */}
      <Pressable style={styles.hotspot} onPress={onHotspotTap} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  idle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { width: '58%', aspectRatio: 3 },
  logoCompact: { width: '88%' },
  clubTitle: { fontFamily: fonts.medium, fontSize: 30, color: colors.secondary },
  divider: { width: 140, height: 2, backgroundColor: colors.accent2, marginVertical: spacing.md },
  idlePrompt: { fontFamily: fonts.medium, fontSize: 26, color: colors.textMuted },
  split: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  compactScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pane: { flex: 1, gap: spacing.lg, justifyContent: 'center' },
  paneTitle: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, textAlign: 'center' },
  verifySub: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  otpError: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.danger,
    textAlign: 'center',
  },
  verifyActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  phoneDisplay: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  phoneText: { fontFamily: fonts.bold, fontSize: 40, color: colors.accentSoft },
  phonePlaceholder: { color: colors.textFaint },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  nameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xl,
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
  thanksEmblem: { width: 180, height: 130 },
  thanksTitle: { fontFamily: fonts.black, fontSize: 56, color: colors.text },
  thanksBody: { fontFamily: fonts.medium, fontSize: 30, color: colors.accentSoft },
  hotspot: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: 72,
    height: 72,
  },
});
