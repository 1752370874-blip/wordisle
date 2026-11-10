'use strict';

/* ============================================================
   单词本 —— 离线背单词应用
   桌面账号通过主进程加密保存学习记录
   ============================================================ */

/* ---------------- 小工具 ---------------- */
const $ = function (sel, root) { return (root || document).querySelector(sel); };
const DAY = 86400000;
const MIN = 60000;
const KEY = 'wordnote.v1';

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[\u2019']/g, "'").replace(/\s+/g, ' ').trim();
}
function todayLabel() {
  const d = new Date();
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + '日一二三四五六'[d.getDay()];
}
function isTyping(el) {
  const tag = (el && el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/* ---------------- 存储 ---------------- */
const DEFAULTS = { answerSounds: true, answerSoundVolume: 0.35, dailyNew: 20, autoSpeak: true, direction: 'en2zh', deckIds: ['cet4'], practice: 'card', ttsSource: 'youdao-us', ttsRate: 1, ttsSentenceSource: 'baidu', ttsMsVoice: 'en-US-AriaNeural', liquidGlass: true, bg: null, autoUpdate: false, updateSeen: '', aiEndpoint: '', aiModel: '', translationMode: 'model', aiCompanionMode: 'model' };
// 网页版把背景图单独存一个键，避免每次自动保存都重新序列化几 MB 的 data URL
const BG_DATA_KEY = 'wordisle.bgdata';

function blankStore() {
  return { v: 3, settings: Object.assign({}, DEFAULTS, {bookCatalogVersion:1}), words: {}, custom: [], days: {}, sources: [], sourcePractice: [], listeningPractice: [], privateDrafts: {}, reading: WordIsleReading.blank(), learningSession: null };
}

let store = blankStore();

function loadStore() {
  let raw = null;
  raw = AccountSession.raw;
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  if (!data || typeof data !== 'object') return;
  store = blankStore();
  store.words = (data.words && typeof data.words === 'object') ? data.words : {};
  store.custom = Array.isArray(data.custom) ? data.custom : [];
  store.days = (data.days && typeof data.days === 'object') ? data.days : {};
  store.sources = Array.isArray(data.sources) ? data.sources.filter(function (x) { return x && typeof x.id === 'string' && typeof x.text === 'string'; }).slice(0, 50) : [];
  store.sourcePractice = Array.isArray(data.sourcePractice) ? data.sourcePractice.filter(function (x) { return x && typeof x.sourceId === 'string' && typeof x.word === 'string'; }).slice(-2000) : [];
  store.listeningPractice = listeningValidateHistory(data.listeningPractice);
  store.reading = WordIsleReading.validate(data.reading);
  store.privateDrafts = data.privateDrafts && typeof data.privateDrafts === 'object' ? data.privateDrafts : {};
  store.learningSession = data.learningSession || null;
  store.settings = Object.assign({}, DEFAULTS, data.settings || {});
  if (!Array.isArray(store.settings.deckIds)) store.settings.deckIds = [];
  bookPlanMigrateSettings(store.settings, data.settings);
  const bg = store.settings.bg;
  store.settings.bg = (bg && typeof bg === 'object' && typeof bg.file === 'string' && bg.file)
    ? { file: bg.file.slice(0, 40), dim: bgDim() }
    : null;
  store.dictRecent = Array.isArray(data.dictRecent) ? data.dictRecent : [];
}

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 150);
}
// 液态玻璃开关：body.lg 控制整套玻璃样式
function applyGlass() {
  const on = store.settings.liquidGlass !== false;
  document.body.classList.toggle('lg', on);
  MotionUi.preferences();
}

/* ---------------- 背景图片 ----------------
   桌面版：主进程把选中的图复制进 userData/background，这里只存随机文件名，
   取用时换回 file:// 地址；网页版没有文件系统权限，退化成 data URL 单独存键。 */
const BG_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
let bgCssUrl = 'none';

const BG_DIM_DEFAULT = 58;
function bgDim() {
  const bg = store.settings.bg;
  if (!bg) return BG_DIM_DEFAULT;
  const n = parseInt(bg.dim, 10);
  return clamp(isNaN(n) ? BG_DIM_DEFAULT : n, 0, 88);
}
function readBgData() {
  return ''; // 旧版背景仅由主进程在首次注册时迁移。
}
function setBgCss(url) {
  bgCssUrl = url || 'none';
  document.documentElement.style.setProperty('--bg-url', bgCssUrl);
}
function applyBackground(quiet) {
  const bg = store.settings.bg;
  document.body.classList.toggle('has-bg', !!(bg && bg.file));
  document.documentElement.style.setProperty('--bg-dim', (bgDim() / 100).toFixed(2));
  if (!bg || !bg.file) { setBgCss('none'); return; }
  if (window.wordIsle && window.wordIsle.bgUrl) {
    window.wordIsle.bgUrl(bg.file).then(function (r) {
      if (r && r.url) setBgCss('url("' + r.url + '")');
      else { setBgCss('none'); if (!quiet) toast('背景图片文件已不在本机，去设置里重新选一张'); }
    }).catch(function () { setBgCss('none'); });
    return;
  }
  const data = readBgData();
  setBgCss(data && data.indexOf('data:image/') === 0 ? 'url("' + data + '")' : 'none');
}
function bgApply(file) {
  store.settings.bg = file ? { file: file, dim: bgDim() } : null;
  save();
  applyBackground();
  render();
}
function bgPick() {
  if (window.wordIsle && window.wordIsle.bgPick) {
    const old = (store.settings.bg && store.settings.bg.file) || '';
    window.wordIsle.bgPick(old).then(function (r) {
      if (!r || r.canceled) return;
      if (!r.ok) { toast(r.error || '设置背景失败'); return; }
      bgApply(r.file);
      toast('背景已更新');
    }).catch(function (e) { toast('设置背景失败：' + ((e && e.message) || e)); });
    return;
  }
  const input = $('#bgFile');
  if (input) input.click();
}
function bgPickLocal(file) { toast('请在桌面版中选择加密背景图片'); }
function bgClear() {
  const bg = store.settings.bg;
  if (!bg) return;
  if (window.wordIsle && window.wordIsle.bgClear && bg.file !== 'local') window.wordIsle.bgClear(bg.file);
  bgApply(null);
  toast('已恢复默认背景');
}
function flushSave() {
  try { ProductFlow.capture(); ReadingClub.capture(false); return AccountSession.save(JSON.stringify(store)).then(function () { ProductFlow.saved(true); return true; }).catch(function (e) { ProductFlow.saved(false); toast('加密保存失败：' + e.message); return false; }); }
  catch (e) { toast('加密保存失败：' + e.message); return Promise.resolve(false); }
}

/* ---------------- 更新检查 ----------------
   只读公开清单里的版本号，不上传任何本机信息；
   发现新版本只提示，下载与安装由用户自己点，不自动执行。 */
function currentRunningVersion() { return state.appVersion || (WordIsleVersion.parse(state.update?.current) ? state.update.current : ''); }
function loadAppInfo() {
  if (!window.wordIsle?.info) { state.appInfoError = true; return Promise.resolve(); }
  return window.wordIsle.info().then(info => {
    if (!WordIsleVersion.parse(info?.version)) throw Error('版本信息不可用');
    state.appVersion = info.version;
    state.appInfoError = false;
    if (state.view === 'settings') render();
  }).catch(() => { state.appInfoError = true; if (state.view === 'settings') render(); });
}
function updateStatusText() {
  const u = state.update;
  if (state.updateChecking) return '正在检查公开更新清单…';
  if (!u) return window.wordIsle ? '尚未检查更新' : '网页版不支持桌面更新检查';
  if (!u.ok) return '更新检查失败：' + (u.error || '暂时无法连接');
  const comparison = WordIsleVersion.compare(u.latest, currentRunningVersion());
  if (comparison === null) return '更新清单的版本信息不可用';
  return '公开清单版本 ' + u.latest + ' · ' + (comparison > 0 ? '有更高版本可下载' : comparison === 0 ? '当前版本与清单一致' : '当前运行版本高于清单，无需更新');
}
function applyUpdateResult(result, manual) {
  const r = result || { ok:false, error:'未收到更新信息' };
  state.updateChecking = false;
  if (!state.appVersion && WordIsleVersion.parse(r.current)) state.appVersion = r.current;
  const comparison = r.ok ? WordIsleVersion.compare(r.latest, currentRunningVersion()) : null;
  state.update = Object.assign({}, r, {hasUpdate: r.ok && comparison > 0});
  if (!r.ok || comparison === null) {
    if (manual) toast('检查更新失败：' + (r.error || '版本号格式不对'));
  } else if (comparison > 0) {
    if (manual || store.settings.updateSeen !== r.latest) {
      toast('发现新版本 ' + r.latest + '（当前 ' + currentRunningVersion() + '）');
      store.settings.updateSeen = r.latest;
      save();
    }
  } else if (manual) {
    toast(comparison === 0 ? '当前版本与公开清单一致：' + currentRunningVersion() : '公开清单没有更高版本，当前运行 ' + currentRunningVersion());
  }
  if (state.view === 'settings') render();
}
function checkUpdate(manual) {
  if (!(window.wordIsle && window.wordIsle.updateCheck)) {
    if (manual) toast('桌面版才支持检查更新');
    return;
  }
  if (state.updateChecking) return;
  state.updateChecking = true;
  if (state.view === 'settings') render();
  window.wordIsle.updateCheck().then(r => applyUpdateResult(r, manual)).catch(() => applyUpdateResult({ok:false,error:'暂时无法连接更新服务'}, manual));
}

