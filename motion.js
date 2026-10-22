/* Edit motion settings here; the character artwork is never transformed. */
const HERO_MOTION = { duration:2.2, delay:.18 };
let heroHasPlayed=false;
const STORY_MOTION = { enabled:true, typingStep:.075, entrance:.75, travel:12 };
let greetingHasPlayed=false;
let heroPaperHasPlayed=false;
let heroTitleHasPlayed=false;
let bodyRevealCleanup;
let depthCleanup;
let dezodCleanup;
const LINE_MOTION = { enabled:true, draw:.60, hold:.20, erase:.20, smoothing:1.1 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggleButton = document.querySelector('#motion-toggle');
const status = document.querySelector('#motion-status');
let manuallyReduced = false;
let motionContext;
let motionHasInitialized=false;
const motionRenderers=new Set();
// Offset layout coordinates deliberately ignore paper rotation, entrance transforms and hover depth.
function layoutTop(element) {
  if(typeof element==='string') element=document.querySelector(element);
  let top=0;
  for(let node=element;node;node=node.offsetParent) top+=node.offsetTop;
  return top;
}
function viewportStart(element,fraction) { return ()=>layoutTop(element)-innerHeight*fraction; }
function layoutBottom(element) {
  if(typeof element==='string') element=document.querySelector(element);
  return layoutTop(element)+element.offsetHeight;
}
function configureMotion() {
  motionHasInitialized=true;
  motionRenderers.clear();
  dezodCleanup?.();
  depthCleanup?.();
  bodyRevealCleanup?.();
  motionContext?.revert();
  const reduced = reducedMotion.matches || manuallyReduced;
  document.body.classList.toggle('motion-reduced',reduced);
  toggleButton?.setAttribute('aria-pressed', String(reduced));
  if (toggleButton) toggleButton.textContent = reduced ? 'Mouvement réduit' : 'Réduire le mouvement';
  status.textContent = reduced ? 'Les animations sont désactivées.' : 'Les animations sont activées.';
  if (!window.gsap) { status.textContent = 'Animation indisponible. Le visuel reste affiché.'; return; }
  document.body.classList.toggle('dezod-motion-active',!reduced && !!window.ScrollTrigger);
  if (reduced) return;
  motionContext = gsap.context(() => {
    if (LINE_MOTION.enabled) setupHeroIntro();
    if (STORY_MOTION.enabled) { setupGreeting(); setupHeroTitle(); }
    if (window.ScrollTrigger && LINE_MOTION.enabled) {
      gsap.registerPlugin(ScrollTrigger);
      setupDezodSpotlight();
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
  menuButton.querySelector('.menu-icon').classList.toggle('is-open',open);
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
  menuButton.querySelector('.menu-icon').classList.remove('is-open');
}));

// Lines draw on entry, hold while the section is in view, and erase on exit.
// Every frame is controlled by scroll position, including when scrolling backward.
function lineTimeline(trigger, footer=false) {
  return gsap.timeline({scrollTrigger:{
    trigger,
    start:footer ? ()=>Math.max(0,Math.min(layoutTop(trigger)-innerHeight*.95,ScrollTrigger.maxScroll(window)-1)) : viewportStart(trigger,.85),
    end:footer ? 'max' : ()=>layoutBottom(trigger),
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
  motionRenderers.add(()=>{last=-1;update();});
  const timeline=gsap.timeline({delay,scrollTrigger:scroll ? {
    trigger:element,start:viewportStart(element,.88),end:()=>layoutBottom(element),toggleActions:'play complete play reverse'
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

  setupPaperArrivals();
  if (!heroPaperHasPlayed) {
    heroPaperHasPlayed=true;
    gsap.from('.hero-paper',{x:-8,y:24,rotation:-.65,duration:.75,ease:'power2.out'});
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
    measure();render();renders.set(paragraph,render);motionRenderers.add(render);observer.observe(paragraph);
    const hero=paragraph.matches('.intro-copy p');
    gsap.to(state,{progress:1,duration:Math.min(1.35,.5+(count-1)*.11),ease:'none',delay:hero?.8:.12,onUpdate:render,
      scrollTrigger:hero ? undefined : {trigger:paragraph,start:viewportStart(paragraph,.92),end:()=>layoutBottom(paragraph),toggleActions:'play complete play reverse',onRefresh:render}
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
    scrollTrigger:{trigger:'.reflection-photo',start:viewportStart('.reflection-photo',.92),end:()=>layoutBottom('.reflection-photo'),toggleActions:'play complete play reverse'}
  });
  gsap.fromTo('.contact-paperclip',{rotation:-105},{
    rotation:-58.87,duration:1,ease:'power3.out',
    scrollTrigger:{trigger:'.contact-paperclip',start:viewportStart('.contact-paperclip',.90),end:()=>layoutBottom('.contact-paperclip'),toggleActions:'play reverse play reverse'}
  });
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
  gsap.timeline({scrollTrigger:{trigger:'.reflection-bubble',start:viewportStart('.reflection-bubble',.90),end:viewportStart('.reflection-bubble',.32),scrub:.8,invalidateOnRefresh:true}})
    .to(guide,{strokeDashoffset:0,duration:.96,ease:'none'})
    .to(full,{opacity:1,duration:.04,ease:'none'});
}

// Entrances follow scroll progress so upward scrolling naturally puts the paper back.
function setupPaperArrivals() {
  const narrow=()=>window.matchMedia('(max-width:575px)').matches;
  const arrive=(element,from,to={},footer=false)=>gsap.fromTo(element,from,{
    x:0,y:0,rotation:0,rotationY:0,scale:1,opacity:1,...to,
    ease:'power4.out',
    scrollTrigger:{trigger:element,start:viewportStart(element,.95),end:viewportStart(element,footer?.83:.76),scrub:footer?.18:.24,invalidateOnRefresh:true}
  });
  for (const [selector,side,angle] of [
    ['.about-sheet',-1,-.9],['.works-content',1,.65],
    ['.reflections-copy',-1,-.5],['.experience-copy',1,.5],
    ['.shoutouts-copy',-1,-.6],
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
        scrollTrigger:{trigger:element,start:viewportStart(element,.96),end:viewportStart(element,.72),scrub:.24,invalidateOnRefresh:true}
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
      x:()=>direction()*Math.min(220,window.innerWidth*.35),y:20,
      rotation:()=>direction()*5,scale:.95,opacity:.12
    },{
      x:0,y:0,rotation:0,scale:1,opacity:1,ease:'power1.out',
      scrollTrigger:{trigger:card,start:()=>layoutTop(card)-innerHeight*(.98-(index%columns())*.005),end:viewportStart(card,.46),scrub:.85,invalidateOnRefresh:true}
    });
  });
  document.querySelectorAll('.shoutout-card,.shoutout-logo').forEach((card,index)=>{
    gsap.fromTo(card,{
      x:()=>Math.min(240,window.innerWidth*.4),y:24,
      rotation:5+(index%3)*1.5,rotationY:-6,scale:.97,opacity:.12
    },{
      x:0,y:0,rotation:0,rotationY:0,scale:1,opacity:1,ease:'power1.out',
      scrollTrigger:{trigger:card,start:viewportStart(card,.98),end:viewportStart(card,.46),scrub:.9,invalidateOnRefresh:true}
    });
  });
  const footer=document.querySelector('.site-footer');
  const footerSlot=footer.closest('.footer-arrival-slot');
  gsap.timeline({scrollTrigger:{
    id:'footer-paper-arrival',trigger:footerSlot,start:viewportStart(footerSlot,.88),end:()=>Math.min(layoutBottom(footerSlot)-innerHeight,ScrollTrigger.maxScroll(window)),
    scrub:1,invalidateOnRefresh:true
  }})
    .fromTo(footer,{
      x:()=>narrow()?16:40,y:()=>window.innerHeight*.6+footer.offsetWidth*.1,
      rotation:-5.5,scale:.985,opacity:1,transformOrigin:'50% 100%'
    },{
      x:0,y:0,rotation:.25,scale:1,duration:1,ease:'power1.out'
    },.12)
    .to(footer,{rotation:0,duration:.18,ease:'sine.out'});
}

// Initialize after real fonts, image layout and native scroll restoration are ready.
// A refresh alone does not repaint custom text masks or reconcile skipped toggle callbacks.
function synchronizeMotionToScroll() {
  if(!window.ScrollTrigger || reducedMotion.matches || manuallyReduced) return;
  ScrollTrigger.update();
  for(const trigger of ScrollTrigger.getAll()) {
    const animation=trigger.animation;
    if(!animation)continue;
    if(trigger.vars.scrub) {
      trigger.getTween()?.progress(1);
      animation.totalProgress(trigger.progress,false);
    } else if(trigger.progress===1) {
      animation.totalProgress(1,false).pause();
    } else if(trigger.scroll()<trigger.start) {
      animation.pause(0,false);
    } else if(animation.totalProgress()<1) {
      animation.play();
    }
  }
  motionRenderers.forEach(render=>render());
}
// A reload fallback stays in this tab only. Fresh visits and new anchor links
// still use normal browser navigation; no page position is sent or stored remotely.
const navigationType=performance.getEntriesByType('navigation')[0]?.type;
const scrollStorageKey=()=>`fabrice-scroll:${location.pathname}${location.search}${location.hash}`;
function readReloadPosition() {
  if(navigationType!=='reload')return null;
  try {
    const position=JSON.parse(sessionStorage.getItem(scrollStorageKey()));
    return Number.isFinite(position?.y) && Number.isFinite(position?.x) ? position : null;
  } catch { return null; }
}
function rememberScrollPosition() {
  try {sessionStorage.setItem(scrollStorageKey(),JSON.stringify({x:scrollX,y:scrollY}));} catch { /* Native restoration remains available if tab storage is disabled. */ }
}
window.addEventListener('pagehide',rememberScrollPosition);
window.addEventListener('beforeunload',rememberScrollPosition);
let layoutRefreshTimer;
function refreshMotionLayout() {
  if(!motionHasInitialized || !window.ScrollTrigger)return;
  const x=scrollX,y=scrollY;
  const root=document.documentElement;
  const behavior=root.style.getPropertyValue('scroll-behavior');
  const priority=root.style.getPropertyPriority('scroll-behavior');
  // Refresh temporarily visits scroll zero internally. It must never smooth-scroll
  // there, or overwrite the visitor's restored position while measurements run.
  root.style.setProperty('scroll-behavior','auto','important');
  ScrollTrigger.refresh();
  window.scrollTo({left:x,top:y,behavior:'instant'});
  synchronizeMotionToScroll();
  if(behavior)root.style.setProperty('scroll-behavior',behavior,priority);
  else root.style.removeProperty('scroll-behavior');
}
function queueMotionRefresh() {
  if(!motionHasInitialized)return;
  clearTimeout(layoutRefreshTimer);
  layoutRefreshTimer=setTimeout(()=>{layoutRefreshTimer=null;requestAnimationFrame(refreshMotionLayout);},100);
}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const pageLoaded=document.readyState==='complete' ? Promise.resolve() : new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
Promise.all([document.fonts.ready,pageLoaded]).then(async()=>{
  await nextFrame();await nextFrame();
  const restoredPosition=readReloadPosition();
  const initialPosition=restoredPosition || {x:scrollX,y:scrollY};
  if(restoredPosition)window.scrollTo({left:initialPosition.x,top:initialPosition.y,behavior:'instant'});
  configureMotion();
  // Building from() entrances must not change the restored viewport.
  window.scrollTo({left:initialPosition.x,top:initialPosition.y,behavior:'instant'});
  refreshMotionLayout();
  // Follow native restoration without forcing the visitor to scroll or resetting their position.
  await nextFrame();refreshMotionLayout();
});
window.addEventListener('pageshow',()=>{requestAnimationFrame(()=>requestAnimationFrame(queueMotionRefresh));});
// Let native smooth anchor navigation finish before a pending image/layout refresh.
window.addEventListener('scroll',()=>{if(layoutRefreshTimer)queueMotionRefresh();},{passive:true});
document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)queueMotionRefresh();},true);
const pageLayoutObserver=new ResizeObserver(queueMotionRefresh);
pageLayoutObserver.observe(document.querySelector('main'));
if(window.ScrollTrigger)ScrollTrigger.addEventListener('refresh',()=>motionRenderers.forEach(render=>render()));

// The camera moves inward while the original logo pieces resolve into place.
function setupDezodSpotlight() {
  const section=document.querySelector('.dezod-spotlight');
  const frame=section.querySelector('.dezod-logo-frame');
  const logoPieces=[...frame.querySelectorAll('g > path')];
  const patternPieces=[...section.querySelectorAll('.dezod-pattern > path')];
  // Keep the paper in normal document flow: no pin spacer can separate it from its heading.
  const scene=gsap.timeline({scrollTrigger:{
    id:'dezod-assembly',trigger:section,start:viewportStart(section,.82),end:viewportStart(section,.28),
    scrub:.45,invalidateOnRefresh:true
  }});
  scene.fromTo(frame,{scale:.64,z:-140,y:24},{scale:1,z:0,y:0,duration:.60,ease:'power2.out'},0);
  logoPieces.forEach((piece,index)=>{
    const direction=index%2?1:-1;
    scene.fromTo(piece,{
      x:direction*(110+(index%4)*35),y:((index%3)-1)*85,
      rotation:direction*(16+(index%4)*7),scale:.8,opacity:0,transformOrigin:'50% 50%'
    },{x:0,y:0,rotation:0,scale:1,opacity:1,duration:.40,ease:'power2.out'},.02+(index%6)*.024);
  });
  patternPieces.forEach((piece,index)=>{
    scene.fromTo(piece,{x:(index%2?1:-1)*45,y:(index%3-1)*35,rotation:(index%2?1:-1)*8,scale:1.10,opacity:.45,transformOrigin:'50% 50%'},
      {x:0,y:0,rotation:0,scale:1,opacity:1,duration:.9,ease:'power1.out'},0);
  });
  scene.fromTo(section.querySelector('.dezod-story'),{y:14},{y:0,duration:.4,ease:'power2.out'},.42);

  const cleanups=[];
  // Keep prose intact and fade its natural lines, rather than typing every character.
  const paragraph=section.querySelector('.dezod-scroll-copy');
  const state={progress:0};let active=true;
  gsap.set(paragraph,{maskRepeat:'no-repeat',maskPosition:'0 0'});
  const renderLines=()=>{
    if(!active)return;
    if(state.progress>=.9999){paragraph.style.maskImage='none';return;}
    const lineHeight=parseFloat(getComputedStyle(paragraph).lineHeight);
    const count=Math.max(1,Math.round(paragraph.clientHeight/lineHeight));
    const images=[],positions=[],sizes=[];
    for(let i=0;i<count;i++){
      const alpha=Math.max(0,Math.min(1,state.progress*(1+(count-1)*.3)-i*.3));
      const color=`rgba(0,0,0,${alpha})`;
      images.push(`linear-gradient(${color},${color})`);
      positions.push(`0 ${i*lineHeight}px`);sizes.push(`100% ${lineHeight+.1}px`);
    }
    paragraph.style.maskImage=images.join(',');
    paragraph.style.maskPosition=positions.join(',');paragraph.style.maskSize=sizes.join(',');
  };
  renderLines();
  motionRenderers.add(renderLines);
  const lineObserver=new ResizeObserver(renderLines);lineObserver.observe(paragraph);
  scene.to(state,{progress:1,duration:.32,ease:'none',onUpdate:renderLines},.56);
  cleanups.push(()=>{active=false;lineObserver.disconnect();paragraph.style.removeProperty('mask-image');paragraph.style.removeProperty('mask-position');paragraph.style.removeProperty('mask-size');});
  scene.fromTo(section.querySelector('.dezod-story-link'),{opacity:0,y:4},{opacity:1,y:0,duration:.12,ease:'power1.out'},.84);
  scene.to({}, {duration:.02},.98);
  dezodCleanup=()=>cleanups.forEach(cleanup=>cleanup());
}
