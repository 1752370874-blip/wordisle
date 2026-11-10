'use strict';
const BOOK_LEVELS=['小学','初中','高中','大学','雅思','托福','GRE','通用','自定义'];
let bookLibraryLevel='全部',bookLibraryQuery='',bookStateSource=null,bookStateIndex=new Map();
let bookProgressRevision=0;
const bookProgressCache=new Map();
function bookInvalidateProgress(){bookProgressRevision++;bookProgressCache.clear();}
function bookPlanLimit(value){const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(300,Math.floor(n))):20;}
function bookPlanDaily(){return bookPlanLimit(store.settings.dailyNew);}
function bookPlanQuota(){return Math.max(0,bookPlanDaily()-(store.days[dayKey()]?.new||0));}
function bookPlanMigrateSettings(settings,saved){
  settings.dailyNew=bookPlanLimit(settings.dailyNew);
  if(saved&&Array.isArray(saved.deckIds)&&saved.deckIds.length===0&&!(saved.bookCatalogVersion>=1)){
    const oldIds=['cet4','cet6','collins5','gre','ielts','kaoyan','oxford3000','oxford5000','toefl'];
    settings.deckIds=allDecks().filter(d=>oldIds.includes(d.id)||!builtinDecks().some(b=>b.id===d.id)).map(d=>d.id);
  }
  settings.bookCatalogVersion=1;
}
function bookWordId(key){const i=String(key).indexOf('::');return norm(i<0?key:String(key).slice(i+2));}
function bookStateReset(){bookStateSource=null;bookInvalidateProgress();}
function bookStateOf(key){
  if(bookStateSource!==store.words){
    bookStateSource=store.words;bookStateIndex=new Map();const notes=new Map();
    Object.keys(store.words).forEach(k=>{const st=store.words[k];if(!st||typeof st!=='object')return;const id=bookWordId(k),oldKey=bookStateIndex.get(id),old=oldKey&&store.words[oldKey];if(typeof st.mnemonic==='string'&&st.mnemonic.trim())notes.set(id,st.mnemonic);if(!old||(st.last||0)>(old.last||0)||(st.last||0)===(old.last||0)&&(st.reps||0)>(old.reps||0))bookStateIndex.set(id,k);});
    for(const [id,note] of notes){const st=store.words[bookStateIndex.get(id)];if(st&&!st.mnemonic)st.mnemonic=note;}
  }
  const id=bookWordId(key),oldKey=bookStateIndex.get(id),shared=oldKey&&store.words[oldKey],own=store.words[key];
  if(own&&(!shared||(own.last||0)>(shared.last||0))){bookStateIndex.set(id,key);return own;}
  return shared||own;
}
function bookStateCreated(key){bookStateIndex.set(bookWordId(key),key);}
function bookLevel(d){return d.level||(window.BOOK_CATALOG||[]).find(b=>b.id===d.id)?.level||'自定义';}
function bookProgress(d){let learned=0,mastered=0,due=0,next=Infinity;const now=Date.now(),old=bookProgressCache.get(d.id);if(old&&old.source===store.words&&old.words===d.words&&old.length===d.words.length&&old.revision===bookProgressRevision&&now>=old.at&&now<old.expires)return old.value;for(const w of d.words){const st=stOf(d.id+'::'+w.w);if(st&&st.s!=='new'){learned++;if(st.s==='mastered')mastered++;if((st.due||0)<=now)due++;else next=Math.min(next,st.due);}}const value={learned,mastered,due,next,remaining:d.words.length-learned};bookProgressCache.set(d.id,{source:store.words,words:d.words,length:d.words.length,revision:bookProgressRevision,at:now,expires:Math.min(now+30000,next),value});return value;}
function bookPlanDate(time){if(!Number.isFinite(time))return '学完第一个词后自动安排';const d=new Date(time);return (d.getMonth()+1)+'月'+d.getDate()+'日 '+pad2(d.getHours())+':'+pad2(d.getMinutes());}
function bookChoose(id){const book=deckById(id);if(!book)return;store.settings.deckIds=[id];save();state.deckId=null;MotionUi.resetScroll('home');go('home');toast('已选择《'+book.name+'》，已有单词进度保留。');}
function bookPlanOptions(){
  const ids=store.settings.deckIds||[],single=ids.length===1&&deckById(ids[0]);
  let html=single?'':'<option value="__keep" selected>当前组合 · '+activeDeckList().length+' 本词书</option>';
  for(const level of BOOK_LEVELS){const books=allDecks().filter(d=>bookLevel(d)===level);if(!books.length)continue;html+='<optgroup label="'+level+'">'+books.map(d=>'<option value="'+esc(d.id)+'"'+(single&&d.id===ids[0]?' selected':'')+'>'+esc(d.name)+' · '+d.words.length+' 词</option>').join('')+'</optgroup>';}
  return html;
}
function bookPlanHomeHtml(){
  const books=activeDeckList(),d=books.length===1?books[0]:null,pool=poolWords(),now=Date.now();let learned=0,due=0,next=Infinity;
  for(const w of pool){const st=stOf(w.key);if(st&&st.s!=='new'){learned++;if((st.due||0)<=now)due++;else next=Math.min(next,st.due);}}
  const daily=bookPlanDaily(),today=store.days[dayKey()]||{},left=bookPlanQuota();
  return '<section class="panel book-plan"><div class="book-plan-heading"><div><span class="youth-eyebrow">YOUR BOOK, YOUR PACE</span><h3>选本词书，轻松开练</h3></div><button class="btn ghost small" data-act="goto" data-view="decks">词书广场 · '+allDecks().length+' 本</button></div><div class="book-plan-fields"><label>正在学习的词书<select id="homeBook" data-book-plan="book" aria-label="选择学习词书">'+bookPlanOptions()+'</select></label><label class="book-daily-label">每日新词 <span>1—300 个</span><div class="book-daily"><input id="homeDaily" type="number" inputmode="numeric" min="1" max="300" step="1" value="'+daily+'" data-book-plan="daily" aria-label="每日新词数"><div role="group" aria-label="每日新词快捷设置">'+[20,50,100,300].map(n=>'<button data-book-daily="'+n+'" aria-pressed="'+(daily===n)+'" class="'+(daily===n?'on':'')+'">'+n+'</button>').join('')+'</div></div></label></div><div class="book-plan-progress"><div class="bar"><i style="width:'+Math.round(learned/Math.max(1,pool.length)*100)+'%"></i></div><p><span>'+esc(d?d.name:'当前词书组合')+' · 已学 '+learned+' / '+pool.length+' 词</span><span>今日新词（所有词书） '+(today.new||0)+' / '+daily+' · 还可学 '+Math.min(left,Math.max(0,pool.length-learned))+' 词</span></p></div><div class="book-review-line"><span><b>'+due+'</b> 个到期词'+(due?'等你回顾':'，暂时不用复习')+'</span><span>下次复习：'+(due?'现在可以回顾到期词':bookPlanDate(next))+'</span>'+(due>0||left>0&&pool.length>learned?'<button class="btn primary small" data-act="start">开始背词</button>':'<button class="btn primary small" disabled>'+(pool.length===0?'先选一本词书':left===0?'今日新词目标已完成':'本书新词已学完')+'</button>')+(due?'<button class="btn small" data-act="start" data-due="1" data-mode="card">只复习</button>':'')+'</div><details class="book-curve"><summary>艾宾浩斯复习安排 · 自动安排到期复习</summary><p>前密后疏，逐次拉开间隔；每次到期答对才推进阶段。模糊约 10 分钟后再见，忘记约 5 分钟后再见；提前练习不会推迟已安排的复习。</p><ol>'+WordIsleCurve.labels.map(s=>'<li>'+s+'</li>').join('')+'</ol><p>这里是逐次复习间隔，不是距离初学当天的累计天数。每日新词上限 300 个，复习另计；每轮最多 60 词，可以分组完成。具体记忆效果因人而异。</p>'+bookPlanUpcomingHtml()+'</details></section>';
}
function bookPlanUpcomingHtml(){const days=[];for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);days.push({key:dayKey(d),label:i===0?'今天':(d.getMonth()+1)+'/'+d.getDate(),n:0});}const now=Date.now();for(const w of poolWords()){const st=stOf(w.key);if(!st||st.s==='new')continue;const key=(st.due||0)<=now?days[0].key:dayKey(new Date(st.due));const day=days.find(d=>d.key===key);if(day)day.n++;}return '<h4>已安排的近 7 天复习</h4><div class="book-upcoming">'+days.map(d=>'<div><span>'+d.label+'</span><b>'+d.n+'</b><small>词</small></div>').join('')+'</div><p class="muted">仅统计当前词书已安排的词；新的学习和作答会更新安排。</p>';}
function bookLibraryBooks(){const q=norm(bookLibraryQuery);return allDecks().filter(d=>(bookLibraryLevel==='全部'||bookLevel(d)===bookLibraryLevel)&&(!q||norm(d.name+' '+(d.desc||'')+' '+d.id).includes(q)));}
function bookLibraryCards(){return bookLibraryBooks().map(d=>{const p=bookProgress(d),selected=deckActive(d.id);return '<article class="book-card '+(selected?'selected':'')+'"><div class="book-cover" data-level="'+esc(bookLevel(d))+'"><span>'+esc(bookLevel(d))+'</span><b>'+esc(d.name)+'</b><small>'+d.words.length+' 词</small></div><div class="book-card-body"><p class="muted">已学 '+p.learned+' · 到期 '+p.due+' · 待学 '+p.remaining+'</p><div class="bar"><i style="width:'+Math.round(p.learned/Math.max(1,d.words.length)*100)+'%"></i></div><p class="book-desc">'+esc(d.desc||'自己的学习词书')+'</p><div class="btn-row"><button class="btn small primary" data-book-choose="'+esc(d.id)+'">'+(selected?'继续学这本':'选这本')+'</button><button class="btn small ghost" data-act="open-deck" data-deck="'+esc(d.id)+'">看词表</button></div><details class="book-source"><summary>词书来源与组合</summary><p>'+esc(d.source||(window.BOOK_CATALOG||[]).find(x=>x.id===d.id)?.source||'用户导入')+'</p><label><input type="checkbox" data-set="deck" data-deck="'+esc(d.id)+'"'+(selected?' checked':'')+'> 加入当前词书组合</label></details></div></article>';}).join('')||'<p class="muted">没有找到这类词书，换个名称试试。</p>';}
function bookPlanLibrary(){return '<section class="panel book-library"><div class="book-plan-heading"><div><span class="youth-eyebrow">FIND YOUR NEXT CHAPTER</span><h3>词书广场</h3><p class="muted">小学到 GRE，选一本就能开始。换书保留同一个词的学习进度。</p></div><span class="badge">内置 '+builtinDecks().length+' 本</span></div><div class="seg book-levels" role="group" aria-label="词书阶段">'+['全部',...BOOK_LEVELS].map(level=>'<button data-book-level="'+level+'" class="'+(bookLibraryLevel===level?'on':'')+'" aria-pressed="'+(bookLibraryLevel===level)+'">'+level+'</button>').join('')+'</div><label class="book-search">找一本词书<input id="bookSearch" type="search" placeholder="搜索：小学、四级、雅思、GRE…" value="'+esc(bookLibraryQuery)+'"></label><p class="muted" id="bookMatchCount">找到 '+bookLibraryBooks().length+' 本词书</p><div class="book-grid" id="bookLibraryGrid">'+bookLibraryCards()+'</div></section>';}
function bookSetDaily(value){const n=bookPlanLimit(value);store.settings.dailyNew=n;save();render();if(Number(value)!==n)toast('每日新词已调整为 '+n+' 个，可设置 1—300 个。');}
document.addEventListener('change',e=>{if(e.target.dataset.bookPlan==='book'&&e.target.value!=='__keep')bookChoose(e.target.value);if(e.target.dataset.bookPlan==='daily')bookSetDaily(e.target.value);});
document.addEventListener('click',e=>{const choose=e.target.closest?.('[data-book-choose]');if(choose){bookChoose(choose.dataset.bookChoose);return;}const daily=e.target.closest?.('[data-book-daily]');if(daily){bookSetDaily(daily.dataset.bookDaily);return;}const level=e.target.closest?.('[data-book-level]');if(level){bookLibraryLevel=level.dataset.bookLevel;render();document.querySelector('[data-book-level="'+bookLibraryLevel+'"]')?.focus({preventScroll:true});}});
document.addEventListener('input',e=>{if(e.target.id!=='bookSearch')return;bookLibraryQuery=e.target.value;if(e.isComposing)return;const grid=document.querySelector('#bookLibraryGrid'),html=bookLibraryCards();if(grid.innerHTML!==html)grid.innerHTML=html;document.querySelector('#bookMatchCount').textContent='找到 '+bookLibraryBooks().length+' 本词书';});
document.addEventListener('compositionend',e=>{if(e.target.id==='bookSearch')requestAnimationFrame(()=>{if(e.target.isConnected)e.target.dispatchEvent(new Event('input',{bubbles:true}));});});
document.addEventListener('keydown',e=>{if(e.target.dataset.bookPlan==='daily'&&e.key==='Enter'){e.preventDefault();bookSetDaily(e.target.value);}});
setInterval(()=>{if(state.view==='home'&&!isTyping(document.activeElement))render();},30000);
