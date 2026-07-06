/**
 * Animal Island — UI sound effect library.
 * All sounds are synthesized in the browser with Web Audio API.
 * No audio files needed; copy the play function into your app.
 */

let _ctx: AudioContext | null = null;
let _volume = 0.8;

export function setSoundVolume(volume: number) {
  _volume = Math.min(1, Math.max(0, volume));
}

export function getCtx(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext only available in the browser");
  }
  if (!_ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    _ctx = new Ctor();
  }
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

type Wave = OscillatorType;
const TYPE_SCALE = [880, 988, 1108.73, 1174.66, 1318.51, 1479.98, 1661.22, 1760];

function typeFreq(step = 0, octave = 1) {
  const note = TYPE_SCALE[Math.abs(step) % TYPE_SCALE.length];
  const octaveOffset = Math.floor(Math.abs(step) / TYPE_SCALE.length);
  return note * octave * 2 ** Math.min(octaveOffset, 1);
}

function tone(opts: {
  freq: number;
  duration: number;
  type?: Wave;
  gain?: number;
  attack?: number;
  release?: number;
  glideTo?: number;
  delay?: number;
}) {
  if (_volume <= 0) return;
  const ctx = getCtx();
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.glideTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + opts.duration);
  }
  const peak = (opts.gain ?? 0.18) * _volume;
  const a = Math.min(opts.attack ?? 0.005, opts.duration * 0.4);
  const r = Math.min(opts.release ?? 0.08, opts.duration - a);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.linearRampToValueAtTime(peak, t0 + opts.duration - r);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.02);
}

function noiseBurst(duration: number, gain = 0.08, lp = 2000) {
  if (_volume <= 0) return;
  const ctx = getCtx();
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * _volume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration);
}

/* ===== Library ===== */

