(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordIsleVersion=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // 兼容旧清单的 1—4 段数字，同时区分预发布版与正式版；构建标记不参与排序。
  function parse(input){
    const text=String(input??'').trim();if(!text||text.length>96)return null;
    const m=/^(\d+(?:\.\d+){0,3})(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(text);
    if(!m)return null;const core=m[1].split('.').map(Number);if(core.some(n=>!Number.isSafeInteger(n)))return null;
    return {text,core,pre:m[2]?m[2].split('.'):[]};
  }
  function compare(a,b){
    const left=parse(a),right=parse(b);if(!left||!right)return null;
    for(let i=0;i<Math.max(left.core.length,right.core.length);i++){const d=(left.core[i]||0)-(right.core[i]||0);if(d)return d>0?1:-1;}
    if(!left.pre.length||!right.pre.length)return left.pre.length===right.pre.length?0:left.pre.length?-1:1;
    for(let i=0;i<Math.max(left.pre.length,right.pre.length);i++){
      const x=left.pre[i],y=right.pre[i];if(x===y)continue;if(x===undefined)return -1;if(y===undefined)return 1;
      const nx=/^\d+$/.test(x),ny=/^\d+$/.test(y);if(nx&&ny){const bx=BigInt(x),by=BigInt(y);if(bx!==by)return bx>by?1:-1;continue;}if(nx!==ny)return nx?-1:1;return x>y?1:-1;
    }return 0;
  }
  return {parse,compare};
});
