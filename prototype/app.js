import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  Tuplet,
  Dot,
  Barline,
} from 'vexflow';

// ---------------------------------------------------------------------------
// Model. A combination is notes per bar plus a sticking, played for some bars.
// ---------------------------------------------------------------------------

const STICKINGS = [
  { id: 'singles', label: 'Singles', pattern: ['R', 'L'] },
  { id: 'doubles', label: 'Doubles', pattern: ['R', 'R', 'L', 'L'] },
  { id: 'single-paradiddle', label: 'Single paradiddle', pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'] },
  { id: 'double-paradiddle', label: 'Double paradiddle', pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L'] },
  { id: 'paradiddle-diddle', label: 'Paradiddle-diddle', pattern: ['R', 'L', 'R', 'R', 'L', 'L'] },
];

const VOICES = [
  { id: 'click', label: 'Metronome click' },
  { id: 'snare', label: 'Snare', note: 'c/5' },
  { id: 'kick', label: 'Bass drum', note: 'f/4' },
  { id: 'ride', label: 'Ride', note: 'f/5' },
  { id: 'hihat', label: 'Hi-hat', note: 'g/5' },
  { id: 'tom', label: 'Tom', note: 'e/5' },
  { id: 'none', label: 'No sound' },
];

const SIGNATURES = [
  { id: '2/4', num: 2, den: 4 },
  { id: '3/4', num: 3, den: 4 },
  { id: '4/4', num: 4, den: 4 },
  { id: '6/8', num: 6, den: 8 },
  { id: '12/8', num: 12, den: 8 },
];

const RATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const COMMON_RATES = [1, 2, 3, 4, 6, 8, 12, 16];

const PLAIN = { 4: 'w', 2: 'h', 1: 'q', 0.5: '8', 0.25: '16', 0.125: '32' };
const DOTTED = { 6: 4, 3: 2, 1.5: 1, 0.75: 0.5, 0.375: 0.25, 0.1875: 0.125 };
const VALUE_NAMES = {
  w: 'whole',
  h: 'half',
  q: 'quarter',
  8: 'eighth',
  16: '16th',
  32: '32nd',
};

const state = {
  sig: '4/4',
  notesPerBar: 12,
  sticking: 'singles',
  bars: 2,
  bpm: 80,
  metronome: true,
  metroVoice: 'click',
  right: 'snare',
  left: 'kick',
  rates: COMMON_RATES.slice(),
  loop: false,
  countIn: false,
  selection: [],
  overrides: {},
  editing: null,
};

// ---------------------------------------------------------------------------
// Derived values.
// ---------------------------------------------------------------------------

const signature = () => SIGNATURES.find((s) => s.id === state.sig) || SIGNATURES[2];
const barQuarters = () => {
  const s = signature();
  return (s.num * 4) / s.den;
};
const beatsPerBar = () => {
  const s = signature();
  return s.den === 8 && s.num % 3 === 0 ? s.num / 3 : s.num;
};
const compound = () => signature().den === 8 && signature().num % 3 === 0;

const stickingById = (id) => STICKINGS.find((s) => s.id === id) || STICKINGS[0];
const sticking = () => stickingById(state.sticking);
const voiceById = (id) => VOICES.find((v) => v.id === id) || VOICES[VOICES.length - 1];
const voiceLabel = (id) => voiceById(id).label;
const currentKey = () => `${state.sticking}|${state.notesPerBar}`;

function strokeHands(stickingId, bars, n) {
  const pattern = stickingById(stickingId).pattern;
  return Array.from({ length: bars * n }, (_, i) => pattern[i % pattern.length]);
}

// Written note value, dots, tuplet ratio and grouping for N notes per bar.
function grouping(n) {
  const Q = barQuarters();
  const stroke = Q / n;
  const beats = beatsPerBar();
  const perBeat = n / beats;
  const plainGroup = Number.isInteger(perBeat) && perBeat >= 1 ? perBeat : 1;

  if (Q === 4 && n % 3 === 0) {
    const k = n / 3;
    if ([1, 2, 4, 8].includes(k)) {
      const base = 2 / k;
      return { duration: PLAIN[base], dots: 0, ratio: [3, 2], group: 3 };
    }
  }

  if (PLAIN[stroke]) return { duration: PLAIN[stroke], dots: 0, ratio: null, group: plainGroup };
  if (DOTTED[stroke]) return { duration: PLAIN[DOTTED[stroke]], dots: 1, ratio: null, group: plainGroup };

  const values = [0.125, 0.25, 0.5, 1, 2, 4];
  const value = values.find((v) => v >= stroke) || 4;
  return { duration: PLAIN[value], dots: 0, ratio: [n, Q / value], group: n };
}

function rateName(n) {
  const g = grouping(n);
  if (g.ratio) {
    if (g.ratio[0] === 3 && g.ratio[1] === 2) {
      const base = VALUE_NAMES[g.duration] || '';
      return n === 3 ? `${base} triplet` : `${base} triplets`;
    }
    return `${g.ratio[0]}:${g.ratio[1]}`;
  }
  const base = VALUE_NAMES[g.duration] || '';
  return g.dots ? `dotted ${base}` : base;
}

// ---------------------------------------------------------------------------
// Plan and overrides.
// ---------------------------------------------------------------------------

function resolveKey(key) {
  const [stickingId, n] = key.split('|');
  const over = state.overrides[key] || {};
  return {
    key,
    sticking: stickingId,
    n: Number(n),
    bars: over.bars || state.bars,
    right: over.right || state.right,
    left: over.left || state.left,
  };
}

function playPlan() {
  const keys = state.selection.length ? state.selection : [currentKey()];
  return keys.map(resolveKey);
}

function overrideCount() {
  return Object.keys(state.overrides).length;
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

function render() {
  stopSession();
  document.getElementById('app').innerHTML = shell();
  mountSheet();
  setPlayingUI();
}

function shell() {
  return `
    ${topbarHTML()}
    ${tableHTML()}
    ${configHTML()}
    ${sheetHTML()}
  `;
}

const topbarHTML = () => `
  <header class="topbar">
    <div class="brand">Drum exercises <span class="tag">prototype</span></div>
    <p class="muted small">
      Table first, settings under it, sheet at the bottom. Shift-click cells to build a play order.
    </p>
  </header>
`;

function tableHTML() {
  const columns = state.rates;
  return `
    <section class="panel table-panel">
      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th class="corner">sticking</th>
              ${columns.map((n) => `
                <th>
                  <button class="colhead ${state.notesPerBar === n ? 'on' : ''}" data-act="column" data-value="${n}">
                    <b>${n}</b><span>${rateName(n)}</span>
                  </button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${STICKINGS.map((s) => `
              <tr>
                <th>
                  <button class="rowhead ${state.sticking === s.id ? 'on' : ''}" data-act="sticking" data-value="${s.id}">${s.label}</button>
                </th>
                ${columns.map((n) => cellHTML(s.id, n)).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${state.editing ? editorHTML(state.editing) : ''}
      <p class="muted small">
        Click a cell to open it in the sheet. Shift-click or shift-drag to add it to the play
        order; click its number away to remove it. Right-click a cell for its own bars or sounds.
      </p>
    </section>
  `;
}

function cellHTML(stickingId, n) {
  const key = `${stickingId}|${n}`;
  const index = state.selection.indexOf(key);
  const active = state.sticking === stickingId && state.notesPerBar === n;
  const over = state.overrides[key];
  return `
    <td>
      <button class="cell ${active ? 'active' : ''} ${index >= 0 ? 'selected' : ''}"
        data-key="${key}" data-sticking="${stickingId}" data-column="${n}"
        title="${n} notes per bar, ${stickingById(stickingId).label}${over ? ' (has overrides)' : ''}">
        <span class="num">${index >= 0 ? index + 1 : ''}</span>
        ${over ? '<span class="mark"></span>' : ''}
      </button>
    </td>
  `;
}

function editorHTML(key) {
  const over = state.overrides[key] || {};
  const [stickingId, n] = key.split('|');
  const barsOptions = Array.from({ length: 8 }, (_, i) => i + 1);
  return `
    <div class="editor">
      <div class="editor-title">
        <b>${n} notes per bar · ${stickingById(stickingId).label}</b>
        <span class="muted small">Overrides apply when this cell plays in the order.</span>
      </div>
      <label>Bars
        <select data-act="override" data-key="${key}" data-field="bars">
          <option value="inherit">Use default (${state.bars})</option>
          ${barsOptions.map((b) => `<option value="${b}" ${over.bars === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </label>
      <label>R strokes
        <select data-act="override" data-key="${key}" data-field="right">
          <option value="inherit">Use default (${voiceLabel(state.right)})</option>
          ${VOICES.map((v) => `<option value="${v.id}" ${over.right === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <label>L strokes
        <select data-act="override" data-key="${key}" data-field="left">
          <option value="inherit">Use default (${voiceLabel(state.left)})</option>
          ${VOICES.map((v) => `<option value="${v.id}" ${over.left === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <button class="btn ghost small" data-act="clear-overrides" data-key="${key}">Clear</button>
      <button class="btn small" data-act="close-editor">Done</button>
    </div>
  `;
}

const configHTML = () => `
  <section class="panel config">
    <div class="field rates-field">
      <span class="label">Rates <span class="muted small">notes per bar</span></span>
      <div class="chips">
        ${RATES.map((n) => `
          <button class="chip ${state.rates.includes(n) ? 'on' : ''}" data-act="toggle-rate" data-value="${n}">${n}</button>
        `).join('')}
        <button class="btn ghost small" data-act="common-rates">Common</button>
        <button class="btn ghost small" data-act="all-rates">All</button>
      </div>
    </div>
    <div class="field">
      <span class="label">Metronome</span>
      <div class="row">
        <label class="check"><input type="checkbox" data-act="metronome" ${state.metronome ? 'checked' : ''} /> On</label>
        <select data-act="voice" data-which="metroVoice">
          ${VOICES.filter((v) => v.id !== 'none')
            .map((v) => `<option value="${v.id}" ${state.metroVoice === v.id ? 'selected' : ''}>${v.label}</option>`)
            .join('')}
        </select>
      </div>
    </div>
    <div class="field">
      <span class="label">Sticking sounds</span>
      <div class="voice-row">
        ${voiceSelect('right', 'R strokes')}
        ${voiceSelect('left', 'L strokes')}
      </div>
    </div>
    <div class="field">
      <span class="label">Playback</span>
      <div class="row">
        <label class="check"><input type="checkbox" data-act="loop" ${state.loop ? 'checked' : ''} /> Loop</label>
        <label class="check"><input type="checkbox" data-act="countin" ${state.countIn ? 'checked' : ''} /> Count-in</label>
      </div>
    </div>
  </section>
`;

const voiceSelect = (which, label) => `
  <label>
    ${label}
    <select data-act="voice" data-which="${which}">
      ${VOICES.map((v) => `<option value="${v.id}" ${state[which] === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
    </select>
  </label>
`;

function sheetHTML() {
  const g = grouping(state.notesPerBar);
  const beats = beatsPerBar();
  const plan = playPlan();
  const order = state.selection.length
    ? `${plan.length} ${plan.length === 1 ? 'cell' : 'cells'} in play order`
    : 'playing this cell';
  return `
    <section class="panel practice">
      <header class="combo-head">
        <div>
          <h2>${state.notesPerBar} notes per bar <span class="note-name">(${rateName(state.notesPerBar)})</span></h2>
          <p class="muted">
            ${sticking().label} · ${state.bars} ${state.bars === 1 ? 'bar' : 'bars'} · ${state.sig} ·
            ${state.bars * state.notesPerBar} strokes · <span data-order>${order}</span>
          </p>
        </div>
        <div class="transport">
          <label class="inline-field">Bars
            <input type="number" min="1" max="16" value="${state.bars}" data-act="bars" />
          </label>
          <label class="inline-field">Sig
            <select data-act="sig">
              ${SIGNATURES.map((s) => `<option value="${s.id}" ${state.sig === s.id ? 'selected' : ''}>${s.id}</option>`).join('')}
            </select>
          </label>
          <label class="inline-field">Tempo <b data-bpm-label>${state.bpm}</b>
            <input type="range" min="30" max="200" step="1" value="${state.bpm}" data-act="bpm" />
          </label>
          <button class="play" data-act="play">${session ? 'Stop' : 'Play'}</button>
        </div>
      </header>
      <div class="sheet" data-sheet></div>
      <div class="transport-row">
        <span class="status" data-status></span>
      </div>
      <p class="legend">
        Sticking above the staff. R on ${voiceLabel(state.right)}, L on ${voiceLabel(state.left)}.
        ${state.metronome ? `Metronome on ${beats} ${beats === 1 ? 'beat' : 'beats'} per bar on ${voiceLabel(state.metroVoice)}.` : 'Metronome off.'}
        ${g.ratio ? ` Notation is a ${g.ratio[0]}:${g.ratio[1]} tuplet.` : ''}
      </p>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Notation. Up to four bars per line.
// ---------------------------------------------------------------------------

let noteMeta = [];

function mountSheet() {
  const host = document.querySelector('[data-sheet]');
  if (!host) return;
  host.innerHTML = '';
  host.removeAttribute('style');
  noteMeta = [];

  const width = Math.max(300, Math.floor(host.getBoundingClientRect().width - 8));
  const minBarWidth = 24 * state.notesPerBar + 40;
  const barsPerLine = Math.max(1, Math.min(4, Math.floor((width - 20) / (minBarWidth + 10))));
  const systems = Math.max(1, Math.ceil(state.bars / barsPerLine));
  const systemHeight = 186;
  const height = systems * systemHeight + 34;

  const renderer = new Renderer(host, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  const spec = grouping(state.notesPerBar);
  const hands = strokeHands(state.sticking, state.bars, state.notesPerBar);
  const beatNote = compound() ? 1.5 : 1;
  const metroDuration = compound() ? 'q' : 'q';
  const showMetronome = state.metronome && Boolean(voiceById(state.metroVoice).note);
  const beats = beatsPerBar();

  for (let bar = 0; bar < state.bars; bar += 1) {
    const system = Math.floor(bar / barsPerLine);
    const col = bar % barsPerLine;
    const cols = Math.min(barsPerLine, state.bars - system * barsPerLine);
    const gap = 16;
    const barWidth = Math.floor((width - 20 - gap * (cols - 1)) / cols);
    const x = 10 + col * (barWidth + gap);
    const y = system * systemHeight + 64;

    const stave = new Stave(x, y, barWidth);
    if (col === 0) stave.addClef('percussion');
    stave.setBegBarType(col === 0 ? Barline.type.SINGLE : Barline.type.NONE);
    stave.setEndBarType(Barline.type.SINGLE);
    stave.setContext(ctx).draw();
    const staffTop = stave.getYForLine(0);
    ctx.setFillStyle('#1b1b1a');

    const groups = [];
    let cursor = 0;
    while (cursor < state.notesPerBar) {
      const size = Math.min(spec.group, state.notesPerBar - cursor);
      const group = [];
      for (let k = 0; k < size; k += 1) {
        const index = bar * state.notesPerBar + cursor + k;
        const hand = hands[index];
        const def = voiceById(hand === 'R' ? state.right : state.left);
        const note = new StaveNote({
          keys: [def.note || 'c/5'],
          duration: spec.duration,
          clef: 'percussion',
        });
        note.setStemDirection(-1);
        if (spec.dots) Dot.buildAndAttach([note], { all: true });
        note.__index = index;
        group.push(note);
      }
      groups.push(group);
      cursor += size;
    }

    const all = groups.flat();
    const tuplets = spec.ratio
      ? groups.map((g) => new Tuplet(g, {
        numNotes: spec.ratio[0],
        notesOccupied: spec.ratio[1],
        bracketed: false,
        location: -1,
      }))
      : [];
    const beams = (spec.duration === '8' || spec.duration === '16' || spec.duration === '32')
      ? groups.filter((g) => g.length > 1).map((g) => {
        const beam = new Beam(g);
        beam.renderOptions.flatBeams = true;
        return beam;
      })
      : [];

    const voices = [
      new Voice({ numBeats: barQuarters(), beatValue: 4 }).setStrict(false).addTickables(all),
    ];

    if (showMetronome) {
      const metroNote = voiceById(state.metroVoice).note;
      const metroNotes = Array.from({ length: beats }, () => {
        const note = new StaveNote({ keys: [metroNote], duration: metroDuration, clef: 'percussion' });
        note.setStemDirection(1);
        if (beatNote === 1.5) Dot.buildAndAttach([note], { all: true });
        return note;
      });
      voices.push(new Voice({ numBeats: barQuarters(), beatValue: 4 }).setStrict(false).addTickables(metroNotes));
    }

    const formatter = new Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    formatter.format(voices, barWidth - (col === 0 ? 60 : 24));
    voices.forEach((v) => v.draw(ctx, stave));
    beams.forEach((beam) => beam.setContext(ctx).draw());
    tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());

    ctx.setFont('Arial', barWidth < 360 ? 9 : 11, 700);
    ctx.setFillStyle('#1b1b1a');
    for (const note of all) {
      const nx = note.getAbsoluteX();
      ctx.fillText(hands[note.__index], nx + 1, staffTop - 58);
      noteMeta.push({ index: note.__index, x: nx + 1, staffTop });
    }
    ctx.setFont('Arial', 9, 400);
    ctx.setFillStyle('#8a867c');
    ctx.fillText(`${bar + 1}`, x + 4, staffTop - 8);
  }

  const cursorEl = document.createElement('div');
  cursorEl.className = 'cursor';
  cursorEl.hidden = true;
  host.appendChild(cursorEl);
}

// ---------------------------------------------------------------------------
// Audio.
// ---------------------------------------------------------------------------

let audioContext = null;
let noiseBuffer = null;
let session = null;

function audio() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

function noise(ctx) {
  if (!noiseBuffer) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function percussive(gainNode, t, peak, attack, decay) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function hit(kind, time, sink) {
  if (!kind || kind === 'none') return;
  const ctx = audio();
  const t = Math.max(time, ctx.currentTime + 0.001);

  if (kind === 'click') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    percussive(gain, t, 0.16, 0.002, 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
    sink.push(osc);
    return;
  }

  if (kind === 'snare') {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    percussive(gain, t, 0.32, 0.002, 0.16);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.22);
    sink.push(src);
    return;
  }

  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    percussive(gain, t, 0.7, 0.003, 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
    sink.push(osc);
    return;
  }

  if (kind === 'tom') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    percussive(gain, t, 0.42, 0.003, 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
    sink.push(osc);
    return;
  }

  if (kind === 'hihat') {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const gain = ctx.createGain();
    percussive(gain, t, 0.16, 0.001, 0.05);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.08);
    sink.push(src);
    return;
  }

  if (kind === 'ride') {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    percussive(gain, t, 0.18, 0.002, 0.55);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.6);
    sink.push(src);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(640, t);
    percussive(pingGain, t, 0.045, 0.002, 0.2);
    ping.connect(pingGain).connect(ctx.destination);
    ping.start(t);
    ping.stop(t + 0.25);
    sink.push(ping);
  }
}

function schedulePlan(base, plan, beat) {
  const bpb = beatsPerBar();
  const barDuration = bpb * beat;
  const steps = [];
  let time = base;

  for (const step of plan) {
    const stroke = barDuration / step.n;
    const count = step.bars * step.n;
    const pattern = stickingById(step.sticking).pattern;
    for (let i = 0; i < count; i += 1) {
      const hand = pattern[i % pattern.length];
      hit(hand === 'R' ? step.right : step.left, time + i * stroke, session.sources);
    }
    if (state.metronome) {
      for (let b = 0; b < step.bars * bpb; b += 1) {
        hit(state.metroVoice, time + b * beat, session.sources);
      }
    }
    const duration = step.bars * barDuration;
    steps.push({
      key: step.key,
      start: time - base,
      end: time - base + duration,
      n: step.n,
      bars: step.bars,
      count,
      sticking: step.sticking,
    });
    time += duration;
  }

  return { steps, duration: time - base };
}

function startSession() {
  const ctx = audio();
  ctx.resume();
  stopSession();

  const beat = 60 / state.bpm;
  const countInBeats = state.countIn ? beatsPerBar() : 0;
  const start = ctx.currentTime + 0.25 + countInBeats * beat;

  session = { sources: [], timer: 0, raf: 0, playingKey: null };

  for (let b = 0; b < countInBeats; b += 1) {
    hit('click', ctx.currentTime + 0.25 + b * beat, session.sources);
  }

  const plan = playPlan();
  const scheduled = schedulePlan(start, plan, beat);
  session.start = start;
  session.pass = 0;
  session.passDuration = scheduled.duration;
  session.beat = beat;
  session.steps = scheduled.steps;
  session.single = plan.length === 1;

  if (state.loop) scheduleLoop();
  setPlayingUI();
  tick();
}

function scheduleLoop() {
  if (!session) return;
  const ctx = audio();
  const boundary = session.start + (session.pass + 1) * session.passDuration;
  const delay = Math.max(0, (boundary - ctx.currentTime - 0.05) * 1000);
  session.timer = setTimeout(() => {
    if (!session) return;
    session.pass += 1;
    const next = session.start + session.pass * session.passDuration;
    schedulePlan(next, playPlan(), session.beat);
    if (state.loop) scheduleLoop();
  }, delay);
}

function tick() {
  if (!session) return;
  const ctx = audio();
  const elapsed = ctx.currentTime - session.start;
  const status = document.querySelector('[data-status]');

  if (elapsed < 0) {
    hideCursor();
    if (status) {
      status.textContent = state.countIn
        ? `Count-in ${Math.min(beatsPerBar(), Math.max(1, Math.ceil(-elapsed / session.beat - 0.001)))}`
        : 'Starting';
    }
  } else if (elapsed >= session.passDuration && !state.loop) {
    stopSession();
    return;
  } else {
    const inPass = elapsed % session.passDuration;
    const step = session.steps.find((s) => inPass >= s.start && inPass < s.end) || session.steps[session.steps.length - 1];

    if (step) {
      highlightCell(step.key);
      if (session.single) {
        const stroke = (step.end - step.start) / step.count;
        const index = Math.min(noteMeta.length - 1, Math.max(0, Math.floor((inPass - step.start) / stroke)));
        const meta = noteMeta[index];
        const cursor = document.querySelector('.cursor');
        if (cursor && meta) {
          cursor.hidden = false;
          cursor.style.left = `${meta.x + 1}px`;
          cursor.style.top = `${meta.staffTop - 30}px`;
          cursor.style.height = '78px';
        }
        if (status) status.textContent = `Stroke ${index + 1} of ${noteMeta.length}`;
      } else {
        hideCursor();
        const i = session.steps.indexOf(step) + 1;
        if (status) {
          status.textContent = `Step ${i} of ${session.steps.length} · ${step.n} notes/bar · ${stickingById(step.sticking).label}`;
        }
      }
    }
  }
  session.raf = requestAnimationFrame(tick);
}

function highlightCell(key) {
  if (!session || session.playingKey === key) return;
  session.playingKey = key;
  document.querySelectorAll('.cell.playing').forEach((el) => el.classList.remove('playing'));
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) el.classList.add('playing');
}

function hideCursor() {
  const cursor = document.querySelector('.cursor');
  if (cursor) cursor.hidden = true;
}

function stopSession() {
  if (!session) {
    setPlayingUI();
    return;
  }
  cancelAnimationFrame(session.raf);
  clearTimeout(session.timer);
  session.sources.forEach((source) => {
    try {
      source.stop();
    } catch (error) {
      // already stopped
    }
  });
  session = null;
  hideCursor();
  document.querySelectorAll('.cell.playing').forEach((el) => el.classList.remove('playing'));
  const status = document.querySelector('[data-status]');
  if (status) status.textContent = '';
  setPlayingUI();
}

function setPlayingUI() {
  const button = document.querySelector('[data-act="play"]');
  if (button) button.textContent = session ? 'Stop' : 'Play';
}

// ---------------------------------------------------------------------------
// Selection.
// ---------------------------------------------------------------------------

function refreshSelection() {
  document.querySelectorAll('.cell[data-key]').forEach((el) => {
    const index = state.selection.indexOf(el.dataset.key);
    el.classList.toggle('selected', index >= 0);
    const num = el.querySelector('.num');
    if (num) num.textContent = index >= 0 ? index + 1 : '';
  });
  const info = document.querySelector('[data-order]');
  if (info) {
    info.textContent = state.selection.length
      ? `${state.selection.length} ${state.selection.length === 1 ? 'cell' : 'cells'} in play order`
      : 'playing this cell';
  }
}

function applySelect(key, mode) {
  const index = state.selection.indexOf(key);
  if (mode === 'add' && index < 0) state.selection.push(key);
  else if (mode === 'remove' && index >= 0) state.selection.splice(index, 1);
  refreshSelection();
}

let drag = null;

document.addEventListener('mousedown', (event) => {
  const cell = event.target.closest('[data-key]');
  if (!cell || !event.shiftKey) return;
  event.preventDefault();
  const key = cell.dataset.key;
  drag = { mode: state.selection.includes(key) ? 'remove' : 'add' };
  applySelect(key, drag.mode);
});

document.addEventListener('mouseover', (event) => {
  if (!drag) return;
  const cell = event.target.closest('[data-key]');
  if (!cell) return;
  applySelect(cell.dataset.key, drag.mode);
});

document.addEventListener('mouseup', () => {
  drag = null;
});

document.addEventListener('contextmenu', (event) => {
  const cell = event.target.closest('[data-key]');
  if (!cell) return;
  event.preventDefault();
  state.editing = cell.dataset.key;
  render();
});

// ---------------------------------------------------------------------------
// Interaction.
// ---------------------------------------------------------------------------

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act], [data-key]');
  if (!el) return;
  if (event.shiftKey) return;
  const act = el.dataset.act;

  if (el.dataset.key && !act) {
    setCombo({ sticking: el.dataset.sticking, notesPerBar: Number(el.dataset.column) });
    return;
  }

  if (act === 'column') setCombo({ notesPerBar: Number(el.dataset.value) });
  else if (act === 'sticking') setCombo({ sticking: el.dataset.value });
  else if (act === 'toggle-rate') {
    const n = Number(el.dataset.value);
    const has = state.rates.includes(n);
    const next = has ? state.rates.filter((r) => r !== n) : [...state.rates, n].sort((a, b) => a - b);
    if (!next.length) return;
    setCombo({ rates: next, notesPerBar: next.includes(state.notesPerBar) ? state.notesPerBar : next[0] });
  } else if (act === 'common-rates') {
    setCombo({ rates: COMMON_RATES.slice(), notesPerBar: 12 });
  } else if (act === 'all-rates') {
    setCombo({ rates: RATES.slice() });
  } else if (act === 'play') {
    if (session) stopSession();
    else startSession();
  } else if (act === 'close-editor') {
    state.editing = null;
    render();
  } else if (act === 'clear-overrides') {
    delete state.overrides[el.dataset.key];
    render();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'voice') setCombo({ [el.dataset.which]: el.value });
  else if (act === 'bars') setCombo({ bars: Math.min(16, Math.max(1, Number(el.value) || 1)) });
  else if (act === 'sig') setCombo({ sig: el.value });
  else if (act === 'metronome') {
    state.metronome = el.checked;
    render();
  } else if (act === 'loop') {
    state.loop = el.checked;
    if (session) {
      clearTimeout(session.timer);
      if (state.loop) scheduleLoop();
    }
  } else if (act === 'countin') {
    state.countIn = el.checked;
  } else if (act === 'override') {
    const key = el.dataset.key;
    const field = el.dataset.field;
    const value = el.value;
    const over = { ...(state.overrides[key] || {}) };
    if (value === 'inherit') delete over[field];
    else over[field] = field === 'bars' ? Number(value) : value;
    if (Object.keys(over).length) state.overrides[key] = over;
    else delete state.overrides[key];
    render();
  }
});

document.addEventListener('input', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'bpm') {
    state.bpm = Number(el.value);
    const label = document.querySelector('[data-bpm-label]');
    if (label) label.textContent = state.bpm;
  }
});

function setCombo(patch) {
  stopSession();
  Object.assign(state, patch);
  render();
}

// URL overrides so a combination is a link.
const params = new URLSearchParams(window.location.search);
const pickValue = (key, allowed) => {
  const value = params.get(key);
  return value && allowed.includes(value) ? value : null;
};
const pickNumber = (key, allowed) => {
  const value = Number(params.get(key));
  return allowed.includes(value) ? value : null;
};

state.sig = pickValue('sig', SIGNATURES.map((s) => s.id)) || state.sig;
state.notesPerBar = pickNumber('n', RATES) || state.notesPerBar;
state.sticking = pickValue('s', STICKINGS.map((s) => s.id)) || state.sticking;
state.bars = Math.min(16, Math.max(1, Number(params.get('bars')) || state.bars));
state.bpm = Math.min(200, Math.max(30, Number(params.get('bpm')) || state.bpm));
state.metronome = params.get('m') !== '0';
state.metroVoice = pickValue('mv', VOICES.map((v) => v.id)) || state.metroVoice;
state.right = pickValue('r', VOICES.map((v) => v.id)) || state.right;
state.left = pickValue('l', VOICES.map((v) => v.id)) || state.left;
const rates = (params.get('rates') || '')
  .split(',')
  .map(Number)
  .filter((n) => RATES.includes(n));
if (rates.length) state.rates = rates;
const selection = (params.get('sel') || '')
  .split(',')
  .filter(Boolean);
if (selection.length) state.selection = selection;

render();
