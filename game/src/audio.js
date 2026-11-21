// Solara Bay v7 — procedural audio: engine hum, siren wash, pickup blip,
// mission sting. All synthesized with WebAudio, no audio files.

export function makeAudio() {
  let ctx = null;
  let engineOsc = null, engineGain = null;
  let sirenOsc = null, sirenGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { ctx = null; }
    return ctx;
  }

  function startEngine() {
    const c = ensure(); if (!c) return;
    if (engineOsc) return;
    engineOsc = c.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    engineGain = c.createGain(); engineGain.gain.value = 0.0;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(c.destination);
    engineOsc.start();
    sirenOsc = c.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 720;
    sirenGain = c.createGain(); sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain); sirenGain.connect(c.destination);
    sirenOsc.start();
  }

  function blip(freq, dur = 0.12, type = 'square', vol = 0.12) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function sting() { blip(523, 0.14); setTimeout(() => blip(659, 0.14), 120); setTimeout(() => blip(784, 0.22), 240); }

  function update(speedKmh, wanted, running) {
    if (!ctx || !engineOsc) return;
    const target = running ? 0.05 + Math.min(0.09, Math.abs(speedKmh) / 1600) : 0.0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedKmh) * 0.9, ctx.currentTime, 0.1);
    if (sirenOsc) {
      sirenGain.gain.setTargetAtTime(wanted >= 2 ? 0.02 : 0.0, ctx.currentTime, 0.3);
      sirenOsc.frequency.setTargetAtTime(680 + 160 * Math.sin(ctx.currentTime * 3.2), ctx.currentTime, 0.05);
    }
  }

  return { ensure, startEngine, blip, sting, update };
}
