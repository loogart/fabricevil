/* Edit motion settings here; the character artwork is never transformed. */
const HERO_MOTION = { duration:2.2, delay:.18 };
let heroHasPlayed=false;
const STORY_MOTION = { enabled:true, typingStep:.075, entrance:.75, travel:12 };
let greetingHasPlayed=false;
let heroPaperHasPlayed=false;
let heroTitleHasPlayed=false;
let bodyRevealCleanup;
let depthCleanup;
const LINE_MOTION = { enabled:true, draw:.60, hold:.20, erase:.20, smoothing:1.1 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggleButton = document.querySelector('#motion-toggle');
const status = document.querySelector('#motion-status');
let manuallyReduced = false;
let motionContext;
function configureMotion() {
  depthCleanup?.();
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
    if (STORY_MOTION.enabled) { setupGreeting(); setupHeroTitle(); }
    if (window.ScrollTrigger && LINE_MOTION.enabled) {
      gsap.registerPlugin(ScrollTrigger);
      setupScrollLines();
      if (STORY_MOTION.enabled) { setupStoryMotion(); setupDetailMotion(); }
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
document.querySelectorAll('.surface-curl').forEach(button=>{
  button.addEventListener('click',()=>{
    const open=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(open));
    button.setAttribute('aria-label',open?'Replier le coin du papier':'Déplier le coin du papier');
    button.parentElement.classList.toggle('peel-open',open);
  });
});

// Scale wrappers while leaving the supplied SVG root dimensions intact.
const svgObserver = new ResizeObserver(entries => {
  for (const {target} of entries) {
    const img=target.querySelector(':scope > img, :scope > svg');
    if (img) {
      const x=target.clientWidth/Number(img.getAttribute('width'));
      const y=target.closest('.email-highlight') ? target.clientHeight/Number(img.getAttribute('height')) : x;
      img.style.transform=`scale(${x},${y})`;
    }
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
  setupBubbleTrim();


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
    trigger:element,start:'top 88%',toggleActions:'play complete play reverse'
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
// Words resolve in place with a measured typing rhythm and native wrapping.
function setupHeroTitle() {
  if (heroTitleHasPlayed) return;
  const heading=document.querySelector('#intro-title');
  if (!heading) return;
  heroTitleHasPlayed=true;
  const text=heading.textContent;
  const accessible=document.createElement('span');
  accessible.className='visually-hidden';accessible.textContent=text;
  const visual=document.createElement('span');
  visual.setAttribute('aria-hidden','true');
  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) { visual.append(document.createTextNode(token)); continue; }
    const word=document.createElement('span');
    word.className='hero-title-word';word.textContent=token;visual.append(word);
  }
  heading.replaceChildren(accessible,visual);
  const words=[...visual.querySelectorAll('.hero-title-word')];
  gsap.set(words,{opacity:0,filter:'blur(3px)'});
  const timeline=gsap.timeline({delay:.24});
  let position=0;
  for (const word of words) {
    timeline.to(word,{opacity:1,filter:'blur(0px)',duration:.24,ease:'power2.out'},position);
    position+=.11+Math.min(word.textContent.length,10)*.012;
    if (word.textContent.endsWith(':')) position+=.16;
  }
  timeline.set(words,{clearProps:'filter'});

}
function setupStoryMotion() {
  typewriter(document.querySelector('#about-title'),true);
  typewriter(document.querySelector('#shoutouts-title'),true);
  typewriter(document.querySelector('#reflections-title'),true);
  typewriter(document.querySelector('#contact-title'),true);
  bodyRevealCleanup=setupBodyLines();
  setupPaperUnfold();

  setupPaperArrivals();
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
  const paragraphs=document.querySelectorAll('.intro-copy p,.about-copy p,.reflections-copy p,.experience-copy p,.shoutouts-copy p,.contact-sheet > p');
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
    gsap.to(state,{progress:1,duration:Math.min(1.35,.5+(count-1)*.11),ease:'none',delay:hero?.8:.12,onUpdate:render,
      scrollTrigger:hero ? undefined : {trigger:paragraph,start:'top 92%',toggleActions:'play complete play reverse',onRefresh:render}
    });
  }
  return ()=>{active=false;observer.disconnect();renders.clear();};
}

// Pointer depth uses independent CSS rotation, preserving the original artwork and tilt.
function setupDetailMotion() {
  const hover=window.matchMedia('(hover:hover) and (pointer:fine)');
  const cards=[...document.querySelectorAll('.book-slot,.television-slot,.browser-slot,.collective-sheet,.shoutout-card,.shoutout-logo')];
  const removers=[];
  for (const card of cards) {
    card.classList.add('depth-card');
    const surface=card.querySelector('.shoutout-photo') || card;
    const portrait=surface.querySelector('img');
    if (surface.matches('.shoutout-photo') && portrait) surface.style.setProperty('--portrait-mask',`url("${portrait.getAttribute('src')}")`);
    const state={x:0,y:0,depth:0,lift:0,scale:1};
    let bounds;
    const render=()=>{
      card.style.setProperty('--tilt-x',String(-state.y || .001));
      card.style.setProperty('--tilt-y',String(state.x));
      card.style.setProperty('--tilt-angle',`${Math.hypot(state.x,state.y)*6}deg`);
      card.style.setProperty('--hover-depth',`${state.depth}px`);
      card.style.setProperty('--hover-lift',`${state.lift}px`);
      card.style.setProperty('--hover-scale',String(state.scale));
    };
    const enter=()=>{bounds=card.getBoundingClientRect();};
    const reset=()=>{
      bounds=null;
      gsap.to(state,{x:0,y:0,depth:0,lift:0,scale:1,duration:.5,ease:'power3.out',overwrite:true,onUpdate:render});
      surface.style.setProperty('--shine-opacity','0');
    };
    const move=event=>{
      if (!hover.matches) return;
      const rect=bounds || card.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
      const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
      gsap.to(state,{x,y,depth:24,lift:5,scale:1.018,duration:.35,ease:'power3.out',overwrite:true,onUpdate:render});
      surface.style.setProperty('--shine-x',`${(x+1)*50}%`);surface.style.setProperty('--shine-y',`${(y+1)*50}%`);
      surface.style.setProperty('--shine-opacity','1');
    };
    card.addEventListener('pointerenter',enter);card.addEventListener('pointermove',move);card.addEventListener('pointerleave',reset);
    removers.push(()=>{
      card.removeEventListener('pointerenter',enter);card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',reset);
      gsap.killTweensOf(state);Object.assign(state,{x:0,y:0,depth:0,lift:0,scale:1});render();surface.style.setProperty('--shine-opacity','0');
    });
  }
  depthCleanup=()=>removers.forEach(remove=>remove());
  gsap.from('.reflection-photo',{
    yPercent:65,opacity:0,duration:1.1,ease:'power3.out',
    scrollTrigger:{trigger:'.reflection-photo',start:'top 92%',toggleActions:'play complete play reverse'}
  });
  gsap.fromTo('.contact-paperclip',{rotation:-105},{
    rotation:-58.87,duration:1,ease:'power3.out',
    scrollTrigger:{trigger:'.contact-paperclip',start:'top 90%',end:'bottom top',toggleActions:'play reverse play reverse'}
  });
}

// Scroll opens one paper sheet; the layout and its original links stay intact.
function setupPaperUnfold() {
  const sheet=document.querySelector('.collective-sheet');
  const fold=sheet.querySelector('.paper-fold');
  const base=sheet.querySelector('.paper-base');
  const content=sheet.querySelector('.collective-content');
  gsap.set(fold,{display:'block',rotationX:-165,opacity:1});
  gsap.set(base,{display:'block',clipPath:'inset(0 0 50% 0)'});
  gsap.set(sheet,{backgroundImage:'none',clipPath:'inset(0 0 48% 0)',boxShadow:'0 2px 3px #0003'});
  gsap.set(content,{opacity:0});
  gsap.timeline({scrollTrigger:{
    trigger:sheet,start:'top 88%',end:'top 35%',scrub:.8,invalidateOnRefresh:true
  }})
    .to(sheet,{clipPath:'inset(0 0 0% 0)',boxShadow:'0 4px 8px #0004',duration:.8,ease:'none'},0)
    .to(fold,{rotationX:0,duration:.8,ease:'power1.inOut'},0)
    .set(base,{clipPath:'inset(0 0 0% 0)'},.8)
    .to(fold,{opacity:0,duration:.2,ease:'none'},.8)
    .to(content,{opacity:1,duration:.3,ease:'power1.out'},.7);
}

// Trim a guide mask while rendering the client's original filled outline unchanged.
function setupBubbleTrim() {
  const guide=document.querySelector('#bubble-trim-guide');
  const original=document.querySelector('#bubble-trim-original');
  const full=document.querySelector('#bubble-trim-full');
  const length=guide.getTotalLength();
  gsap.set(original,{attr:{mask:'url(#bubble-trim-mask)'}});
  gsap.set(guide,{strokeDasharray:length,strokeDashoffset:length});
  gsap.set(full,{opacity:0});
  gsap.timeline({scrollTrigger:{trigger:'.reflection-bubble',start:'top 90%',end:'top 32%',scrub:.8,invalidateOnRefresh:true}})
    .to(guide,{strokeDashoffset:0,duration:.96,ease:'none'})
    .to(full,{opacity:1,duration:.04,ease:'none'});
}

// Entrances follow scroll progress so upward scrolling naturally puts the paper back.
function setupPaperArrivals() {
  const narrow=()=>window.matchMedia('(max-width:575px)').matches;
  const arrive=(element,from,to={},footer=false)=>gsap.fromTo(element,from,{
    x:0,y:0,rotation:0,rotationY:0,scale:1,opacity:1,...to,
    ease:'power4.out',
    scrollTrigger:{trigger:element,start:'top 95%',end:footer?'clamp(top 83%)':'top 76%',scrub:footer?.18:.24,invalidateOnRefresh:true}
  });
  for (const [selector,side,angle] of [
    ['.about-sheet',-1,-.9],['.works-content',1,.65],
    ['.reflections-copy',-1,-.5],['.experience-copy',1,.5],
    ['.dezod-feature',-1,-1.2],['.shoutouts-copy',-1,-.6],
    ['.contact-sheet',1,.7]
  ]) {
    const element=document.querySelector(selector);
    const base=selector==='.about-sheet'?1.13:0;
    if (selector==='.about-sheet') {
      // A sheet pushed onto the table, with a brief overshoot before it settles.
      gsap.fromTo(element,{
        x:()=>narrow()?-38:-110,y:()=>narrow()?48:70,
        rotation:()=>narrow()?-9:-13,scale:.97,opacity:0,transformOrigin:'35% 70%'
      },{
        x:0,y:0,rotation:base,scale:1,opacity:1,ease:'back.out(1.15)',
        scrollTrigger:{trigger:element,start:'top 96%',end:'top 72%',scrub:.24,invalidateOnRefresh:true}
      });
      continue;
    }
    arrive(element,{x:()=>narrow()?0:side*34,y:()=>narrow()?26:42,
      rotation:()=>base+(narrow()?angle:angle*1.6),scale:.992,opacity:0}, {rotation:base});
  }
  for (const selector of ['.book-slot','.television-slot','.browser-slot']) {
    const element=document.querySelector(selector);
    const base=selector==='.browser-slot'?-5.07:0;
    arrive(element,{x:0,y:20,rotation:base-1.2,scale:.98,opacity:0},{rotation:base});
  }
  document.querySelectorAll('.logo-card').forEach((card,index)=>{
    const columns=()=>getComputedStyle(card.parentElement).gridTemplateColumns.split(' ').length;
    const direction=()=>index%columns()<columns()/2?-1:1;
    gsap.fromTo(card,{
      x:()=>direction()*(window.innerWidth+card.offsetWidth),y:34,
      rotation:()=>direction()*12,scale:.84,opacity:0
    },{
      x:0,y:0,rotation:0,scale:1,opacity:1,ease:'power4.out',
      scrollTrigger:{trigger:card,start:()=>`top ${96-(index%columns())*.7}%`,end:'top 76%',scrub:.22,invalidateOnRefresh:true}
    });
  });
  document.querySelectorAll('.shoutout-card,.shoutout-logo').forEach((card,index)=>{
    arrive(card,{x:()=>window.innerWidth+card.offsetWidth,y:38,
      rotation:18+(index%3)*3,rotationY:-24,scale:.92,opacity:0});
  });
  arrive(document.querySelector('.site-footer'),{x:0,y:84,rotation:-1.1,scale:.98,opacity:0},{},true);
}

// Keep viewport triggers aligned after the local typefaces finish loading.
document.fonts.ready.then(()=>window.ScrollTrigger?.refresh());
