/* SVG character playback stays independent of the hero's text animation. */
(() => {
  const host = document.querySelector('.hero-character');
  if (!host) return;
  const surface = host.querySelector('.hero-character-animation');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animation, loading = false, inView = false;
  const syncPlayback = () => {
    if (!animation) return;
    if (inView && !document.hidden && !reducedMotion.matches) animation.play();
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
      animation = lottie.loadAnimation({
        container: surface, renderer: 'svg', loop: true, autoplay: false,
        animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', viewBoxSize: '170 180 600 780' }
      });
      animation.addEventListener('DOMLoaded', () => {
        animation.goToAndStop(0, true);
        host.classList.add('is-ready');
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
