// 词库数据自检：node scripts/verify-data.mjs
// 检查 data/*.js 的结构、字段完整性、重复词、音标格式、例句是否混入中文等。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');

if (!existsSync(dataDir)) {
  console.error('找不到 data 目录：' + dataDir);
  process.exit(1);
}

const files = readdirSync(dataDir).filter(function (f) { return f.endsWith('.js'); }).sort();
if (!files.length) {
  console.error('data 目录里没有 .js 词库文件');
  process.exit(1);
}

const win = { DECKS: [] };
for (const f of files) {
  const code = readFileSync(join(dataDir, f), 'utf8');
  try {
    new Function('window', code)(win);
  } catch (e) {
    console.error('✗ ' + f + ' 执行失败：' + e.message);
    process.exitCode = 1;
  }
}

const POS = new Set(['v.', 'n.', 'adj.', 'adv.', 'prep.', 'conj.', 'phr.', 'pron.', 'num.', 'art.', 'det.', 'modal.', 'aux.', 'int.']);
const seenGlobal = new Map();
const crossDup = [];
let problems = 0;
const ids = new Set();

console.log('');
for (const deck of win.DECKS) {
  const tag = '[' + deck.id + '] ' + deck.name;
  const issues = [];
  if (!deck.id || ids.has(deck.id)) issues.push('id 缺失或重复');
  ids.add(deck.id);
  if (!deck.name) issues.push('缺少 name');
  if (!Array.isArray(deck.words) || !deck.words.length) issues.push('words 为空');

  const seen = new Set();
  let bad = 0;
  for (const w of deck.words || []) {
    const where = deck.id + '::' + (w && w.w);
    if (!w || !w.w) { issues.push(where + ' 缺少 w'); bad++; continue; }
    if (seen.has(w.w.toLowerCase())) issues.push(where + ' 库内重复');
    seen.add(w.w.toLowerCase());
    if (!/^[A-Za-z][A-Za-z' \-.]*$/.test(w.w)) issues.push(where + ' 单词含非法字符');
    if (seenGlobal.has(w.w.toLowerCase()) && seenGlobal.get(w.w.toLowerCase()) !== deck.id) {
      crossDup.push(where + ' 与 ' + seenGlobal.get(w.w.toLowerCase()) + ' 重复');
    }
    seenGlobal.set(w.w.toLowerCase(), deck.id);
    if (!w.m) issues.push(where + ' 缺少释义');
    if (w.p && !/^\/[^/]+\/$/.test(w.p)) issues.push(where + ' 音标格式应为 /.../：' + w.p);
    if (w.pos && !POS.has(w.pos)) issues.push(where + ' 词性非常用写法：' + w.pos);
    if (w.e && /[\u4e00-\u9fff]/.test(w.e)) issues.push(where + ' 例句里混入了中文');
    if (w.t && !/[\u4e00-\u9fff]/.test(w.t)) issues.push(where + ' 例句翻译不是中文：' + String(w.t).slice(0, 40));
  }
  if (issues.length) { problems += issues.length; console.log('✗ ' + tag + '  ' + (deck.words || []).length + ' 词'); issues.slice(0, 12).forEach(function (x) { console.log('    - ' + x); }); }
  else console.log('✓ ' + tag + '  ' + (deck.words || []).length + ' 词');
}

const total = win.DECKS.reduce(function (n, d) { return n + ((d.words || []).length); }, 0);

// v4 起移除了「图片记忆」，图卡数据不再校验；阅读的生词来自词库点查。

// 例句覆盖
let withEx = 0, withCn = 0, totalWords = 0;
for (const d of win.DECKS) {
  for (const w of d.words) {
    totalWords++;
    if (w.e) withEx++;
    if (w.e && w.t) withCn++;
  }
}
console.log('');
console.log('例句覆盖：' + withEx + ' / ' + totalWords + '（' + (withEx * 100 / Math.max(1, totalWords)).toFixed(1) + '%）；带中文翻译 ' + (withCn * 100 / Math.max(1, totalWords)).toFixed(1) + '%');
for (const d of win.DECKS) {
  const n = (d.words || []).length;
  const h = (d.words || []).filter(function (x) { return x.e; }).length;
  const pct = n ? h * 100 / n : 0;
  if (pct < 99) console.log('    ' + d.id + '：' + h + ' / ' + n + '（' + pct.toFixed(1) + '%）');
}
if (withEx < totalWords * 0.8) {
  console.log('    警告：例句覆盖率低于 80%，检查 build-examples.py / build-wordnet.py 是否跑过。');
}

console.log('');
if (crossDup.length) {
  console.log('提示：跨词库重复 ' + crossDup.length + ' 个（真实词表常见，应用内按单词去重学习，不算错误）');
  crossDup.slice(0, 5).forEach(function (x) { console.log('    · ' + x); });
  console.log('');
}
// 阅读数据校验
const readings = win.READINGS || [];
if (readings.length) {
  const ids = new Set();
  const cats = {};
  const badR = [];
  for (const r of readings) {
    if (!r.id || ids.has(r.id)) badR.push('重复/缺失 id: ' + r.id);
    ids.add(r.id);
    if (!r.title || !Array.isArray(r.paragraphs) || !r.paragraphs.length) { badR.push(r.id + ' 缺标题或段落'); continue; }
    cats[r.category || '未分类'] = (cats[r.category || '未分类'] || 0) + 1;
    const words = r.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
    if (words < 100 || words > 340) badR.push(r.id + ' 词数异常：' + words);
    if (r.license === 'original') {
      if (!Array.isArray(r.translation) || r.translation.length !== r.paragraphs.length) badR.push(r.id + ' 翻译段数与正文不一致');
      if (!Array.isArray(r.vocab) || r.vocab.length < 3) badR.push(r.id + ' 生词少于 3 个');
      for (const v of r.vocab || []) if (!v || !v.w || !v.p || !v.m) badR.push(r.id + ' 生词字段缺失');
      if (!Array.isArray(r.questions) || r.questions.length < 1) badR.push(r.id + ' 缺少理解题');
      for (const q of r.questions || []) {
        if (!q || !q.q || !Array.isArray(q.options) || q.options.length !== 4) badR.push(r.id + ' 题目格式异常');
        else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) badR.push(r.id + ' 答案下标异常');
      }
    }
  }
  console.log('阅读：' + readings.length + ' 篇；分类 ' + JSON.stringify(cats));
  if (badR.length) {
    console.log('  阅读问题 ' + badR.length + ' 处：');
    badR.slice(0, 12).forEach(function (x) { console.log('    - ' + x); });
    problems += badR.length;
  }
  console.log('');
}


console.log('共 ' + win.DECKS.length + ' 个词库 / ' + total + ' 个词条 / ' + readings.length + ' 篇阅读；错误 ' + problems + ' 处。');
if (problems) process.exitCode = 1;
