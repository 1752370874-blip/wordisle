'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAX_DATA=32*1024*1024,MAX_ACCOUNT_FILE=48*1024*1024;
const ID=/^WI-\d{12}$/,ASSET=/^(?:bg-[a-f0-9]{12}\.(?:png|jpg|jpeg|webp|gif|bmp|avif)|boundary-(?:model|previous|choice)\.json)$/;
const KDF={N:131072,r:8,p:1,maxmem:256*1024*1024};
function accountName(value){const s=String(value||'').trim().toLowerCase();if(!/^[a-z0-9_]{4,32}$/.test(s))throw Error('账号需为 4—32 位字母、数字或下划线');return s;}
function password(value){if(typeof value!=='string'||[...value].length<9||[...value].length>128)throw Error('密码需为 9—128 个字符，可以使用容易记住的中文短句');return value;}
function loginSecret(value){if(typeof value!=='string'||!value||[...value].length>128)throw Error('请输入正确的账号和密码');return value;}
function profileFields(input){const name=String(input.displayName||'').trim().normalize('NFC');if(!name||[...name].length>24)throw Error('名字需为 1—24 个字符');const gender=['男','女','其他','不愿透露'].includes(input.gender)?input.gender:'不愿透露';return {displayName:name,gender};}
function hashName(s){return crypto.createHash('sha256').update(s).digest('hex');}
function derive(secret,salt){return new Promise((resolve,reject)=>crypto.scrypt(secret,salt,32,KDF,(e,k)=>e?reject(e):resolve(k)));}
function decode(text,bytes){if(typeof text!=='string'||!/^[-A-Za-z0-9+/=]*$/.test(text))throw Error('账号文件格式不正确');const b=Buffer.from(text,'base64');if(bytes&&b.length!==bytes)throw Error('账号文件格式不正确');return b;}
function seal(key,bytes,aad){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));const data=Buffer.concat([c.update(bytes),c.final()]);return {iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')};}
function open(key,box,aad){const d=crypto.createDecipheriv('aes-256-gcm',key,decode(box?.iv,12));d.setAAD(Buffer.from(aad));d.setAuthTag(decode(box?.tag,16));return Buffer.concat([d.update(decode(box?.data)),d.final()]);}
function recovery(){const raw=crypto.randomBytes(32);return 'WI-'+raw.toString('hex').toUpperCase().match(/.{8}/g).join('-');}
function recoveryKey(code){const hex=String(code||'').trim().replace(/^WI-/i,'').replace(/[-\s]/g,'');if(!/^[0-9a-f]{64}$/i.test(hex))throw Error('恢复密钥格式不正确');return crypto.createHash('sha256').update(Buffer.from(hex,'hex')).digest();}
function checkRaw(raw){if(raw===null||raw===undefined)return null;if(typeof raw!=='string'||Buffer.byteLength(raw)>MAX_DATA)throw Error('学习数据超过 32 MB 或格式不正确');const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw Error('学习数据格式不正确');return raw;}
function header(record){if(record?.format!=='wordisle-account'||record.version!==1||!ID.test(record.id)||!/^[a-f0-9]{64}$/.test(record.loginHash)||record.kdf!=='scrypt-N17-r8-p1')throw Error('账号文件格式不正确');decode(record.salt,32);return record;}
async function atomic(file,text){await fs.promises.mkdir(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';let handle;try{handle=await fs.promises.open(temp,'wx',0o600);await handle.writeFile(text,'utf8');await handle.sync();await handle.close();handle=null;await fs.promises.rename(temp,file);}catch(e){if(handle)await handle.close().catch(()=>{});await fs.promises.unlink(temp).catch(()=>{});throw e;}}
function createAccountVault(base){
  const dir=path.join(base,'accounts'),indexFile=path.join(dir,'index.json');let unlocked=null,epoch=0,authBusy=false,queue=Promise.resolve();const failures=new Map(),dummySalt=crypto.randomBytes(32);
  function entries(){
    if(!fs.existsSync(indexFile)){if(fs.existsSync(dir)&&fs.readdirSync(dir).some(n=>/^WI-\d{12}\.json$/.test(n)))throw Error('账号索引缺失，请保留账号文件并使用加密备份恢复');return [];}
    const index=JSON.parse(fs.readFileSync(indexFile,'utf8'));if(index.version!==1||!Array.isArray(index.accounts)||index.accounts.length>50)throw Error('账号索引不可用，请保留数据并使用加密备份恢复');
    if(index.accounts.some(a=>!ID.test(a.id)||!/^[a-f0-9]{64}$/.test(a.loginHash)))throw Error('账号索引格式不正确');return index.accounts;
  }
  const fileOf=id=>{if(!ID.test(id))throw Error('账号 ID 无效');return path.join(dir,id+'.json');};
  function readRecord(id){const file=fileOf(id);if(fs.statSync(file).size>MAX_ACCOUNT_FILE)throw Error('账号文件过大');return header(JSON.parse(fs.readFileSync(file,'utf8')));}
  function active(expected){if(!unlocked||expected!==undefined&&expected!==epoch)throw Error('请先登录，或重新解锁当前账号');return unlocked;}
  function serial(fn){const next=queue.catch(()=>{}).then(fn);queue=next;return next;}
  async function exclusive(fn){if(authBusy)throw Error('正在处理账号，请稍候');authBusy=true;try{return await fn();}finally{authBusy=false;}}
  async function persist(s){const bytes=Buffer.from(JSON.stringify(s.payload));if(bytes.length>MAX_DATA)throw Error('加密学习空间超过 32 MB，请先备份并精简资料');const next={...s.record,box:seal(s.key,bytes,'wordisle/data/'+s.record.id)};await atomic(fileOf(s.record.id),JSON.stringify(next));s.record=next;}
  function activate(record,key,payload){if(payload?.profile?.id!==record.id||hashName(accountName(payload.profile.username))!==record.loginHash)throw Error('账号内容不匹配');checkRaw(payload.data);unlocked={record,key,payload};epoch++;return {...payload.profile};}
  function find(value){const text=String(value||'').trim();const list=entries();return ID.test(text)?list.find(a=>a.id===text):list.find(a=>a.loginHash===hashName(accountName(text)));}
  function failureKey(value){return crypto.createHash('sha256').update(String(value||'').trim().toLowerCase()).digest('hex');}
  function checkFailures(value){const f=failures.get(failureKey(value));if(f?.until>Date.now())throw Error('尝试次数较多，请在 '+Math.ceil((f.until-Date.now())/1000)+' 秒后重试');}
  function failed(value){const k=failureKey(value),old=failures.get(k)||{n:0};old.n++;old.until=old.n>=5?Date.now()+30000:0;failures.set(k,old);if(failures.size>1000)failures.delete(failures.keys().next().value);}
  async function register(input,legacy={}){return exclusive(async()=>{
    if(unlocked)throw Error('请先退出当前账号');const username=accountName(input.username),pass=password(input.password),fields=profileFields(input),list=entries();if(list.length>=50)throw Error('本机账号已达 50 个');if(list.some(a=>a.loginHash===hashName(username)))throw Error('这个账号已注册，请直接登录');
    let id;do{id='WI-'+String(crypto.randomInt(0,1e12)).padStart(12,'0');}while(list.some(a=>a.id===id)||fs.existsSync(fileOf(id)));
    const salt=crypto.randomBytes(32),kek=await derive(pass,salt),key=crypto.randomBytes(32),code=recovery(),rk=recoveryKey(code);let success=false;
    try{
      const profile={id,username,...fields,createdAt:new Date().toISOString(),onboarding:{version:1,status:'pending'}},payload={profile,data:checkRaw(legacy.raw??null)};
      const record={format:'wordisle-account',version:1,id,loginHash:hashName(username),kdf:'scrypt-N17-r8-p1',salt:salt.toString('base64'),wrappedKey:seal(kek,key,'wordisle/password/'+id),recoveryKey:seal(rk,key,'wordisle/recovery/'+id),box:null};
      const s={record,key,payload};await persist(s);for(const [name,bytes] of Object.entries(legacy.assets||{})){if(!ASSET.test(name)||!Buffer.isBuffer(bytes)||bytes.length>20*1024*1024)throw Error('旧版附件格式不正确');await atomic(blobFile(name,id),JSON.stringify(seal(key,bytes,'wordisle/asset/'+id+'/'+name)));}await atomic(indexFile,JSON.stringify({version:1,accounts:list.concat({id,loginHash:record.loginHash})}));activate(s.record,key,payload);success=true;return {profile:{...profile},recoveryCode:code};
    }finally{kek.fill(0);rk.fill(0);if(!success){key.fill(0);await fs.promises.unlink(fileOf(id)).catch(()=>{});for(const name of Object.keys(legacy.assets||{}))if(ASSET.test(name))await fs.promises.unlink(blobFile(name,id)).catch(()=>{});await fs.promises.rmdir(path.join(dir,id+'-assets')).catch(()=>{});}}
  });}
  async function login(input){return exclusive(async()=>{
    if(unlocked)throw Error('已有账号登录');const secret=loginSecret(input.password);checkFailures(input.username);const entry=find(input.username);let record,kek,key;
    try{
      record=entry?readRecord(entry.id):null;kek=await derive(secret,record?decode(record.salt,32):dummySalt);
      if(!record)throw Error('invalid');key=open(kek,record.wrappedKey,'wordisle/password/'+record.id);if(key.length!==32)throw Error('invalid');const payload=JSON.parse(open(key,record.box,'wordisle/data/'+record.id));const profile=activate(record,key,payload);key=null;failures.delete(failureKey(input.username));return {profile};
    }catch(e){failed(input.username);throw Error('账号或密码不正确，或账号文件已损坏');}finally{kek?.fill(0);key?.fill(0);}
  });}
  async function recover(input){return exclusive(async()=>{
    if(unlocked)throw Error('请先退出当前账号');checkFailures(input.username);const pass=password(input.password),entry=find(input.username);if(!entry){failed(input.username);throw Error('账号或恢复密钥不正确');}const record=readRecord(entry.id);let key,rk,kek;
    try{rk=recoveryKey(input.recoveryCode);key=open(rk,record.recoveryKey,'wordisle/recovery/'+record.id);const payload=JSON.parse(open(key,record.box,'wordisle/data/'+record.id));const salt=crypto.randomBytes(32);kek=await derive(pass,salt);const code=recovery(),newRK=recoveryKey(code);const next={...record,salt:salt.toString('base64'),wrappedKey:seal(kek,key,'wordisle/password/'+record.id),recoveryKey:seal(newRK,key,'wordisle/recovery/'+record.id)};newRK.fill(0);const s={record:next,key,payload};await persist(s);const profile=activate(s.record,key,payload);key=null;failures.delete(failureKey(input.username));return {profile,recoveryCode:code};
    }catch(e){failed(input.username);throw Error('账号或恢复密钥不正确，或账号文件已损坏');}finally{key?.fill(0);rk?.fill(0);kek?.fill(0);}
  });}
  async function read(expected){await queue.catch(()=>{});return active(expected).payload.data;}
  function save(raw,expected=epoch){checkRaw(raw);return serial(async()=>{const s=active(expected),prior=s.payload.data;s.payload.data=raw;try{await persist(s);}catch(e){s.payload.data=prior;throw e;}return {ok:true};});}
  async function lock(){await queue.catch(()=>{});if(unlocked)unlocked.key.fill(0);unlocked=null;epoch++;}
  function blobFile(name,id){if(!ASSET.test(name))throw Error('文件名无效');return path.join(dir,id+'-assets',name+'.vault');}
  function putBlob(name,bytes,expected=epoch){const s=active(expected);if(!Buffer.isBuffer(bytes)||bytes.length>20*1024*1024)throw Error('附件超过大小限制');const f=blobFile(name,s.record.id),temp=f+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';fs.mkdirSync(path.dirname(f),{recursive:true,mode:0o700});try{fs.writeFileSync(temp,JSON.stringify(seal(s.key,bytes,'wordisle/asset/'+s.record.id+'/'+name)),{mode:0o600,flag:'wx'});fs.renameSync(temp,f);}catch(e){try{fs.unlinkSync(temp)}catch(_){}throw e;}}
  function getBlob(name,expected=epoch){const s=active(expected),f=blobFile(name,s.record.id);if(!fs.existsSync(f))return null;if(fs.statSync(f).size>32*1024*1024)throw Error('附件过大');return open(s.key,JSON.parse(fs.readFileSync(f,'utf8')),'wordisle/asset/'+s.record.id+'/'+name);}
  function removeBlob(name,expected=epoch){const s=active(expected);const f=blobFile(name,s.record.id);if(fs.existsSync(f))fs.unlinkSync(f);}
  function updateProfile(input,expected=epoch){const fields=profileFields(input);return serial(async()=>{const s=active(expected),prior=s.payload.profile;s.payload.profile={...prior,...fields};try{await persist(s);}catch(e){s.payload.profile=prior;throw e;}return {...s.payload.profile};});}
  function completeOnboarding(status,expected=epoch){if(!['completed','skipped'].includes(status))throw Error('引导状态无效');return serial(async()=>{const s=active(expected),prior=s.payload.profile;if(prior.onboarding?.status==='completed'||prior.onboarding?.status==='skipped')return {...prior};s.payload.profile={...prior,onboarding:{version:1,status,finishedAt:new Date().toISOString()}};try{await persist(s);}catch(e){s.payload.profile=prior;throw e;}return {...s.payload.profile};});}
  function changePassword(input,expected=epoch){return serial(async()=>{const s=active(expected),newPassword=password(input.password);let oldKey,kek,decoded;try{oldKey=await derive(String(input.oldPassword||''),decode(s.record.salt,32));decoded=open(oldKey,s.record.wrappedKey,'wordisle/password/'+s.record.id);if(decoded.length!==32||!crypto.timingSafeEqual(decoded,s.key))throw Error('invalid');const salt=crypto.randomBytes(32);kek=await derive(newPassword,salt);const prior=s.record;s.record={...prior,salt:salt.toString('base64'),wrappedKey:seal(kek,s.key,'wordisle/password/'+s.record.id)};try{await persist(s);}catch(e){s.record=prior;throw e;}return {ok:true};}catch(e){throw Error('原密码不正确，或密码修改未成功');}finally{oldKey?.fill(0);kek?.fill(0);decoded?.fill(0);}});}
  async function exportAccount(expected=epoch){await queue.catch(()=>{});const s=active(expected),assets={};const folder=path.join(dir,s.record.id+'-assets');if(fs.existsSync(folder))for(const n of fs.readdirSync(folder)){const name=n.replace(/\.vault$/,'');if(ASSET.test(name)&&n.endsWith('.vault'))assets[name]=JSON.parse(fs.readFileSync(path.join(folder,n),'utf8'));}return JSON.stringify({format:'wordisle-account-backup',version:1,account:s.record,assets});}
  async function importAccount(text,pass){return exclusive(async()=>{
    if(unlocked)throw Error('请退出当前账号后导入');const secret=loginSecret(pass);
    if(typeof text!=='string'||Buffer.byteLength(text)>96*1024*1024)throw Error('备份文件过大');
    const bundle=JSON.parse(text);if(bundle.format!=='wordisle-account-backup'||bundle.version!==1)throw Error('请选择词屿加密账号备份');
    const record=header(bundle.account),list=entries(),assetDir=path.join(dir,record.id+'-assets');
    if(list.length>=50||list.some(a=>a.id===record.id||a.loginHash===record.loginHash)||fs.existsSync(fileOf(record.id))||fs.existsSync(assetDir))throw Error('本机已有此账号或待恢复记录；为保护现有记录，不会覆盖');
    const serialized=JSON.stringify(record);if(Buffer.byteLength(serialized)>MAX_ACCOUNT_FILE)throw Error('账号备份过大');
    let kek,key,created=false;const written=[];
    try{
      kek=await derive(secret,decode(record.salt,32));key=open(kek,record.wrappedKey,'wordisle/password/'+record.id);
      const payload=JSON.parse(open(key,record.box,'wordisle/data/'+record.id));
      if(payload?.profile?.id!==record.id||hashName(accountName(payload.profile.username))!==record.loginHash)throw Error('invalid');checkRaw(payload.data);profileFields(payload.profile);
      const assets=Object.entries(bundle.assets||{});if(assets.length>10)throw Error('附件数量异常');
      for(const [name,box] of assets){if(!ASSET.test(name))throw Error('附件名称不正确');const plain=open(key,box,'wordisle/asset/'+record.id+'/'+name),size=plain.length;plain.fill(0);if(size>20*1024*1024)throw Error('附件过大');}
      await atomic(fileOf(record.id),serialized);created=true;
      for(const [name,box] of assets){await atomic(blobFile(name,record.id),JSON.stringify(box));written.push(name);}
      await atomic(indexFile,JSON.stringify({version:1,accounts:list.concat({id:record.id,loginHash:record.loginHash})}));
      const profile=activate(record,key,payload);key=null;return {profile};
    }catch(e){if(created){await fs.promises.unlink(fileOf(record.id)).catch(()=>{});for(const name of written)await fs.promises.unlink(blobFile(name,record.id)).catch(()=>{});await fs.promises.rmdir(assetDir).catch(()=>{});}throw Error('备份密码不正确，或备份文件无法验证 / 保存');}
    finally{kek?.fill(0);key?.fill(0);}
  });}
  return {register,login,recover,read,save,lock,updateProfile,completeOnboarding,changePassword,putBlob,getBlob,removeBlob,exportAccount,importAccount,hasAccounts:()=>entries().length>0,status:()=>({authenticated:!!unlocked,hasAccounts:entries().length>0,profile:unlocked?{...unlocked.payload.profile}:null}),isUnlocked:()=>!!unlocked,get epoch(){return epoch;},privateStorage(expected){return {read:name=>getBlob('boundary-'+name,expected)?.toString('utf8')||null,write:(name,text)=>putBlob('boundary-'+name,Buffer.from(text),expected)};}};
}
module.exports={createAccountVault};
