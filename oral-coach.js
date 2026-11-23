'use strict';
const OralCoach=(()=>{
 const scenarios={
  free:['自由对话','You are Xiaoyu, an easygoing voice-chat partner. Follow any new topic and use relevant details from earlier turns. Get to the point in short, everyday phrases with natural contractions. Use a brief example if needed. Skip stock openers like “Great question” and ask a follow-up only when you’re curious about a specific detail.','Hey! Good to hear from you. What’s on your mind?'],
  campus:['校园交流','You are a classmate chatting between lectures. Your day is going well, and you just got out of class. Take an interest in what your classmate shares.','Hi! How is your day at university going?'],
  classroom:['课堂讨论','You are a teacher helping a student with their class. Answer their actual questions with a brief explanation or example.','What would you like to understand better from your class?'],
  interview:['英语面试','You are a friendly interviewer. Ask about the candidate’s experience. Use only project details the candidate actually shared. In their message “we” means their teammates. In your reply, call them “your team” and speak as the interviewer.','Could you tell me a little about yourself?'],
  travel:['旅行交流','You are a visitor information desk attendant. Help the traveller clarify their destination and preferences. Be honest if a real location, fare or schedule is unknown.','Hello! Where would you like to go today?'],
  movies:['电影闲聊','You are a friend talking about films. React to the specific films, characters or preferences the learner brings up.','What kind of movies do you enjoy?']
 };
 let recording=false,starting=false,recognizing=false,busy=false,stream=null,context=null,node=null,chunks=[],timer=0,epoch=0,notice='',devices=[],device='',voicePending=false,voiceWarmed=null;
 let pickerRenderFrame=0;
 let pendingTurn=null;
 let call=null;
 const voiceChoices=[['alba','聊天音色 · Alba'],['3','自然女声 · 温暖'],['9','自然女声 · 清晰'],['11','自然男声 · 沉稳'],['system','系统语音']];
 const voicePreview='Oh, that makes sense. I used to feel the same way. Did anything change your mind?';
 const voiceChoice=()=>voiceChoices.some(([id])=>id===String(store.settings.oralVoice))?String(store.settings.oralVoice):voiceChoices[0][0];
 const voiceSpeed=()=>[0.85,1,1.15].includes(Number(store.settings.oralVoiceSpeed))?Number(store.settings.oralVoiceSpeed):1;
 function warmVoice(){
  const voice=voiceChoice();
  if(voiceWarmed===voice||voice==='system'||!window.wordIsle?.neuralVoiceWarm)return;
  voiceWarmed=voice;
  const retry=()=>{if(voiceWarmed===voice)voiceWarmed=null;};
  window.wordIsle.neuralVoiceWarm(voice).then(result=>{if(!result?.ok)retry();}).catch(retry);
 }
 function oralStop(){stopSpeak();if(voicePending){voicePending=false;voiceWarmed=null;return window.wordIsle.neuralVoiceStop().catch(()=>{});}return Promise.resolve();}
 function speechNotice(message){
  notice=message;
  const status=document.querySelector('#view .oral-status');
  if(state.view==='oral'&&status)status.textContent=message;
 }
 async function oralSay(text,done){
  text=String(text||'').trim();
  if(!text)return;
  const previous=oralStop(),token=speakToken,choice=voiceChoice(),speed=voiceSpeed();
  const finished=()=>{if(token===speakToken)done?.();};
  let usingSystem=false;
  const useSystem=message=>{
   if(token!==speakToken||usingSystem)return;
   usingSystem=true;
   speechNotice(message);
   speakSystem(text,speed,finished);
  };
  await previous;
  if(token!==speakToken)return;
  if(choice==='system'||!window.wordIsle?.neuralVoice){
   useSystem(call?'小屿正在说话 · 系统语音':'系统语音');
   return;
  }
  voicePending=true;
  speechNotice('正在准备自然语音…');
  try{
   const result=await window.wordIsle.neuralVoice({text,voice:choice,speed});
   if(token!==speakToken)return;
   voicePending=false;
   if(!result?.ok)throw Error(result?.error||'自然语音暂不可用');
   const status=choice==='alba'&&result.engine!=='pocket'
    ?'Alba 暂不可用 · 使用自然女声'
    :call?'小屿正在说话':result.engine==='pocket'?'Alba · 离线播放':'自然语音 · 离线播放';
   speechNotice(status);
   playAudioFrom(Promise.resolve(result.audio),result.playbackRate||1,{
    still:()=>token===speakToken,ended:finished,
    audio:element=>element.addEventListener('playing',()=>{
     if(call?.phase==='speaking'&&token===speakToken)markVoice(call,true);
    },{once:true}),
    failed:()=>useSystem('自然语音播放未成功，已切换系统语音。')
   });
  }catch(_){
   if(token!==speakToken)return;
   voicePending=false;
   useSystem('自然语音暂不能完整朗读这句话，已切换系统语音。');
  }
 }

 function data(){
  const drafts=store.privateDrafts||(store.privateDrafts={});
  const free=drafts.oralMode!=='scenario';
  const key=free?'oralFree':'oralCoach';
  if(!drafts[key]||typeof drafts[key]!=='object')drafts[key]={scene:free?'free':'campus',turns:[],draft:''};
  const d=drafts[key];
  if(free)d.scene='free';
  else if(d.scene==='free'||!Object.hasOwn(scenarios,d.scene))d.scene='campus';
  d.turns=(Array.isArray(d.turns)?d.turns:[]).filter(t=>t&&['user','teacher'].includes(t.role)&&typeof t.text==='string').slice(-40).map(t=>({role:t.role,text:t.text.slice(0,3000)}));
  d.draft=typeof d.draft==='string'?d.draft.slice(0,1000):'';
  d.feedback=typeof d.feedback==='string'?d.feedback.slice(0,10000):'';
  d.editingLast=free&&d.editingLast===true&&d.turns.at(-2)?.role==='user'&&d.turns.at(-1)?.role==='teacher';
  return d;
 }
 function paint(){if(state.view==='oral')render();}
 function deferDuringPicker(){
  if(state.view!=='oral'||!document.querySelector('#view[data-view="oral"] .oral-intro select:open'))return false;
  // Replacing the selected element closes Chromium's native menu.
  if(!pickerRenderFrame)pickerRenderFrame=requestAnimationFrame(()=>{
   pickerRenderFrame=0;
   paint();
  });
  return true;
 }
 function view(){
  requestAnimationFrame(()=>{
   const chat=document.querySelector('.oral-chat');
   if(chat&&state.view==='oral'){chat.scrollTop=chat.scrollHeight;warmVoice();}
  });
  const d=data(),scene=scenarios[d.scene],free=d.scene==='free',lockedNow=locked(),inCall=!!call;
  const modeOptions=Object.entries(scenarios).map(([id,s])=>'<option value="'+id+'"'+(id===d.scene?' selected':'')+'>'+s[0]+'</option>').join('');
  const deviceOptions=devices.map((x,i)=>'<option value="'+esc(x.deviceId)+'"'+(device===x.deviceId?' selected':'')+'>'+esc(x.label||'麦克风 '+(i+1))+'</option>').join('');
  const voices=voiceChoices.map(([id,label])=>'<option value="'+id+'"'+(voiceChoice()===id?' selected':'')+'>'+label+'</option>').join('');
  const speeds=[[0.85,'慢一点'],[1,'正常'],[1.15,'快一点']].map(([value,label])=>'<option value="'+value+'"'+(voiceSpeed()===value?' selected':'')+'>'+label+'</option>').join('');
  const status='<p class="oral-status" role="status">'+esc(notice||(free?'开口说英语，说完稍停，小屿就会接话。':'可以用麦克风练习，也可以直接打字。'))+'</p>';
  const stage=free?'<div class="oral-call" data-call-state="'+(call?.phase||'idle')+'" data-voice-active="'+(call?.voiceActive===true)+'"><div class="oral-call-person"><img src="assets/wordisle-icon-128.png" alt=""><div><h3>和小屿通话</h3>'+status+'</div><span class="oral-voice-meter" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="oral-call-actions">'+
   (inCall?(call.phase==='speaking'&&!call.muted?'<button type="button" class="btn" data-oral="interrupt">我来说</button>':'')+
    '<button type="button" class="btn" data-oral="mute" aria-pressed="'+call.muted+'"'+(starting?' disabled':'')+'>'+(call.muted?'取消静音':'静音')+'</button><button type="button" class="btn oral-hangup" data-oral="hangup">挂断</button>':
   '<button type="button" class="btn primary" data-oral="call"'+(lockedNow||d.editingLast?' disabled':'')+'>开始通话</button>')+'</div></div>':
   '<h3>场景练习</h3><p>录音识别后，可以修改文字再发送。</p>';
  const replayDisabled=inCall?' disabled':'';
  const chat='<div class="oral-chat" aria-live="polite"><div class="oral-turn teacher"><b>小屿</b><p>'+esc(scene[2])+'</p><button class="btn small ghost" data-oral="speak-opening"'+replayDisabled+'>听开场</button></div>'+
   d.turns.map((t,i)=>'<div class="oral-turn '+t.role+'"><b>'+(t.role==='user'?'你':'小屿')+'</b><p>'+esc(t.text)+'</p>'+
    (t.role==='teacher'?'<button class="btn small ghost" data-oral="speak" data-i="'+i+'"'+replayDisabled+'>听这句</button>':
     free&&!inCall&&!lockedNow&&!d.draft&&!d.editingLast&&i===d.turns.length-2&&d.turns.at(-1)?.role==='teacher'
      ?'<button type="button" class="btn small ghost" data-oral="edit-last">纠正上一句</button>':'')+'</div>').join('')+
   (pendingTurn?.epoch===epoch?'<div class="oral-turn user"><b>你</b><p>'+esc(pendingTurn.text)+'</p></div>':'')+'</div>';
  const canSend=!lockedNow&&(!call||call.phase==='listening'||call.phase==='muted');
  return '<section class="panel oral-intro">'+stage+
   '<div class="oral-settings"><label>对话模式 <select id="oralScene"'+(lockedNow||inCall?' disabled':'')+'>'+modeOptions+'</select></label>'+
   '<label>麦克风 <select id="oralDevice"'+(lockedNow||inCall?' disabled':'')+'><option value="">系统默认麦克风</option>'+deviceOptions+'</select></label>'+
   '<button class="btn small ghost" data-oral="devices"'+(lockedNow||inCall?' disabled':'')+'>刷新设备</button></div>'+
   '<div class="oral-voice-settings"><label>老师声音 <select id="oralVoice">'+voices+'</select></label><label>语速 <select id="oralVoiceSpeed">'+speeds+'</select></label>'+
   '<button type="button" class="btn small ghost" data-oral="preview-voice"'+(inCall||lockedNow?' disabled':'')+'>试听</button></div>'+chat+
   '<label for="oralDraft">'+(d.editingLast?'纠正上一句':free?'打字聊天':'你的回答 · 识别后可修改')+'</label>'+
   '<textarea id="oralDraft" rows="2" maxlength="1000" placeholder="Type in English…">'+esc(d.draft)+'</textarea><div class="btn-row">'+
   (free?'':'<button class="btn primary" data-oral="record"'+(busy||starting||recognizing?' disabled':'')+'>'+(recording?'■ 说完了，识别':'● 开始说话')+'</button>')+
   '<button class="btn" data-oral="send"'+(canSend?'':' disabled')+'>'+(d.editingLast?'纠正并重新接话':'发送')+'</button>'+
   (d.editingLast?'<button type="button" class="btn ghost" data-oral="cancel-edit"'+(lockedNow?' disabled':'')+'>取消纠正</button>':'')+
   '<button class="btn" data-oral="feedback"'+(lockedNow||inCall||!d.turns.some(t=>t.role==='user')?' disabled':'')+'>解释我的表达</button>'+
   '<button class="btn ghost" data-oral="new"'+(lockedNow||inCall||!d.turns.length?' disabled':'')+'>新对话</button></div>'+
   (free?'':status)+(d.feedback?'<aside class="oral-feedback"><b>表达建议 · 请自行核对</b><p>'+esc(d.feedback)+'</p></aside>':'')+'</section>';
 }
 async function refreshDevices(){try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');notice=devices.length?'已找到 '+devices.length+' 个麦克风。':'暂无设备，接入麦克风后可刷新。';}catch(_){notice='无法获取设备列表，请检查麦克风权限。';}paint();}
 function stopCapture(){
  clearTimeout(timer);
  recording=false;
  starting=false;
  if(node){node.port.onmessage=null;node.disconnect();}
  node=null;
  stream?.getTracks().forEach(track=>track.stop());
  stream=null;
  const oldContext=context;
  context=null;
  oldContext?.close().catch(()=>{});
 }
 async function openCapture(token,onFrame,onEnd,enabled=true){
  let capture, audio, worklet;
  const current=()=>token===epoch&&state.view==='oral';
  try{
   capture=await navigator.mediaDevices.getUserMedia({video:false,audio:{
    deviceId:device?{exact:device}:undefined,channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true
   }});
   if(!current())return false;
   const track=capture.getAudioTracks()[0];
   track.enabled=enabled;
   audio=new AudioContext({sampleRate:16000});
   if(audio.sampleRate!==16000)throw Error('当前设备不支持 16kHz 收音，请更换麦克风。');
   await audio.audioWorklet.addModule(new URL('microphone-worklet.js',document.baseURI).href);
   if(!current())return false;
   worklet=new AudioWorkletNode(audio,'wordisle-microphone');
   worklet.port.onmessage=({data})=>{if(current())onFrame(data);};
   audio.createMediaStreamSource(capture).connect(worklet);
   worklet.connect(audio.destination);
   await audio.resume();
   if(!current())return false;
   stream=capture;
   context=audio;
   node=worklet;
   track.onended=()=>{if(current())onEnd();};
   return true;
  }finally{
   if(stream!==capture||!capture){
    worklet?.disconnect();
    capture?.getTracks().forEach(track=>track.stop());
    audio?.close().catch(()=>{});
   }
  }
 }
 function captureError(error){
  return error.name==='NotAllowedError'?'麦克风权限被拒绝，请在 Windows 设置中允许访问。':error.message||'麦克风暂时不可用。';
 }
 function pauseCall(active){
  active.listenToken++;
  markVoice(active,false);
  for(const track of stream?.getAudioTracks()||[])track.enabled=false;
  const detector=active.detector;
  active.detector=null;
  if(detector)active.vadTask=active.vadTask.then(()=>detector.flush()).catch(()=>{});
 }
 function markVoice(active,detected){
  if(active.voiceActive===detected)return;
  active.voiceActive=detected;
  if(call===active){
   const stage=document.querySelector('.oral-call');
   if(stage)stage.dataset.voiceActive=String(detected);
  }
 }
 function listenCall(active,message='通话中 · 你可以说话'){
  if(call!==active)return;
  markVoice(active,false);
  if(active.muted){
   active.phase='muted';
   notice='麦克风已静音';
   paint();
   return;
  }
  active.phase='connecting';
  notice='正在接通麦克风…';
  paint();
  const token=++active.listenToken;
  active.vadTask=active.vadTask.then(async()=>{
   const current=()=>call===active&&active.listenToken===token&&!active.muted;
   if(!current())return;
   const detector=await SpeechNeuralSegmenter.create(segment=>{
    if(current())handleCallTurn(active,segment.samples);
   },'call');
   if(!current()){
    await detector.flush().catch(()=>{});
    return;
   }
   active.detector=detector;
   for(const track of stream?.getAudioTracks()||[])track.enabled=true;
   active.phase='listening';
   notice=message;
   paint();
  }).catch(error=>{
   if(call===active&&active.listenToken===token)endCall(error.message||'人声检测暂时不可用。');
  });
 }
 function endCall(message='通话已结束'){
  if(!call)return;
  const active=call;
  call=null;
  epoch++;
  pauseCall(active);
  stopCapture();
  recognizing=false;
  oralStop();
  notice=message;
  paint();
 }
 async function startCall(){
  if(call||locked())return;
  if(speechBusy()){speechNotice('请先停止实时听译，再开始通话。');return;}
  if(!window.wordIsle?.vadStart){speechNotice('请在桌面版中使用语音通话。');return;}
  const beforeCheck=epoch;
  const model=await window.wordIsle.localModelStatus();
  if(epoch!==beforeCheck||call||locked()||state.view!=='oral')return;
  if(!model.available){speechNotice(model.error);return;}
  const active={phase:'connecting',muted:false,listenToken:0,detector:null,vadTask:Promise.resolve()};
  call=active;
  oralStop();
  const token=++epoch;
  starting=true;
  notice='正在连接麦克风…';
  window.wordIsle.warmOral?.().catch(()=>{});
  paint();
  try{
   const opened=await openCapture(token,frame=>{
    const detector=active.detector;
    if(call!==active||!detector)return;
    detector.push(frame).then(detected=>{
     if(call===active&&active.detector===detector)markVoice(active,detected);
    }).catch(error=>{
     if(call===active&&active.detector===detector)endCall(error.message||'人声检测失败。');
    });
   },()=>endCall('麦克风已断开，通话已结束。'),false);
   if(!opened||call!==active)return;
   starting=false;
   listenCall(active);
  }catch(error){
   if(call===active)endCall(captureError(error));
  }
 }
 function toggleMute(){
  if(!call||starting)return;
  const active=call;
  active.muted=!active.muted;
  if(['muted','listening','connecting'].includes(active.phase)){
   pauseCall(active);
   listenCall(active);
  }else paint();
 }
 async function handleCallTurn(active,samples){
  pauseCall(active);
  active.phase='recognizing';
  recognizing=true;
  notice='正在听清你说的话…';
  paint();
  let text;
  try{
   const result=await window.wordIsle.transcribe({samples,sampleRate:16000,smart:false,mode:'oral'});
   if(call!==active)return;
   if(!result?.ok)throw Error(result?.error||'语音识别未完成');
   text=result.text?.trim();
  }catch(error){
   if(call!==active)return;
   recognizing=false;
   listenCall(active,error.message||'识别未完成，请再说一次。');
   return;
  }
  recognizing=false;
  if(text)await send(text);
  else listenCall(active,'没有听清，请再说一次。');
 }
 function leave(){
  epoch++;
  cancelAnimationFrame(pickerRenderFrame);
  pickerRenderFrame=0;
  if(call){
   pauseCall(call);
   call=null;
  }
  stopCapture();
  chunks=[];
  recognizing=false;
  notice='';
  oralStop();
 }
 async function startRecording(){
  if(locked()||call)return;
  if(speechBusy()){speechNotice('请先停止实时听译，再开始口语对练。');return;}
  oralStop();
  const token=++epoch;
  starting=true;
  notice='正在打开麦克风…';
  paint();
  try{
   chunks=[];
   const opened=await openCapture(token,frame=>{if(recording)chunks.push(new Float32Array(frame));},finishRecording);
   if(!opened)return;
   recording=true;
   starting=false;
   notice='正在收音，说完后点“说完了，识别”。';
   timer=setTimeout(()=>{if(recording)finishRecording();},30000);
   refreshDevices();
  }catch(error){
   if(token!==epoch)return;
   stopCapture();
   notice=captureError(error);
   paint();
  }
 }
 async function finishRecording(){if(!recording)return;const token=epoch;stopCapture();const blocks=chunks;chunks=[];let length=blocks.reduce((n,a)=>n+a.length,0);if(length<1600){notice='没有录到足够声音，请再试一次。';paint();return;}const samples=new Float32Array(length);let offset=0;for(const b of blocks){samples.set(b,offset);offset+=b.length;}recognizing=true;notice='正在本机识别，请稍候…';paint();try{const r=await window.wordIsle.transcribe({samples,sampleRate:16000,smart:false,mode:'oral'});if(token!==epoch)return;if(!r?.ok)throw Error(r?.error||'识别未完成');if(!r.text?.trim())throw Error('没有听清楚，请重试或输入文字。');const d=data();d.draft=((d.draft||'').trim()+' '+r.text.trim()).trim().slice(0,1000);save();notice='识别完成，请检查并修改后发送。';}catch(e){if(token===epoch)notice=e.message||'识别未完成，请重试。';}finally{if(token===epoch){recognizing=false;paint();}}}
 function locked(){return busy||recording||starting||recognizing;}
 async function send(recognized){
  const active=call;
  const automatic=typeof recognized==='string';
  if(locked()||(!automatic&&active&&!['listening','muted'].includes(active.phase)))return;
  const d=data();
  const text=(automatic?recognized:(document.querySelector('#oralDraft')?.value??d.draft)).trim().slice(0,1000);
  if(!text){speechNotice('先说一句或输入一句英文。');return;}
  const [,role,opening]=scenarios[d.scene];
  const token=epoch;
  const turns=d.editingLast?d.turns.slice(0,-2):d.turns;
  if(!automatic){d.draft=text;save();}
  oralStop();
  if(active){pauseCall(active);active.phase='thinking';}
  busy=true;
  pendingTurn={text,epoch:token};
  notice='小屿正在想怎么接话…';
  paint();
  let answer;
  try{
   const reply=await window.wordIsle.localSource({
    kind:'oral',text,question:role,opening,turns,conversation:d.scene==='free',spoken:automatic
   });
   if(token!==epoch)return;
   if(!reply?.ok)throw Error(reply?.error||'暂时无法回复');
   answer=reply.text;
   d.turns=turns.concat({role:'user',text},{role:'teacher',text:answer}).slice(-40);
   d.editingLast=false;
   if(!automatic&&d.draft===text)d.draft='';
   d.feedback='';
   save();
   notice=active?'小屿正在接话…':'回复已生成。';
   if(active)active.phase='speaking';
  }catch(error){
   if(token===epoch){
    if(automatic){d.draft=[d.draft,text].filter(Boolean).join(' ').slice(0,1000);save();}
    notice=(error.message||'回复暂不可用')+'，你的话已经保留在输入框。';
   }
  }finally{
   pendingTurn=null;
   busy=false;
   paint();
  }
  if(active&&call===active){
   if(answer)oralSay(answer,()=>listenCall(active));
   else listenCall(active,notice);
  }else if(answer&&token===epoch)oralSay(answer);
 }
 async function feedback(){if(locked())return;const d=data(),last=[...d.turns].reverse().find(t=>t.role==='user');if(!last)return;busy=true;notice='正在整理表达建议…';paint();const token=epoch;try{const mistakes=window.WordIsleOralCorpus?.mistakes||[],m=mistakes.find(x=>last.text.toLowerCase().includes(String(x.learner_sentence||'').toLowerCase())&&x.learner_sentence);const extra=m?'\nOpen example: '+m.learner_sentence+' → '+m.corrected_sentence+'; '+m.explanation:'';const r=await window.wordIsle.localSource({kind:'practice',title:scenarios[d.scene][0],text:last.text,context:extra,question:scenarios[d.scene][1]});if(token!==epoch)return;if(!r?.ok)throw Error(r?.error||'反馈暂不可用');d.feedback=r.text;save();notice='建议已生成。';}catch(e){if(token===epoch)notice=e.message||'反馈暂不可用。';}finally{busy=false;if(state.view==='oral')paint();}}
 document.addEventListener('input',e=>{if(e.target.id==='oralDraft'){data().draft=e.target.value.slice(0,1000);save();}});
 document.addEventListener('change',e=>{
  if(e.target.id==='oralDevice')device=e.target.value;
  if(e.target.id==='oralVoice'){
   oralStop();
   const [id,label]=voiceChoices.find(([value])=>value===e.target.value)||voiceChoices[0];
   store.settings.oralVoice=id;
   speechNotice('老师声音已切换为'+label);
   save();
   warmVoice();
   if(call?.phase==='speaking')listenCall(call);
  }
  if(e.target.id==='oralVoiceSpeed'){
   oralStop();
   const speed=Number(e.target.value);
   store.settings.oralVoiceSpeed=[0.85,1,1.15].includes(speed)?speed:1;
   speechNotice('语速已更新');
   save();
   if(call?.phase==='speaking')listenCall(call);
  }
  if(e.target.id==='oralScene'&&scenarios[e.target.value]){
   const next=e.target.value;
   const current=data();
   if(next==='free'){
    store.privateDrafts.oralMode='free';
   }else{
    const previous=store.privateDrafts.oralCoach;
    if(previous?.scene!==next&&previous?.turns?.length&&!window.confirm('切换练习场景会开始新对话，当前场景记录将清空。继续吗？')){
     e.target.value=current.scene;
     return;
    }
    store.privateDrafts.oralMode='scenario';
    const scenario=data();
    if(scenario.scene!==next){
     scenario.scene=next;
     scenario.turns=[];
     scenario.feedback='';
     scenario.draft='';
    }
   }
   oralStop();
   save();
   notice='';
   paint();
  }
 });
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-oral]');
  if(!button||button.disabled)return;
  const action=button.dataset.oral,d=data();
  if(action==='call')startCall();
  if(action==='mute')toggleMute();
  if(action==='interrupt'&&call?.phase==='speaking'){oralStop();listenCall(call);}
  if(action==='hangup')endCall();
  if(action==='record')recording?finishRecording():startRecording();
  if(action==='devices')refreshDevices();
  if(action==='send')send();
  if(action==='edit-last'&&!d.draft&&!call&&!locked()&&d.turns.at(-2)?.role==='user'&&d.turns.at(-1)?.role==='teacher'){
   d.editingLast=true;
   d.draft=d.turns.at(-2).text.slice(0,1000);
   save();
   paint();
   document.getElementById('oralDraft')?.focus();
  }
  if(action==='cancel-edit'&&d.editingLast&&!locked()){
   d.editingLast=false;
   d.draft='';
   save();
   paint();
  }
  if(action==='feedback')feedback();
  if(action==='speak-opening')oralSay(scenarios[d.scene][2]);
  if(action==='preview-voice')oralSay(voicePreview);
  if(action==='speak')oralSay(d.turns[Number(button.dataset.i)]?.text||'');
  if(action==='new'&&window.confirm('开始新对话并清空当前对话？')){
   oralStop();
   d.turns=[];d.feedback='';d.draft='';d.editingLast=false;save();notice='';paint();
  }
 });
 window.addEventListener('beforeunload',leave);
 return {view,leave,deferDuringPicker};
})();