/* ---------------- 词库 ---------------- */
function builtinDecks() {
  return (window.DECKS || []).filter(function (d) { return d && Array.isArray(d.words) && d.words.length; });
}
function allDecks() { return builtinDecks().concat(store.custom || []); }
function deckById(id) {
  const all = allDecks();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function activeDeckList() {
  const all = allDecks();
  const ids = store.settings.deckIds || [];
  if (!ids.length) return all;
  const set = Object.create(null);
  ids.forEach(function (id) { set[id] = 1; });
  return all.filter(function (d) { return set[d.id]; });
}
function deckActive(id) {
  const ids = store.settings.deckIds || [];
  return !ids.length || ids.indexOf(id) >= 0;
}
let renderPoolCache = null, renderInProgress = false;
function poolWords(decks) {
  if (!decks && renderPoolCache) return renderPoolCache;
  const out = [];
  const seen = Object.create(null);
  (decks || activeDeckList()).forEach(function (d) {
    d.words.forEach(function (w) {
      const k = norm(w.w);
      if (seen[k]) return; // 同一个词出现在多个词库时只学一次
      seen[k] = 1;
      out.push({
        w: w.w, p: w.p || '', pos: w.pos || '', m: w.m || '', e: w.e || '', t: w.t || '',
        deck: d.id, key: d.id + '::' + w.w
      });
    });
  });
  if (!decks && renderInProgress) renderPoolCache = out;
  return out;
}
function allPool() { return poolWords(allDecks()); }

/* ---------------- 例句填空 ---------------- */
function clozeOf(w) {
  if (!w.e) return null;
  const base = String(w.w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b(' + base + '[a-z]{0,4})\\b', 'i');
  const m = String(w.e).match(re);
  if (!m) return null;
  return { before: w.e.slice(0, m.index), hit: m[0], after: w.e.slice(m.index + m[0].length) };
}
function clozeSentence(w) {
  const c = clozeOf(w);
  if (!c) return '（这个词没有可挖空的例句）';
  return esc(c.before) + '<i class="blank">____</i>' + esc(c.after);
}
// 例句提示：词挖空，放在单词下面（不直接泄露答案）
function exampleClue(w) {
  if (!w || !w.e) return '';
  if (!clozeOf(w)) return '';
  return '<div class="example clue"><span class="clue-label">例句</span>' + clozeSentence(w) + '</div>';
}
// 完整例句（答完/翻面后显示，可朗读；目标词加粗标出）
function exampleFull(w) {
  if (!w || !w.e) return '';
  const escW = String(w.w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let sentence = esc(w.e);
  try {
    sentence = sentence.replace(new RegExp('\\b(' + escW + '[a-z]{0,4})\\b', 'gi'), '<b class="eg-word">$1</b>');
  } catch (e) { /* 忽略 */ }
  return '<div class="example">' + sentence +
    ' <button class="icon-btn" style="width:24px;height:24px;font-size:11px;vertical-align:1px" data-act="speak" data-text="' + esc(w.e) + '" title="朗读例句">🔊</button></div>';
}
function todayLearnedWords() {
  const tk = dayKey();
  return poolWords().filter(function (w) {
    const st = stOf(w.key);
    return st && st.last && dayKey(new Date(st.last)) === tk;
  });
}

/* ---------------- 单词状态 ---------------- */
function stOf(key) { return bookStateOf(key); }
function ensureSt(key) {
  let st = stOf(key);
  if (!st) {
    st = store.words[key] = { s: 'new', ease: 2.5, iv: 0, due: 0, reps: 0, lapses: 0, ok: 0, bad: 0, last: 0 };
    bookStateCreated(key);
  }
  return st;
}
function stateLabel(st) {
  if (st && st.chopped) return '已斩';
  if (!st || st.s === 'new') return '新词';
  if (st.s === 'mastered') return '已掌握';
  if (st.s === 'review') return '复习中';
  return '学习中';
}
function stateClass(st) {
  if (st && st.chopped) return 'state mastered';
  const s = (st && st.s) || 'new';
  return 'state' + (s === 'new' ? '' : ' ' + s);
}

/* ---------------- 每日记录 ---------------- */
function dayRec(key) {
  key = key || dayKey();
  if (!store.days[key]) store.days[key] = { new: 0, review: 0, ok: 0, bad: 0 };
  return store.days[key];
}
function hasActivity(key) {
  const r = store.days[key];
  return !!r && ((r.new || 0) + (r.review || 0)) > 0;
}
function streak() {
  const d = new Date();
  if (!hasActivity(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (hasActivity(dayKey(d)) && n < 3650) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------- 间隔重复 ---------------- */
function recordAnswer(word, verdict) {
  const st = ensureSt(word.key);
  const wasNew = st.s === 'new';
  const now = Date.now();
  const planned = WordIsleCurve.plan(st, verdict, now);
  const rec = dayRec();
  st.reps = (st.reps || 0) + 1;
  st.last = now;

  if (verdict === 'good') {
    st.ok = (st.ok || 0) + 1;
    rec.ok = (rec.ok || 0) + 1;
  } else if (verdict === 'hard') {
    st.ease = clamp((st.ease || 2.5) - 0.05, 1.3, 3.2);
  } else {
    st.lapses = (st.lapses || 0) + 1;
    st.bad = (st.bad || 0) + 1;
    rec.bad = (rec.bad || 0) + 1;
    st.ease = clamp((st.ease || 2.5) - 0.2, 1.3, 3.2);
  }

  Object.assign(st, planned);
  bookInvalidateProgress();
  rec[wasNew ? 'new' : 'review'] = (rec[wasNew ? 'new' : 'review'] || 0) + 1;
  save();
  return wasNew;
}

/* ---------------- 发音 ---------------- */
let voices = [];
function refreshVoices() {
  try { voices = window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : []; } catch (e) { voices = []; }
}
if (window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}
/* ---------------- 朗读：单词用有道，整句用百度翻译朗读，离线回退系统语音 ---------------- */
const TTS_SOURCES = {
  'youdao-us': { label: '有道美音（单词）', type: 2 },
  'youdao-uk': { label: '有道英音（单词）', type: 1 },
  system: { label: '系统语音（离线）', type: 0 }
};
const SENTENCE_SOURCES = {
  baidu: { label: '百度翻译朗读（联网 · 整句更自然）' },
  msedge: { label: '微软在线语音（Edge 神经语音 · 最自然）' },
  system: { label: '系统语音（离线）' }
};
const MS_VOICES = [
  { id: 'en-US-AriaNeural', label: '女声 · 美音（Aria）' },
  { id: 'en-US-JennyNeural', label: '女声 · 美音（Jenny）' },
  { id: 'en-US-GuyNeural', label: '男声 · 美音（Guy）' },
  { id: 'en-GB-SoniaNeural', label: '女声 · 英音（Sonia）' },
  { id: 'en-GB-RyanNeural', label: '男声 · 英音（Ryan）' }
];
function msVoiceId() {
  const v = store.settings.ttsMsVoice;
  for (let i = 0; i < MS_VOICES.length; i++) if (MS_VOICES[i].id === v) return v;
  return MS_VOICES[0].id;
}
let ttsAudio = null;
let speakToken = 0;
function stopSpeak() {
  speakToken += 1;
  if (ttsAudio) { try { ttsAudio.pause(); } catch (e) { /* 忽略 */ } ttsAudio = null; }
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
}
function splitForTts(text, limit) {
  const out = [];
  let rest = String(text || '').replace(/\s+/g, ' ').trim();
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('. ', limit);
    if (cut < 20) cut = rest.lastIndexOf('; ', limit);
    if (cut < 20) cut = rest.lastIndexOf(', ', limit);
    if (cut < 20) cut = rest.lastIndexOf(' ', limit);
    if (cut < 10) cut = limit;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}
function isSingleWord(text) {
  return /^[A-Za-z][A-Za-z'’.-]*(?: [A-Za-z][A-Za-z'’.-]*){0,2}$/.test(String(text || '').trim());
}
function pickVoice() {
  const preferred = /(Aria|Jenny|Guy|Sonia|Natural|Neural|Google|Microsoft.*English)/i;
  let v = null;
  for (let i = 0; i < voices.length; i++) { if (/^en[-_]/i.test(voices[i].lang) && preferred.test(voices[i].name)) { v = voices[i]; break; } }
  if (!v) for (let i = 0; i < voices.length; i++) { if (/^en[-_]US/i.test(voices[i].lang)) { v = voices[i]; break; } }
  if (!v) for (let i = 0; i < voices.length; i++) { if (/^en/i.test(voices[i].lang)) { v = voices[i]; break; } }
  return v;
}
function speakSystem(text, rate, done) {
  if (!('speechSynthesis' in window)) { toast('当前环境不支持系统语音'); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US';
    u.rate = rate || 0.95;
    u.pitch = 1;
    const v = pickVoice();
    if (v) u.voice = v;
    if (done) u.onend = done;
    window.speechSynthesis.speak(u);
  } catch (e) { toast('朗读失败：' + (e.message || '未知错误')); }
}
function youdaoUrl(text, type) {
  return 'https://dict.youdao.com/dictvoice?type=' + type + '&audio=' + encodeURIComponent(text);
}
function baiduUrl(text) {
  return 'https://fanyi.baidu.com/gettts?lan=en&text=' + encodeURIComponent(text) + '&spd=3&source=web';
}
// 微软在线语音（Edge 神经语音）：走主进程 WSS 合成，返回 data URL；同一句只请求一次（缓存 Promise）
const msEdgeCache = new Map();
function clearMsEdgeCache() { msEdgeCache.clear(); }
function msEdgeSrc(text) {
  if (!(window.wordIsle && window.wordIsle.ttsMsEdge)) return Promise.resolve(null);
  const key = String(text || '');
  if (!key) return Promise.resolve(null);
  const voice = msVoiceId();
  const cacheKey = voice + '\n' + key;
  if (msEdgeCache.has(cacheKey)) return msEdgeCache.get(cacheKey);
  const p = window.wordIsle.ttsMsEdge(key, voice).then(function (d) {
    return d || null;
  }).catch(function () { return null; });
  msEdgeCache.set(cacheKey, p);
  if (msEdgeCache.size > 12) msEdgeCache.delete(msEdgeCache.keys().next().value);
  // 失败的不缓存，下次还能重试
  p.then(function (d) { if (!d) msEdgeCache.delete(cacheKey); });
  return p;
}
// 桌面版经主进程取回音频（带 Referer，绕热链）；网页版直连。带小缓存，加快连读/跳转
const ttsCache = new Map();
function audioSrc(direct) {
  if (ttsCache.has(direct)) return Promise.resolve(ttsCache.get(direct));
  const p = (window.wordIsle && window.wordIsle.ttsFetch
    ? window.wordIsle.ttsFetch(direct).then(function (d) { return d || direct; }).catch(function () { return direct; })
    : Promise.resolve(direct));
  return p.then(function (src) {
    if (ttsCache.size > 24) ttsCache.delete(ttsCache.keys().next().value);
    ttsCache.set(direct, src);
    return src;
  });
}
function playAudioFrom(srcPromise, rate, handlers) {
  handlers = handlers || {};
  const still = handlers.still || function () { return true; };
  srcPromise.then(function (src) {
    if (!still()) return;
    if (!src) { if (handlers.failed) handlers.failed(); return; }
    // 保证同一时刻只有一个音频在播
    if (ttsAudio) { try { ttsAudio.pause(); } catch (e) { /* 忽略 */ } }
    const a = new Audio(src);
    a.playbackRate = rate;
    ttsAudio = a;
    if (handlers.audio) handlers.audio(a);
    if (handlers.time) a.ontimeupdate = function () { if (still()) handlers.time(a.currentTime, a.duration || 0); };
    a.onended = function () { if (still() && handlers.ended) handlers.ended(); };
    a.onerror = function () { if (still() && handlers.failed) handlers.failed(); };
    a.play().catch(function () { if (still() && handlers.failed) handlers.failed(); });
  });
}
function playAudio(direct, rate, handlers) {
  return playAudioFrom(audioSrc(direct), rate, handlers);
}
function speakWord(text, rate) {
  const src = TTS_SOURCES[store.settings.ttsSource] ? store.settings.ttsSource : 'youdao-us';
  if (src === 'system') { speakSystem(text, rate); return; }
  const token = speakToken;
  playAudio(youdaoUrl(text, TTS_SOURCES[src].type), rate, {
    still: function () { return token === speakToken; },
    failed: function () { if (token === speakToken) { toast('单词音源不可用，改用系统语音'); speakSystem(text, rate); } }
  });
}
function speakBaidu(text, rate) {
  const token = speakToken;
  const src = SENTENCE_SOURCES[store.settings.ttsSentenceSource] ? store.settings.ttsSentenceSource : 'baidu';
  if (src === 'system') { speakSystem(text, rate); return; }
  const chunks = splitForTts(text, 170);
  let i = 0;
  function next() {
    if (token !== speakToken || i >= chunks.length) return;
    const chunk = chunks[i];
    const playBaidu = function () {
      playAudio(baiduUrl(chunk), rate, {
        still: function () { return token === speakToken; },
        ended: function () { i += 1; next(); },
        failed: function () { if (token === speakToken) { toast('整句音源不可用，改用系统语音'); speakSystem(text, rate); } }
      });
    };
    if (src === 'msedge') {
      msEdgeSrc(chunk).then(function (d) {
        if (token !== speakToken) return;
        if (!d) { toast('微软在线语音不可用，改用百度整句'); playBaidu(); return; }
        playAudioFrom(Promise.resolve(d), rate, {
          still: function () { return token === speakToken; },
          ended: function () { i += 1; next(); },
          failed: playBaidu
        });
      });
    } else playBaidu();
  }
  next();
}
function speak(text, rate) {
  text = String(text || '').trim();
  if (!text) return;
  if (reader.playing) readerStop(true);
  const speed = clamp(Number(rate) || Number(store.settings.ttsRate) || 1, 0.6, 1.4);
  const sentenceSrc = SENTENCE_SOURCES[store.settings.ttsSentenceSource] ? store.settings.ttsSentenceSource : 'baidu';
  stopSpeak();
  if (isSingleWord(text)) speakWord(text, speed);
  else if (sentenceSrc === 'baidu') speakBaidu(text, speed);
  else speakSystem(text, speed);
}

/* ---------------- 外刊朗读播放器（播放/暂停 + 可拖动进度 + 段落高亮） ---------------- */
const reader = {
  readingId: null, chunks: [], total: 1, pos: 0, idx: 0, para: -1,
  playing: false, paused: false, system: false, token: 0, audio: null, pending: false
};
function readerBuild(r) {
  const chunks = [];
  let offset = 0;
  (r.paragraphs || []).forEach(function (p, pi) {
    let rest = String(p).replace(/\s+/g, ' ').trim();
    while (rest.length) {
      let cut = 170;
      if (rest.length > cut) {
        let s = rest.lastIndexOf('. ', cut);
        if (s < 60) s = rest.lastIndexOf('; ', cut);
        if (s < 60) s = rest.lastIndexOf(', ', cut);
        if (s < 60) s = rest.lastIndexOf(' ', cut);
        if (s < 40) s = cut - 1;
        cut = s + 1;
      } else cut = rest.length;
      const t = rest.slice(0, cut).trim();
      if (!t) break;
      chunks.push({ text: t, para: pi, start: offset, len: t.length });
      offset += t.length + 1;
      rest = rest.slice(cut).trim();
    }
  });
  reader.chunks = chunks;
  reader.total = Math.max(1, offset);
  reader.readingId = r.id;
}
function readerIndexAt(pos) {
  for (let i = 0; i < reader.chunks.length; i++) {
    const c = reader.chunks[i];
    if (pos < c.start + c.len + 1) return i;
  }
  return Math.max(0, reader.chunks.length - 1);
}
function readerStop(silent) {
  reader.token += 1;
  reader.playing = false;
  reader.paused = false;
  reader.pending = false;
  if (reader.audio) { try { reader.audio.pause(); } catch (e) { /* 忽略 */ } reader.audio = null; }
  if (ttsAudio) { try { ttsAudio.pause(); } catch (e) { /* 忽略 */ } }
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
  if (!silent) { reader.pos = 0; reader.para = -1; updateReaderUI(true); }
}
function readerStartAt(pos, autoplay) {
  const r = currentReading();
  if (!r) return;
  if (reader.readingId !== r.id || !reader.chunks.length) readerBuild(r);
  readerStop(true);
  stopSpeak();
  const token = reader.token;
  const p = clamp(pos, 0, reader.total - 1);
  const idx = readerIndexAt(p);
  reader.playing = !!autoplay;
  reader.paused = false;
  reader.pos = reader.chunks[idx].start;
  reader.idx = idx;
  reader.para = reader.chunks[idx].para;
  updateReaderUI(true);
  if (autoplay) readerPlayChunk(idx, token);
}
function readerParaStart(pi) {
  for (let i = 0; i < reader.chunks.length; i++) {
    if (reader.chunks[i].para === pi) return reader.chunks[i].start;
  }
  return 0;
}
function readerSystemChunk(ch, idx, token) {
  reader.pending = false;
  const speed = ReadingClub.rate;
  reader.system = true;
  const u = new SpeechSynthesisUtterance(ch.text);
  u.lang = 'en-US';
  u.rate = speed;
  u.pitch = 1;
  const v = pickVoice();
  if (v) u.voice = v;
  u.onend = function () {
    if (token !== reader.token) return;
    reader.pos = ch.start + ch.len;
    updateReaderUI(true);
    readerPlayChunk(idx + 1, token);
  };
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) { /* 忽略 */ }
  reader.audio = null;
}
function readerPlayChunk(idx, token) {
  if (token !== reader.token) return;
  if (idx >= reader.chunks.length) {
    reader.playing = false;
    reader.paused = false;
    reader.pos = reader.total;
    reader.para = -1;
    updateReaderUI(true);
    toast('这一篇读完了');
    return;
  }
  const ch = reader.chunks[idx];
  const paraChanged = reader.para !== ch.para;
  reader.idx = idx;
  reader.para = ch.para;
  reader.pos = ch.start;
  updateReaderUI(true);
  if (paraChanged) {
    const el = document.querySelectorAll('.rd-para')[ch.para];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  const sentenceSrc = SENTENCE_SOURCES[store.settings.ttsSentenceSource] ? store.settings.ttsSentenceSource : 'baidu';
  if (sentenceSrc === 'system') { readerSystemChunk(ch, idx, token); return; }
  const speed = ReadingClub.rate;
  reader.system = false;
  reader.pending = true;
  updateReaderUI(true);
  // 预取下一块，连读更顺（微软在线语音合成较慢，预取尤其重要）
  const nextChunk = reader.chunks[idx + 1];
  if (nextChunk) {
    try {
      if (sentenceSrc === 'msedge') msEdgeSrc(nextChunk.text);
      else audioSrc(baiduUrl(nextChunk.text)).catch(function () { /* 忽略 */ });
    } catch (e) { /* 忽略 */ }
  }
  const handlers = {
    still: function () { return token === reader.token; },
    audio: function (a) { reader.audio = a; reader.pending = false; updateReaderUI(true); },
    time: function (cur, dur) {
      if (token !== reader.token) return;
      const frac = dur ? clamp(cur / dur, 0, 1) : 0;
      reader.pos = ch.start + Math.round(frac * ch.len);
      updateReaderUI(true);
    },
    ended: function () {
      if (token !== reader.token) return;
      reader.pos = ch.start + ch.len;
      readerPlayChunk(idx + 1, token);
    },
    failed: function () { /* 由各音源覆盖 */ }
  };
  const playBaidu = function () {
    playAudioFrom(audioSrc(baiduUrl(ch.text)), speed, Object.assign({}, handlers, {
      failed: function () {
        if (token !== reader.token) return;
        toast('整句音源暂时不可用，这一段改用系统语音');
        readerSystemChunk(ch, idx, token);
      }
    }));
  };
  if (sentenceSrc === 'msedge') {
    msEdgeSrc(ch.text).then(function (d) {
      if (token !== reader.token) return;
      if (!d) { toast('微软在线语音不可用，改用百度整句'); playBaidu(); return; }
      playAudioFrom(Promise.resolve(d), speed, Object.assign({}, handlers, {
        failed: function () { if (token === reader.token) playBaidu(); }
      }));
    });
  } else {
    playBaidu();
  }
}
function readerToggle() {
  const r = currentReading();
  if (!r) return;
  if (reader.readingId !== r.id) { readerBuild(r); reader.pos = 0; }
  if (reader.playing && !reader.paused) {
    const a = reader.audio || ttsAudio;
    if (a) { try { a.pause(); } catch (e) { /* 忽略 */ } }
    else { try { window.speechSynthesis.pause(); } catch (e) { /* 忽略 */ } }
    reader.paused = true;
    updateReaderUI(true);
    return;
  }
  if (reader.playing && reader.paused) {
    const a = reader.audio || ttsAudio;
    if (a) { try { a.play(); } catch (e) { /* 忽略 */ } }
    else { try { window.speechSynthesis.resume(); } catch (e) { /* 忽略 */ } }
    reader.paused = false;
    updateReaderUI(true);
    return;
  }
  readerStartAt(reader.pos || 0, true);
}
function readerSeek(pos) {
  const wasPlaying = reader.playing && !reader.paused;
  readerStartAt(pos, wasPlaying);
}
function readerLabel() {
  const r = currentReading();
  const n = r ? (r.paragraphs || []).length : 0;
  const pct = reader.total ? Math.round(reader.pos / reader.total * 100) : 0;
  return pct + '% · 第 ' + Math.min(n, Math.max(1, reader.para + 1)) + '/' + n + ' 段';
}
function updateReaderUI(sparse) {
  const range = $('#readerRange');
  if (!range) return;
  range.max = reader.total;
  range.value = reader.pos;
  const info = $('#readerInfo');
  if (info) info.textContent = reader.pending ? '正在合成语音…' : readerLabel();
  const btn = $('.reader-play');
  if (btn) btn.textContent = (reader.playing && !reader.paused) ? '⏸ 暂停' : (reader.playing && reader.paused ? '▶ 继续' : '▶ 朗读全文');
  const paras = document.querySelectorAll('.rd-para');
  for (let i = 0; i < paras.length; i++) paras[i].classList.toggle('reading-now', i === reader.para);
}

/* ---------------- 视图状态 ---------------- */
const VIEW_META = {
  home: { title: '今日学习', sub: '先复习到期的词，再学新词' },
  study: { title: '学习', sub: '按真实记忆情况自评，算法决定下次出现时间' },
  decks: { title: '词书广场', sub: '选择要背的词库，也可以导入自己的词表' },
  readings: { title: '外刊阅读', sub: '分级选文 · 同页精读 · 读过的每一点都算数' },
  dict: { title: '查词', sub: '离线约 77 万词条 · 中英互查 · 可加入生词本' },
  listen: { title: '实时听译', sub: '听英语，看英文，再读中文译文' },
  companion: { title: 'AI 伴学', sub: '带着资料提问，解释难句，检验理解' },
  textmap: { title: '文章词汇地图', sub: '把你的学习记录映射到任意英文文章' },
  wrong: { title: '复习巩固', sub: '反复答错的词会集中在这里' },
  stats: { title: '统计', sub: '看清节奏，比盲目刷词更重要' },
  settings: { title: '设置', sub: '管理账号、学习节奏与本机加密数据' }
};

const PRACTICE = {
  card: { title: '翻卡记忆', sub: '看词想意思，再按真实情况自评' },
  choice: { title: '四选一', sub: '快速辨认，练反应速度' },
  cloze: { title: '例句填空', sub: '把例句里挖掉的词补回来' },
  spell: { title: '拼写', sub: '看中文，把英文敲出来' },
  dictation: { title: '听写', sub: '只听发音，拼出单词' }
};

const state = { view: 'home', deckId: null, q: '', readingId: null, readingCat: '全部', showZh: false, readingAnswers: {}, news: [], newsUpdatedAt: '', newsLoading: false, dictPop: null, dictQ: '', dictWord: null, dictLoading: false, update: null, updateChecking: false, appVersion: '', appInfoError: false };
let session = null;

/* ---------------- 渲染 ---------------- */
function go(view, patch) {
  if (state.view === 'readings' && view !== 'readings') ReadingClub.leaving();
  ProductFlow.capture();
  const changed = state.view !== view;
  if (state.view === 'companion') sourceCollectDraft();
  if (state.view === 'listen' && view !== 'listen') { sourceCollectAiConfig(); speechStop(); }
  if (view === 'source') view = 'companion';
  if (state.view === 'readings' && view !== 'readings' && reader.playing) readerStop(false);
  if (patch) Object.assign(state, patch);
  state.view = view;
  render();
}

function render() {
  if (MotionUi.deferDuringComposition()) return;
  renderPoolCache = null;
  renderInProgress = true;
  const motionSnapshot = MotionUi.before();
  hideDictPop();
  const meta = VIEW_META[state.view] || VIEW_META.home;
  $('#viewTitle').textContent = meta.title;
  $('#viewSub').textContent = meta.sub;
  const navBtns = document.querySelectorAll('#nav button');
  for (let i = 0; i < navBtns.length; i++) {
    navBtns[i].classList.toggle('on', navBtns[i].dataset.nav === state.view);
  }
  const views = { home: viewHome, study: viewStudy, decks: viewDecks, readings: viewReadings, dict: viewDict, listen: viewListening, companion: viewCompanion, textmap: viewTextMap, wrong: viewWrong, stats: viewStats, settings: viewSettings };
  const fn = views[state.view] || viewHome;
  const viewEl = $('#view');
  viewEl.dataset.view = state.view;
  viewEl.dataset.reading = (state.view === 'readings' && state.readingId) ? '1' : '0';
  MotionUi.commit(viewEl, fn(), motionSnapshot);
  // 只在切换页面时做位移擦入；同一页内的重绘不加动画
  viewEl.classList.remove('enter');
  if (render._lastView !== state.view) {
    const dir = navDir(render._lastView, state.view);
    const src = glassSource();
    const first = render._lastView === undefined;
    viewEl.style.setProperty('--dir', dir);
    if (!document.body.classList.contains('youth')) void viewEl.offsetWidth;
    viewEl.classList.add('enter');
    if (!first && !document.body.classList.contains('youth')) { LG.lens(src); rollTitle(dir); }
    render._lastView = state.view;
  }
  afterRender();
  renderChrome();
  if (!document.body.classList.contains('youth')) LG.sync();
  youthSync();
  AccountSession.sync();
  ProductFlow.sync();
  MotionUi.finish(motionSnapshot);
  ReadingClub.sync();
  renderPoolCache = null;
  renderInProgress = false;
}

const NAV_ORDER = ['home', 'decks', 'readings', 'dict', 'listen', 'companion', 'textmap', 'wrong', 'stats', 'settings'];

// 文章仅保存在本次运行的内存中，不参与同步、备份或网络请求。
let mapText = '';
let mapAnalyzed = false;
function viewTextMap() {
  let result = '';
  if (mapAnalyzed) {
    const practiced = new Set();
    Object.keys(store.words).forEach(function (key) {
      const st = stOf(key);
      if (st && (st.reps > 0 || st.chopped)) practiced.add(norm(key.slice(key.indexOf('::') + 2)));
    });
    const parts = mapText.split(/([A-Za-z]+(?:['’][A-Za-z]+)*)/g);
    let total = 0, seen = 0;
    const unseen = new Set();
    const marked = parts.map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      total++;
      if (practiced.has(norm(p))) { seen++; return '<mark class="map-seen">' + esc(p) + '</mark>'; }
      unseen.add(norm(p));
      return '<mark class="map-unseen">' + esc(p) + '</mark>';
    }).join('');
    result = '<section class="panel"><h3>练习记录覆盖 ' + (total ? Math.round(seen * 100 / total) : 0) + '%</h3>' +
      '<p class="muted">共 ' + total + ' 个英文词次，其中 ' + seen + ' 个词次有练习记录；' + unseen.size + ' 个不同词形没有记录。绿色为练习过，橙色为没有记录。</p>' +
      '<p class="muted">按原词形精确匹配，不推断变形；练习过不等于已掌握，未记录也不等于不认识。</p>' +
      '<div class="map-result">' + marked + '</div></section>';
  }
  return '<section class="panel"><h3>粘贴一篇英文文章</h3><p class="muted">文章只在本机内存中分析，关闭程序后不会保存。最多 20,000 字符。</p>' +
    '<textarea id="mapInput" maxlength="20000" rows="8" style="width:100%;box-sizing:border-box;resize:vertical;padding:12px" placeholder="Paste an English article here…">' + esc(mapText) + '</textarea>' +
    '<div class="btn-row"><button class="btn primary" data-act="map-analyze">生成词汇地图</button><button class="btn" data-act="map-clear">清空</button></div></section>' + result;
}
function navDir(from, to) {
  const a = NAV_ORDER.indexOf(from), b = NAV_ORDER.indexOf(to);
  if (a < 0 || b < 0) return 1;
  return b >= a ? 1 : -1;
}
function glassSource() {
  const el = document.querySelector('#nav .lgp') || document.querySelector('#nav button.on');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
function rollTitle(dir) {
  const list = [$('#viewTitle'), $('#viewSub')];
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    if (!el) continue;
    el.style.setProperty('--dir', dir);
    el.classList.remove('lg-roll');
    void el.offsetWidth;
    el.classList.add('lg-roll');
  }
}

function afterRender() {
  if (state.view === 'readings' && state.readingId && reader.readingId === state.readingId) updateReaderUI(true);
  if (state.view !== 'study' || !session) return;
  const input = $('#answer');
  if (input && !input.disabled && (!isTyping(document.activeElement) || document.activeElement===input)) input.focus({preventScroll:true});
  const w = currentWord();
  if (!w) return;
  const tag = w.key + '#' + session.idx;
  if (session.spokeTag === tag) return;
  if (['dictation','listenChoice'].includes(typeOf()) && !store.settings.youthQuiet) { session.spokeTag = tag; speak(w.w, 0.9); }
  else if (typeOf() === 'card' && store.settings.autoSpeak && !store.settings.youthQuiet && !session.revealed) { session.spokeTag = tag; speak(w.w, 0.95); }
}

function renderChrome() {
  const today = store.days[dayKey()] || { new: 0, review: 0 };
  const learned = (today.new || 0) + (today.review || 0);
  const p = poolWords();
  const now = Date.now();
  let due = 0, avail = 0;
  p.forEach(function (w) {
    const st = stOf(w.key);
    if (!st || st.s === 'new') avail++;
    else if ((st.due || 0) <= now) due++;
  });
  const quotaLeft = Math.max(0, (store.settings.dailyNew || 0) - (today.new || 0));
  const remain = due + Math.min(quotaLeft, avail);
  const pct = (learned + remain) ? Math.round(learned / (learned + remain) * 100) : 0;

  const bar = $('#railBar');
  if (bar) bar.style.width = clamp(pct, 0, 100) + '%';
  const txt = $('#railText');
  if (txt) txt.textContent = '新词 ' + (today.new || 0) + ' · 复习 ' + (today.review || 0);
  const sc = $('#streakChip');
  if (sc) sc.textContent = '连续 ' + streak() + ' 天';
  const tc = $('#todayChip');
  if (tc) tc.textContent = '今日 ' + learned + ' 词';
}

/* ---------------- 首页 ---------------- */
function viewHome() {
  if (!allDecks().length) return '<section class="panel"><h3>还没有加载到词库</h3><p class="muted">请到设置导入自己的词表，或确认词库文件完整。</p></section>';
  const p = poolWords(), now = Date.now(); let due = 0, avail = 0;
  if (!p.length) return bookPlanHomeHtml() + '<section class="panel"><h3>先选一本喜欢的词书</h3><p class="muted">在上方选择，或到词书广场逛逛。</p><button class="btn primary" data-act="goto" data-view="decks">去词书广场</button></section>';
  p.forEach(w => { const st=stOf(w.key); if (!st || st.s==='new') avail++; else if ((st.due||0)<=now) due++; });
  const today=store.days[dayKey()]||{new:0,review:0},dailyNew=bookPlanDaily(),quota=bookPlanQuota();
  const practice=PRACTICE[store.settings.practice]?store.settings.practice:'card';
  const modes=[['card','翻卡记忆'],['choice','四选一'],['cloze','例句填空'],['spell','拼写'],['dictation','听写']];
    return ProductFlow.home({due,avail,quota,today,dailyNew,practice,modes,quizReady:todayLearnedWords().length});
}

function buildQueue(opts = {}) {
  const now = Date.now(), due = [], fresh = [];
  poolWords().forEach(w => { const st = stOf(w.key); if (!st || st.s === 'new') fresh.push(w); else if ((st.due || 0) <= now) due.push(w); });
  due.sort((a,b) => (stOf(a.key).due || 0) - (stOf(b.key).due || 0));
  if (opts.dueOnly || opts.onlyDue || opts.due) return due.slice(0,60);
  const quota = bookPlanQuota();
  return due.concat(fresh.slice(0,quota)).slice(0,60);
}
function currentWord() { return session && session.idx < session.words.length ? session.words[session.idx] : null; }
function startSession(mode, opts) {
  opts = opts || {};
  const m = (PRACTICE[mode] || mode === 'mixed') ? mode : (PRACTICE[store.settings.practice] ? store.settings.practice : 'card');
  const words = opts.words || buildQueue(opts);
  if (!words.length) { toast(bookPlanQuota()===0 ? '今天的新词目标已完成，可以等到期再复习，或在首页调整目标（最多 300 个）。' : '暂时没有到期词或可学的新词，去词书广场选一本吧。'); return; }
  session = {
    mode: m, words: words, idx: 0,
    correct: 0, total: 0, newCount: 0, reviewCount: 0,
    revealed: false, answered: false, choice: null, feedback: null, typed: '',
    requeued: Object.create(null), spokeTag: '',
    types: opts.types || null, memory: opts.memory || null, memoryHint: false
  };
  ProductFlow.begin();
  go('study');
}

function pickQuizType() {
  const bag = ['choice', 'choice', 'cloze', 'spell', 'dictation'];
  return bag[Math.floor(Math.random() * bag.length)];
}

function startQuiz() {
  const learned = todayLearnedWords();
  if (learned.length < 3) { toast('今天学过的词还太少，先学一组再回来小测'); return; }
  shuffle(learned);
  const picked = learned.slice(0, 10);
  startSession('mixed', { words: picked, types: picked.map(function () { return pickQuizType(); }) });
}

function typeOf() {
  if (!session) return 'card';
  if (session.types) return session.types[session.idx] || 'choice';
  return session.mode;
}

function viewStudy() {
  if (!session) {
    return '<section class="panel"><h3>还没有开始</h3><p class="muted">回到今日学习页开始一轮。</p>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn primary" data-act="goto" data-view="home">回今日学习</button></div></section>';
  }
  if (session.idx >= session.words.length) return ProductFlow.summary();

  const w = currentWord();
  const total = session.words.length;
  const pct = Math.round(session.idx / Math.max(1, total) * 100);
  const head = '<div class="study-head">' +
    '<div class="bar big"><i style="width:' + pct + '%"></i></div>' +
    '<div class="study-count">' + (session.idx + 1) + ' / ' + total + '</div>' +
    '<button class="btn ghost small" data-act="quit">暂存并离开</button>' +
    '</div>';

  const t = typeOf();
  let body;
  if (t === 'card') body = cardHtml(w);
  else if (['choice','reverse','listenChoice'].includes(t)) body = choiceHtml(w);
  else body = typedHtml(w, t === 'dictation', t === 'cloze' && !!clozeOf(w));
  return memoryStageHtml() + head + body + ProductFlow.studyTools();
}

function modeBadge(w) {
  const d = deckById(w.deck);
  return '<span class="badge">' + esc(d ? d.name : '词汇') + '</span>';
}

function gradeArea(revealed) {
  if (!revealed) {
    return '<div class="grade-row"><button class="btn primary wide" data-act="reveal">显示答案<span class="kbd">空格</span></button></div>';
  }
  return '<div class="grade-row">' +
      '<button class="btn again" data-act="grade" data-v="again">不认识<span class="kbd">3</span></button>' +
      '<button class="btn hard" data-act="grade" data-v="hard">模糊<span class="kbd">2</span></button>' +
      '<button class="btn good" data-act="grade" data-v="good">认识<span class="kbd">1</span></button>' +
    '</div>' +
    (session.memory ? '' : '<button class="btn chop" data-act="chop">斩掉这个词 · 之后 180 天不再出现</button>');
}

function cardHtml(w) {
  const st = stOf(w.key);
  const revealHtml = session.revealed
    ? '<div class="reveal">' +
        '<div class="meaning"><span class="pos">' + esc(w.pos) + '</span>' + esc(w.m) + '</div>' +
        (w.e ? exampleFull(w) : '<div class="example example-missing">这个词暂无例句，可以自己造一句。</div>') +
        (w.t ? '<div class="example cn">' + esc(w.t) + '</div>' : '') +
      '</div>'
    : exampleFull(w) + '<div class="hint-line">想好意思了吗？按 <span class="kbd">空格</span> 或点下面按钮看释义</div>';

  const actions = gradeArea(session.revealed);

  return '<div class="word-card">' +
      '<div class="card-top">' + modeBadge(w) + '<span class="badge soft">' + esc(stateLabel(st)) + '</span></div>' +
      '<div class="word-line"><h2 class="word">' + esc(w.w) + '</h2>' +
        '<button class="icon-btn" data-act="speak" data-text="' + esc(w.w) + '" title="发音 (R)">🔊</button></div>' +
      (w.p ? '<div class="phon">' + esc(w.p) + '</div>' : '') +
      revealHtml + (session.revealed ? memoryNoteHtml(w) : '') +
    '</div>' + actions;
}

function ensureChoice(w) {
  if (session.choice) return session.choice;
  const dir = typeOf() === 'reverse' ? 'zh2en' : typeOf() === 'listenChoice' ? 'en2zh' : store.settings.direction === 'zh2en' ? 'zh2en' : 'en2zh';
  const active = poolWords();
  const p = active.length < 4 ? active.concat(allPool()) : active;
  const val = function (x) { return dir === 'zh2en' ? x.w : x.m; };
  const seen = Object.create(null);
  seen[norm(val(w))] = 1;
  const cands = shuffle(p.filter(function (x) { return x.key !== w.key && norm(x.w) !== norm(w.w); }));
  const picks = [];
  for (let i = 0; i < cands.length && picks.length < 8; i++) {
    const v = val(cands[i]);
    if (!v || seen[norm(v)]) continue;
    seen[norm(v)] = 1;
    picks.push(cands[i]);
  }
  const options = [w].concat(picks.slice(0, 3)).map(function (x) {
    return { text: val(x), ok: x.key === w.key };
  });
  shuffle(options);
  session.choice = { dir: dir, options: options, answered: false, picked: -1, correct: false };
  return session.choice;
}

function choiceHtml(w) {
  const c = ensureChoice(w);
  const listening = typeOf() === 'listenChoice';
  const prompt = listening ? '<div class="dict-hint"><button class="icon-btn big" data-act="speak" data-text="' + esc(w.w) + '">🔊 听一听</button><p class="muted">选择听到的单词含义</p></div>' : c.dir === 'zh2en'
    ? '<div class="meaning big">' + esc(w.m) + '</div>'
    : '<div class="word-line"><h2 class="word">' + esc(w.w) + '</h2>' +
      '<button class="icon-btn" data-act="speak" data-text="' + esc(w.w) + '" title="发音 (R)">🔊</button></div>' +
      (w.p ? '<div class="phon">' + esc(w.p) + '</div>' : '');

  const opts = c.options.map(function (o, i) {
    let cls = 'opt';
    if (c.answered) {
      if (o.ok) cls += ' right';
      else if (i === c.picked) cls += ' wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (c.answered ? ' disabled' : '') + '>' +
      '<span class="opt-idx">' + (i + 1) + '</span><span>' + esc(o.text) + '</span></button>';
  }).join('');

  const correctText = c.options.filter(function (o) { return o.ok; }).map(function (o) { return o.text; })[0] || '';
  const fb = c.answered
    ? '<div class="feedback ' + (c.correct ? 'ok' : 'no') + '">' + (c.correct ? '答对了' : '正确答案：' + esc(correctText)) + '</div>'
    : '';

  return '<div class="word-card">' +
      '<div class="card-top">' + modeBadge(w) + '<span class="badge soft">' + (listening ? '听音选义' : c.dir === 'zh2en' ? '中文选词' : '英文选义') + '</span></div>' +
      prompt + (c.answered ? '<div class="meaning">' + esc(w.w) + ' · ' + esc(w.m) + '</div>' + exampleFull(w) + memoryNoteHtml(w) : (session.memory || session.memoryFocus || listening ? '' : c.dir === 'zh2en' ? exampleClue(w) : exampleFull(w))) +
    '</div>' +
    '<div class="opts">' + opts + '</div>' + fb + ((session.memory || session.memoryFocus) && !c.answered ? '<button class="btn ghost small" data-memory-action="skip">暂时想不起来</button>' : '') +
    '<div class="btn-row"><button class="btn ' + (c.answered ? 'primary' : '') + '" data-act="next"' + (c.answered ? '' : ' disabled') + '>下一个<span class="kbd">回车</span></button></div>';
}

function maskHint(word) {
  return String(word).split('').map(function (ch, i) {
    if (ch === ' ' || ch === '-') return ' ';
    return i === 0 ? ch : '_';
  }).join('');
}

function typedHtml(w, dictation, clozeMode) {
  const answered = session.answered;
  const prompt = clozeMode
    ? '<div class="cloze-box">' + clozeSentence(w) + '</div>' +
      '<div class="pic-tip">' + esc(w.pos) + ' ' + esc(w.m) + ' · 填单词原形</div>'
    : dictation
      ? '<div class="dict-hint">' +
          '<button class="icon-btn big" data-act="speak" data-text="' + esc(w.w) + '">🔊 再听一次</button>' +
          ((session.memory || session.memoryFocus) && !answered ? '<div class="muted">先听声音，再独立写出单词</div>' : '<div class="muted">' + esc(w.pos) + ' ' + esc(w.m) + '</div>') +
        '</div>'
      : '<div class="meaning big"><span class="pos">' + esc(w.pos) + '</span>' + esc(w.m) + '</div>' +
        (session.memory || session.memoryFocus ? '' : '<div class="hint">' + esc(maskHint(w.w)) + '</div>');

  let fb = '';
  if (answered && session.feedback) {
    const f = session.feedback;
    fb = '<div class="feedback ' + (f.ok ? 'ok' : 'no') + '">' +
      (f.ok ? '拼写正确' : '正确拼写：<b>' + esc(f.expected) + '</b>' + (f.typed ? '（你写的是 ' + esc(f.typed) + '）' : '')) +
      '</div>';
  }

  const clue = answered
    ? exampleFull(w)
    : (dictation || session.memory || session.memoryFocus ? '' : exampleClue(w));

  return '<div class="word-card">' +
      '<div class="card-top">' + modeBadge(w) + '<span class="badge soft">' + (clozeMode ? '例句填空' : dictation ? '听写' : typeOf()==='cloze' ? '拼写 · 本词暂无填空例句' : '拼写') + '</span></div>' +
      prompt + clue + (answered ? '<p class="meaning">' + esc(w.w) + ' · ' + esc(w.m) + '</p>' + memoryNoteHtml(w) : '') +
    '</div>' +
    '<div class="answer-row">' +
      '<input id="answer" class="answer" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' +
        ' placeholder="输入英文后按回车" value="' + esc(session.typed || '') + '"' + (answered ? ' disabled' : '') + '>' +
      '<button class="btn primary" data-act="submit"' + (answered ? ' disabled' : '') + '>检查</button>' +
    '</div>' + fb + memoryHintHtml(w) +
    '<div class="btn-row"><button class="btn ' + (answered ? 'primary' : '') + '" data-act="next"' + (answered ? '' : ' disabled') + '>下一个<span class="kbd">回车</span></button></div>';
}

function viewSummary() {
  if (session.memory) return memorySummaryHtml();
  if (session.memoryFocus) return memoryFocusSummaryHtml();
  const total = session.total || 0;
  const correct = session.correct || 0;
  const acc = total ? Math.round(correct / total * 100) : 0;
  return '<section class="panel youth-summary">' + youthSummaryLead() +
      '<div class="hero-kicker">本轮完成</div>' +
      '<h2 class="hero-title">做了 ' + total + ' 题，正确率 <b>' + acc + '%</b></h2>' +
      '<div class="sum-grid">' +
        '<div class="tile"><span class="stat-label">新词</span><span class="stat-value">' + session.newCount + '</span></div>' +
        '<div class="tile"><span class="stat-label">复习</span><span class="stat-value">' + session.reviewCount + '</span></div>' +
        '<div class="tile"><span class="stat-label">答对</span><span class="stat-value accent">' + correct + '</span></div>' +
        '<div class="tile"><span class="stat-label">答错</span><span class="stat-value">' + Math.max(0, total - correct) + '</span></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn primary" data-act="goto" data-view="home">回今日学习</button>' +
        '<button class="btn" data-act="again-mode">再来一组</button>' +
        '<button class="btn ghost" data-act="goto" data-view="stats">看统计</button>' +
      '</div>' +
    '</section>';
}

/* ---------------- 词库页 ---------------- */
function viewDecks() {
  if (state.deckId) {
    const d = deckById(state.deckId);
    if (d) return viewDeckDetail(d);
    state.deckId = null;
  }
  return bookPlanLibrary();
}

function viewDeckDetail(d) {
  const q = norm(state.q);
  const rows = d.words.filter(function (w) {
    if (!q) return true;
    return norm(w.w).indexOf(q) >= 0 || norm(w.m).indexOf(q) >= 0 || norm(w.e).indexOf(q) >= 0;
  }).slice(0, 400);

  const body = rows.map(function (w) {
    const st = stOf(d.id + '::' + w.w);
    return '<tr>' +
      '<td class="w">' + esc(w.w) + ' <button class="icon-btn" style="width:26px;height:26px;font-size:12px" data-act="speak" data-text="' + esc(w.w) + '">🔊</button></td>' +
      '<td class="phon">' + esc(w.p) + '</td>' +
      '<td class="mn">' + (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : '') + esc(w.m) + '</td>' +
      '<td><span class="' + stateClass(st) + '">' + esc(stateLabel(st)) + '</span></td>' +
    '</tr>';
  }).join('');

  return '<section class="panel">' +
      '<div class="spread">' +
        '<div><h3 style="margin:0">' + esc(d.name) + '</h3>' +
          '<div class="muted">' + esc(d.desc || '') + ' · ' + d.words.length + ' 词' +
          (q ? ' · 筛选出 ' + rows.length + ' 个' : (d.words.length > 400 ? ' · 最多显示前 400 条，用搜索定位' : '')) + '</div></div>' +
        '<div class="row">' +
          '<input class="search" id="deckSearch" placeholder="搜索单词或释义" value="' + esc(state.q) + '">' +
          '<button class="btn small" data-act="train-deck" data-deck="' + esc(d.id) + '">练这个库</button>' +
          '<button class="btn small ghost" data-act="back-decks">返回</button>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>单词</th><th>音标</th><th>释义</th><th>状态</th></tr></thead>' +
      '<tbody>' + (body || '<tr><td colspan="4" class="muted">没有匹配的词</td></tr>') + '</tbody></table></div>' +
    '</section>';
}

/* ---------------- 错词本 ---------------- */
function viewWrong() {
  const rows = [];
  memoryHistoricalWords().forEach(function (w) {
    const st = stOf(w.key);
    if (st && (st.bad || 0) > 0) rows.push({ w: w, st: st });
  });
  rows.sort(function (a, b) { return (b.st.bad || 0) - (a.st.bad || 0) || (b.st.last || 0) - (a.st.last || 0); });

  if (!rows.length) {
    return memoryWeakPanelHtml() + '<section class="panel"><h3>暂无历史答错记录</h3><p class="muted">答错或标“不认识”的词会保留在这里；使用过提示的词也可在上方补练。</p></section>';
  }

  const list = rows.slice(0, 300).map(function (r) {
    return '<tr>' +
      '<td class="w">' + esc(r.w.w) + ' <button class="icon-btn" style="width:26px;height:26px;font-size:12px" data-act="speak" data-text="' + esc(r.w.w) + '">🔊</button></td>' +
      '<td class="mn">' + esc(r.w.m) + '</td>' +
      '<td><span class="state learning">' + (r.st.bad || 0) + ' 次</span></td>' +
      '<td><span class="' + stateClass(r.st) + '">' + esc(stateLabel(r.st)) + '</span></td>' +
    '</tr>';
  }).join('');

  return memoryWeakPanelHtml() + '<section class="panel">' +
      '<div class="spread"><div><h3 style="margin:0">历史答错 · ' + rows.length + ' 个词</h3>' +
        '<div class="muted">按错误次数排序，前 40 个可以集中重练</div></div>' +
        '<button class="btn primary" data-act="train-wrong">重练这些词</button></div>' +
      '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>单词</th><th>释义</th><th>错误</th><th>状态</th></tr></thead>' +
      '<tbody>' + list + '</tbody></table></div>' +
    '</section>';
}

/* ---------------- 统计页 ---------------- */
function viewStats() {
  const all = allPool();
  const counts = { new: 0, learning: 0, review: 0, mastered: 0 };
  all.forEach(function (w) {
    const st = stOf(w.key);
    const s = (st && st.s) || 'new';
    counts[s] = (counts[s] || 0) + 1;
  });

  let ok = 0, bad = 0, newLearned = 0, reviews = 0;
  Object.keys(store.days).forEach(function (k) {
    const r = store.days[k];
    ok += r.ok || 0; bad += r.bad || 0; newLearned += r.new || 0; reviews += r.review || 0;
  });
  const acc = (ok + bad) ? Math.round(ok / (ok + bad) * 100) : 0;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const r = store.days[k] || { new: 0, review: 0 };
    days.push({ k: k, n: (r.new || 0) + (r.review || 0), label: (d.getMonth() + 1) + '/' + d.getDate() });
  }
  const maxN = Math.max.apply(null, days.map(function (x) { return x.n; }).concat([1]));
  const todayK = dayKey();

  const chart = days.map(function (x) {
    const h = x.n ? Math.max(3, Math.round(x.n / maxN * 116)) : 2;
    return '<div class="chart-col">' +
      '<div class="chart-num">' + (x.n || '') + '</div>' +
      '<div class="chart-bar' + (x.k === todayK ? ' hot' : '') + (x.n ? '' : ' zero') + '" style="height:' + h + 'px"></div>' +
      '<div class="chart-day">' + x.label + '</div></div>';
  }).join('');

  const total = all.length;
  const pctOf = function (n) { return total ? (n / total * 100) : 0; };
  const dist = '<div style="display:flex;gap:2px;height:10px;border-radius:999px;overflow:hidden;border:1px solid var(--line);margin:10px 0 8px">' +
    '<i style="width:' + pctOf(counts.new) + '%;background:#e0d9c8"></i>' +
    '<i style="width:' + pctOf(counts.learning) + '%;background:var(--warn)"></i>' +
    '<i style="width:' + pctOf(counts.review) + '%;background:var(--accent)"></i>' +
    '<i style="width:' + pctOf(counts.mastered) + '%;background:var(--good)"></i>' +
  '</div>';

  const deckRows = allDecks().map(function (d) {
    let learned = 0, mastered = 0;
    d.words.forEach(function (w) {
      const st = stOf(d.id + '::' + w.w);
      if (st && st.s !== 'new') learned++;
      if (st && st.s === 'mastered') mastered++;
    });
    return '<tr><td>' + esc(d.name) + '</td><td>' + d.words.length + '</td><td>' + learned + '</td><td>' + mastered + '</td>' +
      '<td>' + (d.words.length ? Math.round(learned / d.words.length * 100) : 0) + '%</td></tr>';
  }).join('');

  return '<section class="panel">' +
      '<h3>总览</h3>' +
      '<div class="stat-grid">' +
        '<div class="tile"><span class="stat-label">累计答题</span><span class="stat-value">' + (newLearned + reviews) + '</span></div>' +
        '<div class="tile"><span class="stat-label">正确率</span><span class="stat-value accent">' + acc + '%</span></div>' +
        '<div class="tile"><span class="stat-label">学过新词</span><span class="stat-value">' + newLearned + '</span></div>' +
        '<div class="tile"><span class="stat-label">复习次数</span><span class="stat-value">' + reviews + '</span></div>' +
      '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="spread"><h3 style="margin:0">最近 7 天</h3><span class="muted">每天新词 + 复习的答题量</span></div>' +
      '<div class="chart">' + chart + '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="spread"><h3 style="margin:0">打卡日历</h3><span class="muted">连续 ' + streak() + ' 天</span></div>' +
      calendarHtml() +
    '</section>' +
    '<section class="panel">' +
      '<div class="spread"><h3 style="margin:0">掌握分布</h3><span class="muted">共 ' + total + ' 词</span></div>' +
      dist +
      '<div class="legend">' +
        '<span><i style="background:#e0d9c8"></i>新词 ' + counts.new + '</span>' +
        '<span><i style="background:var(--warn)"></i>学习中 ' + counts.learning + '</span>' +
        '<span><i style="background:var(--accent)"></i>复习中 ' + counts.review + '</span>' +
        '<span><i style="background:var(--good)"></i>已掌握 ' + counts.mastered + '</span>' +
      '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<h3>词库进度</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>词库</th><th>词数</th><th>已学</th><th>已掌握</th><th>进度</th></tr></thead>' +
      '<tbody>' + deckRows + '</tbody></table></div>' +
    '</section>';
}

function calendarHtml() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7; // 周一为一周第一天
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const tk = dayKey();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const k = dayKey(new Date(y, m, d));
    const r = store.days[k];
    const n = r ? (r.new || 0) + (r.review || 0) : 0;
    const lv = n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : 3;
    cells.push('<div class="cal-cell lv' + lv + (k === tk ? ' today' : '') + '" title="' + esc(k) + ' · ' + n + ' 词">' + d + '</div>');
  }
  while (cells.length % 7) cells.push('<div class="cal-cell empty"></div>');
  return '<div class="cal-head">' + y + ' 年 ' + (m + 1) + ' 月</div>' +
    '<div class="cal-grid">' +
      ['一', '二', '三', '四', '五', '六', '日'].map(function (x) { return '<div class="cal-wd">' + x + '</div>'; }).join('') +
      cells.join('') +
    '</div>' +
    '<div class="legend" style="margin-top:10px"><span>颜色越深 = 当天答题越多（0 / 少于 10 / 少于 30 / 30 以上）</span></div>';
}

/* ---------------- 外刊阅读 ---------------- */
const MEDIA_LINKS = [
  { name: 'The Economist', url: 'https://www.economist.com/', tone: '经济 · 观点' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/', tone: '综合 · 社会' },
  { name: 'BBC News', url: 'https://www.bbc.com/news', tone: '综合 · 新闻' },
  { name: 'The New York Times', url: 'https://www.nytimes.com/', tone: '综合 · 深度' },
  { name: 'Reuters', url: 'https://www.reuters.com/', tone: '通讯社' },
  { name: 'AP News', url: 'https://apnews.com/', tone: '通讯社' },
  { name: 'NPR', url: 'https://www.npr.org/', tone: '广播 · 文化' },
  { name: 'National Geographic', url: 'https://www.nationalgeographic.com/', tone: '自然 · 科普' },
  { name: 'Scientific American', url: 'https://www.scientificamerican.com/', tone: '科技' },
  { name: 'Nature', url: 'https://www.nature.com/', tone: '学术' },
  { name: 'NASA News', url: 'https://www.nasa.gov/news/', tone: '科普 · 公共领域' },
  { name: 'UN News', url: 'https://news.un.org/en/', tone: '国际' }
];

function allReadings() {
  return ReadingClub.all();
}
function currentReading() {
  if (!state.readingId) return null;
  const all = allReadings();
  for (let i = 0; i < all.length; i++) if (all[i].id === state.readingId) return all[i];
  return null;
}
function readingCats() {
  const out = [];
  allReadings().forEach(function (r) { if (r.category && out.indexOf(r.category) < 0) out.push(r.category); });
  return out;
}
function wordCountOf(r) {
  return String((r.paragraphs || []).join(' ')).split(/\s+/).filter(Boolean).length;
}
/* 点词查义 */
let lexCache = null;
function lexIndex() {
  if (lexCache) return lexCache;
  lexCache = Object.create(null);
  allPool().forEach(function (w) {
    const k = String(w.w).toLowerCase();
    if (!lexCache[k]) lexCache[k] = w;
  });
  return lexCache;
}
function lookupWord(raw) {
  const w = String(raw || '').toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
  if (!w) return null;
  const direct = dictFind(w) || lexIndex()[w];
  if (direct) return direct;
  const tries = [];
  const irregular = { went: 'go', gone: 'go', children: 'child', men: 'man', women: 'woman', mice: 'mouse', geese: 'goose', teeth: 'tooth', feet: 'foot', better: 'good', best: 'good', worse: 'bad', worst: 'bad', brought: 'bring', thought: 'think', taught: 'teach', bought: 'buy', written: 'write', spoken: 'speak' };
  if (irregular[w]) tries.push(irregular[w]);
  if (/ies$/.test(w)) tries.push(w.slice(0, -3) + 'y');
  ['ing', 'ed', 'er', 'est', 'ly', 'es', 's', 'd'].forEach(function (suf) {
    if (w.length > suf.length + 2 && w.slice(-suf.length) === suf) tries.push(w.slice(0, -suf.length));
  });
  ['ing', 'ed', 'er', 'est'].forEach(function (suf) {
    if (w.length > suf.length + 2 && w.slice(-suf.length) === suf) {
      const stem = w.slice(0, -suf.length);
      if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) tries.push(stem.slice(0, -1));
      tries.push(stem + 'e');
    }
  });
  for (let i = 0; i < tries.length; i++) {
    const entry = dictFind(tries[i]) || lexIndex()[tries[i]];
    if (entry) return entry;
  }
  return null;
}
function wordWrap(text, vocab) {
  const set = Object.create(null);
  (vocab || []).forEach(function (v) { if (v && v.w) set[String(v.w).toLowerCase()] = 1; });
  let out = '';
  const re = /([A-Za-z][A-Za-z'-]*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const raw = m[1];
    const cls = 'rd-w' + (set[raw.toLowerCase()] ? ' voca' : '') + (lookupWord(raw) ? '' : ' miss');
    out += '<span class="' + cls + '" data-w="' + esc(raw) + '">' + esc(raw) + '</span>';
    last = m.index + raw.length;
  }
  out += esc(text.slice(last));
  return out;
}
function hideDictPop() {
  const el = $('#dictPop');
  if (el) el.remove();
  state.dictPop = null;
}
function addToReadingDeck(entry) {
  const id = 'reading-words';
  let deck = null;
  for (let i = 0; i < store.custom.length; i++) if (store.custom[i].id === id) { deck = store.custom[i]; break; }
  if (!deck) {
    deck = { id: id, name: '阅读生词', desc: '外刊阅读里点查收藏的词', words: [] };
    store.custom.push(deck);
  }
  const key = String(entry.w).toLowerCase();
  const exists = deck.words.some(function (w) { return String(w.w).toLowerCase() === key; });
  if (!exists) {
    deck.words.push({ w: entry.w, p: entry.p || '', pos: entry.pos || '', m: entry.m || '', e: entry.e || '', t: entry.t || '' });
  }
  save();
  toast(exists ? '这个词已经在「阅读生词」里了' : '已加入「阅读生词」，可在词库中练习');
}
function showDictPop(raw, entry, rect, pending) {
  hideDictPop();
  const el = document.createElement('div');
  el.className = 'dict-pop';
  el.id = 'dictPop';
  el.innerHTML = entry
    ? '<div class="dp-head"><b>' + esc(entry.w) + '</b><span class="dp-phon">' + esc(entry.p || '') + '</span>' +
      '<button class="icon-btn" data-dp="speak" title="发音">🔊</button></div>' +
      '<div class="dp-mean">' + (entry.pos ? '<i class="pos">' + esc(entry.pos) + '</i>' : '') + esc(entry.m || '') + '</div>' +
      (entry.e ? '<div class="dp-ex">' + esc(entry.e) + '</div>' : '') +
      '<div class="dp-actions"><button class="btn small primary" data-dp="add">加入生词库</button>' +
      '<button class="btn small ghost" data-dp="close">关闭</button></div>'
    : '<div class="dp-head"><b>' + esc(raw) + '</b></div>' +
      '<div class="dp-mean muted">' + (pending ? '正在查扩展词典…' : '离线词典暂未收录这个词。') + '</div>' +
      '<div class="dp-actions"><button class="btn small ghost" data-dp="close">关闭</button></div>';
  document.body.appendChild(el);

  const pad = 12;
  const bw = el.offsetWidth;
  const bh = el.offsetHeight;
  let left = rect.left;
  let top = rect.bottom + 8;
  if (left + bw > window.innerWidth - pad) left = window.innerWidth - bw - pad;
  if (left < pad) left = pad;
  if (top + bh > window.innerHeight - pad) top = rect.top - bh - 8;
  if (top < pad) top = pad;
  el.style.left = left + 'px';
  el.style.top = top + 'px';

  const btns = el.querySelectorAll('[data-dp]');
  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function (ev) {
      ev.stopPropagation();
      const act = btns[i].dataset.dp;
      if (act === 'speak') speak(entry ? entry.w : raw);
      else if (act === 'add' && entry) { addToReadingDeck(Object.assign({}, entry, state.readingLookupContext ? {e:state.readingLookupContext.slice(0,800),t:''} : {})); ReadingClub.rememberWord(entry); render(); }
      else hideDictPop();
    });
  }
  state.dictPop = entry || null;
}

/* 每日新闻 */
function formatNewsTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
async function loadNews(force) { return ReadingNews.refresh(!!force); }
function viewReadings() {
  const r = currentReading();
  return r ? viewReadingArticle(r) : ReadingClub.library();
}
function viewReadingArticle(r) { return ReadingClub.article(r); }

/* ---------------- 查词（本地词典，懒加载） ---------------- */
function ensureDict() {
  if (window.SEARCH_DICT) return Promise.resolve(true);
  if (ensureDict.pending) return ensureDict.pending;
  state.dictLoading = true;
  ensureDict.pending = new Promise(function (resolve) {
    const s = document.createElement('script');
    s.src = 'data/search-dict.js';
    s.onload = function () { state.dictLoading = false; ensureDict.pending = null; if (state.view === 'readings' && state.readingId) ReadingClub.dictionaryReady(); else render(); resolve(true); };
    s.onerror = function () { state.dictLoading = false; ensureDict.pending = null; toast('常用词典加载失败'); if (!(state.view === 'readings' && state.readingId)) render(); resolve(false); };
    document.body.appendChild(s);
  });
  return ensureDict.pending;
}
const extendedPromises = Object.create(null);
const extendedMaps = Object.create(null);
function dictPart(word) {
  const first = String(word || '').toLowerCase()[0];
  return /[a-z]/.test(first || '') ? first : '_';
}
function ensureExtended(letter) {
  const parts = window.EXT_DICT_PARTS || {};
  if (parts[letter]) return Promise.resolve(true);
  if (extendedPromises[letter]) return extendedPromises[letter];
  extendedPromises[letter] = new Promise(function (resolve) {
    const s = document.createElement('script');
    s.src = 'data/extended-dict/' + letter + '.js';
    s.onload = function () { delete extendedPromises[letter]; if (state.view === 'dict') render(); resolve(!!(window.EXT_DICT_PARTS || {})[letter]); };
    s.onerror = function () { delete extendedPromises[letter]; resolve(false); };
    document.body.appendChild(s);
  });
  return extendedPromises[letter];
}
function extendedMap(letter) {
  const rows = (window.EXT_DICT_PARTS || {})[letter];
  if (!rows) return null;
  if (!extendedMaps[letter]) {
    const map = new Map();
    rows.forEach(function (r) { if (!map.has(r[0])) map.set(r[0], r); });
    extendedMaps[letter] = map;
  }
  return extendedMaps[letter];
}
let dictDeckMap = null;
function deckWordMap() {
  if (dictDeckMap) return dictDeckMap;
  dictDeckMap = Object.create(null);
  allPool().forEach(function (w) { dictDeckMap[String(w.w).toLowerCase()] = w; });
  return dictDeckMap;
}
function dictFind(word) {
  const q = String(word || '').trim().toLowerCase();
  if (!q) return null;
  if (window.SEARCH_DICT) {
    if (!dictFind.core) {
      dictFind.core = new Map();
      window.SEARCH_DICT.forEach(function (e) { dictFind.core.set(e.w.toLowerCase(), e); });
    }
    if (dictFind.core.has(q)) return dictFind.core.get(q);
  }
  const deck = deckWordMap()[q];
  if (deck) return deck;
  const part = extendedMap(dictPart(q));
  const row = part && part.get(q);
  return row ? { w: row[0], p: row[1], m: row[2], pos: '', e: '', t: '' } : null;
}
function dictSearch(q) {
  const all = window.SEARCH_DICT || [];
  if (/[\u4e00-\u9fff]/.test(q)) {
    const out = [];
    for (let i = 0; i < all.length && out.length < 80; i++) {
      if (all[i].m && all[i].m.indexOf(q) >= 0) out.push(all[i]);
    }
    return out;
  }
  const ql = q.toLowerCase();
  dictFind(ql);
  const exact = [], prefix = [], contains = [];
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    const w = e.w;
    if (w === ql) exact.push(e);
    else if (w.indexOf(ql) === 0) { if (prefix.length < 80) prefix.push(e); }
    else if (w.indexOf(ql) > 0) { if (contains.length < 30) contains.push(e); }
  }
  const part = (window.EXT_DICT_PARTS || {})[dictPart(ql)] || [];
  let left = 0, right = part.length;
  while (left < right) { const mid = (left + right) >> 1; if (part[mid][0] < ql) left = mid + 1; else right = mid; }
  for (let i = left; i < part.length && prefix.length < 80; i++) {
    const row = part[i];
    if (!row[0].startsWith(ql)) break;
    if (!dictFind.core.has(row[0])) prefix.push({ w: row[0], p: row[1], m: row[2], pos: '', e: '', t: '' });
  }
  const own = deckWordMap()[ql];
  if (own && !exact.length) exact.push(own);
  if (!exact.length && !prefix.length) {
    const lemma = lookupWord(ql);
    if (lemma && lemma.w.toLowerCase() !== ql) exact.push(lemma);
  }
  return exact.concat(prefix, contains).slice(0, 80);
}
function openDictWord(word) {
  state.dictWord = String(word || '');
  state.dictQ = String(word || '');
  const rec = (store.dictRecent || []).filter(function (x) { return x.toLowerCase() !== state.dictWord.toLowerCase(); });
  rec.unshift(state.dictWord);
  store.dictRecent = rec.slice(0, 12);
  save();
  render();
}
function dictAdd(e) {
  const id = 'dict-words';
  let deck = null;
  for (let i = 0; i < store.custom.length; i++) if (store.custom[i].id === id) { deck = store.custom[i]; break; }
  if (!deck) {
    deck = { id: id, name: '查词生词', desc: '查词时收藏的单词', words: [] };
    store.custom.push(deck);
  }
  const key = String(e.w).toLowerCase();
  const exists = deck.words.some(function (w) { return String(w.w).toLowerCase() === key; });
  if (!exists) deck.words.push({ w: e.w, p: e.p || '', pos: e.pos || '', m: e.m || '', e: e.e || '', t: e.t || '' });
  if (store.settings.deckIds.length && store.settings.deckIds.indexOf(id) < 0) store.settings.deckIds.push(id);
  dictDeckMap = null;
  save();
  toast(exists ? '这个词已经在「查词生词」里了' : '已加入「查词生词」，可在词库中练习');
}
function dictRowHtml(e) {
  const inDeck = !!deckWordMap()[e.w.toLowerCase()];
  return '<button class="dict-row" data-act="dict-open" data-word="' + esc(e.w) + '">' +
      '<div class="dr-main"><span class="dr-word">' + esc(e.w) + '</span>' +
        (e.p ? '<span class="dr-phon">' + esc(e.p) + '</span>' : '') +
        (e.pos ? '<span class="dr-pos">' + esc(e.pos) + '</span>' : '') +
        (inDeck ? '<span class="dr-badge">词库已收</span>' : '') +
      '</div>' +
      '<div class="dr-mean">' + esc(e.m.slice(0, 100)) + (e.m.length > 100 ? '…' : '') + '</div>' +
    '</button>';
}
function viewDictWord(word) {
  const e = dictFind(word) || lookupWord(word);
  if (!e) {
    return '<section class="panel"><h3>没有找到这个词</h3><p class="muted">词典未收录「' + esc(word) + '」。</p>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="dict-back">返回搜索</button></div></section>';
  }
  const inDeck = !!deckWordMap()[e.w.toLowerCase()];
  return '<section class="panel dict-detail">' +
      '<div class="btn-row" style="margin-bottom:6px"><button class="btn small ghost" data-act="dict-back">← 返回搜索</button></div>' +
      '<div class="dd-head"><h2 class="word">' + esc(e.w) + '</h2>' +
        '<button class="icon-btn" data-act="speak" data-text="' + esc(e.w) + '" title="发音">🔊</button></div>' +
      (e.w.toLowerCase() !== word.toLowerCase() ? '<p class="muted">查询词形：' + esc(word) + ' · 对应原形</p>' : '') +
      (e.p ? '<div class="phon">' + esc(e.p) + '</div>' : '') +
      '<div class="dd-mean">' + (e.pos ? '<i class="pos">' + esc(e.pos) + '</i>' : '') + esc(e.m) + '</div>' +
      (e.e ? '<div class="example">' + esc(e.e) + ' <button class="icon-btn" style="width:24px;height:24px;font-size:11px;vertical-align:1px" data-act="speak" data-text="' + esc(e.e) + '" title="朗读例句">🔊</button></div>' : '') +
      (e.t ? '<div class="example cn">' + esc(e.t) + '</div>' : '') +
      '<div class="btn-row" style="margin-top:14px">' +
        '<button class="btn primary" data-act="dict-add" data-word="' + esc(e.w) + '">加入生词本</button>' +
        (inDeck ? '<span class="badge soft">词库已收录</span>' : '') +
      '</div>' +
    '</section>';
}
function viewDict() {
  if (!window.SEARCH_DICT) {
    if (!state.dictLoading) setTimeout(ensureDict, 0);
    return '<section class="panel"><h3>正在载入离线词典…</h3>' +
      '<p class="muted">先载入常用词，更多词条按字母加载。</p></section>';
  }
  if (state.dictWord) return viewDictWord(state.dictWord);
  const q = state.dictQ.trim();
  const letter = q && !/[\u4e00-\u9fff]/.test(q) ? dictPart(q) : '';
  const partReady = letter && !!(window.EXT_DICT_PARTS || {})[letter];
  if (letter && !partReady && !extendedPromises[letter]) setTimeout(function () { ensureExtended(letter); }, 0);
  const total = (window.EXT_DICT_META && window.EXT_DICT_META.count) || 65000;
  const head = '<section class="panel">' +
      '<div class="dict-search-row">' +
        '<input id="dictQuery" class="dict-input" placeholder="输入英文单词或中文释义，例如 abandon / 放弃" autocomplete="off" spellcheck="false" value="' + esc(state.dictQ) + '">' +
        '<button class="btn primary" data-act="dict-go">查词</button>' +
      '</div>' +
      '<div class="muted dict-hint">离线约 ' + Math.round(total / 10000) + ' 万词条 · 英文词头与词形查询 · 中文可反查常用词</div>' +
    '</section>';
  if (!q) {
    const recent = (store.dictRecent || []).slice(0, 10);
    return head +
      '<section class="panel"><h3>最近查过</h3>' +
        (recent.length
          ? '<div class="dict-recent">' + recent.map(function (w) { return '<button class="chip-link" data-act="dict-open" data-word="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>'
          : '<p class="muted">还没有记录，试试搜 abandon、computer 或中文「放弃」。</p>') +
      '</section>' +
      '<section class="panel"><h3>字母索引</h3><div class="dict-alpha">' +
        'abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) { return '<button data-act="dict-alpha" data-c="' + c + '">' + c.toUpperCase() + '</button>'; }).join('') +
      '</div></section>' +
      '<section class="panel"><h3>关于这本词典</h3><p class="muted">基于开源 ECDICT（MIT License）。常用 65,000 条即时检索，扩展词条按首字母载入；词库里的部分词条带例句。英文词汇不断变化，专业新词和拼写变体仍可能缺失；释义请结合原文核对。</p></section>';
  }
  const list = dictSearch(q);
  return head + '<section class="panel">' +
      '<div class="spread"><h3 style="margin:0">搜索结果（' + list.length + '）</h3><span class="muted">' + esc(q) + '</span></div>' +
      (letter && !partReady ? '<p class="muted">正在查扩展词典…</p>' : '') +
      (list.length
        ? '<div class="dict-list" id="dictResults">' + list.map(dictRowHtml).join('') + '</div>'
        : (letter && !partReady ? '' : '<p class="muted">没找到「' + esc(q) + '」，试试更短的前缀或中文释义。</p>')) +
    '</section>';
}

/* ---------------- 设置页 ---------------- */
function viewSettings() {
  const s = store.settings;
  const u = state.update;
  return AccountSession.settingsHtml() + youthSettingsHtml() + LearnerExperience.settingsHtml() + '<section class="panel">' +
      '<h3>学习节奏</h3>' +
      '<div class="form">' +
        '<div class="field"><div><div class="field-label">每日新词 · 1—300 个</div><div class="field-note">所有词书共用每日新词目标，到期复习另计。</div></div>' +
          '<input type="number" inputmode="numeric" min="1" max="300" step="1" data-set="dailyNew" aria-label="设置每日新词数" value="' + bookPlanDaily() + '"></div>' +
        '<div class="field"><div><div class="field-label">进入新词时自动发音</div><div class="field-note">用下面选择的音源朗读；关掉可以自己点 🔊。</div></div>' +
          '<label class="switch"><input type="checkbox" data-set="autoSpeak"' + (s.autoSpeak ? ' checked' : '') + '><span class="track"></span></label></div>' +
        '<div class="field"><div><div class="field-label">四选一方向</div><div class="field-note">看英文选中文，还是看中文选英文。</div></div>' +
          '<select data-set="direction">' +
            '<option value="en2zh"' + (s.direction === 'en2zh' ? ' selected' : '') + '>英 → 中</option>' +
            '<option value="zh2en"' + (s.direction === 'zh2en' ? ' selected' : '') + '>中 → 英</option>' +
          '</select></div>' +
      '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<h3>朗读音源</h3>' +
      '<div class="form">' +
        '<div class="field"><div><div class="field-label">单词发音</div>' +
          '<div class="field-note">有道美音 / 英音只支持单词和短语（需要网络）；断网时自动回退到系统语音。</div></div>' +
          '<select data-set="ttsSource">' + Object.keys(TTS_SOURCES).map(function (k) {
            return '<option value="' + k + '"' + (s.ttsSource === k ? ' selected' : '') + '>' + TTS_SOURCES[k].label + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><div><div class="field-label">整句朗读（外刊 / 例句）</div>' +
          '<div class="field-note">可选百度 / 微软在线 / 系统语音；失败会自动按「微软 → 百度 → 系统」降级。</div></div>' +
          '<select data-set="ttsSentenceSource">' + Object.keys(SENTENCE_SOURCES).map(function (k) {
            return '<option value="' + k + '"' + (s.ttsSentenceSource === k ? ' selected' : '') + '>' + SENTENCE_SOURCES[k].label + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><div><div class="field-label">微软在线语音音色</div>' +
          '<div class="field-note">仅当整句音源选「微软在线语音」时生效；点试听立即合成一句。</div></div>' +
          '<div class="row"><select data-set="ttsMsVoice">' + MS_VOICES.map(function (v) {
            return '<option value="' + v.id + '"' + (msVoiceId() === v.id ? ' selected' : '') + '>' + v.label + '</option>';
          }).join('') + '</select>' +
          '<button class="btn small" data-act="tts-ms-test">试听</button></div></div>' +
        '<div class="field"><div><div class="field-label">语速</div><div class="field-note">0.8 慢速适合精听，1.0 正常。</div></div>' +
          '<div class="row"><input type="range" min="0.7" max="1.3" step="0.05" value="' + (s.ttsRate || 1) + '" data-set="ttsRate">' +
          '<span class="muted" id="ttsRateLabel">' + Number(s.ttsRate || 1).toFixed(2) + '×</span>' +
          '<button class="btn small" data-act="tts-test">试听</button></div></div>' +
      '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<h3>外观</h3>' +
      '<div class="form">' +
        '<div class="field"><div><div class="field-label">轻互动效</div>' +
          '<div class="field-note">按钮按压、页面进入与小里程碑的轻量动效；关闭后保持静态。</div></div>' +
          '<label class="switch"><input type="checkbox" data-set="liquidGlass"' + (s.liquidGlass !== false ? ' checked' : '') + '><span class="track"></span></label></div>' +
        '<div class="field"><div><div class="field-label">背景图片</div>' +
          '<div class="field-note">' + (window.wordIsle
            ? '选一张图铺在玻璃后面，副本会加密存入当前账号，原图删掉也不影响。'
            : '网页版只能把不超过 2 MB 的图存在浏览器里；桌面版支持 15 MB 以内的任意图片。') + '</div></div>' +
          '<div class="row">' +
            (s.bg ? '<span class="bg-thumb" aria-hidden="true"></span>' : '') +
            '<button class="btn small" data-act="bg-pick">' + (s.bg ? '换一张' : '选择图片') + '</button>' +
            (s.bg ? '<button class="btn small ghost" data-act="bg-clear">恢复默认</button>' : '') +
            '<input type="file" id="bgFile" accept="' + BG_TYPES.join(',') + '" style="display:none">' +
          '</div></div>' +
        (s.bg ? '<div class="field"><div><div class="field-label">背景压暗</div>' +
          '<div class="field-note">图越亮越花，压暗一点正文才清楚；只加一层纸色遮罩，不做模糊。</div></div>' +
          '<div class="row"><input type="range" min="0" max="88" step="2" value="' + bgDim() + '" data-set="bgDim">' +
          '<span class="muted" id="bgDimLabel">' + bgDim() + '%</span></div></div>' : '') +
      '</div>' +
    '</section>' +
    '<section class="panel">' +
      '<h3>更新</h3>' +
      '<div class="form">' +
        '<div class="field"><div><div class="field-label">自动检查更新</div>' +
          '<div class="field-note">启动时查询公开发布信息，不上传学习记录。发现更高版本只提示，下载和安装由你选择。</div></div>' +
          '<label class="switch"><input type="checkbox" data-set="autoUpdate"' + (s.autoUpdate !== false ? ' checked' : '') + '><span class="track"></span></label></div>' +
        '<div class="field"><div><div class="field-label">当前运行版本</div>' +
          '<div class="field-note" id="appCurrentVersion"><b>' + esc(currentRunningVersion() || (state.appInfoError ? '版本信息暂不可用' : '正在读取版本信息…')) + '</b></div>' +
          '<div class="field-note" id="appUpdateStatus" role="status">' + esc(updateStatusText()) + '</div></div>' +
          '<div class="row"><button class="btn small" data-act="update-check"' + (state.updateChecking ? ' disabled' : '') + '>' + (state.updateChecking ? '检查中…' : '检查更新') + '</button>' +
          (u && u.ok && u.hasUpdate && u.url ? '<a class="btn small primary" href="' + esc(u.url) + '" target="_blank" rel="noopener">下载新版本</a>' : '') +
          '</div></div>' +
      '</div>' +
      (u && u.ok && u.hasUpdate && u.notes ? '<div class="upd-notes"><b>' + esc(u.latest) + '</b>' + esc(u.notes) + '</div>' : '') +
    '</section>' +
    '<section class="panel">' +
      '<h3>数据</h3>' +
      '<div class="form">' +
        '<div class="field"><div><div class="field-label">导入词库 / 恢复备份</div>' +
          '<div class="field-note">CSV 每行：单词,音标,词性,释义,例句,例句翻译（至少要有单词和释义）。也可以直接导入本应用导出的 JSON 备份。</div></div>' +
          '<div class="row"><button class="btn" data-act="import">选择文件</button>' +
          '<input type="file" id="importFile" accept=".csv,.tsv,.txt,.json" style="display:none"></div></div>' +
        '<div class="field"><div><div class="field-label">导出学习 JSON（明文）</div><div class="field-note">用于手动交换学习记录，文件含个人学习内容。换机或备份请优先使用上方「导出加密账号备份」。</div></div>' +
          '<button class="btn" data-act="export">导出 JSON</button></div>' +
        '<div class="field"><div><div class="field-label">清空学习记录</div><div class="field-note">清空所有词的进度和每日统计，自定义词库会保留。</div></div>' +
          '<button class="btn danger" data-act="reset">清空</button></div>' +
      '</div>' +
    '</section>' +
    '<div class="tip">学习记录按本机账号加密保存。登录页可选择记住密码或自动登录；锁定后需手动输入密码。换机前请导出加密账号备份，忘记密码时使用注册时的恢复密钥。</div>';
}

/* ---------------- 答题动作 ---------------- */
function applyResult(w, verdict) {
  if (memoryLoopResult(w, verdict)) return;
  if (session.memoryHint && verdict === 'good') verdict = 'hard';
  memoryEvidence(w, verdict, typeOf());
  const wasNew = recordAnswer(w, verdict);
  session.total += 1;
  if (verdict === 'good') session.correct += 1;
  if (wasNew) session.newCount += 1;
  else session.reviewCount += 1;
  if (verdict === 'again') requeue(w);
  youthHandleResult(w, verdict);
}

function requeue(w) {
  if (!session || session.types || session.requeued[w.key]) return;
  session.requeued[w.key] = 1;
  session.words.push(w);
}

function advance() {
  if (!session) return;
  session.idx += 1;
  session.revealed = false;
  session.answered = false;
  session.choice = null;
  session.feedback = null;
  session.typed = '';
  session.memoryHint = false;
  render();
}

function reveal() {
  if (!session) return;
  session.revealed = true;
  render();
}

function gradeCard(verdict) {
  if (!session || !session.revealed) return;
  const w = currentWord();
  if (!w) return;
  applyResult(w, verdict);
  advance();
}

// 「斩」：这个词已经会了，长时间不再出现
function chopWord() {
  const w = currentWord();
  if (!w) return;
  applyResult(w, 'good');
  const st = ensureSt(w.key);
  st.chopped = true;
  st.s = 'mastered';
  st.iv = 180;
  st.due = Date.now() + 180 * DAY;
  st.curve = {version:1,stage:WordIsleCurve.minutes.length-1,lastAdvance:Date.now()};
  save();
  advance();
}

function pickChoice(i) {
  if (!session || session.answered) return;
  const w = currentWord();
  if (!w) return;
  const c = ensureChoice(w);
  const opt = c.options[i];
  if (!opt) return;
  c.picked = i;
  c.answered = true;
  c.correct = !!opt.ok;
  session.answered = true;
  applyResult(w, c.correct ? 'good' : 'again');
  stopSpeak();
  FeedbackSound.play(c.correct ? 'correct' : 'wrong');
  render();
}

function submitTyped() {
  if (!session || !currentWord()) return;
  if (session.answered) { advance(); return; }
  const w = currentWord();
  const input = $('#answer');
  const typed = ((input ? input.value : '') || '').trim();
  if (!typed) { toast('先输入你的答案'); return; }
  const ok = norm(typed) === norm(w.w);
  session.typed = typed;
  session.answered = true;
  session.feedback = { ok: ok, expected: w.w, typed: typed };
  applyResult(w, ok ? 'good' : 'again');
  render();
}

/* ---------------- 词库开关 ---------------- */
function toggleDeck(id) {
  const all = allDecks().map(function (d) { return d.id; });
  let ids = (store.settings.deckIds || []).length ? store.settings.deckIds.filter(x=>all.includes(x)) : all.slice();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1); else ids.push(id);
  store.settings.deckIds = ids.length === all.length ? [] : ids.length ? ids : ['__none'];
  save();
  render();
}

/* ---------------- 导入 / 导出 ---------------- */
function prettyName(filename) {
  return String(filename || '自定义词库').replace(/\.[^.]+$/, '').slice(0, 40) || '自定义词库';
}

function normalizeWord(x) {
  if (!x) return null;
  if (typeof x === 'string') x = { w: x };
  const word = String(x.w || x.word || '').trim();
  if (!word || !/^[A-Za-z][A-Za-z' \-.]*$/.test(word)) return null;
  return {
    w: word,
    p: String(x.p || x.phonetic || '').trim(),
    pos: String(x.pos || '').trim(),
    m: String(x.m || x.meaning || '').trim(),
    e: String(x.e || x.example || '').trim(),
    t: String(x.t || x.translation || '').trim()
  };
}

function parseDelimited(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const sep = line.indexOf('\t') >= 0 ? '\t' : ',';
    const cells = line.split(sep).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    const first = (cells[0] || '').toLowerCase();
    if (i === 0 && (first === 'word' || first === '单词' || first.indexOf('word,') === 0)) continue;
    if (cells.length < 2 || !cells[0]) continue;
    let rec;
    if (cells.length === 2) rec = { w: cells[0], m: cells[1] };
    else if (cells.length === 3) rec = { w: cells[0], p: cells[1], m: cells[2] };
    else rec = { w: cells[0], p: cells[1], pos: cells[2], m: cells[3], e: cells[4] || '', t: cells[5] || '' };
    out.push(rec);
  }
  return out;
}

function addCustomDeck(name, words) {
  const clean = [];
  const seen = Object.create(null);
  words.forEach(function (x) {
    const w = normalizeWord(x);
    if (!w || !w.m) return;
    const k = norm(w.w);
    if (seen[k]) return;
    seen[k] = 1;
    clean.push(w);
  });
  if (!clean.length) throw new Error('没有解析出有效的词条（每个词至少要有单词和释义）');

  const id = 'custom-' + Date.now().toString(36);
  store.custom.push({ id: id, name: String(name || '自定义词库').slice(0, 40), desc: '导入的词库', words: clean });
  if ((store.settings.deckIds || []).length) store.settings.deckIds.push(id);
  flushSave();
  go('decks');
  toast('已导入 ' + clean.length + ' 个词');
}

function restoreBackup(data) {
  if (!window.confirm('导入备份会覆盖当前的全部学习记录，确定继续吗？')) return;
  store = blankStore();
  store.words = (data.words && typeof data.words === 'object') ? data.words : {};
  store.custom = Array.isArray(data.custom) ? data.custom : [];
  store.days = (data.days && typeof data.days === 'object') ? data.days : {};
  store.sources = Array.isArray(data.sources) ? data.sources.filter(function (x) { return x && typeof x.id === 'string' && typeof x.text === 'string'; }).slice(0, 50) : [];
  store.sourcePractice = Array.isArray(data.sourcePractice) ? data.sourcePractice.filter(function (x) { return x && typeof x.sourceId === 'string' && typeof x.word === 'string'; }).slice(-2000) : [];
  store.listeningPractice = listeningValidateHistory(data.listeningPractice);
  store.reading = WordIsleReading.validate(data.reading);
  store.settings = Object.assign({}, DEFAULTS, data.settings || {});
  if (!Array.isArray(store.settings.deckIds)) store.settings.deckIds = [];
  bookPlanMigrateSettings(store.settings, data.settings);
  session = null;
  state.view = 'home';
  store.learningSession = data.learningSession || null;
  ProductFlow.restore();
  flushSave();
  go('home');
  toast('备份已恢复');
}

function importFile(file) {
  const reader = new FileReader();
  reader.onerror = function () { toast('读取文件失败'); };
  reader.onload = function () {
    try {
      let text = String(reader.result || '').replace(/^\uFEFF/, '').trim();
      if (!text) throw new Error('文件是空的');
      if (text.charAt(0) === '{' || text.charAt(0) === '[') {
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('JSON 格式有误'); }
        if (data && !Array.isArray(data) && data.words && data.days) { restoreBackup(data); return; }
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.words) ? data.words : null);
        if (!list) throw new Error('认不出这个 JSON 的结构');
        addCustomDeck((data && data.name) || prettyName(file.name), list);
        return;
      }
      addCustomDeck(prettyName(file.name), parseDelimited(text));
    } catch (e) {
      toast('导入失败：' + (e.message || '未知错误'));
    }
  };
  reader.readAsText(file, 'utf-8');
}

function exportBackup() {
  try {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'beidanci-backup-' + dayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('已导出备份文件');
  } catch (e) { toast('导出失败：' + (e.message || '未知错误')); }
}

function resetProgress() {
  if (!window.confirm('确定清空学习进度统计吗？自定义词库、阅读剪藏和笔记会保留，进度与阅读日历会归零，且不能撤销。')) return;
  const custom = store.custom;
  const reading = WordIsleReading.resetProgress(store.reading);
  const ids = (store.settings.deckIds || []).filter(function (id) {
    return custom.some(function (d) { return d.id === id; });
  });
  store = blankStore();
  store.custom = custom;
  store.reading = reading;
  store.settings.deckIds = ids;
  session = null;
  flushSave();
  state.deckId = null;
  go('home');
  toast('学习记录已清空');
}

/* ---------------- 提示与错误 ---------------- */
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
}
let errTimer = 0;
function showErr(msg) {
  const el = $('#err');
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(errTimer);
  errTimer = setTimeout(function () { el.hidden = true; }, 8000);
}
window.addEventListener('error', function (e) {
  showErr('运行出错：' + (e.message || '未知错误') + (e.lineno ? '（' + e.filename + ':' + e.lineno + '）' : ''));
});
window.addEventListener('unhandledrejection', function (e) {
  const r = e.reason;
  showErr('运行出错：' + ((r && r.message) || r || '未知错误'));
});

/* ---------------- 液态玻璃：单颗玻璃药丸 + 弹簧跟随 + 按住拖动选择 ----------------
   一条玻璃元素贯穿整组选项，靠阻尼弹簧在项之间滑动；拖动时前后端用不同刚度，
   快慢差自动产生「拉丝」形变，松手后回弹收拢。末端做橡皮筋阻尼。
   只写 transform / width / height，不引入 backdrop-filter（见 v3.9.1 性能修正）。
   ------------------------------------------------------------------ */
const LG = (function () {
  const K_LEAD = 340, K_TRAIL = 132, DAMP = 20;
  const groups = Object.create(null);
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0, last = 0;

  function on() { return document.body.classList.contains('lg') && !document.body.classList.contains('youth') && !mqReduce.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Spring(x, k) { this.x = x; this.v = 0; this.k = k; this.d = DAMP; }
  Spring.prototype.step = function (t, dt) {
    this.v += ((t - this.x) * this.k - this.v * this.d) * dt;
    this.x += this.v * dt;
    return Math.abs(this.x - t) < 0.08 && Math.abs(this.v) < 1.2;
  };
  Spring.prototype.jump = function (t) { this.x = t; this.v = 0; };

  function Group(id, axis) {
    this.id = id; this.axis = axis;
    this.sa = new Spring(0, K_LEAD); this.sb = new Spring(0, K_LEAD); this.sc = new Spring(0, K_TRAIL);
    this.t0 = 0; this.t1 = 0; this.tc = 0; this.cross = 0; this.thick = 0;
    this.inited = false; this.drag = false; this.moved = false; this.bound = false; this.lead = 0; this.active = 0;
  }

  const start = (g, r) => g.axis === 'y' ? r.y : r.x;
  const end = (g, r) => g.axis === 'y' ? r.y + r.h : r.x + r.w;
  const size = (g, r) => g.axis === 'y' ? r.h : r.w;

  // 子项相对容器 padding box 的矩形
  function rects(g) {
    const el = g.el;
    if (!el) return [];
    const cr = el.getBoundingClientRect(), ox = cr.left + el.clientLeft, oy = cr.top + el.clientTop;
    const out = [];
    const btns = el.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      const r = btns[i].getBoundingClientRect();
      out.push({ el: btns[i], x: r.left - ox, y: r.top - oy, w: r.width, h: r.height });
    }
    return out;
  }

  function nearest(rs, g, p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < rs.length; i++) {
      const s = start(g, rs[i]), e = end(g, rs[i]);
      if (p >= s && p <= e) return i;
      const d = p < s ? s - p : p - e;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // iOS 橡皮筋：超出边界后位移趋于饱和
  function band(v, lo, hi, span) {
    if (span <= 0) return v;
    if (v < lo) { const d = lo - v; return lo - (1 - 1 / (d * 0.52 / span + 1)) * span; }
    if (v > hi) { const d = v - hi; return hi + (1 - 1 / (d * 0.52 / span + 1)) * span; }
    return v;
  }

  function aim(g, t0, t1, tc, lead) {
    const mid = (t0 + t1) / 2, cur = (g.sa.x + g.sb.x) / 2;
    const fwd = mid >= cur;
    g.sa.k = fwd ? K_TRAIL : K_LEAD;
    g.sb.k = fwd ? K_LEAD : K_TRAIL;
    // 换行时不做跨行拉丝，直接对齐该行的水平区间
    if (Math.abs(tc - g.tc) > 1 && g.inited) { g.sa.jump(t0); g.sb.jump(t1); }
    g.t0 = t0; g.t1 = t1; g.tc = tc;
    if (lead !== undefined) setLead(g, lead);
    kick();
  }

  function setLead(g, i) {
    if (g.lead === i) return;
    if (g.rs && g.rs[g.lead]) g.rs[g.lead].el.classList.remove('lg-lead');
    g.lead = i;
    if (g.rs && g.rs[i]) g.rs[i].el.classList.add('lg-lead');
  }

  function paint(g) {
    if (!g.pill) return;
    const lo = Math.min(g.sa.x, g.sb.x), hi = Math.max(g.sa.x, g.sb.x), len = Math.max(hi - lo, 2);
    const x = g.axis === 'y' ? g.sc.x : lo, y = g.axis === 'y' ? lo : g.sc.x;
    const w = g.axis === 'y' ? g.thick : len, h = g.axis === 'y' ? len : g.thick;
    g.pill.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
    if (g.pill._w !== w || g.pill._h !== h) {
      g.pill.style.width = w.toFixed(2) + 'px'; g.pill.style.height = h.toFixed(2) + 'px';
      g.pill._w = w; g.pill._h = h;
    }
    const v = (g.sa.v + g.sb.v) * 0.5;
    g.pill.style.setProperty('--sx', clamp(v * 0.5, -72, 72).toFixed(1) + 'px');
    g.pill.style.setProperty('--so', Math.min(Math.abs(v) / 520, 1).toFixed(3));
  }

  function step(g, dt) {
    const a = g.sa.step(g.t0, dt), b = g.sb.step(g.t1, dt), c = g.sc.step(g.tc, dt);
    paint(g);
    return !(a && b && c);
  }

  function tick(now) {
    raf = 0;
    const dt = clamp((now - last) / 1000 || 1 / 60, 1 / 240, 1 / 30);
    last = now;
    let busy = false;
    for (const id in groups) {
      const g = groups[id];
      if (!g.el || !g.el.isConnected) { g.el = null; g.pill = null; continue; }
      if (step(g, dt)) busy = true;
    }
    if (busy) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  // 药丸可能在两次事件之间随重绘被换掉，每次用到时惰性确认并重建，不假设它一直存在
  function pillOf(g) {
    if (!g.el) return null;
    if (!g.pill || !g.pill.isConnected) {
      const p = document.createElement('span');
      p.className = 'lgp';
      p.innerHTML = '<i></i><b></b>';
      g.pill = g.el.appendChild(p);
      g.inited = false;
    }
    return g.pill;
  }

  function ensure(el, id, axis) {
    let g = groups[id];
    if (!g) g = groups[id] = new Group(id, axis);
    g.axis = axis;
    if (g.el !== el) { g.el = el; g.pill = null; }
    pillOf(g);
    if (!el._lg) { el._lg = g; el.classList.add('lg-host'); bind(g); }
    return g;
  }

  function bind(g) {
    // 不用 setPointerCapture：它会把 click 的目标改写成容器，让原生点击失效
    function axisOf(e, el) {
      const cr = el.getBoundingClientRect();
      return g.axis === 'y' ? e.clientY - (cr.top + el.clientTop) : e.clientX - (cr.left + el.clientLeft);
    }
    g.el.addEventListener('pointerdown', function (e) {
      if (!on() || e.button !== 0) return;
      g.el = e.currentTarget;
      const rs = rects(g);
      if (!rs.length) return;
      g.rs = rs;
      const p = axisOf(e, g.el);
      g.drag = true; g.moved = false; g.px = e.clientX; g.py = e.clientY;
      setLead(g, nearest(rs, g, p));
      g.el.classList.add('lg-drag');
      const pl = pillOf(g);
      if (pl) pl.classList.add('press');
      follow(g, p);
    });
    // window 级监听只挂一次：容器会随重绘替换，组不会
    if (g.bound) return;
    g.bound = true;
    window.addEventListener('pointermove', function (e) {
      if (!g.drag) return;
      // 重绘可能换掉容器（新闻回调、自动保存后的 render），此时静默结束这次拖拽
      if (!g.el || !g.el.isConnected) { drop(g); return; }
      if (!g.moved && (Math.abs(e.clientX - g.px) > 3 || Math.abs(e.clientY - g.py) > 3)) {
        g.moved = true;
        e.preventDefault();
      }
      if (g.moved) follow(g, axisOf(e, g.el));
    });
    window.addEventListener('pointerup', function (e) { release(g, e, false); });
    window.addEventListener('pointercancel', function (e) { release(g, e, true); });
  }

  function drop(g) {
    g.drag = false; g.moved = false;
    if (g.rs && g.rs[g.lead]) g.rs[g.lead].el.classList.remove('lg-lead');
    g.lead = -1;
    if (g.el) g.el.classList.remove('lg-drag');
    const pl = pillOf(g);
    if (pl) pl.classList.remove('press');
  }

  function follow(g, p) {
    const rs = g.rs;
    if (!rs || !rs.length) return;
    const i = nearest(rs, g, p);
    const r = rs[i], half = size(g, r) / 2;
    const lo = start(g, rs[0]) + half, hi = end(g, rs[rs.length - 1]) - half;
    const c = band(p, Math.min(lo, hi), Math.max(lo, hi), end(g, rs[rs.length - 1]) - start(g, rs[0]));
    setLead(g, i);
    g.thick = g.axis === 'y' ? r.w : r.h;
    aim(g, c - half, c + half, g.axis === 'y' ? r.x : r.y);
  }

  function release(g, e, cancel) {
    if (!g.drag) return;
    if (!g.el || !g.el.isConnected) { drop(g); return; }
    g.drag = false;
    g.el.classList.remove('lg-drag');
    const pl = pillOf(g);
    if (pl) pl.classList.remove('press');
    const idx = cancel ? g.active : g.lead;
    const rs = g.rs;
    commit(g, idx);
    if (rs && rs[g.lead]) rs[g.lead].el.classList.remove('lg-lead');
    g.lead = -1;
    // 真正拖动过才接管点击；纯点按交给原生 click
    if (g.moved && !cancel && rs && rs[idx] && !rs[idx].el.classList.contains('on')) {
      rs[idx].el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  }

  function commit(g, idx) {
    const rs = g.rs || rects(g);
    const r = rs[idx];
    if (!r) return;
    g.active = idx;
    g.thick = g.axis === 'y' ? r.w : r.h;
    aim(g, start(g, r), end(g, r), g.axis === 'y' ? r.x : r.y);
  }

  function sync() {
    if (!on()) { off(); return; }
    const list = [];
    const nav = document.getElementById('nav');
    if (nav) list.push([nav, 'nav', 'y']);
    const segs = document.querySelectorAll('#view .seg');
    for (let i = 0; i < segs.length; i++) list.push([segs[i], 'seg:' + (segs[i].dataset.glass || i), 'x']);
    for (let i = 0; i < list.length; i++) {
      const el = list[i][0];
      const g = ensure(el, list[i][1], list[i][2]);
      const rs = g.rs = rects(g);
      if (!rs.length || (el.getClientRects().length === 0 && !el.offsetParent)) continue;
      let idx = 0;
      for (let j = 0; j < rs.length; j++) if (rs[j].el.classList.contains('on')) idx = j;
      const r = rs[idx];
      g.thick = g.axis === 'y' ? r.w : r.h;
      g.active = idx;
      if (!g.inited) {
        g.sa.jump(start(g, r)); g.sb.jump(end(g, r)); g.sc.jump(g.axis === 'y' ? r.x : r.y);
        g.inited = true;
      }
      commit(g, idx);
      paint(g);
    }
  }

  function off() {
    for (const id in groups) {
      const g = groups[id];
      if (g.pill) g.pill.remove();
      if (g.el) { g.el.classList.remove('lg-drag'); g.rs = null; }
      g.inited = false; g.drag = false; g.pill = null; g.el = null;
    }
  }

  // 拖动后浏览器把原生 click 落在容器本身（按下与抬起目标不同），吞掉它；
  // 落在按钮上的都是真实点按，一律放行——不用时间窗猜测，避免误伤紧接着的点击
  document.addEventListener('click', function (e) {
    if (!e.isTrusted || !e.target || !e.target.closest) return;
    const host = e.target.closest('.lg-host');
    if (host && !e.target.closest('button')) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('resize', function () { if (on()) sync(); });

  // 视图切换：玻璃从选中处展开成新页面的一层光面，再淡出
  function lens(from) {
    if (!on() || !from) return;
    const view = document.getElementById('view');
    if (!view) return;
    const r = view.getBoundingClientRect();
    const to = { x: r.left, y: Math.max(r.top, 8), w: r.width, h: Math.min(r.height, 460) };
    const el = document.createElement('div');
    el.className = 'lg-lens';
    el.innerHTML = '<i></i>';
    document.body.appendChild(el);
    const an = el.animate([
      { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', borderRadius: '13px', opacity: .62 },
      { left: to.x + 'px', top: to.y + 'px', width: to.w + 'px', height: to.h + 'px', borderRadius: '22px', opacity: 0 }
    ], { duration: 470, easing: 'cubic-bezier(.22,.86,.24,1)', fill: 'forwards' });
    an.onfinish = function () { el.remove(); };
  }

  return { sync: sync, lens: lens, on: on };
})();

/* ---------------- 事件 ---------------- */
document.addEventListener('click', function (e) {
  const target = e.target;
  if (!target || !target.closest) return;

  // 阅读区：点任意单词查释义
  const rdw = target.closest('.rd-w');
  if (rdw) {
    const raw = rdw.dataset.w || rdw.textContent;
    state.readingLookupContext = rdw.closest('.rd-para')?.querySelector('.rd-en')?.textContent || ''; 
    const entry = lookupWord(raw);
    const part = dictPart(raw);
    const pending = !entry && !(window.EXT_DICT_PARTS || {})[part];
    const token = state.dictPopRequest = (state.dictPopRequest || 0) + 1;
    showDictPop(raw, entry, rdw.getBoundingClientRect(), pending);
    if (pending) ensureExtended(part).then(function () {
      if (state.dictPopRequest === token && rdw.isConnected && $('#dictPop')) showDictPop(raw, lookupWord(raw), rdw.getBoundingClientRect(), false);
    });
    return;
  }
  if ($('#dictPop') && !target.closest('.dict-pop')) { state.dictPopRequest = (state.dictPopRequest || 0) + 1; hideDictPop(); }

  const nav = target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav); return; }

  const el = target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'map-analyze') {
    mapText = ($('#mapInput').value || '').slice(0, 20000);
    if (!mapText.trim()) { toast('请先粘贴英文文章'); return; }
    mapAnalyzed = true; render();
  } else if (act === 'map-clear') {
    mapText = ''; mapAnalyzed = false; render();
  } else if (act === 'start') {
    startSession(el.dataset.mode || store.settings.practice, { dueOnly: el.dataset.due === '1' });
  } else if (act === 'practice') {
    store.settings.practice = el.dataset.mode;
    save();
    render();
  } else if (act === 'quiz') {
    startQuiz();
  } else if (act === 'chop') {
    if (!session || !session.revealed) { toast('先看答案再斩'); return; }
    chopWord();
  } else if (act === 'reveal') {
    reveal();
  } else if (act === 'grade') {
    if (!session || !session.revealed) { toast('先看释义再自评'); return; }
    gradeCard(el.dataset.v);
  } else if (act === 'pick') {
    pickChoice(parseInt(el.dataset.i, 10));
  } else if (act === 'submit') {
    submitTyped();
  } else if (act === 'next') {
    advance();
  } else if (act === 'speak') {
    speak(el.dataset.text, 0.9);
  } else if (act === 'quit') {
    ProductFlow.pause();
  } else if (act === 'again-mode') {
    const mode = session ? session.mode : store.settings.practice;
    session = null;
    if (mode === 'mixed') startQuiz();
    else startSession(mode, {});
  } else if (act === 'goto') {
    go(el.dataset.view || 'home');
  } else if (act === 'r-filter') {
    state.readingCat = el.dataset.cat || '全部';
    render();
  } else if (act === 'r-open') {
    readerStop(false);
    reader.readingId = null;
    reader.chunks = [];
    ReadingClub.open(el.dataset.id);
  } else if (act === 'r-back') {
    readerStop(false);
    state.readingId = null;
    render();
  } else if (act === 'r-zh') {
    state.showZh = !state.showZh;
    render();
  } else if (act === 'r-speak') {
    const rd = currentReading();
    if (rd) {
      if (reader.readingId !== rd.id) readerBuild(rd);
      readerStartAt(readerParaStart(parseInt(el.dataset.i, 10)), true);
    }
  } else if (act === 'r-speak-all') {
    readerStartAt(0, true);
  } else if (act === 'r-stop') {
    readerStop(false);
  } else if (act === 'reader-toggle') {
    readerToggle();
  } else if (act === 'reader-stop') {
    readerStop(false);
  } else if (act === 'news-refresh') {
    loadNews(true);
  } else if (act === 'tts-test') {
    speak('This is how Word Isle reads an English sentence.', store.settings.ttsRate);
  } else if (act === 'tts-ms-test') {
    stopSpeak();
    const token = speakToken;
    const sample = 'The quick brown fox jumps over the lazy dog. This is the Microsoft online voice.';
    msEdgeSrc(sample).then(function (d) {
      if (token !== speakToken) return;
      if (!d) { toast('微软在线语音暂时不可用，请检查网络或换一个音色'); return; }
      playAudioFrom(Promise.resolve(d), clamp(Number(store.settings.ttsRate) || 1, 0.6, 1.4), {
        still: function () { return token === speakToken; }
      });
    });
  } else if (act === 'dict-go') {
    const inp = $('#dictQuery');
    state.dictQ = inp ? inp.value : state.dictQ;
    state.dictWord = null;
    render();
  } else if (act === 'dict-open') {
    openDictWord(el.dataset.word);
  } else if (act === 'dict-back') {
    state.dictWord = null;
    render();
  } else if (act === 'dict-alpha') {
    state.dictQ = el.dataset.c || '';
    state.dictWord = null;
    render();
  } else if (act === 'dict-add') {
    const de = dictFind(el.dataset.word);
    if (de) dictAdd(de);
  } else if (act === 'r-answer') {
    const qi = parseInt(el.dataset.q, 10);
    const oi = parseInt(el.dataset.i, 10);
    const r = currentReading();
    const a = r && WordIsleReading.record(store.reading,r);
    if (a && r.questions?.[qi]?.options[oi] && a.answers[qi] === undefined) { a.answers[qi] = oi; state.readingAnswers = a.answers; stopSpeak(); FeedbackSound.play(oi === r.questions[qi].answer ? 'correct' : 'wrong'); save(); render(); }
  } else if (act === 'open-deck') {
    state.deckId = el.dataset.deck;
    state.q = '';
    render();
  } else if (act === 'back-decks') {
    state.deckId = null;
    state.q = '';
    render();
  } else if (act === 'train-deck') {
    const d = deckById(el.dataset.deck);
    if (!d) return;
    const words = poolWords([d]);
    const now = Date.now();
    const due = words.filter(function (w) { const st = stOf(w.key); return st && st.s !== 'new' && (st.due || 0) <= now; });
    const fresh = words.filter(function (w) { const st = stOf(w.key); return !st || st.s === 'new'; });
    shuffle(due);
    shuffle(fresh);
    startSession(store.settings.practice, { words: due.concat(fresh.slice(0, bookPlanQuota())).slice(0, 60) });
  } else if (act === 'train-wrong') {
    const words = [];
    memoryHistoricalWords().forEach(function (w) {
      const st = stOf(w.key);
      if (st && (st.bad || 0) > 0) words.push({ w: w, bad: st.bad || 0 });
    });
    words.sort(function (a, b) { return b.bad - a.bad; });
    const picked = words.slice(0, 40).map(function (x) { return x.w; });
    shuffle(picked);
    if (!picked.length) { toast('错词本是空的'); return; }
    session = null;
    startSession(store.settings.practice, { words: picked });
  } else if (act === 'import') {
    const input = $('#importFile');
    if (input) input.click();
  } else if (act === 'update-check') {
    checkUpdate(true);
  } else if (act === 'bg-pick') {
    bgPick();
  } else if (act === 'bg-clear') {
    bgClear();
  } else if (act === 'export') {
    exportBackup();
  } else if (act === 'reset') {
    resetProgress();
  }
});

document.addEventListener('change', function (e) {
  const t = e.target;
  if (!t || !t.dataset) return;
  if (t.id === 'readerRange') {
    readerSeek(parseInt(t.value, 10) || 0);
    return;
  }
  if (t.id === 'importFile') {
    if (t.files && t.files[0]) importFile(t.files[0]);
    t.value = '';
    return;
  }
  if (t.id === 'bgFile') {
    if (t.files && t.files[0]) bgPickLocal(t.files[0]);
    t.value = '';
    return;
  }
  const set = t.dataset.set;
  if (set === 'deck') {
    toggleDeck(t.dataset.deck);
  } else if (set === 'autoSpeak') {
    store.settings.autoSpeak = !!t.checked;
    save();
  } else if (set === 'liquidGlass') {
    store.settings.liquidGlass = !!t.checked;
    applyGlass();
    save();
  } else if (set === 'autoUpdate') {
    store.settings.autoUpdate = !!t.checked;
    save();
    if (t.checked) checkUpdate(true);
  } else if (set === 'bgDim') {
    if (!store.settings.bg) return;
    store.settings.bg.dim = clamp(parseInt(t.value, 10) || 0, 0, 88);
    applyBackground();
    save();
  } else if (set === 'dailyNew') {
    store.settings.dailyNew = bookPlanLimit(t.value);
    save();
    render();
  } else if (set === 'direction') {
    store.settings.direction = t.value === 'zh2en' ? 'zh2en' : 'en2zh';
    save();
    render();
  } else if (set === 'ttsSource') {
    store.settings.ttsSource = TTS_SOURCES[t.value] ? t.value : 'youdao-us';
    save();
  } else if (set === 'ttsSentenceSource') {
    store.settings.ttsSentenceSource = SENTENCE_SOURCES[t.value] ? t.value : 'baidu';
    clearMsEdgeCache();
    save();
  } else if (set === 'ttsMsVoice') {
    const ok = MS_VOICES.some(function (v) { return v.id === t.value; });
    store.settings.ttsMsVoice = ok ? t.value : MS_VOICES[0].id;
    clearMsEdgeCache();
    save();
  } else if (set === 'ttsRate') {
    store.settings.ttsRate = clamp(parseFloat(t.value) || 1, 0.7, 1.3);
    save();
  }
});

document.addEventListener('input', function (e) {
  const t = e.target;
  if (!t || !t.dataset) return;

  if (t.id === 'readerRange') {
    const v = parseInt(t.value, 10) || 0;
    const info = $('#readerInfo');
    const r = currentReading();
    if (info && r && reader.total) {
      const n = (r.paragraphs || []).length;
      const idx = readerIndexAt(v);
      const pi = reader.chunks[idx] ? reader.chunks[idx].para + 1 : 1;
      info.textContent = Math.round(v / reader.total * 100) + '% · 第 ' + pi + '/' + n + ' 段';
    }
    return;
  }

  if (t.id === 'dictQuery') {
    state.dictQ = t.value;
    if (e.isComposing) return;
    const caret = t.selectionStart;
    render();
    const inp = $('#dictQuery');
    if (inp) { inp.focus(); inp.setSelectionRange(caret, caret); }
    return;
  }

  if (t.dataset.set === 'ttsRate') {
    store.settings.ttsRate = clamp(parseFloat(t.value) || 1, 0.7, 1.3);
    const label = $('#ttsRateLabel');
    if (label) label.textContent = Number(store.settings.ttsRate).toFixed(2) + '×';
    save();
    return;
  }

  if (t.dataset.set === 'bgDim' && store.settings.bg) {
    store.settings.bg.dim = clamp(parseInt(t.value, 10) || 0, 0, 88);
    document.documentElement.style.setProperty('--bg-dim', (store.settings.bg.dim / 100).toFixed(2));
    const label = $('#bgDimLabel');
    if (label) label.textContent = store.settings.bg.dim + '%';
    save();
    return;
  }

  if (t.id !== 'deckSearch') return;
  state.q = t.value;
  const view = $('#view');
  if (!view) return;
  // 只重绘列表，保留输入焦点与光标
  const pos = t.selectionStart;
  const d = deckById(state.deckId);
  if (!d) return;
  const panel = view.querySelector('section.panel');
  if (panel) {
    panel.outerHTML = viewDeckDetail(d);
    const input = $('#deckSearch');
    if (input) { input.focus(); input.setSelectionRange(pos, pos); }
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' && e.target.closest?.('summary')) return;
  if (e.key !== 'Escape' && e.target.closest && e.target.closest('[data-youth-action],[data-youth-mood],[data-memory-action],[data-memory-filter],[data-account-action],[data-product-action],[data-learner-action],[data-guide-action],[data-guide-answer]')) return;
  if (e.key === 'Escape') {
    if ($('#dictPop')) { hideDictPop(); return; }
    if (state.view === 'dict' && state.dictWord) { state.dictWord = null; render(); return; }
    if (state.view === 'study' && session) { e.preventDefault(); ProductFlow.pause(); return; }
    if (isTyping(e.target)) { e.target.blur(); return; }
    if (state.view === 'readings' && state.readingId) { state.readingId = null; render(); return; }
    if (state.deckId) { state.deckId = null; state.q = ''; render(); return; }
    return;
  }

  if (state.view === 'dict' && e.target && e.target.id === 'dictQuery' && e.key === 'Enter') {
    e.preventDefault();
    const list = dictSearch(state.dictQ.trim());
    if (list.length) openDictWord(list[0].w);
    return;
  }

  if (state.view !== 'study' || !session) return;
  const w = currentWord();
  if (!w) return;
  const t = typeOf();
  const selfRate = t === 'card';
  if (e.target.dataset && e.target.dataset.memoryNote) return;
  if (!isTyping(e.target) && (e.key === 'r' || e.key === 'R')) { speak(w.w, 0.9); return; }
  if (isTyping(e.target)) {
    if (e.key === 'Enter') { e.preventDefault(); if (session.answered) advance(); else submitTyped(); }
    return;
  }
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (selfRate) { if (!session.revealed) reveal(); else toast('请选择认识、模糊或不认识，记录这次回想'); }
    else if (session.answered) advance();
    return;
  }
  if (e.key === 'Enter') {
    if (selfRate) { if (!session.revealed) reveal(); else toast('请选择认识、模糊或不认识，记录这次回想'); }
    else if (session.answered) advance();
    return;
  }
  if (selfRate && session.revealed) {
    if (e.key === '1') { gradeCard('good'); return; }
    if (e.key === '2') { gradeCard('hard'); return; }
    if (e.key === '3') { gradeCard('again'); return; }
  }
  if (['choice','reverse','listenChoice'].includes(t) && !session.answered) {
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= 4) pickChoice(i - 1);
  }
});

/* ---------------- 登录后启动 ---------------- */
AccountSession.start(function () {
loadStore();
ProductFlow.restore();
if (!PRACTICE[store.settings.practice]) store.settings.practice = 'card';
applyGlass();
applyBackground(true);
render();
loadAppInfo();
if (store.settings.autoUpdate !== false) setTimeout(function () { checkUpdate(false); }, 5000);
});
