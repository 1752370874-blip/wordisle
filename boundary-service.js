'use strict';
const fs = require('node:fs'); const path = require('node:path'); const { Worker } = require('node:worker_threads'); const core = require('./training/boundary-core');
function createBoundaryService(root, userData, storage) {
  const baseline = path.join(root, 'models', 'sentence-boundary', 'model.json'), dir = path.join(userData, 'sentence-boundary'), custom = path.join(dir, 'model.json'), choice = path.join(dir, 'choice.json');
  let model = null, customActive = false, task;
  const privateRead = name => storage ? storage.read(name) : (fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name), 'utf8') : null);
  const privateWrite = (name, text) => { if (storage) storage.write(name, text); else { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), text); } };
  function load() { try { customActive = JSON.parse(privateRead('choice.json')).useCustom === true; } catch (_) { customActive = false; } try { model = core.decode(JSON.parse(customActive ? privateRead('model.json') : fs.readFileSync(baseline, 'utf8'))); } catch (_) { model = null; } if (!model && customActive) { customActive = false; try { model = core.decode(JSON.parse(fs.readFileSync(baseline, 'utf8'))); } catch (_) {} } }
  load();
  const status = () => ({ available: !!model, custom: customActive, busy: !!task, name: model?.name || '英文标点规则', report: model?.report || null });
  function train(input, progress = () => {}) {
    if (task) return Promise.resolve({ ok: false, error: '正在训练，请等待或先取消' });
    const kind = input?.kind === 'public' ? 'public' : 'text', text = String(input?.text || '');
    if (kind === 'text' && (text.length < 200 || text.length > 5 * 1024 * 1024)) return Promise.resolve({ ok: false, error: '训练文本为空或超过 5 MB' });
    fs.mkdirSync(dir, { recursive: true });
    return new Promise(resolve => {
      const worker = new Worker(path.join(root, 'training', 'boundary-worker.js'), { workerData: { kind, text: kind === 'text' ? text : '', name: String(input?.name || '').slice(0, 100), cache: path.join(dir, 'public-data') } });
      task = { worker, resolve };
      const finish = reply => { if (task?.worker !== worker) return; task = null; worker.terminate(); resolve(reply); };
      worker.on('message', message => {
        if (message.type === 'progress') { progress(message.info); return; }
        if (message.type === 'error') { finish({ ok: false, error: message.error }); return; }
        if (message.type === 'done') {
          const candidate = core.decode(message.model);
          if (!candidate) { finish({ ok: false, error: '新模型未达到独立测试门槛，已保留当前模型', report: message.model.report }); return; }
          try {
            const previous = privateRead('model.json'); if (previous) privateWrite('previous.json', previous);
            privateWrite('model.json', JSON.stringify(message.model));
            privateWrite('choice.json', JSON.stringify({ useCustom: true })); model = candidate; customActive = true;
            finish({ ok: true, status: { ...status(), busy: false }, report: candidate.report });
          } catch (error) { finish({ ok: false, error: '模型保存失败：' + error.message }); }
        }
      });
      worker.on('error', error => finish({ ok: false, error: error.message }));
      worker.on('exit', code => { if (task?.worker === worker) finish({ ok: false, error: '训练进程提前结束：' + code }); });
    });
  }
  function cancel() { if (task) { const old = task; task = null; old.worker.terminate(); old.resolve({ ok: false, error: '训练已取消，当前模型未改变' }); } return { ok: true }; }
  function restore() { if (task) return { ok: false, error: '请先等待训练完成或取消' }; fs.mkdirSync(dir, { recursive: true }); privateWrite('choice.json', JSON.stringify({ useCustom: false })); load(); return { ok: true, status: status() }; }
  return { status, train, cancel, restore, analyze: text => core.split(text, model), stop: cancel };
}
module.exports = { createBoundaryService };
