import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AccessRegistry } from './access-registry.mjs';

const WEEK = 7 * 86400000;
const ipKey = index => index.toString(16).padStart(64, '0');
const visit = (index = 1, extra = {}) => ({ ipKey: ipKey(index), ip: `192.0.${Math.floor(index / 256)}.${index % 256}`, deviceLabel: 'iPhone', countView: false, ...extra });
const req = (path, input, method = input === undefined ? 'GET' : 'POST') => new Request(`https://registry.local${path}`, {
  method, headers: { 'Content-Type': 'application/json' },
  ...(input === undefined ? {} : { body: typeof input === 'string' ? input : JSON.stringify(input) })
});

function fixture() {
  let data = new Map(), alarm = null, failPut = false;
  const copy = value => value === undefined ? undefined : structuredClone(value);
  const storage = {
    async transaction(callback) {
      const draft = copy(data);
      let nextAlarm = alarm;
      const transaction = {
        get: async key => copy(draft.get(key)),
        put: async (key, value) => {
          if (failPut) { failPut = false; throw new Error('storage unavailable'); }
          draft.set(key, copy(value));
        },
        delete: async keys => {
          let deleted = 0;
          for (const key of Array.isArray(keys) ? keys : [keys]) if (draft.delete(key)) deleted++;
          return deleted;
        },
        list: async ({ prefix = '' } = {}) => new Map([...draft].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, copy(value)])),
        getAlarm: async () => nextAlarm,
        setAlarm: async time => { nextAlarm = time; },
        deleteAlarm: async () => { nextAlarm = null; }
      };
      const result = await callback(transaction);
      data = draft; alarm = nextAlarm;
      return result;
    }
  };
  const ctx = { storage };
  return {
    registry: new AccessRegistry(ctx, {}), restart: () => new AccessRegistry(ctx, {}),
    state: () => copy(data), seed: (key, value) => data.set(key, copy(value)), alarm: () => alarm, failNextPut: () => { failPut = true; }
  };
}

test('visit, private list, block and unblock persist across Durable Object instances', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const first = await (await f.registry.fetch(req('/visit', visit()))).json();
  assert.match(first.id, /^[a-f0-9-]{36}$/);
  assert.equal(first.blocked, false);
  assert.equal(f.alarm(), now + WEEK);
  now += 1000;
  const again = await (await f.registry.fetch(req('/visit', visit(1, { deviceLabel: 'Máy tính Windows (Laptop/PC)' })))).json();
  assert.equal(again.id, first.id);
  const listing = await (await f.registry.fetch(req('/list'))).json();
  assert.equal(listing.capacity, 500);
  assert.equal(listing.visitors.length, 1);
  assert.deepEqual(Object.keys(listing.visitors[0]).sort(), ['blocked', 'blockedAt', 'countingSince', 'deviceLabel', 'firstSeen', 'id', 'ip', 'lastSeen', 'visitCount']);
  assert.equal(listing.visitors[0].firstSeen, now - 1000);
  assert.equal(listing.visitors[0].lastSeen, now);
  assert.equal(listing.visitors[0].deviceLabel, 'Máy tính Windows (Laptop/PC)');
  const blocked = await (await f.registry.fetch(req('/block', { id: first.id }))).json();
  assert.equal(blocked.visitor.blocked, true);
  assert.equal(blocked.visitor.blockedAt, now);
  assert.deepEqual(await (await f.restart().fetch(req('/check', { ipKey: ipKey(1) }))).json(), { blocked: true });
  assert.equal((await (await f.registry.fetch(req('/visit', visit()))).json()).blocked, true);
  assert.equal((await (await f.restart().fetch(req('/unblock', { id: first.id }))).json()).visitor.blocked, false);
  assert.deepEqual(await (await f.registry.fetch(req('/check', { ipKey: ipKey(1) }))).json(), { blocked: false });
  assert.equal(f.state().size, 2);
  assert.equal([...f.state().keys()].some(key => key === 'state'), false);
});

test('concurrent visits create one opaque id per IP and cannot retarget it', async () => {
  const f = fixture();
  const replies = await Promise.all(Array.from({ length: 20 }, () => f.registry.fetch(req('/visit', visit()))));
  const ids = await Promise.all(replies.map(response => response.json().then(value => value.id)));
  assert.equal(new Set(ids).size, 1);
  assert.equal(f.state().size, 2);
  assert.equal((await f.registry.fetch(req('/visit', visit(1, { ip: '198.51.100.20' })))).status, 400);
  const publicList = await (await f.registry.fetch(req('/list'))).json();
  assert.equal(publicList.visitors[0].ip, visit().ip);
  assert.equal(JSON.stringify(publicList).includes(ipKey(1)), false);
});

