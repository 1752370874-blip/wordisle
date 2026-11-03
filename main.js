'use strict';

const { app, BrowserWindow, Menu, dialog, shell, ipcMain, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

// 测试时可隔离数据，日常启动仍沿用原来的用户数据目录。
if (process.env.WORD_ISLE_TEST_DATA) app.setPath('userData', process.env.WORD_ISLE_TEST_DATA);

// 词屿 · Electron 主进程
// - 启动封面（splash）→ 主窗口
// - 每日英语新闻自动更新（NASA 公共领域），缓存到用户目录 news.json
// - 从旧版「单词本」迁移学习数据
// - WordIsle.exe --update-news 可作为计划任务的无界面更新入口

// GPU 加速：液态玻璃的透明/模糊效果需要 GPU 合成，软件渲染会严重掉帧
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// 朗读音频在异步取回后才 play()，避免被自动播放策略拦住
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// 需要回退软件渲染时可设环境变量 WORD_ISLE_SOFTWARE=1
if (process.env.WORD_ISLE_SOFTWARE === '1') app.disableHardwareAcceleration();

const APP_NAME = '词屿';
const OLD_NAME = '单词本';
const LOG = path.join(os.tmpdir(), 'word-isle-desktop.log');
const UPDATE_ONLY = process.argv.includes('--update-news');
const NEWS_FEED = 'https://www.nasa.gov/feed/';
const NEWS_MAX = 6;
const NEWS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function log() {
  const line = new Date().toISOString() + ' ' + Array.prototype.slice.call(arguments).join(' ') + '\n';
  try { fs.appendFileSync(LOG, line); } catch (e) { /* ignore */ }
}

function migrateUserData() {
  if (process.env.WORD_ISLE_TEST_DATA) return;
  try {
    const appData = app.getPath('appData');
    const oldPath = path.join(appData, OLD_NAME);
    const newPath = app.getPath('userData');
    const newStorage = path.join(newPath, 'Local Storage');
    if (oldPath !== newPath && fs.existsSync(oldPath) && !fs.existsSync(newStorage)) {
      fs.mkdirSync(newPath, { recursive: true });
      fs.cpSync(oldPath, newPath, { recursive: true, force: false, errorOnExist: false });
      log('migrated user data from ' + oldPath + ' to ' + newPath);
    }
  } catch (e) {
    log('migration failed: ' + (e && e.message));
  }
}

/* ---------------- 每日英语新闻 ---------------- */
function newsFile() { return path.join(app.getPath('userData'), 'news.json'); }

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (WordIsle; offline vocabulary app)' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&#8217;|&rsquo;|&#39;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, '"')
    .replace(/&#8221;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function paragraphsFromHtml(html) {
  const cleaned = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const out = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const t = stripTags(m[1]);
    if (t.length < 80 || t.length > 700) continue;
    if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) continue;
    if (/^(explore|search|news|events|recently published|subscribe|follow)/i.test(t)) continue;
    if (/all rights reserved|cookie|privacy policy/i.test(t)) continue;
    if (!/[a-z]{4}/i.test(t)) continue;
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

function hashId(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
}

async function refreshNews() {
  const xml = await fetchText(NEWS_FEED, 25000);
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < NEWS_MAX) {
    const block = m[1];
    const pick = function (tag) {
      const mm = block.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'i'));
      return mm ? mm[1] : '';
    };
    const title = stripTags(pick('title'));
    const link = stripTags(pick('link'));
    if (!title || !link) continue;
    if (!/^https?:\/\//i.test(link)) continue;
    if (/image-article|\/podcast|video/i.test(link)) continue;
    let paras = [];
    try {
      const html = await fetchText(link, 25000);
      paras = paragraphsFromHtml(html);
    } catch (e) {
      log('article fetch failed: ' + link + ' ' + (e && e.message));
    }
    if (paras.length < 2) {
      const desc = stripTags(pick('description'));
      if (desc.length > 80) paras = [desc];
    }
    if (!paras.length) continue;
    items.push({
      id: 'news-' + hashId(link),
      title: title,
      category: '新闻',
      level: 'TOEFL',
      source: 'NASA · 公共领域',
      license: 'public-domain',
      sourceUrl: link,
      date: stripTags(pick('pubDate')),
      paragraphs: paras,
      translation: [],
      vocab: [],
      questions: []
    });
  }
  if (!items.length) throw new Error('没有解析到新闻条目');
  const payload = { updatedAt: new Date().toISOString(), items: items };
  fs.mkdirSync(path.dirname(newsFile()), { recursive: true });
  fs.writeFileSync(newsFile(), JSON.stringify(payload), 'utf8');
  log('news refreshed: ' + items.length + ' items');
  return payload;
}