export const sounds = {
  click: () => tone({ freq: 880, duration: 0.06, type: "triangle", gain: 0.2 }),

  pop: () =>
    tone({ freq: 520, glideTo: 880, duration: 0.12, type: "sine", gain: 0.22 }),

  tap: () => tone({ freq: 1200, duration: 0.04, type: "square", gain: 0.12 }),

  toggleOn: () => {
    tone({ freq: 660, duration: 0.08, type: "triangle", gain: 0.18 });
    tone({ freq: 990, duration: 0.1, type: "triangle", gain: 0.18, delay: 0.06 });
  },

  toggleOff: () => {
    tone({ freq: 660, duration: 0.08, type: "triangle", gain: 0.18 });
    tone({ freq: 440, duration: 0.1, type: "triangle", gain: 0.18, delay: 0.06 });
  },

  hover: () => tone({ freq: 1760, duration: 0.05, type: "sine", gain: 0.08 }),

  success: () => {
    tone({ freq: 523.25, duration: 0.12, type: "triangle", gain: 0.18 }); // C5
    tone({ freq: 659.25, duration: 0.12, type: "triangle", gain: 0.18, delay: 0.1 }); // E5
    tone({ freq: 783.99, duration: 0.2, type: "triangle", gain: 0.2, delay: 0.2 }); // G5
  },

  error: () => {
    tone({ freq: 220, duration: 0.14, type: "sawtooth", gain: 0.16 });
    tone({ freq: 165, duration: 0.18, type: "sawtooth", gain: 0.16, delay: 0.1 });
  },

  notify: () => {
    tone({ freq: 880, duration: 0.18, type: "sine", gain: 0.2 });
    tone({ freq: 1318.5, duration: 0.22, type: "sine", gain: 0.18, delay: 0.12 });
  },

  message: () => {
    tone({ freq: 700, glideTo: 1100, duration: 0.14, type: "triangle", gain: 0.18 });
    tone({ freq: 1100, glideTo: 1400, duration: 0.14, type: "triangle", gain: 0.16, delay: 0.1 });
  },

  coin: () => {
    tone({ freq: 988, duration: 0.07, type: "square", gain: 0.18 });
    tone({ freq: 1319, duration: 0.18, type: "square", gain: 0.18, delay: 0.07 });
  },

  levelUp: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) =>
      tone({ freq: f, duration: 0.14, type: "triangle", gain: 0.2, delay: i * 0.09 }),
    );
  },

  whoosh: () => noiseBurst(0.35, 0.1, 1400),

  open: () => {
    tone({ freq: 440, glideTo: 880, duration: 0.18, type: "sine", gain: 0.18 });
    noiseBurst(0.12, 0.05, 3000);
  },

  close: () =>
    tone({ freq: 880, glideTo: 330, duration: 0.18, type: "sine", gain: 0.18 }),

  unlock: () => {
    noiseBurst(0.08, 0.06, 4000);
    tone({ freq: 1318, duration: 0.16, type: "triangle", gain: 0.2, delay: 0.08 });
  },

  type: () => tone({ freq: 1400, duration: 0.025, type: "square", gain: 0.1 }),

  slider: () => {
    tone({ freq: 620, glideTo: 700, duration: 0.045, type: "triangle", gain: 0.035 });
    noiseBurst(0.025, 0.008, 1600);
  },

  snap: () => {
    tone({ freq: 880, duration: 0.035, type: "triangle", gain: 0.12 });
    tone({ freq: 1320, duration: 0.06, type: "sine", gain: 0.08, delay: 0.025 });
  },

  check: () => {
    tone({ freq: 660, duration: 0.06, type: "triangle", gain: 0.12 });
    tone({ freq: 990, duration: 0.1, type: "triangle", gain: 0.12, delay: 0.045 });
  },

  uncheck: () =>
    tone({ freq: 780, glideTo: 420, duration: 0.12, type: "triangle", gain: 0.11 }),

  radio: () => tone({ freq: 920, duration: 0.07, type: "sine", gain: 0.1, release: 0.05 }),

  tab: () => {
    tone({ freq: 620, duration: 0.04, type: "triangle", gain: 0.1 });
    tone({ freq: 820, duration: 0.05, type: "triangle", gain: 0.08, delay: 0.035 });
  },

  menuOpen: () => {
    tone({ freq: 360, glideTo: 720, duration: 0.14, type: "sine", gain: 0.1 });
    noiseBurst(0.08, 0.025, 2600);
  },

  select: () => tone({ freq: 1040, duration: 0.065, type: "triangle", gain: 0.11 }),

  drop: () =>
    tone({ freq: 880, glideTo: 220, duration: 0.22, type: "triangle", gain: 0.2 }),

  bubble: () =>
    tone({ freq: 300, glideTo: 1200, duration: 0.18, type: "sine", gain: 0.18 }),

  chime: () => {
    [1046.5, 1318.5, 1568].forEach((f, i) =>
      tone({ freq: f, duration: 0.6, type: "sine", gain: 0.12, release: 0.5, delay: i * 0.04 }),
    );
  },

  rain: () => {
    noiseBurst(0.65, 0.045, 1800);
    noiseBurst(0.28, 0.018, 5200);
  },

  wind: () => {
    noiseBurst(0.72, 0.04, 760);
    tone({ freq: 180, glideTo: 260, duration: 0.5, type: "sine", gain: 0.045, release: 0.32 });
  },

  storm: () => {
    noiseBurst(0.72, 0.055, 1200);
    tone({ freq: 86, glideTo: 48, duration: 0.42, type: "sawtooth", gain: 0.075, release: 0.28 });
    tone({ freq: 172, glideTo: 92, duration: 0.28, type: "triangle", gain: 0.05, delay: 0.08, release: 0.18 });
  },
} as const;

export type SoundName = keyof typeof sounds;

function playClearChimeLevelUp() {
  [783.99, 1046.5, 1318.51, 1760].forEach((freq, index) =>
    tone({
      freq,
      duration: 0.15 + index * 0.02,
      type: "sine",
      gain: 0.06 - index * 0.004,
      delay: index * 0.045,
      attack: 0.008,
      release: 0.11 + index * 0.02,
    }),
  );
  tone({
    freq: 2637.02,
    duration: 0.28,
    type: "sine",
    gain: 0.028,
    delay: 0.18,
    attack: 0.012,
    release: 0.22,
  });
}

export function playScratchPrizeLevelUp() {
  playClearChimeLevelUp();
}

export function playRewardLevelUp() {
  playClearChimeLevelUp();
}

export function playScratchPrizeCoin() {
  tone({
    freq: 1318.51,
    duration: 0.045,
    type: "triangle",
    gain: 0.16,
    release: 0.02,
  });
  tone({
    freq: 2637.02,
    duration: 0.16,
    type: "sine",
    gain: 0.12,
    delay: 0.035,
    release: 0.12,
  });
}