test('alarms expire idle unblocked records but retain blocked records permanently', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const a = await (await f.registry.fetch(req('/visit', visit(1)))).json();
  const b = await (await f.registry.fetch(req('/visit', visit(2)))).json();
  await f.registry.fetch(req('/block', { id: b.id }));
  now += WEEK;
  await f.restart().alarm();
  assert.equal(f.state().has(`v:${a.id}`), false);
  assert.equal(f.state().has(`ip:${ipKey(1)}`), false);
  assert.equal(f.state().has(`v:${b.id}`), true);
  assert.equal(f.alarm(), null);
  now += 20 * WEEK;
  assert.deepEqual(await (await f.registry.fetch(req('/check', { ipKey: ipKey(2) }))).json(), { blocked: true });
  await f.registry.fetch(req('/unblock', { id: b.id }));
  assert.equal(f.alarm(), now + WEEK);
  const listed = await (await f.registry.fetch(req('/list'))).json();
  assert.equal(listed.visitors[0].lastSeen, now - 21 * WEEK);
  now += WEEK;
  await f.registry.alarm();
  assert.equal(f.state().size, 0);
  assert.equal(f.alarm(), null);
});

test('visit refreshes expiry and expired ids cannot be blocked before alarm cleanup', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const first = await (await f.registry.fetch(req('/visit', visit()))).json();
  now += WEEK - 1;
  await f.registry.fetch(req('/visit', visit()));
  assert.equal(f.alarm(), now + WEEK);
  now += WEEK;
  assert.equal((await f.registry.fetch(req('/block', { id: first.id }))).status, 404);
  assert.equal(f.state().size, 0);
  const next = await (await f.registry.fetch(req('/visit', visit()))).json();
  assert.notEqual(next.id, first.id);
});

test('capacity evicts the oldest unblocked visitor and never a blocked visitor', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const ids = [];
  for (let index = 1; index <= 500; index++) {
    ids.push((await (await f.registry.fetch(req('/visit', visit(index)))).json()).id);
    now++;
  }
  await f.registry.fetch(req('/block', { id: ids[0] }));
  assert.equal((await f.registry.fetch(req('/visit', visit(501)))).status, 200);
  assert.equal(f.state().has(`v:${ids[0]}`), true);
  assert.equal(f.state().has(`v:${ids[1]}`), false);
  assert.equal(f.state().has(`ip:${ipKey(2)}`), false);
  assert.equal((await (await f.registry.fetch(req('/list'))).json()).visitors.length, 500);
  assert.equal(f.state().size, 1000);
  for (const visitor of (await (await f.registry.fetch(req('/list'))).json()).visitors) {
    await f.registry.fetch(req('/block', { id: visitor.id }));
  }
  const before = f.state();
  assert.equal((await f.registry.fetch(req('/visit', visit(502)))).status, 503);
  assert.deepEqual(f.state(), before);
  assert.equal((await f.registry.fetch(req('/visit', visit(1)))).status, 200);
});

test('only the declared methods and strict bounded schemas are accepted', async () => {
  const f = fixture();
  assert.equal((await f.registry.fetch(req('/missing'))).status, 404);
  for (const path of ['/visit', '/check', '/block', '/unblock']) {
    assert.equal((await f.registry.fetch(req(path))).status, 405);
  }
  assert.equal((await f.registry.fetch(req('/list', {}))).status, 405);
  for (const input of [null, [], 'not json', {}, visit(1, { secret: 'ignored?' }), visit(1, { ipKey: 'a'.repeat(63) }),
    visit(1, { ip: '256.1.2.3' }), visit(1, { ip: '127.1' }), visit(1, { ip: 'example.com' }),
    visit(1, { ip: '1:2:3:4:5:6:7:8:9' }), visit(1, { ip: 'fe80::1%eth0' }),
    visit(1, { deviceLabel: '' }), visit(1, { deviceLabel: 'x'.repeat(81) }), visit(1, { deviceLabel: 'iPhone\nextra' }),
    visit(1, { countView: 'true' }), visit(1, { countView: null }), visit(1, { countView: 1 })]) {
    assert.equal((await f.registry.fetch(req('/visit', input))).status, 400, JSON.stringify(input));
  }
  assert.equal((await f.registry.fetch(req('/visit', 'x'.repeat(513)))).status, 413);
  assert.equal((await f.registry.fetch(new Request('https://registry.local/visit', { method: 'POST', body: JSON.stringify(visit()) }))).status, 415);
  assert.equal((await f.registry.fetch(req('/block', { id: 'bad' }))).status, 400);
  assert.equal((await f.registry.fetch(req('/block', { id: crypto.randomUUID() }))).status, 404);
  assert.equal((await f.registry.fetch(req('/unblock', { id: crypto.randomUUID() }))).status, 404);
  assert.deepEqual(await (await f.registry.fetch(req('/check', { ipKey: ipKey(123) }))).json(), { blocked: false });
  assert.equal(f.state().size, 0);
});

