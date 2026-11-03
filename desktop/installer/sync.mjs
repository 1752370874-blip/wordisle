// 把网页版/桌面版的最新代码同步进安装包工程：node sync.mjs
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', '..');
const DEST = join(here, 'app');

const FILES = ['index.html', 'app.js', 'styles.css', 'splash.html', 'preload.js'];
const DIRS = ['data'];
// 主进程要用到的运行时依赖（微软在线语音）
const MODULES = ['@andresaya/edge-tts', 'ws', 'commander'];

if (!existsSync(join(SRC, 'app.js'))) {
  console.error('找不到源文件：' + SRC);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

for (const f of FILES) cpSync(join(SRC, f), join(DEST, f));
for (const d of DIRS) cpSync(join(SRC, d), join(DEST, d), { recursive: true });
cpSync(join(here, '..', 'app-src', 'main.js'), join(DEST, 'main.js'));
cpSync(join(here, 'build-res', 'splash-logo.png'), join(DEST, 'splash-logo.png'));

let copied = 0;
for (const m of MODULES) {
  const src = join(here, 'node_modules', m);
  if (existsSync(src)) { cpSync(src, join(DEST, 'node_modules', m), { recursive: true }); copied++; }
}
if (copied < MODULES.length) console.warn('警告：缺少运行时依赖，微软在线语音可能不可用（已复制 ' + copied + '/' + MODULES.length + '）');

console.log('已同步到 installer/app（' + FILES.length + ' 个前端文件 + data + main.js + splash-logo.png + ' + copied + ' 个依赖）');
