import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETUP,
  barQuarters,
  beatsPerBar,
  clicksPerBar,
  grouping,
  nameFor,
  normalizeSetup,
  planBars,
  planSteps,
  strokeHands,
  type Setup,
} from '../src/model';

const setup = (patch: Partial<Setup> = {}): Setup => ({ ...DEFAULT_SETUP, ...patch });

describe('the rhythm model', () => {
  it('maps counts to note values in 4/4', () => {
    expect(grouping(setup(), 4)).toMatchObject({ duration: 'q', ratio: null });
    expect(grouping(setup(), 12)).toMatchObject({ duration: '8', ratio: [3, 2], group: 3 });
    expect(grouping(setup(), 5)).toMatchObject({ duration: 'q', ratio: [5, 4] });
    expect(grouping(setup(), 16)).toMatchObject({ duration: '16', ratio: null });
  });

  it('uses dotted values where they land', () => {
    expect(grouping(setup({ sig: '3/4' }), 1)).toMatchObject({ duration: 'h', dots: 1 });
    expect(grouping(setup({ sig: '3/4' }), 4)).toMatchObject({ duration: '8', dots: 1 });
    expect(grouping(setup({ sig: '6/8' }), 9)).toMatchObject({ duration: '8', dots: 0, ratio: [9, 6] });
  });

  it('knows the bar length and beat count per signature', () => {
    expect(barQuarters(setup({ sig: '6/8' }))).toBe(3);
    expect(beatsPerBar(setup({ sig: '6/8' }))).toBe(2);
    expect(beatsPerBar(setup({ sig: '3/4' }))).toBe(3);
  });

  it('counts metronome clicks per unit', () => {
    expect(clicksPerBar(setup({ sig: '6/8', metroUnit: 'bar' }))).toBe(1);
    expect(clicksPerBar(setup({ sig: '6/8', metroUnit: 'beat' }))).toBe(2);
    expect(clicksPerBar(setup({ sig: '6/8', metroUnit: 'eighth' }))).toBe(6);
    expect(clicksPerBar(setup({ sig: '4/4', metroUnit: 'eighth' }))).toBe(8);
  });

  it('names the counts', () => {
    expect(nameFor(setup(), 12)).toBe('eighth triplets');
    expect(nameFor(setup(), 6)).toBe('quarter triplets');
    expect(nameFor(setup({ sig: '3/4' }), 1)).toBe('dotted half');
  });

  it('tiles the sticking across bars', () => {
    expect(strokeHands(setup(), 'doubles', 6)).toEqual(['R', 'R', 'L', 'L', 'R', 'R']);
    expect(strokeHands(setup(), 'paradiddle-diddle', 6)).toEqual(['R', 'L', 'R', 'R', 'L', 'L']);
  });

  it('builds a plan from the play order, or the current cell', () => {
    const single = planSteps(setup());
    expect(single).toHaveLength(1);
    expect(planBars(setup())).toHaveLength(2);

    const ordered = planSteps(setup({ selection: ['singles|4', 'doubles|6'] }));
    expect(ordered.map((s) => s.n)).toEqual([4, 6]);
    expect(planBars(setup({ selection: ['singles|4', 'doubles|6'] }))).toHaveLength(4);
  });
});

describe('normalizeSetup', () => {
  it('clamps and repairs bad input', () => {
    const fixed = normalizeSetup({ bpm: 900, bars: 0, notesPerBar: 99, shown: [99, 3], selection: ['bogus|2'] });
    expect(fixed.bpm).toBe(200);
    expect(fixed.bars).toBe(1);
    expect(fixed.notesPerBar).toBe(DEFAULT_SETUP.notesPerBar);
    expect(fixed.shown).toEqual([3]);
    expect(fixed.selection).toEqual([]);
  });

  it('drops to defaults from garbage', () => {
    expect(normalizeSetup(null)).toEqual(DEFAULT_SETUP);
  });
});
