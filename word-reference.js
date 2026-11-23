'use strict';

const WordReference = (() => {
  const exams = {
    cet4:['四级','https://cet.neea.edu.cn/xhtml1/folder/16113/1588-1.htm'],
    cet6:['六级','https://cet.neea.edu.cn/xhtml1/folder/16113/1588-1.htm'],
    ky:['考研','https://yankao.neea.edu.cn/html1/category/1509/6235-1.htm'],
    ielts:['雅思','https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test'],
    toefl:['托福','https://www.ets.org/toefl/test-takers/ibt/prepare.html'],
    gre:['GRE','https://www.ets.org/gre/test-takers/general-test/prepare.html']
  };
  const dictionarySource = 'https://github.com/hexgrad/misaki/blob/main/EN_PHONES.md';
  const provenance = {g:'Misaki Gold 词典',s:'Misaki Silver 词典',a:'规则生成 · 待审',u:'个人词库'};
  let indexedPacks, examplesByWord;
  let editingPacks=false, visibleWord='', visibleExamples=20;
  const text = (value, limit) => typeof value==='string'&&value.trim().length<=limit ? value.trim() : '';
  const key = value => value.normalize('NFKC').toLowerCase().trim();

  function validatePack(value) {
    if(value?.format!=='wordisle-exam-examples'||value.version!==1)throw Error('例句包格式应为 wordisle-exam-examples，版本 1');
    const permission = {
      holder:text(value.permission?.holder,120),
      reference:text(value.permission?.reference,250),
      scope:text(value.permission?.scope,500)
    };
    if(Object.values(permission).some(part=>!part))throw Error('请注明权利人、授权凭据及允许使用的范围');
    if(!Array.isArray(value.examples)||!value.examples.length||value.examples.length>2000)throw Error('每个例句包需有 1–2000 条例句');
    const examples=value.examples.map((entry,index)=>{
      const example={
        exam:text(entry?.exam,20), word:text(entry?.word,120), sentence:text(entry?.sentence,1200),
        translation:text(entry?.translation,1200), paper:text(entry?.paper,180), location:text(entry?.location,120)
      };
      if(!Object.hasOwn(exams,example.exam)||![example.word,example.sentence,example.paper,example.location].every(Boolean)){
        throw Error('第 '+(index+1)+' 条缺少考试、词头、英文句子、试卷或题号');
      }
      return example;
    });
    const seen = new Set();
    return {format:'wordisle-exam-examples',version:1,permission,examples:examples.filter(example=>{
      const id=JSON.stringify([example.exam,key(example.word),example.paper,example.location,example.sentence]);
      if(seen.has(id))return false;
      seen.add(id);
      return true;
    })};
  }

  function validatePacks(input) {
    if(!Array.isArray(input))return [];
    const packs=[];
    for(const candidate of input.slice(0,5)){
      try{packs.push(validatePack(candidate));}catch(_){}
    }
    return packs;
  }

  function pronunciation(word) {
    const id=key(word.w);
    const pair=window.WordIslePronunciation?.[id];
    if(!Array.isArray(pair)&&!word.uk&&!word.us)return null;
    return {
      gb:word.uk||(pair?.[0]?'/'+pair[0]+'/':''), us:word.us||(pair?.[1]?'/'+pair[1]+'/':''),
      gbSource:word.uk?'u':pair?.[2], usSource:word.us?'u':pair?.[3]
    };
  }

  function pronunciationHtml(word, listen=false) {
    const pair=pronunciation(word);
    if(!pair)return word.p?'<div class="phon">'+esc(word.p)+'</div>':'';
    const item=(label,accent,value,source)=>source&&value?'<span><b>'+label+'</b> '+esc(value)+
      '<small title="'+esc(provenance[source]||'')+'">'+(source==='a'?'规则生成':'')+'</small>'+
      (listen?'<button type="button" class="btn small ghost" data-word-accent="'+accent+'" data-word-text="'+esc(word.w)+'" aria-label="试听'+label+'音">试听</button>':'')+
      '</span>':'';
    return '<div class="word-reference-ipa phon">'+item('英','gb',pair.gb,pair.gbSource)+item('美','us',pair.us,pair.usSource)+'</div>';
  }

  function exampleEntries(word) {
    const packs=store.examExamplePacks||[];
    if(packs!==indexedPacks){
      indexedPacks=packs;
      examplesByWord=new Map();
      for(const pack of packs)for(const example of pack.examples){
        const id=key(example.word);
        if(!examplesByWord.has(id))examplesByWord.set(id,[]);
        examplesByWord.get(id).push({example,permission:pack.permission});
      }
    }
    return examplesByWord.get(key(word.w))||[];
  }

  function exampleHtml(word) {
    const matches=exampleEntries(word);
    if(!matches.length)return '';
    const display=visibleWord===key(word.w)?visibleExamples:20;
    return '<details class="word-reference-examples" id="wordReferenceExamples"><summary>已导入的真题例句 · '+matches.length+' 条</summary>'+
      matches.slice(0,display).map(({example,permission})=>'<div><p lang="en">'+esc(example.sentence)+'</p>'+
        (example.translation?'<p>'+esc(example.translation)+'</p>':'')+
        '<small>'+esc(exams[example.exam][0]+' · '+example.paper+' · '+example.location)+'</small>'+
        '<p><small>'+esc('授权记录（用户提供） · '+permission.holder+' · '+permission.reference+' · '+permission.scope)+'</small></p></div>').join('')+
      (matches.length>display?'<button type="button" class="btn small" data-example-more="'+esc(word.w)+'">再看 '+Math.min(20,matches.length-display)+' 条</button>':'')+'</details>';
  }

  function senses(word) {
    const entry=window.WordIsleSenseNotes?.[key(word.w)];
    return Array.isArray(entry)?entry:null;
  }

  function notesHtml(word) {
    const note=senses(word);
    const id=key(word.w);
    const variants=window.WordIslePronunciationVariants?.[id];
    const evidence=window.WordIsleExamEvidence?.[id];
    const tags=Array.isArray(evidence?.[0])?evidence[0].map(id=>exams[id]?.[0]).filter(Boolean):[];
    return (note?'<div class="word-reference-note"><p><b>备考义项</b> '+esc(note[0])+'</p>'+
      '<p><b>搭配辨析</b> '+esc(note[1])+'</p><small>词屿原创练习例句</small>'+
      '<p lang="en">'+esc(note[2])+'</p><p>'+esc(note[3])+'</p></div>':'')+
      (Array.isArray(variants)?'<details class="word-reference-note"><summary>同形异音 · 按词性区分</summary>'+
      variants.map(([label,gb,us])=>'<p><b>'+esc(label)+'</b><br>英 /'+esc(gb)+'/ · 美 /'+esc(us)+'/</p>').join('')+'</details>':'')+
      (tags.length?'<p class="muted">ECDICT 词头标签 · '+esc(tags.join('、'))+'</p>':'')+
      exampleHtml(word);
  }

  function libraryHtml() {
    const packs=store.examExamplePacks||[];
    const count=packs.reduce((sum,pack)=>sum+pack.examples.length,0);
    return '<details class="panel" id="examReferenceLibrary"><summary>备考资料与授权例句</summary><div class="form">'+
      '<div class="btn-row">'+Object.values(exams).map(([name,url])=>'<a class="btn small" href="'+esc(url)+'" target="_blank" rel="noopener">'+name+'官方资料 ↗</a>').join('')+'</div>'+
      '<p class="muted">42 本内置词书提供英美音标。未匹配到词典的音标标为「规则生成」。 <a href="'+dictionarySource+'" target="_blank" rel="noopener">音标来源 ↗</a></p>'+
      '<p class="muted">已导入 '+count+' 条真题例句。持有许可时，可把例句、试卷题号和授权记录一起导入，仅保存到当前账号。</p>'+
      '<label>导入授权例句 JSON <input type="file" id="examExampleFile" accept=".json,application/json"></label>'+
      (packs.length?'<ul class="exam-pack-list">'+packs.map((pack,index)=>'<li><div><b>'+esc(pack.permission.holder)+'</b><small>'+esc(pack.permission.reference)+' · '+pack.examples.length+' 条</small></div>'+
        '<button type="button" class="btn small ghost" data-example-remove="'+index+'">移除这份例句包</button></li>').join('')+'</ul>':'')+'</div></details>';
  }

  async function savePacks(next) {
    const owner=store;
    const previous=owner.examExamplePacks;
    owner.examExamplePacks=next;
    try{
      if(await flushSave()!==true)throw Error('例句资料未能保存');
    }catch(error){owner.examExamplePacks=previous;throw error;}
    if(store===owner&&state.view==='decks')render();
  }

  async function handleImport(event){
    if(event.target.id!=='examExampleFile')return;
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(editingPacks){toast('例句包正在保存，请稍后重试');return;}
    editingPacks=true;
    const profile=AccountSession.profile?.id;
    const owner=store;
    try{
      if(file.size>2*1024*1024)throw Error('例句包不能超过 2 MB');
      const source=(await file.text()).replace(/^\uFEFF/,'');
      let parsed;
      try{parsed=JSON.parse(source);}catch(_){throw Error('JSON 格式无效，请检查文件内容');}
      const pack=validatePack(parsed);
      if(!profile||AccountSession.profile?.id!==profile||store!==owner)return;
      const current=store.examExamplePacks||[];
      const index=current.findIndex(item=>item.permission.holder===pack.permission.holder&&item.permission.reference===pack.permission.reference);
      if(index<0&&current.length>=5)throw Error('每个账号最多保存 5 个授权例句包');
      if(index>=0&&!window.confirm('用新文件替换此前同一授权凭据的例句包？'))return;
      await savePacks(index<0?[...current,pack]:current.map((item,i)=>i===index?pack:item));
      toast('已导入 '+pack.examples.length+' 条例句');
    }catch(error){toast('例句导入失败：'+error.message);}
    finally{editingPacks=false;}
  }

  async function handleClick(event){
    const button=event.target.closest?.('[data-word-accent],[data-example-more],[data-example-remove]');
    if(!button)return;
    if(button.dataset.wordAccent){
      const accent=button.dataset.wordAccent;
      if(!['gb','us'].includes(accent))return;
      stopSpeak();
      const token=speakToken;
      const speed=clamp(Number(store.settings.ttsRate)||1,.5,2);
      const label=accent==='gb'?'英音':'美音';
      playAudioFrom(localVoiceSource(button.dataset.wordText,speed,accent),speed,{
        still:()=>token===speakToken,
        failed:()=>toast('这个词暂时无法合成'+label)
      });
      return;
    }
    if(button.dataset.exampleMore){
      const word=key(button.dataset.exampleMore);
      visibleExamples=(visibleWord===word?visibleExamples:20)+20;
      visibleWord=word;
      render();
      const list=document.querySelector('#wordReferenceExamples');
      if(list){
        list.open=true;
        (list.querySelector('[data-example-more]')||list.querySelector('summary'))?.focus({preventScroll:true});
      }
      return;
    }
    if(editingPacks){toast('例句包正在保存，请稍后重试');return;}
    const index=Number(button.dataset.exampleRemove);
    const current=store.examExamplePacks||[];
    const pack=current[index];
    if(!pack||!window.confirm('移除授权记录「'+pack.permission.reference+'」及其中 '+pack.examples.length+' 条例句？'))return;
    editingPacks=true;
    try{await savePacks(current.filter((_,i)=>i!==index));toast('已移除例句包');}
    catch(error){toast(error.message);}
    finally{editingPacks=false;}
  }

  if(typeof document!=='undefined'){
    document.addEventListener('change',handleImport);
    document.addEventListener('click',handleClick);
  }

  return { validatePack,validatePacks,pronunciation,pronunciationHtml,senses,notesHtml,libraryHtml };
})();
if(typeof module==='object'&&module.exports)module.exports=WordReference;
