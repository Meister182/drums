import './style.css';
import { Player, type PlayState } from './audio';
import {
  DEFAULT_SETUP,
  NOTES_PER_BAR,
  SIGNATURES,
  STICKINGS,
  VOICES,
  clicksPerBar,
  planBars,
  planSteps,
  normalizeSetup,
  type Setup,
  type SigId,
  type StickingId,
  type VoiceId,
} from './model';
import { rateName, stickingName, t, voiceName, type Lang } from './i18n';
import { renderScore, type NoteMeta } from './notation';
import { deleteSetup, loadLibrary, saveSetup, type SavedSetup } from './library';
import { setupFromParams, shareURL } from './share';

const params = new URLSearchParams(window.location.search);
const initial = setupFromParams(params);
const LANG_KEY = 'drums.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch {
    // storage disabled
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

type Notice = { key: Parameters<typeof t>[1]; vars?: Record<string, string | number> };

let lang: Lang = initialLang();
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
let notice: Notice | null = null;
let suppressClick = false;

const player = new Player();
player
  .load()
  .then(() => {
    soundsReady = true;
    render();
  })
  .catch(() => {
    notice = { key: 'soundsFailed' };
    render();
  });

function app(): HTMLElement {
  return document.getElementById('app') as HTMLElement;
}

function shell(): string {
  return `
    ${topbar()}
    ${config()}
    <p class="hints">${t(lang, 'hints')}</p>
    ${library()}
    ${grid()}
    ${score()}
    ${footer()}
  `;
}

function topbar(): string {
  return `
    <header class="topbar">
      <div class="brand">${t(lang, 'appTitle')}</div>
      <div class="seg lang-switch">
        <button class="seg-btn ${lang === 'en' ? 'on' : ''}" data-act="lang" data-value="en">EN</button>
        <button class="seg-btn ${lang === 'pt' ? 'on' : ''}" data-act="lang" data-value="pt">PT</button>
      </div>
    </header>
  `;
}

