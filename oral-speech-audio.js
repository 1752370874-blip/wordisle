'use strict';

const frameSize = 512;
const hop = frameSize / 2;
const window = Float32Array.from({ length: frameSize },
  (_, i) => Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / frameSize)));

function fft(real, imaginary, inverse = false) {
  for (let i = 1, j = 0; i < frameSize; i++) {
    let bit = frameSize >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let size = 2; size <= frameSize; size *= 2) {
    for (let k = 0; k < size / 2; k++) {
      const angle = (inverse ? 2 : -2) * Math.PI * k / size;
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      for (let i = k; i < frameSize; i += size) {
        const j = i + size / 2;
        const x = real[j] * cosine - imaginary[j] * sine;
        const y = real[j] * sine + imaginary[j] * cosine;
        real[j] = real[i] - x;
        imaginary[j] = imaginary[i] - y;
        real[i] += x;
        imaginary[i] += y;
      }
    }
  }
}

function reduceHum(input, quietFrames) {
  const quietPower = quietFrames.reduce((sum, frame) => sum + frame.rms ** 2, 0) / quietFrames.length;
  const peaks = [];
  for (let hz = 45; hz <= 195; hz += 3) {
    let power = 0;
    const frequency = 2 * Math.PI * hz / 16000;
    for (const { start } of quietFrames) {
      let real = 0, imaginary = 0;
      for (let i = 0; i < frameSize; i++) {
        real += input[start + i] * Math.cos(frequency * i);
        imaginary += input[start + i] * Math.sin(frequency * i);
      }
      power += 2 * (real ** 2 + imaginary ** 2) / frameSize ** 2;
    }
    if (power / quietFrames.length >= quietPower * .22) peaks.push({ frequency, power });
  }
  peaks.sort((a, b) => b.power - a.power);
  const selected = [];
  for (const peak of peaks) {
    if (selected.every(frequency => Math.abs(frequency - peak.frequency) > 2 * Math.PI * 36 / 16000)) selected.push(peak.frequency);
    if (selected.length === 2) break;
  }
  if (!selected.length) return input;
  const signal = new Float32Array(input);
  for (const frequency of selected) {
    const alpha = Math.sin(frequency) / 14;
    const b0 = 1 / (1 + alpha), b1 = -2 * Math.cos(frequency) * b0;
    const a2 = (1 - alpha) * b0;
    let z1 = 0, z2 = 0;
    for (let i = 0; i < signal.length; i++) {
      const sample = signal[i];
      const result = b0 * sample + z1;
      z1 = b1 * (sample - result) + z2;
      z2 = b0 * sample - a2 * result;
      signal[i] = result;
    }
  }
  return signal;
}

function prepareOralAudio(input) {
  const levels = [];
  for (let start = 0; start + frameSize <= input.length; start += hop) {
    let energy = 0;
    for (let i = start; i < start + frameSize; i++) energy += input[i] ** 2;
    levels.push({ start, rms: Math.sqrt(energy / frameSize) });
  }
  levels.sort((a, b) => a.rms - b.rms);
  const quiet = levels[Math.floor(levels.length * .15)]?.rms || 0;
  const speech = levels[Math.floor(levels.length * .85)]?.rms || 0;
  const noisy = levels.length >= 8 && quiet >= .0015 && quiet >= speech * .22;
  let samples = input;
  // Reserve spectral subtraction for recordings where steady noise nearly masks the voice.
  if (noisy && quiet >= .01 && quiet >= speech * .82) {
    const source = reduceHum(input, levels.slice(0, 8));
    const real = new Float64Array(frameSize), imaginary = new Float64Array(frameSize);
    const noise = new Float64Array(frameSize);
    const analyze = start => {
      imaginary.fill(0);
      for (let i = 0; i < frameSize; i++) real[i] = (source[start + i] || 0) * window[i];
      fft(real, imaginary);
    };
    const count = Math.max(3, Math.floor(levels.length * .2));
    for (const { start } of levels.slice(0, count)) {
      analyze(start);
      for (let i = 0; i < frameSize; i++) noise[i] += (real[i] ** 2 + imaginary[i] ** 2) / count;
    }
    samples = new Float32Array(input.length);
    for (let start = -hop; start < input.length; start += hop) {
      analyze(start);
      for (let i = 0; i < frameSize; i++) {
        const power = real[i] ** 2 + imaginary[i] ** 2;
        const gain = Math.sqrt(Math.max(.0225, 1 - 1.8 * noise[i] / (power + 1e-12)));
        real[i] *= gain;
        imaginary[i] *= gain;
      }
      fft(real, imaginary, true);
      for (let i = Math.max(0, -start); i < Math.min(frameSize, input.length - start); i++) {
        samples[start + i] += real[i] * window[i] / frameSize;
      }
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = Math.min(4, .2 / Math.max(peak, .01));
  if (gain > 1) samples = Float32Array.from(samples, value => value * gain);
  return { samples, difficult: noisy || (speech > 0 && speech < .012) };
}

module.exports = { prepareOralAudio };
