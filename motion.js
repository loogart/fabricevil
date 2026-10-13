/* Edit motion settings here; the character artwork is never transformed. */
const HERO_MOTION = { paperShift:14 };
const SECTION_MOTION = { enabled:true, entrance:.75, stagger:.13, inkDuration:2.2 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggleButton = document.querySelector('#motion-toggle');
const status = document.querySelector('#motion-status');
let manuallyReduced = false;
let motionContext;
function configureMotion() {
  motionContext?.revert();
  const reduced = reducedMotion.matches || manuallyReduced;
  document.body.classList.toggle('motion-reduced',reduced);
  toggleButton.setAttribute('aria-pressed', String(reduced));
  toggleButton.textContent = reduced ? 'Mouvement réduit' : 'Réduire le mouvement';
  status.textContent = reduced ? 'Les animations sont désactivées.' : 'Les animations sont activées.';
  if (!window.gsap) { status.textContent = 'Animation indisponible. Le visuel reste affiché.'; return; }
  if (reduced) return;
  motionContext = gsap.context(() => {
    gsap.from('.hero-paper', {y:12, rotation:-.35, duration:1.05, ease:'power2.out'});
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to('.paper-accent', {y:HERO_MOTION.paperShift, ease:'none', scrollTrigger:{trigger:'.hero-paper', start:'top top', end:'bottom top', scrub:true}});
      if (SECTION_MOTION.enabled) setupSectionMotion();
    }
  });
}
toggleButton.addEventListener('click', () => {
  if (reducedMotion.matches) { status.textContent = 'La préférence de mouvement réduit de votre appareil est respectée.'; return; }
  manuallyReduced = !manuallyReduced;
  configureMotion();
});
reducedMotion.addEventListener('change',configureMotion);
const menuButton = document.querySelector('.mobile-menu');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded',String(open));
  document.querySelector('#mobile-nav').hidden = !open;
  menuButton.querySelector('span').textContent = open ? '−' : '＋';
});
configureMotion();

// Scale wrappers while leaving the supplied SVG root dimensions intact.
const svgObserver = new ResizeObserver(entries => {
  for (const {target} of entries) {
    const img=target.querySelector(':scope > img, :scope > svg');
    if (img) img.style.transform=`scale(${target.clientWidth / Number(img.getAttribute('width'))})`;
  }
});
document.querySelectorAll('.svg-fit').forEach(el=>svgObserver.observe(el));
document.querySelectorAll('#mobile-nav a').forEach(link=>link.addEventListener('click',()=>{
  document.querySelector('#mobile-nav').hidden=true;
  menuButton.setAttribute('aria-expanded','false');
  menuButton.querySelector('span').textContent='＋';
}));

// Approval sample: only Livres et docus and Réflexions receive new motion.
function setupSectionMotion() {
  gsap.from('.heading-highlight', {
    clipPath:'inset(0 100% 0 0)', duration:.65, ease:'power2.out',
    scrollTrigger:{trigger:'.works-heading',start:'top 88%',once:true}
  });
  gsap.from(['.book-slot','.television-slot','.browser-slot'], {
    y:24, opacity:0, duration:SECTION_MOTION.entrance,
    stagger:SECTION_MOTION.stagger, ease:'power2.out',
    scrollTrigger:{trigger:'.works-collage',start:'top 88%',once:true}
  });
  gsap.from('.collective-sheet', {
    y:22, opacity:0, rotation:2.5, duration:.9, ease:'power2.out',
    scrollTrigger:{trigger:'.collective-sheet',start:'top 90%',once:true}
  });
  const guide=document.querySelector('#reflection-ink-guide');
  const art=document.querySelector('#reflection-ink-art');
  const length=guide.getTotalLength();
  // Animate a reveal mask over the untouched, filled Figma vector.
  gsap.set(art,{attr:{mask:'url(#reflection-ink-mask)'}});
  gsap.set(guide,{strokeDasharray:length,strokeDashoffset:length});
  gsap.to(guide,{
    strokeDashoffset:0,duration:SECTION_MOTION.inkDuration,ease:'power1.inOut',
    scrollTrigger:{trigger:'.reflection-visual',start:'top 88%',once:true},
    // Remove the completed mask so every original detail remains visible.
    onComplete:()=>art.removeAttribute('mask')
  });
}
