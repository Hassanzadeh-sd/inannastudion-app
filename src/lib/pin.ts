import * as Crypto from 'expo-crypto';
import { deleteSetting, getSetting, setSetting } from '../db/settings.repo';

async function hash(pin: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export async function hasPin(): Promise<boolean> {
  return (await getSetting('pin_hash')) != null;
}

export async function savePin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await setSetting('pin_salt', salt);
  await setSetting('pin_hash', await hash(pin, salt));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [storedHash, salt] = await Promise.all([
    getSetting('pin_hash'),
    getSetting('pin_salt'),
  ]);
  if (!storedHash || !salt) return false;
  return (await hash(pin, salt)) === storedHash;
}

export async function clearPin(): Promise<void> {
  await deleteSetting('pin_hash');
  await deleteSetting('pin_salt');
}
