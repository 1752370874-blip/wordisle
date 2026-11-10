'use strict';
const { Worker } = require('node:worker_threads'); const path = require('node:path'); const fs = require('node:fs'); const crypto = require('node:crypto');
function createVadService(root) {
  let worker, sequence = 0, idle; const pending = new Map();
  const stop = () => { clearTimeout(idle); const old = worker; worker = null; if (old) old.terminate(); for (const item of pending.values()) { clearTimeout(item.timer); item.resolve({ ok: false, error: '人声检测已停止' }); } pending.clear(); };
  function rpc(input) {
    clearTimeout(idle);
    if (!fs.existsSync(path.join(root, 'models', 'silero-vad', 'silero_vad.onnx'))) return Promise.resolve({ ok: false, error: '缺少智能人声检测模型，请完整解压新版软件' });
    if (!worker) {
      worker = new Worker(path.join(root, 'vad-worker.js')); const current = worker;
      current.on('message', reply => { const task = pending.get(reply.id); if (!task) return; pending.delete(reply.id); clearTimeout(task.timer); task.resolve(reply); idle = setTimeout(stop, 300000); idle.unref(); });
      current.on('error', error => { if (worker === current) { for (const task of pending.values()) { clearTimeout(task.timer); task.resolve({ ok: false, error: error.message }); } pending.clear(); worker = null; } });
      current.on('exit', () => { if (worker === current) stop(); });
    }
    return new Promise(resolve => { const id = ++sequence; pending.set(id, { resolve, timer: setTimeout(stop, 30000) }); const list = input.samples ? [input.samples.buffer] : []; worker.postMessage({ id, ...input }, list); });
  }
  function push(input) {
    if (!input || typeof input.token !== 'string' || !(input.samples instanceof Float32Array) || !input.samples.length || input.samples.length > 160000) return Promise.resolve({ ok: false, error: '人声检测音频格式无效' });
    const samples = new Float32Array(input.samples); for (const sample of samples) if (!Number.isFinite(sample) || Math.abs(sample) > 1.01) return Promise.resolve({ ok: false, error: '人声检测采样无效' });
    return rpc({ type: 'push', token: input.token, samples });
  }
  return { start: () => rpc({ type: 'start', token: crypto.randomUUID() }), push, flush: token => rpc({ type: 'flush', token: String(token || '') }), stop };
}
module.exports = { createVadService };
