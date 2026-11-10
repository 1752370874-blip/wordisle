'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function createLoginPreferences({userData,safeStorage,platform=process.platform}){
  const file=path.join(userData,'remembered-login.json');let queue=Promise.resolve(),availability;
  const serial=fn=>{const next=queue.catch(()=>{}).then(fn);queue=next;return next;};
  function available(){if(!availability)availability=(async()=>{try{if(platform==='linux'&&safeStorage.getSelectedStorageBackend?.()==='basic_text')return false;const asyncMode=typeof safeStorage.isAsyncEncryptionAvailable==='function';if(!(asyncMode?await safeStorage.isAsyncEncryptionAvailable():safeStorage.isEncryptionAvailable?.()))return false;const probe='wordisle/login-protection-check';if(asyncMode){const encrypted=await safeStorage.encryptStringAsync(probe),plain=await safeStorage.decryptStringAsync(encrypted);return (typeof plain==='string'?plain:plain.result)===probe;}return safeStorage.decryptString(safeStorage.encryptString(probe))===probe;}catch(_){return false;}})();return availability;}
  async function clearFile(){try{await fs.promises.unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
  function validate(value){if(!value||!/^WI-\d{12}$/.test(value.id)||!/^[a-z0-9_]{4,32}$/.test(value.username)||typeof value.password!=='string'||[...value.password].length<9||[...value.password].length>128)throw Error('保存的登录信息不可用');return value;}
  async function read(){
    try{const stat=await fs.promises.stat(file);if(stat.size>16384)throw Error('file size');const box=JSON.parse(await fs.promises.readFile(file,'utf8'));if(box.version!==1||typeof box.encrypted!=='string'||!await available())throw Error('encryption unavailable');const bytes=Buffer.from(box.encrypted,'base64');let plain;
      if(box.kind==='async'){if(typeof safeStorage.decryptStringAsync!=='function')throw Error('unsupported encryption');const result=await safeStorage.decryptStringAsync(bytes);plain=typeof result==='string'?result:result.result;}else if(box.kind==='sync'){plain=safeStorage.decryptString(bytes);}else throw Error('unsupported encryption');
      return validate(JSON.parse(plain));
    }catch(e){if(e.code==='ENOENT')return null;await clearFile();return null;}
  }
  async function write(value){
    validate(value);if(!await available())throw Error('系统安全存储暂不可用，请手动输入密码');
    const kind=typeof safeStorage.encryptStringAsync==='function'?'async':'sync';const encrypted=kind==='async'?await safeStorage.encryptStringAsync(JSON.stringify(value)):safeStorage.encryptString(JSON.stringify(value));
    await fs.promises.mkdir(userData,{recursive:true});const temp=file+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';let handle;
    try{handle=await fs.promises.open(temp,'wx',0o600);await handle.writeFile(JSON.stringify({version:1,kind,encrypted:Buffer.from(encrypted).toString('base64')}),'utf8');await handle.sync();await handle.close();handle=null;await fs.promises.rename(temp,file);}catch(e){if(handle)await handle.close().catch(()=>{});await fs.promises.unlink(temp).catch(()=>{});throw e;}
  }
  function sameAccount(value,username){const name=String(username||'').trim().toLowerCase();return value&&(name===value.username||name===value.id.toLowerCase());}
  return {
    status:()=>serial(async()=>{const value=await read();return {available:await available(),rememberPassword:!!value,autoLogin:!!value?.autoLogin,paused:!!value?.paused,username:value?.username||'',id:value?.id||'',hasSavedPassword:!!value&&!value.paused};}),
    credential:username=>serial(async()=>{const value=await read();return value&&!value.paused&&(!username||sameAccount(value,username))?{username:value.username,password:value.password,id:value.id}:null;}),
    save:(profile,password,autoLogin)=>serial(()=>write({username:profile.username,id:profile.id,password,autoLogin:!!autoLogin,paused:false})),
    update:input=>serial(async()=>{const value=await read();if(input?.rememberPassword===false||value&&input?.username&&!sameAccount(value,input.username)){await clearFile();return;}if(value){value.autoLogin=input?.autoLogin===true;await write(value);}}),
    pause:()=>serial(async()=>{const value=await read();if(value){value.paused=true;try{await write(value);}catch(e){await clearFile();}}}),
    logout:()=>serial(async()=>{const value=await read();if(value){value.autoLogin=false;value.paused=false;try{await write(value);}catch(e){await clearFile();}}}),
    clear:()=>serial(clearFile)
  };
}
module.exports={createLoginPreferences};
