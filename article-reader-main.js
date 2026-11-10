'use strict';
const path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const Catalog=require('./reading-source-catalog'),SourceState=require('./reading-source-state');
function approvedURL(value,sourceId){try{const source=Catalog.get(sourceId),u=new URL(value);if(!source||u.protocol!=='https:'||u.username||u.password||u.port||!source.domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return '';return u.href;}catch(_){return '';}}
function createArticleReader({root,BrowserWindow,WebContentsView,ipcMain,getParent,isUnlocked,getArticle,icon}){
 const shellURL=pathToFileURL(path.join(root,'article-reader.html')).href;let current=null,sequence=0;
 function state(){const c=current;if(!c)return {open:false};const wc=c.view.webContents;return {open:true,id:c.item.id,title:c.item.title,source:c.item.source,url:c.url,ready:!!c.domReady,loading:c.loading,error:c.error,canBack:!wc.isDestroyed()&&wc.navigationHistory.canGoBack(),canForward:!wc.isDestroyed()&&wc.navigationHistory.canGoForward(),zoom:!wc.isDestroyed()?Math.round(wc.getZoomFactor()*100):100};}
 function notify(){if(current&&!current.window.isDestroyed())current.window.webContents.send('article-reader:state',state());}
 function trusted(e){return !!current&&isUnlocked()&&!current.window.isDestroyed()&&e.sender===current.window.webContents&&e.senderFrame===current.window.webContents.mainFrame&&e.senderFrame.url===shellURL;}
 function layout(){const c=current;if(!c||c.window.isDestroyed())return;const [width,height]=c.window.getContentSize();c.view.setBounds({x:0,y:112,width:Math.max(1,width),height:Math.max(1,height-112)});}
 function cleanup(c){clearTimeout(c.timeout);if(!c.view.webContents.isDestroyed())c.view.webContents.close({waitForBeforeUnload:false});c.session.clearStorageData().catch(()=>{});c.session.clearCache().catch(()=>{});if(current===c)current=null;}
 function close(){sequence++;const c=current;if(!c)return;current=null;if(!c.window.isDestroyed())c.window.destroy();else cleanup(c);}
 async function navigate(url){const c=current;if(!c)return;const target=approvedURL(url,c.item.sourceId);if(!target){c.error='已阻止离开当前来源的页面。';notify();return;}c.url=target;c.error='';c.loading=true;c.domReady=false;c.view.setVisible(false);notify();clearTimeout(c.timeout);c.timeout=setTimeout(()=>{if(current===c&&c.loading){c.loading=false;c.error=c.domReady?'':'原站响应较慢，可以稍后重试。';notify();}},45000);try{await c.view.webContents.loadURL(target);}catch(error){if(current!==c||error.code==='ERR_ABORTED')return;c.loading=false;c.error='暂时无法读取原站（'+(error.code||'网络连接失败')+'）。请检查网络后重试。';c.view.setVisible(false);notify();}}
 async function open(id){if(!isUnlocked())return {ok:false,error:'请先登录学习空间。'};const item=getArticle(id);if(!item)return {ok:false,error:'找不到这篇文章，请更新书架后重试。'};const url=approvedURL(SourceState.readUrl(item),item.sourceId);if(!url)return {ok:false,error:'这篇文章没有可验证的官方地址。'};
  const parent=getParent();if(!parent||parent.isDestroyed())return {ok:false,error:'学习窗口已关闭。'};
  if(current&&!current.window.isDestroyed()){current.item=item;current.window.setTitle('词屿 · '+item.title);current.window.show();current.window.focus();navigate(url);return {ok:true,inApp:true,id:item.id};}
  const token=++sequence,partition='wordisle-article-'+crypto.randomUUID(),win=new BrowserWindow({parent,width:1120,height:860,minWidth:620,minHeight:500,show:false,autoHideMenuBar:true,backgroundColor:'#faf9f2',title:'词屿 · '+item.title,icon,webPreferences:{preload:path.join(root,'article-reader-preload.js'),partition:'wordisle-article-toolbar-'+crypto.randomUUID(),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,spellcheck:false}}),view=new WebContentsView({webPreferences:{partition,contextIsolation:true,nodeIntegration:false,nodeIntegrationInSubFrames:false,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,spellcheck:false}});
  const c=current={window:win,view,item,url,session:view.webContents.session,loading:true,error:'',timeout:null};win.contentView.addChildView(view);view.setBackgroundColor('#faf9f2');view.setVisible(false);layout();
  c.session.setPermissionCheckHandler(()=>false);c.session.setPermissionRequestHandler((wc,permission,callback)=>callback(false));c.session.on('will-download',(event,download)=>{event.preventDefault();download.cancel();});
  const wc=view.webContents;
  wc.setWindowOpenHandler(info=>{if(approvedURL(info.url,c.item.sourceId))navigate(info.url);else{c.error='这条链接不属于当前文章来源，已保留当前阅读页面。';notify();}return {action:'deny'};});
  for(const eventName of ['will-navigate','will-redirect'])wc.on(eventName,(event,target)=>{if(!approvedURL(target,c.item.sourceId)){event.preventDefault();c.error='原站跳转到了其他服务，请返回当前文章继续阅读。';notify();}});
  wc.on('did-start-loading',()=>{if(current!==c)return;c.loading=true;c.error='';notify();});
  wc.on('did-navigate',(event,target)=>{if(current===c){c.url=target;notify();}});
  wc.on('did-navigate-in-page',(event,target,isMainFrame)=>{if(current===c&&isMainFrame){c.url=target;notify();}});
  wc.on('dom-ready',()=>{if(current===c){c.domReady=true;view.setVisible(true);notify();}});
  wc.on('did-stop-loading',()=>{if(current!==c)return;clearTimeout(c.timeout);c.loading=false;notify();});
  wc.on('did-fail-load',(event,code,description,target,isMainFrame)=>{if(current!==c||!isMainFrame||code===-3)return;clearTimeout(c.timeout);c.loading=false;c.error='原站暂时无法访问（'+description+'）。可在此重试，已有精读内容仍可使用。';view.setVisible(false);notify();});
  wc.on('render-process-gone',()=>{if(current===c){c.loading=false;c.error='阅读页面已停止，可点击重新加载。';view.setVisible(false);notify();}});
  win.on('resize',layout);win.on('closed',()=>cleanup(c));win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,target)=>{if(target!==shellURL)event.preventDefault();});
  try{await win.loadURL(shellURL);if(current!==c||token!==sequence||!isUnlocked()){if(current===c)close();return {ok:false,error:'阅读已取消。'};}win.show();win.focus();navigate(url);return {ok:true,inApp:true,id:item.id};}catch(error){if(current===c)close();return {ok:false,error:'无法打开软件内阅读窗口：'+error.message};}
 }
 ipcMain.handle('article-reader:state',e=>trusted(e)?{ok:true,...state()}:{ok:false,error:'请求来源无效'});
 ipcMain.handle('article-reader:command',(e,command)=>{if(!trusted(e))return {ok:false,error:'请求来源无效'};const c=current,wc=c.view.webContents;if(command==='close'){close();return {ok:true};}if(command==='reload')navigate(c.url);else if(command==='original')navigate(approvedURL(c.item.sourceUrl,c.item.sourceId));else if(command==='back'&&wc.navigationHistory.canGoBack())wc.navigationHistory.goBack();else if(command==='forward'&&wc.navigationHistory.canGoForward())wc.navigationHistory.goForward();else if(command==='zoom-in'||command==='zoom-out'){wc.setZoomFactor(Math.max(.75,Math.min(1.75,wc.getZoomFactor()+(command==='zoom-in'?.1:-.1))));notify();}else if(!['back','forward'].includes(command))return {ok:false,error:'不支持的阅读操作'};return {ok:true};});
 return {open,close,status:state};
}
module.exports={createArticleReader,approvedURL};
