export type VoiceId = 'click' | 'snare' | 'kick' | 'ride' | 'hihat' | 'tom' | 'none';
export type MetroUnit = 'bar' | 'beat' | 'eighth';
export type SigId = '2/4' | '3/4' | '4/4' | '6/8' | '12/8';
export type StickingId =
  | 'singles'
  | 'doubles'
  | 'triples'
  | 'quadruples'
  | 'single-paradiddle'
  | 'double-paradiddle'
  | 'paradiddle-diddle';

export type Setup = {
  version: 1;
  sig: SigId;
  bpm: number;
  bars: number;
  metronome: boolean;
  metroUnit: MetroUnit;
  metroVoice: Exclude<VoiceId, 'none'>;
  right: VoiceId;
  left: VoiceId;
  notesPerBar: number;
  sticking: StickingId;
  shown: number[];
  selection: string[];
};

export const STICKINGS: { id: StickingId; label: string; pattern: ('R' | 'L')[] }[] = [
  { id: 'singles', label: 'Singles', pattern: ['R', 'L'] },
  { id: 'doubles', label: 'Doubles', pattern: ['R', 'R', 'L', 'L'] },
  { id: 'triples', label: 'Triples', pattern: ['R', 'R', 'R', 'L', 'L', 'L'] },
  { id: 'quadruples', label: 'Quadruples', pattern: ['R', 'R', 'R', 'R', 'L', 'L', 'L', 'L'] },
  { id: 'single-paradiddle', label: 'Single paradiddle', pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'] },
  {
    id: 'double-paradiddle',
    label: 'Double paradiddle',
    pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L'],
  },
  {
    id: 'paradiddle-diddle',
    label: 'Paradiddle-diddle',
    pattern: ['R', 'L', 'R', 'R', 'L', 'L'],
  },
];

export const VOICES: { id: VoiceId; label: string; note?: string }[] = [
  { id: 'click', label: 'Metronome click' },
  { id: 'snare', label: 'Snare', note: 'c/5' },
  { id: 'kick', label: 'Bass drum', note: 'f/4' },
  { id: 'ride', label: 'Ride', note: 'f/5' },
  { id: 'hihat', label: 'Hi-hat', note: 'g/5' },
  { id: 'tom', label: 'Tom', note: 'e/5' },
  { id: 'none', label: 'No sound' },
];

export const SIGNATURES: { id: SigId; num: number; den: number }[] = [
  { id: '2/4', num: 2, den: 4 },
  { id: '3/4', num: 3, den: 4 },
  { id: '4/4', num: 4, den: 4 },
  { id: '6/8', num: 6, den: 8 },
  { id: '12/8', num: 12, den: 8 },
];

export const NOTES_PER_BAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export const DEFAULT_SETUP: Setup = {
  version: 1,
  sig: '4/4',
  bpm: 80,
  bars: 2,
  metronome: true,
  metroUnit: 'beat',
  metroVoice: 'click',
  right: 'snare',
  left: 'kick',
  notesPerBar: 12,
  sticking: 'singles',
  shown: NOTES_PER_BAR.slice(),
  selection: [],
};

const PLAIN: Record<number, string> = { 4: 'w', 2: 'h', 1: 'q', 0.5: '8', 0.25: '16', 0.125: '32' };
const DOTTED: Record<number, number> = { 6: 4, 3: 2, 1.5: 1, 0.75: 0.5, 0.375: 0.25, 0.1875: 0.125 };
const VALUE_NAMES: Record<string, string> = {
  w: 'whole',
  h: 'half',
  q: 'quarter',
  8: 'eighth',
  16: '16th',
  32: '32nd',
};

export const signatureOf = (setup: Setup) => SIGNATURES.find((s) => s.id === setup.sig) ?? SIGNATURES[2];

export const barQuarters = (setup: Setup) => {
  const s = signatureOf(setup);
  return (s.num * 4) / s.den;
};

export const beatsPerBar = (setup: Setup) => {
  const s = signatureOf(setup);
  return s.den === 8 && s.num % 3 === 0 ? s.num / 3 : s.num;
};

export const compound = (setup: Setup) => {
  const s = signatureOf(setup);
  return s.den === 8 && s.num % 3 === 0;
};

export function clicksPerBar(setup: Setup) {
  if (setup.metroUnit === 'bar') return 1;
  if (setup.metroUnit === 'eighth') {
    const s = signatureOf(setup);
    return s.num * (8 / s.den);
  }
  return beatsPerBar(setup);
}

export function clickValue(setup: Setup): { duration: string; dots: number } {
  const q = barQuarters(setup) / clicksPerBar(setup);
  if (PLAIN[q]) return { duration: PLAIN[q], dots: 0 };
  if (DOTTED[q]) return { duration: PLAIN[DOTTED[q]], dots: 1 };
  return { duration: 'q', dots: 0 };
}

export type Grouping = {
  duration: string;
  dots: number;
  ratio: [number, number] | null;
  group: number;
};

// Written note value, dots, tuplet ratio and group for N notes per bar.
export function grouping(setup: Setup, n: number): Grouping {
  const Q = barQuarters(setup);
  const stroke = Q / n;
  const beats = beatsPerBar(setup);
  const perBeat = n / beats;
  const plainGroup = Number.isInteger(perBeat) && perBeat >= 1 ? perBeat : 1;

  if (Q === 4 && n % 3 === 0) {
    const k = n / 3;
    if ([1, 2, 4, 8].includes(k)) {
      return { duration: PLAIN[2 / k], dots: 0, ratio: [3, 2], group: 3 };
    }
  }
  if (PLAIN[stroke]) return { duration: PLAIN[stroke], dots: 0, ratio: null, group: plainGroup };
  if (DOTTED[stroke]) return { duration: PLAIN[DOTTED[stroke]], dots: 1, ratio: null, group: plainGroup };

  const values = [0.125, 0.25, 0.5, 1, 2, 4];
  const value = values.find((v) => v >= stroke) ?? 4;
  return { duration: PLAIN[value], dots: 0, ratio: [n, Q / value], group: n };
}

export function nameFor(setup: Setup, n: number) {
  const g = grouping(setup, n);
  if (g.ratio) {
    if (g.ratio[0] === 3 && g.ratio[1] === 2) {
      const base = VALUE_NAMES[g.duration] ?? '';
      return n === 3 ? `${base} triplet` : `${base} triplets`;
    }
    return `${g.ratio[0]}:${g.ratio[1]}`;
  }
  const base = VALUE_NAMES[g.duration] ?? '';
  return g.dots ? `dotted ${base}` : base;
}

export const stickingById = (id: StickingId) => STICKINGS.find((s) => s.id === id) ?? STICKINGS[0];
export const voiceById = (id: VoiceId) => VOICES.find((v) => v.id === id) ?? VOICES[VOICES.length - 1];
export const voiceLabel = (id: VoiceId) => voiceById(id).label;

export const currentKey = (setup: Setup) => `${setup.sticking}|${setup.notesPerBar}`;

export type PlanStep = {
  id: number;
  key: string;
  sticking: StickingId;
  n: number;
  bars: number;
  metronome: boolean;
  metroVoice: Setup['metroVoice'];
  right: VoiceId;
  left: VoiceId;
};

export function planSteps(setup: Setup): PlanStep[] {
  const keys = setup.selection.length ? setup.selection : [currentKey(setup)];
  const steps: PlanStep[] = [];
  keys.forEach((key, id) => {
    const [sticking, n] = key.split('|');
    if (!sticking || !n) return;
    const count = Number(n);
    if (!NOTES_PER_BAR.includes(count)) return;
    steps.push({
      id,
      key,
      sticking: stickingById(sticking as StickingId).id,
      n: count,
      bars: setup.bars,
      metronome: setup.metronome,
      metroVoice: setup.metroVoice,
      right: setup.right,
      left: setup.left,
    });
  });
  if (!steps.length) {
    steps.push({
      id: 0,
      key: currentKey(setup),
      sticking: setup.sticking,
      n: setup.notesPerBar,
      bars: setup.bars,
      metronome: setup.metronome,
      metroVoice: setup.metroVoice,
      right: setup.right,
      left: setup.left,
    });
  }
  return steps;
}

export type PlanBar = { step: PlanStep; barInStep: number };

export function planBars(setup: Setup): PlanBar[] {
  const bars: PlanBar[] = [];
  for (const step of planSteps(setup)) {
    for (let b = 0; b < step.bars; b += 1) bars.push({ step, barInStep: b });
  }
  return bars;
}

export function strokeHands(setup: Setup, stickingId: StickingId, count: number) {
  const pattern = stickingById(stickingId).pattern;
  return Array.from({ length: count }, (_, i) => pattern[i % pattern.length]);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const numberOr = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeSetup(raw: unknown): Setup {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<Setup>;
  const sig = SIGNATURES.some((s) => s.id === input.sig) ? (input.sig as SigId) : DEFAULT_SETUP.sig;
  const sticking = STICKINGS.some((s) => s.id === input.sticking)
    ? (input.sticking as StickingId)
    : DEFAULT_SETUP.sticking;
  const voice = (id: unknown, fallback: VoiceId): VoiceId =>
    VOICES.some((v) => v.id === id) ? (id as VoiceId) : fallback;
  const metroVoice = (() => {
    const id = input.metroVoice as VoiceId | undefined;
    return id && id !== 'none' && VOICES.some((v) => v.id === id)
      ? (id as Setup['metroVoice'])
      : DEFAULT_SETUP.metroVoice;
  })();
  const shown = Array.isArray(input.shown)
    ? [...new Set(input.shown.map(Number).filter((n) => NOTES_PER_BAR.includes(n)))].sort((a, b) => a - b)
    : DEFAULT_SETUP.shown.slice();
  const selection = Array.isArray(input.selection)
    ? input.selection.filter(
        (key) =>
          typeof key === 'string' &&
          /^[a-z-]+\|\d+$/.test(key) &&
          STICKINGS.some((s) => s.id === key.split('|')[0]) &&
          NOTES_PER_BAR.includes(Number(key.split('|')[1])),
      )
    : [];

  return {
    version: 1,
    sig,
    bpm: clamp(numberOr(input.bpm, DEFAULT_SETUP.bpm), 30, 200),
    bars: clamp(numberOr(input.bars, DEFAULT_SETUP.bars), 1, 16),
    metronome: input.metronome !== false,
    metroUnit: ['bar', 'beat', 'eighth'].includes(input.metroUnit as string)
      ? (input.metroUnit as MetroUnit)
      : DEFAULT_SETUP.metroUnit,
    metroVoice,
    right: voice(input.right, DEFAULT_SETUP.right),
    left: voice(input.left, DEFAULT_SETUP.left),
    notesPerBar: NOTES_PER_BAR.includes(Number(input.notesPerBar))
      ? Number(input.notesPerBar)
      : DEFAULT_SETUP.notesPerBar,
    sticking,
    shown: shown.length ? shown : DEFAULT_SETUP.shown.slice(),
    selection,
  };
}
