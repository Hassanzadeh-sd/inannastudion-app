import { toAsciiDigits, toPersianDigits } from './digits';

export const IRAN_MOBILE_RE = /^09\d{9}$/;

/** Canonical storage form: ASCII 09xxxxxxxxx. */
export function normalizePhone(raw: string): string {
  let p = toAsciiDigits(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('+98')) p = '0' + p.slice(3);
  else if (p.startsWith('0098')) p = '0' + p.slice(4);
  else if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
  return p;
}

export function isValidIranMobile(raw: string): boolean {
  return IRAN_MOBILE_RE.test(normalizePhone(raw));
}

/** 09121234567 → +989121234567 (for vCards / dialing). */
export function toE164(phone: string): string {
  const p = normalizePhone(phone);
  return p.startsWith('09') ? '+98' + p.slice(1) : p;
}

/** Grouped Persian-digit display: ۰۹۱۲ ۳۴۵ ۶۷۸۹ (partial input safe). */
export function formatPhoneFa(phone: string): string {
  const p = normalizePhone(phone);
  const parts = [p.slice(0, 4), p.slice(4, 7), p.slice(7, 11)].filter(Boolean);
  return toPersianDigits(parts.join(' '));
}
