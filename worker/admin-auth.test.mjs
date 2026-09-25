import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_NAME, createSession, hasSession, passwordMatches, sessionCookie, visitorIP } from './admin-auth.mjs';

const secret = 'test-admin-session-key-'.repeat(3);
const password = 'test-admin-password-'.repeat(3);
const now = Date.UTC(2026, 8, 25, 12);
const lifetime = 12 * 60 * 60 * 1000;
const withCookie = (token, extra = '') => new Request('https://personal.example/admin', {
  headers: { Cookie: `${extra}${COOKIE_NAME}=${token}` }
});

test('signed sessions round-trip, use distinct tokens, and are accepted among unrelated cookies', async () => {
  const token = await createSession(secret, now);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.notEqual(token, await createSession(secret, now));
  assert.equal(await hasSession(withCookie(token), secret, now), true);
  assert.equal(await hasSession(withCookie(token, 'theme=dark; other=value; '), secret, now + 1000), true);
});

test('sessions reject payload tampering, signature tampering, and another signing key', async () => {
  const token = await createSession(secret, now);
  const [payload, signature] = token.split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const changedPayload = Buffer.from(JSON.stringify({ ...data, exp: data.exp + 3600 })).toString('base64url');
  const changedSignature = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
  assert.equal(await hasSession(withCookie(`${changedPayload}.${signature}`), secret, now), false);
  assert.equal(await hasSession(withCookie(`${payload}.${changedSignature}`), secret, now), false);
  assert.equal(await hasSession(withCookie(token), 'a-different-secret-'.repeat(3), now), false);
});

test('session expiry is enforced at the exact twelve-hour boundary', async () => {
  const token = await createSession(secret, now);
  assert.equal(await hasSession(withCookie(token), secret, now + lifetime - 1000), true);
  assert.equal(await hasSession(withCookie(token), secret, now + lifetime), false);
  assert.equal(await hasSession(withCookie(token), secret, now + lifetime + 86400000), false);
});

test('missing, malformed, oversized, and cookie-name lookalike tokens fail closed', async () => {
  assert.equal(await hasSession(new Request('https://personal.example/admin'), secret, now), false);
  for (const token of ['', 'not-signed', '.', 'a.b.c', '!!.!!', 'a'.repeat(513) + '.a', 'e30.AA']) {
    assert.equal(await hasSession(withCookie(token), secret, now), false, token.slice(0, 40));
  }
  const token = await createSession(secret, now);
  const lookalike = new Request('https://personal.example/admin', { headers: { Cookie: `${COOKIE_NAME}-fake=${token}` } });
  assert.equal(await hasSession(lookalike, secret, now), false);
  assert.equal(await hasSession(withCookie(token), undefined, now), false);
  await assert.rejects(createSession('too-short', now));
});

test('session cookie uses host-only security attributes and logout expires the same cookie', () => {
  const cookie = sessionCookie('signed-token');
  assert.ok(cookie.startsWith('__Host-nguyen-admin=signed-token;'));
  for (const part of ['Path=/', 'Max-Age=43200', 'Secure', 'HttpOnly', 'SameSite=Lax']) assert.ok(cookie.split('; ').includes(part), part);
  assert.doesNotMatch(cookie, /(?:^|;\s*)Domain=/i);
  const logout = sessionCookie();
  assert.ok(logout.startsWith(`${COOKIE_NAME}=;`));
  assert.match(logout, /(?:^|;\s*)Max-Age=0(?:;|$)/);
  assert.match(logout, /; Secure; HttpOnly; SameSite=Lax$/);
});

test('password comparison requires an exact string and valid configured password', async () => {
  assert.equal(await passwordMatches(password, password), true);
  assert.equal(await passwordMatches(password + ' ', password), false);
  assert.equal(await passwordMatches(password.toUpperCase(), password), false);
  assert.equal(await passwordMatches('wrong-but-long-enough-'.repeat(3), password), false);
  for (const candidate of [undefined, null, 123, {}, '', 'x'.repeat(257)]) {
    assert.equal(await passwordMatches(candidate, password), false, typeof candidate);
  }
  for (const expected of [undefined, null, '', 'short']) assert.equal(await passwordMatches('short', expected), false);
});

test('trusted CF IP is normalized for IPv4, IPv6, and mapped IPv6', () => {
  const examples = [
    ['192.0.2.1', '192.0.2.1'],
    ['192.000.002.001', '192.0.2.1'],
    ['0.0.0.0', '0.0.0.0'],
    ['255.255.255.255', '255.255.255.255'],
    ['2001:0DB8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
    ['2001:db8::1', '2001:db8::1'],
    ['::1', '::1'],
    ['::FFFF:192.0.2.1', '::ffff:c000:201']
  ];
  for (const [value, normalized] of examples) {
    const request = new Request('https://personal.example/', { headers: { 'CF-Connecting-IP': value } });
    assert.equal(visitorIP(request), normalized, value);
  }
});

test('missing or invalid CF IP never falls back to user-supplied forwarding headers', () => {
  const invalid = [null, '', 'unknown', '192.0.2', '192.0.2.256', '192.0.2.-1', '192.0.2.1:443', '192.0.2.1, 198.51.100.2', '0xC0000201', '3221225985', '[::1]', '2001:db8:::1', 'fe80::1%eth0'];
  for (const value of invalid) {
    const headers = { 'X-Forwarded-For': '198.51.100.42', 'X-Real-IP': '198.51.100.43', Forwarded: 'for=198.51.100.44' };
    if (value !== null) headers['CF-Connecting-IP'] = value;
    assert.equal(visitorIP(new Request('https://personal.example/', { headers })), null, String(value));
  }
  const trusted = new Request('https://personal.example/', { headers: {
    'CF-Connecting-IP': '192.0.2.1', 'X-Forwarded-For': '198.51.100.42', 'X-Real-IP': '198.51.100.43'
  } });
  assert.equal(visitorIP(trusted), '192.0.2.1');
});
