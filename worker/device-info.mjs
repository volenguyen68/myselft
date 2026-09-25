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

// Hardware identifiers, not iOS versions or Mobile build numbers.
// Verified against the DeviceKit maintainer's generated mapping:
// https://github.com/devicekit/DeviceKit/blob/master/Source/Device.generated.swift
const IPHONE_MODELS = Object.freeze({
  'iphone8,4': 'iPhone SE (thế hệ 1)',
  'iphone10,1': 'iPhone 8', 'iphone10,4': 'iPhone 8',
  'iphone10,2': 'iPhone 8 Plus', 'iphone10,5': 'iPhone 8 Plus',
  'iphone10,3': 'iPhone X', 'iphone10,6': 'iPhone X',
  'iphone11,2': 'iPhone XS',
  'iphone11,4': 'iPhone XS Max', 'iphone11,6': 'iPhone XS Max',
  'iphone11,8': 'iPhone XR',
  'iphone12,1': 'iPhone 11',
  'iphone12,3': 'iPhone 11 Pro', 'iphone12,5': 'iPhone 11 Pro Max',
  'iphone12,8': 'iPhone SE (thế hệ 2)',
  'iphone13,1': 'iPhone 12 mini', 'iphone13,2': 'iPhone 12',
  'iphone13,3': 'iPhone 12 Pro', 'iphone13,4': 'iPhone 12 Pro Max',
  'iphone14,2': 'iPhone 13 Pro', 'iphone14,3': 'iPhone 13 Pro Max',
  'iphone14,4': 'iPhone 13 mini', 'iphone14,5': 'iPhone 13',
  'iphone14,6': 'iPhone SE (thế hệ 3)',
  'iphone14,7': 'iPhone 14', 'iphone14,8': 'iPhone 14 Plus',
  'iphone15,2': 'iPhone 14 Pro', 'iphone15,3': 'iPhone 14 Pro Max',
  'iphone15,4': 'iPhone 15', 'iphone15,5': 'iPhone 15 Plus',
  'iphone16,1': 'iPhone 15 Pro', 'iphone16,2': 'iPhone 15 Pro Max',
  'iphone17,1': 'iPhone 16 Pro', 'iphone17,2': 'iPhone 16 Pro Max',
  'iphone17,3': 'iPhone 16', 'iphone17,4': 'iPhone 16 Plus',
  'iphone17,5': 'iPhone 16e'
});

const boundedUA = value => typeof value === 'string' ? value.slice(0, 1024) : '';
const hardwareIds = ua => [...ua.matchAll(/(?:^|[\s;([/])(iPhone\d{1,2},\d{1,2})(?=$|[\s;\])])/gi)]
  .map(match => match[1].toLowerCase());

export function classifyDevice(userAgent) {
  const ua = boundedUA(userAgent);
  // Windows Phone and iPod may also include Android/iPhone compatibility tokens.
  if (/\bWindows (?:Phone|Mobile)\b/i.test(ua)) return 'mobile';
  if (/\biPad\b|\biPod\b/i.test(ua)) return 'ipad_ipod';
  if (/\biPhone\b/i.test(ua) || hardwareIds(ua).length) return 'iphone';
  if (/\bAndroid\b/i.test(ua)) return /\bMobile\b/i.test(ua) ? 'android_phone' : 'android_tablet';
  if (/\bCrOS\b/i.test(ua)) return 'chromebook';
  if (/\bWindows\b/i.test(ua)) return 'windows';
  if (/\bMacintosh\b|\bMac OS X\b/i.test(ua)) return 'mac';
  if (/\bMobile\b|\bMobi\b|\bTablet\b|\bwebOS\b|\bBlackBerry\b|\bBB10\b|\bOpera Mini\b/i.test(ua)) return 'mobile';
  if (/\bLinux\b/i.test(ua)) return 'linux';
  return 'unknown';
}

function safeAndroidModel(value) {
  if (typeof value !== 'string' || value.length > 80 || /[\x00-\x1f\x7f]/.test(value)) return '';
  let model = value.trim();
  // Sec-CH-UA-Model is normally a quoted structured-header string.
  if (model.startsWith('"') && model.endsWith('"')) model = model.slice(1, -1);
  model = model.replace(/ +/g, ' ');
  // A small alphabet permits Pixel names and Samsung's SM- identifiers, but
  // excludes header syntax, HTML, URLs, escapes, and arbitrary punctuation.
  if (model.length > 64 || !/^[A-Za-z0-9](?:[A-Za-z0-9 -]*[A-Za-z0-9])?$/.test(model)) return '';
  if (/^(?:k|android|linux|mobile|phone|tablet|unknown|generic|device|model|smartphone|android phone|android tablet|google|pixel|samsung|xiaomi|oppo|vivo|oneplus|motorola|huawei|honor|nokia|realme)$/i.test(model)) return '';
  return model;
}

function androidModelFromUA(ua) {
  if (/[\x00-\x1f\x7f]/.test(ua)) return '';
  for (const [, comment] of ua.matchAll(/\(([^()]*)\)/g)) {
    // Require the standard Android comment and its Build/ marker; a loose
    // semicolon split can mistake locale, OS, or unrelated browser tokens.
    const match = /^Linux;\s*(?:U;\s*)?Android\s+\d+(?:\.\d+)*;\s*(?:[a-z]{2}(?:[-_][a-z]{2})?;\s*)?([A-Za-z0-9][A-Za-z0-9 -]{0,63})\s+Build\/[A-Za-z0-9._-]+(?:;\s*wv)?$/i.exec(comment);
    if (match) return safeAndroidModel(match[1].trim());
  }
  return '';
}

// Browser-provided hints are approximate and can be absent or spoofed. This
// pure helper returns a bounded display label; it never retains a raw header.
export function deviceDetails(userAgent, modelHint = '') {
  const ua = boundedUA(userAgent);
  const code = classifyDevice(ua);
  let label = DEVICE_LABELS[code];
  if (code === 'iphone') {
    const ids = [...new Set(hardwareIds(ua))];
    if (ids.length === 1 && Object.hasOwn(IPHONE_MODELS, ids[0])) label = IPHONE_MODELS[ids[0]];
  } else if (code === 'android_phone' || code === 'android_tablet') {
    const model = safeAndroidModel(modelHint) || androidModelFromUA(ua);
    if (model) label = `Android · ${model}`;
  }
  return { code, label };
}
