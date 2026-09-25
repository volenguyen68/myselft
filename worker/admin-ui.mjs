const escapeAttribute = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const styles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-synthesis:none;background:#06101b;color:#eff7fd}*{box-sizing:border-box}body{margin:0;min-width:320px;background:radial-gradient(ellipse at 92% 0,#14608733,transparent 42%),#06101b}button,input,select{font:inherit;-webkit-tap-highlight-color:transparent}button{cursor:pointer}button:disabled{cursor:wait;opacity:.5}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #8bdef0;outline-offset:4px}button,input,select{transition:background .2s,border-color .2s,opacity .2s}::selection{background:#a7dfed;color:#081925}[hidden]{display:none!important}
.shell{width:min(1250px,100%);margin:auto;padding:0 48px 36px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:102px;border-bottom:1px solid #b5d9ed12}.brand{display:flex;align-items:center;gap:13px;color:#a5c0d3;font-size:11px;letter-spacing:.1em;text-transform:uppercase}.brand-mark{display:grid;place-items:center;flex:0 0 39px;width:39px;height:39px;border:1px solid #a3d9ed26;border-radius:13px;background:linear-gradient(145deg,#173748,#0c1e2b);color:#def3fe;font-size:20px;font-weight:600;letter-spacing:-.08em;text-transform:none}.brand-copy{display:flex;flex-direction:column;gap:5px}.brand-name{color:#e6f3fa;font-size:12px;font-weight:600;letter-spacing:.055em}.brand-subtitle{color:#698ca4;font-size:9px;letter-spacing:.11em}.brand svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.topbar-right{display:flex;align-items:center;gap:26px}.private-label{display:flex;align-items:center;gap:8px;color:#85aabd;font-size:10px}.private-label i{width:5px;height:5px;border-radius:50%;background:#7dd6df;box-shadow:0 0 9px #7dd6df33}.logout{margin:0}.quiet-button{min-height:40px;padding:9px 0 9px 14px;border:0;background:none;color:#9eb7c9;font-size:12px}.quiet-button:hover{color:#effaff}
.heading{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;padding:46px 0 30px}.eyebrow{margin:0 0 13px;color:#87c6dd;font-size:10px;font-weight:500;letter-spacing:.15em;text-transform:uppercase}h1{margin:0;font-size:clamp(31px,4vw,46px);font-weight:600;line-height:1.13;letter-spacing:-.055em}.lead{margin:14px 0 0;color:#86a4b9;font-size:13px;line-height:1.8}.heading-action{display:flex;align-items:flex-end;flex-direction:column;gap:10px}.refresh{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:10px 15px;border:1px solid #b0d8ef24;border-radius:11px;background:#16304466;color:#d0e6f3;font-size:12px;white-space:nowrap}.refresh:hover{border-color:#b0d8ef4d;background:#17364d}.refresh svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.last-update{color:#89a8be;font-size:10px;white-space:nowrap}
.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0}.stat{position:relative;overflow:hidden;padding:23px 24px 20px;border:1px solid #b2d9ec15;border-radius:18px;background:linear-gradient(130deg,#112739b3,#0c1c2b99)}.stat-primary{border-color:#8ad9ec38;background:radial-gradient(ellipse at 100% 0,#24617b55,transparent 72%),linear-gradient(130deg,#123244,#102635)}.stat dt{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#96b5cb;font-size:11px;line-height:1.5}.stat-symbol{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:#a8d5e709;color:#6a9bb6;font-size:14px;line-height:1}.stat-primary .stat-symbol{background:#91d9eb14;color:#b1eaf6}.stat dd{margin:22px 0 11px;color:#eaf6ff;font-size:38px;font-weight:500;line-height:1;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.stat-primary dd{color:#b9eef9}.stat-note{display:block;margin-top:11px;color:#89a8be;font-size:10px;font-weight:400;line-height:1.6;letter-spacing:0}.counting-note{display:flex;align-items:flex-start;gap:9px;margin:15px 2px 30px;color:#6e92aa;font-size:11px;line-height:1.75}.info-dot{display:grid;place-items:center;flex:0 0 14px;width:14px;height:14px;margin-top:2px;border:1px solid #668ca64d;border-radius:50%;font-family:Georgia,serif;font-size:10px;font-style:italic}
.notice{margin:0 0 23px;padding:14px 17px;border:1px solid #e9caa330;border-radius:12px;background:#44352433;color:#e4d2bc;font-size:12px;line-height:1.75}.notice.success{border-color:#8cd9e329;background:#0c323b77;color:#b0dce8}.selected{position:relative;margin:0 0 28px;padding:19px 21px 15px;border:1px solid #7fd5ee40;border-radius:19px;background:radial-gradient(ellipse at 100% 0,#1b59763a,transparent 70%),#0c202e}.selected-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}.selected-heading h2{display:flex;align-items:center;gap:9px;margin:0;color:#b5e9f6;font-size:12px;font-weight:500}.selected-heading h2:before{content:'';width:5px;height:5px;border-radius:50%;background:#9fe5f1}.selected-tag{font-size:9px;color:#6facc8;letter-spacing:.05em}.selected-note{margin:13px 0 0;padding-top:13px;border-top:1px solid #b5dfef12;color:#739db6;font-size:10px;line-height:1.75}.selected .visitor{padding:4px 0;background:none;border:0;border-radius:0}.missing{margin:0;color:#b1c7d6;font-size:13px;line-height:1.8}
.list-section{margin-bottom:31px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 20px}.section-heading h2{margin:0;font-size:19px;font-weight:500;letter-spacing:-.025em}.capacity{color:#65869e;font-size:10px;line-height:1.7;text-align:right}.toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;margin:0 0 16px}.search-wrap{position:relative;display:flex;align-items:center;min-width:0}.search-wrap svg{position:absolute;left:16px;width:16px;height:16px;fill:none;stroke:#7299b2;stroke-width:1.7;pointer-events:none}.search{width:100%;height:47px;padding:0 16px 0 43px;border:1px solid #a3cde622;border-radius:12px;outline:none;background:#0b1d2c;color:#e4f2fb;font-size:12px}.search::placeholder{color:#597e99}.search:focus{border-color:#81c9e16e;background:#0f2637}.sort-wrap{display:flex;align-items:center;gap:9px;padding:0 13px;border:1px solid #a3cde622;border-radius:12px;background:#0b1d2c}.sort-label{color:#658ba4;font-size:10px;white-space:nowrap}.sort{height:45px;max-width:160px;padding:0 6px;border:0;background:#0b1d2c;color:#bdd4e4;font-size:11px;outline:none}.filter-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.filters{display:flex;align-items:center;gap:5px;padding:4px;border:1px solid #9ecfe712;border-radius:12px;background:#0a1926}.filter{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:34px;padding:6px 13px;border:0;border-radius:8px;background:none;color:#7596ae;font-size:11px;white-space:nowrap}.filter:hover{color:#c0ddeb;background:#15304266}.filter[aria-pressed=true]{background:#1c3d50;color:#d8f1fb;box-shadow:0 2px 8px #00000012}.filter-count{font-size:9px;font-variant-numeric:tabular-nums;color:#587e98}.filter[aria-pressed=true] .filter-count{color:#90c8df}.result-count{margin:0;color:#7196ad;font-size:10px;line-height:1.6;text-align:right}
.visitor-list{display:flex;flex-direction:column;gap:11px;min-height:90px}.visitor-list[aria-busy=true]{opacity:.65}.visitor{display:grid;grid-template-columns:minmax(0,1fr) 115px 111px;grid-template-areas:'identity count action' 'times count action';column-gap:25px;row-gap:16px;align-items:center;padding:23px 25px;border:1px solid #a6d3e818;border-radius:16px;background:linear-gradient(110deg,#102335bd,#0c1d2cb3)}.visitor.is-blocked{background:linear-gradient(110deg,#102130ad,#0a1b29b3);border-color:#8aaabe1d}.visitor-identity{grid-area:identity;display:flex;align-items:center;gap:13px;min-width:0}.device-icon{display:grid;place-items:center;flex:0 0 41px;width:41px;height:41px;border:1px solid #8abed912;border-radius:12px;background:#18364b99;color:#83bcd7}.device-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.visitor-main{min-width:0}.visitor-top{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-bottom:5px}.ip{margin:0;color:#dfedf8;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14px;font-weight:500;line-height:1.5;overflow-wrap:anywhere}.badge{padding:2px 6px;border-radius:5px;background:#829fb410;color:#87a8be;font-size:8px;line-height:1.6;white-space:nowrap}.device{margin:0;color:#799db6;font-size:11px;line-height:1.6;overflow-wrap:anywhere}.visit-count{grid-area:count;padding-left:21px;border-left:1px solid #a3d5ec16}.visit-number{display:block;color:#afe1f3;font-size:29px;font-weight:500;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.visit-caption{display:block;margin-top:6px;color:#7aabc4;font-size:10px;line-height:1.5}.counting-since{display:block;margin-top:7px;color:#8ba8bc;font-size:9px;line-height:1.6}.times{grid-area:times;display:flex;flex-wrap:wrap;gap:10px 27px;padding-left:54px}.time-item{display:flex;flex-direction:column;gap:4px;color:#8ba8bc;font-size:9px;line-height:1.5}.time-item time{color:#8eaec4;font-size:10px;font-variant-numeric:tabular-nums}.row-action{grid-area:action;min-height:40px;padding:10px 12px;border:1px solid #8ecce03b;border-radius:10px;background:#173449;color:#bddfeb;font-size:11px;white-space:nowrap}.row-action:hover{background:#21475f;border-color:#a2ddef66}.row-action.unblock{border-color:#84afc729;background:#102637;color:#92b7ce}.row-action.unblock:hover{background:#18384c;color:#d1ecf8}
.empty{display:flex;align-items:center;flex-direction:column;justify-content:center;min-height:195px;padding:32px;border:1px dashed #88bfdb26;border-radius:16px;text-align:center}.empty-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:13px;border-radius:12px;background:#18334888;color:#6595b2;font-size:20px}.empty h3{margin:0;color:#aac8dc;font-size:14px;font-weight:500}.empty p{max-width:360px;margin:9px 0 0;color:#6287a2;font-size:11px;line-height:1.85}.clear-filters{margin-top:17px;padding:9px 13px;border:1px solid #85b9d033;border-radius:9px;background:#143047;color:#a9d1e7;font-size:11px}.skeleton{display:flex;align-items:center;gap:16px;min-height:128px;padding:24px;border:1px solid #a6d3e812;border-radius:16px;background:#0d203033}.skeleton-square{width:41px;height:41px;flex:0 0 41px;border-radius:12px;background:#16334b}.skeleton-lines{flex:1}.skeleton-line{display:block;width:43%;height:9px;border-radius:6px;background:#153049}.skeleton-line+span{width:29%;height:7px;margin-top:12px;background:#11283c}.skeleton-number{width:38px;height:28px;border-radius:7px;background:#17344b}.privacy-note{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;padding-top:24px;border-top:1px solid #a4cee515;color:#87a6bc;font-size:10px;line-height:1.9}.privacy-note p{margin:0;max-width:680px}.footer-brand{color:#759cb5;font-size:11px;white-space:nowrap}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.login-body{display:grid;place-items:center;min-height:100svh;padding:28px}.login-shell{width:min(430px,100%);padding:39px;border:1px solid #98cfe323;border-radius:25px;background:radial-gradient(ellipse at 100% 0,#2054743d,transparent 65%),#0b1d2bcf;box-shadow:0 25px 85px #00000022}.login-brand{margin-bottom:36px}.login-shell h1{font-size:34px}.login-shell .lead{margin-top:14px;font-size:12px}.login-form{margin-top:29px}.password-label{display:block;margin-bottom:10px;color:#afc6d7;font-size:12px}.password{display:block;width:100%;height:50px;padding:0 15px;border:1px solid #8abedb35;border-radius:11px;background:#0c1a28;color:#edf7fe;outline:none}.password:focus{border-color:#9cdae9;box-shadow:0 0 0 3px #87d5e60c}.login-submit{width:100%;height:49px;margin-top:18px;border:0;border-radius:11px;background:#c9eaf6;color:#102a3c;font-size:13px;font-weight:600}.login-submit:hover{background:#eefaff}.login-error{margin:19px 0 0;padding:12px 14px;border:1px solid #b5aa8a22;border-radius:10px;background:#4c382a33;color:#dfcdb9;font-size:12px;line-height:1.7}.login-footer{margin:24px 0 0;color:#60839d;font-size:10px;line-height:1.8}
@media(max-width:950px){.shell{padding-right:28px;padding-left:28px}.summary{gap:10px}.stat{padding:20px 18px}.stat dd{font-size:34px}.visitor{column-gap:18px;grid-template-columns:minmax(0,1fr) 97px 99px}.visit-count{padding-left:17px}.times{gap:9px 20px}.stat-note{font-size:9px}}
@media(max-width:700px){.shell{padding:0 20px 28px}.topbar{min-height:85px}.brand{gap:10px}.brand-mark{width:35px;height:35px;flex-basis:35px;border-radius:11px;font-size:19px}.brand-name{font-size:10px}.brand-subtitle{font-size:8px}.private-label{display:none}.quiet-button{font-size:11px;min-height:42px}.heading{align-items:flex-start;gap:18px;padding:34px 0 25px}.heading h1{font-size:32px;max-width:240px}.lead{font-size:12px;max-width:250px}.heading-action{padding-top:4px}.refresh{font-size:0;width:41px;height:41px;padding:10px}.refresh svg{width:17px;height:17px}.last-update{display:none}.summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.stat{min-height:144px;padding:18px 17px 16px;border-radius:15px}.stat dt{font-size:10px}.stat-symbol{width:23px;height:23px;font-size:12px}.stat dd{margin:20px 0 9px;font-size:33px}.stat-note{font-size:9px}.counting-note{margin:15px 1px 25px;font-size:10px;line-height:1.9;gap:8px}.selected{padding:16px;margin-bottom:26px;border-radius:16px}.selected-heading{gap:10px;margin-bottom:18px}.selected-heading h2{font-size:11px}.selected-tag{font-size:8px}.selected-note{font-size:9px;line-height:1.85}.section-heading{align-items:flex-start;margin-bottom:17px}.section-heading h2{font-size:18px}.capacity{max-width:110px;font-size:9px}.toolbar{grid-template-columns:1fr;gap:10px;margin-bottom:12px}.search{height:46px;font-size:12px}.sort-wrap{justify-self:end;height:38px;padding:0 9px;border-color:#a3cde617}.sort{height:36px;font-size:10px}.sort-label{font-size:9px}.filter-row{flex-direction:column;align-items:stretch;gap:11px;margin-bottom:14px}.filters{width:100%;gap:3px;padding:4px}.filter{flex:1;gap:6px;min-height:35px;padding:6px 7px;font-size:10px}.filter-count{font-size:9px}.result-count{text-align:left;font-size:9px;padding-left:2px}.visitor{grid-template-columns:minmax(0,1fr) 72px;grid-template-areas:'identity count' 'times times' 'action action';column-gap:14px;row-gap:18px;padding:18px;border-radius:15px}.visitor-identity{gap:10px;align-self:start}.device-icon{width:34px;height:34px;flex-basis:34px;border-radius:10px}.device-icon svg{width:18px;height:18px}.visitor-top{gap:5px;margin-bottom:5px}.ip{font-size:12px;line-height:1.55}.badge{font-size:7px}.device{font-size:10px;line-height:1.7}.visit-count{align-self:start;padding-left:13px;min-height:64px}.visit-number{font-size:27px}.visit-caption{font-size:9px}.counting-since{font-size:8px;line-height:1.7;margin-top:5px}.times{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:0 0 16px;border-bottom:1px solid #a1d4e810}.time-item{font-size:8px;gap:5px}.time-item time{font-size:9px}.row-action{min-height:42px;font-size:11px;background:#163449}.selected .visitor{padding:0}.selected .row-action{min-height:42px}.selected .times{padding-bottom:14px}.privacy-note{flex-direction:column;gap:14px;font-size:9px;line-height:1.9}.footer-brand{font-size:10px}.empty{min-height:200px;padding:29px 22px}.empty p{font-size:10px}.notice{font-size:11px;padding:13px 15px}.login-body{padding:20px}.login-shell{padding:31px 26px;border-radius:21px}.login-shell h1{font-size:31px}.login-brand{margin-bottom:31px}}
@media(max-width:360px){.shell{padding-right:16px;padding-left:16px}.stat{padding-right:14px;padding-left:14px}.stat dt{font-size:9px}.visitor{padding:16px;column-gap:11px}.selected{padding:15px}.selected-heading{flex-direction:column;align-items:flex-start;gap:7px}.visitor-identity{gap:8px}.device-icon{width:30px;height:30px;flex-basis:30px}.ip{font-size:11px}}
@media(max-width:700px){.brand-subtitle,.eyebrow,.stat dt,.stat-note,.counting-note,.selected-tag,.selected-note,.capacity,.sort-label,.filter-count,.result-count,.badge,.visit-caption,.counting-since,.time-item,.time-item time,.privacy-note,.footer-brand{font-size:11px}.lead,.device,.sort,.filter,.notice,.empty p{font-size:12px}.row-action,.selected .row-action,.quiet-button,.search{font-size:13px}.ip{font-size:13px}.selected-heading{align-items:flex-start;flex-wrap:wrap}.stat{min-height:157px}.stat-symbol{flex-shrink:0}.visit-count{padding-left:12px}.visitor{grid-template-columns:minmax(0,1fr) 79px}.filters{gap:2px}.filter{padding-left:6px;padding-right:6px;gap:5px}.times{column-gap:12px}.selected-heading h2{font-size:12px}}
@media(max-width:700px){.search,.password{font-size:16px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';

const adminScript = String.raw`
(() => {
  'use strict';
  const selectedId = new URLSearchParams(location.search).get('visit') || '';
  const $ = (id) => document.getElementById(id);
  const pending = new Set();
  const numberFormat = new Intl.NumberFormat('vi-VN');
  const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  const shortDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  let visitors = [], capacity = 500, loading = false, initialized = false, filter = 'all';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function login() { location.assign('/admin/login' + (selectedId ? '?visit=' + encodeURIComponent(selectedId) : '')); }
  function showMessage(message, success = false) {
    $('notice').textContent = message;
    $('notice').classList.toggle('success', success);
    $('notice').hidden = !message;
  }
  function dateValue(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const recordedCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const searchText = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const byRecent = (a, b) => (dateValue(b.lastSeen)?.getTime() || 0) - (dateValue(a.lastSeen)?.getTime() || 0);

  function appendTime(container, label, value) {
    const item = element('div', 'time-item');
    const date = dateValue(value);
    const time = element('time', '', date ? dateFormat.format(date) : 'Chưa ghi nhận');
    if (date) time.dateTime = date.toISOString();
    item.append(element('span', '', label), time);
    container.append(item);
  }
  function deviceIcon(label) {
    const ns = 'http://www.w3.org/2000/svg';
    const wrapper = element('span', 'device-icon');
    wrapper.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(ns, 'path');
    const device = searchText(label);
    let drawing = 'M4 4h16v12H4zM8 21h8M12 16v5';
    if (/iphone|dien thoai|di dong/.test(device)) drawing = 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 5h4M11 19h2';
    else if (/ipad|tablet|may tinh bang/.test(device)) drawing = 'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 19h2';
    else if (/khong xac dinh|chua co/.test(device)) drawing = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01';
    path.setAttribute('d', drawing); svg.append(path); wrapper.append(svg);
    return wrapper;
  }
  function card(visitor) {
    const row = element('article', 'visitor' + (visitor.blocked ? ' is-blocked' : ''));
    const identity = element('div', 'visitor-identity');
    const main = element('div', 'visitor-main');
    const top = element('div', 'visitor-top');
    top.append(element('h3', 'ip', visitor.ip));
    if (visitor.blocked) top.append(element('span', 'badge', 'Đang chặn'));
    main.append(top, element('p', 'device', visitor.deviceLabel));
    identity.append(deviceIcon(visitor.deviceLabel), main);
    const count = element('div', 'visit-count');
    const countingSince = dateValue(visitor.countingSince);
    count.append(element('strong', 'visit-number', numberFormat.format(visitor.visitCount)), element('span', 'visit-caption', 'lượt mở'));
    count.append(element('span', 'counting-since', countingSince ? 'Từ ' + shortDate.format(countingSince) : 'Từ khi bật thống kê'));
    const times = element('div', 'times');
    appendTime(times, 'Lần đầu ghi nhận IP', visitor.firstSeen);
    appendTime(times, 'Truy cập gần nhất', visitor.lastSeen);
    if (visitor.blocked && visitor.blockedAt) appendTime(times, 'Đã chặn lúc', visitor.blockedAt);
    const button = element('button', 'row-action' + (visitor.blocked ? ' unblock' : ''), pending.has(visitor.id) ? 'Đang lưu…' : visitor.blocked ? 'Bỏ chặn IP' : 'Chặn IP');
    button.type = 'button'; button.dataset.visitorId = visitor.id;
    button.disabled = pending.size > 0 || loading;
    button.setAttribute('aria-label', (visitor.blocked ? 'Bỏ chặn IP ' : 'Chặn IP ') + visitor.ip);
    button.addEventListener('click', () => update(visitor));
    row.append(identity, count, times, button);
    return row;
  }
  function focusAction(id) {
    const target = Array.from(document.querySelectorAll('[data-visitor-id]')).find((button) => button.dataset.visitorId === id);
    if (target && !target.disabled) target.focus({ preventScroll: true });
    else $('search').focus({ preventScroll: true });
  }
  function resetFilters() {
    $('search').value = ''; $('sort').value = 'recent'; filter = 'all';
    render(); $('search').focus();
  }
  function emptyState(title, description, reset = false) {
    const empty = element('div', 'empty');
    const icon = element('span', 'empty-icon', '⌕'); icon.setAttribute('aria-hidden', 'true');
    empty.append(icon, element('h3', '', title), element('p', '', description));
    if (reset) {
      const button = element('button', 'clear-filters', 'Xóa bộ lọc'); button.type = 'button';
      button.addEventListener('click', resetFilters); empty.append(button);
    }
    return empty;
  }
  function render() {
    const blocked = visitors.filter((visitor) => visitor.blocked).length;
    const totalViews = visitors.reduce((sum, visitor) => sum + visitor.visitCount, 0);
    $('views-count').textContent = numberFormat.format(totalViews);
    $('total-count').textContent = numberFormat.format(visitors.length);
    $('blocked-count').textContent = numberFormat.format(blocked);
    $('returning-count').textContent = numberFormat.format(visitors.filter((visitor) => visitor.visitCount > 1).length);
    $('capacity').textContent = 'Tối đa ' + numberFormat.format(capacity) + ' IP đang lưu';
    const selected = visitors.find((visitor) => visitor.id === selectedId);
    $('selected').hidden = !selectedId;
    if (selectedId) $('selected-visitor').replaceChildren(selected ? card(selected) : element('p', 'missing', 'Lượt mở này không còn trong danh sách đang lưu.'));
    const available = visitors.filter((visitor) => visitor.id !== selectedId);
    const query = searchText($('search').value.trim());
    const matched = available.filter((visitor) => !query || searchText(visitor.ip + ' ' + visitor.deviceLabel).includes(query));
    const totals = { all: matched.length, allowed: matched.filter((visitor) => !visitor.blocked).length, blocked: matched.filter((visitor) => visitor.blocked).length };
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
      button.querySelector('.filter-count').textContent = numberFormat.format(totals[button.dataset.filter]);
    }
    const results = matched.filter((visitor) => filter === 'all' || (filter === 'blocked' ? visitor.blocked : !visitor.blocked));
    results.sort($('sort').value === 'views' ? (a, b) => b.visitCount - a.visitCount || byRecent(a, b) : byRecent);
    const countLabel = 'Hiển thị ' + numberFormat.format(results.length) + ' / ' + numberFormat.format(available.length) + ' IP' + (selected ? ' · 1 IP được chọn ở trên' : '');
    $('result-count').textContent = countLabel; $('screen-status').textContent = countLabel;
    const list = $('visitor-list');
    if (results.length) list.replaceChildren(...results.map(card));
    else if (query || filter !== 'all') list.replaceChildren(emptyState('Không tìm thấy IP phù hợp', 'Thử một địa chỉ IP, tên thiết bị khác hoặc bỏ bộ lọc đang chọn.', true));
    else if (selected && !available.length) list.replaceChildren(emptyState('Bạn đang xem IP duy nhất', 'Thông tin và thao tác của IP này nằm trong khung được chọn ở phía trên.'));
    else list.replaceChildren(emptyState('Chưa có lượt ghé thăm nào', 'IP và số lượt mở được ghi nhận sẽ xuất hiện tại đây khi có người truy cập.'));
  }
  async function load() {
    if (loading) return false;
    loading = true; $('refresh').disabled = true;
    $('visitor-list').setAttribute('aria-busy', 'true'); $('screen-status').textContent = 'Đang tải danh sách truy cập.';
    if (initialized) render();
    try {
      const response = await fetch('/admin/api/visitors', { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401) { login(); return false; }
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      if (!data || !Array.isArray(data.visitors)) throw new Error('format');
      visitors = data.visitors.filter((item) => item && typeof item.id === 'string' && typeof item.ip === 'string').map((item) => ({
        id: item.id, ip: item.ip, deviceLabel: typeof item.deviceLabel === 'string' && item.deviceLabel ? item.deviceLabel : 'Chưa có thông tin trình duyệt',
        firstSeen: item.firstSeen, lastSeen: item.lastSeen, blocked: item.blocked === true, blockedAt: item.blockedAt,
        visitCount: recordedCount(item.visitCount), countingSince: item.countingSince
      }));
      capacity = Number.isSafeInteger(data.capacity) && data.capacity > 0 ? data.capacity : 500;
      initialized = true;
      $('last-update').textContent = 'Cập nhật ' + new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
      render(); return true;
    } catch {
      showMessage(initialized ? 'Chưa làm mới được dữ liệu. Danh sách bên dưới là lần tải gần nhất.' : 'Chưa tải được danh sách. Bạn thử Làm mới sau một chút nhé.');
      if (!initialized) {
        $('visitor-list').replaceChildren(emptyState('Kết nối đang gián đoạn', 'Chọn Làm mới để tải lại. Chưa có thay đổi nào được thực hiện.'));
        $('result-count').textContent = 'Chưa tải được dữ liệu';
      }
      return false;
    } finally {
      loading = false; $('refresh').disabled = pending.size > 0;
      $('visitor-list').setAttribute('aria-busy', 'false');
      if (initialized) render();
    }
  }
  async function update(visitor) {
    if (pending.size || loading) return;
    pending.add(visitor.id); $('refresh').disabled = true; showMessage(''); render();
    try {
      const response = await fetch(visitor.blocked ? '/admin/api/unblock' : '/admin/api/block', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: visitor.id })
      });
      if (response.status === 401) { login(); return; }
      if (!response.ok) {
        if (response.status === 429) showMessage('Bạn thao tác hơi nhanh. Chờ một chút rồi thử lại nhé.');
        else if (response.status === 404) showMessage('IP này không còn trong danh sách. Hãy chọn Làm mới.');
        else showMessage('Chưa cập nhật được trạng thái. Vui lòng thử lại.');
        return;
      }
      if (await load()) showMessage((visitor.blocked ? 'Đã bỏ chặn IP ' : 'Đã chặn IP ') + visitor.ip + '.', true);
    } catch { showMessage('Kết nối bị gián đoạn. Hãy Làm mới để kiểm tra trạng thái trước khi thử lại.'); }
    finally { pending.delete(visitor.id); $('refresh').disabled = loading; render(); focusAction(visitor.id); }
  }
  $('search').addEventListener('input', () => { if (initialized) render(); });
  $('sort').addEventListener('change', () => { if (initialized) render(); });
  for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { filter = button.dataset.filter; if (initialized) render(); });
  $('refresh').addEventListener('click', () => { showMessage(''); void load(); });
  void load();
})();
`;

function documentShell(title, body, extra = '') {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#050c14"><title>${title}</title><style>${styles}</style></head>${body}${extra}</html>`;
}

export function adminPage(nonce) {
  return documentShell('Lượt ghé thăm · Nguyên', `<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">N.</span><span class="brand-copy"><span class="brand-name">VÕ LÊ NGUYÊN</span><span class="brand-subtitle">Không gian riêng</span></span></div>
      <div class="topbar-right"><span class="private-label"><i aria-hidden="true"></i> Quản trị cá nhân</span><form class="logout" method="post" action="/admin/logout"><button class="quiet-button" type="submit">Đăng xuất ↗</button></form></div>
    </header>
    <main>
      <div class="heading">
        <div><p class="eyebrow">Chào Nguyên</p><h1>Những lượt ghé thăm.</h1><p class="lead">Một góc nhìn về những kết nối với trang của bạn.</p></div>
        <div class="heading-action"><button class="refresh" id="refresh" type="button" aria-label="Làm mới danh sách"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/></svg>Làm mới</button><span class="last-update" id="last-update">Đang kết nối…</span></div>
      </div>
      <dl class="summary" aria-label="Tổng quan lượt truy cập">
        <div class="stat stat-primary"><dt>Tổng lượt mở <span class="stat-symbol" aria-hidden="true">◎</span></dt><dd><span id="views-count">—</span><span class="stat-note">Lượt mở đã được ghi nhận</span></dd></div>
        <div class="stat"><dt>IP đã ghi nhận <span class="stat-symbol" aria-hidden="true">⌘</span></dt><dd><span id="total-count">—</span><span class="stat-note">Trong danh sách đang lưu</span></dd></div>
        <div class="stat"><dt>Đang chặn <span class="stat-symbol" aria-hidden="true">⊘</span></dt><dd><span id="blocked-count">—</span><span class="stat-note">Đã hạn chế quyền truy cập</span></dd></div>
        <div class="stat"><dt>IP quay lại <span class="stat-symbol" aria-hidden="true">↻</span></dt><dd><span id="returning-count">—</span><span class="stat-note">Có từ 2 lượt mở ghi nhận</span></dd></div>
      </dl>
      <p class="counting-note"><span class="info-dot" aria-hidden="true">i</span><span>Lượt được ghi nhận từ khi bật thống kê, trong các IP đang lưu. Dữ liệu trước đó không được cộng thêm.</span></p>
      <p class="notice" id="notice" role="status" aria-live="polite" hidden></p>
      <section class="selected" id="selected" aria-labelledby="selected-title" hidden>
        <div class="selected-heading"><h2 id="selected-title">Lượt mở được chọn</h2><span class="selected-tag">Từ thông báo Pushover ↗</span></div>
        <div id="selected-visitor"></div>
        <p class="selected-note">Mở liên kết chỉ hiển thị thông tin. IP chỉ bị chặn khi bạn chọn “Chặn IP”.</p>
      </section>
      <section class="list-section" aria-labelledby="list-title">
        <div class="section-heading"><h2 id="list-title">Danh sách IP</h2><span class="capacity" id="capacity">Tối đa 500 IP đang lưu</span></div>
        <div class="toolbar">
          <div class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><label class="sr-only" for="search">Tìm địa chỉ IP hoặc thiết bị</label><input class="search" id="search" type="search" placeholder="Tìm địa chỉ IP hoặc thiết bị…" autocomplete="off" spellcheck="false"></div>
          <div class="sort-wrap"><label class="sort-label" for="sort">Sắp xếp</label><select class="sort" id="sort"><option value="recent">Gần nhất</option><option value="views">Nhiều lượt mở nhất</option></select></div>
        </div>
        <div class="filter-row"><div class="filters" role="group" aria-label="Lọc trạng thái truy cập"><button class="filter" type="button" data-filter="all" aria-pressed="true">Tất cả <span class="filter-count">—</span></button><button class="filter" type="button" data-filter="allowed" aria-pressed="false">Cho phép <span class="filter-count">—</span></button><button class="filter" type="button" data-filter="blocked" aria-pressed="false">Đang chặn <span class="filter-count">—</span></button></div><p class="result-count" id="result-count">Đang tải danh sách…</p></div>
        <div class="visitor-list" id="visitor-list" aria-busy="true"><div class="skeleton" aria-hidden="true"><span class="skeleton-square"></span><div class="skeleton-lines"><span class="skeleton-line"></span><span class="skeleton-line"></span></div><span class="skeleton-number"></span></div><div class="skeleton" aria-hidden="true"><span class="skeleton-square"></span><div class="skeleton-lines"><span class="skeleton-line"></span><span class="skeleton-line"></span></div><span class="skeleton-number"></span></div></div>
        <p class="sr-only" id="screen-status" role="status" aria-live="polite" aria-atomic="true">Đang tải danh sách truy cập.</p>
      </section>
    </main>
    <footer class="privacy-note"><p>IP có thể dùng chung hoặc thay đổi. Cùng một IP không đồng nghĩa với cùng một người hay thiết bị. Nhãn thiết bị chỉ mang tính tham khảo.</p><span class="footer-brand">Không gian của Nguyên.</span></footer>
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
