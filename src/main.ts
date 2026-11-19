import './style.css';
import { Player, type PlayState } from './audio';
import {
  DEFAULT_SETUP,
  NOTES_PER_BAR,
  SIGNATURES,
  STICKINGS,
  VOICES,
  clicksPerBar,
  currentKey,
  nameFor,
  normalizeSetup,
  planBars,
  planSteps,
  signatureOf,
  stickingById,
  voiceById,
  voiceLabel,
  type Setup,
  type SigId,
  type StickingId,
  type VoiceId,
} from './model';
import { renderScore, type NoteMeta } from './notation';
import { deleteSetup, loadLibrary, saveSetup, type SavedSetup } from './library';
import { setupFromParams, shareURL } from './share';

const params = new URLSearchParams(window.location.search);
const initial = setupFromParams(params);

let setup: Setup = initial ? normalizeSetup(initial) : { ...DEFAULT_SETUP, shown: NOTES_PER_BAR.slice() };
let saved: SavedSetup[] = loadLibrary();
let loop = false;
let countIn = false;
let playing = false;
let soundsReady = false;
let nameValue = '';
let savedId = '';
let noteMeta: NoteMeta[] = [];
let statusText = '';
let notice = '';

const player = new Player();
player
  .load()
  .then(() => {
    soundsReady = true;
    render();
  })
  .catch(() => {
    notice = 'Sounds failed to load';
    render();
  });

function app(): HTMLElement {
  return document.getElementById('app') as HTMLElement;
}

function shell(): string {
  return `
    ${topbar()}
    ${config()}
    <p class="hints">
      Click a column title to show or hide those notes per bar. Shift-click or drag
      cells to build the score, click a cell to open it. Grey columns are hidden.
    </p>
    ${library()}
    ${grid()}
    ${score()}
    ${footer()}
  `;
}

const topbar = () => `
  <header class="topbar">
    <div class="brand">Drum exercises</div>
  </header>
`;

