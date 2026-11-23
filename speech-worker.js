'use strict';
const { parentPort } = require('node:worker_threads');
const path = require('node:path');
const { recognitionWindows, joinRecognition } = require('./speech-chunks');
const { prepareOralAudio } = require('./oral-speech-audio');
const recognizers = new Map();

function getRecognizer({ name: model, directory: dir }) {
  const cached = recognizers.get(dir);
  if (cached) {
    recognizers.delete(dir);
    recognizers.set(dir, cached);
    return cached;
  }
  const sherpa = require('./speech-runtime/node_modules/sherpa-onnx-node');
  const recognizer = new sherpa.OfflineRecognizer({ featConfig: { sampleRate: 16000, featureDim: 80 }, modelConfig: {
    whisper: { encoder: path.join(dir, model + '-encoder.int8.onnx'), decoder: path.join(dir, model + '-decoder.int8.onnx'), language: 'en', task: 'transcribe' },
    tokens: path.join(dir, model + '-tokens.txt'), numThreads: 4, provider: 'cpu', debug: false
  } });
  if (recognizers.size >= 2) recognizers.delete(recognizers.keys().next().value);
  recognizers.set(dir, recognizer);
  return recognizer;
}

parentPort.on('message', ({ id, samples, model, warm, oral, alternate }) => {
  try {
    if (warm) {
      getRecognizer(model);
      parentPort.postMessage({ id, ok: true, model: model.name });
      return;
    }
    if (oral) {
      const audio = prepareOralAudio(samples);
      samples = audio.samples;
      if (audio.difficult && alternate) model = alternate;
    }
    const recognizer = getRecognizer(model);
    const windows = recognitionWindows(samples); let text = '';
    for (const window of windows) {
      const stream = recognizer.createStream();
      stream.acceptWaveform({ samples: samples.subarray(window.start, window.end), sampleRate: 16000 });
      recognizer.decode(stream);
      const result = recognizer.getResult(stream);
      let part = String(result.text || '').replace(/\[(?:BLANK_AUDIO|SILENCE)\]/gi, '').trim();
      if (oral) {
        part = part.replace(/[\[(](?:inaudible|muffled speaking|background noise|noise|silence|music|static|buzz(?:ing)?|wind blowing|water running)[\])]/gi, '').trim();
        if (!/[a-z0-9]/i.test(part)) continue;
      }
      text = joinRecognition(text, part);
    }
    parentPort.postMessage({ id, ok: true, text, model: model.name, recognitionParts: windows.length });
  } catch (error) { parentPort.postMessage({ id, ok: false, error: error.message || '语音识别失败' }); }
});
