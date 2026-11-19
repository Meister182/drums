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
// Model. 4/4 by default. A combination is notes per bar plus a sticking.
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

function planSteps() {
  const keys = state.selection.length ? state.selection : [currentKey()];
  return keys.map((key, id) => {
    const [stickingId, n] = key.split('|');
    return {
      id,
      key,
      sticking: stickingId,
      n: Number(n),
      bars: state.bars,
      metronome: state.metronome,
      metroVoice: state.metroVoice,
      right: state.right,
      left: state.left,
    };
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
// Share link.
// ---------------------------------------------------------------------------

function shareParams() {
  const p = new URLSearchParams();
  p.set('sig', state.sig);
  p.set('n', state.notesPerBar);
  p.set('s', state.sticking);
  p.set('bars', state.bars);
  p.set('bpm', state.bpm);
  p.set('m', state.metronome ? '1' : '0');
  p.set('mv', state.metroVoice);
  p.set('r', state.right);
  p.set('l', state.left);
  p.set('shown', state.shown.join(','));
  if (state.selection.length) p.set('sel', state.selection.join(','));
  return p;
}

function shareURL() {
  return `${window.location.origin}${window.location.pathname}?${shareParams().toString()}`;
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
  history.replaceState(null, '', shareURL());
}

function shell() {
  return `
    ${topbarHTML()}
    ${configHTML()}
    ${tableHTML()}
    ${sheetHTML()}
  `;
}

const topbarHTML = () => `
  <header class="topbar">
    <div class="brand">Drum exercises <span class="tag">prototype</span></div>
  </header>
  <p class="hints">
    Click a column title to show or hide those notes per bar. Shift-click or drag
    cells to build the score, click a cell to open it, and use Copy link to share
    this exact setup.
  </p>
`;

const voiceSelect = (which, label) => `
  <label class="inline-field">${label}
    <select data-act="cfg-${which}">
      ${VOICES.map((v) => `<option value="${v.id}" ${state[which] === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
    </select>
  </label>
`;

const configHTML = () => `
  <section class="panel configbar">
    <label class="inline-field">Bars
      <input type="number" min="1" max="16" value="${state.bars}" data-act="cfg-bars" />
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
        <input type="checkbox" data-act="cfg-metronome" ${state.metronome ? 'checked' : ''} />
        <select data-act="cfg-metrovoice">
          ${VOICES.filter((v) => v.id !== 'none')
            .map((v) => `<option value="${v.id}" ${state.metroVoice === v.id ? 'selected' : ''}>${v.label}</option>`)
            .join('')}
        </select>
      </span>
    </label>
    ${voiceSelect('right', 'R strokes')}
    ${voiceSelect('left', 'L strokes')}
    <label class="switch"><input type="checkbox" data-act="loop" ${state.loop ? 'checked' : ''} /> Loop</label>
    <label class="switch"><input type="checkbox" data-act="countin" ${state.countIn ? 'checked' : ''} /> Count-in</label>
    <button class="play" data-act="play">${session ? 'Stop' : 'Play'}</button>
  </section>
`;

function tableHTML() {
  return `
    <section class="panel table-panel">
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
                      data-act="column" data-value="${n}"
                      title="Click to ${on ? 'hide' : 'show'} this many notes per bar">
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
      <p class="muted small">Grey columns are hidden. Click their title to bring them back.</p>
    </section>
  `;
}

function cellHTML(stickingId, n) {
  const key = `${stickingId}|${n}`;
  const shown = state.shown.includes(n);
  const index = state.selection.indexOf(key);
  const active = state.sticking === stickingId && state.notesPerBar === n;
  return `
    <td>
      <button class="cell ${shown ? '' : 'off'} ${active ? 'active' : ''} ${index >= 0 ? 'selected' : ''}"
        data-key="${key}" data-sticking="${stickingId}" data-column="${n}"
        ${shown ? '' : 'disabled'}
        title="${n} notes per bar, ${stickingById(stickingId).label}">
        <span class="num">${index >= 0 ? index + 1 : ''}</span>
      </button>
    </td>
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
      <header class="sheet-head">
        <div>
          <h2>Score <span class="note-name">${label}</span></h2>
          <p class="muted">${state.sig} · ${state.bpm} BPM · metronome ${state.metronome ? voiceLabel(state.metroVoice) : 'off'}</p>
        </div>
        <div class="sheet-actions">
          <button class="btn small" data-act="copy-link">Copy link</button>
          <button class="btn small" data-act="pdf">PDF</button>
        </div>
      </header>
      <h2 class="print-only">Drum exercises · ${label}</h2>
      <div class="sheet" data-sheet></div>
      <div class="transport-row">
        <span class="status" data-status></span>
      </div>
      <p class="legend">
        Sticking above the staff, time signature at the start of each line. Print or
        save as PDF from the PDF button.
      </p>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Notation. Connected bars, up to four per line, the whole score visible.
// ---------------------------------------------------------------------------

let noteMeta = [];
let metroMeta = [];

function mountSheet() {
  const host = document.querySelector('[data-sheet]');
  if (!host) return;
  host.innerHTML = '';
  host.removeAttribute('style');
  noteMeta = [];
  metroMeta = [];

  const width = Math.max(300, Math.floor(host.getBoundingClientRect().width - 8));
  const bars = planBars();
  const maxN = Math.max(...bars.map((b) => b.step.n));
  const wide = width >= 900 ? 4 : width >= 560 ? 2 : 1;
  const barsPerLine = wide === 4 && maxN > 12 ? 3 : wide;
  const minBarWidth = 26 * maxN + 84;
  const logicalWidth = Math.max(width, barsPerLine * minBarWidth + 20);
  const scale = width / logicalWidth;
  const systems = Math.max(1, Math.ceil(bars.length / barsPerLine));
  const systemHeight = 210;

  let noteIndex = 0;

  for (let system = 0; system < systems; system += 1) {
    const wrap = document.createElement('div');
    wrap.className = 'system';
    wrap.style.height = `${systemHeight * scale}px`;
    host.appendChild(wrap);

    const renderer = new Renderer(wrap, Renderer.Backends.SVG);
    renderer.resize(logicalWidth, systemHeight);
    const ctx = renderer.getContext();

    const start = system * barsPerLine;
    const count = Math.min(barsPerLine, bars.length - start);
    const barWidth = (logicalWidth - 20) / count;

    for (let col = 0; col < count; col += 1) {
      const i = start + col;
      const { step } = bars[i];
      const x = 10 + col * barWidth;
      const y = 64;

      const spec = grouping(step.n);
      const stave = new Stave(x, y, barWidth);
      if (col === 0) {
        stave.addClef('percussion');
        stave.addTimeSignature(state.sig);
      }
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
      const beamed = spec.duration === '8' || spec.duration === '16' || spec.duration === '32';
      const tuplets = spec.ratio
        ? groups.map((g) => new Tuplet(g, {
          numNotes: spec.ratio[0],
          notesOccupied: spec.ratio[1],
          bracketed: !beamed,
          location: -1,
        }))
        : [];
      const beams = beamed
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
      let metroNotes = [];
      if (metroNote) {
        metroNotes = Array.from({ length: beatsPerBar() }, () => {
          const note = new StaveNote({ keys: [metroNote], duration: 'q', clef: 'percussion' });
          note.setStemDirection(1);
          if (compound()) Dot.buildAndAttach([note], { all: true });
          return note;
        });
        voices.push(new Voice({ numBeats: barQuarters(), beatValue: 4 }).setStrict(false).addTickables(metroNotes));
      }

      const noteArea = stave.getNoteEndX() - stave.getNoteStartX() - 16;
      const formatter = new Formatter();
      voices.forEach((v) => formatter.joinVoices([v]));
      formatter.format(voices, noteArea);
      voices.forEach((v) => v.draw(ctx, stave));
      beams.forEach((beam) => beam.setContext(ctx).draw());
      tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());

      metroNotes.forEach((note, b) => {
        const ys = note.getYs();
        metroMeta.push({
          id: step.id,
          beat: bars[i].barInStep * beatsPerBar() + b,
          x: (note.getAbsoluteX() + 4) * scale,
          y: (system * systemHeight + ys[0]) * scale,
        });
      });

      ctx.setFont('Arial', barWidth < 360 ? 9 : 11, 700);
      ctx.setFillStyle('#1b1b1a');
      for (const note of all) {
        const nx = note.getAbsoluteX();
        const letterX = Math.min(Math.max(nx + 1, x + 14), x + barWidth - 14);
        ctx.fillText(hands[note.__index - barStart], letterX, staffTop - 58);
        noteMeta.push({
          index: note.__index,
          x: (nx + 1) * scale,
          top: (system * systemHeight + staffTop - 30) * scale,
          height: 78 * scale,
        });
      }
      ctx.setFont('Arial', 9, 400);
      ctx.setFillStyle('#8a867c');
      ctx.fillText(`${i + 1}`, x + 4, staffTop - 8);
    }

    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${logicalWidth} ${systemHeight}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', `${systemHeight * scale}`);
      svg.style.width = '100%';
      svg.style.height = 'auto';
    }
    wrap.removeAttribute('style');
    wrap.style.height = `${systemHeight * scale}px`;
  }

  host.removeAttribute('style');

  const cursorEl = document.createElement('div');
  cursorEl.className = 'cursor';
  cursorEl.hidden = true;
  host.appendChild(cursorEl);

  const dot = document.createElement('div');
  dot.className = 'metro-dot';
  dot.hidden = true;
  host.appendChild(dot);
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
      id: step.id,
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

  session = { sources: [], timer: 0, raf: 0, playingKey: null };

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

      const beatIndex = Math.min(
        step.bars * beatsPerBar() - 1,
        Math.max(0, Math.floor((inPass - step.start) / session.beat)),
      );
      const dot = metroMeta.find((m) => m.id === step.id && m.beat === beatIndex);
      showMetroDot(dot);
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
  cursor.style.left = `${meta.x}px`;
  cursor.style.top = `${meta.top}px`;
  cursor.style.height = `${meta.height}px`;
}

function scrollCursorIntoView(meta) {
  const box = document.querySelector('[data-sheet]');
  if (!box || box.scrollHeight <= box.clientHeight + 4) return;
  if (meta.top < box.scrollTop + 50 || meta.top > box.scrollTop + box.clientHeight - 60) {
    box.scrollTo({ top: Math.max(0, meta.top - box.clientHeight / 2), behavior: 'smooth' });
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
  const dot = document.querySelector('.metro-dot');
  if (dot) dot.hidden = true;
}

function showMetroDot(meta) {
  const dot = document.querySelector('.metro-dot');
  if (!dot) return;
  if (!meta) {
    dot.hidden = true;
    return;
  }
  dot.hidden = false;
  dot.style.left = `${meta.x}px`;
  dot.style.top = `${meta.y}px`;
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
// Selection and interaction.
// ---------------------------------------------------------------------------

function setCombo(patch) {
  Object.assign(state, patch);
  render();
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
    setCombo({ sticking: el.dataset.sticking, notesPerBar: Number(el.dataset.column) });
    return;
  }

  if (act === 'column') {
    const n = Number(el.dataset.value);
    const on = state.shown.includes(n);
    const shown = on ? state.shown.filter((r) => r !== n) : [...state.shown, n].sort((a, b) => a - b);
    if (!shown.length) return;
    const selection = on ? state.selection.filter((key) => Number(key.split('|')[1]) !== n) : state.selection;
    setCombo({
      shown,
      selection,
      notesPerBar: shown.includes(state.notesPerBar) ? state.notesPerBar : shown[0],
    });
  } else if (act === 'sticking') {
    setCombo({ sticking: el.dataset.value });
  } else if (act === 'copy-link') {
    copyLink(el);
  } else if (act === 'pdf') {
    window.print();
  } else if (act === 'play') {
    if (session) stopSession();
    else startSession();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'cfg-bars') setCombo({ bars: Math.min(16, Math.max(1, Number(el.value) || 1)) });
  else if (act === 'cfg-metronome') setCombo({ metronome: el.checked });
  else if (act === 'cfg-metrovoice') setCombo({ metroVoice: el.value });
  else if (act === 'cfg-right') setCombo({ right: el.value });
  else if (act === 'cfg-left') setCombo({ left: el.value });
  else if (act === 'sig') setCombo({ sig: el.value });
  else if (act === 'loop') {
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

async function copyLink(button) {
  const url = shareURL();
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy link'; }, 1500);
  } catch (error) {
    window.prompt('Copy this link', url);
  }
}

// Print at a fixed page width so the score scales predictably.
window.addEventListener('beforeprint', () => {
  const pageWidth = 700;
  document.querySelectorAll('.system svg').forEach((svg) => {
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const height = pageWidth * (vb.height / vb.width);
    svg.setAttribute('width', String(pageWidth));
    svg.setAttribute('height', String(height));
    svg.style.width = `${pageWidth}px`;
    svg.style.height = `${height}px`;
    if (svg.parentElement) svg.parentElement.style.height = `${height}px`;
  });
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
const shown = (params.get('shown') || params.get('rates') || '')
  .split(',')
  .map(Number)
  .filter((n) => NOTES_PER_BAR.includes(n));
if (shown.length) state.shown = shown;
const selection = (params.get('sel') || '').split(',').filter(Boolean);
if (selection.length) state.selection = selection;

render();
