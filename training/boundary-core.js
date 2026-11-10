'use strict';
const crypto = require('node:crypto');
const DIM = 65536;
const lex = text => Array.from(String(text).matchAll(/[A-Za-z]+(?:['’\-][A-Za-z]+)*|\d+(?:[.,]\d+)*/g), m => ({ value: m[0], start: m.index, end: m.index + m[0].length }));
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return ((h >>> 0) % (DIM - 1)) + 1; }
function features(words, i) {
  const raw = n => words[n]?.value || '', word = n => raw(n).toLowerCase().replace(/\d/g, '0');
  const p = word(i), n = word(i + 1), p2 = word(i - 1), n2 = word(i + 2);
  const keys = ['p=' + p, 'n=' + n, 'p2=' + p2, 'n2=' + n2, 'pn=' + p + '|' + n,
    'pp=' + p2 + '|' + p, 'nn=' + n + '|' + n2, 'ps=' + p.slice(-3), 'ns=' + n.slice(0, 3),
    'ncase=' + (/^[A-Z][a-z]/.test(raw(i + 1)) ? 'title' : raw(i + 1) === 'I' ? 'I' : 'other'),
    'pcase=' + (/^[A-Z][a-z]/.test(raw(i)) ? 'title' : 'other'),
    'pnum=' + /^\d/.test(p), 'nnum=' + /^\d/.test(n)];
  return Uint32Array.from([0, ...keys.map(hash)]);
}
function probability(weights, f) { let score = 0; for (const index of f) score += weights[index]; return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, score)))); }
function parseConllu(text) {
  const docs = []; let document = null;
  for (const block of text.split(/\r?\n\s*\r?\n/)) {
    const marker = block.match(/^# newdoc id = (.+)$/m);
    if (!document || marker) { document = { id: marker?.[1] || 'doc-' + docs.length, sentences: [] }; docs.push(document); }
    const sentence = block.match(/^# text = (.+)$/m)?.[1]?.trim();
    if (sentence && lex(sentence).length >= 3 && lex(sentence).length <= 140) document.sentences.push(sentence);
  }
  return docs.filter(doc => doc.sentences.length);
}
function dedupe(documents, seen) {
  return documents.map(doc => ({ ...doc, sentences: doc.sentences.filter(text => {
    const key = lex(text).map(w => w.value.toLowerCase()).join(' ');
    if (seen.has(key)) return false; seen.add(key); return true;
  }) })).filter(doc => doc.sentences.length);
}
function examples(documents, augment = false) {
  const result = [];
  for (let d = 0; d < documents.length; d++) {
    const doc = documents[d];
    const variants = augment && d % 4 === 0 ? [false, true] : [false];
    for (const lowercase of variants) {
      const words = [], boundaries = new Set();
      for (const sentence of doc.sentences) { words.push(...lex(lowercase ? sentence.toLowerCase() : sentence)); boundaries.add(words.length - 1); }
      for (let i = 1; i < words.length - 2; i++) result.push({ f: features(words, i), y: boundaries.has(i) ? 1 : 0, capital: /^[A-Z][a-z]/.test(words[i + 1].value) });
    }
  }
  return result;
}
function metrics(scores, data, threshold) {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < data.length; i++) { const yes = scores[i] >= threshold; if (yes && data[i].y) tp++; else if (yes) fp++; else if (data[i].y) fn++; }
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
  return { precision, recall, f1: 2 * precision * recall / Math.max(1e-9, precision + recall), truePositive: tp, falsePositive: fp, falseNegative: fn, threshold };
}
function score(weights, data) { return Float32Array.from(data, item => probability(weights, item.f)); }
function bestThreshold(scores, data) {
  let best = { f1: -1 };
  for (let t = .15; t <= .951; t += .025) { const m = metrics(scores, data, t); if (m.f1 > best.f1) best = m; }
  return best;
}
function train({ trainDocs, devDocs, testDocs, source, progress = () => {} }) {
  const seen = new Set(); trainDocs = dedupe(trainDocs, seen); devDocs = dedupe(devDocs, seen); testDocs = dedupe(testDocs, seen);
  const trainData = examples(trainDocs, true), devData = examples(devDocs), testData = examples(testDocs);
  if (trainDocs.reduce((n, d) => n + d.sentences.length, 0) < 150 || devData.filter(x => x.y).length < 20 || testData.filter(x => x.y).length < 20) throw Error('可用于训练和独立验证的句子不足，请提供至少 300 行不同的完整英文句子，推荐 1000 行以上');
  const weights = new Float32Array(DIM), squared = new Float32Array(DIM); weights[0] = -2.2;
  const order = Uint32Array.from({ length: trainData.length }, (_, i) => i); let seed = 42, best = null;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  for (let epoch = 0; epoch < 14; epoch++) {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)), old = order[i]; order[i] = order[j]; order[j] = old; }
    const rate = .13 / Math.sqrt(1 + epoch * .12);
    for (const index of order) {
      const item = trainData[index], gradient = (probability(weights, item.f) - item.y) * (item.y ? 2.5 : 1);
      for (const j of item.f) { squared[j] += gradient * gradient; weights[j] -= rate * (gradient + .0005 * weights[j]) / Math.sqrt(squared[j] + .01); }
    }
    const evaluated = bestThreshold(score(weights, devData), devData);
    progress({ stage: 'train', epoch: epoch + 1, total: 14, validationF1: evaluated.f1 });
    if (!best || evaluated.f1 > best.validation.f1) best = { weights: new Float32Array(weights), validation: evaluated, epoch: epoch + 1 };
  }
  const devScores = score(best.weights, devData); let operating = null;
  for (let t = .65; t <= .976; t += .025) { const m = metrics(devScores, devData, t); if (m.precision >= .88 && m.truePositive >= 10 && (!operating || m.recall > operating.recall)) operating = m; }
  if (!operating) operating = metrics(devScores, devData, Math.max(.75, best.validation.threshold));
  const testScores = score(best.weights, testData);
  const test = metrics(testScores, testData, best.validation.threshold), conservativeTest = metrics(testScores, testData, operating.threshold);
  const baseline = metrics(Float32Array.from(testData, item => item.capital ? 1 : 0), testData, .5);
  const count = docs => ({ documents: docs.length, sentences: docs.reduce((n, d) => n + d.sentences.length, 0) });
  const report = { source, algorithm: 'Hashed lexical/context/capitalization features + logistic regression with AdaGrad; punctuation masked; seed 42', dimensions: DIM, chosenEpoch: best.epoch, train: { ...count(trainDocs), examples: trainData.length }, validation: { ...count(devDocs), examples: devData.length, ...best.validation }, test: { ...count(testDocs), examples: testData.length, ...test }, conservativeTest, baselineCapitalization: baseline,
    note: '指标仅衡量该英文文本测试集上的词后句界判断，不是语音识别准确率、真实课堂断句准确率或学习效果。验证集选参数，测试集不参与训练与选参。大小写是输入特征，真实无大小写输入的表现可能不同。' };
  const accepted = test.f1 >= .45 && conservativeTest.precision >= .75 && conservativeTest.truePositive >= 10;
  return { schema: 1, name: 'WordIsle English Boundary', createdAt: new Date().toISOString(), source, dimensions: DIM, threshold: operating.threshold, accepted, weights: Buffer.from(best.weights.buffer).toString('base64'), report };
}
const ABBREVIATIONS = new Set('mr mrs ms dr prof sr jr st vs etc eg ie inc ltd no fig eq dept jan feb mar apr jun jul aug sep sept oct nov dec approx vol pp'.split(' '));
function protectedDot(text, at) {
  if (/\d/.test(text[at - 1] || '') && /\d/.test(text[at + 1] || '')) return true;
  const prefix = text.slice(0, at + 1), word = prefix.match(/([A-Za-z.]+)\.$/)?.[1] || '';
  return ABBREVIATIONS.has(word.toLowerCase()) || /(?:[A-Za-z]\.){2,}$/.test(prefix) || /(?:^|\s)[A-Z]\.$/.test(prefix);
}
function decode(model) { if (!model || model.schema !== 1 || model.dimensions !== DIM || !model.accepted) return null; const bytes = Uint8Array.from(Buffer.from(model.weights, 'base64')); if (bytes.byteLength !== DIM * 4) return null; return { ...model, vector: new Float32Array(bytes.buffer) }; }
function split(text, model) {
  text = String(text || '').trim(); const words = lex(text), insertions = []; let sinceBoundary = 0;
  if (model) {
    for (let i = 0; i < words.length - 4; i++) {
      sinceBoundary++;
      const gap = text.slice(words[i].end, words[i + 1].start);
      if (/[.!?]/.test(gap)) { sinceBoundary = 0; continue; }
      if (sinceBoundary < 7 || words.length - i < 6 || !/^\s+$/.test(gap)) continue;
      if (probability(model.vector, features(words, i)) >= model.threshold) { insertions.push(words[i].end); sinceBoundary = 0; }
    }
  }
  for (let i = insertions.length - 1; i >= 0; i--) text = text.slice(0, insertions[i]) + '.' + text.slice(insertions[i]);
  const sentences = []; let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!/[.!?]/.test(text[i]) || (text[i] === '.' && protectedDot(text, i))) continue;
    let end = i + 1; while (/[.!?"'”’\])]/.test(text[end] || '\0')) end++;
    if (end < text.length && !/\s/.test(text[end])) continue;
    const sentence = text.slice(start, end).trim(); if (sentence) sentences.push(sentence);
    start = end; i = end - 1;
  }
  const tail = text.slice(start).trim(); if (tail) sentences.push(tail);
  return { text: sentences.join('\n'), sentences, insertedBoundaries: insertions.length, boundaryModel: model ? model.name : '英文标点规则' };
}
function splitCustom(text) {
  const lines = String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const documents = lines.map((sentence, i) => ({ id: 'line-' + i, sentences: [sentence] }));
  // Group consecutive lines to retain adjacent sentence context; assign whole groups to one partition.
  const groups = []; for (let i = 0; i < documents.length; i += 10) groups.push({ id: 'group-' + i, sentences: documents.slice(i, i + 10).flatMap(d => d.sentences) });
  return { trainDocs: groups.filter((_, i) => i % 10 >= 2), devDocs: groups.filter((_, i) => i % 10 === 0), testDocs: groups.filter((_, i) => i % 10 === 1) };
}
function splitPublic(training, development, test) {
  return { trainDocs: parseConllu(training), devDocs: parseConllu(development), testDocs: parseConllu(test) };
}
function evaluatePublic(model, data) { const seen = new Set(); dedupe(data.trainDocs, seen); dedupe(data.devDocs, seen); const testDocs=dedupe(data.testDocs, seen), dataset=examples(testDocs); return {sentences:testDocs.reduce((n,d)=>n+d.sentences.length,0), ...metrics(score(model.vector,dataset),dataset,model.threshold)}; }
module.exports = { DIM, lex, features, probability, parseConllu, train, decode, split, splitCustom, splitPublic, evaluatePublic };
