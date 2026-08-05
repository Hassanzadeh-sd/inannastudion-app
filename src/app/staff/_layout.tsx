import { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../theme';
import { RELOCK_AFTER_MS, useSession } from '../../store/session';

export default function StaffLayout() {
  const unlocked = useSession((s) => s.unlocked);
  const touch = useSession((s) => s.touch);
  const router = useRouter();

  // Auto-relock after inactivity and drop back to the kiosk.
  useEffect(() => {
    if (!unlocked) return undefined;
    const t = setInterval(() => {
      const { lastActivity, lock } = useSession.getState();
      if (Date.now() - lastActivity > RELOCK_AFTER_MS) {
        lock();
        router.replace('/kiosk');
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [unlocked, router]);

  if (!unlocked) return <Redirect href="/kiosk" />;

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        touch();
        return false;
      }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 64,
          },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 13 },
        }}
      >
        <Tabs.Screen
          name="leads"
          options={{
            title: 'مشتریان',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-account-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="cards"
          options={{
            title: 'کارت ویزیت',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="qrcode" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            title: 'تیم',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'تنظیمات',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
