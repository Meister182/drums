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
// Model. Prototype only: state lives in memory.
// ---------------------------------------------------------------------------

const NOTES_PER_CLICK = [1, 2, 3, 4, 5, 6];
const CLICKS_PER_BAR = [1, 2, 4];

const STICKINGS = [
  { id: 'singles', label: 'Singles', cycle: 1, pattern: ['R', 'L'] },
  { id: 'doubles', label: 'Doubles', cycle: 2, pattern: ['R', 'R', 'L', 'L'] },
  { id: 'triples', label: 'Triples', cycle: 3, pattern: ['R', 'R', 'R', 'L', 'L', 'L'] },
  { id: 'quadruples', label: 'Quadruples', cycle: 4, pattern: ['R', 'R', 'R', 'R', 'L', 'L', 'L', 'L'] },
  { id: 'single-paradiddle', label: 'Single paradiddle', cycle: 8, pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'] },
  { id: 'double-paradiddle', label: 'Double paradiddle', cycle: 12, pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L'] },
  { id: 'triple-paradiddle', label: 'Triple paradiddle', cycle: 16, pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'L'] },
];

const VOICES = [
  { id: 'click', label: 'Metronome click' },
  { id: 'snare', label: 'Snare', note: 'c/5' },
  { id: 'kick', label: 'Bass drum', note: 'f/4' },
  { id: 'ride', label: 'Ride', note: 'f/5' },
  { id: 'hihat', label: 'Hi-hat', note: 'g/5' },
  { id: 'tom', label: 'Tom', note: 'e/5' },
  { id: 'muted', label: 'Muted' },
];

const DURATIONS = {
  1: { 1: 'w', 2: 'h', 4: 'q' },
  2: { 1: 'h', 2: 'q', 4: '8' },
  3: { 1: 'h', 2: 'q', 4: '8' },
  4: { 1: 'q', 2: '8', 4: '16' },
  5: { 1: 'q', 2: '8', 4: '16' },
  6: { 1: 'q', 2: '8', 4: '16' },
};

const RATIOS = { 3: [3, 2], 5: [5, 4], 6: [6, 4] };
const CHECK_DURATIONS = { 1: 'w', 2: 'h', 4: 'q' };

const state = {
  variant: 'a',
  student: false,
  clicksPerBar: 4,
  notesPerClick: 3,
  sticking: 'singles',
  bars: 2,
  tempo: 80,
  voices: { check: 'click', right: 'snare', left: 'kick' },
  loop: false,
  countIn: true,
  path: 'row',
  diff: '',
};

// ---------------------------------------------------------------------------
// Derived values.
// ---------------------------------------------------------------------------

const sticking = () => STICKINGS.find((s) => s.id === state.sticking);
const cycle = () => sticking().cycle;
const strokesPerBar = () => state.clicksPerBar * state.notesPerClick;
const totalStrokes = () => state.bars * strokesPerBar();
const leftover = () => totalStrokes() % cycle();
const lands = () => leftover() === 0;
const voiceById = (id) => VOICES.find((v) => v.id === id);
const voiceLabel = (id) => (voiceById(id) || {}).label || id;
const checkIsDrum = () => Boolean((voiceById(state.voices.check) || {}).note);
const handVoice = (hand) => (hand === 'R' ? state.voices.right : state.voices.left);
const strokeHands = () => {
  const pattern = sticking().pattern;
  return Array.from({ length: totalStrokes() }, (_, i) => pattern[i % pattern.length]);
};
const strokeDuration = () => DURATIONS[state.notesPerClick][state.clicksPerBar];

function suggestedBars() {
  const c = cycle();
  for (let b = Math.max(1, state.bars); b <= 128; b += 1) {
    if ((b * strokesPerBar()) % c === 0) return b;
  }
  return state.bars;
}

function pathSteps() {
  if (state.path === 'row') {
    return NOTES_PER_CLICK.map((npc) => ({ cpb: state.clicksPerBar, npc }));
  }
  if (state.path === 'column') {
    return CLICKS_PER_BAR.map((cpb) => ({ cpb, npc: state.notesPerClick }));
  }
  const pairs = [[1, 4], [2, 2], [3, 1], [4, 4], [5, 2], [6, 1]];
  return pairs.map(([npc, cpb]) => ({ cpb, npc }));
}

function pathLabel() {
  const steps = pathSteps();
  const i = steps.findIndex((s) => s.cpb === state.clicksPerBar && s.npc === state.notesPerClick);
  if (i < 0) return `${state.path} path · current combination is off the path`;
  return `${state.path} path · step ${i + 1} of ${steps.length}`;
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
  if (state.variant === 'b') {
    return `
      ${topbarHTML()}
      ${practiceHTML()}
      ${pathHTML()}
      ${state.student ? '' : `<details class="panel"><summary>Grid and settings</summary>${settingsHTML()}${gridHTML()}</details>`}
      ${state.student ? '' : stateHTML()}
    `;
  }
  if (state.variant === 'c') {
    const steps = pathSteps();
    const active = steps.findIndex((s) => s.cpb === state.clicksPerBar && s.npc === state.notesPerClick);
    return `
      ${topbarHTML()}
      ${state.student ? '' : settingsHTML()}
      <div class="layout-c">
        ${steps.map((s, i) => `
          <div class="step ${i === active ? 'on' : ''}">
            <button class="step-head" data-act="combo" data-cpb="${s.cpb}" data-npc="${s.npc}">
              <span class="step-title">${s.cpb} clicks/bar · ${s.npc} notes/click</span>
              <span class="step-sub">${s.cpb * s.npc} strokes per bar</span>
            </button>
            ${i === active ? practiceHTML() : ''}
          </div>
        `).join('')}
      </div>
      ${pathHTML()}
      ${state.student ? '' : stateHTML()}
    `;
  }
  return `
    ${topbarHTML()}
    ${state.student ? '' : settingsHTML()}
    <div class="layout-a">
      ${state.student ? '' : gridHTML()}
      ${practiceHTML()}
    </div>
    ${pathHTML()}
    ${state.student ? '' : stateHTML()}
  `;
}

const topbarHTML = () => `
  <header class="topbar">
    <div class="brand">Drum exercises <span class="tag">prototype</span></div>
    <div class="top-actions">
      <div class="seg">
        ${['a', 'b', 'c'].map((v) => `
          <button class="seg-btn ${state.variant === v ? 'on' : ''}" data-act="variant" data-value="${v}">${v.toUpperCase()}</button>
        `).join('')}
      </div>
      <label class="switch">
        <input type="checkbox" data-act="student" ${state.student ? 'checked' : ''} />
        Student view
      </label>
    </div>
  </header>
`;

const voiceSelect = (which, label) => `
  <label>
    ${label}
    <select data-act="voice" data-which="${which}">
      ${VOICES.map((v) => `<option value="${v.id}" ${state.voices[which] === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
    </select>
  </label>
`;

const settingsHTML = () => `
  <section class="panel settings">
    <div class="field">
      <span class="label">Clicks per bar</span>
      <div class="seg">
        ${CLICKS_PER_BAR.map((v) => `<button class="seg-btn ${state.clicksPerBar === v ? 'on' : ''}" data-act="cpb" data-value="${v}">${v}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <span class="label">Notes per click</span>
      <div class="seg">
        ${NOTES_PER_CLICK.map((v) => `<button class="seg-btn ${state.notesPerClick === v ? 'on' : ''}" data-act="npc" data-value="${v}">${v}</button>`).join('')}
      </div>
    </div>
    <label class="field">
      <span class="label">Sticking</span>
      <select data-act="sticking">
        ${STICKINGS.map((s) => `<option value="${s.id}" ${state.sticking === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    </label>
    <div class="field">
      <span class="label">Bars</span>
      <div class="row">
        <input type="number" min="1" max="32" value="${state.bars}" data-act="bars" />
        <button class="btn ghost" data-act="align" ${lands() ? 'disabled' : ''}>
          ${lands() ? 'Already lands' : `Snap to ${suggestedBars()} bars`}
        </button>
      </div>
    </div>
    <div class="field">
      <span class="label">Tempo <b data-tempo-label>${state.tempo}</b> clicks/min</span>
      <input type="range" min="30" max="200" step="1" value="${state.tempo}" data-act="tempo" />
    </div>
    <div class="field">
      <span class="label">Voices</span>
      <div class="voice-row">
        ${voiceSelect('check', 'Check')}
        ${voiceSelect('right', 'Right hand')}
        ${voiceSelect('left', 'Left hand')}
      </div>
    </div>
  </section>
`;

function practiceHTML() {
  const barsWord = state.bars === 1 ? 'bar' : 'bars';
  return `
    <section class="panel practice">
      <header class="combo-head">
        <div>
          <h2>${state.clicksPerBar} clicks/bar × ${state.notesPerClick} notes/click</h2>
          <p class="muted">
            ${sticking().label} · ${totalStrokes()} strokes over ${state.bars} ${barsWord} ·
            cycle ${cycle()} · ${lands() ? 'lands' : `leaves ${leftover()}`}
          </p>
        </div>
        <div class="transport">
          <button class="play" data-act="play">${session ? 'Stop' : 'Play'}</button>
          <button class="btn ghost" data-act="reset">Reset</button>
        </div>
      </header>
      ${state.diff ? `<p class="diff">${state.diff}</p>` : ''}
      <div class="sheet" data-sheet></div>
      <div class="transport-row">
        <label><input type="checkbox" data-act="loop" ${state.loop ? 'checked' : ''} /> Loop</label>
        <label><input type="checkbox" data-act="countin" ${state.countIn ? 'checked' : ''} /> Count-in</label>
        <span class="status" data-status></span>
      </div>
      <p class="legend">
        Sticking above the staff. R on ${voiceLabel(state.voices.right)}, L on ${voiceLabel(state.voices.left)}.
        ${checkIsDrum() ? `Check on ${voiceLabel(state.voices.check)}.` : 'The check is the click each group starts on, so it is not notated.'}
      </p>
    </section>
  `;
}

function gridHTML() {
  const rows = [...NOTES_PER_CLICK].reverse();
  return `
    <section class="panel grid-panel">
      <header>
        <div>
          <h2>Combinations</h2>
          <p class="muted small">Rows are notes per click. Columns are clicks per bar.</p>
        </div>
      </header>
      <table class="grid">
        <thead>
          <tr><th></th>${CLICKS_PER_BAR.map((c) => `<th>${c} /bar</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((n) => `
            <tr>
              <th>${n}</th>
              ${CLICKS_PER_BAR.map((c) => {
                const total = c * n * state.bars;
                const left = total % cycle();
                const active = c === state.clicksPerBar && n === state.notesPerClick;
                return `
                  <td>
                    <button class="cell ${active ? 'active' : ''} ${left ? 'warn' : ''}"
                      data-act="combo" data-cpb="${c}" data-npc="${n}"
                      title="${c * n} strokes per bar, ${left ? `${left} left over at ${state.bars} bars` : 'lands'}">
                      <span class="n">${c * n}</span>
                      <span class="sub">${left ? `+${left}` : 'lands'}</span>
                    </button>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="muted small">Number is strokes per bar. Badge is what the current bar count leaves over with ${sticking().label}.</p>
    </section>
  `;
}

const pathHTML = () => `
  <section class="pathbar">
    <span class="label">Travel</span>
    <div class="seg">
      ${['row', 'column', 'diagonal'].map((p) => `<button class="seg-btn ${state.path === p ? 'on' : ''}" data-act="path" data-value="${p}">${p}</button>`).join('')}
    </div>
    <button class="btn ghost" data-act="prev">Previous</button>
    <button class="btn ghost" data-act="next">Next</button>
    <span class="path-now">${pathLabel()}</span>
  </section>
`;

const stateHTML = () => `
  <details class="panel state">
    <summary>State (the whole model)</summary>
    <pre>${JSON.stringify(state, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
  </details>
`;

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

  const hands = strokeHands();

  for (let bar = 0; bar < state.bars; bar += 1) {
    const rowTop = bar * rowHeight;
    const stave = new Stave(10, rowTop + 70, width - 24).addClef('percussion');
    stave.setContext(ctx).draw();
    const staffTop = stave.getYForLine(0);

    const checkNotes = [];
    const groups = [];

    for (let click = 0; click < state.clicksPerBar; click += 1) {
      if (checkIsDrum()) {
        const def = voiceById(state.voices.check);
        const note = new StaveNote({
          keys: [def.note],
          duration: CHECK_DURATIONS[state.clicksPerBar],
          clef: 'percussion',
        });
        note.setStemDirection(1);
        checkNotes.push(note);
      }

      const group = [];
      for (let k = 0; k < state.notesPerClick; k += 1) {
        const index = (bar * state.clicksPerBar + click) * state.notesPerClick + k;
        const def = voiceById(handVoice(hands[index])) || {};
        const note = new StaveNote({
          keys: [def.note || 'c/5'],
          duration: strokeDuration(),
          clef: 'percussion',
        });
        note.setStemDirection(-1);
        note.__index = index;
        group.push(note);
      }
      groups.push(group);
    }

    const all = groups.flat();
    const ratio = RATIOS[state.notesPerClick];
    const tuplets = ratio
      ? groups.map(
          (g) =>
            new Tuplet(g, {
              numNotes: ratio[0],
              notesOccupied: ratio[1],
              bracketed: false,
              location: -1,
            }),
        )
      : [];
    const beams = groups.filter((g) => g.length > 1).map((g) => {
      const beam = new Beam(g);
      beam.renderOptions.flatBeams = true;
      return beam;
    });

    const voices = [
      new Voice({ numBeats: state.clicksPerBar, beatValue: 4 }).setStrict(false).addTickables(all),
    ];
    if (checkNotes.length) {
      voices.push(
        new Voice({ numBeats: state.clicksPerBar, beatValue: 4 }).setStrict(false).addTickables(checkNotes),
      );
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
      noteMeta.push({ index: note.__index, x: x + 1, rowTop, staffTop });
    }
    ctx.setFont('Arial', 9, 400);
    ctx.setFillStyle('#8a867c');
    ctx.fillText(`bar ${bar + 1}`, 14, staffTop - 8);
  }

  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.hidden = true;
  host.appendChild(cursor);
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
  if (kind === 'muted' || !kind) return;
  const ctx = audio();
  const t = Math.max(time, ctx.currentTime + 0.001);

  if (kind === 'click') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    percussive(gain, t, 0.18, 0.002, 0.03);
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
    percussive(gain, t, 0.35, 0.002, 0.16);
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
    percussive(gain, t, 0.75, 0.003, 0.22);
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
    percussive(gain, t, 0.45, 0.003, 0.2);
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
    percussive(gain, t, 0.18, 0.001, 0.05);
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
    percussive(gain, t, 0.2, 0.002, 0.55);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.6);
    sink.push(src);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(640, t);
    percussive(pingGain, t, 0.05, 0.002, 0.2);
    ping.connect(pingGain).connect(ctx.destination);
    ping.start(t);
    ping.stop(t + 0.25);
    sink.push(ping);
  }
}

function schedulePass(base) {
  const hands = strokeHands();
  const secondsPerClick = 60 / state.tempo;
  const secondsPerStroke = secondsPerClick / state.notesPerClick;
  const check = state.voices.check;

  for (let i = 0; i < hands.length; i += 1) {
    const t = base + i * secondsPerStroke;
    if (i % state.notesPerClick === 0 && check !== 'click' && check !== 'muted') {
      hit(check, t, session.sources);
    }
    hit(handVoice(hands[i]), t, session.sources);
  }

  if (check === 'click') {
    const clicks = state.bars * state.clicksPerBar;
    for (let k = 0; k < clicks; k += 1) {
      hit('click', base + k * secondsPerClick, session.sources);
    }
  }
}

function startSession() {
  const ctx = audio();
  ctx.resume();
  stopSession();

  const secondsPerClick = 60 / state.tempo;
  const countIn = state.countIn ? state.clicksPerBar : 0;
  const start = ctx.currentTime + 0.25 + countIn * secondsPerClick;
  const passDuration = totalStrokes() * (secondsPerClick / state.notesPerClick);

  session = {
    start,
    pass: 0,
    passDuration,
    secondsPerStroke: secondsPerClick / state.notesPerClick,
    sources: [],
    timer: 0,
    raf: 0,
  };

  for (let k = 0; k < countIn; k += 1) {
    hit('click', ctx.currentTime + 0.25 + k * secondsPerClick, session.sources);
  }
  schedulePass(start);
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
    schedulePass(session.start + session.pass * session.passDuration);
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
    const remaining = Math.ceil(-elapsed / (60 / state.tempo) - 0.001);
    if (status) status.textContent = `Count-in ${Math.min(state.clicksPerBar, Math.max(1, remaining))}`;
  } else {
    const inPass = elapsed % session.passDuration;
    const total = totalStrokes();
    const index = Math.min(total - 1, Math.floor(inPass / session.secondsPerStroke));
    const meta = noteMeta.find((m) => m.index === index);
    if (cursor && meta) {
      cursor.hidden = false;
      cursor.style.left = `${meta.x + 1}px`;
      cursor.style.top = `${meta.staffTop - 30}px`;
      cursor.style.height = '78px';
    }
    if (status) status.textContent = `Stroke ${index + 1} of ${total}`;
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

function setCombo(cpb, npc) {
  const parts = [];
  if (cpb !== state.clicksPerBar) parts.push(`clicks per bar ${state.clicksPerBar} → ${cpb}`);
  if (npc !== state.notesPerClick) parts.push(`notes per click ${state.notesPerClick} → ${npc}`);
  state.diff = parts.length ? `Changed: ${parts.join(', ')}.` : '';
  state.clicksPerBar = cpb;
  state.notesPerClick = npc;
  render();
}

function step(dir) {
  const steps = pathSteps();
  let i = steps.findIndex((s) => s.cpb === state.clicksPerBar && s.npc === state.notesPerClick);
  if (i < 0) i = 0;
  const next = steps[(i + dir + steps.length) % steps.length];
  setCombo(next.cpb, next.npc);
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'cpb') setCombo(Number(el.dataset.value), state.notesPerClick);
  else if (act === 'npc') setCombo(state.clicksPerBar, Number(el.dataset.value));
  else if (act === 'combo') setCombo(Number(el.dataset.cpb), Number(el.dataset.npc));
  else if (act === 'align') {
    state.diff = `Bars ${state.bars} → ${suggestedBars()} to land the ${sticking().label.toLowerCase()} cycle.`;
    state.bars = suggestedBars();
    render();
  } else if (act === 'path') {
    state.path = el.dataset.value;
    state.diff = `Path: ${state.path}.`;
    render();
  } else if (act === 'next') step(1);
  else if (act === 'prev') step(-1);
  else if (act === 'variant') {
    state.variant = el.dataset.value;
    state.diff = '';
    render();
  } else if (act === 'play') {
    if (session) stopSession();
    else startSession();
  } else if (act === 'reset') {
    stopSession();
    state.diff = '';
    render();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'sticking') {
    state.diff = `Sticking ${sticking().label} → ${STICKINGS.find((s) => s.id === el.value).label}.`;
    state.sticking = el.value;
    render();
  } else if (act === 'voice') {
    state.voices[el.dataset.which] = el.value;
    state.diff = `${el.dataset.which === 'check' ? 'Check' : el.dataset.which === 'right' ? 'Right hand' : 'Left hand'} → ${voiceLabel(el.value)}.`;
    render();
  } else if (act === 'bars') {
    const value = Math.min(32, Math.max(1, Number(el.value) || 1));
    state.diff = `Bars ${state.bars} → ${value}.`;
    state.bars = value;
    render();
  } else if (act === 'loop') {
    state.loop = el.checked;
    if (session) {
      clearTimeout(session.timer);
      if (state.loop) scheduleLoop();
    }
  } else if (act === 'countin') {
    state.countIn = el.checked;
  } else if (act === 'student') {
    state.student = el.checked;
    render();
  }
});

document.addEventListener('input', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'tempo') {
    state.tempo = Number(el.value);
    const label = document.querySelector('[data-tempo-label]');
    if (label) label.textContent = state.tempo;
  }
});

window.addEventListener('resize', () => {
  if (session) return;
  mountSheet();
});

// URL overrides so variants and awkward cases are linkable.
const params = new URLSearchParams(window.location.search);
const pick = (key, allowed) => {
  const value = params.get(key);
  return value && allowed.includes(value) ? value : null;
};
const pickNumber = (key, allowed) => {
  const value = Number(params.get(key));
  return allowed.includes(value) ? value : null;
};

state.variant = pick('variant', ['a', 'b', 'c']) || state.variant;
state.student = params.get('student') === '1';
state.clicksPerBar = pickNumber('cpb', CLICKS_PER_BAR) || state.clicksPerBar;
state.notesPerClick = pickNumber('npc', NOTES_PER_CLICK) || state.notesPerClick;
state.sticking = pick('sticking', STICKINGS.map((s) => s.id)) || state.sticking;
state.path = pick('path', ['row', 'column', 'diagonal']) || state.path;
const barsParam = Number(params.get('bars'));
if (barsParam >= 1) state.bars = Math.min(32, Math.floor(barsParam));
const tempoParam = Number(params.get('tempo'));
if (tempoParam >= 30 && tempoParam <= 200) state.tempo = Math.floor(tempoParam);
for (const which of ['check', 'right', 'left']) {
  const value = pick(which, VOICES.map((v) => v.id));
  if (value) state.voices[which] = value;
}

render();
