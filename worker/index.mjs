import { adminPage, loginPage, blockedPage } from './admin-ui.mjs';
import { hasSession, createSession, sessionCookie, passwordMatches, visitorIP, ipDigest, readLimited } from './admin-auth.mjs';
import { deviceDetails } from './device-info.mjs';
export { classifyDevice } from './device-info.mjs';
export { AccessRegistry } from './access-registry.mjs';

const EVENTS = Object.freeze({
  view: '👋 Có người vừa mở trang giới thiệu của bạn.',
  later: '🌙 Có người vừa nhấn “Để sau”.',
  ok: '✨ Có người vừa nhấn “OK” — một lời chào mới!'
});
const DEVICE_LABELS = Object.freeze({
  iphone: 'iPhone (chưa xác định đời máy)',
  ipad_ipod: 'iPad / iPod',
  android_phone: 'Điện thoại Android',
  android_tablet: 'Máy tính bảng Android',
  windows: 'Máy tính Windows (Laptop/PC)',
  mac: 'Máy tính Mac',
  linux: 'Máy tính Linux',
  chromebook: 'Chromebook',
  mobile: 'Thiết bị di động',
  unknown: 'Không xác định'
});
const deviceCode = value => typeof value === 'string' && Object.hasOwn(DEVICE_LABELS, value) ? value : 'unknown';

