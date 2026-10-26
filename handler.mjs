// Logik der Wunschzettel-Schnittstelle. Wird von netlify/functions/api.mjs benutzt.
import crypto from 'node:crypto';

const KINDS = new Set(['herz', 'schoen', 'klein']);
const MAX_WISHES = 500;
const LIST_LIMIT = 300;
const MAX_BODY = 10 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const ID_RE = /^\d{13}-[a-f0-9]{16}$/;

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

function clean(value, max, multiline) {
  let s = String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (multiline) s = s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
  else s = s.replace(/\s+/g, ' ');
  s = s.trim();
  return s.length > max ? s.slice(0, max) : s;
}

const publicWish = (w) => ({ id: w.id, name: w.name, text: w.text, kind: w.kind, createdAt: w.createdAt });

/**
 * wishesStore / limitsStore: Netlify-Blobs-Speicher (get, setJSON, list, delete).
 * getAdminPassword: Funktion, die das Verwaltungs-Passwort liefert (leer = Verwaltung aus).
 */
export function createHandler({ wishesStore, limitsStore, getAdminPassword }) {
  async function recentHits(key) {
    try {
      const v = await limitsStore.get(key, { type: 'json' });
      const cutoff = Date.now() - WINDOW_MS;
      return Array.isArray(v) ? v.filter((t) => t > cutoff) : [];
    } catch (_) {
      return [];
    }
  }
  async function isLimited(key, max) {
    return (await recentHits(key)).length >= max;
  }
  async function addHit(key) {
    try {
      const list = await recentHits(key);
      list.push(Date.now());
      await limitsStore.setJSON(key, list);
    } catch (_) { /* Begrenzung ist nur ein Zusatzschutz */ }
  }
  const limitKey = (prefix, ip) => prefix + '-' + sha(ip).toString('hex').slice(0, 32);

  async function allKeys() {
    const { blobs } = await wishesStore.list();
    return blobs.map((b) => b.key).filter((k) => ID_RE.test(k)).sort(); // neueste zuerst
  }

  function isAdmin(req) {
    const pw = req.headers.get('x-admin-password');
    const admin = getAdminPassword();
    return Boolean(admin && pw && safeEqual(pw, admin));
  }

  return async function handler(req, context) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'unbekannt';

    try {
      /* Liste */
      if (path === '/api/wishes' && req.method === 'GET') {
        const keys = (await allKeys()).slice(0, LIST_LIMIT);
        const wishes = [];
        for (let i = 0; i < keys.length; i += 20) {
          const chunk = await Promise.all(keys.slice(i, i + 20).map((k) => wishesStore.get(k, { type: 'json' })));
          for (const w of chunk) if (w && w.id) wishes.push(publicWish(w));
        }
        return json(200, { wishes });
      }

      /* Neuer Wunsch */
      if (path === '/api/wishes' && req.method === 'POST') {
        const key = limitKey('post', ip);
        if (await isLimited(key, 8)) return json(429, { error: 'zu_schnell' });
        const raw = await req.text();
        if (raw.length > MAX_BODY) return json(413, { error: 'zu_gross' });
        let body;
        try { body = JSON.parse(raw || '{}'); } catch (_) { return json(400, { error: 'ungueltig' }); }
        if (body.website) return json(201, { wish: { id: '0000000000000-0000000000000000' }, token: 'x' }); // Spam-Falle
        const name = clean(body.name, 40, false);
        const text = clean(body.text, 400, true);
        const kind = KINDS.has(body.kind) ? body.kind : 'schoen';
        if (!name || text.length < 2) return json(400, { error: 'ungueltig' });
        if ((await allKeys()).length >= MAX_WISHES) return json(507, { error: 'voll' });

        const createdAt = Date.now();
        const inverse = String(9999999999999 - createdAt).padStart(13, '0');
        const id = inverse + '-' + crypto.randomBytes(8).toString('hex');
        const token = crypto.randomBytes(24).toString('hex');
        const wish = { id, name, text, kind, createdAt, th: sha(token).toString('hex') };
        await wishesStore.setJSON(id, wish);
        await addHit(key);
        return json(201, { wish: publicWish(wish), token });
      }

      /* Verwaltung prüfen */
      if (path === '/api/admin' && req.method === 'GET') {
        const key = limitKey('adm', ip);
        if (await isLimited(key, 15)) return json(429, { error: 'zu_schnell' });
        if (!isAdmin(req)) { await addHit(key); return json(401, { error: 'passwort' }); }
        return json(200, { ok: true });
      }

      /* Wunsch löschen */
      const m = path.match(/^\/api\/wishes\/([^/]+)$/);
      if (m && req.method === 'DELETE') {
        const id = m[1];
        if (!ID_RE.test(id)) return json(404, { error: 'nicht_gefunden' });
        const key = limitKey('adm', ip);
        if (await isLimited(key, 15)) return json(429, { error: 'zu_schnell' });
        const wish = await wishesStore.get(id, { type: 'json' });
        if (!wish) return json(404, { error: 'nicht_gefunden' });
        const token = req.headers.get('x-delete-token');
        const own = Boolean(token) && safeEqual(sha(token).toString('hex'), wish.th);
        if (!own && !isAdmin(req)) { await addHit(key); return json(401, { error: 'nicht_erlaubt' }); }
        await wishesStore.delete(id);
        return json(200, { ok: true });
      }

      return json(404, { error: 'nicht_gefunden' });
    } catch (err) {
      console.error(err);
      return json(500, { error: 'fehler' });
    }
  };
}
