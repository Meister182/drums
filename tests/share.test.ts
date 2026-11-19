import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, type Setup } from '../src/model';
import { setupFromParams, setupToParams, shareURL } from '../src/share';

const setup: Setup = {
  ...DEFAULT_SETUP,
  sig: '6/8',
  bpm: 96,
  bars: 3,
  metroUnit: 'bar',
  metroVoice: 'ride',
  right: 'kick',
  left: 'snare',
  notesPerBar: 6,
  sticking: 'double-paradiddle',
  shown: [1, 2, 3, 4, 6, 8, 12, 16],
  selection: ['singles|4', 'doubles|6'],
};

describe('share links', () => {
  it('round-trips a setup', () => {
    const decoded = setupFromParams(setupToParams(setup));
    expect(decoded).toEqual(setup);
  });

  it('builds a URL without a hash and with the params', () => {
    const url = new URL(shareURL(setup, 'https://example.test/drums/'));
    expect(url.origin + url.pathname).toBe('https://example.test/drums/');
    expect(url.searchParams.get('sig')).toBe('6/8');
    expect(url.searchParams.get('mu')).toBe('bar');
    expect(url.searchParams.get('sel')).toBe('singles|4,doubles|6');
  });

  it('returns nothing when the URL carries no setup', () => {
    expect(setupFromParams(new URLSearchParams(''))).toBeNull();
    expect(setupFromParams(new URLSearchParams('?utm=1'))).toBeNull();
  });
});
