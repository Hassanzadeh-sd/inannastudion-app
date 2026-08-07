import * as Notifications from 'expo-notifications';
import { fetchServerLeads } from './server-leads';
import { getSetting, setSetting } from '../db/settings.repo';
import { toPersianDigits } from './digits';

/**
 * Employee-app notifications without any push service: we poll the server
 * (background task every ~15 min + on app foreground) and raise a LOCAL
 * notification when customers newer than the last-seen marker appear.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) await Notifications.requestPermissionsAsync();
  } catch {
    // notifications unavailable (e.g. Expo Go limitations): silently skip
  }
}

/** Poll the server and notify about customers newer than the marker. */
export async function checkForNewCustomers(): Promise<number> {
  const rows = await fetchServerLeads();
  if (!rows) return 0;
  const marker = (await getSetting('last_seen_created_at')) ?? '';
  const fresh = rows.filter((r) => !r.deleted_at && (!marker || r.created_at > marker));

  // First ever check just seeds the marker; no notification storm.
  if (marker && fresh.length > 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'مشتری جدید کلوپ اینانا',
          body:
            fresh.length === 1
              ? 'یک مشتری جدید ثبت شد؛ اطلاعاتش را تکمیل کنید'
              : `${toPersianDigits(fresh.length)} مشتری جدید ثبت شد؛ اطلاعاتشان را تکمیل کنید`,
        },
        trigger: null,
      });
    } catch {
      // display failure must never break the check loop
    }
  }

  const newest = rows.reduce((m, r) => (r.created_at > m ? r.created_at : m), marker);
  if (newest && newest !== marker) await setSetting('last_seen_created_at', newest);
  return marker ? fresh.length : 0;
}

/** Mark everything as seen (called when the employee views the list). */
export async function markCustomersSeen(newestCreatedAt: string | null): Promise<void> {
  if (!newestCreatedAt) return;
  const marker = (await getSetting('last_seen_created_at')) ?? '';
  if (newestCreatedAt > marker) await setSetting('last_seen_created_at', newestCreatedAt);
}
