class Pcm16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.source = [];
    this.position = 0;
    this.output = [];
    this.ratio = sampleRate / 16000;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) this.source.push(sample);

    while (this.position + 1 < this.source.length) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      const value = this.source[left] + (this.source[left + 1] - this.source[left]) * fraction;
      this.output.push(Math.max(-32768, Math.min(32767, Math.round(value * 32767))));
      this.position += this.ratio;
    }

    const consumed = Math.floor(this.position);
    if (consumed) {
      this.source.splice(0, consumed);
      this.position -= consumed;
    }

    if (this.output.length >= 1600) {
      const pcm = new Int16Array(this.output.splice(0, 1600));
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm16-processor", Pcm16Processor);
