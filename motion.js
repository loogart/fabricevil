/* Edit motion settings here; the character artwork is never transformed. */
const LINE_MOTION = { enabled:true, draw:.28, hold:.44, erase:.28 };
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
function lineTimeline(trigger, hero=false) {
  return gsap.timeline({scrollTrigger:{
    trigger,
    start:hero ? 'top top' : 'top bottom',
    end:'bottom top',
    scrub:true,
    invalidateOnRefresh:true
  }});
}
function wipeLine(selector, trigger, hero=false) {
  const element=document.querySelector(selector);
  if (!element) return;
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
  const timeline=lineTimeline(trigger,hero);
  if (updateInk) timeline.eventCallback('onUpdate',updateInk);
  timeline
    .fromTo(element,{clipPath:hidden},{clipPath:shown,duration:LINE_MOTION.draw,ease:'none'})
    .to(element,{clipPath:shown,duration:LINE_MOTION.hold,ease:'none'})
    .to(element,{clipPath:hidden,duration:LINE_MOTION.erase,ease:'none'});
}
function setupScrollLines() {
  wipeLine('.paper-accent','.hero-paper',true);
  wipeLine('.rule-wrap','.hero-paper',true);
  wipeLine('.heading-highlight','#oeuvres');
  wipeLine('.email-highlight','#contact');
  wipeLine('.footer-doodle','.site-footer');
  wipeLine('.footer-rule','.site-footer');

  const guide=document.querySelector('#reflection-ink-guide');
  const art=document.querySelector('#reflection-ink-art');
  const full=document.querySelector('#reflection-ink-full');
  const length=guide.getTotalLength();
  gsap.set(art,{attr:{mask:'url(#reflection-ink-mask)'}});
  gsap.set(full,{opacity:0});
  gsap.set(guide,{strokeDasharray:length,strokeDashoffset:length});
  lineTimeline('#reflexions')
    .to(guide,{strokeDashoffset:0,duration:.28,ease:'none'})
    // Complete the original artwork exactly, including fine details outside the guide.
    .to(full,{opacity:1,duration:.02,ease:'none'})
    .to(full,{opacity:1,duration:.40,ease:'none'})
    .to(full,{opacity:0,duration:.02,ease:'none'})
    .to(guide,{strokeDashoffset:length,duration:.28,ease:'none'});
}
