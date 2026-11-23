'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');

function loadCompactTranslator(root) {
  const name = 'OPUS-MT 英译中';
  const runtime = path.join(root, 'translation-runtime', 'node_modules', '@huggingface', 'transformers', 'dist', 'transformers.node.cjs');
  const models = path.join(root, 'models');
  let pipeline, timer, busy = false, generation = 0;

  function status() {
    const available = [runtime, ...['encoder_model_quantized.onnx', 'decoder_model_merged_quantized.onnx'].map(file =>
      path.join(models, 'opus-mt-en-zh', 'onnx', file))].every(file => fs.existsSync(file));
    return { available, name };
  }

  async function stop() {
    generation++;
    clearTimeout(timer);
    if (busy) return;
    const previous = pipeline;
    pipeline = null;
    if (previous) await previous.dispose();
  }

  async function request(input) {
    if (busy) return { ok: false, error: '本地 AI 正在处理上一项任务，请稍候' };
    if (!status().available) return { ok: false, error: '本地英译中组件不完整，请重新解压词屿' };
    const current = generation;
    busy = true;
    clearTimeout(timer);
    try {
      if (!pipeline) {
        const engine = require(runtime);
        engine.env.allowRemoteModels = false;
        engine.env.useFSCache = false;
        engine.env.localModelPath = models + path.sep;
        pipeline = await engine.pipeline('translation', 'opus-mt-en-zh', {
          device: 'cpu', dtype: 'q8', local_files_only: true,
          session_options: { intraOpNumThreads: 3, interOpNumThreads: 1 }
        });
      }
      if (current !== generation) throw Error('翻译已停止');
      const [result] = await pipeline(input.text, { num_beams: 2, max_new_tokens: 512 });
      if (current !== generation) throw Error('翻译已停止');
      const text = result?.translation_text?.trim();
      if (!text) throw Error('本地模型未生成译文');
      return { ok: true, text, model: name };
    } catch (error) {
      return { ok: false, error: error.message || '本地翻译失败' };
    } finally {
      busy = false;
      if (current !== generation) await stop().catch(() => {});
      else {
        timer = setTimeout(() => stop().catch(() => {}), 180000);
        timer.unref();
      }
    }
  }
  return { status, request, stop };
}

function createCompactTranslator(root) {
  const model = loadCompactTranslator(root);
  let worker, active, idle;

  function stop() {
    clearTimeout(idle);
    const task=active;
    active=null;
    if(task){clearTimeout(task.timeout);task.resolve({ok:false,error:'本地翻译已停止'});}
    if(worker){const previous=worker;worker=null;previous.kill();}
    return Promise.resolve();
  }

  async function request(input) {
    if (!model.status().available) return {ok:false,error:'本地英译中组件不完整'};
    if (active) return {ok:false,error:'本地 AI 正在处理上一项任务，请稍候'};
    clearTimeout(idle);
    if(!worker){
      // Whisper/Kokoro load another ONNX Runtime DLL. Windows cannot use
      // two incompatible versions of the same native library in one process.
      const child=fork(__filename,[],{
        env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,stdio:['ignore','ignore','ignore','ipc']
      });
      worker=child;
      child.on('message',reply=>{
        if(worker!==child||!active)return;
        const task=active;
        active=null;
        clearTimeout(task.timeout);
        task.resolve(reply);
        idle=setTimeout(stop,180000);
        idle.unref();
      });
      const fail=()=>{if(worker===child)stop();};
      child.on('error',fail);
      child.on('exit',fail);
      child.on('disconnect',fail);
    }
    return new Promise(resolve=>{
      active={resolve,timeout:setTimeout(stop,60000)};
      worker.send(input,error=>{if(error)stop();});
    });
  }

  return {status:model.status,request,stop};
}

if(require.main===module&&process.send){
  const engine=loadCompactTranslator(__dirname);
  process.on('message',async input=>process.send?.(await engine.request(input)));
  process.on('disconnect',()=>process.exit(0));
}

module.exports = { createCompactTranslator };
