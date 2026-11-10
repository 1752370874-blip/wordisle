'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const core = require('./boundary-core'); const { trainPublic } = require('./train-boundary.cjs');
const progress = info => parentPort.postMessage({ type: 'progress', info });
(async () => {
  const model = workerData.kind === 'public' ? await trainPublic(workerData.cache, progress) : core.train({ ...core.splitCustom(workerData.text), source: { name: workerData.name || '用户导入文本', license: '用户提供；不上传', partitions: '按相邻句组划分 80%/10%/10%，重复句去除' }, progress });
  parentPort.postMessage({ type: 'done', model });
})().catch(error => parentPort.postMessage({ type: 'error', error: error.message }));
