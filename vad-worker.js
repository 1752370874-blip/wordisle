'use strict';
const { parentPort } = require('node:worker_threads'); const path = require('node:path');
const sherpa = require('./speech-runtime/node_modules/sherpa-onnx-node');
let vad, session, carry = new Float32Array(), totalSamples = 0;
let callAudio = null, previousEnd = 0;
const callBufferSize = 58 * 16000; // 45s voice, up to 10s per push, and boundary padding
const callHighPass = Math.exp(-2 * Math.PI * 100 / 16000);
let lastCallSample = 0, filteredCallSample = 0;

function feedVad(frame) {
  if (!callAudio) {
    vad.acceptWaveform(frame);
    return;
  }
  // Make quiet speech easier for Silero to detect. Keep original audio for Whisper.
  const filtered = new Float32Array(frame.length);
  let peak = 0;
  for (let i = 0; i < frame.length; i++) {
    filteredCallSample = callHighPass * (filteredCallSample + frame[i] - lastCallSample);
    lastCallSample = frame[i];
    filtered[i] = filteredCallSample;
    peak = Math.max(peak, Math.abs(filteredCallSample));
  }
  const gain = Math.min(3, .85 / Math.max(peak, .01));
  for (let i = 0; i < frame.length; i++) filtered[i] *= gain;
  vad.acceptWaveform(filtered);
}

parentPort.on('message', ({ id, type, token, samples, call }) => {
  try {
    if (type === 'start') {
      // 自由通话按停顿接话，连续长段设上限，避免单轮识别占满通话。
      vad = new sherpa.Vad({ sileroVad: { model: path.join(__dirname, 'models', 'silero-vad', 'silero_vad.onnx'), threshold: .5, minSilenceDuration: call ? .6 : .75, minSpeechDuration: call ? .18 : .25, maxSpeechDuration: call ? 45 : 3600, windowSize: 512 }, sampleRate: 16000, numThreads: 1, provider: 'cpu' }, 120);
      callAudio = call ? new Float32Array(callBufferSize) : null;
      previousEnd = 0;
      lastCallSample = 0;
      filteredCallSample = 0;
      session = token; carry = new Float32Array(); totalSamples = 0; parentPort.postMessage({ id, ok: true, token }); return;
    }
    if (!vad || token !== session) throw Error('人声检测会话已结束');
    const segments = [], transfer = [];
    const drain = boundary => {
      while (!vad.isEmpty()) {
        const part = vad.front(false);
        const length = Math.max(0, Math.min(part.samples.length, totalSamples - part.start));
        if (length) {
          const end = part.start + length;
          // VAD marks where speech becomes detectable. Keep nearby audio for weak consonants.
          const start = callAudio
            ? Math.min(part.start, Math.max(previousEnd, totalSamples - callAudio.length, part.start - 5120, 0))
            : part.start;
          const paddedEnd = callAudio ? Math.min(totalSamples, end + 2880) : end;
          const audio = new Float32Array(paddedEnd - start);
          if (callAudio) {
            for (let i = start; i < paddedEnd; i++) audio[i - start] = callAudio[i % callAudio.length];
            previousEnd = paddedEnd;
          } else audio.set(part.samples.subarray(0, length));
          segments.push({ samples: audio, start: start / 16000, end: paddedEnd / 16000, smartBoundary: true, boundary });
          transfer.push(audio.buffer);
        }
        vad.pop();
      }
    };
    if (type === 'push') {
      if (callAudio) for (let i = 0; i < samples.length; i++) callAudio[(totalSamples + i) % callAudio.length] = samples[i];
      totalSamples += samples.length;
      const joined = new Float32Array(carry.length + samples.length); joined.set(carry); joined.set(samples, carry.length);
      let at = 0;
      // 固定 32ms 是神经网络采样帧，不是断句时长。逐帧检测避免导入音频的大批次吞掉中间停顿。
      for (; at + 512 <= joined.length; at += 512) { feedVad(joined.subarray(at, at + 512)); drain('pause'); }
      carry = joined.slice(at);
    }
    if (type === 'flush') { drain('pause'); if (carry.length) { const tail = new Float32Array(512); tail.set(carry); feedVad(tail); carry = new Float32Array(); } vad.flush(); drain('finish'); }
    const detected = type === 'flush' ? false : vad.isDetected();
    if (type === 'flush') { session = null; vad = null; callAudio = null; }
    parentPort.postMessage({ id, ok: true, segments, detected }, transfer);
  } catch (error) { parentPort.postMessage({ id, ok: false, error: error.message }); }
});
