(() => {
  'use strict';
  const config = window.PROFILE || {};
  const $ = (id) => document.getElementById(id);
  for (const field of ['eyebrow', 'intro', 'invitation', 'signature']) {
    if (typeof config[field] === 'string' && config[field].trim()) $(field).textContent = config[field];
  }
  const socialList = document.querySelector('.social-list');
  let facebookUrl = null;
  if (socialList && Array.isArray(config.socials)) {
    socialList.replaceChildren();
    config.socials.filter(item => item && typeof item.label === 'string').forEach((item, index) => {
      let href = null;
      try {
        const url = new URL(item.href);
        if (url.protocol === 'https:' && !url.username && !url.password) href = url.href;
      } catch { /* An empty URL is a visible, non-interactive placeholder. */ }
      if (href && (item.kind === 'facebook' || item.label === 'Facebook')) facebookUrl = href;
      const entry = document.createElement(href ? 'a' : 'div');
      entry.className = `social-item${href ? '' : ' social-placeholder'}`;
      if (['facebook', 'locket', 'instagram', 'threads'].includes(item.kind)) entry.classList.add(`social-${item.kind}`);
      const number = document.createElement('span');
      number.className = 'social-index'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
      if (href) { entry.href = href; entry.target = '_blank'; entry.rel = 'noopener noreferrer'; }
      const icon = document.createElement('span');
      icon.className = 'social-mark'; icon.textContent = item.mark || '↗'; icon.setAttribute('aria-hidden', 'true');
      const content = document.createElement('span'); content.className = 'social-content';
      const label = document.createElement('span'); label.className = 'social-name'; label.textContent = item.label;
      const detail = document.createElement('span'); detail.className = 'social-detail'; detail.textContent = href ? (item.detail || 'Kết nối cùng mình') : '....';
      content.append(label, detail); entry.append(number, icon, content);
      if (item.kind === 'locket' && href) {
        const signature = document.createElement('span');
        signature.className = 'locket-signature'; signature.setAttribute('aria-hidden', 'true');
        Array.from('vln').forEach((character, index) => {
          const letter = document.createElement('span');
          letter.className = 'locket-letter'; letter.textContent = character;
          letter.style.setProperty('--letter-index', index);
          signature.append(letter);
        });
        entry.append(signature);
      }
      if (href) { const arrow = document.createElement('span'); arrow.className = 'social-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); entry.append(arrow); }
      socialList.append(entry);
    });
  }
  if (typeof config.name === 'string' && config.name.trim()) {
    $('headline').setAttribute('aria-label', `Mình là ${config.name.trim()}`);
    const parts = config.name.trim().split(/\s+/);
    const lines = document.querySelectorAll('[data-split]');
    lines[0].textContent = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
    lines[1].textContent = parts.length > 1 ? `${parts.at(-1)}.` : '';
    document.title = `${config.name.trim()} — Xin chào.`;
    document.querySelector('meta[name="description"]').content = config.intro || `Rất vui được gặp bạn. Mình là ${config.name.trim()}.`;
  }

  let letterIndex = 0;
  document.querySelectorAll('[data-split]').forEach(line => {
    const label = line.textContent;
    line.setAttribute('aria-hidden', 'true');
    line.replaceChildren(...Array.from(label.normalize('NFC')).map(letter => {
      const span = document.createElement('span');
      span.className = 'letter';
      const glyph = document.createElement('span');
      glyph.className = 'glyph'; glyph.textContent = letter;
      span.append(glyph);
      span.style.setProperty('--travel', `${10 + letterIndex * 2}px`);
      span.style.setProperty('--i', letterIndex++);
      return span;
    }));
  });
  document.querySelectorAll('.story-line').forEach(line => {
    const words = line.textContent.trim().split(/\s+/);
    line.replaceChildren(...words.flatMap((word, index) => {
      const span = document.createElement('span');
      span.className = 'story-word'; span.textContent = word;
      return index ? [document.createTextNode(' '), span] : [span];
    }));
  });
  document.querySelectorAll('[data-kinetic]').forEach(heading => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    heading.setAttribute('aria-label', heading.innerText.replace(/\s+/g, ' ').trim());
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
        const span = document.createElement('span');
        span.className = 'kinetic-word'; span.textContent = word;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--word-index', index++);
        fragment.append(span);
      });
      node.replaceWith(fragment);
    });
  });
  // Remember only the visitor's choice on this browser; no identity is stored here.
  const laterChoiceKey = 'hello:later:v1';
  const returningGreeting = $('returning-greeting');
  const choiceStorage = {
    get() { try { return localStorage.getItem(laterChoiceKey) === '1'; } catch { return false; } },
    set(later) { try { if (later) localStorage.setItem(laterChoiceKey, '1'); else localStorage.removeItem(laterChoiceKey); } catch { /* The page still works when browser storage is unavailable. */ } }
  };
  const updateReturningGreeting = () => {
    if (returningGreeting) returningGreeting.hidden = !choiceStorage.get();
  };
  updateReturningGreeting();
  window.addEventListener('pageshow', updateReturningGreeting);
  let endpoint = null;
  try {
    const url = new URL(config.notificationEndpoint);
    if (location.protocol === 'https:' && url.protocol === 'https:' && !url.username && !url.password) endpoint = url.href;
  } catch { /* Notifications stay off until a valid endpoint is configured. */ }

  const showBlocked = () => {
    if (endpoint) location.replace(new URL('/blocked', endpoint).href);
  };
  async function checkAccess() {
    if (document.hidden || !endpoint || new URL(endpoint).origin !== location.origin) return;
    try {
      const response = await fetch(new URL('/access', endpoint), { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000) });
      if (response.status === 403 && (await response.json()).blocked === true) showBlocked();
    } catch { /* A temporary network issue is not a block. */ }
  }
  let accessTimer;
  function watchAccess() {
    clearInterval(accessTimer);
    if (!document.hidden && endpoint) { void checkAccess(); accessTimer = setInterval(checkAccess, 15000); }
  }
  document.addEventListener('visibilitychange', watchAccess);
  window.addEventListener('pageshow', watchAccess);
  window.addEventListener('pagehide', () => clearInterval(accessTimer));
  watchAccess();

  const memory = new Set();
  const pending = new Map();
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* Private mode fallback. */ } }
  };
  const sessionKey = 'hello:session:v1';
  const previous = storage.get(sessionKey);
  const sessionId = previous && /^[a-zA-Z0-9-]{16,80}$/.test(previous)
    ? previous : (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  storage.set(sessionKey, sessionId);

  async function notify(event) {
    if (!endpoint) return false;
    const key = `hello:sent:v1:${event}`;
    if (memory.has(event) || storage.get(key) === '1') return true;
    if (pending.has(event)) return pending.get(event);
    const request = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const result = await fetch(endpoint, {
          method: 'POST', mode: 'cors', credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, sessionId }),
          keepalive: true, signal: controller.signal
        });
        const data = await result.json().catch(() => ({}));
        if (result.status === 403 && data.blocked === true) { showBlocked(); return false; }
        if (result.ok && data.ok === true) {
          memory.add(event); storage.set(key, '1'); return true;
        }
        return false;
      } catch { return false; }
      finally { clearTimeout(timer); }
    })();
    pending.set(event, request);
    try { return await request; } finally { pending.delete(event); }
  }

  let selection = null;
  document.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => {
      selection = button.dataset.choice;
      choiceStorage.set(selection === 'later');
      if (selection === 'ok') {
        if (returningGreeting) returningGreeting.hidden = true;
        // Open synchronously from the click so browsers retain the user gesture.
        if (facebookUrl) window.open(facebookUrl, '_blank', 'noopener,noreferrer');
      }
      document.body.classList.toggle('said-hello', selection === 'ok');
      $('response').textContent = selection === 'ok'
        ? config.okMessage || 'Rất vui được làm quen với bạn!'
        : config.laterMessage || 'Hẹn gặp bạn vào một lúc khác nhé.';
      $('response').classList.remove('pop');
      void $('response').offsetWidth;
      $('response').classList.add('pop');
      void notify(selection);
    });
  });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  let frame = 0;
  window.addEventListener('pointermove', event => {
    if (motion.matches || !pointer.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = (event.clientX / innerWidth - .5) * 2;
      const y = (event.clientY / innerHeight - .5) * 2;
      $('artwork').style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 4}deg) translate3d(${x * 9}px,${y * 5}px,0)`;
    });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    cancelAnimationFrame(frame); $('artwork').style.transform = '';
  });
  motion.addEventListener('change', () => {
    cancelAnimationFrame(frame); $('artwork').style.transform = '';
    updateScroll();
  });
  pointer.addEventListener('change', () => {
    cancelAnimationFrame(frame); $('artwork').style.transform = '';
  });

  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    }, { threshold: .15 });
    heroObserver.observe(document.querySelector('.hero'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-scroll-reveal]').forEach((el, index) => {
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-delay', `${index % 2 * 90}ms`);
      observer.observe(el);
    });
  }

  const mix = (a, b, t) => a.map((n, i) => Math.round(n + (b[i] - n) * t)).join(',');
  const clamp = n => Math.max(0, Math.min(1, n));
  const story = document.querySelector('.about-description');
  const storyWords = [...document.querySelectorAll('.story-word')];
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const heroHeight = document.querySelector('.hero').offsetHeight;
    const maxScroll = Math.max(1, root.scrollHeight - innerHeight);
    const end = Math.min(heroHeight * .98, maxScroll);
    const start = Math.min(heroHeight * .18, end * .2);
    const progress = clamp((scrollY - start) / Math.max(1, end - start));
    const t = motion.matches ? (progress > .5 ? 1 : 0) : progress * progress * (3 - 2 * progress);
    root.style.setProperty('--page-bg', mix([5,8,13], [7,18,26], t));
    root.style.setProperty('--scene-progress', String(t));
    root.style.setProperty('--hero-progress', motion.matches ? '0' : String(clamp(scrollY / heroHeight)));
    root.style.setProperty('--reading', String(clamp(scrollY / maxScroll)));
    if (story) {
      const reading = clamp((innerHeight * .87 - story.getBoundingClientRect().top) / (innerHeight * .55));
      storyWords.forEach((word, index) => {
        word.style.setProperty('--word-progress', String(motion.matches ? 1 : clamp(reading * (storyWords.length + 1) - index)));
      });
    }
  }
  function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  updateScroll();

  // A view is a visible open, once per browser-tab session, not every refresh.
  const visit = () => {
    if (!document.hidden && config.notifyOnVisit !== false) void notify('view');
  };
  visit();
  document.addEventListener('visibilitychange', visit);
  window.addEventListener('online', () => { visit(); if (selection) void notify(selection); });
})();
