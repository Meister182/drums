import { DEFAULT_SETUP, normalizeSetup, type Setup } from './model';

const FIELDS = ['sig', 'bpm', 'bars', 'm', 'mu', 'mv', 'r', 'l', 'n', 's', 'shown', 'sel'];

export function setupToParams(setup: Setup): URLSearchParams {
  const p = new URLSearchParams();
  p.set('sig', setup.sig);
  p.set('bpm', String(setup.bpm));
  p.set('bars', String(setup.bars));
  p.set('m', setup.metronome ? '1' : '0');
  p.set('mu', setup.metroUnit);
  p.set('mv', setup.metroVoice);
  p.set('r', setup.right);
  p.set('l', setup.left);
  p.set('n', String(setup.notesPerBar));
  p.set('s', setup.sticking);
  p.set('shown', setup.shown.join(','));
  if (setup.selection.length) p.set('sel', setup.selection.join(','));
  return p;
}

export function shareURL(setup: Setup, base = window.location.href) {
  const url = new URL(base);
  url.search = setupToParams(setup).toString();
  url.hash = '';
  return url.toString();
}

export function setupFromParams(params: URLSearchParams): Setup | null {
  if (!FIELDS.some((field) => params.has(field))) return null;
  const raw: Record<string, unknown> = {
    version: 1,
    sig: params.get('sig') ?? DEFAULT_SETUP.sig,
    bpm: params.get('bpm') ?? DEFAULT_SETUP.bpm,
    bars: params.get('bars') ?? DEFAULT_SETUP.bars,
    metronome: params.get('m') !== '0',
    metroUnit: params.get('mu') ?? DEFAULT_SETUP.metroUnit,
    metroVoice: params.get('mv') ?? DEFAULT_SETUP.metroVoice,
    right: params.get('r') ?? DEFAULT_SETUP.right,
    left: params.get('l') ?? DEFAULT_SETUP.left,
    notesPerBar: params.get('n') ?? DEFAULT_SETUP.notesPerBar,
    sticking: params.get('s') ?? DEFAULT_SETUP.sticking,
    shown: (params.get('shown') ?? '').split(',').filter(Boolean),
    selection: (params.get('sel') ?? '').split(',').filter(Boolean),
  };
  return normalizeSetup(raw);
}
