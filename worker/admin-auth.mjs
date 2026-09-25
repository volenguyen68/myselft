const encoder = new TextEncoder();
export const COOKIE_NAME = '__Host-nguyen-admin';
const SESSION_SECONDS = 43200;
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function key(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Missing authentication configuration');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function ipDigest(ip, secret) {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(`visitor-ip:${ip}`)));
}
export async function passwordMatches(candidate, expected) {
  if (typeof expected !== 'string' || expected.length < 32 || typeof candidate !== 'string' || candidate.length > 256) return false;
  const [a, b] = await Promise.all([candidate, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let mismatch = 0;
  for (let i = 0; i < aa.length; i++) mismatch |= aa[i] ^ bb[i];
  return mismatch === 0;
}
export async function createSession(secret, now = Date.now()) {
  const payload = b64(encoder.encode(JSON.stringify({ aud: 'nguyen-admin', exp: Math.floor(now / 1000) + SESSION_SECONDS, id: crypto.randomUUID() })));
  const signature = b64(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload)));
  return `${payload}.${signature}`;
}
export async function hasSession(request, secret, now = Date.now()) {
  const cookies = (request.headers.get('Cookie') || '').split(';').map(x => x.trim());
  const token = cookies.find(x => x.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token || token.length > 512 || !/^[\w-]+\.[\w-]+$/.test(token)) return false;
  try {
    const [payload, signature] = token.split('.');
    if (!await crypto.subtle.verify('HMAC', await key(secret), unb64(signature), encoder.encode(payload))) return false;
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    const seconds = Math.floor(now / 1000);
    return data.aud === 'nguyen-admin' && Number.isInteger(data.exp) && data.exp > seconds && data.exp <= seconds + SESSION_SECONDS;
  } catch { return false; }
}
export function sessionCookie(token = '') {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${token ? SESSION_SECONDS : 0}; Secure; HttpOnly; SameSite=Lax`;
}
export function visitorIP(request) {
  const value = request.headers.get('CF-Connecting-IP') || '';
  if (value.includes(':') && /^[a-f0-9:.]{2,45}$/i.test(value)) {
    try { return new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase(); } catch { return null; }
  }
  const parts = value.split('.');
  if (parts.length === 4 && parts.every(x => /^\d{1,3}$/.test(x) && +x <= 255)) return parts.map(Number).join('.');
  return null;
}
export async function readLimited(request, limit = 1024) {
  if (!request.body) throw 400;
  const reader = request.body.getReader(), parts = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw 413; }
    parts.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return new TextDecoder().decode(bytes);
}