export function playGachaReveal() {
  tone({
    freq: 392,
    glideTo: 1174.66,
    duration: 0.26,
    type: "sine",
    gain: 0.052,
    attack: 0.012,
    delay: 0.01,
    release: 0.17,
  });
  [1174.66, 1568, 2093].forEach((freq, index) =>
    tone({
      freq,
      duration: 0.12 + index * 0.035,
      type: "sine",
      gain: 0.045 - index * 0.005,
      attack: 0.01,
      delay: 0.21 + index * 0.055,
      release: 0.09,
    }),
  );
  tone({
    freq: 2637.02,
    duration: 0.26,
    type: "sine",
    gain: 0.03,
    attack: 0.012,
    delay: 0.38,
    release: 0.22,
  });
  tone({
    freq: 1318.51,
    duration: 0.42,
    type: "sine",
    gain: 0.028,
    attack: 0.015,
    delay: 0.42,
    release: 0.34,
  });
}

export function playClick() {
  tone({ freq: 880, duration: 0.06, type: "triangle", gain: 0.2 });
}

export function playTap() {
  tone({ freq: 1200, duration: 0.04, type: "square", gain: 0.12 });
}

export function playPop() {
  tone({
    freq: 180,
    glideTo: 360,
    duration: 0.08,
    type: "sine",
    gain: 0.16,
    release: 0.045,
  });
  tone({
    freq: 920,
    duration: 0.045,
    type: "sine",
    gain: 0.1,
    delay: 0.055,
    release: 0.025,
  });
}

export function playHover() {
  tone({ freq: 1760, duration: 0.05, type: "sine", gain: 0.08 });
}

export function playMenuOpen() {
  tone({ freq: 392, glideTo: 1174.66, duration: 0.24, type: "sine", gain: 0.075, release: 0.18 });
  noiseBurst(0.1, 0.018, 5200);
}

export function playSelect() {
  tone({ freq: 880, duration: 0.055, type: "sine", gain: 0.075, release: 0.035 });
  tone({ freq: 1318.51, duration: 0.12, type: "sine", gain: 0.06, delay: 0.05, release: 0.09 });
}

function typeStepFromKey(key: number | string = 0) {
  if (typeof key === "number") return key;
  if (key === "Backspace") return 6;
  if (key === "Delete") return 7;

  let total = 0;
  for (const char of key) {
    total += char.codePointAt(0) ?? 0;
  }

  return total % TYPE_SCALE.length;
}

export function playType(key: number | string = 0) {
  playTypeNote("clearChime", typeStepFromKey(key));
}

function playTypeNote(theme: SoundThemeName, step = 0) {
  if (theme === "pixel") {
    tone({ freq: typeFreq(step, 1.15), duration: 0.018, type: "square", gain: 0.06, release: 0.008 });
    return;
  }

  if (theme === "clearChime") {
    tone({ freq: typeFreq(step, 1.05), duration: 0.045, type: "sine", gain: 0.055, release: 0.03 });
    return;
  }

  tone({ freq: typeFreq(step, 0.72), duration: 0.032, type: "triangle", gain: 0.07, release: 0.018 });
}

