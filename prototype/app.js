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

const NOTES_PER_BAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const COMMON = [1, 2, 3, 4, 6, 8, 12, 16];

const PLAIN = { 4: 'w', 2: 'h', 1: 'q', 0.5: '8', 0.25: '16', 0.125: '32' };
const DOTTED = { 6: 4, 3: 2, 1.5: 1, 0.75: 0.5, 0.375: 0.25, 0.1875: 0.125 };
const VALUE_NAMES = { w: 'whole', h: 'half', q: 'quarter', 8: 'eighth', 16: '16th', 32: '32nd' };

const state = {
  sig: '4/4',
  bpm: 80,
  bars: 2,
  metronome: true,
  metroVoice: 'click',
  right: 'snare',
  left: 'kick',
  notesPerBar: 12,
  sticking: 'singles',
  shown: COMMON.slice(),
  selection: [],
  overrides: {},
  cellOnly: false,
  loop: false,
  countIn: false,
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

// Effective configuration of one cell.
function effective(key) {
  const o = state.overrides[key] || {};
  return {
    bars: o.bars ?? state.bars,
    metronome: o.metronome ?? state.metronome,
    metroVoice: o.metroVoice ?? state.metroVoice,
    right: o.right ?? state.right,
    left: o.left ?? state.left,
  };
}

const FIELDS = ['bars', 'metronome', 'metroVoice', 'right', 'left'];

function planSteps() {
  const keys = state.selection.length ? state.selection : [currentKey()];
  return keys.map((key) => {
    const [stickingId, n] = key.split('|');
    return { key, sticking: stickingId, n: Number(n), ...effective(key) };
  });
}

function planBars() {
  const bars = [];
  for (const step of planSteps()) {
    for (let b = 0; b < step.bars; b += 1) bars.push({ step, barInStep: b });
  }
  return bars;
}

function strokeHands(stickingId, count) {
  const pattern = stickingById(stickingId).pattern;
  return Array.from({ length: count }, (_, i) => pattern[i % pattern.length]);
}

// Written note value, dots, tuplet ratio and group for N notes per bar.
function grouping(n) {
  const Q = barQuarters();
  const stroke = Q / n;
  const beats = beatsPerBar();
  const perBeat = n / beats;
  const plainGroup = Number.isInteger(perBeat) && perBeat >= 1 ? perBeat : 1;

  if (Q === 4 && n % 3 === 0) {
    const k = n / 3;
    if ([1, 2, 4, 8].includes(k)) return { duration: PLAIN[2 / k], dots: 0, ratio: [3, 2], group: 3 };
  }
  if (PLAIN[stroke]) return { duration: PLAIN[stroke], dots: 0, ratio: null, group: plainGroup };
  if (DOTTED[stroke]) return { duration: PLAIN[DOTTED[stroke]], dots: 1, ratio: null, group: plainGroup };

  const values = [0.125, 0.25, 0.5, 1, 2, 4];
  const value = values.find((v) => v >= stroke) || 4;
  return { duration: PLAIN[value], dots: 0, ratio: [n, Q / value], group: n };
}

function nameFor(n) {
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
// Rendering.
// ---------------------------------------------------------------------------

function render() {
  const scrollY = window.scrollY;
  stopSession();
  document.getElementById('app').innerHTML = shell();
  mountSheet();
  setPlayingUI();
  window.scrollTo(0, scrollY);
}

function shell() {
  return `
    ${topbarHTML()}
    ${tableHTML()}
    ${sheetHTML()}
  `;
}

const topbarHTML = () => `
  <header class="topbar">
    <div class="brand">Drum exercises <span class="tag">prototype</span></div>
    <p class="muted small">Shift-click or shift-drag cells to build the score. Click a cell to open it.</p>
  </header>
`;

function currentSummary() {
  const key = currentKey();
  const e = effective(key);
  const overrides = Object.keys(state.overrides[key] || {});
  return `
    <div class="current-cell">
      <span><b>Current cell</b> ${state.notesPerBar} notes per bar · ${sticking().label}</span>
      <span class="muted">
        ${e.bars} ${e.bars === 1 ? 'bar' : 'bars'} · metronome ${e.metronome ? voiceLabel(e.metroVoice) : 'off'} ·
        R ${voiceLabel(e.right)} · L ${voiceLabel(e.left)}
      </span>
      ${overrides.length ? `
        <span class="badge">cell overrides: ${overrides.join(', ')}</span>
        <button class="btn ghost small" data-act="clear-cell">Reset cell</button>
      ` : ''}
    </div>
  `;
}

function tableHTML() {
  return `
    <section class="panel table-panel">
      <div class="rates-row">
        <span class="label">Notes per bar</span>
        <div class="chips">
          ${NOTES_PER_BAR.map((n) => `
            <button class="chip ${state.shown.includes(n) ? 'on' : ''}" data-act="toggle-rate" data-value="${n}">${n}</button>
          `).join('')}
          <button class="btn ghost small" data-act="common-rates">Common</button>
          <button class="btn ghost small" data-act="all-rates">All</button>
        </div>
      </div>
      ${currentSummary()}
      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th class="corner">sticking</th>
              ${NOTES_PER_BAR.map((n) => {
                const on = state.shown.includes(n);
                return `
                  <th class="${on ? '' : 'off'}">
                    <button class="colhead ${state.notesPerBar === n ? 'on' : ''} ${on ? '' : 'off'}"
                      data-act="column" data-value="${n}" ${on ? '' : 'disabled'}>
                      <b>${n}</b><span>${nameFor(n)}</span>
                    </button>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${STICKINGS.map((s) => `
              <tr>
                <th>
                  <button class="rowhead ${state.sticking === s.id ? 'on' : ''}" data-act="sticking" data-value="${s.id}">${s.label}</button>
                </th>
                ${NOTES_PER_BAR.map((n) => cellHTML(s.id, n)).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted small">Deselected notes per bar are greyed out. Shift-click or drag to order cells; click a number away to remove it.</p>
    </section>
  `;
}

function cellHTML(stickingId, n) {
  const key = `${stickingId}|${n}`;
  const shown = state.shown.includes(n);
  const index = state.selection.indexOf(key);
  const active = state.sticking === stickingId && state.notesPerBar === n;
  const over = Boolean(state.overrides[key]);
  return `
    <td>
      <button class="cell ${shown ? '' : 'off'} ${active ? 'active' : ''} ${index >= 0 ? 'selected' : ''} ${over ? 'override' : ''}"
        data-key="${key}" data-sticking="${stickingId}" data-column="${n}"
        ${shown ? '' : 'disabled'}
        title="${n} notes per bar, ${stickingById(stickingId).label}${over ? ' (cell overrides)' : ''}">
        <span class="num">${index >= 0 ? index + 1 : ''}</span>
        ${over ? '<span class="mark"></span>' : ''}
      </button>
    </td>
  `;
}

function configBar() {
  const key = currentKey();
  const e = effective(key);
  const scope = state.cellOnly ? e : {
    bars: state.bars,
    metronome: state.metronome,
    metroVoice: state.metroVoice,
    right: state.right,
    left: state.left,
  };
  return `
    <div class="configbar">
      <label class="inline-field">Bars
        <input type="number" min="1" max="16" value="${scope.bars}" data-act="cfg-bars" />
      </label>
      <label class="inline-field">Sig
        <select data-act="sig">
          ${SIGNATURES.map((s) => `<option value="${s.id}" ${state.sig === s.id ? 'selected' : ''}>${s.id}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">Tempo <b data-bpm-label>${state.bpm}</b> BPM
        <input type="range" min="30" max="200" step="1" value="${state.bpm}" data-act="bpm" />
      </label>
      <label class="inline-field">Metronome
        <span class="row">
          <input type="checkbox" data-act="cfg-metronome" ${scope.metronome ? 'checked' : ''} />
          <select data-act="cfg-metrovoice">
            ${VOICES.filter((v) => v.id !== 'none')
              .map((v) => `<option value="${v.id}" ${scope.metroVoice === v.id ? 'selected' : ''}>${v.label}</option>`)
              .join('')}
          </select>
        </span>
      </label>
      <label class="inline-field">R strokes
        <select data-act="cfg-right">
          ${VOICES.map((v) => `<option value="${v.id}" ${scope.right === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">L strokes
        <select data-act="cfg-left">
          ${VOICES.map((v) => `<option value="${v.id}" ${scope.left === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <label class="switch">
        <input type="checkbox" data-act="cell-only" ${state.cellOnly ? 'checked' : ''} />
        Change only this cell
      </label>
      <label class="switch">
        <input type="checkbox" data-act="loop" ${state.loop ? 'checked' : ''} /> Loop
      </label>
      <label class="switch">
        <input type="checkbox" data-act="countin" ${state.countIn ? 'checked' : ''} /> Count-in
      </label>
      <button class="play" data-act="play">${session ? 'Stop' : 'Play'}</button>
    </div>
  `;
}

function sheetHTML() {
  const steps = planSteps();
  const bars = planBars();
  const label = state.selection.length
    ? `${steps.length} cells · ${bars.length} bars`
    : `${steps[0].n} notes per bar · ${stickingById(steps[0].sticking).label} · ${bars.length} bars`;
  return `
    <section class="panel practice">
      <header class="combo-head">
        <div>
          <h2>Score <span class="note-name">${label}</span></h2>
          <p class="muted">
            ${state.sig} · ${state.bpm} BPM · metronome ${state.metronome ? 'on' : 'off'}
            ${state.cellOnly ? '· editing this cell' : '· editing global'}
          </p>
        </div>
        ${configBar()}
      </header>
      <div class="sheet" data-sheet></div>
      <div class="transport-row">
        <span class="status" data-status></span>
      </div>
      <p class="legend">
        Sticking above the staff. Each cell keeps its own bars, metronome and R/L sounds when overridden.
      </p>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Notation. Connected bars, up to four per line, the whole score visible.
// ---------------------------------------------------------------------------

let noteMeta = [];

function mountSheet() {
  const host = document.querySelector('[data-sheet]');
  if (!host) return;
  host.innerHTML = '';
  host.removeAttribute('style');
  noteMeta = [];

  const width = Math.max(300, Math.floor(host.getBoundingClientRect().width - 8));
  const bars = planBars();
  const maxN = Math.max(...bars.map((b) => b.step.n));
  const minBarWidth = 24 * maxN + 56;
  const barsPerLine = Math.max(1, Math.min(4, Math.floor((width - 20) / minBarWidth)));
  const systems = Math.max(1, Math.ceil(bars.length / barsPerLine));
  const systemHeight = 186;
  const height = systems * systemHeight + 34;

  const renderer = new Renderer(host, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  let noteIndex = 0;

  for (let i = 0; i < bars.length; i += 1) {
    const system = Math.floor(i / barsPerLine);
    const col = i % barsPerLine;
    const cols = Math.min(barsPerLine, bars.length - system * barsPerLine);
    const barWidth = (width - 20) / cols;
    const x = 10 + col * barWidth;
    const y = system * systemHeight + 64;
    const { step } = bars[i];

    const spec = grouping(step.n);
    const stave = new Stave(x, y, barWidth);
    if (col === 0) stave.addClef('percussion');
    stave.setBegBarType(col === 0 ? Barline.type.SINGLE : Barline.type.NONE);
    stave.setEndBarType(Barline.type.SINGLE);
    stave.setContext(ctx).draw();
    const staffTop = stave.getYForLine(0);
    ctx.setFillStyle('#1b1b1a');

    const hands = strokeHands(step.sticking, step.n);
    const barStart = noteIndex;
    const groups = [];
    let cursor = 0;
    while (cursor < step.n) {
      const size = Math.min(spec.group, step.n - cursor);
      const group = [];
      for (let k = 0; k < size; k += 1) {
        const hand = hands[cursor + k];
        const def = voiceById(hand === 'R' ? step.right : step.left);
        const note = new StaveNote({
          keys: [def.note || 'c/5'],
          duration: spec.duration,
          clef: 'percussion',
        });
        note.setStemDirection(-1);
        if (spec.dots) Dot.buildAndAttach([note], { all: true });
        note.__index = noteIndex;
        group.push(note);
        noteIndex += 1;
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

    const metroNote = step.metronome && voiceById(step.metroVoice).note
      ? voiceById(step.metroVoice).note
      : null;
    if (metroNote) {
      const metroNotes = Array.from({ length: beatsPerBar() }, () => {
        const note = new StaveNote({ keys: [metroNote], duration: 'q', clef: 'percussion' });
        note.setStemDirection(1);
        if (compound()) Dot.buildAndAttach([note], { all: true });
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
      ctx.fillText(hands[note.__index - barStart], nx + 1, staffTop - 58);
      noteMeta.push({ index: note.__index, x: nx + 1, staffTop });
    }
    ctx.setFont('Arial', 9, 400);
    ctx.setFillStyle('#8a867c');
    ctx.fillText(`${i + 1}`, x + 4, staffTop - 8);
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

function schedulePlan(base, steps, beat) {
  const bpb = beatsPerBar();
  const barDuration = bpb * beat;
  const scheduled = [];
  let time = base;
  let noteStart = 0;

  for (const step of steps) {
    const stroke = barDuration / step.n;
    const count = step.bars * step.n;
    const pattern = stickingById(step.sticking).pattern;
    for (let i = 0; i < count; i += 1) {
      const hand = pattern[i % pattern.length];
      hit(hand === 'R' ? step.right : step.left, time + i * stroke, session.sources);
    }
    if (step.metronome) {
      for (let b = 0; b < step.bars * bpb; b += 1) {
        hit(step.metroVoice, time + b * beat, session.sources);
      }
    }
    const duration = step.bars * barDuration;
    scheduled.push({
      key: step.key,
      start: time - base,
      end: time - base + duration,
      n: step.n,
      bars: step.bars,
      count,
      noteStart,
      sticking: step.sticking,
    });
    noteStart += count;
    time += duration;
  }

  return { steps: scheduled, duration: time - base };
}

function startSession() {
  const ctx = audio();
  ctx.resume();
  stopSession();

  const beat = 60 / state.bpm;
  const countInBeats = state.countIn ? beatsPerBar() : 0;
  const start = ctx.currentTime + 0.25 + countInBeats * beat;

  session = { sources: [], timer: 0, raf: 0, playingKey: null, cursorIndex: -1 };

  for (let b = 0; b < countInBeats; b += 1) {
    hit('click', ctx.currentTime + 0.25 + b * beat, session.sources);
  }

  const steps = planSteps();
  const scheduled = schedulePlan(start, steps, beat);
  session.start = start;
  session.pass = 0;
  session.passDuration = scheduled.duration;
  session.beat = beat;
  session.steps = scheduled.steps;
  session.single = steps.length === 1;

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
    schedulePlan(next, planSteps(), session.beat);
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
    const step = session.steps.find((s) => inPass >= s.start && inPass < s.end)
      || session.steps[session.steps.length - 1];

    if (step) {
      highlightCell(step.key);
      const stroke = (step.end - step.start) / step.count;
      const local = Math.min(step.count - 1, Math.max(0, Math.floor((inPass - step.start) / stroke)));
      const global = step.noteStart + local;
      const meta = noteMeta[global];

      if (meta) {
        showCursor(meta);
        scrollCursorIntoView(meta);
      }

      if (status) {
        const prefix = session.single ? '' : `Step ${session.steps.indexOf(step) + 1} of ${session.steps.length} · `;
        status.textContent = `${prefix}stroke ${local + 1} of ${step.count}`;
      }
    }
  }
  session.raf = requestAnimationFrame(tick);
}

function showCursor(meta) {
  if (!session) return;
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  cursor.hidden = false;
  cursor.style.left = `${meta.x + 1}px`;
  cursor.style.top = `${meta.staffTop - 30}px`;
  cursor.style.height = '78px';
}

function scrollCursorIntoView(meta) {
  const box = document.querySelector('[data-sheet]');
  if (!box || box.scrollHeight <= box.clientHeight + 4) return;
  if (meta.staffTop < box.scrollTop + 50 || meta.staffTop > box.scrollTop + box.clientHeight - 60) {
    box.scrollTo({ top: Math.max(0, meta.staffTop - box.clientHeight / 2), behavior: 'smooth' });
  }
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
// Config, selection, interaction.
// ---------------------------------------------------------------------------

function setGlobal(field, value) {
  state[field] = value;
}

function setConfig(field, value) {
  if (!state.cellOnly) {
    setGlobal(field, value);
    render();
    return;
  }
  const key = currentKey();
  const over = { ...(state.overrides[key] || {}) };
  if (value === state[field]) delete over[field];
  else over[field] = value;
  if (Object.keys(over).length) state.overrides[key] = over;
  else delete state.overrides[key];
  render();
}

function setCombo(patch, jumpToSheet = false) {
  Object.assign(state, patch);
  render();
  if (jumpToSheet) scrollToSheet();
}

function scrollToSheet() {
  const el = document.querySelector('.practice');
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top, behavior: 'smooth' });
}

function refreshSelection() {
  document.querySelectorAll('.cell[data-key]').forEach((el) => {
    const index = state.selection.indexOf(el.dataset.key);
    el.classList.toggle('selected', index >= 0);
    const num = el.querySelector('.num');
    if (num) num.textContent = index >= 0 ? index + 1 : '';
  });
}

let drag = null;

function dragSelect(key) {
  const index = state.selection.indexOf(key);
  if (drag.mode === 'add' && index < 0) {
    state.selection.push(key);
    drag.changed = true;
  } else if (drag.mode === 'remove' && index >= 0) {
    state.selection.splice(index, 1);
    drag.changed = true;
  }
}

document.addEventListener('mousedown', (event) => {
  const cell = event.target.closest('[data-key]');
  if (!cell || !event.shiftKey) return;
  event.preventDefault();
  const key = cell.dataset.key;
  drag = { mode: state.selection.includes(key) ? 'remove' : 'add', changed: false };
  dragSelect(key);
  render();
});

document.addEventListener('mouseover', (event) => {
  if (!drag) return;
  const cell = event.target.closest('[data-key]');
  if (!cell) return;
  dragSelect(cell.dataset.key);
  refreshSelection();
});

document.addEventListener('mouseup', () => {
  if (drag && drag.changed) render();
  drag = null;
});

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act], [data-key]');
  if (!el) return;
  if (event.shiftKey) return;
  const act = el.dataset.act;

  if (el.dataset.key && !act) {
    setCombo({ sticking: el.dataset.sticking, notesPerBar: Number(el.dataset.column) }, true);
    return;
  }

  if (act === 'column') setCombo({ notesPerBar: Number(el.dataset.value) });
  else if (act === 'sticking') setCombo({ sticking: el.dataset.value });
  else if (act === 'toggle-rate') {
    const n = Number(el.dataset.value);
    const has = state.shown.includes(n);
    const next = has ? state.shown.filter((r) => r !== n) : [...state.shown, n].sort((a, b) => a - b);
    if (!next.length) return;
    setCombo({ shown: next, notesPerBar: next.includes(state.notesPerBar) ? state.notesPerBar : next[0] });
  } else if (act === 'common-rates') {
    setCombo({ shown: COMMON.slice(), notesPerBar: 12 });
  } else if (act === 'all-rates') {
    setCombo({ shown: NOTES_PER_BAR.slice() });
  } else if (act === 'clear-cell') {
    delete state.overrides[currentKey()];
    render();
  } else if (act === 'play') {
    if (session) stopSession();
    else startSession();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'cfg-bars') setConfig('bars', Math.min(16, Math.max(1, Number(el.value) || 1)));
  else if (act === 'cfg-metronome') setConfig('metronome', el.checked);
  else if (act === 'cfg-metrovoice') setConfig('metroVoice', el.value);
  else if (act === 'cfg-right') setConfig('right', el.value);
  else if (act === 'cfg-left') setConfig('left', el.value);
  else if (act === 'sig') {
    state.sig = el.value;
    render();
  }
  else if (act === 'cell-only') {
    state.cellOnly = el.checked;
    render();
  } else if (act === 'loop') {
    state.loop = el.checked;
    if (session) {
      clearTimeout(session.timer);
      if (state.loop) scheduleLoop();
    }
  } else if (act === 'countin') {
    state.countIn = el.checked;
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
state.notesPerBar = pickNumber('n', NOTES_PER_BAR) || state.notesPerBar;
state.sticking = pickValue('s', STICKINGS.map((s) => s.id)) || state.sticking;
state.bars = Math.min(16, Math.max(1, Number(params.get('bars')) || state.bars));
state.bpm = Math.min(200, Math.max(30, Number(params.get('bpm')) || state.bpm));
state.metronome = params.get('m') !== '0';
state.metroVoice = pickValue('mv', VOICES.map((v) => v.id)) || state.metroVoice;
state.right = pickValue('r', VOICES.map((v) => v.id)) || state.right;
state.left = pickValue('l', VOICES.map((v) => v.id)) || state.left;
const shown = (params.get('rates') || '').split(',').map(Number).filter((n) => NOTES_PER_BAR.includes(n));
if (shown.length) state.shown = shown;
const selection = (params.get('sel') || '').split(',').filter(Boolean);
if (selection.length) state.selection = selection;

render();
