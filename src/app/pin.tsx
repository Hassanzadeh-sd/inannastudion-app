import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radius, spacing } from '../theme';
import { PersianKeypad } from '../components/PersianKeypad';
import { PinDots } from '../components/PinDots';
import { BigButton } from '../components/BigButton';
import { hasPin, savePin, verifyPin } from '../lib/pin';
import { useSession } from '../store/session';
import { toPersianDigits } from '../lib/digits';

const PIN_LENGTH = 4;

type Step = 'verify' | 'new' | 'confirm';

export default function PinScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const changing = mode === 'change';

  const session = useSession();
  const [step, setStep] = useState<Step | null>(null);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    hasPin().then((exists) => setStep(exists ? 'verify' : 'new'));
  }, []);

  const coolingDown = session.pinCooldownUntil > now;
  useEffect(() => {
    if (!coolingDown) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [coolingDown]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) void handleComplete(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function handleComplete(entered: string) {
    setPin('');
    if (step === 'verify') {
      if (await verifyPin(entered)) {
        session.resetPinFails();
        if (changing) {
          setStep('new');
          setError(null);
        } else {
          session.unlock();
          router.replace('/staff/leads');
        }
      } else {
        session.registerPinFail();
        setError('رمز اشتباه است');
      }
      return;
    }
    if (step === 'new') {
      setFirstPin(entered);
      setStep('confirm');
      setError(null);
      return;
    }
    if (step === 'confirm') {
      if (entered === firstPin) {
        await savePin(entered);
        if (changing) {
          router.back();
        } else {
          session.unlock();
          router.replace('/staff/leads');
        }
      } else {
        setError('تکرار رمز مطابقت ندارد؛ دوباره تلاش کنید');
        setFirstPin('');
        setStep('new');
      }
    }
  }

  if (step === null) return <View style={styles.overlay} />;

  const title =
    step === 'verify'
      ? changing
        ? 'رمز فعلی را وارد کنید'
        : 'رمز کارکنان را وارد کنید'
      : step === 'new'
        ? 'یک رمز ۴ رقمی تعیین کنید'
        : 'رمز را دوباره وارد کنید';

  const cooldownSeconds = Math.max(0, Math.ceil((session.pinCooldownUntil - now) / 1000));

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {coolingDown ? (
          <Text style={styles.error}>
            تلاش زیاد؛ {toPersianDigits(cooldownSeconds)} ثانیه صبر کنید
          </Text>
        ) : (
          <>
            <PinDots length={PIN_LENGTH} filled={pin.length} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.pad}>
              <PersianKeypad
                keyHeight={64}
                onDigit={(d) => setPin((p) => (p.length < PIN_LENGTH ? p + d : p))}
                onBackspace={() => setPin((p) => p.slice(0, -1))}
              />
            </View>
          </>
        )}
        <BigButton label="بستن" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 40, 28, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
  },
  pad: { alignSelf: 'stretch' },
});