function playSoftFeedback(name: SoundName, step?: number) {
  switch (name) {
    case "click":
      tone({ freq: 340, glideTo: 520, duration: 0.08, type: "sine", gain: 0.18, release: 0.05 });
      noiseBurst(0.035, 0.025, 900);
      break;
    case "tap":
      tone({ freq: 760, duration: 0.035, type: "triangle", gain: 0.1, release: 0.02 });
      break;
    case "pop":
      tone({ freq: 260, glideTo: 760, duration: 0.12, type: "sine", gain: 0.16 });
      tone({ freq: 980, duration: 0.05, type: "sine", gain: 0.08, delay: 0.09 });
      break;
    case "hover":
      tone({ freq: 1120, duration: 0.055, type: "sine", gain: 0.055, release: 0.04 });
      break;
    case "toggleOn":
      tone({ freq: 360, duration: 0.07, type: "triangle", gain: 0.13 });
      tone({ freq: 720, duration: 0.13, type: "triangle", gain: 0.14, delay: 0.055, release: 0.1 });
      break;
    case "toggleOff":
      tone({ freq: 640, duration: 0.065, type: "triangle", gain: 0.12 });
      tone({ freq: 300, duration: 0.14, type: "triangle", gain: 0.12, delay: 0.055, release: 0.1 });
      break;
    case "unlock":
      noiseBurst(0.06, 0.05, 3400);
      tone({ freq: 580, duration: 0.06, type: "triangle", gain: 0.12, delay: 0.035 });
      tone({ freq: 1040, duration: 0.16, type: "sine", gain: 0.13, delay: 0.09, release: 0.13 });
      break;
    case "success":
      [392, 523.25, 659.25, 880].forEach((freq, index) =>
        tone({ freq, duration: 0.13, type: "triangle", gain: 0.13, delay: index * 0.075, release: 0.1 }),
      );
      break;
    case "error":
      tone({ freq: 880, glideTo: 740, duration: 0.075, type: "triangle", gain: 0.095, release: 0.045 });
      tone({ freq: 622.25, duration: 0.1, type: "triangle", gain: 0.085, delay: 0.075, release: 0.065 });
      noiseBurst(0.035, 0.012, 4200);
      break;
    case "notify":
      tone({ freq: 880, duration: 0.11, type: "sine", gain: 0.12, release: 0.08 });
      tone({ freq: 1320, duration: 0.16, type: "sine", gain: 0.09, delay: 0.12, release: 0.12 });
      break;
    case "message":
      tone({ freq: 620, duration: 0.055, type: "triangle", gain: 0.12 });
      tone({ freq: 780, duration: 0.055, type: "triangle", gain: 0.1, delay: 0.075 });
      tone({ freq: 620, duration: 0.08, type: "triangle", gain: 0.08, delay: 0.15 });
      break;
    case "open":
      tone({ freq: 300, glideTo: 760, duration: 0.2, type: "sine", gain: 0.14, release: 0.14 });
      noiseBurst(0.12, 0.035, 3200);
      break;
    case "close":
      tone({ freq: 760, glideTo: 260, duration: 0.2, type: "sine", gain: 0.14, release: 0.13 });
      break;
    case "whoosh":
      noiseBurst(0.34, 0.09, 1100);
      break;
    case "bubble":
      tone({ freq: 260, glideTo: 760, duration: 0.11, type: "sine", gain: 0.11 });
      tone({ freq: 360, glideTo: 920, duration: 0.12, type: "sine", gain: 0.08, delay: 0.08 });
      break;
    case "coin":
      tone({ freq: 988, duration: 0.055, type: "triangle", gain: 0.14 });
      tone({ freq: 1568, duration: 0.17, type: "triangle", gain: 0.11, delay: 0.055, release: 0.14 });
      break;
    case "levelUp":
      [392, 523.25, 659.25, 880, 1046.5].forEach((freq, index) =>
        tone({ freq, duration: 0.11, type: "triangle", gain: 0.12, delay: index * 0.07, release: 0.08 }),
      );
      break;
    case "chime":
      tone({ freq: 1046.5, duration: 0.52, type: "sine", gain: 0.1, release: 0.44 });
      tone({ freq: 1396.9, duration: 0.62, type: "sine", gain: 0.08, delay: 0.1, release: 0.5 });
      break;
    case "drop":
      tone({ freq: 780, glideTo: 180, duration: 0.24, type: "triangle", gain: 0.16, release: 0.12 });
      noiseBurst(0.055, 0.025, 800);
      break;
    case "slider":
      noiseBurst(0.04, 0.008, 1500);
      tone({ freq: 500, glideTo: 580, duration: 0.06, type: "triangle", gain: 0.032, release: 0.035 });
      break;
    case "snap":
      tone({ freq: 760, duration: 0.04, type: "triangle", gain: 0.105, release: 0.018 });
      tone({ freq: 1140, duration: 0.075, type: "sine", gain: 0.07, delay: 0.035, release: 0.055 });
      break;
    case "check":
      tone({ freq: 480, duration: 0.06, type: "triangle", gain: 0.095, release: 0.035 });
      tone({ freq: 840, duration: 0.12, type: "triangle", gain: 0.1, delay: 0.05, release: 0.09 });
      break;
    case "uncheck":
      tone({ freq: 780, glideTo: 360, duration: 0.13, type: "triangle", gain: 0.09, release: 0.08 });
      break;
    case "radio":
      tone({ freq: 660, duration: 0.085, type: "sine", gain: 0.08, release: 0.06 });
      tone({ freq: 990, duration: 0.075, type: "sine", gain: 0.055, delay: 0.04, release: 0.05 });
      break;
    case "tab":
      tone({ freq: 520, duration: 0.045, type: "triangle", gain: 0.08, release: 0.025 });
      tone({ freq: 700, duration: 0.07, type: "triangle", gain: 0.075, delay: 0.04, release: 0.045 });
      break;
    case "menuOpen":
      tone({ freq: 300, glideTo: 680, duration: 0.18, type: "sine", gain: 0.095, release: 0.13 });
      noiseBurst(0.09, 0.024, 3000);
      break;
    case "select":
      tone({ freq: 620, duration: 0.04, type: "triangle", gain: 0.09, release: 0.02 });
      tone({ freq: 930, duration: 0.085, type: "triangle", gain: 0.075, delay: 0.04, release: 0.06 });
      break;
    case "type":
      playTypeNote("softFeedback", step);
      break;
    case "rain":
      sounds.rain();
      break;
    case "wind":
      sounds.wind();
      break;
    case "storm":
      sounds.storm();
      break;
  }
}

