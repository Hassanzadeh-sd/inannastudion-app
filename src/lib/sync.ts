import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { getDirtyBatch, markPushed } from '../db/leads.repo';
import { getDeviceId, getSetting, setSetting } from '../db/settings.repo';
import { useSyncStatus } from '../store/sync-status';

/**
 * Push-only sync engine. The tablet's SQLite is the source of truth; dirty
 * rows are batched to the VPS whenever there is a chance of connectivity.
 * Every push is idempotent (UUID upsert server-side), so retrying is always
 * safe.
 */

const BATCH_SIZE = 500;
const REQUEST_TIMEOUT_MS = 15_000;
const INTERVAL_MS = 60_000;
const BACKOFF_STEPS_MS = [30_000, 120_000, 600_000];

let pushing = false;
let backoffIndex = -1;
let backoffUntil = 0;
let soonTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

async function refreshPendingCount(): Promise<number> {
  const batch = await getDirtyBatch(BATCH_SIZE);
  useSyncStatus.getState().set({ pendingCount: batch.length });
  return batch.length;
}

export interface PushResult {
  ok: boolean;
  pushed: number;
  error?: string;
}

export async function pushPending(manual = false): Promise<PushResult> {
  const status = useSyncStatus.getState();
  if (pushing) return { ok: true, pushed: 0 };
  if (!manual && Date.now() < backoffUntil) return { ok: false, pushed: 0, error: 'backoff' };

  const [url, token] = await Promise.all([getSetting('sync_url'), getSetting('sync_token')]);
  if (!url || !token) {
    status.set({ phase: 'unconfigured' });
    await refreshPendingCount();
    return { ok: false, pushed: 0, error: 'unconfigured' };
  }

  pushing = true;
  status.set({ phase: 'syncing', lastError: null });
  let pushed = 0;
  try {
    const deviceId = await getDeviceId();
    for (;;) {
      const batch = await getDirtyBatch(BATCH_SIZE);
      if (batch.length === 0) break;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${url.replace(/\/+$/, '')}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ device_id: deviceId, records: batch }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { accepted?: string[] };
      const accepted = new Set(body.accepted ?? batch.map((r) => r.id));
      const pushedAt = new Date().toISOString();
      await markPushed(
        batch
          .filter((r) => accepted.has(r.id))
          .map((r) => ({ id: r.id, updated_at: r.updated_at })),
        pushedAt,
      );
      pushed += accepted.size;
      if (batch.length < BATCH_SIZE) break;
    }

    backoffIndex = -1;
    backoffUntil = 0;
    const at = new Date().toISOString();
    await setSetting('last_sync_at', at);
    status.set({ phase: 'ok', lastSyncAt: at });
    await refreshPendingCount();
    return { ok: true, pushed };
  } catch (e) {
    backoffIndex = Math.min(backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
    backoffUntil = Date.now() + BACKOFF_STEPS_MS[backoffIndex];
    const message = e instanceof Error ? e.message : String(e);
    status.set({ phase: 'error', lastError: message });
    await refreshPendingCount();
    return { ok: false, pushed, error: message };
  } finally {
    pushing = false;
  }
}

/** Debounced push, used right after a kiosk capture. */
export function pushSoon(delayMs = 3000): void {
  if (soonTimer) clearTimeout(soonTimer);
  soonTimer = setTimeout(() => {
    soonTimer = null;
    void pushPending();
  }, delayMs);
}

/** Call once from the root layout. */
export function startSyncLoop(): void {
  if (started) return;
  started = true;

  void getSetting('last_sync_at').then((at) => {
    if (at) useSyncStatus.getState().set({ lastSyncAt: at });
  });
  void refreshPendingCount();
  void pushPending();

  setInterval(() => void pushPending(), INTERVAL_MS);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void pushPending();
  });

  Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) pushSoon(1000);
  });
}
