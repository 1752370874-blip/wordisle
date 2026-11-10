class WordIsleMicrophone extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(1600); this.used = 0; }
  process(inputs) {
    const channels = inputs[0];
    if (!channels || !channels[0]) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (let j = 0; j < channels.length; j++) sample += channels[j][i];
      this.buffer[this.used++] = sample / channels.length;
      if (this.used === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(1600); this.used = 0;
      }
    }
    return true;
  }
}
registerProcessor('wordisle-microphone', WordIsleMicrophone);
