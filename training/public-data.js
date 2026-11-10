'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CORPUS = {
  name: 'UD English EWT', version: 'r2.18', license: 'CC BY-SA 4.0',
  url: 'https://github.com/UniversalDependencies/UD_English-EWT/tree/r2.18',
  files: [
    { name: 'en_ewt-ud-train.conllu', size: 15034493, sha1: '90f7d75edc3147331665c38f668401a96b49e7c8' },
    { name: 'en_ewt-ud-dev.conllu', size: 1898574, sha1: '120d04140cf4833690117bc74c08c8da861bbce6' },
    { name: 'en_ewt-ud-test.conllu', size: 1900101, sha1: '435cd8c5240754ba81a5d00ed119f63d1fae78b6' },
    { name: 'LICENSE.txt', size: 20014, sha1: '547fb999d1fc888c7071f50a0cf6b7338eeae2fe' },
    { name: 'README.md', size: 24522, sha1: 'c90961581467c723d81e705442a8ac8945145e60' }
  ]
};
function gitHash(bytes) { return crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'); }
async function downloadCorpus(cache, progress = () => {}) {
  fs.mkdirSync(cache, { recursive: true });
  for (const item of CORPUS.files) {
    const file = path.join(cache, item.name);
    if (fs.existsSync(file) && gitHash(fs.readFileSync(file)) === item.sha1) { progress({ stage: 'download', file: item.name, cached: true }); continue; }
    const bundled = path.join(__dirname, 'data', item.name);
    if (fs.existsSync(bundled) && gitHash(fs.readFileSync(bundled)) === item.sha1) { fs.copyFileSync(bundled, file); progress({ stage: 'download', file: item.name, cached: true }); continue; }
    const partDir = path.join(cache, 'parts', item.name); fs.mkdirSync(partDir, { recursive: true });
    const block = 128 * 1024, count = Math.ceil(item.size / block), chunks = Array(count); let next = 0, done = 0;
    const worker = async () => {
      while (next < count) {
        const i = next++, start = i * block, end = Math.min(item.size, start + block) - 1, part = path.join(partDir, String(i));
        if (fs.existsSync(part) && fs.statSync(part).size === end - start + 1) { chunks[i] = fs.readFileSync(part); done++; continue; }
        let error;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const api = attempt % 2 === 1;
            const url = api ? 'https://api.github.com/repos/UniversalDependencies/UD_English-EWT/contents/' + item.name + '?ref=r2.18&piece=' + start
              : 'https://raw.githubusercontent.com/UniversalDependencies/UD_English-EWT/r2.18/' + item.name + '?piece=' + start;
            const response = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json', Range: 'bytes=' + start + '-' + end }, signal: AbortSignal.timeout(90000) });
            if (!response.ok) { await response.body?.cancel(); throw Error('HTTP ' + response.status); }
            let bytes = Buffer.from(await response.arrayBuffer());
            if (response.status === 200 && bytes.length === item.size) bytes = bytes.subarray(start, end + 1);
            if (bytes.length !== end - start + 1) throw Error('下载分片长度不正确');
            chunks[i] = bytes; fs.writeFileSync(part, bytes); done++; progress({ stage: 'download', file: item.name, done, total: count }); error = null; break;
          } catch (e) { error = e; }
        }
        if (error) throw Error(item.name + ' 下载失败：' + error.message);
      }
    };
    const outcomes = await Promise.allSettled(Array.from({ length: Math.min(4, count) }, worker));
    const bad = outcomes.find(result => result.status === 'rejected'); if (bad) throw bad.reason;
    const bytes = Buffer.concat(chunks); if (gitHash(bytes) !== item.sha1) throw Error(item.name + ' 发布哈希校验失败');
    fs.writeFileSync(file + '.partial', bytes); fs.renameSync(file + '.partial', file);
  }
  return CORPUS;
}
module.exports = { CORPUS, downloadCorpus, gitHash };
