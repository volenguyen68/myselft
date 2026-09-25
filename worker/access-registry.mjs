const CAPACITY = 500;
const RETENTION_MS = 7 * 86400000;
const IP_KEY = /^[a-f0-9]{64}$/i;
const VISIT_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const json = (value, status = 200, headers = {}) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', ...headers }
});

function validIp(ip) {
  if (typeof ip !== 'string' || !ip || ip.length > 45) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split('.').every(part => Number(part) <= 255 && (part === '0' || part[0] !== '0'));
  }
  if (!ip.includes(':') || !/^[a-f0-9:.]+$/i.test(ip)) return false;
  try { return new URL(`http://[${ip}]/`).hostname.startsWith('['); } catch { return false; }
}

async function readInput(request, fields) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw 415;
  if (!request.body) throw 400;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(512);
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (size + value.byteLength > bytes.length) { await reader.cancel(); throw 413; }
    bytes.set(value, size);
    size += value.byteLength;
  }
  let input;
  try { input = JSON.parse(new TextDecoder().decode(bytes.subarray(0, size))); } catch { throw 400; }
  if (!input || Array.isArray(input) || typeof input !== 'object'
    || Object.keys(input).sort().join(',') !== [...fields].sort().join(',')) throw 400;
  if (fields.includes('ipKey')) {
    if (typeof input.ipKey !== 'string' || !IP_KEY.test(input.ipKey)) throw 400;
    input.ipKey = input.ipKey.toLowerCase();
  }
  if (fields.includes('id')) {
    if (typeof input.id !== 'string' || !VISIT_ID.test(input.id)) throw 400;
    input.id = input.id.toLowerCase();
  }
  if (fields.includes('ip') && !validIp(input.ip)) throw 400;
  if (fields.includes('deviceLabel') && (typeof input.deviceLabel !== 'string'
    || !input.deviceLabel.trim() || input.deviceLabel.length > 80
    || /[\u0000-\u001f\u007f-\u009f]/.test(input.deviceLabel))) throw 400;
  return input;
}

const expired = (visitor, now) => !visitor.blocked && visitor.expiresAt <= now;
const publicVisitor = visitor => ({
  id: visitor.id, ip: visitor.ip, deviceLabel: visitor.deviceLabel,
  firstSeen: visitor.firstSeen, lastSeen: visitor.lastSeen,
  blocked: visitor.blocked, blockedAt: visitor.blockedAt ?? null
});
async function removeVisitor(storage, visitor) {
  await storage.delete([`v:${visitor.id}`, `ip:${visitor.ipKey}`]);
}
async function cleanup(storage, now) {
  const records = await storage.list({ prefix: 'v:' });
  for (const [key, visitor] of records) {
    if (!expired(visitor, now)) continue;
    await removeVisitor(storage, visitor);
    records.delete(key);
  }
  return records;
}
async function scheduleCleanup(storage, records, now) {
  let next = Infinity;
  for (const visitor of records.values()) {
    if (!visitor.blocked) next = Math.min(next, visitor.expiresAt);
  }
  if (Number.isFinite(next)) await storage.setAlarm(Math.max(now + 1, next));
  else await storage.deleteAlarm();
}

// Only the outer Worker may call this binding; authentication and trusted IP hashing happen there.
export class AccessRegistry {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.chain = Promise.resolve(); }
  serial(task) {
    const next = this.chain.then(task);
    this.chain = next.catch(() => {});
    return next;
  }
  fetch(request) {
    return this.serial(async () => {
      const path = new URL(request.url).pathname;
      const routes = { '/check': ['ipKey'], '/visit': ['ipKey', 'ip', 'deviceLabel'], '/block': ['id'], '/unblock': ['id'] };
      const isList = path === '/list';
      if (!isList && !Object.hasOwn(routes, path)) return json({ ok: false }, 404);
      const method = isList ? 'GET' : 'POST';
      if (request.method !== method) return json({ ok: false }, 405, { Allow: method });
      let input;
      if (!isList) {
        try { input = await readInput(request, routes[path]); }
        catch (status) { if (typeof status === 'number') return json({ ok: false }, status); throw status; }
      }
      return this.ctx.storage.transaction(async storage => {
        const now = Date.now();
        if (path === '/check') {
          const id = await storage.get(`ip:${input.ipKey}`);
          const visitor = id ? await storage.get(`v:${id}`) : undefined;
          if (!visitor) return json({ blocked: false });
          if (expired(visitor, now)) { await removeVisitor(storage, visitor); return json({ blocked: false }); }
          return json({ blocked: visitor.blocked });
        }
        if (path === '/block' || path === '/unblock') {
          const visitor = await storage.get(`v:${input.id}`);
          if (!visitor) return json({ ok: false }, 404);
          if (expired(visitor, now)) { await removeVisitor(storage, visitor); return json({ ok: false }, 404); }
          const shouldBlock = path === '/block';
          if (visitor.blocked !== shouldBlock) {
            visitor.blocked = shouldBlock;
            visitor.blockedAt = shouldBlock ? now : null;
            visitor.expiresAt = shouldBlock ? null : now + RETENTION_MS;
            await storage.put(`v:${visitor.id}`, visitor);
            if (!shouldBlock) {
              const alarm = await storage.getAlarm();
              if (alarm === null || alarm > visitor.expiresAt) await storage.setAlarm(visitor.expiresAt);
            }
          }
          return json({ ok: true, visitor: publicVisitor(visitor) });
        }
        const records = await cleanup(storage, now);
        if (isList) {
          await scheduleCleanup(storage, records, now);
          const visitors = [...records.values()].sort((a, b) => b.lastSeen - a.lastSeen || a.id.localeCompare(b.id));
          return json({ visitors: visitors.map(publicVisitor), capacity: CAPACITY });
        }
        const previousId = await storage.get(`ip:${input.ipKey}`);
        let visitor = previousId ? records.get(`v:${previousId}`) : undefined;
        // A trusted IP key must never be retargeted to a different address through a later request.
        if (visitor && visitor.ip !== input.ip) return json({ ok: false }, 400);
        if (!visitor) {
          if (records.size >= CAPACITY) {
            const oldest = [...records.values()].filter(record => !record.blocked)
              .sort((a, b) => a.lastSeen - b.lastSeen || a.firstSeen - b.firstSeen || a.id.localeCompare(b.id))[0];
            if (!oldest) return json({ ok: false, error: 'capacity' }, 503);
            await removeVisitor(storage, oldest);
            records.delete(`v:${oldest.id}`);
          }
          visitor = {
            id: crypto.randomUUID(), ipKey: input.ipKey, ip: input.ip, deviceLabel: input.deviceLabel,
            firstSeen: now, lastSeen: now, blocked: false, blockedAt: null, expiresAt: now + RETENTION_MS
          };
        } else {
          visitor.lastSeen = now;
          visitor.deviceLabel = input.deviceLabel;
          if (!visitor.blocked) visitor.expiresAt = now + RETENTION_MS;
        }
        await storage.put(`v:${visitor.id}`, visitor);
        await storage.put(`ip:${input.ipKey}`, visitor.id);
        records.set(`v:${visitor.id}`, visitor);
        await scheduleCleanup(storage, records, now);
        return json({ id: visitor.id, blocked: visitor.blocked });
      });
    });
  }
  alarm() {
    return this.serial(() => this.ctx.storage.transaction(async storage => {
      const now = Date.now();
      const records = await cleanup(storage, now);
      await scheduleCleanup(storage, records, now);
    }));
  }
}
