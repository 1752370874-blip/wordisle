// 从 Project Gutenberg 公版文本里抽取阅读选段，生成 data/readings-c.js
// 用法：node scripts/build-readings-pd.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'data', 'readings-c.js');
const PG = join(tmpdir(), 'wm-assets', 'gutenberg');
const ZH_FILE = join(here, 'readings-pd-zh.json');
const ZH = existsSync(ZH_FILE) ? JSON.parse(readFileSync(ZH_FILE, 'utf8')) : {};
if (!Object.keys(ZH).length) console.warn('警告：没找到 readings-pd-zh.json，生成的译文会是空的');

const BOOKS = [
  { file: 'pride.txt', id: 'r-pd-1', title: 'Pride and Prejudice · 开篇', cat: '经典', level: 'CET-6', url: 'https://www.gutenberg.org/ebooks/1342', author: 'Jane Austen', anchor: /It is a truth universally acknowledged/i },
  { file: 'scarlet.txt', id: 'r-pd-2', title: 'A Study in Scarlet · 推理的起点', cat: '经典', level: '考研', url: 'https://www.gutenberg.org/ebooks/244', author: 'Arthur Conan Doyle' },
  { file: 'timemachine.txt', id: 'r-pd-3', title: 'The Time Machine · 时间旅行者的开场', cat: '经典', level: 'IELTS', url: 'https://www.gutenberg.org/ebooks/35', author: 'H. G. Wells' },
  { file: 'alice.txt', id: 'r-pd-4', title: 'Alice in Wonderland · 掉进兔子洞', cat: '经典', level: 'CET-4', url: 'https://www.gutenberg.org/ebooks/11', author: 'Lewis Carroll' },
  { file: 'sherlock.txt', id: 'r-pd-5', title: 'The Adventures of Sherlock Holmes · 波希米亚丑闻', cat: '经典', level: '考研', url: 'https://www.gutenberg.org/ebooks/1661', author: 'Arthur Conan Doyle' },
  { file: 'frankenstein.txt', id: 'r-pd-6', title: 'Frankenstein · 极地与造物', cat: '经典', level: 'GRE', url: 'https://www.gutenberg.org/ebooks/84', author: 'Mary Shelley' },
  { file: 'dracula.txt', id: 'r-pd-7', title: 'Dracula · 城堡来信', cat: '经典', level: 'TOEFL', url: 'https://www.gutenberg.org/ebooks/345', author: 'Bram Stoker', anchor: /Left Munich at 8:35/i },
  { file: 'garden.txt', id: 'r-pd-8', title: 'The Secret Garden · 找到钥匙', cat: '经典', level: 'CET-4', url: 'https://www.gutenberg.org/ebooks/113', author: 'Frances Hodgson Burnett', anchor: /When Mary Lennox was sent/i },
  { file: 'littlewomen.txt', id: 'r-pd-9', title: 'Little Women · 四姐妹的圣诞', cat: '经典', level: 'CET-4', url: 'https://www.gutenberg.org/ebooks/514', author: 'Louisa May Alcott' },
  { file: 'yellowwallpaper.txt', id: 'r-pd-10', title: 'The Yellow Wallpaper · 墙纸里的女人', cat: '经典', level: 'IELTS', url: 'https://www.gutenberg.org/ebooks/1952', author: 'Charlotte Perkins Gilman' },
  { file: 'twocities.txt', id: 'r-pd-11', title: 'A Tale of Two Cities · 最好的时代', cat: '经典', level: '考研', url: 'https://www.gutenberg.org/ebooks/98', author: 'Charles Dickens' },
  { file: 'gatsby.txt', id: 'r-pd-12', title: 'The Great Gatsby · 西卵的夜晚', cat: '经典', level: 'TOEFL', url: 'https://www.gutenberg.org/ebooks/64317', author: 'F. Scott Fitzgerald' },
  { file: 'dorian.txt', id: 'r-pd-13', title: 'The Picture of Dorian Gray · 画室里的告白', cat: '经典', level: 'GRE', url: 'https://www.gutenberg.org/ebooks/174', author: 'Oscar Wilde' },
  { file: 'walden.txt', id: 'r-pd-14', title: 'Walden · 林中生活', cat: '经典', level: 'CET-6', url: 'https://www.gutenberg.org/ebooks/205', author: 'Henry David Thoreau' },
  { file: 'peterpan.txt', id: 'r-pd-15', title: 'Peter Pan · 永无岛之夜', cat: '经典', level: 'CET-4', url: 'https://www.gutenberg.org/ebooks/16', author: 'J. M. Barrie' },
  { file: 'callwild.txt', id: 'r-pd-16', title: 'The Call of the Wild · 雪橇与荒野', cat: '经典', level: 'IELTS', url: 'https://www.gutenberg.org/ebooks/215', author: 'Jack London' }
];

// 从已生成的大词库里取释义，给选段挑生词
const lex = new Map();
for (const f of ['dict-gre.js', 'dict-cet6.js', 'dict-cet4.js']) {
  const p = join(here, '..', 'data', f);
  if (!existsSync(p)) continue;
  const win = { DECKS: [] };
  try {
    new Function('window', readFileSync(p, 'utf8'))(win);
    for (const d of win.DECKS) {
      for (const w of d.words) {
        const k = w.w.toLowerCase();
        if (!lex.has(k)) lex.set(k, { w: w.w, p: w.p, m: w.m, rank: f === 'dict-gre.js' ? 3 : f === 'dict-cet6.js' ? 2 : 1 });
      }
    }
  } catch (e) { console.warn('读取 ' + f + ' 失败：' + e.message); }
}

