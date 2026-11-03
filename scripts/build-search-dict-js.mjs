// 给查词词典补 IPA（CMUdict 转写），输出 data/search-dict.js（懒加载）
import { readFileSync, writeFileSync } from 'node:fs';

const D = 'C:/Users/17523/Documents/deepseek-harness/default-workspace/';
const SRC = D + '_work/search-dict.json';
const WN = process.env.TEMP + '/wm-dict/cmudict.dict';
const OUT = D + 'word-master/data/search-dict.js';

const ARPA = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð',
  EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'i', JH: 'dʒ', K: 'k', L: 'l',
  M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ',
  UH: 'ʊ', UW: 'u', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ'
};
const VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);

function cmuToIpa(phones) {
  const items = phones.map((p) => {
    const m = p.match(/^([A-Z]+)([0-2])?$/);
    return m ? { ph: m[1], stress: m[2] ? Number(m[2]) : null } : null;
  }).filter(Boolean);
  if (!items.length) return '';
  const marks = new Array(items.length).fill('');
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!VOWELS.has(it.ph) || !it.stress) continue;
    let j = i;
    while (j > 0 && !VOWELS.has(items[j - 1].ph)) j--;
    marks[j] = it.stress === 1 ? 'ˈ' : 'ˌ';
  }
  let out = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    let ipa = ARPA[it.ph] || '';
    if (it.ph === 'AH' && it.stress === 0) ipa = 'ə';
    if (it.ph === 'ER' && it.stress === 0) ipa = 'ɚ';
    out += marks[i] + ipa;
  }
  return '/' + out + '/';
}

const cmu = new Map();
for (const line of readFileSync(WN, 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith(';;;')) continue;
  const sp = line.indexOf(' ');
  if (sp < 0) continue;
  const word = line.slice(0, sp).replace(/\(\d+\)$/, '').toLowerCase();
  if (cmu.has(word)) continue;
  cmu.set(word, line.slice(sp + 1).trim().split(/\s+/));
}

const entries = JSON.parse(readFileSync(SRC, 'utf8'));
let withIpa = 0;
for (const e of entries) {
  let p = String(e.p || '').trim();
  if (!/^\/.+\/$/.test(p)) {
    const cmuPh = cmu.get(e.w.toLowerCase());
    p = cmuPh ? cmuToIpa(cmuPh) : '';
  }
  if (!p && e.ph) {
    let s2 = String(e.ph).replace(/ә/g, 'ə').replace(/'/g, 'ˈ').replace(/:/g, 'ː').replace(/g/g, 'ɡ').replace(/\s+/g, '');
    if (s2) p = '/' + s2 + '/';
  }
  delete e.ph;
  e.p = p;
  if (p) withIpa++;
}
writeFileSync(OUT, 'window.SEARCH_DICT=' + JSON.stringify(entries) + ';\n', 'utf8');
console.log('entries', entries.length, 'ipa', withIpa, '->', OUT);
console.log('bytes', readFileSync(OUT).length);
console.log('sample', JSON.stringify(entries.slice(2000, 2002)));
