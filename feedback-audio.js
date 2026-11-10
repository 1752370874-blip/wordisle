'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.WordIsleFeedbackAudio=api;root.FeedbackSound=api.create(()=>store.settings);}})(globalThis,()=>{
  // A small, original major-key motif. Varied touch and overlapping decays make
  // each cue feel like a played instrument; a wrong answer gets a soft resolve.
  const cues={correct:[{frequency:523.25,at:0,duration:.32,touch:.8},{frequency:659.25,at:.09,duration:.35,touch:.72},{frequency:783.99,at:.19,duration:.39,touch:.75},{frequency:1046.5,at:.315,duration:.4,touch:.42}],wrong:[{frequency:659.25,at:0,duration:.34,touch:.62},{frequency:587.33,at:.15,duration:.32,touch:.5},{frequency:523.25,at:.31,duration:.4,touch:.5}]};
  function schedule(context,kind,volume=0.35){
    if(!cues[kind])return [];const start=context.currentTime+.008,nodes=[],level=.19*Math.max(0,Math.min(1,volume));
    for(const note of cues[kind])for(const [ratio,weight,decay,detune] of [[1,1,1,-1.4],[2,.23,.65,1.8],[3,.065,.4,-.8]]){
      const oscillator=context.createOscillator(),gain=context.createGain(),at=start+note.at,duration=note.duration*decay,peak=level*note.touch*weight;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(note.frequency*ratio,at);oscillator.detune.setValueAtTime(detune,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.013);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*.5),at+.08*decay);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};nodes.push({oscillator,gain});
    }
    return nodes;
  }
  function create(getSettings,ContextClass){let context=null,nodes=[],generation=0,lastCue=null,reason='';
    function stop(){generation++;for(const n of nodes){try{n.gain.gain.cancelScheduledValues(context.currentTime);n.gain.gain.setTargetAtTime(.0001,context.currentTime,.005);n.oscillator.stop(context.currentTime+.025);}catch(_){}}nodes=[];}
    function allowed(){const s=getSettings();return s.answerSounds!==false&&!s.youthQuiet&&Number(s.answerSoundVolume??.35)>0;}
    async function play(kind){if(!cues[kind]||!allowed()){reason='muted';return false;}stop();const token=generation;
      try{const C=ContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;if(!C){reason='unsupported';return false;}if(!context||context.state==='closed')context=new C({latencyHint:'interactive'});if(context.state==='suspended')await context.resume();if(token!==generation||!allowed()||context.state!=='running')return false;const volume=Math.max(0,Math.min(1,Number(getSettings().answerSoundVolume??.35)||0));nodes=schedule(context,kind,volume);lastCue={kind,volume,at:Date.now()};reason='';return true;}catch(_){reason='unavailable';return false;}}
    function sync(){if(!allowed())stop();}
    function close(){stop();const c=context;context=null;if(c&&c.state!=='closed')c.close().catch(()=>{});}
    return {play,stop,sync,close,get lastCue(){return lastCue;},get reason(){return reason;},get state(){return context?.state||'idle';}};
  }
  return {create,schedule,cues};
});