function playPixel(name: SoundName, step?: number) {
  switch (name) {
    case "click":
      tone({ freq: 720, duration: 0.026, type: "square", gain: 0.14, release: 0.012 });
      tone({ freq: 360, duration: 0.018, type: "square", gain: 0.06, delay: 0.012, release: 0.009 });
      break;
    case "tap":
      tone({ freq: 1240, duration: 0.018, type: "square", gain: 0.08, release: 0.008 });
      break;
    case "pop":
      tone({ freq: 420, duration: 0.028, type: "square", gain: 0.1, release: 0.012 });
      tone({ freq: 840, duration: 0.032, type: "square", gain: 0.1, delay: 0.027, release: 0.014 });
      tone({ freq: 1680, duration: 0.04, type: "square", gain: 0.075, delay: 0.058, release: 0.018 });
      break;
    case "hover":
      tone({ freq: 1840, duration: 0.014, type: "square", gain: 0.045, release: 0.006 });
      break;
    case "toggleOn":
      tone({ freq: 520, duration: 0.036, type: "square", gain: 0.095, release: 0.014 });
      tone({ freq: 1040, duration: 0.052, type: "square", gain: 0.105, delay: 0.038, release: 0.025 });
      break;
    case "toggleOff":
      tone({ freq: 1040, duration: 0.032, type: "square", gain: 0.09, release: 0.014 });
      tone({ freq: 390, duration: 0.06, type: "square", gain: 0.08, delay: 0.036, release: 0.03 });
      break;
    case "unlock":
      noiseBurst(0.045, 0.055, 3600);
      tone({ freq: 660, duration: 0.025, type: "square", gain: 0.08, delay: 0.035, release: 0.012 });
      tone({ freq: 1560, duration: 0.07, type: "square", gain: 0.1, delay: 0.07, release: 0.035 });
      break;
    case "success":
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) =>
        tone({ freq, duration: 0.04, type: "square", gain: 0.085, delay: index * 0.045, release: 0.018 }),
      );
      break;
    case "error":
      tone({ freq: 1046.5, duration: 0.028, type: "square", gain: 0.075, release: 0.012 });
      tone({ freq: 783.99, duration: 0.032, type: "square", gain: 0.07, delay: 0.045, release: 0.014 });
      tone({ freq: 622.25, duration: 0.04, type: "square", gain: 0.06, delay: 0.09, release: 0.018 });
      break;
    case "notify":
      tone({ freq: 1175, duration: 0.038, type: "square", gain: 0.085, release: 0.018 });
      tone({ freq: 1175, duration: 0.06, type: "square", gain: 0.075, delay: 0.13, release: 0.03 });
      break;
    case "message":
      tone({ freq: 740, duration: 0.022, type: "square", gain: 0.075, release: 0.01 });
      tone({ freq: 980, duration: 0.022, type: "square", gain: 0.07, delay: 0.045, release: 0.01 });
      tone({ freq: 740, duration: 0.03, type: "square", gain: 0.065, delay: 0.09, release: 0.014 });
      break;
    case "open":
      tone({ freq: 330, glideTo: 1320, duration: 0.14, type: "square", gain: 0.09, release: 0.05 });
      noiseBurst(0.08, 0.025, 2800);
      break;
    case "close":
      tone({ freq: 1320, glideTo: 260, duration: 0.13, type: "square", gain: 0.085, release: 0.05 });
      break;
    case "whoosh":
      noiseBurst(0.24, 0.085, 1800);
      break;
    case "bubble":
      tone({ freq: 360, glideTo: 960, duration: 0.07, type: "square", gain: 0.075, release: 0.03 });
      tone({ freq: 480, glideTo: 1440, duration: 0.075, type: "square", gain: 0.07, delay: 0.08, release: 0.03 });
      break;
    case "coin":
      tone({ freq: 988, duration: 0.035, type: "square", gain: 0.11, release: 0.015 });
      tone({ freq: 1976, duration: 0.08, type: "square", gain: 0.095, delay: 0.035, release: 0.04 });
      break;
    case "levelUp":
      [392, 523.25, 659.25, 783.99, 1046.5, 1568].forEach((freq, index) =>
        tone({ freq, duration: 0.035, type: "square", gain: 0.08, delay: index * 0.035, release: 0.016 }),
      );
      break;
    case "chime":
      [1046.5, 1568, 2093, 2637].forEach((freq, index) =>
        tone({ freq, duration: 0.052, type: "square", gain: 0.062, delay: index * 0.055, release: 0.025 }),
      );
      break;
    case "drop":
      tone({ freq: 1180, glideTo: 160, duration: 0.18, type: "square", gain: 0.095, release: 0.07 });
      tone({ freq: 120, duration: 0.035, type: "square", gain: 0.06, delay: 0.14, release: 0.016 });
      break;
    case "slider":
      tone({ freq: 620, duration: 0.014, type: "square", gain: 0.025, release: 0.006 });
      break;
    case "snap":
      tone({ freq: 880, duration: 0.018, type: "square", gain: 0.095, release: 0.008 });
      tone({ freq: 1760, duration: 0.035, type: "square", gain: 0.075, delay: 0.018, release: 0.014 });
      break;
    case "check":
      tone({ freq: 660, duration: 0.025, type: "square", gain: 0.08, release: 0.01 });
      tone({ freq: 1320, duration: 0.055, type: "square", gain: 0.085, delay: 0.03, release: 0.024 });
      break;
    case "uncheck":
      tone({ freq: 1320, duration: 0.022, type: "square", gain: 0.075, release: 0.01 });
      tone({ freq: 520, duration: 0.05, type: "square", gain: 0.065, delay: 0.028, release: 0.022 });
      break;
    case "radio":
      tone({ freq: 980, duration: 0.028, type: "square", gain: 0.075, release: 0.012 });
      tone({ freq: 1220, duration: 0.028, type: "square", gain: 0.055, delay: 0.026, release: 0.012 });
      break;
    case "tab":
      tone({ freq: 740, duration: 0.02, type: "square", gain: 0.07, release: 0.009 });
      tone({ freq: 1040, duration: 0.024, type: "square", gain: 0.065, delay: 0.028, release: 0.011 });
      break;
    case "menuOpen":
      [420, 620, 880].forEach((freq, index) =>
        tone({ freq, duration: 0.025, type: "square", gain: 0.065, delay: index * 0.028, release: 0.011 }),
      );
      noiseBurst(0.055, 0.024, 2600);
      break;
    case "select":
      tone({ freq: 1040, duration: 0.032, type: "square", gain: 0.085, release: 0.014 });
      tone({ freq: 1560, duration: 0.04, type: "square", gain: 0.06, delay: 0.028, release: 0.018 });
      break;
    case "type":
      playTypeNote("pixel", step);
      break;
    case "rain":
      noiseBurst(0.48, 0.045, 1800);
      tone({ freq: 1800, duration: 0.018, type: "square", gain: 0.035, release: 0.008 });
      tone({ freq: 2400, duration: 0.018, type: "square", gain: 0.03, delay: 0.075, release: 0.008 });
      break;
    case "wind":
      noiseBurst(0.5, 0.035, 760);
      tone({ freq: 240, duration: 0.04, type: "square", gain: 0.035, release: 0.018 });
      tone({ freq: 320, duration: 0.05, type: "square", gain: 0.032, delay: 0.11, release: 0.02 });
      break;
    case "storm":
      noiseBurst(0.55, 0.05, 900);
      tone({ freq: 90, duration: 0.08, type: "square", gain: 0.07, release: 0.04 });
      tone({ freq: 55, duration: 0.09, type: "square", gain: 0.055, delay: 0.07, release: 0.05 });
      break;
  }
}

