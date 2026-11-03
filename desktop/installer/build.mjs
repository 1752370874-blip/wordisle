// One-command rebuild of the installer: electron-builder (unpacked) -> rename exe -> sign -> NSIS -> sign
// Usage: node build.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import fs, { copyFileSync, existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { userInfo } from 'node:os';

const here = process.cwd();
const DIST = join(here, 'dist');
const WIN = join(DIST, 'win-unpacked');
const PKG_VER = JSON.parse(fs.readFileSync(join(here, 'package.json'), 'utf8')).version;
const SETUP = join(DIST, 'WordIsle-Setup-' + PKG_VER + '.exe');
const MK = 'C:\\Users\\17523\\AppData\\Local\\electron-builder\\Cache\\nsis-3.0.4.1\\nsis-3.0.4.1-w8az6\\makensis.exe';
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const EB = join(here, 'node_modules', 'electron-builder', 'cli.js');

const env = {
  ...process.env,
  ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/'
};

function run(label, cmd, args) {
  console.log('\n== ' + label);
  const r = spawnSync(cmd, args, { env, stdio: 'inherit', cwd: here });
  if (r.status !== 0) throw new Error(label + ' failed with exit code ' + r.status);
}

console.log('1/5 electron-builder (unpacked)');
rmSync(WIN, { recursive: true, force: true });
run('electron-builder --dir', NODE, [EB, '--win', '--dir', '--x64']);

console.log('\n2/5 rename app exe to ASCII name');
const exes = readdirSync(WIN).filter((f) => f.toLowerCase().endsWith('.exe'));
if (!exes.length) throw new Error('no exe found in win-unpacked');
if (exes.includes('WordIsle.exe')) {
  console.log('   already named WordIsle.exe');
} else {
  renameSync(join(WIN, exes[0]), join(WIN, 'WordIsle.exe'));
  console.log('   ' + exes[0] + ' -> WordIsle.exe');
}

console.log('\n3/5 sign app exe');
try {
  run('sign app', 'powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'sign.ps1'), '-Path', join(WIN, 'WordIsle.exe')]);
} catch (e) {
  console.warn('   skipped signing app exe: ' + e.message);
}

console.log('\n4/5 compile NSIS installer');
run('makensis', MK, ['/INPUTCHARSET', 'UTF8', '/V1', '/DAPP_VERSION=' + PKG_VER, 'installer.nsi']);
if (!existsSync(SETUP)) throw new Error('installer not produced: ' + SETUP);

console.log('\n5/5 sign installer');
await new Promise((r) => setTimeout(r, 1500)); // 等 makensis 释放文件句柄
let signed = false;
for (let attempt = 1; attempt <= 3 && !signed; attempt++) {
  try {
    run('sign setup' + (attempt > 1 ? ' (retry ' + attempt + ')' : ''), 'powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'sign.ps1'), '-Path', SETUP]);
    const status = execFileSync('powershell', ['-NoProfile', '-Command', "(Get-AuthenticodeSignature '" + SETUP + "').Status"], { encoding: 'utf8' }).trim();
    signed = status === 'Valid';
    if (!signed) console.warn('   signature status: ' + status);
  } catch (e) {
    console.warn('   signing attempt ' + attempt + ' failed: ' + e.message);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (!signed) throw new Error('installer signing failed after retries');

console.log('\nDone: ' + SETUP + '  (' + Math.round(statSync(SETUP).size / 1024 / 1024) + ' MB)');
console.log('Copy it outside the DSH workspace (e.g. Desktop) before running.');
