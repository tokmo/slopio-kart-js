// Petit moteur audio 100 % WebAudio (bips, moteur, musique chiptune)
export class Sound {
  constructor() { this.ctx = null; this.muted = false; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 700;
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
    this.engine = this.ctx.createOscillator(); this.engine.type = 'sawtooth'; this.engine.frequency.value = 50;
    this.engine.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engine.start();
    this.musicOn = false;
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  engineUpdate(speed, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(45 + Math.abs(speed) * 2.6, t, 0.05);
    this.engineGain.gain.setTargetAtTime(on ? 0.12 : 0, t, 0.1);
  }

  beep(freq, dur = 0.15, type = 'square', slide = 0, vol = 0.25, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  countdown(final) { this.beep(final ? 880 : 440, final ? 0.6 : 0.25); }
  boost() { this.beep(300, 0.4, 'sawtooth', 3, 0.2); }
  hit() { this.beep(400, 0.5, 'sawtooth', 0.15, 0.3); }
  pickup() { this.beep(660, 0.08); this.beep(880, 0.12, 'square', 1, 0.25, 0.08); }
  item() { this.beep(500, 0.1, 'triangle'); }
  bump() { this.beep(120, 0.1, 'square', 0.5, 0.2); }
  lap() { [523, 659, 784].forEach((f, i) => this.beep(f, 0.15, 'square', 1, 0.25, i * 0.12)); }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const lead = [0, 3, 7, 12, 10, 7, 3, 7, 0, 5, 8, 12, 10, 8, 5, 3];
    const bass = [0, 0, 5, 5, 3, 3, 7, 7];
    const base = 196, step = 0.17;
    let n = 0, next = this.ctx.currentTime + 0.1;
    const tick = () => {
      while (next < this.ctx.currentTime + 0.5) {
        const f = base * Math.pow(2, lead[n % 16] / 12);
        this.beep(f, step * 0.9, 'square', 1, 0.05, next - this.ctx.currentTime);
        if (n % 2 === 0) this.beep(base / 2 * Math.pow(2, bass[(n / 2) % 8 | 0] / 12), step * 1.8, 'triangle', 1, 0.09, next - this.ctx.currentTime);
        next += step; n++;
      }
    };
    setInterval(tick, 200);
  }
}