function playClearChime(name: SoundName, step?: number) {
  switch (name) {
    case "click":
      tone({ freq: 554.37, duration: 0.09, type: "sine", gain: 0.12, release: 0.07 });
      tone({ freq: 831.61, duration: 0.16, type: "sine", gain: 0.07, delay: 0.035, release: 0.13 });
      break;
    case "tap":
      tone({ freq: 1046.5, duration: 0.055, type: "sine", gain: 0.075, release: 0.04 });
      break;
    case "pop":
      tone({ freq: 392, glideTo: 1174.66, duration: 0.17, type: "sine", gain: 0.105, release: 0.1 });
      tone({ freq: 1568, duration: 0.12, type: "sine", gain: 0.055, delay: 0.11, release: 0.09 });
      break;
    case "hover":
      tone({ freq: 1396.91, duration: 0.07, type: "sine", gain: 0.045, release: 0.055 });
      break;
    case "toggleOn":
      tone({ freq: 493.88, duration: 0.09, type: "sine", gain: 0.09, release: 0.07 });
      tone({ freq: 987.77, duration: 0.18, type: "sine", gain: 0.1, delay: 0.075, release: 0.14 });
      break;
    case "toggleOff":
      tone({ freq: 987.77, duration: 0.08, type: "sine", gain: 0.085, release: 0.06 });
      tone({ freq: 369.99, duration: 0.17, type: "sine", gain: 0.075, delay: 0.07, release: 0.13 });
      break;
    case "unlock":
      noiseBurst(0.06, 0.035, 4600);
      tone({ freq: 739.99, duration: 0.07, type: "sine", gain: 0.09, delay: 0.045, release: 0.05 });
      tone({ freq: 1479.98, duration: 0.24, type: "sine", gain: 0.095, delay: 0.105, release: 0.2 });
      break;
    case "success":
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) =>
        tone({ freq, duration: 0.2, type: "sine", gain: 0.085, delay: index * 0.095, release: 0.16 }),
      );
      break;
    case "error":
      tone({ freq: 987.77, glideTo: 830.61, duration: 0.12, type: "sine", gain: 0.075, release: 0.08 });
      tone({ freq: 659.25, duration: 0.16, type: "sine", gain: 0.065, delay: 0.09, release: 0.11 });
      break;
    case "notify":
      tone({ freq: 880, duration: 0.14, type: "sine", gain: 0.09, release: 0.11 });
      tone({ freq: 1318.51, duration: 0.22, type: "sine", gain: 0.08, delay: 0.15, release: 0.18 });
      break;
    case "message":
      tone({ freq: 587.33, duration: 0.075, type: "sine", gain: 0.08, release: 0.055 });
      tone({ freq: 739.99, duration: 0.075, type: "sine", gain: 0.075, delay: 0.08, release: 0.055 });
      tone({ freq: 587.33, duration: 0.12, type: "sine", gain: 0.065, delay: 0.16, release: 0.1 });
      break;
    case "open":
      tone({ freq: 349.23, glideTo: 1046.5, duration: 0.28, type: "sine", gain: 0.095, release: 0.2 });
      noiseBurst(0.12, 0.025, 5200);
      break;
    case "close":
      tone({ freq: 1046.5, glideTo: 329.63, duration: 0.25, type: "sine", gain: 0.09, release: 0.18 });
      break;
    case "whoosh":
      noiseBurst(0.36, 0.07, 2600);
      break;
    case "bubble":
      tone({ freq: 330, glideTo: 880, duration: 0.13, type: "sine", gain: 0.08, release: 0.075 });
      tone({ freq: 440, glideTo: 1318.51, duration: 0.16, type: "sine", gain: 0.075, delay: 0.11, release: 0.09 });
      break;
    case "coin":
      tone({ freq: 1046.5, duration: 0.07, type: "sine", gain: 0.1, release: 0.045 });
      tone({ freq: 1760, duration: 0.18, type: "sine", gain: 0.085, delay: 0.06, release: 0.14 });
      break;
    case "levelUp":
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, index) =>
        tone({ freq, duration: 0.16, type: "sine", gain: 0.075, delay: index * 0.075, release: 0.13 }),
      );
      break;
    case "chime":
      [880, 1174.66, 1568, 2093].forEach((freq, index) =>
        tone({ freq, duration: 0.72, type: "sine", gain: 0.055, delay: index * 0.075, release: 0.6 }),
      );
      break;
    case "drop":
      tone({ freq: 932.33, glideTo: 246.94, duration: 0.32, type: "sine", gain: 0.105, release: 0.18 });
      noiseBurst(0.06, 0.02, 1000);
      break;
    case "slider":
      noiseBurst(0.04, 0.006, 3200);
      tone({ freq: 587.33, glideTo: 659.25, duration: 0.07, type: "sine", gain: 0.026, release: 0.045 });
      break;
    case "snap":
      tone({ freq: 987.77, duration: 0.05, type: "sine", gain: 0.08, release: 0.03 });
      tone({ freq: 1479.98, duration: 0.12, type: "sine", gain: 0.06, delay: 0.04, release: 0.09 });
      break;
    case "check":
      tone({ freq: 587.33, duration: 0.07, type: "sine", gain: 0.075, release: 0.05 });
      tone({ freq: 987.77, duration: 0.16, type: "sine", gain: 0.08, delay: 0.06, release: 0.12 });
      break;
    case "uncheck":
      tone({ freq: 987.77, glideTo: 440, duration: 0.17, type: "sine", gain: 0.07, release: 0.12 });
      break;
    case "radio":
      tone({ freq: 739.99, duration: 0.09, type: "sine", gain: 0.065, release: 0.07 });
      tone({ freq: 1108.73, duration: 0.11, type: "sine", gain: 0.045, delay: 0.05, release: 0.09 });
      break;
    case "tab":
      tone({ freq: 659.25, duration: 0.08, type: "sine", gain: 0.065, release: 0.055 });
      tone({ freq: 880, duration: 0.1, type: "sine", gain: 0.06, delay: 0.065, release: 0.075 });
      break;
    case "menuOpen":
      tone({ freq: 392, glideTo: 1174.66, duration: 0.24, type: "sine", gain: 0.075, release: 0.18 });
      noiseBurst(0.1, 0.018, 5200);
      break;
    case "select":
      tone({ freq: 880, duration: 0.055, type: "sine", gain: 0.075, release: 0.035 });
      tone({ freq: 1318.51, duration: 0.12, type: "sine", gain: 0.06, delay: 0.05, release: 0.09 });
      break;
    case "type":
      playTypeNote("clearChime", step);
      break;
    case "rain":
      noiseBurst(0.7, 0.032, 3600);
      tone({ freq: 1174.66, duration: 0.18, type: "sine", gain: 0.04, release: 0.14 });
      tone({ freq: 1568, duration: 0.22, type: "sine", gain: 0.032, delay: 0.12, release: 0.18 });
      break;
    case "wind":
      noiseBurst(0.76, 0.026, 1600);
      tone({ freq: 392, glideTo: 587.33, duration: 0.48, type: "sine", gain: 0.042, release: 0.34 });
      break;
    case "storm":
      noiseBurst(0.72, 0.04, 1400);
      tone({ freq: 146.83, glideTo: 98, duration: 0.45, type: "triangle", gain: 0.065, release: 0.3 });
      tone({ freq: 880, duration: 0.1, type: "sine", gain: 0.035, delay: 0.08, release: 0.08 });
      break;
  }
}

