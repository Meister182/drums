import {
  Barline,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Tuplet,
  Voice,
} from 'vexflow/bravura';
import {
  barQuarters,
  beatsPerBar,
  clickValue,
  clicksPerBar,
  compound,
  grouping,
  planBars,
  strokeHands,
  voiceById,
  type Setup,
} from './model';

export type NoteMeta = { index: number; x: number; top: number; height: number };

type NoteInfo = { index: number; hand: 'R' | 'L' };

export function renderScore(host: HTMLElement, setup: Setup): NoteMeta[] {
  host.innerHTML = '';
  const meta: NoteMeta[] = [];

  const width = Math.max(300, Math.floor(host.getBoundingClientRect().width - 8));
  const bars = planBars(setup);
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

      const spec = grouping(setup, step.n);
      const stave = new Stave(x, y, barWidth);
      if (col === 0) {
        stave.addClef('percussion');
        stave.addTimeSignature(setup.sig);
      }
      stave.setBegBarType(col === 0 ? Barline.type.SINGLE : Barline.type.NONE);
      stave.setEndBarType(Barline.type.SINGLE);
      stave.setContext(ctx).draw();
      const staffTop = stave.getYForLine(0);
      ctx.setFillStyle('#1b1b1a');

      const hands = strokeHands(setup, step.sticking, step.bars * step.n);
      const barOffset = bars[i].barInStep * step.n;
      const groups: StaveNote[][] = [];
      const info = new Map<StaveNote, NoteInfo>();
      let cursor = 0;
      while (cursor < step.n) {
        const size = Math.min(spec.group, step.n - cursor);
        const group: StaveNote[] = [];
        for (let k = 0; k < size; k += 1) {
          const hand = hands[barOffset + cursor + k];
          const def = voiceById(hand === 'R' ? step.right : step.left);
          const note = new StaveNote({
            keys: [def.note ?? 'c/5'],
            duration: spec.duration,
            dots: spec.dots,
            clef: 'percussion',
          });
          note.setStemDirection(-1);
          info.set(note, { index: noteIndex, hand });
          noteIndex += 1;
          group.push(note);
        }
        groups.push(group);
        cursor += size;
      }

      const all = groups.flat();
      const beamed = ['8', '16', '32'].includes(spec.duration);
      const tuplets = spec.ratio
        ? groups.map(
            (g) =>
              new Tuplet(g, {
                numNotes: spec.ratio![0],
                notesOccupied: spec.ratio![1],
                bracketed: !beamed,
                location: -1,
              }),
          )
        : [];
      const beams = beamed
        ? groups
            .filter((g) => g.length > 1)
            .map((g) => {
              const beam = new Beam(g);
              beam.renderOptions.flatBeams = true;
              return beam;
            })
        : [];

      const voices = [new Voice({ numBeats: barQuarters(setup), beatValue: 4 }).setStrict(false).addTickables(all)];

      const metroNote = step.metronome && voiceById(step.metroVoice).note ? voiceById(step.metroVoice).note : null;
      if (metroNote) {
        const value = clickValue(setup);
        const metroNotes = Array.from({ length: clicksPerBar(setup) }, () => {
          const note = new StaveNote({
            keys: [metroNote],
            duration: value.duration,
            dots: value.dots,
            clef: 'percussion',
          });
          note.setStemDirection(1);
          return note;
        });
        voices.push(
          new Voice({ numBeats: barQuarters(setup), beatValue: 4 }).setStrict(false).addTickables(metroNotes),
        );
      }

      const noteArea = stave.getNoteEndX() - stave.getNoteStartX() - 16;
      const formatter = new Formatter();
      voices.forEach((v) => formatter.joinVoices([v]));
      formatter.format(voices, noteArea);
      voices.forEach((v) => v.draw(ctx, stave));
      beams.forEach((beam) => beam.setContext(ctx).draw());
      tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());

      ctx.setFont('Arial', barWidth < 360 ? 9 : 11, 700);
      ctx.setFillStyle('#1b1b1a');
      for (const note of all) {
        const noteInfo = info.get(note);
        if (!noteInfo) continue;
        const nx = note.getAbsoluteX();
        const letterX = Math.min(Math.max(nx + 1, x + 14), x + barWidth - 14);
        ctx.fillText(noteInfo.hand, letterX, staffTop - 58);
        meta.push({
          index: noteInfo.index,
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
  return meta;
}