function readNewsCache() {
  try {
    if (!fs.existsSync(newsFile())) return { updatedAt: '', items: [] };
    const data = JSON.parse(fs.readFileSync(newsFile(), 'utf8'));
    return { updatedAt: data.updatedAt || '', items: Array.isArray(data.items) ? data.items : [] };
  } catch (e) {
    return { updatedAt: '', items: [] };
  }
}

async function getNews(force) {
  const cache = readNewsCache();
  const age = cache.updatedAt ? Date.now() - new Date(cache.updatedAt).getTime() : Infinity;
  if (!force && cache.items.length && age < NEWS_MAX_AGE_MS) return cache;
  try { return await refreshNews(); } catch (e) { log('news refresh failed: ' + (e && e.message)); return cache; }
}

/* ---------------- 窗口 ---------------- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else if (UPDATE_ONLY) {
  app.whenReady().then(async function () {
    migrateUserData();
    try {
      await refreshNews();
      app.exit(0);
    } catch (e) {
      log('update-news failed: ' + (e && e.message));
      app.exit(1);
    }
  });
} else {
  let win = null;
  let splash = null;
  const splashStarted = Date.now();

  function createSplash() {
    splash = new BrowserWindow({
      width: 520,
      height: 360,
      frame: false,
      resizable: false,
      movable: true,
      show: true,
      backgroundColor: '#f6f1e6',
      title: APP_NAME,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    splash.loadFile(path.join(__dirname, 'splash.html'));
    splash.on('closed', function () { splash = null; });
  }

  function createWindow() {
    win = new BrowserWindow({
      width: 1280,
      height: 920,
      minWidth: 960,
      minHeight: 660,
      backgroundColor: '#f3f0e8',
      title: APP_NAME + ' · 背英语单词',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });
    // macOS 需要标准应用菜单（Cmd+Q / Cmd+C / Cmd+V）；Windows 去掉菜单栏
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' }
      ]));
    } else {
      Menu.setApplicationMenu(null);
    }

    win.webContents.on('did-finish-load', function () { log('page loaded'); });
    win.webContents.on('did-fail-load', function (e, code, desc, url) { log('page load failed', code, desc, url); });

    win.loadFile(path.join(__dirname, 'index.html')).catch(function (err) {
      log('loadFile error', err && err.message);
      dialog.showErrorBox('打不开页面', String(err && err.message || err) + '\n\n日志：' + LOG);
    });

    win.once('ready-to-show', function () {
      const wait = Math.max(0, 900 - (Date.now() - splashStarted));
      setTimeout(function () {
        if (splash) { splash.close(); splash = null; }
        if (win) win.show();
      }, wait);
      log('ready-to-show');
    });

    win.webContents.setWindowOpenHandler(function (info) {
      if (/^https?:\/\//i.test(info.url)) shell.openExternal(info.url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', function (event, url) {
      if (!/^file:\/\//i.test(url)) {
        event.preventDefault();
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      }
    });
    win.on('closed', function () { win = null; });
  }

  ipcMain.handle('news:get', async function (e, force) {
    try { return await getNews(!!force); } catch (err) { return readNewsCache(); }
  });
  ipcMain.handle('app:info', function () {
    return { version: app.getVersion(), name: APP_NAME, newsUpdatedAt: readNewsCache().updatedAt };
  });
  // 朗读音频代理：带 UA/Referer 取回 mp3，转 data URL 交给渲染进程播放（绕过热链限制）
  ipcMain.handle('tts:fetch', async function (e, url) {
    if (typeof url !== 'string' || !/^https:\/\/(dict\.youdao\.com|fanyi\.baidu\.com)\//.test(url)) return null;
    try {
      const res = await net.fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'referer': new URL(url).origin + '/'
        }
      });
      if (!res.ok) { log('tts fetch fail HTTP ' + res.status + ' ' + url.slice(0, 90)); return null; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) return null;
      return 'data:audio/mpeg;base64,' + buf.toString('base64');
    } catch (err) {
      log('tts fetch error ' + (err && err.message));
      return null;
    }
  });
  // 微软在线语音（Edge 神经语音）：WSS 合成后返回 data URL，前端当普通音频播放
  // 注意：Edge 服务对并发 WSS 不友好，这里串行化 + 可中断超时，避免多请求互相卡死
  let msQueue = Promise.resolve();
  function msSynthesize(text, voice) {
    const task = msQueue.then(function () { return msSynthesizeOnce(text, voice); });
    msQueue = task.catch(function () { /* 保持队列不中断 */ });
    return task;
  }
  async function msSynthesizeOnce(body, voice) {
    const { EdgeTTS } = require('@andresaya/edge-tts');
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 15000);
      try {
        const tts = new EdgeTTS({ timeout: 15000 });
        const res = await tts.generate(body, voice || 'en-US-AriaNeural', {
          rate: '+0%', pitch: '+0Hz', volume: '+0%',
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          signal: controller.signal,
          timeout: 15000
        });
        const buf = (res && res.audio) || tts.toBuffer();
        if (buf && buf.length) return 'data:audio/mpeg;base64,' + Buffer.from(buf).toString('base64');
      } catch (err) {
        log('msedge tts failed (attempt ' + (attempt + 1) + '): ' + (err && err.message));
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }
  ipcMain.handle('tts:msedge', function (e, text, voice) {
    const body = String(text || '').slice(0, 2000);
    if (!body) return null;
    return msSynthesize(body, voice);
  });

  /* ---------------- 自定义背景图 ----------------
     图片复制进 userData/background 后按随机文件名引用，
     渲染进程只能回传这个文件名，主进程用严格白名单解析路径。 */
  const BG_MAX_BYTES = 15 * 1024 * 1024;
  const BG_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'];
  const BG_NAME_RE = new RegExp('^bg-[0-9a-f]{4,24}\.(' + BG_EXT.join('|') + ')$', 'i');
  function bgDir() { return path.join(app.getPath('userData'), 'background'); }
  function bgPath(name) {
    if (typeof name !== 'string' || !BG_NAME_RE.test(name)) return null;
    return path.join(bgDir(), name);
  }
  function bgRemove(name) {
    const p = bgPath(name);
    if (!p) return;
    try { if (fs.existsSync(p)) fs.rmSync(p); } catch (err) { log('bg remove failed ' + (err && err.message)); }
  }

  ipcMain.handle('bg:pick', async function (e, oldName) {
    const r = await dialog.showOpenDialog(win, {
      title: '选择背景图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: BG_EXT }]
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false, canceled: true };
    const src = r.filePaths[0];
    let st;
    try { st = fs.statSync(src); } catch (err) { return { ok: false, error: '读不到这个文件' }; }
    if (!st.isFile()) return { ok: false, error: '请选择一个图片文件' };
    if (st.size > BG_MAX_BYTES) return { ok: false, error: '图片超过 15 MB，换一张小一点的' };
    const ext = String(path.extname(src) || '.png').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const name = 'bg-' + crypto.randomBytes(6).toString('hex') + ext;
    try {
      fs.mkdirSync(bgDir(), { recursive: true });
      fs.copyFileSync(src, path.join(bgDir(), name));
    } catch (err) {
      log('bg copy failed ' + (err && err.message));
      return { ok: false, error: '复制失败：' + (err && err.message) };
    }
    bgRemove(oldName);
    return { ok: true, file: name };
  });

  ipcMain.handle('bg:url', function (e, name) {
    const p = bgPath(name);
    if (!p || !fs.existsSync(p)) return null;
    return { url: pathToFileURL(p).href };
  });

  ipcMain.handle('bg:clear', function (e, name) {
    bgRemove(name);
    return { ok: true };
  });

  /* ---------------- 更新检查 ----------------
     只拉取一份公开的 version.json，不上传任何本机数据；
     发现新版本也只提示、由用户自己点下载，不自动下载安装器。 */
  const UPDATE_URL = 'https://wordisle-gnquo3a5428.qoder.website/version.json';
  function cmpVersion(a, b) {
    const pa = String(a || '').split('.').map(function (x) { return parseInt(x, 10) || 0; });
    const pb = String(b || '').split('.').map(function (x) { return parseInt(x, 10) || 0; });
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }
  ipcMain.handle('update:check', async function () {
    const current = app.getVersion();
    try {
      const res = await net.fetch(UPDATE_URL + '?v=' + current, {
        cache: 'no-store',
        headers: { 'user-agent': 'WordIsle/' + current + ' (update check)' }
      });
      if (!res.ok) return { ok: false, current: current, error: 'HTTP ' + res.status };
      const j = await res.json();
      const latest = String(j.version || '').trim();
      if (!/^[0-9]+(\.[0-9]+){0,3}$/.test(latest)) return { ok: false, current: current, error: '清单版本号格式不对' };
      return {
        ok: true, current: current, latest: latest,
        hasUpdate: cmpVersion(latest, current) > 0,
        notes: String(j.notes || '').slice(0, 2000),
        url: /^https:\/\//.test(String(j.url || '')) ? String(j.url) : ''
      };
    } catch (err) {
      log('update check failed ' + (err && err.message));
      return { ok: false, current: current, error: (err && err.message) || 'network' };
    }
  });

  app.whenReady().then(function () {
    migrateUserData();
    log('app ready');
    createSplash();
    createWindow();
    setTimeout(function () { getNews(false).catch(function () { /* ignore */ }); }, 2500);
    setInterval(function () { getNews(false).catch(function () { /* ignore */ }); }, NEWS_MAX_AGE_MS);
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('second-instance', function () {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on('window-all-closed', function () { app.quit(); });
  app.on('before-quit', function () { log('before-quit'); });

  process.on('uncaughtException', function (err) {
    log('UNCAUGHT ' + (err && err.stack || err));
  });
}
