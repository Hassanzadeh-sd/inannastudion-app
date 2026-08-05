import * as Crypto from 'expo-crypto';
import { getDb } from './index';

export type LeadStatus = 'new' | 'contacted' | 'done';

export interface Lead {
  id: string;
  phone: string;
  name: string | null;
  rating: number | null;
  note: string | null;
  followup: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: number;
  pushed_at: string | null;
}

export type LeadFilter = 'all' | 'needs_details' | LeadStatus;
export type LeadSort = 'newest' | 'rating';

const now = () => new Date().toISOString();

/**
 * Kiosk capture. Upserts by phone so a returning visitor updates the
 * existing row instead of duplicating. Returns the lead id.
 */
export async function captureLead(phone: string, name?: string | null): Promise<string> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    `INSERT INTO leads (id, phone, name, source, created_at, updated_at, dirty)
     VALUES (?, ?, ?, 'kiosk', ?, ?, 1)
     ON CONFLICT(phone) DO UPDATE SET
       name = COALESCE(excluded.name, leads.name),
       deleted_at = NULL,
       updated_at = excluded.updated_at,
       dirty = 1`,
    [Crypto.randomUUID(), phone, name ?? null, ts, ts],
  );
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM leads WHERE phone = ?',
    [phone],
  );
  return row!.id;
}

export async function setLeadName(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE leads SET name = ?, updated_at = ?, dirty = 1 WHERE id = ?',
    [name, now(), id],
  );
}

export interface LeadPatch {
  name?: string | null;
  rating?: number | null;
  note?: string | null;
  followup?: string | null;
  status?: LeadStatus;
}

export async function updateLead(id: string, patch: LeadPatch): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(patch)) {
    sets.push(`${key} = ?`);
    args.push(value ?? null);
  }
  if (!sets.length) return;
  args.push(now(), id);
  await db.runAsync(
    `UPDATE leads SET ${sets.join(', ')}, updated_at = ?, dirty = 1 WHERE id = ?`,
    args,
  );
}

export async function softDeleteLead(id: string): Promise<void> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    'UPDATE leads SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
    [ts, ts, id],
  );
}

export async function getLead(id: string): Promise<Lead | null> {
  const db = await getDb();
  return await db.getFirstAsync<Lead>('SELECT * FROM leads WHERE id = ?', [id]);
}

export async function listLeads(
  filter: LeadFilter = 'all',
  sort: LeadSort = 'newest',
): Promise<Lead[]> {
  const db = await getDb();
  const where: string[] = ['deleted_at IS NULL'];
  if (filter === 'needs_details') where.push("(name IS NULL OR name = '')");
  else if (filter !== 'all') where.push(`status = '${filter}'`);
  const order =
    sort === 'rating'
      ? 'rating DESC NULLS LAST, created_at DESC'
      : 'created_at DESC';
  return await db.getAllAsync<Lead>(
    `SELECT * FROM leads WHERE ${where.join(' AND ')} ORDER BY ${order}`,
  );
}

export interface LeadCounts {
  total: number;
  needsDetails: number;
  pendingSync: number;
}

export async function getLeadCounts(): Promise<LeadCounts> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    total: number;
    needs: number;
    dirty: number;
  }>(
    `SELECT
       SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS total,
       SUM(CASE WHEN deleted_at IS NULL AND (name IS NULL OR name = '') THEN 1 ELSE 0 END) AS needs,
       SUM(CASE WHEN dirty = 1 THEN 1 ELSE 0 END) AS dirty
     FROM leads`,
  );
  return {
    total: row?.total ?? 0,
    needsDetails: row?.needs ?? 0,
    pendingSync: row?.dirty ?? 0,
  };
}

export async function exportableLeads(): Promise<Lead[]> {
  const db = await getDb();
  return await db.getAllAsync<Lead>(
    'SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at ASC',
  );
}

/** Sync helpers */
export async function getDirtyBatch(limit = 500): Promise<Lead[]> {
  const db = await getDb();
  return await db.getAllAsync<Lead>('SELECT * FROM leads WHERE dirty = 1 LIMIT ?', [limit]);
}

/**
 * Clear the dirty flag only if the row was not edited while the push was
 * in flight (guarded on updated_at captured at snapshot time).
 */
export async function markPushed(
  rows: { id: string; updated_at: string }[],
  pushedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        'UPDATE leads SET dirty = 0, pushed_at = ? WHERE id = ? AND updated_at = ?',
        [pushedAt, row.id, row.updated_at],
      );
    }
  });
}
