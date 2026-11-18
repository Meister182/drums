import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  Tuplet,
} from 'vexflow';

// ---------------------------------------------------------------------------
// Model. 4/4 always. One bar is four quarter-note beats.
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

const COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

const NOTE_NAMES = {
  1: 'whole',
  2: 'half',
  3: 'half trip',
  4: 'quarter',
  5: 'quint',
  6: 'quarter trip',
  7: 'sept',
  8: 'eighth',
  9: '9-let',
  10: '10-let',
  11: '11-let',
  12: '8th trip',
  13: '13-tuplet',
  14: '14-tuplet',
  15: '15-tuplet',
  16: 'sixteenth',
};

const COMMON_COLUMNS = [1, 2, 3, 4, 6, 8, 12, 16];

const state = {
  notesPerBar: 12,
  sticking: 'singles',
  bars: 2,
  bpm: 80,
  metronome: true,
  metroVoice: 'click',
  right: 'snare',
  left: 'kick',
  columns: COMMON_COLUMNS.slice(),
  loop: false,
  countIn: false,
};

// ---------------------------------------------------------------------------
// Derived values.
// ---------------------------------------------------------------------------

const sticking = () => STICKINGS.find((s) => s.id === state.sticking);
const totalStrokes = () => state.bars * state.notesPerBar;
const voiceById = (id) => VOICES.find((v) => v.id === id) || VOICES[VOICES.length - 1];
const voiceLabel = (id) => voiceById(id).label;
const handVoice = (hand) => (hand === 'R' ? state.right : state.left);
const strokeHands = () => {
  const pattern = sticking().pattern;
  return Array.from({ length: totalStrokes() }, (_, i) => pattern[i % pattern.length]);
};

