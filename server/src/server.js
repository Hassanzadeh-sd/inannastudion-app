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
    verified_at TEXT,
    device_id   TEXT,
    received_at TEXT
  )
`);
try {
  db.exec('ALTER TABLE leads ADD COLUMN verified_at TEXT');
} catch {
  // column already exists
}

// Last-write-wins on the client-side updated_at clock; re-pushes are no-ops.
const upsert = db.prepare(`
  INSERT INTO leads (id, phone, name, rating, note, followup, status, source,
                     created_at, updated_at, deleted_at, verified_at, device_id, received_at)
  VALUES (@id, @phone, @name, @rating, @note, @followup, @status, @source,
          @created_at, @updated_at, @deleted_at, @verified_at, @device_id, @received_at)
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
    verified_at = excluded.verified_at,
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
      verified_at: r.verified_at ?? null,
      device_id: deviceId,
      received_at: receivedAt,
    });
    accepted.push(r.id);
  }
  return accepted;
});

function safeEqual(candidate, expected) {
  if (typeof candidate !== 'string' || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function tokenMatches(candidate) {
  return safeEqual(candidate, TOKEN);
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
  const header = 'phone,name,rating,status,verified_at,note,followup,created_at,updated_at,device_id';
  const lines = rows.map((r) =>
    [r.phone, r.name, r.rating, r.status, r.verified_at, r.note, r.followup, r.created_at, r.updated_at, r.device_id]
      .map(csvCell)
      .join(','),
  );
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="inanna-leads.csv"');
  res.send('\uFEFF' + [header, ...lines].join('\r\n') + '\r\n');
});

// ---------------------------------------------------------------------------
// Employee web panel (تکمیل اطلاعات مشتریان): password login → signed cookie.
// Served under the same nginx prefix, public URL <domain>/lead-api/admin.
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const BASE_PATH = process.env.BASE_PATH || '/lead-api';
const COOKIE_NAME = 'inanna_admin';
const SESSION_TTL_S = 30 * 24 * 3600;

function sign(value) {
  return crypto.createHmac('sha256', TOKEN).update(value).digest('hex');
}

function makeSessionCookie() {
  const exp = String(Date.now() + SESSION_TTL_S * 1000);
  return `${exp}.${sign(exp)}`;
}

function validSession(cookieHeader) {
  const m = /(?:^|;\s*)inanna_admin=([^;]+)/.exec(cookieHeader || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

function adminAuth(req, res, next) {
  // Employee app uses the same bearer token as sync; browsers use the cookie.
  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (tokenMatches(bearer)) return next();
  if (ADMIN_PASSWORD && validSession(req.headers.cookie)) return next();
  res.status(401).json({ ok: false, error: 'unauthorized' });
}

const PAGE_STYLE = `
  * { box-sizing: border-box; margin: 0; }
  body { background: #0E0A18; color: #F7F2FF; font-family: Vazirmatn, Tahoma, sans-serif;
         min-height: 100vh; padding: 16px; }
  .wrap { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 22px; color: #F3C14F; margin-bottom: 4px; }
  .sub { color: #B3A6CF; font-size: 13px; margin-bottom: 16px; }
  .card { background: #1B1329; border: 1px solid #43306B; border-radius: 8px;
          padding: 14px; margin-bottom: 10px; }
  .btn { display: inline-block; border: 0; border-radius: 4px; cursor: pointer;
         font-family: inherit; font-size: 15px; font-weight: 700; padding: 10px 18px;
         background: linear-gradient(120deg, #F3C14F, #E8579B); color: #241335; }
  .btn.ghost { background: none; border: 1px solid #9D6BFF; color: #F7F2FF; font-weight: 500; }
  .btn.on { background: #F3C14F; border-color: #F3C14F; color: #241335; }
  input, textarea, select { width: 100%; background: #271A3D; color: #F7F2FF;
    border: 1px solid #43306B; border-radius: 6px; padding: 10px; font-family: inherit;
    font-size: 15px; margin: 4px 0 10px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .phone { direction: ltr; unicode-bidi: isolate; color: #F7D68A; font-weight: 700; font-size: 18px; }
  .muted { color: #786C96; font-size: 12px; }
  .badge { font-size: 12px; border-radius: 4px; padding: 2px 8px; }
  .badge.noname { border: 1px solid #FF6B6B; color: #FF6B6B; }
  .badge.member { color: #5FD68B; }
  .stars { color: #F3C14F; letter-spacing: 2px; font-size: 18px; }
  .stars .off { color: #4A3A6B; }
  .starpick button { background: none; border: 0; font-size: 30px; cursor: pointer; color: #4A3A6B; }
  .starpick button.on { color: #F3C14F; }
  .err { color: #FF6B6B; margin-bottom: 12px; }
  .top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
  a { color: #9D6BFF; }
`;

const LOGIN_HTML = `<!doctype html><html dir="rtl" lang="fa"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ورود کارکنان — استودیو اینانا</title><style>${PAGE_STYLE}</style></head>
<body><div class="wrap" style="max-width:380px;margin-top:12vh;text-align:center">
<div style="font-size:40px;color:#F3C14F">✦</div>
<h1>استودیو اینانا</h1><div class="sub">پنل کارکنان — کلوپ مشتریان</div>
<div class="card" style="text-align:right">
<div id="err" class="err" style="display:none">رمز اشتباه است</div>
<form method="post" action="${BASE_PATH}/admin/login">
<label>رمز ورود</label>
<input type="password" name="password" autofocus autocomplete="current-password">
<button class="btn" style="width:100%" type="submit">ورود</button>
</form></div>
<script>if (location.search.indexOf('err=1') !== -1) document.getElementById('err').style.display = 'block';</script>
</div></body></html>`;

const PANEL_HTML = `<!doctype html><html dir="rtl" lang="fa"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>مشتریان — استودیو اینانا</title><style>${PAGE_STYLE}</style></head>
<body><div class="wrap">
<div class="top"><div><h1>ثبت اطلاعات مشتریان</h1><div class="sub" id="count">…</div></div>
<a href="${BASE_PATH}/admin/logout">خروج</a></div>
<div class="row" id="filters" style="margin-bottom:12px"></div>
<div id="list"></div>
</div>
<script>
var BASE = '${BASE_PATH}';
var STATUS_FA = { new: 'جدید', contacted: 'تماس گرفته شد', done: 'انجام شد' };
var FILTERS = [['all','همه'],['noname','بدون نام'],['new','جدید'],['contacted','تماس گرفته شد'],['done','انجام شد']];
var leads = [], filter = 'all', editing = null;
var faDate = new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
var faDigits = function (s) { return String(s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }); };

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function load() {
  fetch(BASE + '/admin/api/leads', { credentials: 'same-origin' })
    .then(function (r) { if (r.status === 401) { location.href = BASE + '/admin'; throw 0; } return r.json(); })
    .then(function (d) { leads = d.leads || []; render(); })
    .catch(function () {});
}

function shown() {
  return leads.filter(function (l) {
    if (filter === 'noname') return !l.name;
    if (filter === 'all') return true;
    return l.status === filter;
  });
}

function stars(n) {
  n = n || 0;
  return '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span></span>';
}

function render() {
  var f = document.getElementById('filters');
  f.innerHTML = FILTERS.map(function (x) {
    return '<button class="btn ghost' + (filter === x[0] ? ' on' : '') + '" onclick="setFilter(\\'' + x[0] + '\\')">' + x[1] + '</button>';
  }).join('');
  var rows = shown();
  var noname = leads.filter(function (l) { return !l.name; }).length;
  document.getElementById('count').textContent =
    faDigits(leads.length) + ' مشتری • ' + faDigits(noname) + ' بدون نام';
  document.getElementById('list').innerHTML = rows.map(function (l) {
    var head =
      '<div class="row" style="justify-content:space-between" onclick="toggle(\\'' + l.id + '\\')">' +
      '<div><div class="row">' +
      (l.name ? '<b>' + esc(l.name) + '</b>' : '<span class="badge noname">بدون نام</span>') +
      '<span class="muted">' + (STATUS_FA[l.status] || '') + '</span>' +
      (l.verified_at ? '<span class="badge member">✦ عضو کلوپ</span>' : '') + '</div>' +
      '<div class="phone">' + esc(l.phone) + '</div>' +
      '<div class="muted">' + (l.created_at ? faDate.format(new Date(l.created_at)) : '') + '</div></div>' +
      '<div>' + stars(l.rating) + '</div></div>';
    if (editing !== l.id) return '<div class="card">' + head + '</div>';
    return '<div class="card">' + head +
      '<div style="margin-top:10px">' +
      '<label>نام</label><input id="f-name" value="' + esc(l.name) + '">' +
      '<label>امتیاز</label><div class="starpick" id="f-stars">' +
      [1, 2, 3, 4, 5].map(function (i) {
        return '<button type="button" class="' + (l.rating >= i ? 'on' : '') + '" onclick="pick(' + i + ')">★</button>';
      }).join('') + '</div>' +
      '<label>وضعیت</label><div class="row" id="f-status">' +
      Object.keys(STATUS_FA).map(function (s) {
        return '<button type="button" class="btn ghost' + (l.status === s ? ' on' : '') + '" onclick="setStatus(\\'' + s + '\\')">' + STATUS_FA[s] + '</button>';
      }).join('') + '</div>' +
      '<label style="display:block;margin-top:10px">برنامه پیگیری</label><input id="f-followup" value="' + esc(l.followup) + '">' +
      '<label>یادداشت</label><textarea id="f-note" rows="2">' + esc(l.note) + '</textarea>' +
      '<div class="row"><button class="btn" onclick="save(\\'' + l.id + '\\')">ذخیره</button>' +
      '<button class="btn ghost" onclick="toggle(\\'' + l.id + '\\')">بستن</button></div>' +
      '</div></div>';
  }).join('') || '<div class="card muted">موردی نیست</div>';
}

var draft = {};
function setFilter(x) { filter = x; editing = null; render(); }
function toggle(id) {
  if (editing === id) { editing = null; } else {
    editing = id;
    var l = leads.find(function (x) { return x.id === id; });
    draft = { rating: l.rating, status: l.status };
  }
  render();
}
function pick(n) {
  draft.rating = draft.rating === n ? null : n;
  var btns = document.querySelectorAll('#f-stars button');
  btns.forEach(function (b, i) { b.className = draft.rating != null && i < draft.rating ? 'on' : ''; });
}
function setStatus(s) {
  draft.status = s;
  var btns = document.querySelectorAll('#f-status button');
  var keys = Object.keys(STATUS_FA);
  btns.forEach(function (b, i) { b.className = 'btn ghost' + (keys[i] === s ? ' on' : ''); });
}
function save(id) {
  var body = {
    name: document.getElementById('f-name').value.trim() || null,
    rating: draft.rating || null,
    status: draft.status,
    followup: document.getElementById('f-followup').value.trim() || null,
    note: document.getElementById('f-note').value.trim() || null,
  };
  fetch(BASE + '/admin/api/leads/' + id, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function (r) { return r.json(); }).then(function () { editing = null; load(); });
}

setInterval(function () { if (editing === null) load(); }, 30000);
load();
</script></body></html>`;

app.get('/admin', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).send('ADMIN_PASSWORD not set');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(validSession(req.headers.cookie) ? PANEL_HTML : LOGIN_HTML);
});

app.post('/admin/login', express.urlencoded({ extended: false }), async (req, res) => {
  if (ADMIN_PASSWORD && safeEqual(req.body?.password, ADMIN_PASSWORD)) {
    res.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${makeSessionCookie()}; Path=${BASE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_S}`,
    );
    return res.redirect(`${BASE_PATH}/admin`);
  }
  await new Promise((r) => setTimeout(r, 700));
  res.redirect(`${BASE_PATH}/admin?err=1`);
});

app.get('/admin/logout', (_req, res) => {
  res.set('Set-Cookie', `${COOKIE_NAME}=; Path=${BASE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  res.redirect(`${BASE_PATH}/admin`);
});

app.get('/admin/api/leads', adminAuth, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC')
    .all();
  res.json({ ok: true, leads: rows });
});

const ADMIN_EDITABLE = ['name', 'rating', 'note', 'followup', 'status'];
const updateFromAdmin = db.prepare(`
  UPDATE leads SET name = @name, rating = @rating, note = @note,
    followup = @followup, status = @status, updated_at = @updated_at
  WHERE id = @id AND deleted_at IS NULL
`);

app.post('/admin/api/leads/:id', adminAuth, (req, res) => {
  const current = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ ok: false, error: 'not_found' });
  const patch = {};
  for (const key of ADMIN_EDITABLE) {
    patch[key] = key in (req.body ?? {}) ? req.body[key] : current[key];
  }
  if (patch.rating != null && !Number.isInteger(patch.rating)) patch.rating = null;
  if (!['new', 'contacted', 'done'].includes(patch.status)) patch.status = current.status;
  updateFromAdmin.run({ ...patch, id: current.id, updated_at: new Date().toISOString() });
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`leadsync listening on 127.0.0.1:${PORT}, db at ${DB_PATH}`);
});
