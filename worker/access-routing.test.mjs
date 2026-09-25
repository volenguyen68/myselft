import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.mjs';
import { COOKIE_NAME, createSession, hasSession } from './admin-auth.mjs';

const origin = 'https://personal.example';
const ip = '192.0.2.42';
const visitId = '12345678-1234-4234-8234-123456789abc';
const sessionId = 'abcdef01-1234-4234-8234-abcdef012345';
const password = 'routing-test-admin-password-'.repeat(2);
const sessionKey = 'routing-test-session-secret-'.repeat(2);
const assetMarker = 'PRIVATE_ASSET_CONTENT_MUST_NOT_LEAK';

before(() => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external network request'); });
});
after(() => mock.restoreAll());

function fixture({ blocked = false, failure = null } = {}) {
  const state = { blocked, failure, rateAllowed: true };
  const calls = { registry: [], assets: [], queue: [], rate: [] };
  const env = {
    PUBLIC_ORIGIN: origin,
    ALLOWED_ORIGIN: 'https://legacy.example',
    ADMIN_PASSWORD: password,
    ADMIN_SESSION_KEY: sessionKey,
    IP_HASH_KEY: 'routing-test-ip-hash-secret-'.repeat(2),
    PUSHOVER_APP_TOKEN: 'test-token-never-sent',
    PUSHOVER_USER_KEY: 'test-user-never-sent',
    RATE_LIMITER: { limit: async ({ key }) => { calls.rate.push(key); return { success: state.rateAllowed }; } },
    ACCESS: {
      idFromName: (name) => name,
      get: (name) => {
        assert.equal(name, 'personal-intro-access');
        return { fetch: async (request) => {
          const path = new URL(request.url).pathname;
          const body = request.method === 'POST' ? await request.json() : null;
          calls.registry.push({ path, method: request.method, body });
          if (state.failure === 'throw') throw new Error('Registry storage unavailable');
          if (state.failure === 'status') return Response.json({ error: 'unavailable' }, { status: 503 });
          if (state.failure === 'json') return new Response('not-json', { status: 200 });
          if (state.failure === 'shape') return Response.json({});
          if (path === '/check') return Response.json({ blocked: state.blocked });
          if (path === '/visit') return Response.json({ id: visitId, blocked: state.blocked });
          if (path === '/list') return Response.json({ visitors: [{ id: visitId, ip, deviceLabel: 'Máy tính Windows', firstSeen: Date.now(), lastSeen: Date.now(), blocked: state.blocked, blockedAt: null }], capacity: 500 });
          if (path === '/block' || path === '/unblock') {
            assert.equal(request.method, 'POST');
            assert.deepEqual(body, { id: visitId });
            state.blocked = path === '/block';
            return Response.json({ ok: true, blocked: state.blocked });
          }
          throw new Error('Unexpected registry route: ' + path);
        } };
      }
    },
    ASSETS: { fetch: async (request) => { calls.assets.push(request.url); return new Response(assetMarker, { headers: { 'Content-Type': 'text/html' } }); } },
    NOTIFICATIONS: {
      idFromName: (name) => name,
      get: (name) => {
        assert.equal(name, 'personal-intro-inbox');
        return { fetch: async (request) => {
          calls.queue.push(await request.json());
          return Response.json({ ok: true, status: 'queued' }, { status: 202 });
        } };
      }
    }
  };
  return { env, state, calls };
}

