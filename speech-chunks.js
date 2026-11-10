'use strict';
// 只限制识别器的计算窗口，不作为音频句界，不生成新的听译行。
function recognitionWindows(samples, rate = 16000) {
  const max = 14 * rate, overlap = Math.round(.4 * rate), window = Math.round(.08 * rate), out = [];
  let start = 0;
  while (start < samples.length) {
    let end = Math.min(samples.length, start + max);
    if (end < samples.length) {
      let best = end, energy = Infinity;
      for (let at = start + 11 * rate; at + window <= end; at += window) {
        let sum = 0; for (let i = at; i < at + window; i++) sum += samples[i] * samples[i];
        if (sum < energy) { energy = sum; best = at + Math.floor(window / 2); }
      }
      end = best;
    }
    out.push({ start, end });
    if (end >= samples.length) break;
    start = end - overlap;
  }
  return out;
}
function joinRecognition(before, after) {
  before = String(before || '').trim(); after = String(after || '').trim();
  if (!before) return after; if (!after) return before;
  const clean = word => word.toLowerCase().replace(/[^a-z0-9']/g, '');
  const left = before.split(/\s+/), right = after.split(/\s+/);
  for (let n = Math.min(8, left.length, right.length); n >= 1; n--) {
    if (n === 1 && clean(right[0]).length < 3) continue;
    if (left.slice(-n).map(clean).join(' ') === right.slice(0,n).map(clean).join(' ')) { right.splice(0,n); break; }
  }
  if (!right.length) return before;
  const abbreviation = /(?:\b[A-Za-z]\.){2,}$|\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\.$/i.test(before);
  if (!abbreviation) before = before.replace(/\.+$/, '');
  return (before + (right.length ? ' ' + right.join(' ') : '')).trim();
}
module.exports = { recognitionWindows, joinRecognition };
