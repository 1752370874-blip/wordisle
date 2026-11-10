(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordIsleCurve=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // 规则型间隔复习：体现遗忘曲线的前密后疏规律，不把固定间隔声称为个人记忆概率。
  const minutes=[5,30,720,1440,2880,5760,10080,21600,43200,86400,129600];
  const labels=['5分钟','30分钟','12小时','1天','2天','4天','7天','15天','30天','60天','90天'];
  const MIN=60000,DAY=86400000;
  function stageOf(st){
    if(st?.curve?.version===1&&Number.isInteger(st.curve.stage)&&st.curve.stage>=-1&&st.curve.stage<minutes.length)return st.curve.stage;
    if(!st||st.s==='new'||st.s==='learning')return -1;
    const interval=Math.max(0,Number(st.iv)||0)*1440;let stage=-1;
    for(let i=0;i<minutes.length;i++)if(minutes[i]<=interval)stage=i;
    return stage;
  }
  function plan(st,verdict,now=Date.now()){
    st=st||{};const current=stageOf(st),due=Number(st.due)||0;
    let stage=current,next=due;
    if(verdict==='again'){stage=-1;next=now+5*MIN;}
    else if(verdict==='hard'){stage=Math.max(-1,current-1);next=now+10*MIN;}
    else if(st.s==='new'||!due||due<=now){stage=Math.min(minutes.length-1,current+1);next=now+minutes[Math.max(0,stage)]*MIN;}
    // 提前练习只留作练习证据，既不推进阶段，也不把已安排的到期时间推迟。
    const hold=verdict==='good'&&due>now&&st.s!=='new';
    const interval=hold&&Number(st.iv)>0?Number(st.iv):(verdict==='again'?5:verdict==='hard'?10:minutes[Math.max(0,stage)])/1440;
    const state=hold?st.s||'learning':stage<3?'learning':stage<8?'review':'mastered';
    return {curve:{version:1,stage,lastAdvance:hold?(st.curve?.lastAdvance||st.last||now):now},due:next,iv:interval,s:state,...(verdict!=='good'?{chopped:false}:{})};
  }
  return {minutes,labels,stageOf,plan};
});
