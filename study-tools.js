'use strict';

const StudyTools = (() => {
  let playback = 0;
  let breakTimer = 0;
  const refreshed = new Map();

  function details(word) {
    const result = refreshed.get(word.key);
    const senses = String(word.m || '').split(/[；;\n]+/).map(sense => sense.trim()).filter(Boolean);
    return '<aside class="panel study-word-details"><h3>释义与例句</h3>'+
      WordReference.notesHtml(word)+
      (senses.length ? '<p><b>核心释义</b> '+esc(senses[0])+'</p>' : '')+
      (word.expanded||senses.length>1 ? '<p><b>拓展释义</b> '+esc(word.expanded||senses.slice(1).join('；'))+'</p>' : '')+
      (typeOf()==='card'?'':WordReference.pronunciationHtml(word,true))+
      (word.forms||window.WordIsleForms?.[word.w.toLowerCase()] ? '<p><b>词形</b> '+esc(word.forms||window.WordIsleForms[word.w.toLowerCase()])+'</p>' : '')+
      (word.e ? '<p class="muted">词库原有例句</p><p lang="en">'+esc(word.e)+'</p><p>'+esc(word.t||'')+'</p>' : '')+
      '<div class="btn-row"><button class="btn small" data-study-tool="loop">循环朗读</button><button class="btn small" data-study-tool="shadow">跟读</button>'+
      '<button class="btn small ghost" data-study-tool="stop">停止朗读</button></div><p id="studyAudioStatus" role="status"></p>'+
      (word.e||WordReference.senses(word) ? '<div class="btn-row"><button class="btn small" data-study-tool="translate"'+(result?.busy?' disabled':'')+'>翻译例句</button></div>' : '')+
      (result?.text ? '<p><b>AI 例句译文</b> '+esc(result.text)+'</p>' : '')+'</aside>';
  }

  function stop() {
    playback++;
  }

  function startSpeech(text, mode) {
    stopSpeak();
    const turn = ++playback;
    const update = message => { const status = document.getElementById('studyAudioStatus');if(status)status.textContent=message; };
    const play = () => {
      if(turn!==playback||state.view!=='study')return;
      update('正在朗读…');
      const rate=clamp(Number(store.settings.ttsRate)||1,.5,2);
      const finish=()=>{
        if(turn!==playback)return;
        if(mode==='loop')setTimeout(play,800);
        else update('轮到你了。跟读完可再点一次。');
      };
      playAudioFrom(localVoiceSource(text,rate),rate,{
        still:()=>turn===playback,
        ended:finish,
        failed:()=>{if(turn===playback){stop();update('这句暂时无法合成，请试试单词发音。');}}
      });
    };
    play();
  }

  function reportText() {
    const daily=store.days[dayKey()]||{};
    const total=(daily.ok||0)+(daily.bad||0);
    return [dayKey()+' 词屿学习报告','新词 '+(daily.new||0)+' 个','复习 '+(daily.review||0)+' 次','答对 '+(daily.ok||0)+' 次','正确率 '+(total?Math.round((daily.ok||0)/total*100)+'%':'暂无答题')].join('\n');
  }
  function reportHtml() {
    const tracked = memoryTrackedWords();
    const bins = Array(WordIsleCurve.days.length+2).fill(0);
    for(const word of tracked){const status=stOf(word.key);if(status&&status.s!=='new')bins[WordIsleCurve.stageOf(status)+1]++;}
    const labels=['短期补练',...WordIsleCurve.labels,'已完成周期'];
    const max=Math.max(1,...bins);
    const weak=memoryWeakWords().slice().sort((a,b)=>(stOf(b.key)?.lapses||0)-(stOf(a.key)?.lapses||0)).slice(0,50);
    return '<section class="panel study-report"><h3>今日学习报告</h3><p>'+esc(reportText()).replace(/\n/g,' · ')+'</p>'+
      '<button class="btn small" data-study-tool="report">导出今日报告 TXT</button><h3>间隔复习进度</h3>'+
      bins.map((count,index)=>'<div class="study-stage"><span>'+labels[index]+'</span><meter min="0" max="'+max+'" value="'+count+'"></meter><b>'+count+'</b></div>').join('')+
      '<details><summary>薄弱词排行 · '+weak.length+' 词</summary><ol>'+
      weak.map(word=>'<li>'+esc(word.w)+' · '+esc(word.m)+'</li>').join('')+'</ol></details></section>';
  }

  function download(name,text) {
    const link=document.createElement('a');
    link.href=URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'}));
    link.download=name;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),2000);
  }

  function settingsHtml() {
    const settings=store.settings;
    return '<section class="panel"><h3>运行模式</h3><div class="form">'+
      '<label class="field"><span>联网增强</span><input type="checkbox" data-set="networkEnhanced"'+(settings.networkEnhanced?' checked':'')+'></label>'+
      '<p class="muted">开启后可更新订阅、同步词库和调用自行配置的 API。离线模式内置语音和英译中。</p>'+
      (settings.networkEnhanced?'<form id="syncVocabulary"><label>HTTPS 词库地址 <input name="address" type="url" required placeholder="https://…/words.json"></label><button class="btn" type="submit">同步词库</button></form>':'')+
      '<label class="field"><span>夜间护眼</span><input type="checkbox" data-set="desktopNight"'+(settings.desktopNight?' checked':'')+'></label>'+
      '<label class="field"><span>连续学习上限（分钟，0 为关闭）</span><input type="number" min="0" max="120" data-set="studyLimit" value="'+(Number(settings.studyLimit)||0)+'"></label>'+
      '<p class="muted">F11 切换全屏。自动加密备份保存在本机用户目录的 backups 文件夹。</p></div></section>';
  }

  function libraryActions() {
    return '<details class="panel"><summary>新建个人词库</summary><form id="newVocabulary" class="form">'+
      '<label>名称 <input name="name" required maxlength="40"></label>'+
      '<label>单词表 <textarea name="words" required rows="4" placeholder="每行：单词,释义"></textarea></label>'+
      '<button class="btn" type="submit">创建词库</button></form></details>';
  }

  function limit(view) {
    clearTimeout(breakTimer);
    const minutes=Number(store.settings.studyLimit);
    if(view==='study'&&Number.isFinite(minutes)&&minutes>0){
      breakTimer=setTimeout(()=>{if(state.view==='study'){ProductFlow.pause();toast('已到学习时长上限，本轮进度已暂存。');}},Math.min(120,minutes)*60000);
    }
  }

  let syncPending=false;
  document.addEventListener('submit',async event=>{
    if(!['newVocabulary','syncVocabulary'].includes(event.target.id))return;
    event.preventDefault();
    const fields=new FormData(event.target);
    try{
      if(event.target.id==='newVocabulary'){
        addCustomDeck(fields.get('name'),parseDelimited(String(fields.get('words')||'')));
        return;
      }
      if(syncPending)return;
      syncPending=true;
      const button=event.target.querySelector('button');
      button.disabled=true;
      try{
        const result=await window.wordIsle.syncVocabulary(fields.get('address'));
        if(!result.ok)throw Error(result.error);
        if(store.settings.networkEnhanced)addCustomDeck(result.name||'同步词库',result.words,result.address);
      }finally{syncPending=false;button.disabled=false;}
    }catch(error){toast(error.message);}
  });

  let hoverRequest=0;
  document.addEventListener('pointerover',event=>{
    const token=event.target.closest?.('.rd-w');
    if(!token||token.title)return;
    const read=++hoverRequest;
    const word=token.dataset.w||token.textContent;
    const set=()=>{if(token.isConnected&&read===hoverRequest){const entry=lookupWord(word);if(entry?.m)token.title=entry.m.slice(0,180);}};
    if(lookupWord(word))set();
    else ensureExtended(dictPart(word)).then(set).catch(()=>{});
  });

  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-study-tool]');
    if(!button)return;
    const action=button.dataset.studyTool;
    if(action==='report'){download('词屿学习报告-'+dayKey()+'.txt',reportText());return;}
    if(action==='notes'){
      const notes=memoryTrackedWords().map(word=>[word,stOf(word.key)?.mnemonic]).filter(([,note])=>note);
      download('词屿单词笔记-'+dayKey()+'.txt',notes.map(([word,note])=>word.w+'\t'+word.m+'\n'+note).join('\n\n'));
      return;
    }
    if(action==='stop'){stopSpeak();return;}
    const word=currentWord();
    if(!word)return;
    const example=word.e||WordReference.senses(word)?.[2];
    if(action==='loop'||action==='shadow'){startSpeech(example||word.w,action);return;}
    if(action==='translate'){
      if(!example)return;
      refreshed.set(word.key,{busy:true});
      render();
      try{
        const result=await window.wordIsle.localSource({kind:'translate',text:example});
        if(!result.ok)throw Error(result.error);
        refreshed.set(word.key,{text:result.text});
      }catch(error){refreshed.delete(word.key);toast(error.message||'翻译暂不可用');}
      if(state.view==='study'&&currentWord()?.key===word.key)render();
    }
  });

  return {details,reportHtml,settingsHtml,libraryActions,limit,stop};
})();