function request(path, { method = 'GET', requestOrigin = origin, trustedIp = ip, cookie, body, headers = {} } = {}) {
  const prepared = new Headers(headers);
  if (requestOrigin !== null) prepared.set('Origin', requestOrigin);
  if (trustedIp !== null) prepared.set('CF-Connecting-IP', trustedIp);
  if (cookie) prepared.set('Cookie', cookie);
  if (body !== undefined && !prepared.has('Content-Type')) prepared.set('Content-Type', 'application/json');
  return new Request(new URL(path, origin), {
    method, headers: prepared,
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
}

const authenticatedCookie = async () => `${COOKIE_NAME}=${await createSession(sessionKey)}`;
test('an unblocked visitor can leave the blocked URL by refreshing', async () => {
  const { env, calls } = fixture();
  const response = await worker.fetch(request('/blocked'), env);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls.assets.length, 0);
});
const loginRequest = (options = {}) => request('/admin/login?visit=' + visitId, {
  method: 'POST', body: new URLSearchParams({ password }).toString(),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, ...options
});
const eventRequest = (options = {}) => request('/events', { method: 'POST', body: { event: 'view', sessionId }, ...options });
const assertNoDelivery = (calls) => {
  assert.equal(calls.assets.length, 0, 'must not fetch public assets');
  assert.equal(calls.queue.length, 0, 'must not enqueue a notification');
};

test('unauthenticated admin redirects to login with visit, login renders, and JSON API returns 401', async () => {
  const { env, calls } = fixture();
  const admin = await worker.fetch(request('/admin?visit=' + visitId), env);
  assert.equal(admin.status, 303);
  assert.equal(admin.headers.get('Location'), '/admin/login?visit=' + visitId);
  const login = await worker.fetch(request('/admin/login?visit=' + visitId), env);
  assert.equal(login.status, 200);
  assert.match(await login.text(), /name="password"/);
  const api = await worker.fetch(request('/admin/api/visitors'), env);
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { ok: false, error: 'unauthorized' });
  assert.equal(api.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls.registry.length, 0);
  assertNoDelivery(calls);
});