// Only a bounded display label crosses into durable notification storage.
// Old queued records and malformed internal labels retain a safe fallback.
function notificationDeviceLabel(device, label) {
  const code = deviceCode(device);
  return code !== 'unknown' && typeof label === 'string' && label.length <= 80
    && /^[\p{L}\p{N} .()+·,/_-]+$/u.test(label) && label.trim()
    ? label.trim() : DEVICE_LABELS[code];
}
const requestDevice = request => deviceDetails(request.headers.get('User-Agent'), request.headers.get('Sec-CH-UA-Model'));
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const visitorId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value) ? value : '';
const adminHeaders = nonce => ({
  // Native login/logout form POSTs need their same-origin Origin header.
  // no-referrer turns it into "null"; same-origin still hides referrers from other sites.
  'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
});
function html(content, status = 200, nonce = '', extra = {}) {
  return new Response(content, { status, headers: { ...adminHeaders(nonce), 'Content-Type': 'text/html; charset=utf-8', ...extra } });
}
const unavailable = () => new Response('Trang đang tạm gián đoạn. Bạn thử lại sau nhé.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30' } });
function registry(env) { return env.ACCESS.get(env.ACCESS.idFromName('personal-intro-access')); }
async function accessCall(env, path, body) {
  const response = await registry(env).fetch(new Request(`https://access.internal${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }));
  if (!response.ok) throw response.status;
  const result = await response.json();
  if (!result || (['/check', '/visit'].includes(path) && typeof result.blocked !== 'boolean')
    || (path === '/visit' && !visitorId(result.id))) throw 503;
  return result;
}
function adminTarget(url) {
  const id = visitorId(url.searchParams.get('visit'));
  return `/admin${id ? `?visit=${id}` : ''}`;
}
function redirect(path, cookie) {
  return new Response(null, { status: 303, headers: { ...adminHeaders(''), Location: path, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}
async function adminRoute(request, env, url) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_KEY || !env.IP_HASH_KEY || !env.ACCESS) return unavailable();
  const origin = env.PUBLIC_ORIGIN;
  const authenticated = await hasSession(request, env.ADMIN_SESSION_KEY);
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.headers.get('Origin') !== origin) return json({ ok: false, error: 'forbidden' }, 403, adminHeaders(''));
  if (url.pathname === '/admin/login') {
    if (request.method === 'GET') return authenticated ? redirect(adminTarget(url)) : html(loginPage());
    if (request.method !== 'POST') return json({ ok: false }, 405);
    const ip = visitorIP(request);
    if (!ip || !env.RATE_LIMITER) return unavailable();
    const limit = await env.RATE_LIMITER.limit({ key: `admin-login:${await ipDigest(ip, env.IP_HASH_KEY)}` });
    if (!limit.success) return html(loginPage('rate_limited'), 429, '', { 'Retry-After': '60' });
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return json({ ok: false }, 415);
    let form;
    try { form = new URLSearchParams(await readLimited(request)); } catch { return json({ ok: false }, 400); }
    if (form.getAll('password').length !== 1 || !await passwordMatches(form.get('password'), env.ADMIN_PASSWORD)) return html(loginPage('invalid'), 401);
    return redirect(adminTarget(url), sessionCookie(await createSession(env.ADMIN_SESSION_KEY)));
  }
  if (!authenticated) {
    if (url.pathname.startsWith('/admin/api/')) return json({ ok: false, error: 'unauthorized' }, 401, adminHeaders(''));
    return redirect(`/admin/login${new URL(adminTarget(url), url).search}`);
  }
  if (url.pathname === '/admin/logout' && request.method === 'POST') return redirect('/admin/login', sessionCookie());
  if ((url.pathname === '/admin' || url.pathname === '/admin/') && request.method === 'GET') {
    const nonce = crypto.randomUUID().replace(/-/g, '');
    return html(adminPage(nonce), 200, nonce);
  }
  if (url.pathname === '/admin/api/visitors' && request.method === 'GET') return json(await accessCall(env, '/list'), 200, adminHeaders(''));
  if (['/admin/api/block', '/admin/api/unblock'].includes(url.pathname)) {
    if (request.method !== 'POST') return json({ ok: false }, 405, adminHeaders(''));
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json({ ok: false }, 415);
    let body;
    try { body = JSON.parse(await readLimited(request, 128)); } catch { return json({ ok: false }, 400); }
    if (!body || Object.keys(body).join(',') !== 'id' || !visitorId(body.id)) return json({ ok: false }, 400);
    try { return json(await accessCall(env, url.pathname.endsWith('/unblock') ? '/unblock' : '/block', { id: body.id }), 200, adminHeaders('')); }
    catch (status) { return json({ ok: false, error: status === 404 ? 'not_found' : 'unavailable' }, status === 404 ? 404 : 503); }
  }
  return json({ ok: false }, 404, adminHeaders(''));
}

export async function readEvent(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw 415;
  if (!request.body) throw 400;
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512) { await reader.cancel(); throw 413; }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw 400; }
  if (!data || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'event,sessionId'
    || typeof data.event !== 'string' || !Object.hasOwn(EVENTS, data.event)
    || typeof data.sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.sessionId)) throw 400;
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Admin access is independent of visitor blocking so the owner can unblock their own network.
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      try { return await adminRoute(request, env, url); } catch { return unavailable(); }
    }
    if (url.pathname !== '/events') {
      if (!['GET', 'HEAD'].includes(request.method)) return json({ ok: false }, 405);
      const ip = visitorIP(request);
      if (!ip || !env.ACCESS || !env.IP_HASH_KEY) return unavailable();
      try {
        const { blocked } = await accessCall(env, '/check', { ipKey: await ipDigest(ip, env.IP_HASH_KEY) });
        if (url.pathname === '/access') return json({ blocked }, blocked ? 403 : 200);
        if (blocked) return html(request.method === 'HEAD' ? null : blockedPage(), 403);
        if (url.pathname === '/blocked') return redirect('/');
        if (!env.ASSETS) return unavailable();
        const asset = await env.ASSETS.fetch(request);
        // Count delivered documents, not fonts/images, access polling or notification retries.
        const destination = request.headers.get('Sec-Fetch-Dest');
        const mode = request.headers.get('Sec-Fetch-Mode');
        const purpose = `${request.headers.get('Purpose') || ''} ${request.headers.get('Sec-Purpose') || ''} ${request.headers.get('X-Purpose') || ''}`;
        if (request.method === 'GET' && asset.status === 200
          && asset.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'text/html'
          && ['/', '/index.html'].includes(url.pathname)
          && (!destination || destination === 'document') && (!mode || mode === 'navigate')
          && !/prefetch|prerender/i.test(purpose)) {
          const ipKey = await ipDigest(ip, env.IP_HASH_KEY);
          let decision;
          try {
            decision = await accessCall(env, '/visit', {
              ipKey, ip, deviceLabel: requestDevice(request).label, countView: true
            });
          } catch {
            // A full statistics store must not deny an otherwise allowed visitor.
            // A fresh explicit access decision is still required; failures remain closed.
            decision = await accessCall(env, '/check', { ipKey });
          }
          // The owner may have blocked this IP while its document was being fetched.
          if (decision.blocked) return html(blockedPage(), 403);
        }
        const response = new Response(asset.body, asset);
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Supporting browsers may report their model on subsequent same-origin events.
        // Do not use Critical-CH: retrying navigation would inflate visit counts.
        if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'text/html') {
          response.headers.set('Accept-CH', 'Sec-CH-UA-Model');
        }
        return response;
      } catch { return unavailable(); }
    }
    const origin = request.headers.get('Origin');
    if (!origin || origin === 'null' || ![env.ALLOWED_ORIGIN, env.PUBLIC_ORIGIN].filter(Boolean).includes(origin)) return json({ ok: false }, 403);
    const headers = {
      'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ ok: false }, 405, { ...headers, Allow: 'POST, OPTIONS' });
    if (!env.PUSHOVER_APP_TOKEN || !env.PUSHOVER_USER_KEY || !env.NOTIFICATIONS || !env.RATE_LIMITER || !env.ACCESS || !env.IP_HASH_KEY) return json({ ok: false, error: 'not_configured' }, 503, headers);
    let data;
    try { data = await readEvent(request); } catch (status) { return json({ ok: false }, typeof status === 'number' ? status : 400, headers); }
    const { code: device, label: deviceLabel } = requestDevice(request);
    const ip = visitorIP(request);
    if (!ip) return json({ ok: false, error: 'unavailable' }, 503, headers);
    const ipKey = await ipDigest(ip, env.IP_HASH_KEY);
    const limit = await env.RATE_LIMITER.limit({ key: ipKey });
    if (!limit.success) return json({ ok: false, error: 'rate_limited' }, 429, { ...headers, 'Retry-After': '60' });
    try {
      const visitor = await accessCall(env, '/visit', { ipKey, ip, deviceLabel, countView: false });
      if (visitor.blocked) return json({ ok: false, blocked: true }, 403, headers);
      const id = env.NOTIFICATIONS.idFromName('personal-intro-inbox');
      const result = await env.NOTIFICATIONS.get(id).fetch(new Request('https://queue.local/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, device, deviceLabel, visitId: visitor.id })
      }));
      return new Response(result.body, { status: result.status, headers: { ...Object.fromEntries(result.headers), ...headers } });
    } catch { return json({ ok: false, error: 'unavailable' }, 503, headers); }
  }
};

// A single Durable Object serializes delivery to one Pushover chat and deduplicates events.
export class NotificationQueue {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.chain = Promise.resolve(); }
  serial(task) {
    const next = this.chain.then(task);
    this.chain = next.catch(() => {});
    return next;
  }
  fetch(request) {
    return this.serial(async () => {
      const { sessionId, event, device, deviceLabel, visitId } = await request.json();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sessionId}:${event}`));
      const key = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
      const now = Date.now();
      const state = await this.ctx.storage.get('state') || { records: {}, queue: [], minute: 0, count: 0 };
      for (const [id, record] of Object.entries(state.records)) if (record.expiresAt <= now && !state.queue.includes(id)) delete state.records[id];
      const existing = state.records[key];
      if (existing) return json({ ok: existing.status !== 'failed', status: existing.status, duplicate: true }, existing.status === 'failed' ? 502 : 200);
      const minute = Math.floor(now / 60000);
      if (state.minute !== minute) { state.minute = minute; state.count = 0; }
      if (state.count >= 20 || state.queue.length >= 50 || Object.keys(state.records).length >= 400) return json({ ok: false, error: 'rate_limited' }, 429);
      state.count++;
      state.records[key] = { event, device: deviceCode(device), deviceLabel: notificationDeviceLabel(device, deviceLabel), visitId: visitorId(visitId), time: now, expiresAt: now + 86400000, status: 'queued', attempts: 0 };
      const wasIdle = state.queue.length === 0;
      state.queue.push(key);
      // Set alarm before state: storage output gates prevent an acknowledged event without its alarm.
      if (wasIdle || await this.ctx.storage.getAlarm() === null) await this.ctx.storage.setAlarm(now + 1300);
      await this.ctx.storage.put('state', state);
      return json({ ok: true, status: 'queued' }, 202);
    });
  }
  alarm() {
    return this.serial(async () => {
      const state = await this.ctx.storage.get('state');
      if (!state?.queue.length) { await this.ctx.storage.deleteAll(); return; }
      const key = state.queue[0];
      const record = state.records[key];
      let delay = 1300;
      // A crash after sending is ambiguous: do not blindly send the same message again.
      if (record.status === 'sending') {
        record.status = 'failed'; state.queue.shift();
      } else {
        record.status = 'sending'; record.attempts++;
        await this.ctx.storage.put('state', state);
        const time = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(record.time));
        const managementUrl = visitorId(record.visitId) && this.env.PUBLIC_ORIGIN
          ? new URL(`/admin?visit=${record.visitId}`, this.env.PUBLIC_ORIGIN).href : undefined;
        try {
          const response = await fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: this.env.PUSHOVER_APP_TOKEN, user: this.env.PUSHOVER_USER_KEY, device: this.env.PUSHOVER_DEVICE || undefined, title: 'Website của Nguyên', priority: 0, message: `${EVENTS[record.event]}\nThiết bị (ước đoán): ${notificationDeviceLabel(record.device, record.deviceLabel)}\n🕒 ${time} (Việt Nam)`, url: managementUrl, url_title: managementUrl ? 'Quản lý / chặn IP này' : undefined }),
            signal: AbortSignal.timeout(8000)
          });
          const data = await response.json();
          if (response.status === 200 && data.status === 1) { record.status = 'sent'; state.queue.shift(); }
          else if (response.status >= 500 && record.attempts < 3) {
            record.status = 'queued';
            delay = 5000 * record.attempts;
          } else { record.status = 'failed'; state.queue.shift(); }
        } catch { record.status = 'failed'; state.queue.shift(); }
        if (record.status === 'failed') console.error('notification_delivery_failed', { event: record.event });
      }
      await this.ctx.storage.put('state', state);
      // An idle alarm removes expired session hashes after a day.
      await this.ctx.storage.setAlarm(Date.now() + (state.queue.length ? delay : 86400000));
    });
  }
}

