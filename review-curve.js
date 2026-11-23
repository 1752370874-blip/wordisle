(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordIsleCurve=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // 规则型间隔复习：体现遗忘曲线的前密后疏规律，不把固定间隔声称为个人记忆概率。
  const days=[1,2,4,7,15];
  const minutes=days.map(day=>day*1440);
  const labels=days.map(day=>'第 '+day+' 天');
  const MIN=60000,DAY=86400000;
  function stageOf(st){
    if(st?.curve?.version===2&&Number.isInteger(st.curve.stage)&&st.curve.stage>=-1&&st.curve.stage<=days.length)return st.curve.stage;
    if(st?.curve?.version===1)return Math.min(days.length,Math.max(-1,(Number(st.curve.stage)||0)-3));
    if(!st||st.s==='new'||st.s==='learning')return -1;
    const interval=Math.max(0,Number(st.iv)||0)*1440;let stage=-1;
    for(let i=0;i<minutes.length;i++)if(minutes[i]<=interval)stage=i;
    return stage;
  }
  function plan(st,verdict,now=Date.now()){
    st=st||{};const current=stageOf(st),due=Number(st.due)||0;
    let stage=current,next=due;
    let anchor=st.curve?.version===2&&Number.isFinite(st.curve.anchor)?st.curve.anchor:now;
    if(verdict==='again'){stage=-1;anchor=now;next=now+5*MIN;}
    else if(verdict==='hard'){stage=Math.max(-1,current-1);anchor=now;next=now+10*MIN;}
    else if(st.s==='new'||!due||due<=now){
      stage=Math.min(days.length,current+1);
      const gap=stage===days.length?30:days[stage]-(days[stage-1]||0);
      if(stage<1||st.curve?.version!==2||anchor+days[stage]*DAY<=now)anchor=now-(days[stage-1]||0)*DAY;
      next=stage===days.length?now+gap*DAY:anchor+days[stage]*DAY;
    }
    // 提前练习只留作练习证据，既不推进阶段，也不把已安排的到期时间推迟。
    const hold=verdict==='good'&&due>now&&st.s!=='new';
    const interval=hold&&Number(st.iv)>0?Number(st.iv):Math.max(0,next-now)/DAY;
    const state=hold?st.s||'learning':stage<1?'learning':stage<days.length?'review':'mastered';
    const curve=hold&&st.curve?.version===1?st.curve:{version:2,stage,anchor,lastAdvance:hold?(st.curve?.lastAdvance||st.last||now):now};
    return {curve,due:next,iv:interval,s:state,...(verdict!=='good'?{chopped:false}:{})};
  }
  return {days,minutes,labels,stageOf,plan};
});
