// 把 qwerty-learner 的六本词库 + 例句数据，生成应用使用的 data/dict-*.js
// 用法：node scripts/build-lexicon.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let toSimplified = (s) => s;
try {
  const OpenCC = require('opencc-js');
  const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
  toSimplified = (s) => converter(String(s));
} catch (e) {
  console.warn('未安装 opencc-js，中文翻译将保留原样（可能是繁体）。');
}

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'data');
const TMP = join(tmpdir(), 'wm-assets');

const BOOKS = [
  { file: 'CET4_T', id: 'cet4', name: 'CET-4 核心', desc: '大学英语四级词汇' },
  { file: 'CET6_T', id: 'cet6', name: 'CET-6 进阶', desc: '大学英语六级词汇' },
  { file: 'KaoYan_3_T', id: 'kaoyan', name: '考研词汇', desc: '考研英语核心词' },
  { file: 'IELTS_3_T', id: 'ielts', name: '雅思词汇', desc: '雅思听说读写核心词' },
  { file: 'TOEFL_3_T', id: 'toefl', name: '托福词汇', desc: '托福核心词汇' },
  { file: 'GRE_3_T', id: 'gre', name: 'GRE 词汇', desc: 'GRE 高频进阶词' }
];

const POS_RE = /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|phr)\.\s*/i;
const POS_MAP = { vt: 'v.', vi: 'v.', n: 'n.', v: 'v.', adj: 'adj.', adv: 'adv.', prep: 'prep.', conj: 'conj.', pron: 'pron.', num: 'num.', art: 'art.', int: 'int.', aux: 'aux.', phr: 'phr.' };

function readJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { console.warn('读取失败：' + p + '：' + e.message); return fallback; }
}

const bilingual = readJson(join(TMP, 'examples.json'), {});
const englishOnly = readJson(join(TMP, 'english-examples.json'), {});
const wordnet = readJson(join(TMP, 'wordnet.json'), {});

function cleanPart(s) {
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。；、）】」,.;:])/g, '$1')
    .replace(/([（【「])\s+/g, '$1')
    .trim();
}
function buildMeaning(trans) {
  if (!Array.isArray(trans)) return '';
  const parts = [];
  for (const raw of trans) {
    const t = cleanPart(raw);
    if (t) parts.push(t);
  }
  return Array.from(new Set(parts)).join('；').slice(0, 160);
}
function buildPos(trans) {
  if (!Array.isArray(trans) || !trans.length) return '';
  const first = String(trans[0]).trim();
  const m = POS_RE.exec(first);
  if (!m) return '';
  return POS_MAP[m[1].toLowerCase()] || '';
}
function stripPos(trans) {
  if (!Array.isArray(trans) || !trans.length) return trans;
  const copy = trans.slice();
  copy[0] = String(copy[0]).replace(POS_RE, '');
  return copy;
}
function buildPhon(usphone, ukphone) {
  const src = String(usphone || ukphone || '').trim();
  if (!src) return '';
  const first = src.split(';')[0].trim();
  if (!first) return '';
  return '/' + first.replace(/'/g, 'ˈ').replace(/,/g, 'ˌ').replace(/^\/|\/$/g, '') + '/';
}

const report = [];
let uid = 0;
for (const book of BOOKS) {
  const src = join(TMP, book.file + '.json');
  if (!existsSync(src)) { console.warn('缺少词库文件 ' + src); continue; }
  const raw = JSON.parse(readFileSync(src, 'utf8'));
  const seen = new Set();
  const words = [];
  for (const e of raw) {
    const w = String(e.name || '').trim();
    if (!w || w.length > 48) continue;
    if (!/^[A-Za-z][A-Za-z' .\-]*$/.test(w)) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const trans = stripPos(Array.isArray(e.trans) ? e.trans : []);
    const meaning = buildMeaning(trans);
    if (!meaning) continue;
    const ex = bilingual[key] || englishOnly[key] || wordnet[key] || null;
    words.push({
      w: w,
      p: buildPhon(e.usphone, e.ukphone),
      pos: buildPos(e.trans),
      m: meaning,
      e: ex ? ex.e : '',
      t: ex && ex.t ? ex.t : ''
    });
  }
  words.sort((a, b) => a.w.toLowerCase().localeCompare(b.w.toLowerCase()));
  const withEx = words.filter((x) => x.e).length;
  const withCn = words.filter((x) => x.e && x.t).length;
  const payload = {
    id: book.id,
    name: book.name,
    desc: book.desc + '（' + words.length + ' 词）',
    words: words
  };
  const text = 'window.DECKS=window.DECKS||[];window.DECKS.push(' + JSON.stringify(payload) + ');\n';
  writeFileSync(join(OUT, 'dict-' + book.id + '.js'), text, 'utf8');
  report.push({ id: book.id, words: words.length, withEx, withCn, kb: Math.round(text.length / 1024) });
}

console.log('');
console.log('词库'.padEnd(10) + '词数'.padStart(8) + '有例句'.padStart(9) + '含中文'.padStart(9) + '体积KB'.padStart(9));
let tw = 0, te = 0, tc = 0;
for (const r of report) {
  console.log(r.id.padEnd(10) + String(r.words).padStart(8) + String(r.withEx).padStart(9) + String(r.withCn).padStart(9) + String(r.kb).padStart(9));
  tw += r.words; te += r.withEx; tc += r.withCn;
}
console.log('-'.repeat(46));
console.log('合计'.padEnd(10) + String(tw).padStart(8) + String(te).padStart(9) + String(tc).padStart(9));
console.log('例句覆盖率：' + (te * 100 / Math.max(1, tw)).toFixed(1) + '%；其中带中文翻译：' + (tc * 100 / Math.max(1, tw)).toFixed(1) + '%');