// Written note value, tuplet ratio and beam/tuplet group for N notes per bar.
function grouping(n) {
  if (n === 1) return { duration: 'w', ratio: null, group: 1 };
  if (n === 2) return { duration: 'h', ratio: null, group: 2 };
  if (n === 4) return { duration: 'q', ratio: null, group: 4 };
  if (n === 8) return { duration: '8', ratio: null, group: 2 };
  if (n === 16) return { duration: '16', ratio: null, group: 4 };
  if (n === 3) return { duration: 'h', ratio: [3, 2], group: 3 };
  if (n === 6) return { duration: 'q', ratio: [3, 2], group: 3 };
  if (n === 12) return { duration: '8', ratio: [3, 2], group: 3 };
  const base = n < 8 ? 4 : 8;
  return { duration: base === 4 ? 'q' : '8', ratio: [n, base], group: n };
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
    ${settingsHTML()}
    ${columnsHTML()}
    <div class="layout">
      ${tableHTML()}
      ${practiceHTML()}
    </div>
  `;
}

const topbarHTML = () => `
  <header class="topbar">
    <div class="brand">Drum exercises <span class="tag">prototype</span></div>
  </header>
`;

const voiceSelect = (which, label, withNone = true) => `
  <label>
    ${label}
    <select data-act="voice" data-which="${which}">
      ${VOICES.filter((v) => withNone || v.id !== 'none')
        .map((v) => `<option value="${v.id}" ${state[which] === v.id ? 'selected' : ''}>${v.label}</option>`)
        .join('')}
    </select>
  </label>
`;

const settingsHTML = () => `
  <section class="panel settings">
    <div class="field">
      <span class="label">Bars</span>
      <input type="number" min="1" max="16" value="${state.bars}" data-act="bars" />
    </div>
    <div class="field">
      <span class="label">Tempo <b data-bpm-label>${state.bpm}</b> BPM</span>
      <input type="range" min="30" max="200" step="1" value="${state.bpm}" data-act="bpm" />
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

// Columns the teacher wants on the table.
const columnsHTML = () => `
  <section class="panel columns">
    <span class="label">Columns</span>
    <div class="chips">
      ${COLUMNS.map((n) => `
        <button class="chip ${state.columns.includes(n) ? 'on' : ''}" data-act="toggle-column" data-value="${n}">${n}</button>
      `).join('')}
    </div>
    <button class="btn ghost small" data-act="common-columns">Common only</button>
    <button class="btn ghost small" data-act="all-columns">All</button>
  </section>
`;

function tableHTML() {
  const columns = state.columns;
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
                    <b>${n}</b><span>${NOTE_NAMES[n]}</span>
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
                ${columns.map((n) => `
                  <td>
                    <button class="cell ${state.sticking === s.id && state.notesPerBar === n ? 'active' : ''}"
                      data-act="combo" data-sticking="${s.id}" data-column="${n}"
                      title="${n} notes per bar, ${s.label}"></button>
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted small">Click a column header to change notes per bar, a row header to change sticking, or a cell for both.</p>
    </section>
  `;
}

function practiceHTML() {
  const group = grouping(state.notesPerBar);
  const metro = state.metronome ? `Metronome on the quarters, on ${voiceLabel(state.metroVoice)}.` : 'Metronome off.';
  return `
    <section class="panel practice">
      <header class="combo-head">
        <div>
          <h2>${state.notesPerBar} notes per bar <span class="note-name">(${NOTE_NAMES[state.notesPerBar]})</span></h2>
          <p class="muted">
            ${sticking().label} · ${state.bars} ${state.bars === 1 ? 'bar' : 'bars'} ·
            ${totalStrokes()} strokes${group.ratio ? ` · ${group.ratio[0]}:${group.ratio[1]} tuplet` : ''}
          </p>
        </div>
        <button class="play" data-act="play">${session ? 'Stop' : 'Play'}</button>
      </header>
      <div class="sheet" data-sheet></div>
      <div class="transport-row">
        <span class="status" data-status></span>
      </div>
      <p class="legend">
        Sticking above the staff. R on ${voiceLabel(state.right)}, L on ${voiceLabel(state.left)}. ${metro}
      </p>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Notation.
// ---------------------------------------------------------------------------

let noteMeta = [];

function mountSheet() {
  const host = document.querySelector('[data-sheet]');
  if (!host) return;
  host.innerHTML = '';
  host.removeAttribute('style');
  noteMeta = [];

  const width = Math.max(300, Math.floor(host.getBoundingClientRect().width - 8));
  const rowHeight = 176;
  const height = state.bars * rowHeight + 44;

  const renderer = new Renderer(host, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  const spec = grouping(state.notesPerBar);
  const hands = strokeHands();
  const metroNote = voiceById(state.metroVoice).note;
  const showMetronome = state.metronome && Boolean(metroNote);

  for (let bar = 0; bar < state.bars; bar += 1) {
    const rowTop = bar * rowHeight;
    const stave = new Stave(10, rowTop + 70, width - 24).addClef('percussion');
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
        const def = voiceById(handVoice(hands[index]));
        const note = new StaveNote({
          keys: [def.note || 'c/5'],
          duration: spec.duration,
          clef: 'percussion',
        });
        note.setStemDirection(-1);
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
    const beams = (spec.duration === '8' || spec.duration === '16')
      ? groups.filter((g) => g.length > 1).map((g) => {
        const beam = new Beam(g);
        beam.renderOptions.flatBeams = true;
        return beam;
      })
      : [];

    const voices = [
      new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false).addTickables(all),
    ];

    let metroNotes = [];
    if (showMetronome) {
      metroNotes = Array.from({ length: 4 }, () => {
        const note = new StaveNote({ keys: [metroNote], duration: 'q', clef: 'percussion' });
        note.setStemDirection(1);
        return note;
      });
      voices.push(new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false).addTickables(metroNotes));
    }

    const formatter = new Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    formatter.format(voices, width - 60);
    voices.forEach((v) => v.draw(ctx, stave));
    beams.forEach((beam) => beam.setContext(ctx).draw());
    tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());

    ctx.setFont('Arial', 11, 700);
    ctx.setFillStyle('#1b1b1a');
    for (const note of all) {
      const x = note.getAbsoluteX();
      ctx.fillText(hands[note.__index], x + 1, staffTop - 58);
      noteMeta.push({ index: note.__index, x: x + 1, staffTop });
    }
    ctx.setFont('Arial', 9, 400);
    ctx.setFillStyle('#8a867c');
    ctx.fillText(`bar ${bar + 1}`, 14, staffTop - 8);
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

function schedulePass(base) {
  const hands = strokeHands();
  for (let i = 0; i < hands.length; i += 1) {
    hit(handVoice(hands[i]), base + i * session.stroke, session.sources);
  }
  if (state.metronome) {
    for (let beat = 0; beat < state.bars * 4; beat += 1) {
      hit(state.metroVoice, base + beat * session.beat, session.sources);
    }
  }
}

function startSession() {
  const ctx = audio();
  ctx.resume();
  stopSession();

  const beat = 60 / state.bpm;
  const stroke = (beat * 4) / state.notesPerBar;
  const countInBeats = state.countIn ? 4 : 0;
  const start = ctx.currentTime + 0.25 + countInBeats * beat;

  session = {
    start,
    pass: 0,
    duration: state.bars * 4 * beat,
    beat,
    stroke,
    sources: [],
    timer: 0,
    raf: 0,
  };

  for (let b = 0; b < countInBeats; b += 1) {
    hit('click', ctx.currentTime + 0.25 + b * beat, session.sources);
  }
  schedulePass(start);
  if (state.loop) scheduleLoop();
  setPlayingUI();
  tick();
}

function scheduleLoop() {
  if (!session) return;
  const ctx = audio();
  const boundary = session.start + (session.pass + 1) * session.duration;
  const delay = Math.max(0, (boundary - ctx.currentTime - 0.05) * 1000);
  session.timer = setTimeout(() => {
    if (!session) return;
    session.pass += 1;
    schedulePass(session.start + session.pass * session.duration);
    if (state.loop) scheduleLoop();
  }, delay);
}

function tick() {
  if (!session) return;
  const ctx = audio();
  const elapsed = ctx.currentTime - session.start;
  const cursor = document.querySelector('.cursor');
  const status = document.querySelector('[data-status]');

  if (elapsed < 0) {
    if (cursor) cursor.hidden = true;
    if (status) status.textContent = `Count-in ${Math.min(4, Math.max(1, Math.ceil(-elapsed / session.beat - 0.001)))}`;
  } else if (elapsed >= session.duration && !state.loop) {
    stopSession();
    return;
  } else {
    const inPass = elapsed % session.duration;
    const index = Math.min(totalStrokes() - 1, Math.floor(inPass / session.stroke));
    const meta = noteMeta.find((m) => m.index === index);
    if (cursor && meta) {
      cursor.hidden = false;
      cursor.style.left = `${meta.x + 1}px`;
      cursor.style.top = `${meta.staffTop - 30}px`;
      cursor.style.height = '78px';
    }
    if (status) status.textContent = `Stroke ${index + 1} of ${totalStrokes()}`;
  }
  session.raf = requestAnimationFrame(tick);
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
  const cursor = document.querySelector('.cursor');
  if (cursor) cursor.hidden = true;
  const status = document.querySelector('[data-status]');
  if (status) status.textContent = '';
  setPlayingUI();
}

function setPlayingUI() {
  const button = document.querySelector('[data-act="play"]');
  if (button) button.textContent = session ? 'Stop' : 'Play';
}

// ---------------------------------------------------------------------------
// Interaction.
// ---------------------------------------------------------------------------

function setCombo(patch) {
  Object.assign(state, patch);
  render();
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'combo') {
    setCombo({
      sticking: el.dataset.sticking,
      notesPerBar: Number(el.dataset.column),
    });
  } else if (act === 'column') {
    setCombo({ notesPerBar: Number(el.dataset.value) });
  } else if (act === 'sticking') {
    setCombo({ sticking: el.dataset.value });
  } else if (act === 'toggle-column') {
    const n = Number(el.dataset.value);
    const has = state.columns.includes(n);
    const next = has ? state.columns.filter((c) => c !== n) : [...state.columns, n].sort((a, b) => a - b);
    if (!next.length) return;
    setCombo({
      columns: next,
      notesPerBar: next.includes(state.notesPerBar) ? state.notesPerBar : next[0],
    });
  } else if (act === 'common-columns') {
    setCombo({ columns: COMMON_COLUMNS.slice(), notesPerBar: 12 });
  } else if (act === 'all-columns') {
    setCombo({ columns: COLUMNS.slice() });
  } else if (act === 'play') {
    if (session) stopSession();
    else startSession();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'voice') {
    setCombo({ [el.dataset.which]: el.value });
  } else if (act === 'bars') {
    setCombo({ bars: Math.min(16, Math.max(1, Number(el.value) || 1)) });
  } else if (act === 'metronome') {
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

state.notesPerBar = pickNumber('n', COLUMNS) || state.notesPerBar;
state.sticking = pickValue('s', STICKINGS.map((s) => s.id)) || state.sticking;
state.bars = Math.min(16, Math.max(1, Number(params.get('bars')) || state.bars));
state.bpm = Math.min(200, Math.max(30, Number(params.get('bpm')) || state.bpm));
state.metronome = params.get('m') !== '0';
state.metroVoice = pickValue('mv', VOICES.map((v) => v.id)) || state.metroVoice;
state.right = pickValue('r', VOICES.map((v) => v.id)) || state.right;
state.left = pickValue('l', VOICES.map((v) => v.id)) || state.left;
const cols = (params.get('cols') || '')
  .split(',')
  .map(Number)
  .filter((n) => COLUMNS.includes(n));
if (cols.length) state.columns = cols;

render();
