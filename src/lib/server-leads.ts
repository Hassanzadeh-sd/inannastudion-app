import type { Lead, LeadPatch } from '../db/leads.repo';
import { getSetting } from '../db/settings.repo';

/**
 * Employee mode (حالت همکار): instead of the device-local database, the
 * customers tab reads and edits the shared list on the VPS, so every
 * employee phone sees kiosk signups from all devices as they arrive.
 */

async function getConfig(): Promise<{ url: string; token: string } | null> {
  const [url, token] = await Promise.all([getSetting('sync_url'), getSetting('sync_token')]);
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function request(path: string, init: RequestInit = {}): Promise<Response | null> {
  const config = await getConfig();
  if (!config) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchServerLeads(): Promise<Lead[] | null> {
  const res = await request('/admin/api/leads');
  if (!res?.ok) return null;
  const body = (await res.json()) as { leads?: Lead[] };
  return body.leads ?? [];
}

export async function updateServerLead(id: string, patch: LeadPatch): Promise<boolean> {
  const res = await request(`/admin/api/leads/${id}`, {
    method: 'POST',
    body: JSON.stringify(patch),
  });
  return res?.ok ?? false;
}
