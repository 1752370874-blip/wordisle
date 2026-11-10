// 组装便携版：node desktop/package.mjs
// Electron 运行时 + 仓库根的渲染层 / 主进程 / data / 运行时依赖 / 本地模型
// → desktop/单词本/，双击 WordIsle.exe 即可运行（不需要安装、不需要 Node.js）。
//
// 运行前准备：
//   npm install                        # 根依赖（在线朗读 edge-tts）
//   (cd local-runtime && npm ci)       # 本地 AI 推理
//   (cd speech-runtime && npm ci)      # 离线朗读 / 听译
//   (cd reading-runtime && npm ci)     # 全文提取
//   models/                            # 从 Release 模型包解压进来（可选，约 2.4 GB）
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(here, '..');
const DIST = join(here, 'node_modules', 'electron', 'dist');
const OUT = join(here, '单词本');
const APP_ROOT = join(OUT, 'resources', 'app');
const APP = join(APP_ROOT, 'app');
const EXE = 'WordIsle.exe';
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// 归到 resources/app/app/ 的目录（其余根目录一律不复制）
const APP_DIRS = ['assets', 'data', 'models', 'local-runtime', 'speech-runtime', 'reading-runtime'];

if (!existsSync(join(DIST, 'electron.exe'))) {
  console.error('没找到 Electron 运行时：' + DIST);
  console.error('先执行 npm i electron@33.2.0（设置 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/），或手动解压 electron-win32-x64.zip 到该目录。');
  process.exit(1);
}
if (!existsSync(join(ROOT, 'main.js'))) {
  console.error('找不到仓库根的 main.js，请在仓库根目录执行 node desktop/package.mjs');
  process.exit(1);
}

console.log('清理旧产物…');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(APP, { recursive: true });

console.log('复制 Electron 运行时…');
cpSync(DIST, OUT, { recursive: true });

console.log('放入应用文件…');
for (const name of readdirSync(ROOT)) {
  const full = join(ROOT, name);
  if (!statSync(full).isFile()) continue;
  cpSync(full, join(APP, name));
}
for (const name of APP_DIRS) {
  const full = join(ROOT, name);
  if (!existsSync(full)) {
    console.warn('  跳过缺失目录：' + name);
    continue;
  }
  cpSync(full, join(APP, name), { recursive: true });
}
// 根依赖放到 resources/app/node_modules（与体验版包结构一致）
if (existsSync(join(ROOT, 'node_modules'))) {
  cpSync(join(ROOT, 'node_modules'), join(APP_ROOT, 'node_modules'), { recursive: true });
} else {
  console.warn('  缺少根 node_modules：在线朗读（edge-tts）会不可用，先执行 npm install');
}
if (!existsSync(join(ROOT, 'models'))) {
  console.warn('  缺少 models/：本地 AI 伴学与离线翻译会提示模型缺失（可从 Release 模型包解压）');
}
cpSync(join(here, 'app-src', 'main.js'), join(APP, 'main.js'));

writeFileSync(join(APP_ROOT, 'package.json'), JSON.stringify({
  name: 'word-master',
  productName: '词屿',
  version: VERSION,
  description: '词屿 · 完整英文正文、离线精读与 AI 伴学',
  author: '词屿',
  main: 'app/main.js',
  private: true,
  dependencies: { '@andresaya/edge-tts': '^1.9.1' }
}, null, 2) + '\n', 'utf8');

// 把 electron.exe 改名成产品名
renameSync(join(OUT, 'electron.exe'), join(OUT, EXE));

// 说明文件
writeFileSync(join(OUT, '使用说明.txt'),
  '词屿 ' + VERSION + ' · 便携版\r\n\r\n双击「' + EXE + '」即可运行，不需要安装、不需要 Node.js。\r\n' +
  '首次打开会进入注册 / 登录；学习记录按本机账号加密保存在 %APPDATA%\\WordIsle-Contest-Preview。\r\n\r\n' +
  '本地 AI：把 Release 模型包解压出的 resources/app/app/models/ 合并进本目录同名路径即可；\r\n' +
  '不装模型也能正常背词、查词、阅读，只是本地 AI 与离线翻译会提示模型缺失。\r\n\r\n' +
  '本地模型（Qwen3-1.7B、Hy-MT2-1.8B）为 Apache-2.0 许可的公开权重，程序只做本地推理。\r\n', 'utf8');

// 诊断 / 兼容模式启动脚本（bat 必须 CRLF，否则 cmd 解析中文会出问题）
const CRLF = '\r\n';
writeFileSync(join(OUT, '诊断启动.bat'), [
  '@echo off',
  'chcp 65001 >nul',
  'title 词屿 · 诊断启动',
  'cd /d "%~dp0"',
  'set ELECTRON_RUN_AS_NODE=',
  'if exist "%TEMP%\\word-isle-desktop.log" del "%TEMP%\\word-isle-desktop.log" >nul 2>nul',
  'echo 正在启动 ' + EXE + ' ……窗口若正常打开，关掉它就会回到这里。',
  'echo.',
  '"%~dp0' + EXE + '" --enable-logging',
  'echo.',
  'echo 退出码: %ERRORLEVEL%',
  'echo.',
  'if exist "%TEMP%\\word-isle-desktop.log" (',
  '  echo ---- 启动日志 ----',
  '  type "%TEMP%\\word-isle-desktop.log"',
  ') else (',
  '  echo ---- 没有生成日志：说明进程在加载主程序之前就退出了 ----',
  ')',
  'echo.',
  'pause'
].join(CRLF) + CRLF, 'utf8');

writeFileSync(join(OUT, '兼容模式启动.bat'), [
  '@echo off',
  'chcp 65001 >nul',
  'title 词屿 · 兼容模式',
  'cd /d "%~dp0"',
  'set ELECTRON_RUN_AS_NODE=',
  'echo 兼容模式启动（关闭 GPU / 沙箱）……',
  'start "" "%~dp0' + EXE + '" --no-sandbox --disable-gpu --disable-software-rasterizer',
  'exit /b 0'
].join(CRLF) + CRLF, 'utf8');

function dirSize(p) {
  let sum = 0;
  for (const name of readdirSync(p)) {
    const full = join(p, name);
    const st = statSync(full);
    sum += st.isDirectory() ? dirSize(full) : st.size;
  }
  return sum;
}
console.log('');
console.log('完成：' + resolve(OUT));
console.log('启动文件：' + join(OUT, EXE));
console.log('版本：' + VERSION);
console.log('体积：' + (dirSize(OUT) / 1024 / 1024).toFixed(0) + ' MB');
