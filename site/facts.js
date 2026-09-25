(() => {
  'use strict';

  const facts = [...document.querySelectorAll('[data-fact]')];
  if (!facts.length) return;

  const readableText = text => {
    const span = document.createElement('span');
    span.className = 'visually-hidden';
    span.textContent = text;
    return span;
  };

  document.querySelectorAll('[data-fact-digits]').forEach(time => {
    const date = time.textContent.trim();
    const digits = document.createElement('span');
    digits.className = 'fact-digits';
    digits.setAttribute('aria-hidden', 'true');
    Array.from(date).forEach((character, index) => {
      const slot = document.createElement('span');
      slot.className = 'fact-char';
      slot.style.setProperty('--fact-index', index);
      const glyph = document.createElement('span');
      glyph.className = 'fact-glyph';
      glyph.textContent = character;
      slot.append(glyph);
      digits.append(slot);
    });
    // Keep the true date available to assistive technology throughout the effect.
    time.replaceChildren(readableText(date), digits);
  });

  document.querySelectorAll('[data-fact-school]').forEach(school => {
    const lines = [...school.querySelectorAll('[data-fact-words]')];
    const label = lines.map(line => line.textContent.trim()).join(' ');
    let index = 0;
    lines.forEach(line => {
      const words = line.textContent.trim().split(/\s+/);
      line.setAttribute('aria-hidden', 'true');
      line.replaceChildren(...words.flatMap((word, wordIndex) => {
        const span = document.createElement('span');
        span.className = 'fact-word';
        span.style.setProperty('--fact-index', index++);
        span.textContent = word;
        return wordIndex ? [document.createTextNode(' '), span] : [span];
      }));
    });
    school.prepend(readableText(label));
  });

  if (!('IntersectionObserver' in window)) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= .45) entry.target.classList.add('fact-visible');
      else if (!entry.isIntersecting) entry.target.classList.remove('fact-visible');
    });
  }, { threshold: [0, .45], rootMargin: '0px 0px -4% 0px' });

  const syncMotion = () => {
    observer.disconnect();
    facts.forEach(fact => {
      fact.classList.toggle('fact-motion-ready', !motion.matches);
      fact.classList.toggle('fact-visible', motion.matches);
      if (!motion.matches) observer.observe(fact);
    });
  };
  motion.addEventListener('change', syncMotion);
  syncMotion();
})();
