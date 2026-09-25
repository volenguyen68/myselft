import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { NotificationQueue } from './index.mjs';

const origin = 'https://volenguyen68.github.io';
const sessionId = '12345678-1234-1234-1234-123456789abc';
const event = (choice = 'ok', extra = {}) => ({ event: choice, sessionId, ...extra });
const request = (payload, options = {}) => new Request('https://example.test/events', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers },
  body: typeof payload === 'string' ? payload : JSON.stringify(payload), ...options
});
const envFor = () => {
  const calls = [];
  return { calls, env: {
    ALLOWED_ORIGIN: origin, PUSHOVER_APP_TOKEN: 'test-only', PUSHOVER_USER_KEY: 'test-only',
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    NOTIFICATIONS: { idFromName: () => 'test', get: () => ({ fetch: async (req) => {
      calls.push(await req.json()); return Response.json({ ok: true, status: 'queued' }, { status: 202 });
    } }) }
  } };
};
test('all three requested events are accepted', async () => {
  const { env, calls } = envFor();
  for (const type of ['view', 'later', 'ok']) assert.equal((await worker.fetch(request(event(type)), env)).status, 202);
  assert.deepEqual(calls.map(x => x.event), ['view', 'later', 'ok']);
});
test('rejects invalid and oversized bodies before forwarding', async () => {
  const { env, calls } = envFor();
  for (const payload of ['{bad', null, [], event('toString'), event('other'), event('ok', { message: 'inject' }), { event: 'ok', sessionId: 'short' }]) {
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

function queueFixture() {
  let value, alarm = null;
  const ctx = { storage: {
    get: async () => value ? structuredClone(value) : undefined,
    put: async (_, data) => { value = structuredClone(data); },
    getAlarm: async () => alarm,
    setAlarm: async time => { alarm = time; },
    deleteAll: async () => { value = undefined; alarm = null; }
  } };
  const q = new NotificationQueue(ctx, { PUSHOVER_APP_TOKEN: 'fake', PUSHOVER_USER_KEY: 'fake' });
  return { q, state: () => value, alarm: () => alarm };
}
test('concurrent duplicate events enter the durable queue once', async () => {
  const { q, state } = queueFixture();
  const responses = await Promise.all(Array.from({ length: 10 }, () => q.fetch(request(event()))));
  assert.equal(state().queue.length, 1);
  assert.equal(responses.filter(r => r.status === 202).length, 1);
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