function stripGutenberg(text) {
  const startM = text.match(/^\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  let body = startM ? text.slice(startM.index + startM[0].length) : text;
  const endM = body.match(/^\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  if (endM) body = body.slice(0, endM.index);
  return body.replace(/\r\n?/g, '\n');
}

function paragraphsOf(body) {
  return body.split(/\n\s*\n/).map(function (p) {
    return p.replace(/\n/g, ' ').replace(/[_*]{1,2}/g, '').replace(/\s+/g, ' ').trim();
  }).filter(function (p) {
    if (p.length < 80) return false;
    if (/^(chapter|contents|illustration|transcriber|produced by|end of)/i.test(p)) return false;
    if (/^[IVXLCDM]+\.?$/.test(p)) return false;
    if (/gutenberg|millennium fulcrum|copyright|all rights reserved|this ebook is for the use/i.test(p)) return false;
    if (/\b(transcriber|editor|published by|printed by|note that while)\b/i.test(p)) return false;
    if (/^to [A-Z]\. ?[A-Z]\./i.test(p)) return false;
    if (/^[“"][^”"]+[”"],\s*[“"]/.test(p)) return false;
    if ((p.match(/[“"]/g) || []).length >= 6) return false;
    if (/^[A-Z][A-Z\s,.'-]{30,}$/.test(p)) return false;
    return /[.!?]$/.test(p);
  });
}

function splitSentences(p) {
  return p.match(/[^.!?]+[.!?]+/g) || [p];
}

// 长段落按句子切成不超过 maxWords 的小段，避免整篇只有一个巨型段落
function chunkParagraph(p, maxWords) {
  const sents = splitSentences(p);
  const chunks = [];
  let cur = [];
  let n = 0;
  for (const s of sents) {
    const w = s.split(/\s+/).filter(Boolean).length;
    if (n + w > maxWords && cur.length) {
      chunks.push(cur.join(' ').trim());
      cur = [];
      n = 0;
    }
    cur.push(s);
    n += w;
  }
  if (cur.length) chunks.push(cur.join(' ').trim());
  return chunks;
}

function pickVocab(text) {
  const words = Array.from(new Set((text.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [])));
  const found = words.map(function (w) { return lex.get(w); }).filter(Boolean);
  found.sort(function (a, b) { return (b.rank - a.rank) || (b.w.length - a.w.length); });
  const out = [];
  const seen = new Set();
  for (const v of found) {
    const k = v.w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ w: v.w, p: v.p, m: v.m });
    if (out.length >= 8) break;
  }
  return out;
}

const entries = [];
for (const b of BOOKS) {
  const p = join(PG, b.file);
  if (!existsSync(p)) { console.warn('缺少文本 ' + p); continue; }
  const paras = paragraphsOf(stripGutenberg(readFileSync(p, 'utf8')));
  if (!paras.length) { console.warn('没抽到段落：' + b.file); continue; }
  let startIdx = 0;
  if (b.anchor) {
    const idx = paras.findIndex(function (x) { return b.anchor.test(x); });
    if (idx >= 0) startIdx = idx;
  }
  const picked = [];
  let words = 0;
  for (const p2 of paras.slice(startIdx, startIdx + 60)) {
    if (words >= 160) break;
    const chunks = chunkParagraph(p2, 80);
    const take = chunks[0] || '';
    const n = take.split(/\s+/).filter(Boolean).length;
    if (n < 22) continue;
    if (words + n > 240) break;
    picked.push(take);
    words += n;
    if (words < 130 && chunks[1]) {
      const t2 = chunks[1];
      const n2 = t2.split(/\s+/).filter(Boolean).length;
      if (words + n2 <= 240) { picked.push(t2); words += n2; }
    }
  }
  if (!picked.length) { console.warn('段落太短：' + b.file); continue; }
  const text = picked.join(' ');
  const zh = ZH[b.id] || [];
  if (zh.length && zh.length !== picked.length) console.warn('译文段数与原文不符：' + b.id + ' ' + zh.length + ' vs ' + picked.length);
  entries.push({
    id: b.id,
    title: b.title,
    category: b.cat,
    level: b.level,
    source: 'Project Gutenberg · 公有领域 · ' + b.author,
    license: 'public-domain',
    sourceUrl: b.url,
    paragraphs: picked,
    translation: ZH[b.id] || [],
    vocab: pickVocab(text),
    questions: []
  });
}

const body = 'window.READINGS = (window.READINGS || []).concat(' + JSON.stringify(entries, null, 2) + ');\n';
writeFileSync(OUT, body, 'utf8');
console.log('公版阅读：' + entries.length + ' 篇 -> ' + OUT);
entries.forEach(function (e) {
  console.log('  ' + e.id + '  ' + e.paragraphs.length + ' 段 / ' + e.paragraphs.join(' ').split(/\s+/).length + ' 词 / 生词 ' + e.vocab.length);
});
