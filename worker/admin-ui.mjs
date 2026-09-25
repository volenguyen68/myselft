const escapeAttribute = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const styles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-synthesis:none;background:#050c14;color:#edf5fc}
*{box-sizing:border-box}
body{margin:0;min-width:320px;background:radial-gradient(ellipse at 100% 0,rgba(22,93,133,.17),transparent 45%),#050c14}
button,input{font:inherit}
button,a,input{-webkit-tap-highlight-color:transparent}
button{cursor:pointer}
button:disabled{cursor:wait;opacity:.55}
button:focus-visible,a:focus-visible{outline:2px solid #9bdce9;outline-offset:5px}
button,input{transition:background .18s,border-color .18s,opacity .18s}
::selection{background:#a7dfed;color:#081925}
.shell{width:min(1100px,100%);margin:auto;padding:0 42px 40px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:92px;border-bottom:1px solid #a7d6eb1c}
.brand{display:flex;align-items:center;gap:12px;color:#abc5d8;font-size:11px;letter-spacing:.11em;text-transform:uppercase}
.brand-mark{display:grid;place-items:center;width:35px;height:35px;border:1px solid #96cbe72a;border-radius:11px;color:#c8eaf7}
.brand svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.logout{margin:0}
.quiet-button{padding:10px 0 10px 16px;border:0;background:none;color:#a3b9ca;font-size:12px}
.quiet-button:hover{color:#edf7ff}
.heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:48px 0 30px}
.eyebrow{margin:0 0 13px;color:#82bed7;font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase}
h1{margin:0;font-size:clamp(30px,4.3vw,44px);font-weight:600;line-height:1.13;letter-spacing:-.055em}
.lead{margin:13px 0 0;color:#91a7b9;font-size:13px;line-height:1.8}
.refresh{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border:1px solid #b0d8ef25;border-radius:10px;background:#10213166;color:#c7deed;font-size:12px}
.refresh:hover{background:#142d40}
.refresh svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:31px}
.stat{padding:21px 24px;border:1px solid #a2cee61a;border-radius:16px;background:linear-gradient(130deg,#10243877,#0a162233)}
.stat dt{margin-bottom:12px;color:#8daabe;font-size:11px}
.stat dd{margin:0;color:#edf7fd;font-size:32px;font-weight:500;line-height:1;letter-spacing:-.045em}
.stat:nth-child(2) dd{color:#a8dae9}
.notice{margin:0 0 21px;padding:13px 17px;border:1px solid #e9caa334;border-radius:11px;background:#41312433;color:#ead9c1;font-size:12px;line-height:1.7}
.notice[hidden]{display:none}
.selected{margin:0 0 30px;padding:20px;border:1px solid #90d8ed45;border-radius:18px;background:radial-gradient(ellipse at 100% 0,#24779822,transparent 70%),#0c1b27}
.selected[hidden]{display:none}
.selected-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}
.selected-heading h2{margin:0;color:#bceafa;font-size:13px;font-weight:500}
.selected-tag{font-size:9px;color:#76b5d2;letter-spacing:.08em;text-transform:uppercase}
.selected-note{margin:12px 0 0;color:#8aabba;font-size:11px;line-height:1.7}
.selected .visitor{padding:13px 0;border-top:1px solid #a4d8ee18}
.selected .visitor:last-child{padding-bottom:0}
.missing{margin:0;color:#a9c0d0;font-size:13px;line-height:1.7}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 0 29px}
.search-wrap{position:relative;display:flex;align-items:center;width:min(380px,100%)}
.search-wrap svg{position:absolute;left:15px;width:16px;height:16px;fill:none;stroke:#7f9db2;stroke-width:1.7;pointer-events:none}
.search{width:100%;height:45px;padding:0 15px 0 42px;border:1px solid #a3cde626;border-radius:11px;outline:none;background:#0b1824;color:#e4f2fb;font-size:12px}
.search::placeholder{color:#66869d}
.search:focus{border-color:#81c9e18c;box-shadow:0 0 0 3px #70bedb0d}
.capacity{color:#6f8b9e;font-size:11px;line-height:1.6;text-align:right}
.list-section{margin-bottom:33px}
.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
.section-heading h2{margin:0;font-size:15px;font-weight:500;letter-spacing:-.01em}
.count{display:inline-grid;min-width:24px;height:22px;place-items:center;margin-left:8px;padding:0 7px;border-radius:7px;background:#153045;color:#9dc1d7;font-size:10px;font-weight:400;vertical-align:1px}
.section-caption{color:#6f8c9f;font-size:10px}
.visitor-list{overflow:hidden;border:1px solid #a4cee51c;border-radius:16px;background:#0b172144}
.visitor{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:center;padding:21px 23px;border-top:1px solid #a4d8ee12}
.visitor:first-child{border-top:0}
.visitor-main{min-width:0}
.visitor-top{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-bottom:8px}
.ip{margin:0;color:#e2f1fc;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14px;font-weight:500;line-height:1.5;overflow-wrap:anywhere}
.badge{padding:3px 7px;border-radius:5px;background:#13313e;color:#91c9d7;font-size:9px;white-space:nowrap}
.device{margin:0;color:#abc0ce;font-size:12px;line-height:1.65;overflow-wrap:anywhere}
.times{display:flex;flex-wrap:wrap;gap:5px 20px;margin-top:8px;color:#6e8c9f;font-size:10px;line-height:1.7}
.times time{color:#8ba9bc}
.row-action{min-width:101px;min-height:37px;padding:9px 14px;border:1px solid #97cade38;border-radius:9px;background:#122a3a;color:#c3e4f2;font-size:11px;white-space:nowrap}
.row-action:hover{background:#1b3b50;border-color:#a2ddef66}
.row-action.unblock{border-color:#8bb3c522;background:#0c1a2577;color:#91b1c7}
.row-action.unblock:hover{background:#162c3b;color:#d0e8f5}
.empty{margin:0;padding:28px 23px;color:#708da1;font-size:12px;line-height:1.8}
.privacy-note{padding-top:24px;border-top:1px solid #a4cee51c;color:#708b9e;font-size:11px;line-height:1.85}
.privacy-note p{margin:0}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.login-body{display:grid;place-items:center;min-height:100svh;padding:28px}
.login-shell{width:min(400px,100%)}
.login-brand{margin-bottom:38px}
.login-shell h1{font-size:36px}
.login-shell .lead{margin-top:12px}
.login-form{margin-top:29px}
.password-label{display:block;margin-bottom:10px;color:#afc6d7;font-size:12px}
.password{display:block;width:100%;height:50px;padding:0 15px;border:1px solid #8abedb3a;border-radius:10px;background:#0d1d2a;color:#edf7fe;outline:none}
.password:focus{border-color:#9cdae9;box-shadow:0 0 0 3px #87d5e60c}
.login-submit{width:100%;height:49px;margin-top:17px;border:0;border-radius:10px;background:#d5edf8;color:#112432;font-size:13px;font-weight:600}
.login-submit:hover{background:#eefaff}
.login-error{margin:19px 0 0;padding:12px 14px;border-radius:9px;background:#4c382a44;color:#e6cfb8;font-size:12px;line-height:1.7}
.login-footer{margin:24px 0 0;color:#668499;font-size:11px;line-height:1.8}
@media(max-width:700px){.shell{padding:0 22px 28px}.topbar{min-height:77px}.brand{font-size:9px;letter-spacing:.07em;gap:9px}.brand-mark{width:31px;height:31px}.quiet-button{font-size:11px}.heading{align-items:flex-start;padding:35px 0 26px;gap:17px}.heading h1{font-size:31px}.lead{font-size:12px}.refresh{padding:9px 11px;margin-top:4px;font-size:11px}.summary{gap:8px;margin-bottom:26px}.stat{padding:17px 13px;border-radius:12px}.stat dt{font-size:10px;line-height:1.5;margin-bottom:11px}.stat dd{font-size:27px}.toolbar{align-items:flex-start;flex-direction:column;gap:10px;margin-bottom:24px}.search-wrap{width:100%}.capacity{text-align:left;font-size:10px}.selected{padding:16px;border-radius:14px}.selected-tag{font-size:8px}.selected-heading h2{font-size:12px}.visitor{padding:18px 16px;gap:13px}.ip{font-size:12px}.device{font-size:11px}.times{display:block;font-size:9px}.times>span{display:block;margin-top:3px}.row-action{min-width:88px;min-height:37px;padding:8px 11px;font-size:10px}.section-heading h2{font-size:14px}.section-caption{font-size:9px}.visitor-list{border-radius:13px}.empty{padding:23px 16px;font-size:11px}}
@media(max-width:390px){.shell{padding-right:17px;padding-left:17px}.heading{flex-wrap:wrap}.refresh{margin-top:0}.visitor{grid-template-columns:1fr;gap:14px}.row-action{justify-self:start;min-height:38px}.selected-heading{align-items:flex-start;flex-direction:column;gap:6px}.stat{padding:15px 10px}.stat dt{font-size:9px}.stat dd{font-size:25px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';

const adminScript = String.raw`
(() => {
  'use strict';
  const selectedId = new URLSearchParams(location.search).get('visit') || '';
  const $ = (id) => document.getElementById(id);
  const pending = new Set();
  const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  let visitors = [];
  let capacity = 500;
  let loading = false;
  let initialized = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function login() {
    location.assign('/admin/login' + (selectedId ? '?visit=' + encodeURIComponent(selectedId) : ''));
  }

  function showMessage(message) {
    $('notice').textContent = message;
    $('notice').hidden = !message;
  }

  function dateValue(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function appendTime(container, label, value) {
    const item = element('span', '', label + ' ');
    const date = dateValue(value);
    const time = element('time', '', date ? dateFormat.format(date) : '—');
    if (date) time.dateTime = date.toISOString();
    item.append(time);
    container.append(item);
  }

  function card(visitor) {
    const row = element('article', 'visitor');
    const main = element('div', 'visitor-main');
    const top = element('div', 'visitor-top');
    top.append(element('h3', 'ip', visitor.ip || 'IP chưa xác định'));
    if (visitor.blocked) top.append(element('span', 'badge', 'Đang chặn'));
    main.append(top, element('p', 'device', visitor.deviceLabel || 'Chưa có thông tin trình duyệt'));
    const times = element('div', 'times');
    appendTime(times, 'Lần đầu', visitor.firstSeen);
    appendTime(times, 'Gần nhất', visitor.lastSeen);
    if (visitor.blocked && visitor.blockedAt) appendTime(times, 'Đã chặn lúc', visitor.blockedAt);
    main.append(times);
    const button = element('button', 'row-action' + (visitor.blocked ? ' unblock' : ''), pending.has(visitor.id) ? 'Đang lưu…' : visitor.blocked ? 'Bỏ chặn' : 'Chặn IP');
    button.type = 'button';
    button.disabled = pending.size > 0 || loading;
    button.setAttribute('aria-label', (visitor.blocked ? 'Bỏ chặn IP ' : 'Chặn IP ') + (visitor.ip || 'đã chọn'));
    button.addEventListener('click', () => update(visitor));
    row.append(main, button);
    return row;
  }

  function renderList(id, items, emptyText) {
    const list = $(id);
    list.replaceChildren();
    if (!items.length) list.append(element('p', 'empty', emptyText));
    else list.append(...items.map(card));
  }

  function render() {
    const blocked = visitors.filter((visitor) => visitor.blocked);
    const recent = visitors.filter((visitor) => !visitor.blocked);
    $('total-count').textContent = String(visitors.length);
    $('blocked-count').textContent = String(blocked.length);
    $('recent-count').textContent = String(recent.length);
    $('capacity').textContent = 'Lưu tối đa ' + capacity + ' IP gần đây';

    $('selected').hidden = !selectedId;
    if (selectedId) {
      const selected = visitors.find((visitor) => visitor.id === selectedId);
      $('selected-visitor').replaceChildren(selected ? card(selected) : element('p', 'missing', 'Không tìm thấy lượt mở này trong danh sách hiện tại.'));
    }

    const query = $('search').value.trim().toLowerCase();
    const matches = (visitor) => visitor.id !== selectedId && String(visitor.ip || '').toLowerCase().includes(query);
    const byLastSeen = (a, b) => (dateValue(b.lastSeen)?.getTime() || 0) - (dateValue(a.lastSeen)?.getTime() || 0);
    const blockedMatches = blocked.filter(matches).sort(byLastSeen);
    const recentMatches = recent.filter(matches).sort(byLastSeen);
    $('blocked-list-count').textContent = String(blockedMatches.length);
    $('recent-list-count').textContent = String(recentMatches.length);
    const noResults = 'Không có IP khớp với tìm kiếm.';
    renderList('blocked-list', blockedMatches, query ? noResults : blocked.length ? 'IP đang được chọn đã hiển thị ở phía trên.' : 'Chưa có IP nào bị chặn.');
    renderList('recent-list', recentMatches, query ? noResults : recent.length ? 'IP đang được chọn đã hiển thị ở phía trên.' : 'Chưa có IP truy cập nào trong danh sách.');
  }

  async function load() {
    if (loading) return false;
    loading = true;
    $('refresh').disabled = true;
    $('lists').setAttribute('aria-busy', 'true');
    if (initialized) render();
    try {
      const response = await fetch('/admin/api/visitors', { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401) { login(); return false; }
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      if (!data || !Array.isArray(data.visitors)) throw new Error('format');
      visitors = data.visitors.filter((item) => item && typeof item.id === 'string' && typeof item.ip === 'string').map((item) => ({ ...item, blocked: item.blocked === true }));
      capacity = Number.isSafeInteger(data.capacity) && data.capacity > 0 ? data.capacity : 500;
      initialized = true;
      render();
      return true;
    } catch {
      showMessage('Chưa tải được danh sách. Vui lòng thử Làm mới.');
      if (!initialized) {
        renderList('blocked-list', [], 'Danh sách hiện chưa tải được.');
        renderList('recent-list', [], 'Danh sách hiện chưa tải được.');
      }
      return false;
    } finally {
      loading = false;
      $('refresh').disabled = pending.size > 0;
      $('lists').setAttribute('aria-busy', 'false');
      if (initialized) render();
    }
  }

  async function update(visitor) {
    if (pending.size || loading) return;
    pending.add(visitor.id);
    $('refresh').disabled = true;
    showMessage('');
    render();
    try {
      const response = await fetch(visitor.blocked ? '/admin/api/unblock' : '/admin/api/block', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: visitor.id })
      });
      if (response.status === 401) { login(); return; }
      if (!response.ok) {
        if (response.status === 429) showMessage('Bạn thao tác hơi nhanh. Vui lòng chờ một chút rồi thử lại.');
        else if (response.status === 404) showMessage('IP này không còn trong danh sách. Vui lòng Làm mới.');
        else showMessage('Chưa cập nhật được trạng thái. Vui lòng thử lại.');
        return;
      }
      await load();
    } catch {
      showMessage('Kết nối bị gián đoạn. Vui lòng thử lại.');
    } finally {
      pending.delete(visitor.id);
      $('refresh').disabled = loading;
      render();
    }
  }

  $('search').addEventListener('input', () => { if (initialized) render(); });
  $('refresh').addEventListener('click', () => { showMessage(''); void load(); });
  void load();
})();
`;

function documentShell(title, body, extra = '') {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#050c14"><title>${title}</title><style>${styles}</style></head>${body}${extra}</html>`;
}

export function adminPage(nonce) {
  return documentShell('Quản lý truy cập · Nguyên', `<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">${lockIcon}</span><span>Không gian riêng của Nguyên</span></div>
      <form class="logout" method="post" action="/admin/logout"><button class="quiet-button" type="submit">Đăng xuất</button></form>
    </header>
    <main>
      <div class="heading">
        <div><p class="eyebrow">Quản trị cá nhân</p><h1>Quản lý truy cập.</h1><p class="lead">Xem IP gần đây và chủ động quản lý quyền truy cập.</p></div>
        <button class="refresh" id="refresh" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/></svg>Làm mới</button>
      </div>
      <dl class="summary"><div class="stat"><dt>IP đã ghi nhận</dt><dd id="total-count">—</dd></div><div class="stat"><dt>Đang chặn</dt><dd id="blocked-count">—</dd></div><div class="stat"><dt>Không bị chặn</dt><dd id="recent-count">—</dd></div></dl>
      <p class="notice" id="notice" role="status" aria-live="polite" hidden></p>
      <section class="selected" id="selected" aria-labelledby="selected-title" hidden>
        <div class="selected-heading"><h2 id="selected-title">Lượt mở được chọn</h2><span class="selected-tag">Từ liên kết thông báo</span></div>
        <div id="selected-visitor"></div>
        <p class="selected-note">Mở liên kết chỉ hiển thị thông tin. IP chỉ bị chặn khi bạn chọn “Chặn IP”.</p>
      </section>
      <div class="toolbar"><div class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><label class="sr-only" for="search">Tìm địa chỉ IP</label><input class="search" id="search" type="search" placeholder="Tìm địa chỉ IP…" autocomplete="off" spellcheck="false"></div><span class="capacity" id="capacity">Lưu tối đa 500 IP gần đây</span></div>
      <div id="lists" aria-busy="true">
        <section class="list-section" aria-labelledby="blocked-title"><div class="section-heading"><h2 id="blocked-title">Đang chặn <span class="count" id="blocked-list-count">—</span></h2><span class="section-caption">Có thể bỏ chặn bất cứ lúc nào</span></div><div class="visitor-list" id="blocked-list"><p class="empty">Đang tải danh sách…</p></div></section>
        <section class="list-section" aria-labelledby="recent-title"><div class="section-heading"><h2 id="recent-title">Truy cập gần đây <span class="count" id="recent-list-count">—</span></h2><span class="section-caption">IP không bị chặn</span></div><div class="visitor-list" id="recent-list"><p class="empty">Đang tải danh sách…</p></div></section>
      </div>
    </main>
    <footer class="privacy-note"><p>IP có thể dùng chung hoặc thay đổi. Cùng một IP không đồng nghĩa với cùng một thiết bị.</p><p>Thông tin thiết bị chỉ mang tính tham khảo.</p></footer>
    <noscript><p class="notice">Vui lòng bật JavaScript để xem danh sách và quản lý IP.</p></noscript>
  </div>
  <script nonce="${escapeAttribute(nonce)}">${adminScript}</script>
</body>`);
}

export function loginPage(error = '') {
  const message = error === 'invalid'
    ? 'Không thể đăng nhập. Vui lòng kiểm tra mật khẩu và thử lại.'
    : error === 'rate_limited'
      ? 'Bạn đã thử đăng nhập nhiều lần. Vui lòng chờ một chút rồi thử lại.'
      : '';
  return documentShell('Đăng nhập quản trị · Nguyên', `<body class="login-body">
  <main class="login-shell">
    <div class="brand login-brand"><span class="brand-mark">${lockIcon}</span><span>Không gian riêng</span></div>
    <p class="eyebrow">Chào Nguyên</p><h1>Đăng nhập quản trị.</h1>
    <p class="lead">Nhập mật khẩu để quản lý quyền truy cập trang cá nhân.</p>
    ${message ? `<p class="login-error" role="alert">${message}</p>` : ''}
    <form class="login-form" method="post" action="">
      <label class="password-label" for="password">Mật khẩu</label>
      <input class="password" id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button class="login-submit" type="submit">Đăng nhập</button>
    </form>
    <p class="login-footer">Trang này chỉ dành cho chủ trang.</p>
  </main>
</body>`);
}

export function blockedPage() {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#050c14"><title>bạn đã bị block🤔</title><style>*{box-sizing:border-box}html{color-scheme:dark;background:#050c14}body{margin:0;min-width:280px;color:#dcecf7;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}main{display:grid;place-items:center;min-height:100svh;padding:24px;background:radial-gradient(ellipse at 50% 40%,#0b1e2d,#050c14 70%)}h1{margin:0;font-size:clamp(21px,4vw,29px);font-weight:500;line-height:1.5;letter-spacing:-.025em;text-align:center}</style></head><body><main><h1>bạn đã bị block🤔</h1></main></body></html>`;
}
