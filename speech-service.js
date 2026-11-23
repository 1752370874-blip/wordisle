'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { findModelDirectory } = require('./model-paths');
function createSpeechService(root, analyze = text => ({ text })) {
  let worker, sequence = 0, active, idle, warming;
  const modelAt = name => {
    const files = ['-encoder.int8.onnx', '-decoder.int8.onnx', '-tokens.txt'].map(suffix => name + suffix);
    const directory = findModelDirectory(root, files, 'whisper-' + name);
    return directory ? { name, directory } : null;
  };
  const oralModel = () => modelAt('base.en') || modelAt('small.en') || modelAt('tiny.en');
  const stop = () => { clearTimeout(idle); if (active) { clearTimeout(active.timer); active.resolve({ ok: false, error: '语音识别已停止' }); active = null; } const current = worker; worker = null; if (current) current.terminate(); };
  async function transcribe(input) {
    if (warming) await warming;
    if (active) return { ok: false, error: '语音识别正在处理上一段' };
    if (!input || input.sampleRate !== 16000 || !(input.samples instanceof Float32Array) || input.samples.length < 1600 || input.samples.length > 1800 * 16000) return { ok: false, error: '音频格式不正确，仅接受 0.1 秒至 30 分钟的 16kHz 单声道采样' };
    const samples = new Float32Array(input.samples);
    let energy = 0;
    for (const value of samples) { if (!Number.isFinite(value) || Math.abs(value) > 1.01) return { ok: false, error: '音频采样无效' }; energy += value * value; }
    if (Math.sqrt(energy / samples.length) < 0.001) return { ok: true, text: '' };
    const oral = input.mode === 'oral';
    const model = oral ? oralModel() : modelAt('tiny.en') || modelAt('base.en');
    const alternate = oral && model?.name !== 'small.en' ? modelAt('small.en') : null;
    return dispatch({ samples, model, oral, alternate }, input.smart !== false);
  }
  async function warmOral() {
    if (warming) return warming;
    if (active) return { ok: true };
    warming = dispatch({ model: oralModel(), warm: true }, false);
    try { return await warming; }
    finally { warming = null; }
  }
  function dispatch(request, smart) {
    const { model, samples } = request;
    if (!model) return Promise.resolve({ ok: false, error: '缺少本地语音模型，请完整解压软件包' });
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
      const timeout = samples ? Math.max(120000, Math.min(900000, samples.length / 16000 * 600)) : 120000;
      active = { id, resolve, smart, timer: setTimeout(stop, timeout) };
      worker.postMessage({ id, ...request }, samples ? [samples.buffer] : []);
    });
  }
  return { transcribe, warmOral, stop };
}
module.exports = { createSpeechService };
