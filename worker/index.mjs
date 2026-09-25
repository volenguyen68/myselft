const EVENTS = Object.freeze({
  view: '👋 Có người vừa mở trang giới thiệu của bạn.',
  later: '🌙 Có người vừa nhấn “Để sau”.',
  ok: '✨ Có người vừa nhấn “OK” — một lời chào mới!'
});
const DEVICE_LABELS = Object.freeze({
  iphone: 'iPhone',
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

// User-Agent is only a hint: desktop-mode iPads can look like Macs, and laptop/PC is indistinguishable.
// Return a fixed code only; never persist or forward the original header.
export function classifyDevice(userAgent) {
  if (typeof userAgent !== 'string') return 'unknown';
  const ua = userAgent.slice(0, 1024);
  if (/\bWindows (?:Phone|Mobile)\b/i.test(ua)) return 'mobile';
  if (/\biPad\b|\biPod\b/i.test(ua)) return 'ipad_ipod';
  if (/\biPhone\b/i.test(ua)) return 'iphone';
  if (/\bAndroid\b/i.test(ua)) return /\bMobile\b/i.test(ua) ? 'android_phone' : 'android_tablet';
  if (/\bCrOS\b/i.test(ua)) return 'chromebook';
  if (/\bWindows\b/i.test(ua)) return 'windows';
  if (/\bMacintosh\b|\bMac OS X\b/i.test(ua)) return 'mac';
  if (/\bMobile\b|\bMobi\b|\bTablet\b|\bwebOS\b|\bBlackBerry\b|\bBB10\b|\bOpera Mini\b/i.test(ua)) return 'mobile';
  if (/\bLinux\b/i.test(ua)) return 'linux';
  return 'unknown';
}
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

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
    if (new URL(request.url).pathname !== '/events') return json({ ok: false }, 404);
    const origin = request.headers.get('Origin');
    if (!env.ALLOWED_ORIGIN || !origin || origin === 'null' || origin !== env.ALLOWED_ORIGIN) return json({ ok: false }, 403);
    const headers = {
      'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ ok: false }, 405, { ...headers, Allow: 'POST, OPTIONS' });
    if (!env.PUSHOVER_APP_TOKEN || !env.PUSHOVER_USER_KEY || !env.NOTIFICATIONS || !env.RATE_LIMITER) return json({ ok: false, error: 'not_configured' }, 503, headers);
    let data;
    try { data = await readEvent(request); } catch (status) { return json({ ok: false }, typeof status === 'number' ? status : 400, headers); }
    const device = classifyDevice(request.headers.get('User-Agent'));
    // IP is used only by the short-lived rate limiter, never stored in records or sent to Pushover.
    const limit = await env.RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!limit.success) return json({ ok: false, error: 'rate_limited' }, 429, { ...headers, 'Retry-After': '60' });
    try {
      const id = env.NOTIFICATIONS.idFromName('personal-intro-inbox');
      const result = await env.NOTIFICATIONS.get(id).fetch(new Request('https://queue.local/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, device })
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
      const { sessionId, event, device } = await request.json();
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
      state.records[key] = { event, device: deviceCode(device), time: now, expiresAt: now + 86400000, status: 'queued', attempts: 0 };
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
        try {
          const response = await fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: this.env.PUSHOVER_APP_TOKEN, user: this.env.PUSHOVER_USER_KEY, device: this.env.PUSHOVER_DEVICE || undefined, title: 'Website của Nguyên', priority: 0, message: `${EVENTS[record.event]}\nThiết bị (ước đoán): ${DEVICE_LABELS[deviceCode(record.device)]}\n🕒 ${time} (Việt Nam)` }),
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

