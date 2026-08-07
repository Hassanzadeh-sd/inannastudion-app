import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useKeepAwake } from 'expo-keep-awake';
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from '@expo-google-fonts/vazirmatn';
import { getDb } from '../db';
import { startSyncLoop } from '../lib/sync';
import { colors } from '../theme';
import { IS_EMPLOYEE_APP } from '../lib/variant';
import { checkForNewCustomers, ensureNotificationPermission } from '../lib/notify';
import { registerNewCustomerTask } from '../lib/notify-task';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useKeepAwake();
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb().then(() => {
      setDbReady(true);
      startSyncLoop();
    });
  }, []);

  // Employee app: notification permission, background polling, and an
  // immediate check whenever the app returns to the foreground.
  useEffect(() => {
    if (!IS_EMPLOYEE_APP) return undefined;
    void ensureNotificationPermission();
    void registerNewCustomerTask();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForNewCustomers();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) SplashScreen.hideAsync();
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="pin" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}