function config(): string {
  return `
    <section class="panel configbar">
      <label class="inline-field">Bars
        <input type="number" min="1" max="16" value="${setup.bars}" data-act="bars" />
      </label>
      <label class="inline-field">Sig
        <select data-act="sig">
          ${SIGNATURES.map((s) => `<option value="${s.id}" ${setup.sig === s.id ? 'selected' : ''}>${s.id}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">Tempo
        <span class="row">
          <input type="number" min="30" max="200" step="1" value="${setup.bpm}" data-act="bpm" />
          <span class="unit-label">BPM</span>
        </span>
      </label>
      <label class="inline-field">Metronome
        <span class="row">
          <input type="checkbox" data-act="metronome" ${setup.metronome ? 'checked' : ''} />
          <select data-act="metrovoice">
            ${VOICES.filter((v) => v.id !== 'none')
              .map((v) => `<option value="${v.id}" ${setup.metroVoice === v.id ? 'selected' : ''}>${v.label}</option>`)
              .join('')}
          </select>
          <span class="unit-label">every</span>
          <span class="seg">
            ${[
              ['bar', 'Bar'],
              ['beat', 'Beat'],
              ['eighth', 'Eighths'],
            ]
              .map(
                ([value, label]) =>
                  `<button class="seg-btn ${setup.metroUnit === value ? 'on' : ''}" data-act="metrounit" data-value="${value}">${label}</button>`,
              )
              .join('')}
          </span>
        </span>
      </label>
      <label class="inline-field">R strokes
        <select data-act="right">
          ${VOICES.map((v) => `<option value="${v.id}" ${setup.right === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">L strokes
        <select data-act="left">
          ${VOICES.map((v) => `<option value="${v.id}" ${setup.left === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </label>
      <label class="switch"><input type="checkbox" data-act="loop" ${loop ? 'checked' : ''} /> Loop</label>
      <label class="switch"><input type="checkbox" data-act="countin" ${countIn ? 'checked' : ''} /> Count-in</label>
    </section>
  `;
}

function library(): string {
  return `
    <section class="panel library">
      <span class="label">Library</span>
      ${saved.length
        ? `<select data-act="saved">
            ${saved
              .map((item) => `<option value="${item.id}" ${item.id === savedId ? 'selected' : ''}>${escapeHTML(item.name)}</option>`)
              .join('')}
          </select>
          <button class="btn small" data-act="load">Load</button>
          <button class="btn small" data-act="delete">Delete</button>`
        : '<span class="muted small">Nothing saved yet.</span>'}
      <span class="library-save">
        <input type="text" placeholder="Name this setup" value="${escapeHTML(nameValue)}" data-act="name" />
        <button class="btn small" data-act="save">Save current</button>
      </span>
      ${notice ? `<span class="notice">${escapeHTML(notice)}</span>` : ''}
    </section>
  `;
}

function grid(): string {
  return `
    <section class="panel table-panel">
      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th class="corner">sticking</th>
              ${NOTES_PER_BAR.map((n) => {
                const on = setup.shown.includes(n);
                return `
                  <th class="${on ? '' : 'off'}">
                    <button class="colhead ${setup.notesPerBar === n ? 'on' : ''} ${on ? '' : 'off'}"
                      data-act="column" data-value="${n}"
                      title="Click to ${on ? 'hide' : 'show'} this many notes per bar">
                      <b>${n}</b><span>${nameFor(setup, n)}</span>
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
                  <button class="rowhead ${setup.sticking === s.id ? 'on' : ''}" data-act="sticking" data-value="${s.id}">${s.label}</button>
                </th>
                ${NOTES_PER_BAR.map((n) => cell(s.id, n)).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function cell(sticking: StickingId, n: number): string {
  const key = `${sticking}|${n}`;
  const shown = setup.shown.includes(n);
  const index = setup.selection.indexOf(key);
  const active = setup.sticking === sticking && setup.notesPerBar === n;
  return `
    <td>
      <button class="cell ${shown ? '' : 'off'} ${active ? 'active' : ''} ${index >= 0 ? 'selected' : ''}"
        data-key="${key}" data-sticking="${sticking}" data-column="${n}"
        ${shown ? '' : 'disabled'}
        title="${n} notes per bar, ${stickingById(sticking).label}">
        <span class="num">${index >= 0 ? index + 1 : ''}</span>
      </button>
    </td>
  `;
}

function score(): string {
  const steps = planSteps(setup);
  const bars = planBars(setup);
  const cellsWord = steps.length === 1 ? 'cell' : 'cells';
  const barsWord = bars.length === 1 ? 'bar' : 'bars';
  const label = setup.selection.length
    ? `${steps.length} ${cellsWord} · ${bars.length} ${barsWord}`
    : `${setup.notesPerBar} notes per bar · ${stickingById(setup.sticking).label} · ${bars.length} ${barsWord}`;
  return `
    <section class="panel practice">
      <header class="sheet-head">
        <div>
          <h2>Score <span class="note-name">${label}</span></h2>
          <p class="muted">
            ${setup.sig} · ${setup.bpm} BPM · metronome
            ${setup.metronome ? `${voiceLabel(setup.metroVoice)}, ${clicksPerBar(setup)} per bar` : 'off'}
          </p>
        </div>
        <div class="sheet-actions">
          <button class="play" data-act="play">${playing ? 'Stop' : soundsReady ? 'Play' : 'Loading…'}</button>
          <button class="btn small" data-act="save">Save</button>
          <button class="btn small" data-act="share">Share</button>
          <button class="btn small" data-act="pdf">PDF</button>
        </div>
      </header>
      <h2 class="print-only">Drum exercises · ${label}</h2>
      <div class="sheet" data-sheet></div>
      <div class="transport-row"><span class="status" data-status></span></div>
      <p class="legend">
        Sticking above the staff, time signature at the start of each line. Print or
        save as PDF from the PDF button.
      </p>
    </section>
  `;
}

function footer(): string {
  return `
    <footer class="credit">
      Drum samples: MuldjordKit by Lars Muldjord, assembled for the FreePats project
      by Roberto (zenvoid.org), licensed under
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      Source: <a href="https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html" target="_blank" rel="noreferrer">freepats.zenvoid.org</a>.
      Changes: selected one-shots, trimmed tails, peak-normalised, converted to mono WAV.
      Drum samples provided by DrumGizmo.org.
    </footer>
  `;
}

function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

let cursor: HTMLElement | null = null;

function render() {
  const scrollY = window.scrollY;
  app().innerHTML = shell();
  mountScore();
  window.scrollTo(0, scrollY);
  history.replaceState(null, '', shareURL(setup));
  setPlayLabel();
}

function mountScore() {
  const host = document.querySelector('[data-sheet]') as HTMLElement | null;
  if (!host) return;
  noteMeta = renderScore(host, setup);
  cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.hidden = true;
  host.appendChild(cursor);
  setStatus(statusText);
}

function setPlayLabel() {
  const button = document.querySelector('[data-act="play"]') as HTMLButtonElement | null;
  if (button) button.textContent = playing ? 'Stop' : soundsReady ? 'Play' : 'Loading…';
}

function setStatus(text: string) {
  statusText = text;
  const el = document.querySelector('[data-status]');
  if (el) el.textContent = text;
}

function showCursor(meta: NoteMeta) {
  if (!cursor) return;
  cursor.hidden = false;
  cursor.style.left = `${meta.x}px`;
  cursor.style.top = `${meta.top}px`;
  cursor.style.height = `${meta.height}px`;
}

function hideCursor() {
  if (cursor) cursor.hidden = true;
}

function scrollCursor(meta: NoteMeta) {
  const box = document.querySelector('[data-sheet]');
  if (!box || box.scrollHeight <= box.clientHeight + 4) return;
  if (meta.top < box.scrollTop + 50 || meta.top > box.scrollTop + box.clientHeight - 60) {
    box.scrollTo({ top: Math.max(0, meta.top - box.clientHeight / 2), behavior: 'smooth' });
  }
}

function highlightCell(key: string) {
  document.querySelectorAll('.cell.playing').forEach((el) => el.classList.remove('playing'));
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) el.classList.add('playing');
}

function clearPlaying() {
  document.querySelectorAll('.cell.playing').forEach((el) => el.classList.remove('playing'));
  hideCursor();
  setStatus('');
}

function onPlayState(state: PlayState | null) {
  if (!state) {
    playing = false;
    clearPlaying();
    setPlayLabel();
    return;
  }
  if (state.phase === 'countin') {
    hideCursor();
    setStatus(`Count-in ${state.beatsLeft}`);
    return;
  }
  highlightCell(state.stepKey);
  const meta = noteMeta[state.global];
  if (meta) {
    showCursor(meta);
    scrollCursor(meta);
  }
  const prefix = state.stepCount > 1 ? `Step ${state.stepIndex + 1} of ${state.stepCount} · ` : '';
  setStatus(`${prefix}stroke ${state.local + 1} of ${state.count}`);
}

function togglePlay() {
  if (playing) {
    player.stop();
    return;
  }
  if (!soundsReady) return;
  player.play(setup, { loop, countIn }, onPlayState);
  playing = true;
  setPlayLabel();
}

function setSetup(patch: Partial<Setup>) {
  setup = normalizeSetup({ ...setup, ...patch });
  playing = false;
  player.stop();
  notice = '';
  render();
}

function cellLive(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const button = el as HTMLButtonElement;
  return !button.disabled && setup.shown.includes(Number(button.dataset.column));
}

let drag: { mode: 'add' | 'remove'; changed: boolean } | null = null;

function dragSelect(key: string) {
  const index = setup.selection.indexOf(key);
  if (drag?.mode === 'add' && index < 0) {
    setup.selection.push(key);
    drag.changed = true;
  } else if (drag?.mode === 'remove' && index >= 0) {
    setup.selection.splice(index, 1);
    drag.changed = true;
  }
}

function refreshSelection() {
  document.querySelectorAll('.cell[data-key]').forEach((el) => {
    const index = setup.selection.indexOf((el as HTMLElement).dataset.key ?? '');
    el.classList.toggle('selected', index >= 0);
    const num = el.querySelector('.num');
    if (num) num.textContent = index >= 0 ? String(index + 1) : '';
  });
}

document.addEventListener('mousedown', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-key]') : null;
  if (!cellLive(button) || !event.shiftKey) return;
  event.preventDefault();
  const key = (button as HTMLElement).dataset.key as string;
  drag = { mode: setup.selection.includes(key) ? 'remove' : 'add', changed: false };
  dragSelect(key);
  render();
});

document.addEventListener('mouseover', (event) => {
  if (!drag) return;
  const button = event.target instanceof Element ? event.target.closest('[data-key]') : null;
  if (!cellLive(button)) return;
  dragSelect((button as HTMLElement).dataset.key as string);
  refreshSelection();
});

document.addEventListener('mouseup', () => {
  if (drag?.changed) {
    playing = false;
    player.stop();
    render();
  }
  drag = null;
});

document.addEventListener('click', (event) => {
  const el = event.target instanceof Element ? event.target.closest('[data-act], [data-key]') : null;
  if (!el) return;
  if (event.shiftKey) return;
  const act = (el as HTMLElement).dataset.act;

  if ((el as HTMLElement).dataset.key && !act) {
    const column = Number((el as HTMLElement).dataset.column);
    if (!setup.shown.includes(column)) return;
    setSetup({
      sticking: (el as HTMLElement).dataset.sticking as StickingId,
      notesPerBar: column,
    });
    return;
  }

  if (act === 'column') {
    const n = Number((el as HTMLElement).dataset.value);
    const on = setup.shown.includes(n);
    const shown = on ? setup.shown.filter((r) => r !== n) : [...setup.shown, n].sort((a, b) => a - b);
    if (!shown.length) return;
    const selection = on ? setup.selection.filter((key) => Number(key.split('|')[1]) !== n) : setup.selection;
    setSetup({
      shown,
      selection,
      notesPerBar: shown.includes(setup.notesPerBar) ? setup.notesPerBar : shown[0],
    });
  } else if (act === 'sticking') {
    setSetup({ sticking: (el as HTMLElement).dataset.value as StickingId });
  } else if (act === 'metrounit') {
    setSetup({ metroUnit: (el as HTMLElement).dataset.value as Setup['metroUnit'] });
  } else if (act === 'play') {
    togglePlay();
  } else if (act === 'save') {
    saveCurrent();
  } else if (act === 'share') {
    copyShare(el as HTMLButtonElement);
  } else if (act === 'pdf') {
    window.print();
  } else if (act === 'load') {
    loadSelected();
  } else if (act === 'delete') {
    removeSelected();
  }
});

document.addEventListener('change', (event) => {
  const el = event.target instanceof Element ? event.target.closest('[data-act]') : null;
  if (!el) return;
  const act = (el as HTMLElement).dataset.act;
  const value = (el as HTMLInputElement).value;

  if (act === 'bars') setSetup({ bars: Number(value) });
  else if (act === 'bpm') setSetup({ bpm: Number(value) });
  else if (act === 'sig') setSetup({ sig: value as SigId });
  else if (act === 'metronome') setSetup({ metronome: (el as HTMLInputElement).checked });
  else if (act === 'metrovoice') setSetup({ metroVoice: value as Setup['metroVoice'] });
  else if (act === 'right') setSetup({ right: value as VoiceId });
  else if (act === 'left') setSetup({ left: value as VoiceId });
  else if (act === 'loop') {
    loop = (el as HTMLInputElement).checked;
    if (playing) {
      player.play(setup, { loop, countIn }, onPlayState);
      playing = true;
      setPlayLabel();
    }
  } else if (act === 'countin') {
    countIn = (el as HTMLInputElement).checked;
  } else if (act === 'saved') {
    savedId = value;
    render();
  }
});

document.addEventListener('input', (event) => {
  const el = event.target instanceof Element ? event.target.closest('[data-act]') : null;
  if (!el) return;
  if ((el as HTMLElement).dataset.act === 'name') {
    nameValue = (el as HTMLInputElement).value;
  }
});

function saveCurrent() {
  if (!nameValue.trim()) {
    notice = 'Name it first';
    render();
    const input = document.querySelector('[data-act="name"]') as HTMLInputElement | null;
    input?.focus();
    return;
  }
  saved = saveSetup(nameValue, setup, saved);
  savedId = saved.find((item) => item.name === nameValue.trim())?.id ?? '';
  notice = 'Saved';
  render();
}

function loadSelected() {
  const entry = saved.find((item) => item.id === savedId) ?? saved[0];
  if (!entry) return;
  savedId = entry.id;
  setup = normalizeSetup(entry.setup);
  nameValue = entry.name;
  notice = `Loaded ${entry.name}`;
  render();
}

function removeSelected() {
  const entry = saved.find((item) => item.id === savedId) ?? saved[0];
  if (!entry) return;
  saved = deleteSetup(entry.id, saved);
  savedId = saved[0]?.id ?? '';
  notice = 'Deleted';
  render();
}

async function copyShare(button: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(shareURL(setup));
    button.textContent = 'Copied';
    window.setTimeout(() => {
      button.textContent = 'Share';
    }, 1500);
  } catch {
    window.prompt('Copy this link', shareURL(setup));
  }
}

// Print at a fixed page width so the score scales predictably.
window.addEventListener('beforeprint', () => {
  const pageWidth = 700;
  document.querySelectorAll<SVGSVGElement>('.system svg').forEach((svg) => {
    const box = svg.viewBox.baseVal;
    if (!box || !box.width) return;
    const height = pageWidth * (box.height / box.width);
    svg.setAttribute('width', String(pageWidth));
    svg.setAttribute('height', String(height));
    svg.style.width = `${pageWidth}px`;
    svg.style.height = `${height}px`;
    const parent = svg.parentElement;
    if (parent) parent.style.height = `${height}px`;
  });
});

window.addEventListener('resize', () => {
  if (!playing) mountScore();
});

savedId = saved[0]?.id ?? '';
render();
