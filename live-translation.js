'use strict';
const speechState = { mode: 'model', smart: true, practice: false, loaded: false, devices: [], device: '', devicesRequested: false, rows: [], queue: [], processing: false, segmenting: false, coachBusy: false, trainerBusy: false, boundaryInfo: null, trainingOpen: false, trainingMessage: '', recording: false, starting: false, fileBusy: false, cancelFile: false, notice: '', progress: '', follow: true, epoch: 0, counter: 0, stream: null, context: null, node: null, segmenter: null, config: null, fileName: '' };
const speechBusy = () => speechState.recording || speechState.starting || speechState.processing || speechState.segmenting || speechState.coachBusy || speechState.trainerBusy || speechState.fileBusy || speechState.queue.length > 0;
const speechTime = seconds => Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + Math.floor(seconds % 60).toString().padStart(2, '0');
function speechRowHtml(row) {
  const disabled = speechBusy() ? ' disabled' : '';
  const warning = !row.hiddenReference && !row.translationQuality && sourceNumberWarning(row.en, row.zh);
  const engine = row.engine ? '<span class="speech-engine">' + esc(row.engine) + (row.zhEdited ? ' · 已手动修订' : '') + '</span>' : '';
  const audioUrl = !speechBusy() && listeningAudioUrl(row);
  const audio = audioUrl ? '<div class="listening-audio"><audio controls preload="none" id="speech-audio-' + row.id + '" src="' + audioUrl + '"></audio><label>速度<select data-listening-speed="' + row.id + '"><option value="0.75">0.75 倍</option><option value="1" selected>1 倍</option><option value="1.25">1.25 倍</option></select></label></div>' : !speechBusy() ? '<p class="muted">本段原音未缓存或已释放，文字仍保留。</p>' : '';
  const pair = row.hiddenReference ? '<p class="listening-hidden">字幕已隐藏，先重听原音并写下你听到的内容。</p>' : '<div class="speech-pair"><label>识别英文<textarea rows="3" data-speech-en="' + row.id + '" placeholder="正在识别英语…"' + disabled + '>' + esc(row.en) + '</textarea></label><label>中文译文' + engine + '<textarea rows="3" data-speech-zh="' + row.id + '" placeholder="识别后自动翻译…"' + disabled + '>' + esc(row.zh) + '</textarea></label></div>';
  return '<article id="speech-row-' + row.id + '" class="speech-row"><div class="spread"><b>' + speechTime(row.start) + ' – ' + speechTime(row.end) + '</b><span class="muted">' + esc(row.label) + ' · ' + esc(row.status) + (row.boundary === 'finish' ? ' · 末段收尾' : '') + '</span></div>' + audio + pair + (row.error ? '<p class="source-translation-error">' + esc(row.error) + '</p>' : '') + (warning ? '<p class="muted">' + esc(warning) + '</p>' : '') + (row.boundaryModel ? '<p class="muted">音频按人声停顿分段 · 英文标点由 AI 整理' + (row.insertedBoundaries ? ' · 补充 ' + row.insertedBoundaries + ' 处句界，请核对' : '') + '</p>' : '') + (row.en && !row.hiddenReference ? '<button class="btn small" data-speech-action="retry" data-speech-id="' + row.id + '"' + disabled + '>按修订英文重译</button>' : '') + translationReferencesHtml(row) + listeningPracticeHtml(row, disabled) + '</article>';
}
function viewListening() {
  sourceLoadConfig();
  if (!speechState.loaded) {
    speechState.mode = store.settings.speechTranslationMode === 'api' ? 'api' : 'model';
    speechState.smart = store.settings.speechSmart !== false; speechState.practice = store.settings.speechPractice === true;
    speechState.loaded = true; requestAnimationFrame(listeningLoadStatus);
  }
  const busy = speechBusy(), disabled = busy ? ' disabled' : '';
  if (!speechState.devicesRequested) { speechState.devicesRequested = true; requestAnimationFrame(() => speechRefreshDevices()); }
  return '<section class="panel source-panel speech-controls"><h3>听英语，实时看中英对照</h3><p class="muted">听一节课、一段讲座，或导入英语音频。边听边看中英对照，之后还可以修正原文、重新翻译。</p><div class="speech-settings"><label class="source-mode-label">麦克风<select id="speechDevice"' + disabled + '><option value="">系统默认麦克风</option>' + speechState.devices.map((device, i) => '<option value="' + esc(device.deviceId) + '"' + (speechState.device === device.deviceId ? ' selected' : '') + '>' + esc(device.label || '麦克风 ' + (i + 1)) + '</option>').join('') + '</select></label><label class="source-mode-label">中文翻译方式<select id="speechMode"' + disabled + '><option value="model"' + (speechState.mode === 'model' ? ' selected' : '') + '>内置 AI · 离线翻译</option><option value="api"' + (speechState.mode === 'api' ? ' selected' : '') + '>AI API · 自选服务</option></select></label></div><div class="listening-options"><label><input type="checkbox" id="speechSmart"' + (speechState.smart ? ' checked' : '') + disabled + '> 智能断句（按停顿）</label><label><input type="checkbox" id="speechPractice"' + (speechState.practice ? ' checked' : '') + disabled + '> 听力训练：先隐藏字幕</label></div><div class="btn-row speech-actions"><button class="btn primary" data-speech-action="start"' + disabled + '>开始听译</button><button class="btn" data-speech-action="stop"' + (!(speechState.recording || speechState.starting || speechState.fileBusy) ? ' disabled' : '') + '>停止</button><label class="btn" for="speechFile">导入音频<input type="file" id="speechFile" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac" hidden' + disabled + '></label><button class="btn ghost" data-speech-action="devices"' + disabled + '>刷新麦克风</button></div><div class="speech-meter" aria-hidden="true"><i id="speechMeter"></i></div><p id="speechStatus" class="muted" role="status">' + esc(speechState.progress || '尚未开始。外置麦克风接入电脑后，可在上方选择。') + '</p><p id="speechNotice" class="source-translation-error"' + (!speechState.notice ? ' hidden' : '') + '>' + esc(speechState.notice) + '</p><details class="product-tool-guide"><summary>收音、离线模式与文件说明</summary><p>默认在本机识别英语、按真实停顿分段，再用内置模型翻译。无需填写 API。可导入 50 MB、30 分钟以内的音频；停止后可重听、修订并重译。切换栏目会停止收音。原音仅在当前会话缓存。</p></details></section>' +
    '<section class="panel source-panel"><div class="spread"><h3>中英听译记录</h3><label class="speech-follow"><input type="checkbox" id="speechFollow"' + (speechState.follow ? ' checked' : '') + '> 跟随新内容</label></div><div class="btn-row"><button class="btn" data-speech-action="export"' + (busy || !speechState.rows.length ? ' disabled' : '') + '>导出中英 TXT</button><button class="btn" data-speech-action="companion"' + (busy || !speechState.rows.some(row => row.en) ? ' disabled' : '') + '>将英文保存到伴学</button><button class="btn ghost" data-speech-action="clear"' + (busy || !speechState.rows.length ? ' disabled' : '') + '>清空记录</button></div><p class="muted">识别和翻译可能有误，请核对姓名、术语、数字。原音只在本次窗口内缓存，最多约 48 MB。最近听译文字和听写练习按账号保存。</p><div id="speechResults">' + (speechState.rows.map(speechRowHtml).join('') || '<p class="muted">开始听译后，英文和中文会逐段显示在这里。</p>') + '</div></section>' + sourceApiSettingsHtml(speechState.mode, busy) +
    '<details class="panel source-panel source-disclosure"><summary>我的听力练习 <span class="muted">查看文字差异，安排回听</span></summary><div class="source-disclosure-body">' + listeningHistoryHtml() + '</div></details>' + listeningTrainingHtml() + translationPreferencesHtml(busy);
}
function speechPaint(follow = false) {
  if (state.view !== 'listen') return;
  const host = document.getElementById('speechResults');
  if (host) host.innerHTML = speechState.rows.map(speechRowHtml).join('') || '<p class="muted">开始听译后，英文和中文会逐段显示在这里。</p>';
  const status = document.getElementById('speechStatus'); if (status) status.textContent = speechState.progress || (speechState.recording ? '正在收音…说完一句稍停即可。' : '已停止收音。');
  const notice = document.getElementById('speechNotice'); if (notice) { notice.hidden = !speechState.notice; notice.textContent = speechState.notice; }
  if (follow && speechState.follow) host?.lastElementChild?.scrollIntoView({ block: 'nearest' });
}
async function speechRefreshDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    speechState.devices = devices.filter(device => device.kind === 'audioinput');
    if (speechState.device && !speechState.devices.some(device => device.deviceId === speechState.device)) speechState.device = '';
    if (state.view === 'listen') { sourceCollectAiConfig(); render(); }
  } catch (_) { speechState.notice = '无法读取麦克风列表，请检查 Windows 麦克风权限。'; speechPaint(); }
}
function speechPrepare(purpose = 'translate') {
  sourceLoadConfig(); sourceCollectAiConfig();
  const config = { mode: speechState.mode, smart: speechState.smart, practice: speechState.practice, glossary: String(store.settings.translationGlossary || '').slice(0,8000), style: store.settings.translationStyle === 'natural' ? 'natural' : 'academic', endpoint: sourceDraft.endpoint.trim(), model: sourceDraft.model.trim(), key: sourceDraft.key.trim(), run: Date.now() + '-' + speechState.counter };
  if (config.mode === 'api') {
    let url; try { url = new URL(config.endpoint); if (url.protocol !== 'https:' || url.username || url.password || !config.model || !config.key) throw Error(); } catch (_) { sourceUi.aiOpen = true; render(); toast('请先填写 HTTPS API 地址、模型和密钥'); return null; }
    if (!window.confirm(purpose === 'listening' ? '本段英文将发送给 ' + url.host + ' 做学习解析，可能产生服务商费用。是否继续？' : '英文识别在本机进行；本段英文、相邻已完成中英片段、匹配术语和公开参考例句将发送给 ' + url.host + ' 翻译，必要时会自动复核一次，可能产生服务商费用。是否继续？')) return null;
    sourceRememberAiConfig();
  }
  return config;
}
class SpeechSegmenter {
  constructor(emit) { this.emit = emit; this.cursor = 0; this.frames = []; this.lead = []; this.voiced = 0; this.silence = 0; this.start = 0; }
  push(frame) {
    this.cursor += frame.length;
    let sum = 0; for (const x of frame) sum += x * x;
    const voiced = Math.sqrt(sum / frame.length) > 0.006;
    if (!this.frames.length) {
      this.lead.push(frame); if (this.lead.length > 3) this.lead.shift();
      if (!voiced) return;
      this.frames = this.lead; this.lead = []; this.start = this.cursor - this.frames.reduce((n, f) => n + f.length, 0); this.voiced = 1; this.silence = 0;
    } else { this.frames.push(frame); if (voiced) { this.voiced++; this.silence = 0; } else this.silence++; }
    if (this.silence >= 7) this.flush();
  }
  flush(overlap = false) {
    const frames = this.frames, voiced = this.voiced, start = this.start;
    const trimmed = frames.slice(0, Math.max(0, frames.length - Math.max(0, this.silence - 2)));
    this.frames = []; this.voiced = 0; this.silence = 0; this.lead = overlap ? frames.slice(-2) : [];
    if (voiced < 2 || trimmed.length < 4) return;
    const size = trimmed.reduce((n, f) => n + f.length, 0), samples = new Float32Array(size); let cursor = 0;
    for (const frame of trimmed) { samples.set(frame, cursor); cursor += frame.length; }
    this.emit({ samples, start: start / 16000, end: (start + size) / 16000 });
  }
}
class SpeechNeuralSegmenter {
  static async create(emit) {
    const reply = await window.wordIsle.vadStart(); if (!reply?.ok) throw Error(reply?.error || '无法启动智能断句');
    const segmenter = new SpeechNeuralSegmenter(); segmenter.emit = emit; segmenter.token = reply.token; segmenter.cursor = 0; segmenter.chain = Promise.resolve(); segmenter.closed = false; return segmenter;
  }
  consume(reply) { if (!reply?.ok) throw Error(reply?.error || '智能断句失败'); for (const segment of reply.segments || []) this.emit(segment); }
  push(samples) {
    if (this.closed) return this.chain;
    this.cursor += samples.length;
    this.chain = this.chain.then(async () => this.consume(await window.wordIsle.vadPush({ token: this.token, samples })));
    return this.chain;
  }
  flush() {
    if (this.closed) return this.chain; this.closed = true;
    this.chain = this.chain.then(async () => this.consume(await window.wordIsle.vadFlush(this.token))); return this.chain;
  }
}
function speechAddRow(segment, label) {
  if (speechState.rows.length >= 400) throw Error('本次记录已达 400 段，请先导出并清空');
  const row = { id: ++speechState.counter, start: segment.start, end: segment.end, label, boundary: segment.boundary || 'pause', en: '', zh: '', error: '', status: '等待识别' };
  speechState.rows.push(row); speechPaint(true); return row;
}
async function speechTranslateRow(row, config) {
  row.status = '翻译中'; row.error = ''; speechPaint();
  const translationContext = speechTranslationContext(row);
  let reply;
  for (let attempt = 0; attempt < 180; attempt++) {
    const request = { kind: 'translate', text: row.en, title: '英语听译', translationContext, glossary: config.glossary, style: config.style };
    reply = config.mode === 'api' ? await window.wordIsle.aiSource({ ...config, ...request }) : await window.wordIsle.localSource(request);
    if (reply?.ok || !String(reply?.error).includes('上一项任务')) break;
    row.status = '等待本地 AI'; speechPaint(); await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!reply?.ok || !reply.text?.trim()) throw Error(reply?.error || '翻译未返回文本');
  row.zh = reply.text.trim(); row.status = '已完成'; row.zhEdited = false;
  row.engine = reply.model || (config.mode === 'api' ? 'API · ' + config.model : '内置翻译模型');
  row.translationQuality = reply.quality; row.translationReferences = reply.references; row.usedContext = translationContext;
  row.translatedFromEn = row.en;
}
async function speechProcess(segment, label, config) {
  const row = speechAddRow(segment, label);
  row.run = config.run;
  row.hiddenReference = !!config.practice; row.initiallyHidden = !!config.practice; row.practicing = !!config.practice; row.hintUsed = !config.practice;
  listeningKeepAudio(row, segment.samples);
  try {
    row.status = '识别英文中'; speechPaint();
    const reply = await window.wordIsle.transcribe({ samples: segment.samples, sampleRate: 16000, smart: config.smart });
    if (!reply?.ok) throw Error(reply?.error || '语音识别失败');
    row.en = reply.text.trim();
    row.rawText = reply.rawText || reply.text;
    row.recognitionParts = reply.recognitionParts || 1;
    row.boundaryModel = config.smart ? reply.boundaryModel || '智能人声检测' : ''; row.insertedBoundaries = reply.insertedBoundaries || 0;
    if (!row.en) { row.status = '未识别到英语'; return; }
    const previous = speechState.rows[speechState.rows.length - 2];
    if (previous && previous.run === config.run && previous.end >= row.start && previous.en) {
      const before = previous.en.split(/\s+/), after = row.en.split(/\s+/); const clean = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let n = Math.min(8, before.length, after.length); n >= 2; n--) { if (before.slice(-n).map(clean).join(' ') === after.slice(0, n).map(clean).join(' ')) { row.en = after.slice(n).join(' '); break; } }
    }
    if (row.en) await speechTranslateRow(row, config); else row.status = '与上一段重复';
  } catch (error) { row.error = error.message || '处理失败'; row.status = row.en ? '翻译失败，可修订后重试' : '识别失败'; }
  finally { speechPaint(true); }
}
async function speechPump() {
  if (speechState.processing) return;
  speechState.processing = true;
  try { while (speechState.queue.length) { const job = speechState.queue.shift(); speechState.progress = '正在处理语音，后面还有 ' + speechState.queue.length + ' 段'; await speechProcess(job.segment, job.label, job.config); } }
  catch (error) { speechState.notice = error.message; speechState.queue = []; speechStopCapture(); }
  finally { speechState.processing = false; speechState.progress = speechState.recording ? '正在收音…说完一句稍停即可。' : '处理完成。'; if (state.view === 'listen') { sourceCollectAiConfig(); render(); } }
}
async function speechStart() {
  if (speechBusy()) return;
  const config = speechPrepare(); if (!config) return;
  if (!window.wordIsle?.transcribe) { toast('请使用完整桌面版'); return; }
  const epoch = ++speechState.epoch; speechState.starting = true; speechState.fileName = ''; speechState.notice = ''; speechState.progress = '正在打开麦克风…'; render();
  let stream, context;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { deviceId: speechState.device ? { exact: speechState.device } : undefined, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    if (epoch !== speechState.epoch || state.view !== 'listen') { stream.getTracks().forEach(track => track.stop()); return; }
    context = new AudioContext({ sampleRate: 16000 });
    await context.audioWorklet.addModule(new URL('microphone-worklet.js', document.baseURI).href);
    if (epoch !== speechState.epoch || state.view !== 'listen') { stream.getTracks().forEach(track => track.stop()); await context.close(); return; }
    if (context.sampleRate !== 16000) throw Error('当前设备不支持 16kHz 采样，请导入音频或更换麦克风');
    const label = stream.getAudioTracks()[0].label || '麦克风';
    const emit = segment => {
      speechState.queue.push({ segment, label, config });
      if (speechState.queue.length >= 6) { speechState.notice = '处理速度未跟上收音，已停止麦克风。已采集的片段会全部继续处理，请稍后重新开始。'; speechStopCapture(); }
      speechPump();
    };
    speechState.segmenter = config.smart ? await SpeechNeuralSegmenter.create(emit) : new SpeechSegmenter(emit);
    if (epoch !== speechState.epoch || state.view !== 'listen') { await Promise.resolve(speechState.segmenter.flush()).catch(() => {}); speechState.segmenter = null; stream.getTracks().forEach(track => track.stop()); await context.close(); return; }
    const node = new AudioWorkletNode(context, 'wordisle-microphone');
    node.port.onmessage = ({ data }) => {
      if (!speechState.recording) return;
      const task = speechState.segmenter.push(data);
      task?.catch(error => { if (speechState.recording) { speechState.notice = '智能断句失败：' + error.message + '。可关闭智能断句后重试。'; speechStopCapture(); } });
      const meter = document.getElementById('speechMeter'); if (meter) { let sum = 0; for (const x of data) sum += x * x; meter.style.width = Math.min(100, Math.sqrt(sum / data.length) * 600) + '%'; }
      if (speechState.segmenter?.cursor > 1800 * 16000) { speechState.notice = '本轮收音已达 30 分钟，已停止。可以导出后继续新一轮。'; speechStopCapture(); }
    };
    context.createMediaStreamSource(stream).connect(node); node.connect(context.destination); await context.resume();
    if (epoch !== speechState.epoch || state.view !== 'listen') { node.disconnect(); stream.getTracks().forEach(track => track.stop()); await context.close(); return; }
    speechState.stream = stream; speechState.context = context; speechState.node = node; speechState.recording = true; speechState.progress = '正在收音…说完一句稍停即可。';
    stream.getAudioTracks()[0].onended = () => { if (speechState.recording) { speechState.notice = '麦克风已断开，已停止收音。'; speechStopCapture(); } };
    speechRefreshDevices();
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop()); context?.close().catch(() => {});
    speechState.progress = '未开始收音。';
    speechState.notice = error.name === 'NotAllowedError' ? '麦克风访问被拒绝。请在 Windows“隐私和安全性 → 麦克风”允许桌面应用访问。' : error.name === 'NotFoundError' ? '未找到麦克风，请接入设备后刷新。' : error.name === 'NotReadableError' ? '麦克风可能正被其他程序占用，请检查设备。' : error.message;
  } finally { if (epoch === speechState.epoch) { speechState.starting = false; if (state.view === 'listen') render(); } }
}
function speechStopCapture() {
  ++speechState.epoch; speechState.starting = false; speechState.recording = false;
  const segmenter = speechState.segmenter; speechState.segmenter = null;
  speechState.stream?.getTracks().forEach(track => track.stop()); speechState.stream = null;
  if (speechState.node) { speechState.node.port.onmessage = null; speechState.node.disconnect(); speechState.node = null; }
  const context = speechState.context; speechState.context = null; context?.close().catch(() => {});
  if (segmenter) {
    const pending = segmenter.flush();
    if (pending?.then) {
      speechState.segmenting = true;
      pending.catch(error => { speechState.notice = '末段处理失败：' + error.message; }).finally(() => { speechState.segmenting = false; if (state.view === 'listen') { sourceCollectAiConfig(); render(); } });
    }
  }
  speechState.progress = speechState.processing || speechState.queue.length ? '收音已停止，正在完成已采集片段…' : '已停止收音。';
  if (state.view === 'listen') { sourceCollectAiConfig(); render(); }
}
function speechStop() { speechState.cancelFile = true; speechStopCapture(); if (speechState.fileBusy) { speechState.progress = '将停止后续片段，正在完成当前段…'; speechPaint(); } }
async function speechImport(file) {
  if (speechBusy()) return;
  if (file.size > 50 * 1024 * 1024) { toast('音频文件不能超过 50 MB'); return; }
  const config = speechPrepare(); if (!config) return;
  speechState.fileBusy = true; speechState.cancelFile = false; speechState.notice = ''; speechState.fileName = file.name; speechState.progress = '正在读取音频…'; render();
  let context, segmenter;
  try {
    context = new AudioContext();
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    await context.close(); context = null;
    if (decoded.duration > 1800) throw Error('单个音频最长 30 分钟，请拆分后导入');
    if (speechState.cancelFile) return;
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
    const rendered = await offline.startRendering(), samples = rendered.getChannelData(0), segments = [];
    speechState.progress = '正在智能断句…'; speechPaint();
    segmenter = config.smart ? await SpeechNeuralSegmenter.create(segment => segments.push(segment)) : new SpeechSegmenter(segment => segments.push(segment));
    const step = config.smart ? 16000 : 1600;
    for (let i = 0; i < samples.length && !speechState.cancelFile; i += step) await segmenter.push(samples.slice(i, i + step));
    await segmenter.flush(); segmenter = null;
    if (!segments.length) speechState.notice = '未检测到明显语音，请检查音量或换一个音频文件。';
    for (let i = 0; i < segments.length && !speechState.cancelFile; i++) { speechState.progress = '音频听译：' + (i + 1) + ' / ' + segments.length + ' 段'; speechPaint(); await speechProcess(segments[i], file.name, config); }
  } catch (error) { speechState.notice = '音频处理失败：' + (error.message || '无法解码，请尝试 WAV 或 MP3 文件'); }
  finally { if (segmenter) try { await segmenter.flush(); } catch (_) {} context?.close().catch(() => {}); speechState.fileBusy = false; speechState.progress = speechState.cancelFile ? '已停止后续处理，已完成的片段保留。' : '音频处理完成。'; if (state.view === 'listen') { sourceCollectAiConfig(); render(); } }
}
function speechExportText() {
  return speechState.rows.map(row => '[' + speechTime(row.start) + ' – ' + speechTime(row.end) + '] ' + row.label + (row.engine ? '\n翻译方式：' + row.engine + (row.zhEdited ? '（已手动修订）' : '') : '') + '\n英文：' + row.en + '\n中文：' + row.zh + (row.error ? '\n提示：' + row.error : '')).join('\n\n');
}
function speechSaveCompanion() {
  const text = speechState.rows.filter(row => row.en).map(row => row.en).join('\n\n'); if (!text) return;
  sourceCollectDraft(); const current = (store.sources || []).find(item => item.id === sourceDraft.id);
  if (sourceDraft.text.trim() && (!current || current.text !== sourceDraft.text.trim() || sourceDraft.aiQuestion.trim() || (current.note || '') !== sourceDraft.ai) && !window.confirm('将听译英文保存为新资料，会替换伴学中尚未保存的编辑内容。是否继续？')) return;
  sourceDraft.id = ''; sourceDraft.title = (speechState.fileName || '英语听译 ' + new Date().toLocaleString()).slice(0, 80); sourceDraft.text = text; sourceResetTranslations();
  if (sourceSave(true, true)) { go('companion'); toast('英文已保存，可以继续提问'); }
}
document.addEventListener('change', function (e) {
  if (e.target.id === 'speechDevice') speechState.device = e.target.value;
  if (e.target.id === 'speechMode' && !speechBusy()) { sourceCollectAiConfig(); speechState.mode = e.target.value === 'api' ? 'api' : 'model'; store.settings.speechTranslationMode = speechState.mode; save(); render(); }
  if (e.target.id === 'speechFollow') speechState.follow = e.target.checked;
  if (e.target.id === 'speechFile' && e.target.files[0]) speechImport(e.target.files[0]);
});
document.addEventListener('input', function (e) {
  const id = e.target.dataset.speechEn || e.target.dataset.speechZh; if (!id) return;
  const row = speechState.rows.find(row => String(row.id) === id);
  if (row) {
    row[e.target.dataset.speechEn ? 'en' : 'zh'] = e.target.value.slice(0, 100000);
    if (e.target.dataset.speechEn) { row.practiceResult = null; row.hintUsed = true; }
    if (e.target.dataset.speechZh) { row.zhEdited = true; const badge = e.target.closest('label').querySelector('.speech-engine'); if (badge) badge.textContent = row.engine + ' · 已手动修订'; }
  }
});
document.addEventListener('click', async function (e) {
  const el = e.target.closest && e.target.closest('[data-speech-action]'); if (!el) return;
  const action = el.dataset.speechAction;
  if (action === 'stop') { speechStop(); return; }
  if (speechBusy()) return;
  if (action === 'start') speechStart();
  if (action === 'devices') speechRefreshDevices();
  if (action === 'clear' && window.confirm('清空当前听译记录？尚未导出的内容将被移除。')) { speechState.rows.forEach(row => { if (row.audioUrl) URL.revokeObjectURL(row.audioUrl); }); speechState.rows = []; speechState.notice = ''; speechState.progress = ''; speechState.fileName = ''; render(); }
  if (action === 'companion') speechSaveCompanion();
  if (action === 'export') { const url = URL.createObjectURL(new Blob([speechExportText()], { type: 'text/plain;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = '词屿中英听译.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  if (action === 'retry') {
    const row = speechState.rows.find(row => String(row.id) === el.dataset.speechId); if (!row || !row.en.trim()) return;
    const config = speechPrepare(); if (!config) return;
    speechState.processing = true; render();
    try { await speechTranslateRow(row, config); } catch (error) { row.error = error.message; row.status = '翻译失败'; }
    finally { speechState.processing = false; if (state.view === 'listen') render(); }
  }
});
if (navigator.mediaDevices) navigator.mediaDevices.addEventListener('devicechange', () => { speechRefreshDevices(); });
window.addEventListener('beforeunload', () => { speechStopCapture(); });
