// 把仓库根的渲染层 / 主进程 / data / 运行时同步进安装包工程：node sync.mjs
// 产物给 electron-builder 用（desktop/installer/package.json 的 files: ["app/**/*"]）。
// 注意：本地模型（models/，约 2.4 GB）不进安装包，走 Release 模型包单独分发。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', '..');
const DEST = join(here, 'app');

// 根目录下需要随包的应用目录（models 不打包）
const DIRS = ['assets', 'data', 'local-runtime', 'speech-runtime', 'reading-runtime'];
// 根依赖（在线朗读 edge-tts 及其依赖）
const MODULES = ['@andresaya', 'ws', 'commander'];

if (!existsSync(join(SRC, 'main.js'))) {
  console.error('找不到源文件：' + SRC);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

let files = 0;
for (const name of readdirSync(SRC)) {
  const full = join(SRC, name);
  if (!statSync(full).isFile()) continue;
  cpSync(full, join(DEST, name));
  files++;
}
for (const d of DIRS) {
  const full = join(SRC, d);
  if (!existsSync(full)) {
    console.warn('警告：缺少目录 ' + d);
    continue;
  }
  cpSync(full, join(DEST, d), { recursive: true });
}
if (!existsSync(join(SRC, 'models'))) {
  console.warn('提示：仓库没有 models/，安装包不含本地模型（需另下 Release 模型包）');
}

let copied = 0;
for (const m of MODULES) {
  const src = join(SRC, 'node_modules', m);
  const alt = join(here, 'node_modules', m);
  const from = existsSync(src) ? src : alt;
  if (existsSync(from)) { cpSync(from, join(DEST, 'node_modules', m), { recursive: true }); copied++; }
}
if (copied < MODULES.length) console.warn('警告：缺少运行时依赖，在线朗读可能不可用（已复制 ' + copied + '/' + MODULES.length + '）');

const version = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;
console.log('已同步到 installer/app：' + files + ' 个应用文件 + ' + DIRS.join('/') + ' + ' + copied + ' 个依赖（安装包版本 ' + version + '）');
