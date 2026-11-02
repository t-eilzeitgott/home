(() => {
  const d = document.documentElement;
  const root = d.dataset.root || './';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function setTheme(theme) {
    d.dataset.theme = theme;
    store.set('talfahrt.theme', theme);
    if (themeMeta) themeMeta.content = theme === 'light' ? '#ffffff' : '#000000';
    window.dispatchEvent(new Event('themechange'));
  }
  const toggleTheme = () => setTheme(d.dataset.theme === 'light' ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));

  document.querySelectorAll('[data-lang]').forEach((a) => a.addEventListener('click', () => store.set('talfahrt.lang', a.dataset.lang)));

  if (!mac) {
    document.querySelectorAll('.kbtn kbd:first-child').forEach((k) => { k.textContent = 'Ctrl'; });
    document.querySelectorAll('.pal__foot').forEach((f) => { f.textContent = f.textContent.replace('⌘K', 'Ctrl K'); });
  }

  const top = document.getElementById('top');
  const heroMark = document.getElementById('heroMark');
  if (top && heroMark && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      top.classList.toggle('top--solid', !e.isIntersecting);
    }, { rootMargin: `-${top.offsetHeight}px 0px 0px 0px`, threshold: 0 }).observe(heroMark);
  }

  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      if (button) {
        const label = button.textContent;
        button.textContent = button.dataset.copied;
        button.disabled = true;
        setTimeout(() => { button.textContent = label; button.disabled = false; }, 1400);
      }
    } catch (e) {
      location.href = `mailto:${text}`;
    }
  }
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy, b)));

  function scrollTo(target) {
    const behavior = reduced ? 'auto' : 'smooth';
    if (target === '#top') {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior, block: 'start' });
    else location.href = root + target;
  }

  const pal = document.getElementById('palette');
  if (pal && typeof pal.showModal === 'function') {
    const input = pal.querySelector('.pal__input');
    const items = Array.from(pal.querySelectorAll('.pal__item'));
    const groups = Array.from(pal.querySelectorAll('.pal__group'));
    const empty = pal.querySelector('.pal__empty');
    let sel = -1;
    const visible = () => items.filter((i) => !i.hidden);

    function select(n) {
      const v = visible();
      items.forEach((i) => i.setAttribute('aria-selected', 'false'));
      sel = n;
      if (n >= 0 && v[n]) {
        v[n].setAttribute('aria-selected', 'true');
        v[n].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', v[n].id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function filter(q) {
      const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      items.forEach((i) => { i.hidden = !words.every((w) => i.dataset.keys.includes(w)); });
      groups.forEach((g) => {
        let n = g.nextElementSibling;
        let any = false;
        while (n && !n.classList.contains('pal__group')) {
          if (!n.hidden) any = true;
          n = n.nextElementSibling;
        }
        g.hidden = !any;
      });
      const v = visible();
      empty.hidden = v.length > 0;
      select(v.length ? 0 : -1);
    }

    function open() {
      if (pal.open) return;
      input.value = '';
      filter('');
      pal.showModal();
      input.focus();
    }

    function close() {
      if (pal.open) pal.close();
    }

    function run(item) {
      const action = item.dataset.action;
      const target = item.dataset.target || '';
      close();
      if (action === 'goto') scrollTo(target);
      else if (action === 'open' || action === 'mail') location.href = target;
      else if (action === 'lang') {
        store.set('talfahrt.lang', /en\/?$/.test(target) ? 'en' : 'de');
        location.href = target;
      } else if (action === 'theme') toggleTheme();
      else if (action === 'copy') copy(target, null);
    }

    items.forEach((i, n) => {
      i.id = `pal-${n}`;
      i.addEventListener('click', () => run(i));
      i.addEventListener('pointermove', () => {
        const k = visible().indexOf(i);
        if (k !== sel) select(k);
      });
    });
    input.addEventListener('input', () => filter(input.value));
    input.addEventListener('keydown', (e) => {
      const v = visible();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (v.length) select((sel + 1) % v.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (v.length) select((sel - 1 + v.length) % v.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (sel >= 0 && v[sel]) run(v[sel]);
      }
    });
    pal.addEventListener('click', (e) => { if (e.target === pal) close(); });
    document.querySelectorAll('[data-palette]').forEach((b) => b.addEventListener('click', open));
    const typing = (e) => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (pal.open) close(); else open();
      } else if (e.key === '/' && !pal.open && !typing(e)) {
        e.preventDefault();
        open();
      }
    });
  }

  const canvas = document.getElementById('field');
  let fieldStarted = false;
  function startField() {
    if (fieldStarted || !canvas || !d.dataset.field) return;
    fieldStarted = true;
    import(new URL(d.dataset.field, document.baseURI).href).then((m) => m.start(canvas, { reduced })).catch(() => {});
  }

  const intro = document.getElementById('intro');
  const introMark = document.getElementById('introMark');
  function finish() {
    d.classList.add('landed');
    if (intro) intro.classList.add('intro--done');
    startField();
  }

  if (intro && introMark && !d.classList.contains('no-intro')) {
    try { sessionStorage.setItem('talfahrt.intro', '1'); } catch (e) {}
    setTimeout(() => {
      const a = introMark.getBoundingClientRect();
      const b = heroMark ? heroMark.getBoundingClientRect() : null;
      if (!b || a.width < 4 || b.width < 4) {
        finish();
        return;
      }
      intro.classList.add('intro--fly');
      introMark.style.transform = `translate(${(b.left - a.left).toFixed(1)}px, ${(b.top - a.top).toFixed(1)}px)`;
      let done = false;
      const land = () => { if (!done) { done = true; finish(); } };
      introMark.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') land(); });
      setTimeout(land, 900);
    }, 1250);
  } else {
    d.classList.add('no-intro');
    finish();
  }
})();
