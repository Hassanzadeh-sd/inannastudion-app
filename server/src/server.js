const crypto = require('node:crypto');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.TOKEN;
const DB_PATH = process.env.DB_PATH || '/var/lib/leadsync/leads.db';
const MAX_BATCH = 500;

if (!TOKEN) {
  console.error('TOKEN env var is required');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id          TEXT PRIMARY KEY,
    phone       TEXT NOT NULL,
    name        TEXT,
    rating      INTEGER,
    note        TEXT,
    followup    TEXT,
    status      TEXT,
    source      TEXT,
    created_at  TEXT,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    device_id   TEXT,
    received_at TEXT
  )
`);

// Last-write-wins on the client-side updated_at clock; re-pushes are no-ops.
const upsert = db.prepare(`
  INSERT INTO leads (id, phone, name, rating, note, followup, status, source,
                     created_at, updated_at, deleted_at, device_id, received_at)
  VALUES (@id, @phone, @name, @rating, @note, @followup, @status, @source,
          @created_at, @updated_at, @deleted_at, @device_id, @received_at)
  ON CONFLICT(id) DO UPDATE SET
    phone = excluded.phone,
    name = excluded.name,
    rating = excluded.rating,
    note = excluded.note,
    followup = excluded.followup,
    status = excluded.status,
    source = excluded.source,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at,
    device_id = excluded.device_id,
    received_at = excluded.received_at
  WHERE excluded.updated_at > leads.updated_at
`);

const upsertBatch = db.transaction((records, deviceId, receivedAt) => {
  const accepted = [];
  for (const r of records) {
    if (typeof r?.id !== 'string' || typeof r?.phone !== 'string' || typeof r?.updated_at !== 'string') {
      continue;
    }
    upsert.run({
      id: r.id,
      phone: r.phone,
      name: r.name ?? null,
      rating: Number.isInteger(r.rating) ? r.rating : null,
      note: r.note ?? null,
      followup: r.followup ?? null,
      status: typeof r.status === 'string' ? r.status : null,
      source: typeof r.source === 'string' ? r.source : null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
      device_id: deviceId,
      received_at: receivedAt,
    });
    accepted.push(r.id);
  }
  return accepted;
});

function tokenMatches(candidate) {
  if (typeof candidate !== 'string' || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (tokenMatches(bearer) || tokenMatches(req.query.token)) return next();
  res.status(401).json({ ok: false, error: 'unauthorized' });
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/sync', auth, (req, res) => {
  const { device_id: deviceId, records } = req.body ?? {};
  if (!Array.isArray(records) || records.length > MAX_BATCH) {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }
  const receivedAt = new Date().toISOString();
  const accepted = upsertBatch(records, typeof deviceId === 'string' ? deviceId : null, receivedAt);
  res.json({ ok: true, accepted, server_time: receivedAt });
});

app.get('/leads', auth, (_req, res) => {
  res.json({ ok: true, leads: db.prepare('SELECT * FROM leads ORDER BY created_at').all() });
});

app.get('/leads.csv', auth, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at')
    .all();
  const header = 'phone,name,rating,status,note,followup,created_at,updated_at,device_id';
  const lines = rows.map((r) =>
    [r.phone, r.name, r.rating, r.status, r.note, r.followup, r.created_at, r.updated_at, r.device_id]
      .map(csvCell)
      .join(','),
  );
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="inanna-leads.csv"');
  res.send('\uFEFF' + [header, ...lines].join('\r\n') + '\r\n');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`leadsync listening on 127.0.0.1:${PORT}, db at ${DB_PATH}`);
});
