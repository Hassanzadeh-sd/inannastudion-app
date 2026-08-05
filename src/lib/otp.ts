import { getSetting } from '../db/settings.repo';

/**
 * SMS verification codes via Kavenegar's Verify Lookup API (template-based
 * OTP, works Iran→Iran so the tablet calls it directly). Configured in the
 * staff Settings screen; when unconfigured or unreachable, the kiosk simply
 * skips verification so no visitor is ever lost to an SMS hiccup.
 */

export interface OtpConfig {
  apiKey: string;
  template: string;
}

export async function getOtpConfig(): Promise<OtpConfig | null> {
  const [apiKey, template] = await Promise.all([
    getSetting('sms_api_key'),
    getSetting('sms_template'),
  ]);
  if (!apiKey || !template) return null;
  return { apiKey, template };
}

export function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function sendOtpSms(
  config: OtpConfig,
  phone: string,
  code: string,
): Promise<boolean> {
  const url =
    `https://api.kavenegar.com/v1/${config.apiKey}/verify/lookup.json` +
    `?receptor=${encodeURIComponent(phone)}` +
    `&token=${encodeURIComponent(code)}` +
    `&template=${encodeURIComponent(config.template)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const body = (await res.json()) as { return?: { status?: number } };
    return body.return?.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
