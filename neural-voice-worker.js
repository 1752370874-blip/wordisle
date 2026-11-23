'use strict';
const {parentPort}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path');
const sherpa=require('./speech-runtime/node_modules/sherpa-onnx-node');
const {cleanFemaleVoice}=require('./neural-voice-cleanup');
const dir=path.join(__dirname,'models','kokoro-english');const engines=new Map();
const {findModelDirectory}=require('./model-paths');
let pocket,reference;
function initialize(voice){
 const accent=voice===21?'gb':'us';
 if(engines.has(accent))return engines.get(accent);
 const lexicon=path.join(dir,'lexicon-'+accent+'-en.txt');
 const words=new Set(fs.readFileSync(lexicon,'utf8').split('\n').map(line=>line.slice(0,line.indexOf(' '))).filter(Boolean));
 const engine=new sherpa.OfflineTts({model:{kokoro:{model:path.join(dir,'model.int8.onnx'),voices:path.join(dir,'voices.bin'),tokens:path.join(dir,'tokens.txt'),lexicon},numThreads:3,debug:false,provider:'cpu'},maxNumSentences:1});
 const ready={engine,words};engines.set(accent,ready);return ready;
}
function initializePocket(){
 if(pocket)return;
 const files={lmFlow:'lm_flow.onnx',lmMain:'lm_main.int8.onnx',encoder:'encoder.onnx',decoder:'decoder.onnx',
  textConditioner:'text_conditioner.onnx',vocabJson:'vocab.json',tokenScoresJson:'token_scores.json'};
 const pocketDir=findModelDirectory(__dirname,[...Object.values(files),'alba-casual.wav'],'pocket-english');
 if(!pocketDir)throw Error('Alba 语音包文件不完整');
 const model=Object.fromEntries(Object.entries(files).map(([key,name])=>[key,path.join(pocketDir,name)]));
 const audio=path.join(pocketDir,'alba-casual.wav');
 if(![...Object.values(model),audio].every(file=>fs.existsSync(file)))throw Error('Alba 语音包文件不完整');
 reference=sherpa.readWave(audio,false);
 if(!reference?.samples?.length)throw Error('Alba 参考音色无法读取');
 pocket=new sherpa.OfflineTts({
  model:{pocket:{...model,voiceEmbeddingCacheCapacity:2},numThreads:3,debug:false,provider:'cpu'},
  maxNumSentences:2
 });
}
const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function cardinal(n){if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+cardinal(n%100):'');if(n<1000000)return cardinal(Math.floor(n/1000))+' thousand'+(n%1000?' '+cardinal(n%1000):'');return '';}
function normalize(text){
 return text.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\s*—\s*/g,', ').replace(/–/g,'-').replace(/…/g,'...')
  .replace(/(?<!:)\b([01]?\d|2[0-3]):([0-5]\d)\b(?!:\d)/g,(_,hour,minute)=>{
   const hours=Number(hour),minutes=Number(minute);
   const spokenHour=cardinal(hours);
   if(minutes===0)return hours===0?'midnight':spokenHour+(hours<=12?" o'clock":" hundred");
   return spokenHour+(minutes<10?' oh ':' ')+cardinal(minutes);
  })
  .replace(/\b\d+(?:\.\d+)?%?/g,value=>{
   const percent=value.endsWith('%'),n=percent?value.slice(0,-1):value,parts=n.split('.');
   if(parts[0].length>6)return value;
   const whole=parts[0].length>1&&parts[0][0]==='0'?[...parts[0]].map(x=>ones[+x]).join(' '):cardinal(Number(parts[0]));
   return whole+(parts[1]?' point '+[...parts[1]].map(x=>ones[+x]).join(' '):'')+(percent?' percent':'');
  });
}
function wave(samples,sampleRate){const b=Buffer.allocUnsafe(44+samples.length*2);b.write('RIFF',0);b.writeUInt32LE(36+samples.length*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);let energy=0;for(let i=0;i<samples.length;i++){const x=samples[i];if(!Number.isFinite(x))throw Error('语音生成不完整');energy+=x*x;b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2);}if(!samples.length||Math.sqrt(energy/samples.length)<0.0005)throw Error('未生成有效声音');return b;}
parentPort.on('message',({id,action,text,voice,speed})=>{
 try{
  if(voice==='alba'){
   try{
    initializePocket();
    if(action==='warm'){parentPort.postMessage({id,ok:true,ready:true});return;}
    const result=pocket.generate({text:normalize(text),enableExternalBuffer:false,
     generationConfig:new sherpa.GenerationConfig({
      referenceAudio:reference.samples,referenceSampleRate:reference.sampleRate,silenceScale:0.84,numSteps:12,
      extra:{max_reference_audio_len:'10',seed:'42',temperature:'0.55',frames_after_eos:'13',min_char_in_sentence:'18'}
     })});
    const bytes=wave(cleanFemaleVoice(result.samples,result.sampleRate,'pocket'),result.sampleRate);
    // Pocket generates at its own pace. Chromium changes rate while preserving pitch.
    parentPort.postMessage({id,ok:true,audio:'data:audio/wav;base64,'+bytes.toString('base64'),
     duration:result.samples.length/result.sampleRate,playbackRate:speed,engine:'pocket'});
    return;
   }catch(error){
    if(action==='warm')throw error;
    voice=3;
   }
  }
  const {engine,words}=initialize(voice);
  if(action==='warm'){parentPort.postMessage({id,ok:true,ready:true});return;}
  const source=normalize(text);
  if(/[\d$€£¥]|[^\x00-\x7F]/.test(source)){
   parentPort.postMessage({id,ok:false,code:'unsupported',error:'这句话包含暂不支持的符号'});
   return;
  }
  const missing=[...new Set((source.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g)||[]).filter(w=>!words.has(w)))];
  if(missing.length){
   parentPort.postMessage({id,ok:false,code:'unsupported',error:'词典暂不支持：'+missing.slice(0,3).join('、')});
   return;
  }
  const result=engine.generate({text:source,enableExternalBuffer:false,
   generationConfig:new sherpa.GenerationConfig({sid:voice,speed:1,silenceScale:0.65})});
  const samples=voice===3||voice===9?cleanFemaleVoice(result.samples,result.sampleRate,'kokoro'):result.samples;
  const bytes=wave(samples,result.sampleRate);
  parentPort.postMessage({id,ok:true,audio:'data:audio/wav;base64,'+bytes.toString('base64'),
   duration:result.samples.length/result.sampleRate,playbackRate:speed,engine:'kokoro'});
 }catch(error){
  parentPort.postMessage({id,ok:false,code:'engine',error:error.message||'自然语音暂不可用'});
 }
});
