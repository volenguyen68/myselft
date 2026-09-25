(() => {
  'use strict';

  const root = document.documentElement;
  if (root.hasAttribute('data-effects-ready')) return;
  root.setAttribute('data-effects-ready', 'true');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
  const canvas = document.getElementById('constellation');
  const context = canvas?.getContext('2d', { alpha: true });
  const cursor = document.getElementById('cursor-glow');
  const celebration = document.getElementById('celebration');
  const sparks = new Map();
  const pointer = { x: -1000, y: -1000, active: false };
  const particles = [];
  let width = 0;
  let height = 0;
  let canvasFrame = 0;
  let pointerFrame = 0;
  let lastPaint = 0;
  let activeSocial = null;
  let activeButton = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pointerEnabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;

  function resetSocial() {
    if (!activeSocial) return;
    activeSocial.style.setProperty('--card-x', '50%');
    activeSocial.style.setProperty('--card-y', '50%');
    activeSocial.style.setProperty('--tilt-x', '0deg');
    activeSocial.style.setProperty('--tilt-y', '0deg');
    activeSocial = null;
  }

  function resetButton() {
    if (!activeButton) return;
    activeButton.style.setProperty('--magnet-x', '0px');
    activeButton.style.setProperty('--magnet-y', '0px');
    activeButton = null;
  }

  function resetPointer() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pointer.active = false;
    root.style.setProperty('--cursor-opacity', '0');
    resetSocial();
    resetButton();
  }

  function updatePointer(event) {
    if (!pointerEnabled()) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (!pointerFrame) {
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!pointerEnabled()) return;
        root.style.setProperty('--cursor-x', `${pointer.x}px`);
        root.style.setProperty('--cursor-y', `${pointer.y}px`);
        root.style.setProperty('--cursor-opacity', '1');
      });
    }

    const target = event.target instanceof Element ? event.target : null;
    const social = target?.closest('.social-item[href]') || null;
    const button = target?.closest('.button') || null;
    if (social !== activeSocial) { resetSocial(); activeSocial = social; }
    if (button !== activeButton) { resetButton(); activeButton = button; }

    if (social) {
      const rect = social.getBoundingClientRect();
      const x = clamp((pointer.x - rect.left) / Math.max(1, rect.width), 0, 1);
      const y = clamp((pointer.y - rect.top) / Math.max(1, rect.height), 0, 1);
      social.style.setProperty('--card-x', `${(x * 100).toFixed(2)}%`);
      social.style.setProperty('--card-y', `${(y * 100).toFixed(2)}%`);
      social.style.setProperty('--tilt-x', `${((.5 - y) * 8).toFixed(2)}deg`);
      social.style.setProperty('--tilt-y', `${((x - .5) * 8).toFixed(2)}deg`);
    }
    if (button) {
      const rect = button.getBoundingClientRect();
      const x = clamp((pointer.x - rect.left) / Math.max(1, rect.width) - .5, -.5, .5);
      const y = clamp((pointer.y - rect.top) / Math.max(1, rect.height) - .5, -.5, .5);
      button.style.setProperty('--magnet-x', `${(x * 10).toFixed(2)}px`);
      button.style.setProperty('--magnet-y', `${(y * 10).toFixed(2)}px`);
    }
  }

  function clearSparks() {
    for (const [spark, animation] of sparks) {
      animation.cancel();
      spark.remove();
    }
    sparks.clear();
  }

  function celebrate(event) {
    if (!celebration || reducedMotion.matches || document.hidden) return;
    clearSparks();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const count = finePointer.matches ? 24 : 18;
    for (let index = 0; index < count; index++) {
      const spark = document.createElement('span');
      const angle = (index / count) * Math.PI * 2 + (Math.random() - .5) * .15;
      const distance = 42 + Math.random() * 73;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 20;
      const spin = (Math.random() - .5) * 270;
      spark.className = 'spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.style.setProperty('--burst-x', `${x}px`);
      spark.style.setProperty('--burst-y', `${y}px`);
      spark.style.setProperty('--dx', `${dx.toFixed(2)}px`);
      spark.style.setProperty('--dy', `${dy.toFixed(2)}px`);
      spark.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
      spark.style.setProperty('--spark-size', `${2 + Math.random() * 3}px`);
      spark.style.setProperty('--spark-color', index % 3 === 0 ? '#edf7ff' : '#91deee');
      celebration.append(spark);
      const animation = spark.animate([
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
        { opacity: .95, offset: .12 },
        { opacity: 0, transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--spin)) scale(.15)' }
      ], { duration: 650 + Math.random() * 350, easing: 'cubic-bezier(.1,.65,.3,1)', fill: 'forwards' });
      sparks.set(spark, animation);
      const remove = () => { spark.remove(); sparks.delete(spark); };
      animation.finished.then(remove, remove);
    }
  }

  function resizeCanvas() {
    if (!context) return;
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 701 ? 20 : 40;
    particles.length = 0;
    for (let index = 0; index < count; index++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * 10,
        vy: -3 - Math.random() * 7,
        radius: .55 + Math.random() * .85,
        phase: Math.random() * Math.PI * 2
      });
    }
    lastPaint = 0;
  }

  function drawCanvas(time) {
    canvasFrame = 0;
    if (!context || reducedMotion.matches || document.hidden) return;
    canvasFrame = requestAnimationFrame(drawCanvas);
    if (lastPaint && time - lastPaint < 1000 / 30) return;
    const elapsed = lastPaint ? Math.min((time - lastPaint) / 1000, .08) : 0;
    lastPaint = time;
    context.clearRect(0, 0, width, height);
    const linkDistance = width < 701 ? 95 : 135;
    for (let index = 0; index < particles.length; index++) {
      const point = particles[index];
      point.x += point.vx * elapsed;
      point.y += point.vy * elapsed;
      if (point.x < -10) point.x = width + 10;
      if (point.x > width + 10) point.x = -10;
      if (point.y < -10) point.y = height + 10;
      const alpha = .19 + (Math.sin(time * .0007 + point.phase) + 1) * .08;
      context.fillStyle = `rgba(165,220,241,${alpha})`;
      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fill();
      for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex++) {
        const other = particles[otherIndex];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance >= linkDistance) continue;
        context.strokeStyle = `rgba(109,194,222,${(1 - distance / linkDistance) * .1})`;
        context.lineWidth = .65;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      }
      if (pointer.active && pointerEnabled()) {
        const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (distance < 150) {
          context.strokeStyle = `rgba(162,229,245,${(1 - distance / 150) * .18})`;
          context.lineWidth = .75;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }
    }
  }

  function syncMotion() {
    cancelAnimationFrame(canvasFrame);
    canvasFrame = 0;
    lastPaint = 0;
    if (cursor) cursor.hidden = !pointerEnabled();
    if (!pointerEnabled()) resetPointer();
    if (reducedMotion.matches || document.hidden) {
      clearSparks();
      if (context && reducedMotion.matches) context.clearRect(0, 0, width, height);
      return;
    }
    if (context) canvasFrame = requestAnimationFrame(drawCanvas);
  }

  document.addEventListener('pointermove', updatePointer, { passive: true });
  document.addEventListener('pointerout', event => {
    const next = event.relatedTarget;
    if (activeSocial && (!(next instanceof Node) || !activeSocial.contains(next))) resetSocial();
    if (activeButton && (!(next instanceof Node) || !activeButton.contains(next))) resetButton();
  }, { passive: true });
  root.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('blur', resetPointer);
  window.addEventListener('resize', resizeCanvas, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  finePointer.addEventListener('change', syncMotion);
  document.getElementById('ok')?.addEventListener('click', celebrate);
  resetPointer();
  resizeCanvas();
  syncMotion();
})();
