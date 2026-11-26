// Langit Courier — audio.js
// Semua suara disintesis dengan WebAudio, tanpa file aset:
// dengung mesin (osilator mengikuti throttle), lonceng ring,
// debuk pendaratan, dan alarm bahan bakar. Diam sampai ada gestur pengguna.

export function createAudio() {
  const audio = {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    muted: false,
    unlocked: false,
  };

  function ensureContext() {
    if (audio.ctx) return audio.ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio.ctx = new Ctx();
      // Mesin: dua osilator sawtooth yang sedikit detune + lowpass.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 62;
      const osc2 = audio.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 65;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(filter);
      osc2.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.ctx.destination);
      audio.engineOsc.start();
      osc2.start();
      audio.engineOsc2 = osc2;
    } catch (err) {
      audio.ctx = null;
    }
    return audio.ctx;
  }

  // Dipanggil dari gestur (klik/tombol): browser mengizinkan audio setelah ini.
  audio.unlock = () => {
    if (audio.unlocked) return;
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    audio.unlocked = true;
  };

  // Dipanggil tiap frame: frekuensi + volume mesin mengikuti throttle & kecepatan.
  audio.updateEngine = (throttle, speed, engineOut) => {
    if (!audio.ctx || audio.muted || !audio.engineOsc) return;
    const t = audio.ctx.currentTime;
    const freq = engineOut ? 34 : 52 + throttle * 58 + speed * 0.35;
    audio.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    if (audio.engineOsc2) audio.engineOsc2.frequency.setTargetAtTime(freq * 1.03, t, 0.08);
    const vol = engineOut ? 0.012 : 0.02 + throttle * 0.05;
    audio.engineGain.gain.setTargetAtTime(vol, t, 0.1);
  };

  function beep(freq, startAt, dur, type, vol) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime + startAt;
    const osc = audio.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol || 0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  audio.ring = () => {
    beep(880, 0, 0.22, 'sine', 0.14);
    beep(1318, 0.09, 0.3, 'sine', 0.12);
  };
  audio.thud = () => {
    beep(70, 0, 0.35, 'sine', 0.22);
    beep(48, 0.05, 0.4, 'triangle', 0.18);
  };
  audio.alarm = () => {
    beep(660, 0, 0.12, 'square', 0.05);
    beep(660, 0.18, 0.12, 'square', 0.05);
  };
  audio.fanfare = () => {
    beep(523, 0, 0.25, 'triangle', 0.14);
    beep(659, 0.14, 0.25, 'triangle', 0.14);
    beep(784, 0.28, 0.45, 'triangle', 0.16);
  };
  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.engineGain && audio.ctx) {
      audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : 0.04, audio.ctx.currentTime, 0.05);
    }
    return audio.muted;
  };
  return audio;
}
