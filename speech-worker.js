'use strict';
const { parentPort } = require('node:worker_threads');
const path = require('node:path');
const { recognitionWindows, joinRecognition } = require('./speech-chunks');
let recognizer;
parentPort.on('message', ({ id, samples }) => {
  try {
    if (!recognizer) {
      const sherpa = require('./speech-runtime/node_modules/sherpa-onnx-node');
      const dir = path.join(__dirname, 'models', 'whisper-tiny.en');
      recognizer = new sherpa.OfflineRecognizer({ featConfig: { sampleRate: 16000, featureDim: 80 }, modelConfig: {
        whisper: { encoder: path.join(dir, 'tiny.en-encoder.int8.onnx'), decoder: path.join(dir, 'tiny.en-decoder.int8.onnx'), language: 'en', task: 'transcribe' },
        tokens: path.join(dir, 'tiny.en-tokens.txt'), numThreads: 4, provider: 'cpu', debug: false
      } });
    }
    const windows = recognitionWindows(samples); let text = '';
    for (const window of windows) {
      const stream = recognizer.createStream();
      stream.acceptWaveform({ samples: samples.subarray(window.start, window.end), sampleRate: 16000 });
      recognizer.decode(stream);
      const result = recognizer.getResult(stream);
      const part = String(result.text || '').replace(/\[(?:BLANK_AUDIO|SILENCE)\]/gi, '').trim();
      text = joinRecognition(text, part);
    }
    parentPort.postMessage({ id, ok: true, text, recognitionParts: windows.length });
  } catch (error) { parentPort.postMessage({ id, ok: false, error: error.message || '语音识别失败' }); }
});
