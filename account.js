'use strict';
const host=document.querySelector('#accountContent');let mode='login',busy=false,first=false,lastId='',recoveryCode='';
let loginInfo={available:false},remember=false,automatic=false,useRemembered=false,optionWork=Promise.resolve(),autoTimer=null,autoCancelled=false;
const escapeAccount=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>window.wordIsle;
window.wordIsle?.onAccountLifecycle?.(()=>{clearTimeout(autoTimer);autoCancelled=true;recoveryCode='';host.textContent='学习空间已锁定，请重新登录。';});
const accountInput=(id,label,type='text',attrs='')=>'<label for="'+id+'">'+label+'</label><input id="'+id+'" name="'+id+'" type="'+type+'" required '+attrs+'>';
function adoptLogin(info){loginInfo=info||{available:false};remember=!!loginInfo.rememberPassword;automatic=!!loginInfo.autoLogin;lastId=loginInfo.username||'';useRemembered=!!loginInfo.hasSavedPassword;}
function loginHint(){return loginInfo.paused?'学习空间已锁定，请手动输入密码。':!loginInfo.available?'本机安全存储暂不可用，请手动登录。':useRemembered?'已记住密码，可直接点击登录。':'仅建议在自己的电脑上开启。';}
function draw(){
  if(mode==='ready')return;
  const register=mode==='register',recover=mode==='recover',importing=mode==='import',isLogin=mode==='login';
  host.innerHTML='<div class="account-tabs" role="group" aria-label="账号操作"><button data-account-mode="login" class="'+(isLogin?'on':'')+'" aria-pressed="'+isLogin+'">登录</button><button data-account-mode="register" class="'+(register?'on':'')+'" aria-pressed="'+register+'">注册</button></div>'+
    (isLogin?'<div class="account-login-avatar"><img src="assets/wordisle-icon.svg" alt="词屿学习空间"></div>':'')+
    '<h2>'+(register?'认识一下，新的学习搭子':recover?'找回你的学习空间':importing?'带回加密账号备份':'回来啦，继续一点点进步')+'</h2><p class="account-lead">'+(register?'创建本机账号，系统会随机分配专属 ID。':recover?'使用注册时保存的恢复密钥，重设密码。':importing?'输入导出备份时的密码，再选择 .wiaccount 文件。':'输入账号或 ID，解锁自己的学习记录。')+'</p><form id="accountForm" class="account-form">'+
    (!importing?accountInput('accountUsername',register?'账号':'账号或 ID','text','autocomplete="username" maxlength="32" placeholder="'+(register?'4—32 位字母、数字或下划线':'账号或 WI- 开头的 ID')+'" value="'+(register?'':escapeAccount(lastId))+'"'):'')+
    (register?'<div class="account-fields"><div>'+accountInput('accountName','你的名字','text','autocomplete="nickname" maxlength="24" placeholder="希望小屿怎么称呼你"')+'</div><div><label for="accountGender">性别</label><select id="accountGender"><option>不愿透露</option><option>男</option><option>女</option><option>其他</option></select></div></div>':'')+
    (recover?accountInput('accountRecovery','恢复密钥','text','autocomplete="off" spellcheck="false" placeholder="WI- 开头的恢复密钥"'):'')+
    accountInput('accountPassword',recover?'新密码':'密码','password','autocomplete="'+(register||recover?'new-password':'current-password')+'" '+(register||recover?'minlength="9"':'')+' maxlength="128"')+
    (register||recover?'<small>9—128 个字符；可以用容易记住的中文短句。</small>'+accountInput('accountConfirm','确认密码','password','autocomplete="new-password" minlength="9" maxlength="128"'):'')+
    '<label class="account-password-toggle"><input id="accountShowPassword" type="checkbox">显示密码</label>'+
    (isLogin?'<div class="account-login-options"><label><input id="accountRemember" type="checkbox"'+(remember?' checked':'')+(!loginInfo.available?' disabled':'')+'>记住密码</label><label><input id="accountAuto" type="checkbox"'+(automatic?' checked':'')+(!loginInfo.available?' disabled':'')+'>自动登录</label><button type="button" class="account-link" data-account-mode="recover">忘记密码</button></div><p class="account-login-hint" id="accountLoginHint">'+escapeAccount(loginHint())+'</p>':'')+
    (register&&first?'<label class="account-check"><input id="accountMigrate" type="checkbox" checked>将这台电脑中旧版词屿的学习记录迁入此账号（如有）</label>':'')+
    '<p class="account-error" id="accountError" role="alert"></p><button class="account-submit" type="submit">'+(register?'注册，开启自己的词屿':recover?'验证密钥并重设密码':importing?'选择并导入加密备份':'登录学习空间')+'</button></form><div class="account-links">'+(isLogin?'<button class="account-link" data-account-switch>切换账号 / 清除密码</button>':'<button class="account-link" data-account-mode="recover">忘记密码</button>')+'<button class="account-link" data-account-mode="import">导入加密账号备份</button></div>';
  if(isLogin)syncSavedPassword();
}
function syncSavedPassword(){const password=document.querySelector('#accountPassword');if(mode!=='login'||!password)return;password.required=!useRemembered;password.placeholder=useRemembered?'•••••••••':'请输入密码';password.setAttribute('aria-description',useRemembered?'已记住密码，点击登录即可':'请输入密码');const show=document.querySelector('#accountShowPassword');if(show)show.disabled=useRemembered;const hint=document.querySelector('#accountLoginHint');if(hint)hint.textContent=loginHint();}
function error(text){const el=document.querySelector('#accountError');if(el)el.textContent=text;}
function setBusy(value){busy=value;host.querySelectorAll('button,input,select').forEach(el=>el.disabled=value);const b=host.querySelector('.account-submit');if(b){if(value){b.dataset.idleText=b.textContent;b.textContent='正在保护你的学习空间…';}else if(b.dataset.idleText)b.textContent=b.dataset.idleText;}if(!value&&mode==='login'){document.querySelector('#accountRemember').disabled=document.querySelector('#accountAuto').disabled=!loginInfo.available;syncSavedPassword();}}
function enter(){recoveryCode='';window.location.replace('index.html');}
function ready(result){
  mode='ready';recoveryCode=result.recoveryCode||'';const p=result.profile;
  host.innerHTML='<span class="eyebrow">WELCOME TO YOUR ISLAND</span><h2>'+escapeAccount(p.displayName)+'，欢迎来到词屿</h2><p class="account-profile-line">账号：'+escapeAccount(p.username)+'<br>你的 ID：<b>'+escapeAccount(p.id)+'</b><br>'+(result.migrated?'旧版学习记录已迁入这个加密空间。':'学习记录会保存到你的本机加密空间。')+'</p>'+(recoveryCode?'<div class="account-recovery"><b>请保存恢复密钥</b><p>忘记密码时可用它重设密码。请放在自己的私人位置。</p><code>'+escapeAccount(recoveryCode)+'</code><br><button class="account-secondary" data-account-copy>复制恢复密钥</button></div>':'')+(result.warning?'<p class="account-warning">'+escapeAccount(result.warning)+'</p>':'')+'<p class="account-error" id="accountError" role="status"></p><button class="account-submit" data-account-enter>开始今天的一小步</button>';
}
function persistOptions(){const input={username:document.querySelector('#accountUsername')?.value||'',rememberPassword:remember,autoLogin:automatic};optionWork=optionWork.catch(()=>{}).then(async()=>{const r=await api().accountLoginOptions(input);if(!r.ok)throw Error(r.error);});optionWork.catch(e=>error(e.message));return optionWork;}
async function cancelAutomatic(redraw=true){autoCancelled=true;clearTimeout(autoTimer);const r=await api().accountCancelAuto();if(!r.ok){error(r.error);return;}const status=await api().accountStatus();adoptLogin(status.login);if(redraw){mode='login';draw();}}
function scheduleAutomatic(){
  autoCancelled=false;document.querySelector('#accountForm').hidden=true;const note=document.createElement('div');note.className='account-auto-status';note.innerHTML='<span class="account-auto-pulse" aria-hidden="true"></span><p>即将进入你的学习空间…</p><button class="account-secondary" data-account-cancel-auto>取消自动登录</button>';host.insertBefore(note,document.querySelector('#accountForm'));
  autoTimer=setTimeout(async()=>{if(autoCancelled)return;note.querySelector('p').textContent='正在登录，接着上次的进步…';try{const r=await api().accountAutoLogin();if(autoCancelled)return;if(r.ok){enter();return;}adoptLogin((await api().accountStatus()).login);draw();error(r.error||'请手动登录');}catch(_){if(!autoCancelled){draw();error('自动登录未完成，请手动登录。');}}},1400);
}
host.addEventListener('click',async e=>{
  if(e.target.closest('[data-account-cancel-auto]')){await cancelAutomatic();return;}
  const tab=e.target.closest('[data-account-mode]');if(tab&&!busy){if(document.querySelector('.account-auto-status'))await cancelAutomatic(false);mode=tab.dataset.accountMode;draw();}
  if(e.target.closest('[data-account-switch]')&&!busy){await optionWork.catch(()=>{});const r=await api().accountForget();if(!r.ok){error(r.error);return;}adoptLogin({available:loginInfo.available});draw();document.querySelector('#accountUsername').focus();}
  if(e.target.closest('[data-account-enter]'))enter();
  if(e.target.closest('[data-account-copy]')){const r=await api().accountCopy('词屿恢复密钥\n'+recoveryCode);error(r.ok?'已复制，请保存到私人位置。':r.error);}
});
host.addEventListener('input',e=>{
  if(mode!=='login')return;
  if(e.target.id==='accountPassword'){useRemembered=!e.target.value&&remember&&loginInfo.hasSavedPassword;syncSavedPassword();}
  if(e.target.id==='accountUsername'&&loginInfo.username){const name=e.target.value.trim().toLowerCase();if(name!==loginInfo.username&&name!==loginInfo.id.toLowerCase()){loginInfo={available:loginInfo.available};remember=automatic=useRemembered=false;document.querySelector('#accountRemember').checked=document.querySelector('#accountAuto').checked=false;syncSavedPassword();persistOptions();}}
});
host.addEventListener('change',e=>{
  if(e.target.id==='accountShowPassword')for(const id of ['accountPassword','accountConfirm']){const el=document.getElementById(id);if(el)el.type=e.target.checked?'text':'password';}
  if(e.target.id==='accountRemember'||e.target.id==='accountAuto'){
    if(e.target.id==='accountAuto'){automatic=e.target.checked;if(automatic)remember=true;}else{remember=e.target.checked;if(!remember){automatic=false;useRemembered=false;loginInfo.hasSavedPassword=false;}}
    document.querySelector('#accountRemember').checked=remember;document.querySelector('#accountAuto').checked=automatic;syncSavedPassword();persistOptions();
  }
});
host.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;const value=id=>document.getElementById(id)?.value||'';const password=value('accountPassword');
  if((mode==='register'||mode==='recover')&&password!==value('accountConfirm')){error('两次密码不一致，请再检查一下。');return;}
  const payload={username:value('accountUsername'),password,displayName:value('accountName'),gender:value('accountGender'),recoveryCode:value('accountRecovery'),migrateLegacy:document.querySelector('#accountMigrate')?.checked!==false,rememberPassword:remember,autoLogin:automatic,useRemembered:mode==='login'&&useRemembered};
  const action=mode;setBusy(true);error('');
  try{await optionWork;const r=action==='register'?await api().accountRegister(payload):action==='recover'?await api().accountRecover(payload):action==='import'?await api().accountImport({password}):await api().accountLogin(payload);if(!r.ok||r.canceled){if(payload.useRemembered&&!password){loginInfo.hasSavedPassword=false;useRemembered=false;}setBusy(false);error(r.canceled?'已取消导入。':r.error||'未能登录');return;}if((action==='login'||action==='import')&&!r.warning){enter();return;}setBusy(false);ready(r);}catch(_){setBusy(false);error('暂时无法打开学习空间，请重试。');}
});
(async()=>{try{if(!api()?.accountStatus)throw Error();const r=await api().accountStatus();if(!r.ok)throw Error(r.error);first=!r.hasAccounts;adoptLogin(r.login);document.querySelector('#accountVersion').textContent='词屿 '+r.version+' · 本机加密账号';if(r.authenticated){mode='login';draw();error('已有账号解锁，可继续进入。');const b=document.createElement('button');b.className='account-submit';b.textContent='继续学习';b.addEventListener('click',enter);host.appendChild(b);}else{mode=first?'register':'login';draw();if(mode==='login'&&r.autoAllowed&&automatic&&!loginInfo.paused)scheduleAutomatic();}}catch(e){host.textContent=e.message||'请使用完整的词屿桌面程序打开安全账号功能。';}})();
