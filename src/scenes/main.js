export function start(root, lang) {
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  const formats = [0, 1, 2].map((digits) => new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const ctx = {
    int: (v) => formats[0].format(Math.round(v) || 0),
    fixed1: (v) => formats[1].format(v),
    fixed2: (v) => formats[2].format(v)
  };
  const factories = { cluster: clusterScene, cache: cacheScene, rollout: rolloutScene, events: eventsScene, monitor: monitorScene };
  const build = (fig) => {
    try {
      const make = factories[fig.dataset.scene];
      if (!make) throw new Error(fig.dataset.scene);
      mount(fig, make(fig, ctx));
    } catch (error) {
      fig.classList.remove('is-pending');
    }
  };
  const figs = Array.from(root.querySelectorAll('.stage[data-scene]'));
  if (!('IntersectionObserver' in window)) {
    figs.forEach(build);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      build(e.target);
    }
  }, { rootMargin: '160px 0px' });
  figs.forEach((fig) => io.observe(fig));
}
