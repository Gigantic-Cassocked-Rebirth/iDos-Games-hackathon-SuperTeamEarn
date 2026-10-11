// The clack of bone on bone, synthesised (no audio files): a short filtered noise burst with a
// woody resonance, louder and brighter for harder hits.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

let last = 0;

export function clack(strength: number, heavy = false): void {
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  // Many contacts in one instant sound like one.
  if (now - last < 0.025) return;
  last = now;
  const vol = Math.min(1, strength / 1600) * 0.7 + 0.05;
  const len = 0.06;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = (heavy ? 1300 : 2200) + Math.random() * 500 + strength * 0.4;
  band.Q.value = 3.5;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + len);
  src.connect(band).connect(gain).connect(a.destination);
  src.start(now);
  // A short knock underneath — the body of the bone.
  const osc = a.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(heavy ? 420 : 640, now);
  osc.frequency.exponentialRampToValueAtTime(heavy ? 180 : 300, now + 0.05);
  const og = a.createGain();
  og.gain.setValueAtTime(vol * 0.5, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(og).connect(a.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** A soft "whoosh" for the flick itself. */
export function flick(power: number): void {
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  const len = 0.18;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI);
  const src = a.createBufferSource();
  src.buffer = buf;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600 + power * 1600;
  const g = a.createGain();
  g.gain.value = 0.12 + power * 0.18;
  src.connect(lp).connect(g).connect(a.destination);
  src.start(now);
}
