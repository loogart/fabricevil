/* SVG character playback stays independent of the hero's text animation. */
(() => {
  const host = document.querySelector('.hero-character');
  if (!host) return;
  const surface = host.querySelector('.hero-character-animation');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animation, loading = false, inView = false;
  let idle = false, idleRemaining = 0, idleTimer, idleStarted = 0;
  const resumeCycle = () => {
    idleTimer = undefined;
    idle = false;
    host.classList.remove('is-idle', 'is-idle-paused');
    syncPlayback();
  };
  const syncPlayback = () => {
    if (!animation) return;
    const active = inView && !document.hidden && !reducedMotion.matches;
    if (idle) {
      animation.pause();
      host.classList.toggle('is-idle-paused', !active);
      if (active && !idleTimer) {
        idleStarted = performance.now();
        idleTimer = setTimeout(resumeCycle, idleRemaining);
      } else if (!active && idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
        idleRemaining = Math.max(0, idleRemaining - (performance.now() - idleStarted));
      }
    } else if (active) animation.play();
    else animation.pause();
  };
  async function start() {
    if (loading || animation || reducedMotion.matches) return;
    loading = true;
    try {
      const [data] = await Promise.all([
        fetch('assets/fabrice-hero.json').then(response => {
          if (!response.ok) throw new Error('Character animation unavailable');
          return response.json();
        }),
        new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'vendor/lottie-light.min.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.append(script);
        })
      ]);
      if (reducedMotion.matches) { loading = false; return; }
      const eyes = data.layers.find(layer => layer.nm === 'eyes closed');
      if (eyes) eyes.cl = 'hero-blink-eyes';
      const head = data.layers.find(layer => layer.nm === 'head');
      const byIndex = new Map(data.layers.map(layer => [layer.ind, layer]));
      data.layers.forEach(layer => {
        let ancestor = layer;
        while (ancestor && ancestor !== head) ancestor = byIndex.get(ancestor.parent);
        if (head && ancestor === head) layer.cl = `${layer.cl || ''} hero-idle-head-part`.trim();
        if (layer.nm === '1 arm L') layer.cl = 'hero-idle-arm-left-part';
        if (layer.nm === '1 arm R') layer.cl = 'hero-idle-arm-right-part';
      });
      animation = lottie.loadAnimation({
        container: surface, renderer: 'svg', loop: false, autoplay: false,
        animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', viewBoxSize: '170 180 600 780' }
      });
      animation.addEventListener('DOMLoaded', () => {
        animation.goToAndStop(0, true);
        // Wrap already-positioned artwork so idle motion preserves Lottie's transforms.
        const wrapParts = (selector, className) => {
          const parts = [...surface.querySelectorAll(selector)];
          if (!parts.length) return;
          const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          wrapper.setAttribute('class', className);
          parts[0].before(wrapper);
          parts.forEach(part => wrapper.append(part));
        };
        wrapParts('.hero-idle-head-part', 'hero-idle-head');
        wrapParts('.hero-idle-arm-left-part', 'hero-idle-arm-left');
        wrapParts('.hero-idle-arm-right-part', 'hero-idle-arm-right');
        host.classList.add('is-ready');
        syncPlayback();
      });
      animation.addEventListener('complete', () => {
        idle = true;
        idleRemaining = 3000;
        animation.goToAndStop(0, true);
        host.classList.add('is-idle');
        syncPlayback();
      });
      animation.addEventListener('data_failed', () => host.classList.remove('is-ready'));
    } catch {
      // Keep the matching SVG poster visible if playback cannot load.
      host.classList.remove('is-ready');
      loading = false;
    }
  }
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) start();
    syncPlayback();
  }).observe(host);
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    host.classList.toggle('is-ready', !!animation && !reducedMotion.matches);
    if (!reducedMotion.matches && inView) start();
    syncPlayback();
  });
})();
