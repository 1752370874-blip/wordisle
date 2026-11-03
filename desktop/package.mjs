// 组装便携版：node desktop/package.mjs
// 把 web 版文件 + Electron 运行时打包成「单词本」文件夹，双击 单词本.exe 即可运行。
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const APP_FILES = ['index.html', 'app.js', 'styles.css', 'splash.html', 'preload.js'];
const DIST = join(here, 'node_modules', 'electron', 'dist');
const OUT = join(here, '单词本');
const EXE = 'WordIsle.exe';

if (!existsSync(join(DIST, 'electron.exe'))) {
  console.error('没找到 Electron 运行时：' + DIST);
  console.error('先执行 npm i electron@33.2.0（设置 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/），或手动解压 electron-v33.2.0-win32-x64.zip 到该目录。');
  process.exit(1);
}
if (!existsSync(join(here, 'app-src', 'main.js'))) {
  console.error('缺少 desktop/app-src/main.js');
  process.exit(1);
}

console.log('清理旧产物…');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log('复制 Electron 运行时…');
cpSync(DIST, OUT, { recursive: true });

console.log('放入应用文件…');
const appDir = join(OUT, 'resources', 'app');
rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
for (const f of APP_FILES) cpSync(join(here, '..', f), join(appDir, f));
cpSync(join(here, '..', 'data'), join(appDir, 'data'), { recursive: true });
cpSync(join(here, 'app-src', 'main.js'), join(appDir, 'main.js'));
writeFileSync(join(appDir, 'package.json'), JSON.stringify({
  name: 'word-master',
  productName: '词屿',
  version: '3.9.3',
  description: '词屿 · 离线背英语单词',
  main: 'main.js',
  author: 'word-master'
}, null, 2) + '\n', 'utf8');

// 把 electron.exe 改名成产品名
renameSync(join(OUT, 'electron.exe'), join(OUT, EXE));

// 说明文件
writeFileSync(join(OUT, '使用说明.txt'),
  '词屿 · 离线背英语单词\r\n\r\n双击「' + EXE + '」即可运行，不需要安装、不需要联网，也不需要 Node.js。\r\n\r\n' +
  '如果双击没反应：先双击「诊断启动.bat」，它会显示退出码和启动日志；\r\n' +
  '仍然不行就双击「兼容模式启动.bat」（关闭 GPU / 沙箱）。\r\n\r\n' +
  '学习记录保存在本机（Electron 的 localStorage），卸载时删除整个「单词本」文件夹即可。\r\n' +
  '数据与备份：应用内「设置 → 导出备份」可导出 JSON。\r\n', 'utf8');

// 诊断 / 兼容模式启动脚本（bat 必须 CRLF，否则 cmd 解析中文会出问题）
const CRLF = '\r\n';
writeFileSync(join(OUT, '诊断启动.bat'), [
  '@echo off',
  'chcp 65001 >nul',
  'title 单词本 · 诊断启动',
  'cd /d "%~dp0"',
  'set ELECTRON_RUN_AS_NODE=',
  'if exist "%TEMP%\\word-master-desktop.log" del "%TEMP%\\word-master-desktop.log" >nul 2>nul',
  'echo 正在启动 ' + EXE + ' ……窗口若正常打开，关掉它就会回到这里。',
  'echo.',
  '"%~dp0' + EXE + '" --enable-logging',
  'echo.',
  'echo 退出码: %ERRORLEVEL%',
  'echo.',
  'if exist "%TEMP%\\word-master-desktop.log" (',
  '  echo ---- 启动日志 ----',
  '  type "%TEMP%\\word-master-desktop.log"',
  ') else (',
  '  echo ---- 没有生成日志：说明进程在加载主程序之前就退出了 ----',
  ')',
  'echo.',
  'pause'
].join(CRLF) + CRLF, 'utf8');

writeFileSync(join(OUT, '兼容模式启动.bat'), [
  '@echo off',
  'chcp 65001 >nul',
  'title 单词本 · 兼容模式',
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
console.log('体积：' + (dirSize(OUT) / 1024 / 1024).toFixed(0) + ' MB');