test('document counts persist atomically, while events and blocked attempts do not inflate them', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const first = await (await f.registry.fetch(req('/visit', visit(1, { countView: true })))).json();
  now += 1000;
  await Promise.all(Array.from({ length: 20 }, () => f.registry.fetch(req('/visit', visit(1, { countView: true })))));
  await f.registry.fetch(req('/visit', visit()));
  let listing = await (await f.restart().fetch(req('/list'))).json();
  assert.equal(listing.visitors[0].visitCount, 21);
  assert.equal(listing.visitors[0].countingSince, now - 1000);
  await f.registry.fetch(req('/block', { id: first.id }));
  now += 1000;
  assert.equal((await (await f.registry.fetch(req('/visit', visit(1, { countView: true })))).json()).blocked, true);
  listing = await (await f.registry.fetch(req('/list'))).json();
  assert.equal(listing.visitors[0].visitCount, 21);
  assert.equal(listing.visitors[0].lastSeen, now - 1000);
  await f.registry.fetch(req('/unblock', { id: first.id }));
  await f.registry.fetch(req('/visit', visit(1, { countView: true })));
  assert.equal((await (await f.registry.fetch(req('/list'))).json()).visitors[0].visitCount, 22);
  f.failNextPut();
  await assert.rejects(f.registry.fetch(req('/visit', visit(1, { countView: true }))), /storage unavailable/);
  assert.equal((await (await f.registry.fetch(req('/list'))).json()).visitors[0].visitCount, 22);
});

test('legacy IPs retain their identity and block status without inventing old visit totals', async t => {
  let now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const id = crypto.randomUUID();
  f.seed(`ip:${ipKey(1)}`, id);
  f.seed(`v:${id}`, { id, ...visit(), firstSeen: now - 100000, lastSeen: now - 50000, blocked: true, blockedAt: now - 1000, expiresAt: null });
  let visitor = (await (await f.registry.fetch(req('/list'))).json()).visitors[0];
  assert.equal(visitor.visitCount, 0);
  assert.equal(visitor.countingSince, null);
  assert.equal(visitor.blocked, true);
  await f.registry.fetch(req('/unblock', { id }));
  await f.registry.fetch(req('/visit', visit(1, { countView: true })));
  visitor = (await (await f.registry.fetch(req('/list'))).json()).visitors[0];
  assert.equal(visitor.id, id);
  assert.equal(visitor.firstSeen, now - 100000);
  assert.equal(visitor.visitCount, 1);
  assert.equal(visitor.countingSince, now);
});

test('valid IPv4 and IPv6 addresses work and responses never cache visitor data', async () => {
  const f = fixture();
  for (const [index, ip] of ['0.0.0.0', '255.255.255.255', '2001:db8::1', '::1', '::ffff:192.0.2.1'].entries()) {
    const response = await f.registry.fetch(req('/visit', visit(index + 1, { ip })));
    assert.equal(response.status, 200, ip);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  const response = await f.registry.fetch(req('/list'));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).visitors.length, 5);
});

test('storage failure propagates, transaction rolls back and the object recovers', async () => {
  const f = fixture();
  f.failNextPut();
  await assert.rejects(f.registry.fetch(req('/visit', visit())), /storage unavailable/);
  assert.equal(f.state().size, 0);
  assert.equal(f.alarm(), null);
  assert.equal((await f.registry.fetch(req('/visit', visit()))).status, 200);
  assert.equal(f.state().size, 2);
});
