const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL = 1000 * 60 * 60 * 12;
const MAX_BODY = 1024 * 1024;

// One shared admin login for the whole admin panel.
// Login: admin
const ADMIN_ACCOUNT = Object.freeze({ username: 'admin', role: 'admin', name: 'Administrator' });

// Fixed password requested by the project owner: Sponge1488.
// Only the derived hash is stored in the application.
const FIXED_PASSWORD = Object.freeze({
  salt: '012914fae7069b4cba5c416d86eecd6c',
  hash: 'db91e1d2c6742587ff709b1f73b6fe8d3615951d3ae6da10c8c106a7f80db4570072b21cf56b825db7dfd08915e7968ff83be2b3ec327f311c1d0b510bc4bb1d'
});

fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultDb = () => ({
  auth: { version: 2, password: FIXED_PASSWORD },
  sessions: {},
  settings: {
    siteName: 'SPONGEBOB SERVICE',
    telegramBotUsername: '',
    links: [
      { id: '01', title: 'ГЛАВНЫЙ АДМИНИСТРАТОР', subtitle: 'Основной контакт проекта', icon: 'A', url: 'https://t.me/GSMSHEIKHO9', active: true },
      { id: '02', title: 'СТАРШИЙ САППОРТ', subtitle: 'Поддержка и сложные вопросы', icon: 'S', url: 'https://t.me/sponge_bo888', active: true },
      { id: '03', title: 'МЛАДШИЙ САППОРТ', subtitle: 'Помощь по общим вопросам', icon: 'C', url: 'https://t.me/SuportSpongeBob', active: true },
      { id: '04', title: 'УСЛУГИ КОДЕРА', subtitle: 'Разработка и технические задачи', icon: '</>', url: 'https://t.me/GSMSHEIKHO9', active: true }
    ]
  },
  visitors: {},
  events: []
});

let db;
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch {
  db = defaultDb();
  save();
}

// Migrate the stored auth settings to the single shared admin login.
if (!db.auth || db.auth.version !== 2) {
  db.auth = { version: 2, password: FIXED_PASSWORD };
  db.sessions = {};
  save();
}
if (!db.sessions) db.sessions = {};
if (!db.visitors) db.visitors = {};
if (!db.events) db.events = [];
if (!db.settings) db.settings = defaultDb().settings;

