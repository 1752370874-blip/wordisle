'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {pathToFileURL}=require('node:url');
const {createLoginPreferences}=require('./login-preferences');
function createAccountController({root,userData,app,ipcMain,BrowserWindow,dialog,clipboard,session,powerMonitor,safeStorage,vault,getWindow,onUnlock,onLock}){
  const authURL=pathToFileURL(path.join(root,'account.html')).href,indexURL=pathToFileURL(path.join(root,'index.html')).href;
  const preferences=createLoginPreferences({userData,safeStorage});let autoAttempted=false,automaticLogin=false,lastAutomaticEpoch=-1;
  const partition='wordisle-private-'+crypto.randomUUID();let transitioning=false,screenLocked=false,closeAllowed=false,lifecycleTimer=null,generation=0;
  function trusted(e,pages=[authURL,indexURL]){const win=getWindow();return !!win&&!win.isDestroyed()&&e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame&&pages.includes(e.senderFrame.url);}
  function register(name,fn,pages){ipcMain.handle(name,async(e,...args)=>{if(!trusted(e,pages))return {ok:false,error:'请求来源无效'};try{return await fn(e,...args);}catch(error){return {ok:false,error:error.message||'操作未成功'};}});}
  function handle(name,fn){register(name,async(e,...args)=>{if(transitioning||!vault.isUnlocked())return {ok:false,error:'请先登录'};const epoch=vault.epoch;e.authEpoch=epoch;const r=await fn(e,...args);return vault.isUnlocked()&&vault.epoch===epoch?r:{ok:false,error:'登录已锁定，请重新登录'};},[indexURL]);}
  async function readLegacy(){
    const reader=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
    try{await reader.loadFile(path.join(root,'index.html'));return JSON.parse(await reader.webContents.executeJavaScript("JSON.stringify({raw:localStorage.getItem('wordnote.v1'),bg:localStorage.getItem('wordisle.bgdata')})"));}finally{if(!reader.isDestroyed())reader.destroy();}
  }
  async function prepareLegacy(){
    const old=await readLegacy(),assets={},cleanup=[];if(!old.raw)return {raw:null,assets,cleanup,hasLegacy:false};
    const data=JSON.parse(old.raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('旧版学习记录格式不正确，原记录尚未更改');
    const bg=data.settings?.bg;let bytes,extension;
    if(bg?.file==='local'&&typeof old.bg==='string'){const m=/^data:image\/(png|jpeg|webp|gif|bmp|avif);base64,([a-z0-9+/=]+)$/i.exec(old.bg);if(!m)throw Error('旧版背景格式无法验证，原记录尚未更改');extension=m[1];bytes=Buffer.from(m[2],'base64');}
    else if(bg?.file&&/^bg-[a-f0-9]{4,24}\.(png|jpg|jpeg|webp|gif|bmp|avif)$/i.test(bg.file)){const f=path.join(userData,'background',bg.file);if(fs.existsSync(f)){extension=path.extname(bg.file).slice(1).toLowerCase();bytes=fs.readFileSync(f);cleanup.push(f);}}
    if(bytes){if(bytes.length>15*1024*1024)throw Error('旧背景超过 15 MB，请先在旧版更换后迁移');const name='bg-'+crypto.randomBytes(6).toString('hex')+'.'+extension;assets[name]=bytes;data.settings.bg={...bg,file:name};}
    else if(bg?.file)data.settings.bg=null;
    for(const [oldName,newName] of [['model.json','boundary-model.json'],['previous-model.json','boundary-previous.json'],['choice.json','boundary-choice.json']]){const file=path.join(userData,'sentence-boundary',oldName);if(fs.existsSync(file)){const b=fs.readFileSync(file);if(b.length>20*1024*1024)throw Error('旧断句模型过大，原记录尚未更改');assets[newName]=b;cleanup.push(file);}}
    return {raw:JSON.stringify(data),assets,cleanup,hasLegacy:true};
  }
  async function cleanupLegacy(legacy){if(!legacy.hasLegacy)return;await session.defaultSession.clearStorageData({storages:['localstorage']});session.defaultSession.flushStorageData();for(const file of legacy.cleanup)await fs.promises.unlink(file).catch(()=>{});}
  async function finishAuthentication(work){
    if(transitioning||screenLocked)throw Error('当前已锁定，请稍后重新登录');const started=generation;transitioning=true;
    try{const r=await work();if(started!==generation||screenLocked){await vault.lock();throw Error('屏幕已锁定，请重新登录');}if(vault.isUnlocked())await onUnlock(vault.epoch);if(started!==generation||screenLocked){await onLock();await vault.lock();throw Error('登录已取消，请手动登录');}return {ok:true,...r};}finally{transitioning=false;}
  }
  async function lockNow(){transitioning=true;generation++;try{await onLock();await vault.lock();const win=getWindow();if(win&&!win.isDestroyed())await win.webContents.session.clearStorageData();}finally{transitioning=false;}}
  register('auth:status',async()=>({ok:true,...vault.status(),version:app.getVersion(),login:await preferences.status(),autoAllowed:!autoAttempted&&!screenLocked&&!transitioning&&!vault.isUnlocked()}));
  register('auth:login-options',async(e,input)=>{await preferences.update(input||{});return {ok:true,login:await preferences.status()};},[authURL]);
  register('auth:forget',async()=>{autoAttempted=true;await preferences.clear();return {ok:true};});
  register('auth:cancel-auto',async()=>{autoAttempted=true;generation++;await preferences.update({autoLogin:false});if(vault.isUnlocked()&&vault.epoch===lastAutomaticEpoch)await lockNow();return {ok:true};},[authURL]);
  register('auth:auto-login',async()=>{
    if(autoAttempted||screenLocked||vault.isUnlocked())return {ok:false,error:'请手动登录'};autoAttempted=true;const attemptGeneration=generation;
    const option=await preferences.status();if(!option.autoLogin||option.paused)return {ok:false,error:'请手动登录'};
    const credential=await preferences.credential();if(!credential||attemptGeneration!==generation)return {ok:false,error:'请重新输入密码'};
    automaticLogin=true;try{return await finishAuthentication(async()=>{try{const r=await vault.login(credential);lastAutomaticEpoch=vault.epoch;return r;}catch(e){await preferences.clear();throw Error('已保存的登录信息失效，请重新输入密码');}});}finally{credential.password='';automaticLogin=false;}
  },[authURL]);
  async function rememberResult(result,password,input){try{if(input?.rememberPassword===true)await preferences.save(result.profile,password,input.autoLogin===true);else await preferences.clear();return result;}catch(e){await preferences.clear().catch(()=>{});return {...result,warning:'已登录，但未能记住密码；下次需手动输入。'};}}
  register('auth:register',async(e,input)=>finishAuthentication(async()=>{
    const migrate=!vault.hasAccounts()&&input?.migrateLegacy!==false;
    const legacy=migrate?await prepareLegacy():{};const result=await vault.register(input||{},legacy);await preferences.clear();let warning='';
    try{await cleanupLegacy(legacy);}catch(_){warning='账号已创建并加密保存，但旧版缓存未能清理。请保留加密备份，并在本机妥善管理旧数据。';}
    return {...result,migrated:!!legacy.hasLegacy,warning};
  }),[authURL]);
  register('auth:login',(e,input)=>finishAuthentication(async()=>{
    autoAttempted=true;const data={...(input||{})};let credential;
    if(!data.password&&data.useRemembered===true){credential=await preferences.credential(data.username);if(!credential)throw Error('请手动输入当前账号的密码');data.password=credential.password;}
    try{const result=await vault.login(data);return await rememberResult(result,data.password,data);}catch(e){if(credential)await preferences.clear();throw e;}finally{if(credential)credential.password='';data.password='';}
  }),[authURL]);
  register('auth:recover',(e,input)=>finishAuthentication(async()=>{const r=await vault.recover(input||{});await preferences.clear();return r;}),[authURL]);
  handle('auth:load',async e=>({ok:true,profile:vault.status().profile,raw:await vault.read(e.authEpoch)}));
  handle('auth:save',(e,raw)=>vault.save(raw,e.authEpoch));
  handle('auth:onboarding',async(e,status)=>({ok:true,profile:await vault.completeOnboarding(status,e.authEpoch)}));
  handle('auth:profile',async(e,input)=>({ok:true,profile:await vault.updateProfile(input||{},e.authEpoch)}));
  handle('auth:password',async(e,input)=>{const r=await vault.changePassword(input||{},e.authEpoch);await preferences.clear();return r;});
  register('auth:logout',async(e,input)=>{autoAttempted=true;if(input?.kind==='lock'||screenLocked)await preferences.pause();else if(vault.isUnlocked())await preferences.logout();else await preferences.update({autoLogin:false});await lockNow();return {ok:true};});
  register('auth:copy',async(e,text)=>{if(!vault.isUnlocked()||typeof text!=='string'||text.length>512)throw Error('请先登录');clipboard.writeText(text);return {ok:true};});
  handle('auth:export',async e=>{const epoch=e.authEpoch,profile=vault.status().profile;const pick=await dialog.showSaveDialog(getWindow(),{title:'保存加密账号备份',defaultPath:'词屿-'+profile.id+'.wiaccount',filters:[{name:'词屿加密账号备份',extensions:['wiaccount']}]});if(pick.canceled)return {ok:false,canceled:true};const content=await vault.exportAccount(epoch);await fs.promises.writeFile(pick.filePath,content,{mode:0o600});return {ok:true};});
  register('auth:import',async(e,input)=>finishAuthentication(async()=>{const pick=await dialog.showOpenDialog(getWindow(),{title:'导入其他设备的加密账号备份',properties:['openFile'],filters:[{name:'词屿加密账号备份',extensions:['wiaccount']}]});if(pick.canceled)return {canceled:true};const f=pick.filePaths[0];if((await fs.promises.stat(f)).size>96*1024*1024)throw Error('备份文件超过大小限制');const result=await vault.importAccount(await fs.promises.readFile(f,'utf8'),String(input?.password||''));await preferences.clear();return result;}),[authURL]);
  register('auth:close-ready',async(e,input)=>{clearTimeout(lifecycleTimer);if(input?.failed){dialog.showMessageBox(getWindow(),{type:'error',message:'学习记录暂未保存，窗口将保留。',detail:'请检查磁盘空间后重试，或先导出学习备份。'});return {ok:false};}const closing=input?.reason==='close';await lockNow();if(closing){closeAllowed=true;getWindow()?.close();}else if(getWindow())await getWindow().loadFile(path.join(root,'account.html'));return {ok:true};},[indexURL]);
  function requestLock(reason){const win=getWindow();if(!win||win.isDestroyed())return;if(!vault.isUnlocked()||win.webContents.getURL()!==indexURL){if(reason==='close'){closeAllowed=true;win.close();}else if(vault.isUnlocked()){win.webContents.send('auth:lifecycle',{reason});lockNow().then(()=>{if(!win.isDestroyed())return win.loadFile(path.join(root,'account.html'));}).catch(()=>{});}return;}win.webContents.send('auth:lifecycle',{reason});clearTimeout(lifecycleTimer);lifecycleTimer=setTimeout(async()=>{if(reason==='close'){const reply=await dialog.showMessageBox(win,{type:'warning',message:'页面尚未响应，最近一次保存的加密记录已保留。',buttons:['继续等待','直接关闭'],defaultId:0,cancelId:0});if(reply.response===0)return;}await lockNow();if(reason==='close'){closeAllowed=true;win.close();}else if(!win.isDestroyed())await win.loadFile(path.join(root,'account.html'));},3500);}
  function bind(win){
    win.on('close',e=>{if(!closeAllowed&&vault.isUnlocked()&&win.webContents.getURL()===indexURL){e.preventDefault();requestLock('close');}});
    win.webContents.on('will-navigate',(event,url)=>{if(url!==authURL&&(url!==indexURL||!vault.isUnlocked()||screenLocked))event.preventDefault();});
  }
  function ready(){powerMonitor.on('lock-screen',()=>{screenLocked=true;autoAttempted=true;generation++;preferences.pause().catch(()=>{});requestLock('screen');});powerMonitor.on('unlock-screen',()=>{screenLocked=false;});}
  return {partition,authURL,indexURL,handle,bind,ready,isUnlocked:()=>vault.isUnlocked()&&!transitioning,initialPage:path.join(root,'account.html')};
}
module.exports={createAccountController};
