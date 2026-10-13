/* Edit motion settings here; the character artwork is never transformed. */
const HERO_MOTION = { duration:2.2, delay:.18 };
let heroHasPlayed=false;
const LINE_MOTION = { enabled:true, draw:.60, hold:.20, erase:.20, smoothing:1.1 };
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
    if (LINE_MOTION.enabled) setupHeroIntro();
    if (window.ScrollTrigger && LINE_MOTION.enabled) {
      gsap.registerPlugin(ScrollTrigger);
      setupScrollLines();
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

// Lines draw on entry, hold while the section is in view, and erase on exit.
// Every frame is controlled by scroll position, including when scrolling backward.
function lineTimeline(trigger, footer=false) {
  return gsap.timeline({scrollTrigger:{
    trigger,
    start:footer ? 'clamp(top 95%)' : 'top 85%',
    end:footer ? 'max' : 'bottom top',
    scrub:LINE_MOTION.smoothing,
    invalidateOnRefresh:true
  }});
}
function wipeLine(selector, trigger, footer=false) {
  const element=document.querySelector(selector);
  if (!element || getComputedStyle(element).display==='none') return;
  const hidden='inset(0 100% 0 0)';
  const shown='inset(0 0% 0 0)';
  const ink=selector==='.email-highlight' ? document.querySelector('.email-ink') : null;
  let updateInk;
  if (ink) {
    gsap.set(ink,{clipPath:hidden});
    const setClip=gsap.quickSetter(ink,'clipPath');
    updateInk=()=>{
      const clip=getComputedStyle(element).clipPath;
      const percent=Number(clip.match(/inset\([^ ]+\s+([\d.]+)%/)?.[1] || 0);
      const marker=element.getBoundingClientRect(),text=ink.getBoundingClientRect();
      const edge=marker.left+marker.width*(1-percent/100);
      const right=Math.max(0,Math.min(text.width,text.right-edge));
      setClip(`inset(0 ${right}px 0 0)`);
    };
  }
  const timeline=lineTimeline(trigger,footer);
  if (updateInk) timeline.eventCallback('onUpdate',updateInk);
  timeline
    .fromTo(element,{clipPath:hidden},{clipPath:shown,duration:LINE_MOTION.draw,ease:'none'})
    .to(element,{clipPath:shown,duration:LINE_MOTION.hold,ease:'none'});
  // At the page bottom, rewind on upward scrolling without erasing the final view.
  if (!footer) timeline.to(element,{clipPath:hidden,duration:LINE_MOTION.erase,ease:'none'});
}
function setupScrollLines() {
  wipeLine('.heading-highlight','.works-heading');
  wipeLine('.email-highlight','.contact-email');
  wipeLine('.footer-doodle','.footer-doodle',true);
  wipeLine('.footer-rule','.footer-rule',true);

  const guide=document.querySelector('#reflection-ink-guide');
  const art=document.querySelector('#reflection-ink-art');
  const full=document.querySelector('#reflection-ink-full');
  const length=guide.getTotalLength();
  gsap.set(art,{attr:{mask:'url(#reflection-ink-mask)'}});
  gsap.set(full,{opacity:0});
  gsap.set(guide,{strokeDasharray:length,strokeDashoffset:length});
  lineTimeline('.reflection-doodle')
    .to(guide,{strokeDashoffset:0,duration:.58,ease:'none'})
    // Complete the original artwork exactly, including fine details outside the guide.
    .to(full,{opacity:1,duration:.02,ease:'none'})
    .to(full,{opacity:1,duration:.18,ease:'none'})
    .to(full,{opacity:0,duration:.02,ease:'none'})
    .to(guide,{strokeDashoffset:length,duration:.20,ease:'none'});
}

// The first-screen lines play once without requiring a scroll gesture.
function setupHeroIntro() {
  if (heroHasPlayed) return;
  heroHasPlayed=true;
  const hidden='inset(0 100% 0 0)';
  const shown='inset(0 0% 0 0)';
  gsap.timeline({delay:HERO_MOTION.delay})
    .fromTo('.paper-accent',{clipPath:hidden},{clipPath:shown,duration:HERO_MOTION.duration,ease:'power1.inOut'},0)
    .fromTo('.rule-wrap',{clipPath:hidden},{clipPath:shown,duration:1.35,ease:'power1.inOut'},.3);
}
