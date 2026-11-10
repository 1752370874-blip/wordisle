const fs = require('node:fs'); const path = require('node:path');
const { downloadCorpus, CORPUS } = require('./public-data'); const core = require('./boundary-core');
async function trainPublic(cache, progress) {
  await downloadCorpus(cache, progress);
  const data = core.splitPublic(fs.readFileSync(path.join(cache, 'en_ewt-ud-train.conllu'), 'utf8'), fs.readFileSync(path.join(cache, 'en_ewt-ud-dev.conllu'), 'utf8'), fs.readFileSync(path.join(cache, 'en_ewt-ud-test.conllu'), 'utf8'));
  return core.train({ ...data, source: { ...CORPUS, partitions: '使用官方完整 train 训练、dev 验证、test 独立测试；按训练→验证→测试顺序去除跨分区重复句' }, progress });
}
module.exports = { trainPublic };
if (require.main === module) {
  const cache = path.resolve(process.argv[2] || 'work/boundary-corpus'), output = path.resolve(process.argv[3] || 'outputs/词屿竞赛体验版/resources/app/app/models/sentence-boundary');
  trainPublic(cache, info => console.log(JSON.stringify(info))).then(model => { fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'model.json'), JSON.stringify(model)); fs.writeFileSync(path.join(output, 'training-report.json'), JSON.stringify(model.report, null, 2)); for (const file of ['LICENSE.txt', 'README.md']) fs.copyFileSync(path.join(cache, file), path.join(output, file === 'LICENSE.txt' ? 'LICENSE-DATA.txt' : 'DATA-ATTRIBUTION.md')); console.log(JSON.stringify({ accepted: model.accepted, report: model.report })); }).catch(error => { console.error(error); process.exitCode = 1; });
}