export const soundThemes = {
  softFeedback: { play: playSoftFeedback },
  pixel: { play: playPixel },
  clearChime: { play: playClearChime },
} as const;

export type SoundThemeName = keyof typeof soundThemes;

export function sourceForTheme(theme: SoundThemeName): string {
  const fn = soundThemes[theme].play.toString();
  return `// Game UI sound theme — ${theme}
const ctx = new (window.AudioContext || window.webkitAudioContext)();

function tone(o) {
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + o.duration);
  const peak = o.gain ?? 0.18, a = o.attack ?? 0.005, r = o.release ?? 0.08;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.linearRampToValueAtTime(peak, t0 + o.duration - r);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + o.duration + 0.02);
}

function noiseBurst(duration, gain = 0.08, lp = 2000) {
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0); src.stop(t0 + duration);
}

export const playThemeSound = ${fn};
`;
}

/** Source snippet used in the "Copy code" action — single sound playable standalone. */
export function sourceFor(name: SoundName): string {
  const fn = sounds[name].toString();
  return `// Animal Island UI sound — ${name}
const ctx = new (window.AudioContext || window.webkitAudioContext)();

function tone(o) {
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + o.duration);
  const peak = o.gain ?? 0.18, a = o.attack ?? 0.005, r = o.release ?? 0.08;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.linearRampToValueAtTime(peak, t0 + o.duration - r);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + o.duration + 0.02);
}

function noiseBurst(duration, gain = 0.08, lp = 2000) {
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0); src.stop(t0 + duration);
}

export const play${name[0].toUpperCase() + name.slice(1)} = ${fn};
`;
}
