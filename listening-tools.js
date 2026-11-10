'use strict';
// 原音只保留在本次窗口内。听写记录随学习数据保存，音频不写入备份。
function listeningWords(text) { return String(text || '').toLowerCase().replace(/[’]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)*/g) || []; }
function listeningValidateHistory(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(x => x && typeof x.id === 'string' && typeof x.reference === 'string' && typeof x.answer === 'string' && Number.isFinite(x.score)).slice(-200).map(x => ({ id: x.id.slice(0, 100), reference: x.reference.slice(0, 10000), answer: x.answer.slice(0, 10000), time: Number.isFinite(Date.parse(x.time)) ? x.time : new Date().toISOString(), score: Math.max(0, Math.min(100, x.score)), hintUsed: !!x.hintUsed, missed: Array.isArray(x.missed) ? x.missed.filter(w => typeof w === 'string').slice(0, 500) : [], extra: Array.isArray(x.extra) ? x.extra.filter(w => typeof w === 'string').slice(0, 500) : [], changed: Array.isArray(x.changed) ? x.changed.filter(w => w && typeof w.expected === 'string' && typeof w.actual === 'string').slice(0, 500) : [] }));
}
function listeningCompare(reference, answer) {
  const a = listeningWords(reference).slice(0, 500), b = listeningWords(answer).slice(0, 500);
  const matrix = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  const matches = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  const operations = Array.from({ length: a.length + 1 }, () => new Uint8Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const equal = a[i - 1] === b[j - 1];
    const near = a[i - 1].length >= 4 && b[j - 1].length >= 4 && a[i - 1].slice(0, 3) === b[j - 1].slice(0, 3);
    const choices = [{ cost: matrix[i - 1][j - 1] + (equal ? 0 : 1), match: matches[i - 1][j - 1] + (equal ? 4 : near ? 1 : 0), op: 1 }, { cost: matrix[i - 1][j] + 1, match: matches[i - 1][j], op: 2 }, { cost: matrix[i][j - 1] + 1, match: matches[i][j - 1], op: 3 }];
    choices.sort((x, y) => x.cost - y.cost || y.match - x.match || x.op - y.op);
    matrix[i][j] = choices[0].cost; matches[i][j] = choices[0].match; operations[i][j] = choices[0].op;
  }
  const missed = [], extra = [], changed = []; let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && operations[i][j] === 1) { if (a[i - 1] !== b[j - 1]) changed.unshift({ expected: a[i - 1], actual: b[j - 1] }); i--; j--; }
    else if (i && (!j || operations[i][j] === 2)) { missed.unshift(a[--i]); }
    else { extra.unshift(b[--j]); }
  }
  return { score: a.length ? Math.round(100 * Math.max(0, 1 - matrix[a.length][b.length] / a.length)) : 0, missed, extra, changed, words: a.length };
}
function listeningKeepAudio(row, samples) {
  if (samples.byteLength > 48 * 1024 * 1024) { row.audio = null; return; }
  row.audio = samples;
  let bytes = speechState.rows.reduce((n, r) => n + (r.audio?.byteLength || 0), 0);
  for (const old of speechState.rows) { if (bytes <= 48 * 1024 * 1024) break; if (old === row || !old.audio) continue; bytes -= old.audio.byteLength; old.audio = null; if (old.audioUrl) URL.revokeObjectURL(old.audioUrl); old.audioUrl = ''; }
}
function listeningAudioUrl(row) {
  if (row.audioUrl || !row.audio) return row.audioUrl || '';
  const buffer = new ArrayBuffer(44 + row.audio.length * 2), view = new DataView(buffer);
  const tag = (at, text) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  tag(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVE'); tag(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, row.audio.length * 2, true);
  row.audio.forEach((x, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, x)) * 32767), true));
  row.audioUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })); return row.audioUrl;
}
function listeningPracticeHtml(row, disabled) {
  if (!row.en) return '';
  const result = row.practiceResult;
  const report = result ? '<div class="listening-feedback" role="status"><b>与当前英文稿词级匹配率：' + result.score + '%</b><p>' + (row.hintUsed ? '本次已查看参考稿，记录为对照练习。' : '本次提交前未查看参考稿。') + '</p>' + (result.missed.length ? '<p>遗漏：' + esc(result.missed.join(', ')) + '</p>' : '') + (result.changed.length ? '<p>错写：' + result.changed.map(x => esc(x.actual) + ' → ' + esc(x.expected)).join('；') + '</p>' : '') + (result.extra.length ? '<p>多写：' + esc(result.extra.join(', ')) + '</p>' : '') + '<p class="muted">仅与当前英文稿做文字对照，忽略大小写和标点；识别稿可能有误，请结合原音核对。</p></div>' : '';
  return '<div class="listening-practice"><div class="btn-row"><button class="btn small" data-listening-action="practice" data-id="' + row.id + '"' + disabled + '>' + (row.practicing ? '收起听写' : '逐段听写') + '</button><button class="btn small" data-listening-action="explain" data-id="' + row.id + '"' + disabled + '>AI 听力解析</button></div>' + (row.practicing ? '<label>听到什么就写什么<textarea rows="3" data-listening-answer="' + row.id + '" placeholder="可反复播放、放慢速度，再提交听写…"' + disabled + '>' + esc(row.answer || '') + '</textarea></label><div class="btn-row"><button class="btn primary small" data-listening-action="check" data-id="' + row.id + '"' + disabled + '>检查听写</button><button class="btn ghost small" data-listening-action="reveal" data-id="' + row.id + '"' + disabled + '>查看参考稿</button></div>' + report : '') + (row.coach ? '<div class="listening-feedback"><b>AI 学习解析 · ' + esc(row.coachEngine || '') + '</b><p class="listening-coach">' + esc(row.coach) + '</p><p class="muted">AI 根据文字稿分析，请结合原音核查。</p></div>' : '') + (row.coachError ? '<p class="source-translation-error">' + esc(row.coachError) + '</p>' : '') + '</div>';
}
function listeningHistoryHtml() {
  const history = store.listeningPractice || []; if (!history.length) return '<p class="muted">完成逐段听写后，这里会保留最近 200 次文字对照记录。</p>';
  const recent = history.slice(-10).reverse(), mistakes = new Map();
  history.forEach(item => [...item.missed, ...item.changed.map(x => x.expected)].forEach(word => mistakes.set(word, (mistakes.get(word) || 0) + 1)));
  const top = [...mistakes].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return '<p>已记录 ' + history.length + ' 次练习。近期需要回看的词：' + (top.map(([w, n]) => esc(w) + '（' + n + '）').join('、') || '暂未记录文字差异') + '</p><p class="muted">这些词来自听写与参考稿的差异，可先核对识别稿，再决定是否复习。</p>' + recent.map(item => '<div class="listening-history"><b>' + item.score + '% · ' + (item.hintUsed ? '对照练习' : '先听后写') + '</b><span class="muted">' + esc(new Date(item.time).toLocaleString()) + '</span><p>' + esc(item.reference) + '</p><p class="muted">我的听写：' + esc(item.answer) + '</p></div>').join('') + '<button class="btn ghost small" data-listening-action="clear-history">清空听写记录</button>';
}
function listeningTrainingHtml() {
  const info = speechState.boundaryInfo, report = info?.report;
  const detail = report ? '训练 ' + report.train.sentences + ' 句；验证 ' + report.validation.sentences + ' 句；独立测试 ' + report.test.sentences + ' 句。保守阈值下测试精确率 ' + (report.conservativeTest.precision * 100).toFixed(1) + '%，召回率 ' + (report.conservativeTest.recall * 100).toFixed(1) + '%。' : '正在读取断句模型状态…';
  const disabled = speechBusy() ? ' disabled' : '';
  return '<details class="panel source-panel source-disclosure" id="listeningTraining"' + (speechState.trainingOpen ? ' open' : '') + '><summary>断句模型与训练 <span class="muted">可选，默认直接使用内置模型</span></summary><div class="source-disclosure-body"><p>' + (info?.custom ? '当前：自训练断句模型。' : '当前：内置断句模型。') + esc(detail) + '</p><p class="muted">训练的是小型英文句界分类器。文本测试指标不代表语音识别准确率；Whisper 和 Qwen 未在此重新训练。</p><div class="btn-row"><button class="btn" data-listening-action="train-public"' + disabled + '>用公开语料训练</button><label class="btn" for="listeningTrainFile">用自己的 TXT 训练<input type="file" id="listeningTrainFile" accept=".txt,text/plain" hidden' + disabled + '></label><button class="btn" data-listening-action="train-cancel"' + (!speechState.trainerBusy ? ' disabled' : '') + '>取消训练</button><button class="btn ghost" data-listening-action="restore"' + (speechBusy() || !info?.custom ? ' disabled' : '') + '>恢复内置模型</button><button class="btn ghost" data-listening-action="report"' + (!speechState.lastTrainingReport && !report ? ' disabled' : '') + '>导出训练报告</button></div><p id="listeningTrainingStatus" role="status">' + esc(speechState.trainingMessage || '') + '</p><p class="muted">公开语料：<a href="https://universaldependencies.org/treebanks/en_ewt/" target="_blank" rel="noopener">UD English EWT r2.18 · CC BY-SA 4.0</a>，已附带校验缓存，缺失时联网下载，随后在本机训练。自己的 TXT 每行一个完整英文句子，至少 300 行，推荐 1000 行以上，最大 5 MB，不上传。按文档或连续句组划分训练、验证、测试，并去除跨分区重复句。候选模型未过验证门槛时保留当前模型；取消训练也保留当前模型。</p></div></details>';
}
async function listeningLoadStatus() { if (!window.wordIsle?.boundaryStatus) return; [speechState.boundaryInfo, speechState.translationInfo] = await Promise.all([window.wordIsle.boundaryStatus(), window.wordIsle.translationStatus?.()]); if (state.view === 'listen' && !speechBusy()) { sourceCollectAiConfig(); render(); } }
function listeningProgress(info) {
  speechState.trainingMessage = info.stage === 'train' ? '训练第 ' + info.epoch + ' / ' + info.total + ' 轮，验证 F1：' + (info.validationF1 * 100).toFixed(1) + '%' : '正在下载 ' + info.file + (info.cached ? '（已校验缓存）' : '：' + info.done + ' / ' + info.total);
  const el = document.getElementById('listeningTrainingStatus'); if (el) el.textContent = speechState.trainingMessage;
}
async function listeningTrain(input) {
  if (speechBusy() || !window.wordIsle?.boundaryTrain) return;
  sourceCollectAiConfig(); speechState.trainingOpen = true; speechState.trainerBusy = true; speechState.trainingMessage = '正在准备训练…'; render();
  try {
    const reply = await window.wordIsle.boundaryTrain(input); speechState.lastTrainingReport = reply.report || null;
    speechState.trainingMessage = reply.ok ? '训练完成并通过测试，已启用新断句模型。可以导出报告查看数据划分和指标。' : reply.error || '训练未完成，当前模型保持不变。';
    speechState.boundaryInfo = await window.wordIsle.boundaryStatus();
  } catch (error) { speechState.trainingMessage = '训练失败：' + error.message; }
  finally { speechState.trainerBusy = false; if (state.view === 'listen') render(); }
}
function listeningDownload(value, name, type) { const url = URL.createObjectURL(new Blob([value], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function listeningExplain(row) {
  const config = speechPrepare('listening'); if (!config) return;
  speechState.coachBusy = true; row.hiddenReference = false; row.hintUsed = true; row.coachError = ''; row.coach = ''; sourceCollectAiConfig(); render();
  try {
    const request = { kind: 'listening', text: row.en, title: '听力学习解析' };
    const reply = config.mode === 'api' ? await window.wordIsle.aiSource({ ...config, ...request }) : await window.wordIsle.localSource(request);
    if (!reply?.ok) throw Error(reply?.error || 'AI 未返回结果'); row.coach = reply.text; row.coachEngine = config.mode === 'api' ? 'API · ' + config.model : '内置 Qwen3 1.7B';
  } catch (error) { row.coachError = error.message; }
  finally { speechState.coachBusy = false; if (state.view === 'listen') render(); }
}
document.addEventListener('input', e => { if (e.target.dataset.listeningAnswer) { const row = speechState.rows.find(r => String(r.id) === e.target.dataset.listeningAnswer); if (row) { row.answer = e.target.value.slice(0, 10000); if (!row.hiddenReference) row.hintUsed = true; } } });
document.addEventListener('change', async e => {
  if (e.target.id === 'speechSmart' && !speechBusy()) { speechState.smart = e.target.checked; store.settings.speechSmart = speechState.smart; save(); }
  if (e.target.id === 'speechPractice' && !speechBusy()) { speechState.practice = e.target.checked; store.settings.speechPractice = speechState.practice; save(); }
  if (e.target.dataset.listeningSpeed) { const audio = document.getElementById('speech-audio-' + e.target.dataset.listeningSpeed); if (audio) audio.playbackRate = Number(e.target.value); }
  if (e.target.id === 'listeningTrainFile' && e.target.files[0]) { const file = e.target.files[0]; if (file.size > 5 * 1024 * 1024) return toast('训练文本不能超过 5 MB'); listeningTrain({ kind: 'text', text: await file.text(), name: file.name }); }
});
document.addEventListener('toggle', e => { if (e.target.id === 'listeningTraining') speechState.trainingOpen = e.target.open; }, true);
document.addEventListener('click', async e => {
  const button = e.target.closest?.('[data-listening-action]'); if (!button) return;
  const action = button.dataset.listeningAction;
  if (action === 'train-cancel') { await window.wordIsle.boundaryCancel(); return; }
  if (action === 'report') { const report = speechState.lastTrainingReport || speechState.boundaryInfo?.report; if (report) listeningDownload(JSON.stringify(report, null, 2), '词屿断句训练报告.json', 'application/json'); return; }
  if (speechBusy()) return;
  if (action === 'train-public') { listeningTrain({ kind: 'public' }); return; }
  if (action === 'restore') { const reply = await window.wordIsle.boundaryRestore(); if (reply.ok) { speechState.boundaryInfo = reply.status; speechState.trainingMessage = '已恢复内置断句模型。'; render(); } else toast(reply.error); return; }
  if (action === 'clear-history') { if (window.confirm('清空保存的听写记录？')) { store.listeningPractice = []; save(); render(); } return; }
  const row = speechState.rows.find(r => String(r.id) === button.dataset.id); if (!row) return;
  if (action === 'practice') { row.practicing = !row.practicing; if (row.practicing && !row.practiceResult) { row.hiddenReference = true; if (!row.initiallyHidden) row.hintUsed = true; } }
  if (action === 'reveal') { row.hiddenReference = false; row.hintUsed = true; }
  if (action === 'check') {
    if (!row.answer?.trim()) return toast('先写下你听到的英文');
    row.practiceResult = listeningCompare(row.en, row.answer); row.hiddenReference = false;
    const item = { id: row.practiceId || 'listening-' + Date.now() + '-' + row.id, time: new Date().toISOString(), reference: row.en, answer: row.answer, hintUsed: !!row.hintUsed, ...row.practiceResult };
    row.practiceId = item.id; store.listeningPractice = [...(store.listeningPractice || []).filter(x => x.id !== item.id), item].slice(-200); save();
  }
  if (action === 'explain') { listeningExplain(row); return; }
  render();
});
if (window.wordIsle?.onBoundaryProgress) window.wordIsle.onBoundaryProgress(listeningProgress);
