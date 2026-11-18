---
id: "05"
title: Design the practice UI
labels: [wayfinder:prototype]
blocked_by: ["01"]
status: open
assignee: Alexandre Marques
---

## Question

What does a student actually see and touch?

With the model settled, this is the table (columns are rates, rows are
stickings), the settings under it, the sheet at the bottom with bars, time
signature, tempo and Play, the metronome, the R and L instrument assignment, the
ordered play selection, and per-cell overrides. It also covers which rates are
on the table.

Raise the fidelity with a rough, clickable prototype the teacher can react to,
including one screen at phone width. The resolution names the chosen layout and
links the prototype.

## Prototype

Live at <https://meister182.github.io/drums/prototype/>, source in `prototype/`.
Throwaway code: no tests, no persistence, audio is synthesized stand-ins,
notation uses VexFlow 5 with a hand-drawn sticking row.

Third revision after the 2026-11-18 feedback:

- Table first: notes-per-bar chips above the grid, all 16 counts visible, the
  deselected ones greyed out with their cells disabled. A line above the grid
  describes the current cell, and shows its overrides and a Reset cell button.
- Score panel under it: a config bar with Bars, Sig, Tempo, Metronome, R and L
  strokes, "Change only this cell", Loop, Count-in and Play, then the sheet.
- Cell overrides: with the toggle on, config changes write to the current cell
  instead of the shared settings. Overridden cells get a marked border, the
  current-cell line lists what is overridden, and Reset cell clears it.
- The sheet renders the whole score: the selected cells in order, or the current
  cell when nothing is selected. Bars are connected, one clef per line, up to
  four per line, fewer when the rate needs the room.
- The sheet lives in its own scroll box so the table stays put, and clicking a
  cell scrolls the page down to it.
- Playback highlights the playing cell in the table and the current note in the
  sheet, scrolling the sheet box to keep the note in view.
- Page scroll is preserved when bars or configs change.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&m=1&mv=ride&r=snare&l=kick&rates=1,2,3,4,6,8,12,16`.
A three-cell score:
`&sel=singles%7C4,doubles%7C6,singles%7C8`.

Known prototype limits: tempo changes take effect on the next pass, the config
bar edits the current cell rather than a whole score, overrides have no touch
equivalent beyond the toggle, and a phone drops to one bar per line at high
rates.

### What to react to

1. Is the current-cell line above the grid the right home for the cell configs?
2. Is "Change only this cell" as a checkbox clear, and is the override marking
   strong enough?
3. Does the full score for a selection read right, with the table still visible?
4. Is the sheet's own scroll box the right call, or should the panel stick to
   the viewport instead?
5. Does clicking a cell scrolling down to the sheet feel right?
6. Is four bars per line right when it fits, and is dropping to three or two for
   dense rates acceptable?
7. What is missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
