'use strict';

function filter(samples, sampleRate, frequency, q, notch = false) {
  const omega = 2 * Math.PI * frequency / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  const scale = 1 / (1 + alpha);
  const b0 = (notch ? 1 : (1 - cosine) / 2) * scale;
  const b1 = (notch ? -2 * cosine : 1 - cosine) * scale;
  const a1 = -2 * cosine * scale;
  const a2 = (1 - alpha) * scale;
  let z1 = 0, z2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    const output = b0 * input + z1;
    z1 = b1 * input - a1 * output + z2;
    z2 = b0 * input - a2 * output;
    samples[i] = output;
  }
}

function reducePauseNoise(samples, sampleRate) {
  const window = Math.max(1, Math.round(sampleRate * 0.008));
  const levels = new Float64Array(Math.ceil(samples.length / window));
  for (let i = 0; i < levels.length; i++) {
    const start = i * window, end = Math.min(samples.length, start + window);
    let energy = 0;
    for (let j = start; j < end; j++) energy += samples[j] * samples[j];
    levels[i] = Math.sqrt(energy / (end - start));
  }
  let gain = 1;
  const release = Math.exp(-window / (sampleRate * 0.032));
  for (let i = 0; i < levels.length; i++) {
    // Look ahead one window so consonant onsets keep their original gain.
    const level = Math.max(levels[i - 1] || 0, levels[i], levels[i + 1] || 0);
    const target = Math.max(0.04, Math.min(1, (level / 0.004) ** 2));
    const next = target > gain ? target : target + (gain - target) * release;
    const start = i * window, end = Math.min(samples.length, start + window);
    for (let j = start; j < end; j++) samples[j] *= gain + (next - gain) * (j - start + 1) / (end - start);
    gain = next;
  }
}

function cleanFemaleVoice(samples, sampleRate, engine) {
  // The Kokoro female samples have a narrow tone around 4.8 kHz.
  if (engine === 'kokoro') filter(samples, sampleRate, 4800, 15, true);
  // A sixth-order Butterworth low-pass attenuates the higher codec hiss.
  for (const q of [0.517638, 0.707107, 1.931852]) filter(samples, sampleRate, 5400, q);
  reducePauseNoise(samples, sampleRate);
  return samples;
}

module.exports = { cleanFemaleVoice };