test('login sets a Secure HttpOnly SameSite host cookie and preserves only a valid visit target', async () => {
  const { env, calls } = fixture();
  const response = await worker.fetch(loginRequest(), env);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/admin?visit=' + visitId);
  const cookie = response.headers.get('Set-Cookie');
  assert.ok(cookie.startsWith('__Host-nguyen-admin='));
  for (const attribute of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax', 'Max-Age=43200']) assert.ok(cookie.split('; ').includes(attribute), attribute);
  assert.doesNotMatch(cookie, /(?:^|;\s*)Domain=/i);
  assert.equal(await hasSession(request('/admin', { cookie: cookie.split(';')[0] }), sessionKey), true);
  assert.equal(calls.rate.length, 1);
  assert.match(calls.rate[0], /^admin-login:[a-f0-9]{64}$/);
  assert.equal(calls.rate[0].includes(ip), false);
  assert.equal(calls.registry.length, 0);
  assertNoDelivery(calls);

  const malicious = '/admin/login?visit=' + encodeURIComponent('https://attacker.example/');
  const safe = await worker.fetch(request(malicious, { method: 'POST', body: new URLSearchParams({ password }).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), env);
  assert.equal(safe.headers.get('Location'), '/admin');
});

test('wrong or repeated login is rejected without issuing a session', async () => {
  const { env, state, calls } = fixture();
  const wrong = await worker.fetch(loginRequest({ body: 'password=not-the-password' }), env);
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get('Set-Cookie'), null);
  assert.doesNotMatch(await wrong.text(), new RegExp(password));
  state.rateAllowed = false;
  const limited = await worker.fetch(loginRequest(), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Set-Cookie'), null);
  assert.equal(limited.headers.get('Retry-After'), '60');
  assertNoDelivery(calls);
});

test('all admin mutations reject missing, null, forged, and legacy origins before side effects', async () => {
  const cookie = await authenticatedCookie();
  for (const requestOrigin of [null, 'null', 'https://attacker.example', 'https://legacy.example']) {
    for (const path of ['/admin/login', '/admin/logout', '/admin/api/block', '/admin/api/unblock']) {
      const { env, calls } = fixture();
      const response = await worker.fetch(request(path, { method: 'POST', requestOrigin, cookie, body: { id: visitId } }), env);
      assert.equal(response.status, 403, path + ' Origin=' + requestOrigin);
      assert.equal(response.headers.get('Set-Cookie'), null);
      assert.equal(calls.registry.length, 0);
      assert.equal(calls.rate.length, 0);
      assertNoDelivery(calls);
    }
  }
});

test('opening a visitor notification link never blocks, even with an authenticated session', async () => {
  const { env, state, calls } = fixture();
  const cookie = await authenticatedCookie();
  const response = await worker.fetch(request('/admin?visit=' + visitId, { cookie }), env);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Lượt mở được chọn/);
  assert.match(html, /Chặn IP/);
  assert.equal(state.blocked, false);
  assert.equal(calls.registry.length, 0);
  const nonce = html.match(/<script nonce="([a-f0-9]+)">/)?.[1];
  assert.ok(nonce);
  assert.ok(response.headers.get('Content-Security-Policy').includes("script-src 'nonce-" + nonce + "'"));
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assertNoDelivery(calls);
});

test('block and unblock require an authenticated explicit POST, while GET is forbidden', async () => {
  const { env, state, calls } = fixture();
  const cookie = await authenticatedCookie();
  for (const path of ['/admin/api/block', '/admin/api/unblock']) {
    assert.equal((await worker.fetch(request(path, { method: 'POST', body: { id: visitId } }), env)).status, 401);
    assert.equal((await worker.fetch(request(path + '?id=' + visitId, { cookie }), env)).status, 405);
  }
  assert.equal(calls.registry.length, 0);
  const block = await worker.fetch(request('/admin/api/block', { method: 'POST', cookie, body: { id: visitId } }), env);
  assert.equal(block.status, 200);
  assert.deepEqual(await block.json(), { ok: true, blocked: true });
  assert.equal(state.blocked, true);
  const unblock = await worker.fetch(request('/admin/api/unblock', { method: 'POST', cookie, body: { id: visitId } }), env);
  assert.equal(unblock.status, 200);
  assert.deepEqual(await unblock.json(), { ok: true, blocked: false });
  assert.equal(state.blocked, false);
  assert.deepEqual(calls.registry, [
    { path: '/block', method: 'POST', body: { id: visitId } },
    { path: '/unblock', method: 'POST', body: { id: visitId } }
  ]);
  assertNoDelivery(calls);
});

test('malformed block requests are rejected without changing registry state', async () => {
  const { env, calls } = fixture();
  const cookie = await authenticatedCookie();
  for (const body of [null, [], {}, { id: 'bad' }, { id: '-'.repeat(36) }, { id: visitId, ip }, '{broken']) {
    const response = await worker.fetch(request('/admin/api/block', { method: 'POST', cookie, body }), env);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  const contentType = await worker.fetch(request('/admin/api/block', { method: 'POST', cookie, body: { id: visitId }, headers: { 'Content-Type': 'text/plain' } }), env);
  assert.equal(contentType.status, 415);
  assert.equal(calls.registry.length, 0);
  assertNoDelivery(calls);
});

test('owner can reach login, dashboard, and visitor API even from a blocked IP', async () => {
  const { env, calls } = fixture({ blocked: true });
  const cookie = await authenticatedCookie();
  assert.equal((await worker.fetch(request('/admin/login'), env)).status, 200);
  assert.equal((await worker.fetch(request('/admin', { cookie }), env)).status, 200);
  const list = await worker.fetch(request('/admin/api/visitors', { cookie }), env);
  assert.equal(list.status, 200);
  assert.equal((await list.json()).visitors[0].blocked, true);
  assert.deepEqual(calls.registry.map((call) => call.path), ['/list']);
  assertNoDelivery(calls);
});

test('logout requires POST and clears the host session cookie', async () => {
  const { env, calls } = fixture();
  const cookie = await authenticatedCookie();
  const get = await worker.fetch(request('/admin/logout', { cookie }), env);
  assert.notEqual(get.status, 303);
  assert.equal(get.headers.get('Set-Cookie'), null);
  const logout = await worker.fetch(request('/admin/logout', { method: 'POST', cookie }), env);
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get('Location'), '/admin/login');
  assert.match(logout.headers.get('Set-Cookie'), /^__Host-nguyen-admin=; Path=\/; Max-Age=0; Secure; HttpOnly; SameSite=Lax$/);
  assertNoDelivery(calls);
});

test('blocked public HTML, deep links, and assets return only the blocked page without fetching assets', async () => {
  const { env, calls } = fixture({ blocked: true });
  for (const path of ['/', '/index.html', '/styles.css', '/app.js', '/assets/nguyen-portrait.png', '/some/deep/link', '/blocked']) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 403, path);
    const text = await response.text();
    assert.match(text, /bạn đã bị block🤔/);
    assert.equal(text.includes(assetMarker), false);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  const head = await worker.fetch(request('/assets/nguyen-portrait.png', { method: 'HEAD' }), env);
  assert.equal(head.status, 403);
  assert.equal(await head.text(), '');
  assertNoDelivery(calls);
});

