import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { classifyDevice, NotificationQueue } from './index.mjs';

const origin = 'https://volenguyen68.github.io';
const sessionId = '12345678-1234-1234-1234-123456789abc';
const visitId = '11111111-2222-4333-8444-555555555555';
const event = (choice = 'ok', extra = {}) => ({ event: choice, sessionId, ...extra });
const request = (payload, { headers = {}, ...options } = {}) => new Request('https://example.test/events', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.123', ...headers },
  body: typeof payload === 'string' ? payload : JSON.stringify(payload), ...options
});
const envFor = () => {
  const calls = [];
  return { calls, env: {
    ALLOWED_ORIGIN: origin, PUSHOVER_APP_TOKEN: 'test-only', PUSHOVER_USER_KEY: 'test-only',
    PUBLIC_ORIGIN: 'https://website.example', IP_HASH_KEY: 'test-ip-key-with-at-least-32-characters',
    ACCESS: { idFromName: () => 'access', get: () => ({ fetch: async () => Response.json({ id: visitId, blocked: false }) }) },
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    NOTIFICATIONS: { idFromName: () => 'test', get: () => ({ fetch: async (req) => {
      calls.push(await req.json()); return Response.json({ ok: true, status: 'queued' }, { status: 202 });
    } }) }
  } };
};
test('device classification returns fixed approximate codes for representative browser headers', () => {
  const examples = [
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', 'iphone'],
    ['Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1', 'ipad_ipod'],
    ['Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 'ipad_ipod'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36', 'android_phone'],
    ['Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'android_tablet'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 'mac'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'linux'],
    ['Mozilla/5.0 (X11; CrOS x86_64 15917.65.0) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'chromebook'],
    ['Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15063', 'mobile'],
    ['Mozilla/5.0 (BB10; Touch) AppleWebKit/537.35 Version/10.3.0.1337 Mobile Safari/537.35', 'mobile'],
    ['Mozilla/5.0 (Linux; Mobile) Gecko/18.0 Firefox/18.0', 'mobile'],
    ['Mozilla/5.0 (X11; CrOS Linux x86_64) AppleWebKit/537.36', 'chromebook'],
    ['IPHONE', 'iphone'],
    ['', 'unknown'], [null, 'unknown'], [undefined, 'unknown'], ['toString', 'unknown'],
    [`${'x'.repeat(1024)} iPhone`, 'unknown']
  ];
  for (const [ua, expected] of examples) assert.equal(classifyDevice(ua), expected, String(ua));
});
test('all three requested events are accepted', async () => {
  const { env, calls } = envFor();
  for (const type of ['view', 'later', 'ok']) assert.equal((await worker.fetch(request(event(type)), env)).status, 202);
  assert.deepEqual(calls.map(x => x.event), ['view', 'later', 'ok']);
});
test('rejects invalid and oversized bodies before forwarding', async () => {
  const { env, calls } = envFor();
  for (const payload of ['{bad', null, [], event('toString'), event('other'), event('ok', { message: 'inject' }), event('ok', { device: 'iphone' }), event('ok', { deviceLabel: 'iPhone 15 Pro Max' }), event('ok', { userAgent: 'iPhone' }), { event: 'ok', sessionId: 'short' }]) {
    assert.equal((await worker.fetch(request(payload), env)).status, 400);
  }
  assert.equal((await worker.fetch(request('x'.repeat(513)), env)).status, 413);
  assert.equal(calls.length, 0);
});
test('origin, method, content type, missing secrets and throttling fail closed', async () => {
  const { env, calls } = envFor();
  for (const untrusted of ['https://example.org', 'null', '']) {
    assert.equal((await worker.fetch(request(event(), { headers: { Origin: untrusted } }), env)).status, 403);
  }
  assert.equal((await worker.fetch(new Request('https://example.test/events', { headers: { Origin: origin } }), env)).status, 405);
  assert.equal((await worker.fetch(request(event(), { headers: { Origin: origin, 'Content-Type': 'text/plain' } }), env)).status, 415);
  assert.equal((await worker.fetch(request(event()), { ...env, PUSHOVER_APP_TOKEN: '' })).status, 503);
  assert.equal((await worker.fetch(request(event()), { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal(calls.length, 0);
});
test('preflight returns exact configured origin', async () => {
  const { env } = envFor();
  const result = await worker.fetch(new Request('https://example.test/events', { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(result.status, 204);
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
});

function queueFixture(initialState) {
  let value = initialState ? structuredClone(initialState) : undefined, alarm = null;
  const ctx = { storage: {
    get: async () => value ? structuredClone(value) : undefined,
    put: async (_, data) => { value = structuredClone(data); },
    getAlarm: async () => alarm,
    setAlarm: async time => { alarm = time; },
    deleteAll: async () => { value = undefined; alarm = null; }
  } };
  const q = new NotificationQueue(ctx, { PUSHOVER_APP_TOKEN: 'fake', PUSHOVER_USER_KEY: 'fake', PUBLIC_ORIGIN: 'https://website.example' });
  return { q, state: () => value, alarm: () => alarm };
}
test('concurrent duplicate events enter the durable queue once', async () => {
  const { q, state } = queueFixture();
  const responses = await Promise.all(Array.from({ length: 10 }, () => q.fetch(request(event()))));
  assert.equal(state().queue.length, 1);
  assert.equal(responses.filter(r => r.status === 202).length, 1);
});
test('a changed device header does not change session/event deduplication', async () => {
  const { q, state } = queueFixture();
  await q.fetch(request(event('ok', { device: 'iphone' })));
  const duplicate = await q.fetch(request(event('ok', { device: 'android_phone' })));
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
  assert.equal(state().queue.length, 1);
  assert.equal(Object.values(state().records)[0].device, 'iphone');
});
test('the Worker queues bounded device labels and every event omits raw UA and IP', async () => {
  const { q, state } = queueFixture();
  const { env } = envFor();
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 private-ua-marker';
  const ip = '192.0.2.123';
  const limitedKeys = [], messages = [], forwarded = [];
  env.RATE_LIMITER.limit = async ({ key }) => { limitedKeys.push(key); return { success: true }; };
  env.NOTIFICATIONS.get = () => ({ fetch: async req => {
    forwarded.push(await req.clone().json());
    assert.equal(req.headers.get('User-Agent'), null);
    assert.equal(req.headers.get('CF-Connecting-IP'), null);
    return q.fetch(req);
  } });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_, options) => { messages.push(JSON.parse(options.body)); return Response.json({ status: 1 }); };
  try {
    for (const type of ['view', 'later', 'ok']) {
      assert.equal((await worker.fetch(request(event(type), { headers: { 'User-Agent': ua, 'CF-Connecting-IP': ip } }), env)).status, 202);
      await q.alarm();
    }
    assert.deepEqual(forwarded, ['view', 'later', 'ok'].map(type => ({ ...event(type), device: 'iphone', deviceLabel: 'iPhone (chưa xác định đời máy)', visitId })));
    assert.ok(limitedKeys.every(key => /^[a-f0-9]{64}$/.test(key) && key !== ip));
    assert.equal(messages.length, 3);
    assert.ok(messages[0].message.includes('mở trang'));
    assert.ok(messages[1].message.includes('“Để sau”'));
    assert.ok(messages[2].message.includes('“OK”'));
    for (const message of messages) {
      assert.ok(message.message.includes('\nThiết bị (ước đoán): iPhone (chưa xác định đời máy)\n'));
      assert.equal(message.message.includes(sessionId), false);
      assert.equal(message.url, `https://website.example/admin?visit=${visitId}`);
      assert.equal(message.url_title, 'Quản lý / chặn IP này');
    }
    for (const record of Object.values(state().records)) {
      assert.equal(record.device, 'iphone');
      assert.equal(record.status, 'sent');
      assert.deepEqual(Object.keys(record).sort(), ['attempts', 'device', 'deviceLabel', 'event', 'expiresAt', 'status', 'time', 'visitId']);
    }
    const retained = JSON.stringify({ state: state(), messages, forwarded });
    assert.equal(retained.includes('private-ua-marker'), false);
    assert.equal(retained.includes(ip), false);
  } finally { globalThis.fetch = originalFetch; }
});
test('old pending records without a device are delivered with the unknown label', async () => {
  const now = Date.now();
  const { q, state } = queueFixture({
    records: { legacy: { event: 'view', time: now, expiresAt: now + 86400000, status: 'queued', attempts: 0 } },
    queue: ['legacy'], minute: Math.floor(now / 60000), count: 1
  });
  const originalFetch = globalThis.fetch;
  let message;
  globalThis.fetch = async (_, options) => { message = JSON.parse(options.body).message; return Response.json({ status: 1 }); };
  try {
    await q.alarm();
    assert.ok(message.includes('\nThiết bị (ước đoán): Không xác định\n'));
    assert.equal(state().records.legacy.status, 'sent');
    assert.equal(state().queue.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('reported model survives delivery while raw header markers are discarded', async () => {
  const examples = [
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) [FBAN/FBIOS;FBDV/iPhone16,2;FBAV/private-marker]', '', 'iPhone 15 Pro Max'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) [FBDV/iPhone10,4]', '', 'iPhone 8'],
    ['Mozilla/5.0 (Linux; Android 10; K) Chrome/140.0.0.0 Mobile Safari/537.36 private-marker', '"Pixel 9 Pro"', 'Android · Pixel 9 Pro']
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [ua, model, label] of examples) {
      const { env } = envFor();
      const { q, state } = queueFixture();
      const messages = [];
      env.NOTIFICATIONS.get = () => ({ fetch: req => q.fetch(req) });
      globalThis.fetch = async (_, options) => { messages.push(JSON.parse(options.body)); return Response.json({ status: 1 }); };
      const response = await worker.fetch(request(event('view'), { headers: { 'User-Agent': ua, 'Sec-CH-UA-Model': model } }), env);
      assert.equal(response.status, 202);
      await q.alarm();
      assert.equal(Object.values(state().records)[0].deviceLabel, label);
      assert.ok(messages[0].message.includes('Thiết bị (ước đoán): ' + label + '\n'));
      assert.equal(JSON.stringify({state: state(), messages}).includes('private-marker'), false);
      assert.equal(JSON.stringify(state()).includes('FBDV/'), false);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('malformed internal model labels use a safe fallback before persistence and delivery', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const deviceLabel of ['iPhone\nInjected notification', '<b>iPhone</b>', 'a'.repeat(81), { raw: 'iPhone' }]) {
      const { q, state } = queueFixture();
      let message;
      globalThis.fetch = async (_, options) => { message = JSON.parse(options.body).message; return Response.json({ status: 1 }); };
      await q.fetch(request(event('view', { device: 'iphone', deviceLabel })));
      assert.equal(Object.values(state().records)[0].deviceLabel, 'iPhone (chưa xác định đời máy)');
      await q.alarm();
      assert.ok(message.includes('Thiết bị (ước đoán): iPhone (chưa xác định đời máy)\n'));
    }
  } finally { globalThis.fetch = originalFetch; }
});
test('unknown or invalid internal device values cannot become notification text', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const device of [undefined, 'toString', '__proto__', 'arbitrary-private-label', { label: 'iPhone' }]) {
      const { q, state } = queueFixture();
      let message;
      globalThis.fetch = async (_, options) => { message = JSON.parse(options.body).message; return Response.json({ status: 1 }); };
      await q.fetch(request(event('ok', { device })));
      assert.equal(Object.values(state().records)[0].device, 'unknown');
      await q.alarm();
      assert.ok(message.includes('\nThiết bị (ước đoán): Không xác định\n'));
      assert.equal(message.includes('arbitrary-private-label'), false);
    }
  } finally { globalThis.fetch = originalFetch; }
});
test('view and click deliver separately; an idle cleanup alarm does not delay a new event', async () => {
  const { q, state, alarm } = queueFixture();
  const originalFetch = globalThis.fetch;
  const messages = [];
  globalThis.fetch = async (_, options) => { messages.push(JSON.parse(options.body)); return Response.json({ status: 1 }); };
  try {
    await q.fetch(request(event('view'))); await q.fetch(request(event('ok')));
    await q.alarm();
    assert.equal(state().queue.length, 1);
    assert.ok(alarm() >= Date.now() + 1000);
    await q.alarm();
    assert.equal(messages.length, 2);
    assert.ok(messages[0].message.includes('mở trang'));
    assert.ok(messages[1].message.includes('“OK”'));
    assert.equal(messages[0].message.includes(sessionId), false);
    assert.ok(alarm() > Date.now() + 40000000);
    await q.fetch(request(event('later')));
    assert.ok(alarm() < Date.now() + 5000);
  } finally { globalThis.fetch = originalFetch; }
});
test('Pushover server failure retries after at least five seconds', async () => {
  const { q, state, alarm } = queueFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: 0 }, { status: 500 });
  try {
    await q.fetch(request(event())); await q.alarm();
    assert.equal(state().records[state().queue[0]].status, 'queued');
    assert.ok(alarm() > Date.now() + 4000);
  } finally { globalThis.fetch = originalFetch; }
});
test('uncertain delivery is not blindly retried', async () => {
  const { q, state } = queueFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network interruption'); };
  try {
    await q.fetch(request(event())); await q.alarm();
    assert.equal(state().queue.length, 0);
    assert.equal(Object.values(state().records)[0].status, 'failed');
    assert.equal((await q.fetch(request(event()))).status, 502);
  } finally { globalThis.fetch = originalFetch; }
});

test('Pushover application rejection and exhausted quota never count as sent', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const status of [200, 400, 429]) {
      const { q, state } = queueFixture();
      globalThis.fetch = async () => Response.json({ status: 0 }, { status });
      await q.fetch(request(event())); await q.alarm();
      assert.equal(Object.values(state().records)[0].status, 'failed');
      assert.equal(state().queue.length, 0);
    }
  } finally { globalThis.fetch = originalFetch; }
});