function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function now() { return new Date().toISOString(); }
function hash(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function random() { return crypto.randomBytes(32).toString('hex'); }
function passwordOk(password, stored = FIXED_PASSWORD) {
  const got = crypto.pbkdf2Sync(String(password), stored.salt, 120000, 64, 'sha512').toString('hex');
  const a = Buffer.from(got, 'hex');
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toUpperCase();
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(x => {
    const [k, ...v] = x.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}
function send(res, code, body, type = 'application/json', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
function json(res, code, obj, extra = {}) { send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8', extra); }
async function body(req) {
  return await new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => {
      s += c;
      if (s.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => {
      try { resolve(s ? JSON.parse(s) : {}); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}
function session(req) {
  const sid = cookies(req).admin_session;
  const s = sid && db.sessions[sid];
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    delete db.sessions[sid];
    save();
    return null;
  }
  return s;
}
function requireAdmin(req, res) {
  const s = session(req);
  if (!s) {
    json(res, 401, { error: 'UNAUTHORIZED' });
    return null;
  }
  return s;
}
function safePath(p) {
  const decoded = decodeURIComponent(p);
  const clean = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  return path.join(ROOT, clean.replace(/^[/\\]+/, ''));
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

function track(req, res, type, payload = {}) {
  const c = cookies(req);
  let vid = c.visitor_id;
  if (!vid) vid = random();
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const visitor = db.visitors[vid] ||= {
    id: vid,
    firstSeen: now(),
    lastSeen: now(),
    visits: 0,
    events: 0,
    telegramUsername: null,
    telegramName: null,
    referrer: null,
    userAgent: null,
    ipHash: null
  };
  visitor.lastSeen = now();
  visitor.visits += type === 'page_view' ? 1 : 0;
  visitor.events += 1;
  visitor.referrer = visitor.referrer || req.headers.referer || null;
  visitor.userAgent = req.headers['user-agent'] || visitor.userAgent;
  visitor.ipHash = hash(ip);
  if (payload.telegramUsername) visitor.telegramUsername = String(payload.telegramUsername).replace(/^@/, '').slice(0, 64);
  if (payload.telegramName) visitor.telegramName = String(payload.telegramName).slice(0, 120);
  db.events.push({ id: random(), ts: now(), visitorId: vid, type, ...payload });
  if (db.events.length > 20000) db.events.splice(0, db.events.length - 20000);
  save();
  json(res, 200, { ok: true }, { 'Set-Cookie': `visitor_id=${encodeURIComponent(vid)}; Max-Age=31536000; Path=/; SameSite=Lax` });
}

function stats() {
  const ev = Array.isArray(db.events) ? db.events : [];
  const nowMs = Date.now();
  const cut24 = nowMs - 24 * 60 * 60 * 1000;
  const cut7 = nowMs - 7 * 24 * 60 * 60 * 1000;
  const cut30 = nowMs - 30 * 24 * 60 * 60 * 1000;
  const pages = ev.filter(e => e.type === 'page_view');
  const clicks = ev.filter(e => e.type === 'link_click');
  const inWindow = (e, cut) => { const t = Date.parse(e.ts); return Number.isFinite(t) && t >= cut; };
  const uniqueIds = list => new Set(list.map(e => e.visitorId).filter(Boolean)).size;
  const byLink = {};
  clicks.forEach(e => byLink[e.linkId] = (byLink[e.linkId] || 0) + 1);
  const sources = {};
  Object.values(db.visitors || {}).forEach(v => {
    const source = v.referrer || 'direct / Telegram';
    sources[source] = (sources[source] || 0) + 1;
  });
  const devices = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
  Object.values(db.visitors || {}).forEach(v => {
    const ua = String(v.userAgent || '').toLowerCase();
    if (/ipad|tablet|android(?!.*mobile)/.test(ua)) devices.tablet++;
    else if (/mobi|iphone|ipod|android/.test(ua)) devices.mobile++;
    else if (/windows|macintosh|linux|cros/.test(ua)) devices.desktop++;
    else devices.other++;
  });
  const days = {};
  pages.forEach(e => {
    const d = e.ts.slice(0, 10);
    days[d] = (days[d] || 0) + 1;
  });
  const hours24 = Array.from({ length: 24 }, (_, i) => ({ hour: i, views: 0 }));
  pages.filter(e => inWindow(e, cut24)).forEach(e => {
    const h = new Date(e.ts).getHours();
    if (Number.isFinite(h)) hours24[h].views++;
  });
  const topLinks = Object.entries(byLink).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([id,count]) => {
    const link = (db.settings.links || []).find(x => x.id === id);
    return { id, title: link?.title || id, count };
  });
  const tg = Object.values(db.visitors || {}).filter(v => v.telegramUsername);
  const todayPages = pages.filter(e => inWindow(e, cut24));
  const weekPages = pages.filter(e => inWindow(e, cut7));
  const monthPages = pages.filter(e => inWindow(e, cut30));
  const todayClicks = clicks.filter(e => inWindow(e, cut24));
  return {
    views: pages.length,
    unique: Object.keys(db.visitors || {}).length,
    todayViews: todayPages.length,
    weekViews: weekPages.length,
    monthViews: monthPages.length,
    unique24h: uniqueIds(todayPages),
    unique7d: uniqueIds(weekPages),
    unique30d: uniqueIds(monthPages),
    clicks,
    clicksCount: clicks.length,
    todayClicks: todayClicks.length,
    clickRate: pages.length ? Number((clicks.length / pages.length * 100).toFixed(1)) : 0,
    byLink,
    topLinks,
    telegramVisitors: tg.length,
    telegramViews: pages.filter(e => e.telegramUsername).length,
    days,
    hours24,
    sources,
    devices,
    live: Object.values(db.visitors || {}).filter(v => nowMs - new Date(v.lastSeen).getTime() < 120000).length
  };
}

async function api(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/event') {
    let b;
    try { b = await body(req); } catch { return json(res, 400, { error: 'BAD_JSON' }); }
    return track(req, res, b.type || 'event', b);
  }

  if (req.method === 'GET' && pathname === '/api/config') {
    return json(res, 200, {
      siteName: db.settings.siteName,
      links: db.settings.links,
      telegramBotUsername: db.settings.telegramBotUsername
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/status') {
    return json(res, 200, { setup: true, fixedAccess: true, username: ADMIN_ACCOUNT.username });
  }

  if (req.method === 'POST' && pathname === '/api/admin/setup') {
    return json(res, 403, { error: 'FIXED_ACCESS_ONLY' });
  }

  if (req.method === 'POST' && pathname === '/api/admin/login') {
    let b;
    try { b = await body(req); } catch { return json(res, 400, { error: 'BAD_JSON' }); }
    const username = String(b.username || '').trim();
    if (username !== ADMIN_ACCOUNT.username || !passwordOk(b.password)) return json(res, 401, { error: 'INVALID_LOGIN' });
    const account = ADMIN_ACCOUNT;
    const sid = random();
    db.sessions[sid] = {
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
      username: account.username,
      role: account.role,
      name: account.name
    };
    save();
    return json(res, 200, { ok: true, user: account }, {
      'Set-Cookie': `admin_session=${sid}; Max-Age=${SESSION_TTL / 1000}; HttpOnly; Path=/; SameSite=Strict`
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const c = cookies(req);
    if (c.admin_session) delete db.sessions[c.admin_session];
    save();
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'admin_session=; Max-Age=0; HttpOnly; Path=/; SameSite=Strict' });
  }

  if (pathname.startsWith('/api/admin/')) {
    const s = requireAdmin(req, res);
    if (!s) return;

    if (req.method === 'GET' && pathname === '/api/admin/me') {
      return json(res, 200, { ok: true, user: { username: s.username, role: s.role, name: s.name }, settings: db.settings, stats: stats() });
    }

    if (req.method === 'GET' && pathname === '/api/admin/analytics') {
      return json(res, 200, {
        stats: stats(),
        events: db.events.slice(-500).reverse(),
        visitors: Object.values(db.visitors).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 500)
      });
    }

    if (req.method === 'GET' && pathname === '/api/admin/export') {
      const payload = JSON.stringify({ exportedAt: now(), settings: db.settings, visitors: db.visitors, events: db.events }, null, 2);
      return send(res, 200, payload, 'application/json; charset=utf-8', { 'Content-Disposition': 'attachment; filename="spongebob-analytics.json"' });
    }

    // Both allowlisted accounts have full administrator access.
    if (s.role !== 'admin') return json(res, 403, { error: 'ADMIN_ONLY' });

    if (req.method === 'POST' && pathname === '/api/admin/settings') {
      const b = await body(req);
      if (b.siteName !== undefined) db.settings.siteName = String(b.siteName).slice(0, 100);
      if (Array.isArray(b.links)) {
        const used = new Set();
        db.settings.links = b.links.slice(0, 20).map((x, i) => {
          let id = String(x.id || '').trim() || String(i + 1).padStart(2, '0');
          if (used.has(id)) {
            let n = i + 1;
            do { id = String(n++).padStart(2, '0'); } while (used.has(id));
          }
          used.add(id);
          return {
            id: id.slice(0, 40),
            title: String(x.title || 'CHANNEL').slice(0, 100),
            subtitle: String(x.subtitle || '').slice(0, 150),
            icon: String(x.icon || '>').slice(0, 8),
            url: String(x.url || '#').slice(0, 500),
            active: x.active !== false
          };
        });
      }
      if (b.telegramBotUsername !== undefined) db.settings.telegramBotUsername = String(b.telegramBotUsername).replace(/^@/, '').slice(0, 64);
      save();
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/admin/password') {
      return json(res, 403, { error: 'FIXED_PASSWORD' });
    }

    if (req.method === 'POST' && pathname === '/api/admin/reset-stats') {
      db.visitors = {};
      db.events = [];
      save();
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { error: 'NOT_FOUND' });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = url.parse(req.url, true);
    const pathname = u.pathname;
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (pathname === '/admin' || pathname === '/admin/') return serveFile(res, path.join(ROOT, 'admin.html'));
    if (pathname === '/admin.css') return serveFile(res, path.join(ROOT, 'admin.css'));
    if (pathname === '/admin.js') return serveFile(res, path.join(ROOT, 'admin.js'));
    const file = pathname === '/' ? path.join(ROOT, 'index.html') : safePath(pathname);
    return serveFile(res, file);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'SERVER_ERROR' });
  }
});

function serveFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: 'NOT_FOUND' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

server.listen(PORT, () => console.log(`SPONGEBOB SERVICE running on http://localhost:${PORT}`));
