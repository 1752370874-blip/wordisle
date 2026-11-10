'use strict';
const { parentPort } = require('node:worker_threads'); const path = require('node:path');
const sherpa = require('./speech-runtime/node_modules/sherpa-onnx-node');
let vad, session, carry = new Float32Array(), totalSamples = 0;
parentPort.on('message', ({ id, type, token, samples }) => {
  try {
    if (type === 'start') {
      // 句界只由人声停顿或用户结束触发。原生上限高于应用 30 分钟收音限制。
      vad = new sherpa.Vad({ sileroVad: { model: path.join(__dirname, 'models', 'silero-vad', 'silero_vad.onnx'), threshold: .5, minSilenceDuration: .75, minSpeechDuration: .25, maxSpeechDuration: 3600, windowSize: 512 }, sampleRate: 16000, numThreads: 1, provider: 'cpu' }, 120);
      session = token; carry = new Float32Array(); totalSamples = 0; parentPort.postMessage({ id, ok: true, token }); return;
    }
    if (!vad || token !== session) throw Error('人声检测会话已结束');
    const segments = [], transfer = [];
    const drain = boundary => { while (!vad.isEmpty()) { const part = vad.front(false), length = Math.max(0, Math.min(part.samples.length, totalSamples - part.start)); if (length) { const audio = new Float32Array(part.samples.subarray(0,length)); segments.push({ samples: audio, start: part.start / 16000, end: (part.start + audio.length) / 16000, smartBoundary: true, boundary }); transfer.push(audio.buffer); } vad.pop(); } };
    if (type === 'push') {
      totalSamples += samples.length;
      const joined = new Float32Array(carry.length + samples.length); joined.set(carry); joined.set(samples, carry.length);
      let at = 0;
      // 固定 32ms 是神经网络采样帧，不是断句时长。逐帧检测避免导入音频的大批次吞掉中间停顿。
      for (; at + 512 <= joined.length; at += 512) { vad.acceptWaveform(joined.subarray(at, at + 512)); drain('pause'); }
      carry = joined.slice(at);
    }
    if (type === 'flush') { drain('pause'); if (carry.length) { const tail = new Float32Array(512); tail.set(carry); vad.acceptWaveform(tail); carry = new Float32Array(); } vad.flush(); drain('finish'); }
    const detected = type === 'flush' ? false : vad.isDetected();
    if (type === 'flush') { session = null; vad = null; }
    parentPort.postMessage({ id, ok: true, segments, detected }, transfer);
  } catch (error) { parentPort.postMessage({ id, ok: false, error: error.message }); }
});
