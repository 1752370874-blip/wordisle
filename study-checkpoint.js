'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordIsleCheckpoint=api;})(globalThis,()=>{
  const modes=new Set(['card','choice','cloze','spell','dictation','mixed','reverse','listenChoice']),verdicts=new Set(['good','hard','again']);
  const number=(v,max=10000)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
  const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
  function encode(s,draft,filter){if(!s||!Array.isArray(s.words)||s.idx>=s.words.length||s.words.length>180)return null;return {v:1,at:Date.now(),id:text(s.productId,100),startedAt:s.startedAt||Date.now(),mode:s.mode,keys:s.words.map(w=>w.key),idx:s.idx,correct:s.correct,total:s.total,newCount:s.newCount,reviewCount:s.reviewCount,revealed:s.revealed,answered:s.answered,typed:typeof draft==='string'?draft:s.typed,choice:s.choice,feedback:s.feedback,requeued:s.requeued,types:s.types,memory:s.memory?{...s.memory,words:s.memory.words.map(w=>w.key)}:null,memoryHint:s.memoryHint,memoryFocus:s.memoryFocus,filter,youthCombo:s.youthCombo};}
  function decode(raw,catalog){
    if(!raw||raw.v!==1||!Array.isArray(raw.keys)||!raw.keys.length||raw.keys.length>180||!modes.has(raw.mode)||!Number.isInteger(raw.idx)||raw.idx<0||raw.idx>=raw.keys.length)return null;
    if(raw.keys.some(k=>typeof k!=='string'||!catalog.has(k)))return null;
    const s={productId:text(raw.id,100),startedAt:number(raw.startedAt,1e14),mode:raw.mode,words:raw.keys.map(k=>catalog.get(k)),idx:raw.idx,correct:number(raw.correct),total:number(raw.total),newCount:number(raw.newCount),reviewCount:number(raw.reviewCount),revealed:raw.revealed===true,answered:raw.answered===true,typed:text(raw.typed,500),choice:null,feedback:null,requeued:Object.create(null),spokeTag:'',types:null,memory:null,memoryHint:raw.memoryHint===true,memoryFocus:raw.memoryFocus===true,youthCombo:number(raw.youthCombo),filter:['all','meaning','spelling','listening'].includes(raw.filter)?raw.filter:'all'};
    if(raw.types!==null&&raw.types!==undefined){if(!Array.isArray(raw.types)||raw.types.length!==raw.keys.length||raw.types.some(t=>!modes.has(t)||t==='mixed'))return null;s.types=raw.types.slice();}
    for(const k of new Set(raw.keys))if(raw.requeued?.[k])s.requeued[k]=1;
    if(raw.choice){const c=raw.choice;if(!['en2zh','zh2en'].includes(c.dir)||!Array.isArray(c.options)||c.options.length<2||c.options.length>4||c.options.some(o=>!o||typeof o.text!=='string'||typeof o.ok!=='boolean')||c.options.filter(o=>o.ok===true).length!==1)return null;s.choice={dir:c.dir,options:c.options.map(o=>({text:text(o.text,2000),ok:o.ok===true})),answered:c.answered===true,picked:Number.isInteger(c.picked)&&c.picked>=0&&c.picked<c.options.length?c.picked:-1,correct:c.correct===true};}
    if(raw.feedback)s.feedback={ok:raw.feedback.ok===true,expected:text(raw.feedback.expected,500),typed:text(raw.feedback.typed,500)};
    if(raw.memory){const m=raw.memory;if(!Array.isArray(m.words)||!m.words.length||m.words.length>5||m.words.some(k=>!raw.keys.includes(k))||m.baseLength!==m.words.length*3||!s.types)return null;
      const loop={words:m.words.map(k=>catalog.get(k)),results:Object.create(null),committed:Object.create(null),retries:Object.create(null),baseLength:m.baseLength};
      for(const k of m.words){const r=m.results?.[k];if(r)loop.results[k]={self:verdicts.has(r.self)?r.self:null,checks:(Array.isArray(r.checks)?r.checks:[]).slice(0,10).filter(c=>c&&modes.has(c.type)&&verdicts.has(c.verdict)).map(c=>({type:c.type,verdict:c.verdict,hint:c.hint===true}))};if(verdicts.has(m.committed?.[k]))loop.committed[k]=m.committed[k];if(m.retries?.[k]===true)loop.retries[k]=true;}
      s.memory=loop;
    }
    return s;
  }
  return {encode,decode};
});
