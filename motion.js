/* Edit motion settings here; the character artwork is never transformed. */
const HERO_MOTION = { duration:2.2, delay:.18 };
let heroHasPlayed=false;
const STORY_MOTION = { enabled:true, typingStep:.085, entrance:.85, travel:18 };
let greetingHasPlayed=false;
let heroPaperHasPlayed=false;
let bodyRevealCleanup;
const LINE_MOTION = { enabled:true, draw:.60, hold:.20, erase:.20, smoothing:1.1 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggleButton = document.querySelector('#motion-toggle');
const status = document.querySelector('#motion-status');
let manuallyReduced = false;
let motionContext;
function configureMotion() {
  bodyRevealCleanup?.();
  motionContext?.revert();
  const reduced = reducedMotion.matches || manuallyReduced;
  document.body.classList.toggle('motion-reduced',reduced);
  toggleButton?.setAttribute('aria-pressed', String(reduced));
  if (toggleButton) toggleButton.textContent = reduced ? 'Mouvement réduit' : 'Réduire le mouvement';
  status.textContent = reduced ? 'Les animations sont désactivées.' : 'Les animations sont activées.';
  if (!window.gsap) { status.textContent = 'Animation indisponible. Le visuel reste affiché.'; return; }
  if (reduced) return;
  motionContext = gsap.context(() => {
    if (LINE_MOTION.enabled) setupHeroIntro();
    if (STORY_MOTION.enabled) setupGreeting();
    if (window.ScrollTrigger && LINE_MOTION.enabled) {
      gsap.registerPlugin(ScrollTrigger);
      setupScrollLines();
      if (STORY_MOTION.enabled) setupStoryMotion();
    }
  });
}
toggleButton?.addEventListener('click', () => {
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
  // A single clip reveals the email marker and its contrasting text together.
  const timeline=lineTimeline(trigger,footer);
  timeline
    .fromTo(element,{clipPath:hidden},{clipPath:shown,duration:LINE_MOTION.draw,ease:'none'})
    .to(element,{clipPath:shown,duration:LINE_MOTION.hold,ease:'none'});
  // At the page bottom, rewind on upward scrolling without erasing the final view.
  if (!footer) timeline.to(element,{clipPath:hidden,duration:LINE_MOTION.erase,ease:'none'});
}
function setupScrollLines() {
  wipeLine('.heading-highlight','.works-heading');
  wipeLine('.email-reveal','.contact-email');
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

// A measured glyph reveal avoids changing line breaks or creating a span per letter.
function typewriter(element, scroll=false, delay=0) {
  if (!element) return;
  let wrap=element.querySelector(':scope > .typewriter-wrap');
  if (!wrap) {
    const original=[...element.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
    if (!original) return;
    const text=original.textContent;
    element.setAttribute('aria-label',text.trim());
    wrap=document.createElement('span');wrap.className='typewriter-wrap';wrap.setAttribute('aria-hidden','true');
    const visual=document.createElement('span');visual.className='typewriter-visual';visual.textContent=text;
    wrap.append(visual);
    const accessible=document.createElement('span');accessible.className='visually-hidden';accessible.textContent=text;
    original.replaceWith(accessible,wrap);
    if (element.matches('.speech-bubble')) element.removeAttribute('aria-label');
  }
  const visual=wrap.firstElementChild,text=visual.firstChild;
  const count=text.textContent.length,progress={letters:0};
  const range=document.createRange();
  gsap.set(visual,{clipPath:'inset(0 100% 0 0)'});
  gsap.set(wrap,{'--typing-position':'0px','--typing-cursor':0});
  const setClip=gsap.quickSetter(visual,'clipPath');
  const setCaret=gsap.quickSetter(wrap,'--typing-position');
  let last=-1;
  const update=()=>{
    const index=Math.round(progress.letters);
    if (index===last) return;last=index;
    range.setStart(text,0);range.setEnd(text,index);
    const textRect=visual.getBoundingClientRect();
    const width=index ? Math.max(0,range.getBoundingClientRect().right-textRect.left) : 0;
    setClip(index===count ? 'inset(0 0 0 0)' : `inset(0 ${Math.max(0,textRect.width-width)}px 0 0)`);
    setCaret(`${Math.min(width,textRect.width)}px`);
  };
  const timeline=gsap.timeline({delay,scrollTrigger:scroll ? {
    trigger:element,start:'top 88%',toggleActions:'play none none reverse'
  } : undefined});
  timeline.set(wrap,{'--typing-cursor':1})
    .to(progress,{letters:count,duration:count*STORY_MOTION.typingStep,ease:'none',snap:{letters:1},onUpdate:update})
    .set(wrap,{'--typing-cursor':0});
}
function setupGreeting() {
  if (greetingHasPlayed) return;
  greetingHasPlayed=true;
  typewriter(document.querySelector('.speech-bubble'),false,.45);
}
function setupStoryMotion() {
  typewriter(document.querySelector('#about-title'),true);
  typewriter(document.querySelector('#shoutouts-title'),true);
  typewriter(document.querySelector('#reflections-title'),true);
  typewriter(document.querySelector('#contact-title'),true);
  bodyRevealCleanup=setupBodyLines();

  // Visual groups enter once while reading downward; scrolling back above them reverses.
  for (const selector of ['.book-slot','.television-slot','.browser-slot','.logo-grid',
    '.shoutouts-people','.shoutouts-second-row','.shoutouts-initiatives']) {
    const element=document.querySelector(selector);
    gsap.from(element,{
      y:STORY_MOTION.travel,opacity:0,duration:STORY_MOTION.entrance,ease:'power2.out',
      scrollTrigger:{trigger:element,start:'top 90%',toggleActions:'play none none reverse'}
    });
  }
  for (const selector of ['.about-sheet','.collective-sheet','.contact-sheet']) {
    const paper=document.querySelector(selector);
    const rotation=Number(gsap.getProperty(paper,'rotation'));
    gsap.fromTo(paper,{y:22,rotation:rotation-1.1,scale:.99},{
      y:0,rotation,scale:1,duration:1.1,ease:'power2.out',
      scrollTrigger:{trigger:paper,start:'top 92%',toggleActions:'play none none reverse'}
    });
  }
  if (!heroPaperHasPlayed) {
    heroPaperHasPlayed=true;
    gsap.from('.hero-paper',{y:8,rotation:-.15,duration:1.05,ease:'power2.out'});
  }
}

// Reveal existing line boxes without splitting paragraphs or their links into copies.
function setupBodyLines() {
  const renders=new Map();let active=true;
  const observer=new ResizeObserver(entries=>{
    if (active) for (const {target} of entries) renders.get(target)?.();
  });
  const paragraphs=document.querySelectorAll('.intro-copy p,.about-copy p,.works-intro,.reflections-copy p,.experience-copy p,.shoutouts-copy p,.contact-sheet > p');
  for (const paragraph of paragraphs) {
    paragraph.classList.add('body-line-reveal');
    const state={progress:0};
    gsap.set(paragraph,{maskImage:'none',webkitMaskImage:'none',maskRepeat:'no-repeat',webkitMaskRepeat:'no-repeat',maskSize:'auto',webkitMaskSize:'auto',maskPosition:'0 0',webkitMaskPosition:'0 0'});
    const image=gsap.quickSetter(paragraph,'maskImage');
    const position=gsap.quickSetter(paragraph,'maskPosition');
    const size=gsap.quickSetter(paragraph,'maskSize');
    let count=1,lineHeight=30;
    const measure=()=>{
      lineHeight=parseFloat(getComputedStyle(paragraph).lineHeight);
      count=Math.max(1,Math.round(paragraph.clientHeight/lineHeight));
    };
    const render=()=>{
      if (!active) return;
      measure();
      if (state.progress>=.9999) { image('none');return; }
      const gradients=[],positions=[],sizes=[];
      const travel=1+(count-1)*.22;
      for (let i=0;i<count;i++) {
        const alpha=Math.max(0,Math.min(1,state.progress*travel-i*.22));
        const color=`rgba(0,0,0,${alpha.toFixed(4)})`;
        gradients.push(`linear-gradient(${color},${color})`);
        positions.push(`0 ${i*lineHeight}px`);
        sizes.push(`100% ${lineHeight+.1}px`);
      }
      image(gradients.join(','));position(positions.join(','));size(sizes.join(','));
    };
    measure();render();renders.set(paragraph,render);observer.observe(paragraph);
    const hero=paragraph.matches('.intro-copy p');
    gsap.to(state,{progress:1,duration:Math.min(1.35,.5+(count-1)*.11),ease:'none',delay:hero?.8:0,onUpdate:render,
      scrollTrigger:hero ? undefined : {trigger:paragraph,start:'top 92%',toggleActions:'play complete play reverse',onRefresh:render}
    });
  }
  return ()=>{active=false;observer.disconnect();renders.clear();};
}
