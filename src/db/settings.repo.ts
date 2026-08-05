import * as Crypto from 'expo-crypto';
import { getDb } from './index';

export type SettingKey =
  | 'pin_hash'
  | 'pin_salt'
  | 'sync_url'
  | 'sync_token'
  | 'device_id'
  | 'last_sync_at'
  | 'sms_api_key'
  | 'sms_template';

export async function getSetting(key: SettingKey): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
}

export async function getDeviceId(): Promise<string> {
  let id = await getSetting('device_id');
  if (!id) {
    id = Crypto.randomUUID();
    await setSetting('device_id', id);
  }
  return id;
}
