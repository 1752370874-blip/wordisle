'use strict';
// 有界、可打断的界面反馈；动画从不延迟数据写入或阻止下一次操作。
const MotionUi=(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),owned=new Set(),byElement=new WeakMap(),detailRuns=new Map(),positions=new Map();
  let previous=null,lastHtml=null,composing=false,pendingRender=false,navFrame=0;
  const spring='cubic-bezier(.22,1,.36,1)',ease='cubic-bezier(.2,.7,.2,1)';
  function allowed(){return !media.matches&&store.settings.liquidGlass!==false&&!store.settings.youthQuiet;}
  function context(){const v=state.view;return v==='study'?'study:'+session?.idx+':'+currentWord()?.key:v==='decks'?'decks:'+(state.deckId||'list'):v==='readings'?'readings:'+(state.readingId||'list'):v==='dict'?'dict:'+(state.dictWord||'search'):v;}
  function stop(a){if(!a)return;owned.delete(a);const el=a.effect?.target;if(el&&byElement.get(el)===a)byElement.delete(el);a.cancel();}
  function animate(el,frames,options={}){
    if(!el||!allowed()||document.hidden||typeof el.animate!=='function')return null;
    stop(byElement.get(el));
    const a=el.animate(frames,{duration:200,easing:ease,...options});owned.add(a);byElement.set(el,a);
    const done=()=>{owned.delete(a);if(byElement.get(el)===a)byElement.delete(el);};a.onfinish=done;a.oncancel=done;return a;
  }
  function detailKey(d,i){return d.id||d.className+'|'+(d.querySelector(':scope > summary')?.textContent||'').trim()+'|'+i;}
  function controlKey(el){if(!el)return null;if(el.id)return '#'+CSS.escape(el.id);if(el.tagName==='SUMMARY')return '@summary:'+([...document.querySelectorAll('#view details')].indexOf(el.parentElement));if(el.dataset?.set==='deck'&&el.dataset.deck)return 'input[data-set="deck"][data-deck="'+CSS.escape(el.dataset.deck)+'"]';for(const key of ['data-memory-note','data-set','data-youth-setting','data-book-plan'])if(el.hasAttribute(key))return el.tagName.toLowerCase()+'['+key+'="'+CSS.escape(el.getAttribute(key))+'"]';return null;}
  function groups(){return [...document.querySelectorAll('#view .seg,#view .book-daily > div')];}
  function groupKey(el,i){return el.dataset.glass||el.className.replace(/motion-ready/g,'').trim()+'|'+i;}
  function geometry(el,host){const r=el.getBoundingClientRect(),h=host.getBoundingClientRect();return {x:r.left-h.left-host.clientLeft+host.scrollLeft,y:r.top-h.top-host.clientTop+host.scrollTop,w:r.width,h:r.height};}
  function before(){
    const ctx=context(),same=previous&&previous.ctx===ctx&&previous.session===(state.view==='study'?session:null);
    const host=document.querySelector('#view'),active=document.activeElement,key=controlKey(active);
    const details=new Map();if(host)host.querySelectorAll('details').forEach((d,i)=>details.set(detailKey(d,i),{open:detailRuns.get(d)?.open??d.open,initial:previous?.defaults?.get(detailKey(d,i))}));
    const segs=new Map();if(same)groups().forEach((g,i)=>{const pill=g.querySelector(':scope > .motion-seg-pill');const on=g.querySelector('button.on');if(on)segs.set(groupKey(g,i),geometry(pill||on,g));});
    if(previous&&previous.view!=='study'){positions.delete(previous.ctx);positions.set(previous.ctx,{x:scrollX,y:scrollY});if(positions.size>40)positions.delete(positions.keys().next().value);}
    const focus=same&&host?.contains(active)&&key?{key,value:active.value,initial:active.defaultValue,start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection,top:active.scrollTop,height:active.style.height}:null;
    return {ctx,same,view:state.view,session:state.view==='study'?session:null,focus,details,segs,progress:parseFloat(host?.querySelector('.study-head .bar > i')?.style.width)||0,scroll:{x:scrollX,y:scrollY},revealed:previous?.revealed,answered:previous?.answered,oldView:previous?.view,oldCtx:previous?.ctx};
  }
  function deferDuringComposition(){if(composing&&previous?.ctx===context()){pendingRender=true;return true;}if(composing){composing=false;pendingRender=false;}return false;}
  function commit(host,html,snap){
    const changed=!snap.same||lastHtml!==html;
    if(changed){for(const a of [...owned])if(a.effect?.target!==document.querySelector('#motionNavPill'))stop(a);for(const run of [...detailRuns.values()])run.finish();host.innerHTML=html;}
    lastHtml=html;snap.changed=changed;
    const defaults=changed?new Map():previous?.defaults||new Map();if(changed)host.querySelectorAll('details').forEach((d,i)=>{const key=detailKey(d,i);defaults.set(key,d.open);const old=snap.same&&snap.details.get(key);if(old&&old.initial===d.open)d.open=old.open;});
    if(snap.focus){const el=snap.focus.key.startsWith('@summary:')?host.querySelectorAll('details')[Number(snap.focus.key.slice(9))]?.querySelector(':scope > summary'):host.querySelector(snap.focus.key);if(el&&!el.disabled){if(el.defaultValue===snap.focus.initial&&typeof snap.focus.value==='string')el.value=snap.focus.value;if(el.style&&snap.focus.height)el.style.height=snap.focus.height;el.focus({preventScroll:true});try{el.setSelectionRange(snap.focus.start,snap.focus.end,snap.focus.direction)}catch(_){}el.scrollTop=snap.focus.top;}}
    const target=snap.same?snap.scroll:state.view==='study'?{x:0,y:0}:positions.get(snap.ctx)||{x:0,y:0};window.scrollTo({left:target.x,top:target.y,behavior:'instant'});
    previous={ctx:snap.ctx,view:state.view,session:snap.session,defaults,revealed:!!session?.revealed,answered:!!session?.answered};
  }
  function syncPill(host,target,id,old){
    if(!host||!target)return;let pill=host.querySelector(':scope > .'+id);
    if(!pill){pill=document.createElement('span');pill.className=id;pill.setAttribute('aria-hidden','true');if(id==='motion-nav-pill')pill.id='motionNavPill';host.prepend(pill);}
    const from=old||(pill.dataset.placed?geometry(pill,host):null),to=geometry(target,host);stop(byElement.get(pill));
    pill.style.width=to.w+'px';pill.style.height=to.h+'px';pill.style.transform='translate3d('+to.x+'px,'+to.y+'px,0)';pill.dataset.placed='1';host.classList.add('motion-ready');
    if(from&&Math.abs(from.x-to.x)+Math.abs(from.y-to.y)+Math.abs(from.w-to.w)+Math.abs(from.h-to.h)>1)animate(pill,[{transform:'translate3d('+from.x+'px,'+from.y+'px,0) scale('+from.w/to.w+','+from.h/to.h+')'},{transform:'translate3d('+to.x+'px,'+to.y+'px,0) scale(1)'}],{duration:id==='motion-nav-pill'?280:220,easing:spring});
  }
  function syncNav(){const nav=document.querySelector('#nav');syncPill(nav,nav?.querySelector('button[aria-current=page]'),'motion-nav-pill');}
  function finish(snap){
    preferences();syncNav();groups().forEach((g,i)=>syncPill(g,g.querySelector('button.on'),'motion-seg-pill',snap.segs.get(groupKey(g,i))));
    if(!snap.changed||!allowed())return;
    const host=document.querySelector('#view'),isStudy=state.view==='study';
    if(isStudy&&snap.oldView==='study'){const bar=host.querySelector('.study-head .bar > i'),value=parseFloat(bar?.style.width)||0;if(value>0&&value!==snap.progress)animate(bar,[{transform:'scaleX('+snap.progress/value+')'},{transform:'scaleX(1)'}],{duration:220});}
    if(snap.oldView!==state.view||!snap.same&&!isStudy){animate(host,[{opacity:.85,transform:'translate3d(0,8px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:210,easing:spring});}
    else if(isStudy&&!snap.same){animate(host.querySelector('.word-card')||host,[{opacity:.8,transform:'translate3d(10px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:180});}
    else if(isStudy){const reveal=!snap.revealed&&session?.revealed;const feedback=!snap.answered&&session?.answered;const el=reveal?host.querySelector('.reveal'):feedback?host.querySelector('.feedback'):null;animate(el,[{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:170});}
  }
  function preferences(){const on=allowed();document.body.classList.toggle('motion-off',!on);if(!on){for(const a of [...owned])stop(a);for(const run of [...detailRuns.values()])run.finish();}}
  function openDetail(d){
    const prior=detailRuns.get(d),open=!(prior?prior.open:d.open),start=d.getBoundingClientRect().height;prior?.finish();
    const summary=d.querySelector(':scope > summary');if(!summary)return;
    d.open=true;const full=d.getBoundingClientRect().height;const collapsed=summary.getBoundingClientRect().height+parseFloat(getComputedStyle(d).paddingTop||0)+parseFloat(getComputedStyle(d).paddingBottom||0)+parseFloat(getComputedStyle(d).borderTopWidth||0)+parseFloat(getComputedStyle(d).borderBottomWidth||0);
    const end=open?full:collapsed;if(Math.abs(end-start)>900){d.open=open;return;}
    summary.setAttribute('aria-expanded',String(open));d.style.overflow='hidden';const a=animate(d,[{height:start+'px'},{height:end+'px'}],{duration:190,easing:spring});
    if(!a){d.open=open;d.style.removeProperty('overflow');summary.removeAttribute('aria-expanded');return;}
    const run={open,finish:()=>{if(detailRuns.get(d)!==run)return;detailRuns.delete(d);d.open=open;d.style.removeProperty('overflow');summary.removeAttribute('aria-expanded');stop(a);}};detailRuns.set(d,run);const done=a.onfinish;a.onfinish=()=>{done?.();run.finish();};
  }
  document.addEventListener('click',e=>{const summary=e.target.closest?.('summary');const d=summary?.parentElement;if(e.defaultPrevented||!allowed()||!d?.matches('details.book-curve,details.book-source,details.memory-note,details.memory-scene-wrap,details.youth-shortcuts'))return;if(e.target.closest('a,button,input,textarea,select'))return;e.preventDefault();openDetail(d);});
  document.addEventListener('compositionstart',()=>{composing=true;});
  document.addEventListener('compositionend',e=>{composing=false;if(pendingRender||e.target.id==='dictQuery'){if(e.target.id==='dictQuery')state.dictQ=e.target.value;pendingRender=false;requestAnimationFrame(()=>render());}});
  const scheduleNav=()=>{if(navFrame)return;navFrame=requestAnimationFrame(()=>{navFrame=0;syncNav();});};
  addEventListener('resize',scheduleNav,{passive:true});media.addEventListener('change',()=>{preferences();scheduleNav();});document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const a of [...owned])stop(a);for(const run of [...detailRuns.values()])run.finish();}preferences();scheduleNav();});
  return {allowed,before,commit,finish,preferences,deferDuringComposition,animate,syncNav,resetScroll:key=>positions.delete(key),get activeAnimations(){return owned.size;},get composing(){return composing;}};
})();
