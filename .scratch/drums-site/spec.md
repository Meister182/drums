---
title: "Drums exercise site: notes-per-bar table, sheet, playback, hosting"
labels: [wayfinder:map]
feature: drums-site
---

## Destination

A build-ready spec for a free, static drums-exercise site: a table of notes per
bar by sticking, the sheet and playback for the selected combination, metronome
and instrument assignment, and a published link the teacher can share. Charting
ends with the spec; building it is the second phase.

## Notes

Domain: a drums teacher picks a rate (notes per bar) and a sticking, assigns
instruments to the R and L strokes, sets the bar count and tempo, and plays it.
Students open a link and practise.

Settled after the pivot (2026-11-17):

- 4/4 only. A bar is four quarter-note beats.
- Columns are notes per bar, every integer from 1 to 16. Standard note values
  get their name (whole, half, half triplet, quarter, quarter triplet, eighth,
  eighth triplet, sixteenth); the rest are tuplets over the bar.
- Columns can be switched on and off, so the table only shows what the current
  exercise needs.
- Rows are stickings: singles, doubles, single paradiddle, double paradiddle,
  paradiddle-diddle. Custom rows are not decided.
- Bar count is configurable. No alignment helper, no leftover math.
- Tempo is BPM, counting quarter notes.
- The metronome is a checkbox and plays the quarter notes, independent of the
  sticking, on its own instrument, even when a stroke uses the same instrument.
- Two sound layers: the R strokes and the L strokes each get an instrument, and
  the metronome gets its own. That covers hand and foot voicings, for example R
  on bass drum, L on snare, metronome on the ride.
- Dropped in the pivot: sequence playback, paths, the align helper, student
  mode, layout variants, the old clicks-per-bar and notes-per-click axes.

Skills: `grilling`, `domain-modeling`, `prototype`, `research`.

## Decisions so far

- [Research notation rendering and PDF export](issues/03-notation-research.md):
  VexFlow 5.2.0 SVG with a hand-drawn sticking row, PDF via `window.print()`;
  abcjs as fallback.
- [Research drum samples and licensing](issues/04-samples-research.md):
  MuldjordKit FreePats edition (CC BY 4.0, 2.5 MB shipped), synthesized click,
  lookahead scheduler; credit "Drum samples provided by DrumGizmo.org."
- [Stand up GitHub Pages hosting](issues/07-github-pages.md):
  live at <https://meister182.github.io/drums-page/> from `Meister182/drums-page`,
  legacy Pages on `main`, push to redeploy.
- [Settle the rhythm model](issues/01-settle-rhythm-model.md):
  notes per bar as the single rate axis, 4/4, configurable bars, BPM in quarter
  notes, independent quarter-note metronome, R and L stroke instruments.

## Not yet specified

- Custom stickings and how rows are added; the teacher is unsure and mentioned
  hand-foot coordination.
- Whether feet get their own layer or stay as instruments in the R/L list.
- Whether the metronome rate is configurable beyond the quarter notes.
- Phone layout details and keeping the screen awake while practising.
- How an exercise or a set of them is saved and shared: links, files, both.
- Print layout details beyond PDF export.

## Out of scope

- Sequence playback, auto-advance and paths. Closed ticket:
  [Design sequence playback](issues/06-sequence-playback.md).
- The align helper and leftover-cycle badges. Dropped from the model.
- Student mode, and layout variants B and C.
- Accounts, a teacher dashboard, native apps, backing tracks.
