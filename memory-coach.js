'use strict';

// 词屿原创的练习编排。题型证据与复习日程分开，避免一轮三次相遇变成三次长期复习。
const MEMORY_SKILLS = { meaning: '词义', spelling: '拼写', listening: '听辨' };
let memoryFilter = 'all';
function memorySkill(type) { return type === 'card' ? null : type === 'dictation' || type === 'listenChoice' ? 'listening' : type === 'spell' || type === 'cloze' ? 'spelling' : 'meaning'; }
function memoryEvidence(w, verdict, type) {
  const skill = memorySkill(type); if (!skill) return;
  const st = ensureSt(w.key);
  if (!st.memory || typeof st.memory !== 'object' || Array.isArray(st.memory)) st.memory = {};
  if (!Object.keys(st.memory).length && st.bad > 0) st.memory.meaning = { ok: 0, bad: st.bad, streak: 0, last: st.last || 0, verdict: 'again' };
  const old = st.memory[skill] || {};
  const n = v => Math.max(0, Math.min(100000, Number(v) || 0));
  const good = verdict === 'good';
  st.memory[skill] = { ok: n(old.ok) + (good ? 1 : 0), bad: n(old.bad) + (good ? 0 : 1), streak: good ? n(old.streak) + 1 : 0, last: Date.now(), verdict };
  save();
}
function memoryWeakSkills(w) {
  const st = stOf(w.key); if (!st || st.chopped) return [];
  const data = st.memory || {};
  const skills = Object.keys(MEMORY_SKILLS).filter(k => data[k] && data[k].bad > 0 && (data[k].streak || 0) < 2);
  skills.sort((a,b) => ((data[b].bad || 0) - (data[b].streak || 0)) - ((data[a].bad || 0) - (data[a].streak || 0)));
  // 旧版没有题型证据，保留旧错词，明确以词义回想起步。
  if (!Object.keys(data).length && st.bad > 0) skills.push('meaning');
  return skills;
}
function memoryUnique(words) { const seen = new Set(); return words.filter(w => { const id = norm(w.w); if (seen.has(id)) return false; seen.add(id); return true; }); }
let memoryWordCatalog=null,memoryCatalogDecks=[];
function memoryTrackedWords() {
  const decks=allDecks();
  if(!memoryWordCatalog||decks.length!==memoryCatalogDecks.length||decks.some((d,i)=>d!==memoryCatalogDecks[i]?.deck||d.words!==memoryCatalogDecks[i]?.words||d.words.length!==memoryCatalogDecks[i]?.length)){
    memoryWordCatalog=new Map();memoryCatalogDecks=decks.map(d=>({deck:d,words:d.words,length:d.words.length}));
    decks.forEach(d=>d.words.forEach(w=>{const id=norm(w.w);if(!memoryWordCatalog.has(id))memoryWordCatalog.set(id,{...w,deck:d.id,key:d.id+'::'+w.w});}));
  }
  const words=[],seen=new Set();for(const key of Object.keys(store.words)){const id=bookWordId(key),w=memoryWordCatalog.get(id);if(w&&!seen.has(id)&&stOf(w.key)){seen.add(id);words.push(w);}}return words;
}
function memoryWeakWords(filter = 'all') {
  return memoryUnique(memoryTrackedWords().filter(w => { const skills = memoryWeakSkills(w); return filter === 'all' ? skills.length : skills.includes(filter); }).sort((a,b) => (stOf(b.key).last || 0) - (stOf(a.key).last || 0)));
}
function memoryHistoricalWords() { return memoryUnique(memoryTrackedWords().filter(w => stOf(w.key).bad > 0).sort((a,b) => (stOf(b.key).bad || 0) - (stOf(a.key).bad || 0) || (stOf(b.key).last || 0) - (stOf(a.key).last || 0))); }
function memoryStartLoop(words) {
  const count = typeof youthWarmupCount === 'function' ? youthWarmupCount() : 5;
  const picked = memoryUnique(words || buildQueue()).slice(0, count);
  if (!picked.length) { toast('今天的到期词和新词目标已完成。可以去读一篇文章，或补练薄弱项。'); return; }
  const recognition = picked.map((w,i) => memoryWeakSkills(w)[0] === 'listening' ? 'listenChoice' : ['choice','reverse','listenChoice'][i % 3]);
  const production = picked.map((w,i) => memoryWeakSkills(w)[0] === 'listening' ? 'dictation' : i % 3 === 2 ? 'dictation' : 'spell');
  startSession('mixed', { words: picked.concat(picked, picked), types: picked.map(() => 'card').concat(recognition, production), memory: { words: picked, results: Object.create(null), committed: Object.create(null), retries: Object.create(null), baseLength: picked.length * 3 } });
}
function memoryStartWeak() {
  const words = memoryWeakWords(memoryFilter).slice(0,10);
  if (!words.length) { toast('这个分项暂时没有待补练词。'); return; }
  const types = words.map(w => { const skill = memoryFilter === 'all' ? memoryWeakSkills(w)[0] : memoryFilter; return skill === 'spelling' ? 'spell' : skill === 'listening' ? 'dictation' : 'reverse'; });
  startSession('mixed', { words, types });
  session.memoryFocus = true; render();
}
function memoryLoopResult(w, verdict) {
  const loop = session.memory; if (!loop) return false;
  const type = typeOf(), result = loop.results[w.key] || (loop.results[w.key] = { self: null, checks: [] });
  if (type === 'card') { result.self = verdict; save(); return true; }
  const graded = session.memoryHint && verdict === 'good' ? 'hard' : verdict;
  result.checks.push({ type, verdict: graded, hint: !!session.memoryHint });
  memoryEvidence(w, graded, type);
  session.total++; if (graded === 'good') session.correct++;
  if (graded !== 'good' && !loop.retries[w.key]) {
    loop.retries[w.key] = true; session.words.push(w); session.types.push(type);
  }
  const lastStage = session.idx >= loop.words.length * 2;
  if (lastStage && !loop.committed[w.key]) {
    const overall = result.checks.some(c => c.verdict === 'again') ? 'again' : result.checks.some(c => c.verdict === 'hard') || result.self !== 'good' ? 'hard' : 'good';
    const wasNew = recordAnswer(w, overall); loop.committed[w.key] = overall;
    session[wasNew ? 'newCount' : 'reviewCount']++;
  }
  youthHandleResult(w, graded); return true;
}
function memoryStageHtml() {
  if (!session?.memory) return session?.memoryFocus ? '<p class="memory-stage">专项补练 · 按这个词的薄弱项出题。连续两次不看提示答对，该分项才退出待补练。</p>' : '';
  const count = session.memory.words.length, stage = session.idx >= count * 3 ? 3 : Math.floor(session.idx / count);
  return '<div class="memory-stage"><div class="memory-stage-steps">' + ['认识它','换个方式想起','独立写出来','再见一次'].map((s,i) => i === 3 && stage !== 3 ? '' : '<span class="' + (i === stage ? 'on' : '') + '">' + (i+1) + ' · ' + s + '</span>').join('') + '</div><p>' + ['先看发音、例句，建立自己的联系；这一步是自评。','不依赖原来的例句，试试词义回想或听辨。','先独立作答；需要时可以看提示，提示练习会单独标记。','刚才卡住的词，再给自己一次机会。'][stage] + '</p></div>';
}
function memoryHintHtml(w) {
  if (!session?.memory && !session?.memoryFocus) return '';
  if (session.answered) return session.memoryHint ? '<p class="memory-hint-used">本题使用过提示，按“需巩固”记录。</p>' : '';
  return '<div class="btn-row memory-help"><button class="btn ghost small" data-memory-action="hint">给我一点提示</button><button class="btn ghost small" data-memory-action="skip">暂时想不起来</button></div>' + (session.memoryHint ? '<div class="memory-hint">首字母：' + esc(maskHint(w.w)) + exampleClue(w) + '</div>' : '');
}
function memoryNoteHtml(w) {
  const note = String(stOf(w.key)?.mnemonic || '').slice(0,240);
  const scene = MEMORY_SCENES[norm(w.w)];
  return '<div class="memory-association">' + (scene ? '<details class="memory-scene-wrap"' + (w.e ? '' : ' open') + '><summary><span aria-hidden="true">' + scene[0] + '</span> 校园联想 · ' + esc(scene[1]) + '</summary><div class="memory-scene"><div><p>' + esc(scene[2]) + '</p><p class="muted">' + esc(scene[3]) + '</p><small>词屿原创例句 · 用来理解语境</small></div></div></details>' : '') + '<details class="memory-note"' + (note ? ' open' : '') + '><summary>' + (note ? '我的助记' : '写一句自己的助记') + '</summary><label>想到的画面、词根或自己的例句<textarea data-memory-note="' + esc(w.key) + '" maxlength="240" rows="2" placeholder="例如：把这个词和自己的课堂、运动或旅行联系起来。">' + esc(note) + '</textarea></label><small data-memory-save role="status">' + (note ? '已保存在本机 · 随学习备份迁移' : '最多 240 字，输入后自动保存到本机') + '</small></details></div>';
}
function memoryHomeHtml() {
  const count = youthWarmupCount(), weak = memoryWeakWords().length;
  return '<section class="panel memory-home"><div><span class="youth-eyebrow">SMALL STEPS, REAL RECALL</span><h3>' + count + ' 词小循环</h3><p>认识一遍 → 换种方式回想 → 独立拼写。每次只练一小组。</p></div><div class="btn-row"><button class="btn primary" data-memory-action="loop">开始 ' + count + ' 词闯关</button><button class="btn" data-memory-action="weak"' + (weak ? '' : ' disabled') + '>补练薄弱项' + (weak ? ' · ' + weak : '') + '</button></div></section>';
}
function memoryWeakPanelHtml() {
  const all = memoryWeakWords(), words = memoryWeakWords(memoryFilter);
  return '<section class="panel memory-weak"><h3>哪里卡住，就从哪里练起</h3><p class="muted">词义、拼写、听辨分开记录；连续两次独立答对后，该分项退出待补练。旧记录没有题型信息的词先从词义练起。</p><div class="seg memory-filters">' + [['all','全部待补练'],...Object.entries(MEMORY_SKILLS)].map(([key,name]) => '<button data-memory-filter="' + key + '" aria-pressed="' + (key === memoryFilter) + '" class="' + (key === memoryFilter ? 'on' : '') + '">' + name + ' · ' + (key === 'all' ? all.length : memoryWeakWords(key).length) + '</button>').join('') + '</div><div class="memory-weak-list">' + (words.length ? words.slice(0,10).map(w => '<span><b>' + esc(w.w) + '</b><small>' + memoryWeakSkills(w).map(k => MEMORY_SKILLS[k]).join(' / ') + '</small></span>').join('') : '<p>这个分项暂时没有待补练词，按自己的节奏继续就好。</p>') + '</div><button class="btn primary" data-memory-action="weak"' + (words.length ? '' : ' disabled') + '>针对性补练 · 最多 10 词</button></section>';
}
function memorySummaryHtml() {
  const loop = session.memory;
  const failed = loop.words.filter(w => loop.committed[w.key] !== 'good');
  return '<section class="panel youth-summary">' + youthSummaryLead() + '<h3>完成 ' + loop.words.length + ' 词小循环</h3><p>独立答对 ' + session.correct + ' / ' + session.total + ' 次客观练习；翻卡自评不计入正确次数。</p><p class="muted">每个词本轮只更新一次复习间隔。答错后再答对，仍保留短期复习，给记忆一点时间。</p><div class="memory-recap">' + loop.words.map(w => '<div><b>' + esc(w.w) + '</b><span>' + esc(w.m) + '</span><small>' + (loop.committed[w.key] === 'good' ? '本轮独立通过 · 之后再回顾' : '已加入短期复习 · 还可再见') + '</small></div>').join('') + '</div><div class="btn-row"><button class="btn primary" data-act="goto" data-view="home">回到主场</button>' + (failed.length ? '<button class="btn" data-memory-action="retry-loop">再熟悉刚才的词</button>' : '<button class="btn" data-memory-action="loop">再来一小组</button>') + '<button class="btn ghost" data-act="goto" data-view="wrong">看薄弱项</button></div></section>';
}
function memoryFocusSummaryHtml() {
  const remain = memoryWeakWords(memoryFilter).length;
  return '<section class="panel youth-summary">' + youthSummaryLead() + '<h3>这一组专项补练完成了</h3><p>独立答对 ' + session.correct + ' / ' + session.total + ' 次。使用提示的正确答案按“需巩固”记录。</p><p class="muted">' + (remain ? '当前分项还有 ' + remain + ' 个词待巩固。连续两次独立答对后退出待补练。' : '当前分项的待补练已完成。历史错词仍保留，方便之后回顾。') + '</p><div class="btn-row"><button class="btn primary" data-act="goto" data-view="home">回到主场</button>' + (remain ? '<button class="btn" data-memory-action="weak">继续专项补练</button>' : '') + '<button class="btn ghost" data-act="goto" data-view="wrong">看薄弱项</button></div></section>';
}
document.addEventListener('click', e => {
  const filter = e.target.closest?.('[data-memory-filter]'); if (filter) { memoryFilter = filter.dataset.memoryFilter; render(); document.querySelector('[data-memory-filter="' + memoryFilter + '"]')?.focus({preventScroll:true}); return; }
  const button = e.target.closest?.('[data-memory-action]'); if (!button || button.disabled) return;
  const action = button.dataset.memoryAction;
  if (action === 'loop') memoryStartLoop();
  if (action === 'weak') memoryStartWeak();
  if (action === 'retry-loop') memoryStartLoop(session.memory.words.filter(w => session.memory.committed[w.key] !== 'good'));
  if (action === 'hint' && currentWord() && !session.answered) { session.memoryHint = true; const text = document.querySelector('#answer')?.value; render(); if (document.querySelector('#answer')) document.querySelector('#answer').value = text || ''; }
  if (action === 'skip' && currentWord() && !session.answered) {
    const w = currentWord(); session.answered = true; session.feedback = {ok:false,expected:w.w,typed:''};
    if (session.choice) { session.choice.answered = true; session.choice.correct = false; }
    applyResult(w,'again'); render();
  }
});
document.addEventListener('input', e => { const key = e.target.dataset.memoryNote; if (!key) return; ensureSt(key).mnemonic = e.target.value.slice(0,240); save(); const status = e.target.closest('.memory-note')?.querySelector('[data-memory-save]'); if (status) status.textContent = '已记录 · 即将自动保存到本机'; });
