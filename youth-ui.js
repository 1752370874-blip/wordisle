'use strict';
const youthPhrases = ['今天不用满分，也值得认真开场。','卡住的时候，先看一个例句，再和它打个照面。','你不需要和别人比速度，找到自己的节奏就很好。','休息一会儿也没关系。回来时，我们从一个词开始。','多见一次，就是在慢慢熟悉。','今天学到的一点点，也会成为明天的底气。'];
let youthPhraseIndex = 0, youthFeedbackTimer = 0;
const youthPaths = {
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
 decks:'M4 4h7v16H4z M14 4h6v16h-6z M7 8h1 M17 8h1',
 readings:'M3 5q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1z M12 6v15',
 dict:'M4 4h12v16H4z M8 8h4 M8 12h3 M18 14l4 7 M16 17l4-2',
 listen:'M4 13v-2a8 8 0 0 1 16 0v2 M4 12h3v8H4z M17 12h3v8h-3z',
 companion:'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 10h1 M15 10h1 M9 14q3 2 6 0',
 oral:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v3 M9 22h6',
 textmap:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
 wrong:'M5 3h14v18l-7-4-7 4z M9 7l6 6 M15 7l-6 6',
 stats:'M4 20V10h4v10 M10 20V4h4v16 M16 20v-7h4v7',
 settings:'M9 3h6l1 4 4 2v6l-4 2-1 4H9l-1-4-4-2V9l4-2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 bolt:'M13 2 4 14h7l-1 8 10-13h-8z',
 star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
 arrow:'M4 12h15 M13 5l7 7-7 7',
 flag:'M5 21V3l13 2v9L5 12',
 smile:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M8 9h.1 M16 9h.1 M8 14q4 5 8 0'
};
function youthIcon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(youthPaths[name]||youthPaths.star)+'"/></svg>';}
function youthMood(){return store.settings.youthMoodDay===dayKey()&&['bright','steady','rest'].includes(store.settings.youthMood)?store.settings.youthMood:'steady';}
function youthWarmupCount(){return youthMood()==='rest'?3:5;}
function youthWeek(){const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dayKey(d),active=hasActivity(key);days.push('<div class="youth-day '+(active?'active ':'')+(i===0?'today':'')+'" aria-label="'+esc((d.getMonth()+1)+'月'+d.getDate()+'日，'+(active?'有练习记录':'留白的一天'))+'"><span>'+['日','一','二','三','四','五','六'][d.getDay()]+'</span><i>'+(active?'✓':i===0?'·':'')+'</i></div>')}return days.join('');}
function youthSummaryLead(){return '<div class="youth-summary-lead"><span class="youth-finish-mark">'+youthIcon('flag')+'</span><div><div class="youth-eyebrow">SESSION COMPLETE</div><h2>这一程，你认真走过了。</h2><p>记住的留作底气，没记住的，下次再见。休息一下也很好。</p></div></div>';}
function youthBurst(){if(store.settings.liquidGlass===false||store.settings.youthQuiet||store.settings.youthEncouragement===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const host=document.getElementById('youthConfetti');if(!host)return;host.replaceChildren();for(let i=0;i<12;i++){const dot=document.createElement('i');dot.style.setProperty('--x',(Math.random()*300-150)+'px');dot.style.setProperty('--y',(-50-Math.random()*120)+'px');dot.style.setProperty('--r',(Math.random()*260-130)+'deg');dot.style.background=['#D5F568','#FF7459','#75D1BF'][i%3];host.appendChild(dot)}setTimeout(()=>host.replaceChildren(),1100);}
function youthHandleResult(word,verdict){
 if(!session)return;session.youthCombo=verdict==='good'?(session.youthCombo||0)+1:0;
 if(store.settings.youthQuiet||store.settings.youthEncouragement===false)return;
 const messages=verdict==='good'?['记起来了！这个词又熟悉了一点。','稳稳接住，继续你的节奏。','这次努力，有了一个小小回响。']:verdict==='hard'?['有印象就是起点，看看例句，再熟悉一点。']:['没关系，我们已经知道下次要多看哪里了。','这个词值得再见一次。先看意思，再读例句。'];
 const total=(store.days[dayKey()]?.new||0)+(store.days[dayKey()]?.review||0),milestone=[5,10,20].includes(total);
 const message=milestone?'今天已完成 '+total+' 次练习，这些小步都算数。':messages[session.total%messages.length];
 const el=document.getElementById('youthFeedback');if(el){el.querySelector('span').textContent=message;el.hidden=false;clearTimeout(youthFeedbackTimer);youthFeedbackTimer=setTimeout(()=>{el.hidden=true},2800)}
 if(milestone||session.youthCombo===3)youthBurst();
}
function youthSettingsHtml(){return '<section class="panel"><h3>陪伴与反馈</h3><div class="form"><div class="field"><div><div class="field-label">安静模式</div><div class="field-note">收起大幅插画和庆祝动画，暂停自动发音和答题音效；仍可手动朗读。</div></div><label class="switch"><input type="checkbox" data-youth-setting="quiet"'+(store.settings.youthQuiet?' checked':'')+'><span class="track"></span></label></div><div class="field"><div><div class="field-label">学习鼓励</div><div class="field-note">答题后给出简短反馈与小里程碑；随时可以关闭。</div></div><label class="switch"><input type="checkbox" data-youth-setting="encouragement"'+(store.settings.youthEncouragement!==false?' checked':'')+'><span class="track"></span></label></div></div></section>';}
function youthSync(){
 MotionUi.preferences();
 FeedbackSound.sync();
 document.body.classList.toggle('youth-quiet',!!store.settings.youthQuiet);
 const quiet=document.getElementById('youthQuiet');if(quiet){quiet.setAttribute('aria-pressed',String(!!store.settings.youthQuiet));quiet.innerHTML=youthIcon('smile')+'<span>安静模式</span>';quiet.title=store.settings.youthQuiet?'关闭安静模式，回到活力界面':'收起插画与庆祝动画';}
 document.querySelectorAll('[data-youth-setting]').forEach(input=>{input.checked=input.dataset.youthSetting==='quiet'?!!store.settings.youthQuiet:store.settings.youthEncouragement!==false;});
 document.querySelectorAll('#nav button').forEach(btn=>{if(!btn.querySelector('.youth-nav-icon')){const icon=document.createElement('span');icon.className='youth-nav-icon';icon.innerHTML=youthIcon(btn.dataset.nav);btn.prepend(icon)}if(state.view==='study'&&btn.dataset.nav==='home')btn.classList.add('on');if(btn.classList.contains('on'))btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});
 if(store.settings.youthQuiet||store.settings.youthEncouragement===false){const f=document.getElementById('youthFeedback');if(f)f.hidden=true;document.getElementById('youthConfetti')?.replaceChildren()}
 const today=store.days[dayKey()]||{},chip=document.getElementById('todayChip');if(chip)chip.textContent='今日 '+((today.new||0)+(today.review||0))+' 次练习';
}
document.addEventListener('click',e=>{
 const mood=e.target.closest?.('[data-youth-mood]');if(mood){store.settings.youthMood=mood.dataset.youthMood;store.settings.youthMoodDay=dayKey();save();render();document.querySelector('[data-youth-mood="'+mood.dataset.youthMood+'"]')?.focus({preventScroll:true});return;}
 const button=e.target.closest?.('[data-youth-action]');if(!button)return;
 if(button.dataset.youthAction==='quiet'){store.settings.youthQuiet=!store.settings.youthQuiet;if(store.settings.youthQuiet)stopSpeak();save();youthSync();toast(store.settings.youthQuiet?'已切换安静模式，按自己的节奏来。':'活力模式已就位，一点点来。');}
 if(button.dataset.youthAction==='cheer'){const el=document.getElementById('youthBuddyQuote');if(el){el.textContent=youthPhrases[youthPhraseIndex++%youthPhrases.length]}}
 if(button.dataset.youthAction==='warmup'){const list=buildQueue().slice(0,youthWarmupCount());if(!list.length){toast('当前没有可练的词，去词库看看吧。');return}startSession(store.settings.practice,{words:list})}
});
document.addEventListener('change',e=>{const name=e.target.dataset.youthSetting;if(!name)return;store.settings[name==='quiet'?'youthQuiet':'youthEncouragement']=e.target.checked;if(name==='quiet'&&e.target.checked)stopSpeak();save();youthSync()});
