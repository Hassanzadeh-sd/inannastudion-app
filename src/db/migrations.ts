import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  // v1: leads + settings
  `
  CREATE TABLE IF NOT EXISTS leads (
    id         TEXT PRIMARY KEY,
    phone      TEXT NOT NULL UNIQUE,
    name       TEXT,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    note       TEXT,
    followup   TEXT,
    status     TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','contacted','done')),
    source     TEXT NOT NULL DEFAULT 'kiosk',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    dirty      INTEGER NOT NULL DEFAULT 1,
    pushed_at  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_leads_dirty  ON leads(dirty);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, rating, created_at);
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // v2: SMS-verified club membership timestamp
  `
  ALTER TABLE leads ADD COLUMN verified_at TEXT;
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