function config(): string {
  return `
    <section class="panel configbar">
      <label class="inline-field">${t(lang, 'bars')}
        <input type="number" min="1" max="16" value="${setup.bars}" data-act="bars" />
      </label>
      <label class="inline-field">${t(lang, 'sig')}
        <select data-act="sig">
          ${SIGNATURES.map((s) => `<option value="${s.id}" ${setup.sig === s.id ? 'selected' : ''}>${s.id}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">${t(lang, 'tempo')}
        <span class="row">
          <input type="number" min="30" max="200" step="1" value="${setup.bpm}" data-act="bpm" />
          <span class="unit-label">BPM</span>
        </span>
      </label>
      <label class="inline-field">${t(lang, 'metronome')}
        <span class="row">
          <input type="checkbox" data-act="metronome" ${setup.metronome ? 'checked' : ''} />
          <select data-act="metrovoice">
            ${VOICES.filter((v) => v.id !== 'none')
              .map(
                (v) =>
                  `<option value="${v.id}" ${setup.metroVoice === v.id ? 'selected' : ''}>${voiceName(v.id, lang)}</option>`,
              )
              .join('')}
          </select>
          <span class="unit-label">${t(lang, 'every')}</span>
          <span class="seg">
            ${[
              ['bar', 'unitBar'],
              ['beat', 'unitBeat'],
              ['eighth', 'unitEighth'],
            ]
              .map(
                ([value, key]) =>
                  `<button class="seg-btn ${setup.metroUnit === value ? 'on' : ''}" data-act="metrounit" data-value="${value}">${t(lang, key as Parameters<typeof t>[1])}</button>`,
              )
              .join('')}
          </span>
        </span>
      </label>
      <label class="inline-field">${t(lang, 'right')}
        <select data-act="right">
          ${VOICES.map((v) => `<option value="${v.id}" ${setup.right === v.id ? 'selected' : ''}>${voiceName(v.id, lang)}</option>`).join('')}
        </select>
      </label>
      <label class="inline-field">${t(lang, 'left')}
        <select data-act="left">
          ${VOICES.map((v) => `<option value="${v.id}" ${setup.left === v.id ? 'selected' : ''}>${voiceName(v.id, lang)}</option>`).join('')}
        </select>
      </label>
      <label class="switch"><input type="checkbox" data-act="loop" ${loop ? 'checked' : ''} /> ${t(lang, 'loop')}</label>
      <label class="switch"><input type="checkbox" data-act="countin" ${countIn ? 'checked' : ''} /> ${t(lang, 'countIn')}</label>
    </section>
  `;
}

function library(): string {
  return `
    <section class="panel library">
      <span class="label">${t(lang, 'library')}</span>
      ${saved.length
        ? `<select data-act="saved">
            ${saved
              .map((item) => `<option value="${item.id}" ${item.id === savedId ? 'selected' : ''}>${escapeHTML(item.name)}</option>`)
              .join('')}
          </select>
          <button class="btn small" data-act="load">${t(lang, 'load')}</button>
          <button class="btn small" data-act="delete">${t(lang, 'delete')}</button>`
        : `<span class="muted small">${t(lang, 'nothingSaved')}</span>`}
      <span class="library-save">
        <input type="text" placeholder="${t(lang, 'namePlaceholder')}" value="${escapeHTML(nameValue)}" data-act="name" />
        <button class="btn small" data-act="save">${t(lang, 'saveCurrent')}</button>
      </span>
      ${notice ? `<span class="notice">${escapeHTML(t(lang, notice.key, notice.vars))}</span>` : ''}
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
              <th class="corner">${t(lang, 'sticking')}</th>
              ${NOTES_PER_BAR.map((n) => {
                const on = setup.shown.includes(n);
                return `
                  <th class="${on ? '' : 'off'}">
                    <button class="colhead ${setup.notesPerBar === n ? 'on' : ''} ${on ? '' : 'off'}"
                      data-act="column" data-value="${n}"
                      title="${rateName(setup, n, lang)}">
                      <b>${n}</b><span>${rateName(setup, n, lang)}</span>
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
                  <button class="rowhead ${setup.sticking === s.id ? 'on' : ''}" data-act="sticking" data-value="${s.id}">${stickingName(s.id, lang)}</button>
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
        title="${n} ${t(lang, 'notesPerBar')}, ${stickingName(sticking, lang)}">
        <span class="num">${index >= 0 ? index + 1 : ''}</span>
      </button>
    </td>
  `;
}

function score(): string {
  const steps = planSteps(setup);
  const bars = planBars(setup);
  const cellsWord = t(lang, steps.length === 1 ? 'cell' : 'cells');
  const barsWord = t(lang, bars.length === 1 ? 'bar' : 'barsWord');
  const label = setup.selection.length
    ? `${steps.length} ${cellsWord} · ${bars.length} ${barsWord}`
    : `${setup.notesPerBar} ${t(lang, 'notesPerBar')} · ${stickingName(setup.sticking, lang)} · ${bars.length} ${barsWord}`;
  return `
    <section class="panel practice">
      <header class="sheet-head">
        <div>
          <h2>${t(lang, 'score')} <span class="note-name">${label}</span></h2>
          <p class="muted">
            ${setup.sig} · ${setup.bpm} BPM · ${t(lang, 'metronome')}
            ${setup.metronome ? `${voiceName(setup.metroVoice, lang)}, ${clicksPerBar(setup)} ${t(lang, 'perBar')}` : t(lang, 'metronomeOff')}
          </p>
        </div>
        <div class="sheet-actions">
          <button class="play" data-act="play">${playing ? t(lang, 'stop') : soundsReady ? t(lang, 'play') : t(lang, 'loading')}</button>
          <button class="btn small" data-act="save">${t(lang, 'save')}</button>
          <button class="btn small" data-act="share">${t(lang, 'share')}</button>
          <button class="btn small" data-act="pdf">${t(lang, 'pdf')}</button>
        </div>
      </header>
      <h2 class="print-only">${t(lang, 'printTitle')} · ${label}</h2>
      <div class="sheet" data-sheet></div>
      <div class="transport-row"><span class="status" data-status>${statusText}</span></div>
      <p class="legend">${t(lang, 'legend')}</p>
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
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

let cursor: HTMLElement | null = null;

function render() {
  const scrollY = window.scrollY;
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = t(lang, 'appTitle');
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
  if (button) button.textContent = playing ? t(lang, 'stop') : soundsReady ? t(lang, 'play') : t(lang, 'loading');
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
    setStatus(t(lang, 'countInStatus', { n: state.beatsLeft }));
    return;
  }
  highlightCell(state.stepKey);
  const meta = noteMeta[state.global];
  if (meta) {
    showCursor(meta);
    scrollCursor(meta);
  }
  const stroke = t(lang, 'strokeStatus', { i: state.local + 1, n: state.count });
  const prefix = state.stepCount > 1 ? `${t(lang, 'stepStatus', { i: state.stepIndex + 1, n: state.stepCount })} · ` : '';
  setStatus(`${prefix}${stroke}`);
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
  setup = { ...setup, ...patch };
  playing = false;
  player.stop();
  notice = null;
  render();
}

function cellLive(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const button = el as HTMLButtonElement;
  return !button.disabled && setup.shown.includes(Number(button.dataset.column));
}

function refreshSelection() {
  document.querySelectorAll('.cell[data-key]').forEach((el) => {
    const index = setup.selection.indexOf((el as HTMLElement).dataset.key ?? '');
    el.classList.toggle('selected', index >= 0);
    const num = el.querySelector('.num');
    if (num) num.textContent = index >= 0 ? String(index + 1) : '';
  });
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

// Touch: press and hold a cell, then drag to select or deselect along the grid.
let touchHold: { timer: number; key: string; x: number; y: number } | null = null;
let touchDrag: { mode: 'add' | 'remove'; last: string } | null = null;
let banner: HTMLElement | null = null;

function cancelHold() {
  if (touchHold) {
    clearTimeout(touchHold.timer);
    touchHold = null;
  }
}

function startTouchSelect(key: string) {
  touchHold = null;
  suppressClick = true;
  const mode = setup.selection.includes(key) ? 'remove' : 'add';
  touchDrag = { mode, last: key };
  applyTouchSelect(key);
  document.body.classList.add('touch-selecting');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'touch-banner';
    document.body.appendChild(banner);
  }
  banner.textContent = t(lang, 'touchSelect');
  navigator.vibrate?.(15);
}

function applyTouchSelect(key: string) {
  const index = setup.selection.indexOf(key);
  if (touchDrag?.mode === 'add' && index < 0) setup.selection.push(key);
  else if (touchDrag?.mode === 'remove' && index >= 0) setup.selection.splice(index, 1);
  refreshSelection();
}

function endTouchSelect() {
  cancelHold();
  if (!touchDrag) return;
  touchDrag = null;
  document.body.classList.remove('touch-selecting');
  banner?.remove();
  banner = null;
  playing = false;
  player.stop();
  render();
  window.setTimeout(() => {
    suppressClick = false;
  }, 400);
}

document.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse') return;
  const cell = event.target instanceof Element ? event.target.closest('[data-key]') : null;
  if (!cellLive(cell)) return;
  const key = (cell as HTMLElement).dataset.key as string;
  cancelHold();
  touchHold = {
    key,
    x: event.clientX,
    y: event.clientY,
    timer: window.setTimeout(() => startTouchSelect(key), 450),
  };
});

document.addEventListener(
  'pointermove',
  (event) => {
    if (event.pointerType === 'mouse') return;
    if (touchHold) {
      if (Math.hypot(event.clientX - touchHold.x, event.clientY - touchHold.y) > 10) cancelHold();
    }
    if (!touchDrag) return;
    event.preventDefault();
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const cell = under?.closest('[data-key]') ?? null;
    if (!cellLive(cell)) return;
    const key = (cell as HTMLElement).dataset.key as string;
    if (key !== touchDrag.last) {
      touchDrag.last = key;
      applyTouchSelect(key);
    }
  },
  { passive: false },
);

document.addEventListener('touchmove', (event) => {
  if (touchDrag) event.preventDefault();
}, { passive: false });

document.addEventListener('pointerup', endTouchSelect);
document.addEventListener('pointercancel', endTouchSelect);

document.addEventListener('click', (event) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
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
  } else if (act === 'lang') {
    lang = (el as HTMLElement).dataset.value === 'pt' ? 'pt' : 'en';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
    render();
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
  if ((el as HTMLElement).dataset.act === 'name') nameValue = (el as HTMLInputElement).value;
});

function saveCurrent() {
  if (!nameValue.trim()) {
    notice = { key: 'nameFirst' };
    render();
    const input = document.querySelector('[data-act="name"]') as HTMLInputElement | null;
    input?.focus();
    return;
  }
  saved = saveSetup(nameValue, setup, saved);
  savedId = saved.find((item) => item.name === nameValue.trim())?.id ?? '';
  notice = { key: 'savedNotice' };
  render();
}

function loadSelected() {
  const entry = saved.find((item) => item.id === savedId) ?? saved[0];
  if (!entry) return;
  savedId = entry.id;
  setup = entry.setup;
  nameValue = entry.name;
  notice = { key: 'loadedNotice', vars: { name: entry.name } };
  render();
}

function removeSelected() {
  const entry = saved.find((item) => item.id === savedId) ?? saved[0];
  if (!entry) return;
  saved = deleteSetup(entry.id, saved);
  savedId = saved[0]?.id ?? '';
  notice = { key: 'deletedNotice' };
  render();
}

async function copyShare(button: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(shareURL(setup));
    button.textContent = t(lang, 'copied');
    window.setTimeout(() => {
      button.textContent = t(lang, 'share');
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
