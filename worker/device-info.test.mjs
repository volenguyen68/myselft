import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDevice, deviceDetails } from './device-info.mjs';

const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0 Mobile/15E148 Safari/604.1';
const android = 'Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36';
const androidBuild = 'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014) AppleWebKit/537.36 Mobile Safari/537.36';
const unknownIPhone = { code: 'iphone', label: 'iPhone (chưa xác định đời máy)' };

test('explicit hardware identifiers map to verified iPhone models', () => {
  const examples = [
    ['iPhone16,2', 'iPhone 15 Pro Max'],
    [`${safari} [FBAN/FBIOS;FBDV/iPhone16,2;FBSN/iOS]`, 'iPhone 15 Pro Max'],
    ['iPhone10,1', 'iPhone 8'], ['iPhone10,4', 'iPhone 8'],
    ['iPhone10,2', 'iPhone 8 Plus'], ['iPhone10,6', 'iPhone X'],
    ['iPhone11,6', 'iPhone XS Max'], ['iPhone11,8', 'iPhone XR'],
    ['iPhone12,5', 'iPhone 11 Pro Max'], ['iPhone13,1', 'iPhone 12 mini'],
    ['iPhone14,5', 'iPhone 13'], ['iPhone15,3', 'iPhone 14 Pro Max'],
    ['iPhone15,5', 'iPhone 15 Plus'], ['iPhone17,1', 'iPhone 16 Pro'],
    ['iPhone17,2', 'iPhone 16 Pro Max'], ['iPhone17,3', 'iPhone 16'],
    ['iPhone17,4', 'iPhone 16 Plus'], ['iPhone17,5', 'iPhone 16e'],
    ['iPhone8,4', 'iPhone SE (thế hệ 1)'],
    ['iPhone12,8', 'iPhone SE (thế hệ 2)'], ['iPhone14,6', 'iPhone SE (thế hệ 3)'],
    ['iphone16,2', 'iPhone 15 Pro Max']
  ];
  for (const [ua, label] of examples) assert.deepEqual(deviceDetails(ua), { code: 'iphone', label }, ua);
});

test('OS versions, build tokens, malformed and conflicting IDs never guess an iPhone model', () => {
  for (const ua of [
    safari, 'iPhone; CPU iPhone OS 15_0; Mobile/15E148',
    `${safari} FBDV/iPhone99,99`, 'iPhone99,99',
    `${safari} FBDV/iPhone16,2evil`, `${safari} FBDV/iPhone16,2.1`,
    `${safari} FBDV/xiPhone16,2`, `${safari} FBDV/iPhone16,2-iPhone`,
    `${safari} FBDV/iPhone16,2; FBDV/iPhone10,1`,
    `${safari} FBDV/iPhone16,2; FBDV/iPhone99,99`
  ]) assert.deepEqual(deviceDetails(ua, 'iPhone 15 Pro Max'), unknownIPhone, ua);
  assert.equal(deviceDetails(`${safari} FBDV/iPhone16,2; FBDV/iPhone16,2`).label, 'iPhone 15 Pro Max');
});

test('Android accepts bounded quoted or unquoted model hints with precedence over UA model', () => {
  for (const [hint, label] of [
    ['"Pixel 9 Pro"', 'Android · Pixel 9 Pro'],
    ['Pixel 8', 'Android · Pixel 8'], ['"SM-S928B"', 'Android · SM-S928B'],
    ['  "Pixel  9 Pro"  ', 'Android · Pixel 9 Pro']
  ]) assert.deepEqual(deviceDetails(androidBuild, hint), { code: 'android_phone', label });
  assert.deepEqual(deviceDetails(android.replace('Mobile ', ''), '"SM-X810"'), { code: 'android_tablet', label: 'Android · SM-X810' });
});

test('Android UA parsing requires the standard Build segment and skips locale and webview tokens', () => {
  assert.equal(deviceDetails(androidBuild).label, 'Android · SM-S918B');
  const localeUA = 'Mozilla/5.0 (Linux; U; Android 14; en-US; Pixel 8 Build/AP1A.240305.019; wv) AppleWebKit/537.36 Mobile Safari/537.36';
  assert.equal(deviceDetails(localeUA).label, 'Android · Pixel 8');
  assert.equal(deviceDetails(androidBuild, '"K"').label, 'Android · SM-S918B');
  assert.equal(deviceDetails(androidBuild, '<script>').label, 'Android · SM-S918B');
  for (const ua of [android, androidBuild.replace(' Build/TP1A.220624.014', ''), androidBuild.replace('Linux;', 'Other;'), androidBuild.replace('SM-S918B', '<img src=x>')]) {
    assert.deepEqual(deviceDetails(ua), { code: 'android_phone', label: 'Điện thoại Android' }, ua);
  }
});

test('generic, oversized, control-bearing or injection-like model hints fail safely', () => {
  for (const hint of [
    '', 'K', '"K"', 'unknown', 'Android', 'Android Phone', 'Generic', 'Google', 'Pixel',
    '"Pixel 9', 'Pixel 9"', '"Pixel \\"9"', 'Pixel\n9', 'Pixel\t9', 'Pixel\x009',
    '<script>alert(1)</script>', 'SM-S918B; injected', 'https://example.test',
    'Pixel 9 / Other', 'Pixel_9', 'Pixel.9', 'Pixel (9)', 'Pixel 9😀',
    'A'.repeat(65), ' '.repeat(81), '"' + 'A'.repeat(10000) + '"', null, {}, 9
  ]) {
    assert.deepEqual(deviceDetails(android, hint), { code: 'android_phone', label: 'Điện thoại Android' }, String(hint));
  }
  assert.equal(deviceDetails(android, 'A'.repeat(64)).label.length, 74);
});

test('category precedence and non-Android labels remain independent of model hints', () => {
  const examples = [
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'windows', 'Máy tính Windows (Laptop/PC)'],
    ['Windows Phone 10.0; Android 6.0.1; iPhone', 'mobile', 'Thiết bị di động'],
    ['Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)', 'ipad_ipod', 'iPad / iPod'],
    ['iPad; CPU OS 17_0 like Mac OS X', 'ipad_ipod', 'iPad / iPod'],
    ['Macintosh; Intel Mac OS X 10_15_7', 'mac', 'Máy tính Mac'],
    ['X11; CrOS Linux x86_64', 'chromebook', 'Chromebook'],
    ['X11; Linux x86_64', 'linux', 'Máy tính Linux'],
    ['Linux; Mobile', 'mobile', 'Thiết bị di động'],
    ['', 'unknown', 'Không xác định'], [null, 'unknown', 'Không xác định']
  ];
  for (const [ua, code, label] of examples) {
    assert.equal(classifyDevice(ua), code);
    assert.deepEqual(deviceDetails(ua, '"Pixel 9 Pro"'), { code, label });
  }
  assert.deepEqual(deviceDetails(safari, '"Pixel 9 Pro"'), unknownIPhone);
});

test('input work is bounded and returned details never contain the raw UA or hint fields', () => {
  assert.equal(classifyDevice(`${'x'.repeat(1024)} iPhone`), 'unknown');
  assert.deepEqual(deviceDetails(`${safari}${'x'.repeat(1024)} FBDV/iPhone16,2`), unknownIPhone);
  assert.deepEqual(Object.keys(deviceDetails(androidBuild, 'Pixel 9 Pro')).sort(), ['code', 'label']);
});
