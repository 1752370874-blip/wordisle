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
function youthViewHome({due,avail,quota,today,dailyNew,practice,modes,quizReady}){
 const learned=(today.new||0)+(today.review||0),warm=youthWarmupCount(),mood=youthMood();
 const cue=mood==='rest'?'累了就慢一点，今天从 3 个词开始也很好。':mood==='bright'?'状态不错！把这份能量，留给一小段专注。':'跟着自己的节奏，一次只走一小步。';
 const canTrain=due>0||(avail>0&&quota>0);
 const plan=due?'先和 '+due+' 个到期词重逢，再慢慢认识新朋友。':avail&&quota>0?'今天还可以认识 '+Math.min(quota,avail)+' 个新词，不必一次完成。':'今天的小目标已完成，去阅读里看看它们，或者休息一下吧。';
 return bookPlanHomeHtml() + '<section class="youth-hero"><div class="youth-track" aria-hidden="true"></div><div class="youth-hero-copy"><div class="youth-eyebrow"><span class="youth-live-dot"></span> WORDISLE CLUB · '+esc(todayLabel())+'</div><h2>把今天，练成<br><em>自己的主场。</em></h2><p>'+plan+'</p><div class="btn-row"><button class="btn primary" '+(canTrain?'data-act="start"':'data-act="goto" data-view="readings"')+'>'+(canTrain?'开始今天的训练':'去阅读，换个节奏')+' '+youthIcon('arrow')+'</button>'+(canTrain?'<button class="btn youth-soft" data-youth-action="warmup">先热身 '+warm+' 个词</button>':'<button class="btn youth-soft" data-act="goto" data-view="decks">逛逛词库</button>')+'</div><div class="youth-hero-foot">'+youthIcon('flag')+' 一点点进步，也值得击个掌。</div></div><div class="youth-hero-art"><span class="youth-sticker">KEEP<br>MOVING!</span><img src="assets/youth-companion.png" alt="原创运动风动漫伙伴小屿，微笑着向你碰拳" width="400" height="550"><span class="youth-lap" aria-hidden="true">01<span>每次出发<br>都是新的可能</span></span></div></section>'+
 '<div class="youth-scoreboard"><div><span class="youth-score-icon lime">'+youthIcon('bolt')+'</span><p>今日练习<strong>'+learned+'<small> 次</small></strong></p></div><div><span class="youth-score-icon coral">'+youthIcon('decks')+'</span><p>等你回顾<strong>'+due+'<small> 个词</small></strong></p></div><div><span class="youth-score-icon mint">'+youthIcon('flag')+'</span><p>连续学习<strong>'+streak()+'<small> 天</small></strong></p></div></div>'+
 memoryHomeHtml() + '<div class="youth-home-grid"><section class="panel youth-training"><div class="youth-section-heading"><div><span class="youth-eyebrow">FIND YOUR RHYTHM</span><h3>挑一种，轻松开练</h3></div><span class="youth-number" aria-hidden="true">02</span></div><div class="seg youth-modes">'+modes.map((m,i)=>'<button data-act="practice" data-mode="'+m[0]+'" class="'+(practice===m[0]?'on':'')+'" aria-pressed="'+(practice===m[0])+'"><span>0'+(i+1)+'</span>'+m[1]+'</button>').join('')+'</div><p class="seg-note">当前：'+PRACTICE[practice].title+' · '+PRACTICE[practice].sub+'</p>'+(due?'<button class="btn ghost small" data-act="start" data-mode="card" data-due="1">只复习到期词</button>':'')+'<div class="youth-quiz"><div><b>来一场小测？</b><p class="muted">'+(quizReady>=3?'从今天练习过的词中抽题，看看哪里还想再练。':'先练习至少 3 个词，小测就会准备好。')+'</p></div><button class="btn" data-act="quiz"'+(quizReady>=3?'':' disabled')+'>开始小测 '+youthIcon('arrow')+'</button></div></section>'+
 '<aside class="panel youth-buddy-card"><div class="youth-buddy-head"><div class="youth-avatar"><img src="assets/youth-companion.png" alt="" width="60" height="80"></div><div><h3>小屿 · 你的学习搭子</h3><p>不催进度，陪你找到节奏。</p></div>'+youthIcon('smile')+'</div><p class="youth-mood-label">今天，想用什么节奏？</p><div class="youth-moods" role="group" aria-label="选择今天的学习节奏">'+[['bright','元气满格'],['steady','慢慢来'],['rest','有点累']].map(([id,label])=>'<button data-youth-mood="'+id+'" aria-pressed="'+(mood===id)+'">'+label+'</button>').join('')+'</div><p id="youthBuddyQuote" class="youth-quote" aria-live="polite">'+cue+'</p><button class="youth-text-button" data-youth-action="cheer">给自己一句鼓励 '+youthIcon('star')+'</button></aside></div>'+
 '<div class="youth-quicklinks">'+[['listen','听见新可能','实时听译 · 跟着停顿读懂','mint'],['companion','有人陪你想明白','AI 伴学 · 拆开难句与疑问','lime'],['readings','把好奇心读出来','外刊阅读 · 换个视角看世界','coral']].map(([id,title,note,tone])=>'<button class="youth-link-card '+tone+'" data-act="goto" data-view="'+id+'"><span class="youth-link-icon">'+youthIcon(id)+'</span><b>'+title+'</b><span>'+note+'</span>'+youthIcon('arrow')+'</button>').join('')+'</div>'+
 '<section class="panel youth-week"><div><h3>这一周，每一步都算数</h3><p class="muted">亮起的是有练习记录的日子；留白，也可以是休息。</p></div><div class="youth-week-days">'+youthWeek()+'</div></section><details class="youth-shortcuts"><summary>顺手的小捷径 · 键盘操作</summary><p>空格 显示答案 / 继续 · 1 认识 · 2 模糊 · 3 不认识 · R 发音 · Esc 结束本轮</p></details>';
}
function youthStudySupport(){const combo=session?.youthCombo||0;return '<div class="youth-study-support"><span class="youth-mini-avatar"><img src="assets/youth-companion.png" alt="" width="44" height="60"></span><span>'+(youthMood()==='rest'?'今天慢一点也没关系，认真看完一个词就很好。':combo>=3?'连续记起 '+combo+' 次。找到自己的手感了！':'不用一次全记住，先把注意力交给眼前这个词。')+'</span><b>'+ (combo>=3?'NICE FLOW':'ONE STEP AT A TIME')+'</b></div>';}
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
