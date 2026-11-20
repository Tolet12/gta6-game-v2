// WebAudio synth only. Every call is guarded: audio must never throw or block.
export class AudioSys {
  constructor() { this.ctx = null; this.master = null; this.padTimer = 0; this.sirenPhase = 0; }
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.16;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    } catch { return false; }
  }
  tone(freq, dur, type = 'sine', vol = 0.5, slide = 0, delay = 0) {
    try {
      if (!this.ensure()) return;
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch { /* silent */ }
  }
  noise(dur, vol = 0.4) {
    try {
      if (!this.ensure()) return;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = this.ctx.createBufferSource(); s.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      s.connect(f); f.connect(g); g.connect(this.master); s.start();
    } catch { /* silent */ }
  }
  engine(speedRatio) { this._eng = Math.abs(speedRatio); }
  update(dt, driving, sirenNear) {
    try {
      if (!this.ctx) return;
      if (driving && this._eng > 0.02) {
        this._engT = (this._engT || 0) - dt;
        if (this._engT <= 0) { this._engT = 0.14; this.tone(55 + this._eng * 90, 0.13, 'sawtooth', 0.10); }
      }
      if (sirenNear) {
        this.sirenPhase += dt;
        if (this.sirenPhase > 0.42) { this.sirenPhase = 0; this._sirenHi = !this._sirenHi; this.tone(this._sirenHi ? 880 : 660, 0.4, 'triangle', 0.07); }
      }
      this.padTimer -= dt;
      if (this.padTimer <= 0) { this.padTimer = 4.2; this.tone(110, 4, 'sine', 0.05); this.tone(165, 4, 'sine', 0.035, 0, 0.1); }
    } catch { /* silent */ }
  }
  thud() { this.noise(0.12, 0.5); this.tone(70, 0.15, 'sine', 0.5, -30); }
  punch() { this.noise(0.07, 0.35); }
  chime() { this.tone(880, 0.18, 'sine', 0.4); this.tone(1320, 0.3, 'sine', 0.35, 0, 0.1); }
  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.35, 0, i * 0.11)); }
  fail() { this.tone(300, 0.5, 'sawtooth', 0.25, -160); }
}