test('blocked access checks and visitor events never enqueue Pushover notifications', async () => {
  const { env, calls } = fixture({ blocked: true });
  const access = await worker.fetch(request('/access'), env);
  assert.equal(access.status, 403);
  assert.deepEqual(await access.json(), { blocked: true });
  const event = await worker.fetch(eventRequest(), env);
  assert.equal(event.status, 403);
  assert.deepEqual(await event.json(), { ok: false, blocked: true });
  assert.deepEqual(calls.registry.map((call) => call.path), ['/check', '/visit']);
  assertNoDelivery(calls);
});

test('allowed public requests fetch assets only after checking access; events forward the opaque visit ID', async () => {
  const { env, calls } = fixture();
  const asset = await worker.fetch(request('/'), env);
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), assetMarker);
  assert.equal(asset.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls.registry[0].path, '/check');
  assert.match(calls.registry[0].body.ipKey, /^[a-f0-9]{64}$/);
  assert.equal(calls.registry[0].body.ipKey.includes(ip), false);
  assert.equal(calls.assets.length, 1);
  const access = await worker.fetch(request('/access'), env);
  assert.equal(access.status, 200);
  assert.deepEqual(await access.json(), { blocked: false });
  const event = await worker.fetch(eventRequest({ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }), env);
  assert.equal(event.status, 202);
  assert.deepEqual(calls.queue, [{ event: 'view', sessionId, device: 'windows', visitId }]);
  const visit = calls.registry.find((call) => call.path === '/visit');
  assert.equal(visit.body.ip, ip);
  assert.equal(visit.body.deviceLabel, 'Máy tính Windows (Laptop/PC)');
});

test('missing and failing registries return 503 without blocked accusations, assets, or notifications', async () => {
  for (const mode of ['missing', 'throw', 'status', 'json']) {
    for (const path of ['/', '/assets/nguyen-portrait.png', '/access', '/events']) {
      const { env, calls } = fixture({ failure: mode === 'missing' ? null : mode });
      if (mode === 'missing') delete env.ACCESS;
      const response = await worker.fetch(path === '/events' ? eventRequest() : request(path), env);
      assert.equal(response.status, 503, mode + ' ' + path);
      const text = await response.text();
      assert.equal(text.includes('bạn đã bị block🤔'), false, mode + ' ' + path);
      assert.equal(text.includes(assetMarker), false, mode + ' ' + path);
      assert.equal(text.includes('Registry storage unavailable'), false, 'internal errors must not leak');
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assertNoDelivery(calls);
    }
  }
});

test('missing or invalid CF IP fails closed despite forged forwarding headers', async () => {
  for (const trustedIp of [null, 'invalid', '192.0.2.999']) {
    const { env, calls } = fixture();
    const headers = { 'X-Forwarded-For': ip, 'X-Real-IP': ip };
    for (const path of ['/', '/access']) {
      assert.equal((await worker.fetch(request(path, { trustedIp, headers }), env)).status, 503);
    }
    assert.equal((await worker.fetch(eventRequest({ trustedIp, headers }), env)).status, 503);
    assert.equal(calls.registry.length, 0);
    assertNoDelivery(calls);
  }
});

test('a registry response missing an explicit access decision fails closed without leaking content', async () => {
  for (const path of ['/', '/assets/nguyen-portrait.png', '/access', '/events']) {
    const { env, calls } = fixture({ failure: 'shape' });
    const response = await worker.fetch(path === '/events' ? eventRequest() : request(path), env);
    assert.equal(response.status, 503, path + ' must require a valid registry result');
    assert.equal((await response.text()).includes(assetMarker), false);
    assertNoDelivery(calls);
  }
});

test('private routes fail closed when required admin configuration is absent', async () => {
  for (const binding of ['ADMIN_PASSWORD', 'ADMIN_SESSION_KEY', 'IP_HASH_KEY', 'ACCESS']) {
    const { env, calls } = fixture();
    delete env[binding];
    const response = await worker.fetch(request('/admin'), env);
    assert.equal(response.status, 503, binding);
    assert.equal((await response.text()).includes(assetMarker), false);
    assertNoDelivery(calls);
  }
});
