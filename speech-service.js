'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const fs = require('node:fs');
function createSpeechService(root, analyze = text => ({ text })) {
  let worker, sequence = 0, active, idle;
  const stop = () => { clearTimeout(idle); if (active) { clearTimeout(active.timer); active.resolve({ ok: false, error: '语音识别已停止' }); active = null; } const current = worker; worker = null; if (current) current.terminate(); };
  async function transcribe(input) {
    if (active) return { ok: false, error: '语音识别正在处理上一段' };
    if (!input || input.sampleRate !== 16000 || !(input.samples instanceof Float32Array) || input.samples.length < 1600 || input.samples.length > 1800 * 16000) return { ok: false, error: '音频格式不正确，仅接受 0.1 秒至 30 分钟的 16kHz 单声道采样' };
    const samples = new Float32Array(input.samples);
    let energy = 0;
    for (const value of samples) { if (!Number.isFinite(value) || Math.abs(value) > 1.01) return { ok: false, error: '音频采样无效' }; energy += value * value; }
    if (Math.sqrt(energy / samples.length) < 0.001) return { ok: true, text: '' };
    for (const name of ['tiny.en-encoder.int8.onnx', 'tiny.en-decoder.int8.onnx', 'tiny.en-tokens.txt']) {
      if (!fs.existsSync(path.join(root, 'models', 'whisper-tiny.en', name))) return { ok: false, error: '缺少本地语音模型，请完整解压软件包' };
    }
    clearTimeout(idle);
    if (!worker) {
      worker = new Worker(path.join(root, 'speech-worker.js'));
      const current = worker;
      current.on('message', reply => { if (active && reply.id === active.id) { const task = active; active = null; clearTimeout(task.timer); if (reply.ok && task.smart && reply.text) { reply.rawText = reply.text; Object.assign(reply, analyze(reply.text)); } task.resolve(reply); idle = setTimeout(stop, 300000); idle.unref(); } });
      const failed = error => { if (worker === current) { worker = null; if (active) { clearTimeout(active.timer); active.resolve({ ok: false, error: '语音引擎异常：' + error }); active = null; } } };
      current.on('error', error => failed(error.message));
      current.on('exit', code => failed('进程退出 ' + code));
    }
    return new Promise(resolve => {
      const id = ++sequence;
      active = { id, resolve, smart: input.smart !== false, timer: setTimeout(() => { stop(); }, Math.max(120000, Math.min(900000, samples.length / 16000 * 600))) };
      worker.postMessage({ id, samples }, [samples.buffer]);
    });
  }
  return { transcribe, stop };
}
module.exports = { createSpeechService };
