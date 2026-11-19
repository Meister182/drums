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

Fourth revision after the 2026-11-19 feedback:

- Hints at the top, then the config bar (bars, sig, tempo, metronome, R and L,
  loop, count-in, Play), then the grid, then the score.
- No dedicated notes-per-bar selector and no per-cell configs. Clicking a column
  title shows or hides that count; hidden counts are greyed and their cells are
  disabled. Hiding a count removes its cells from the play order.
- The grid always keeps all 16 counts in place, so nothing jumps around.
- The time signature is printed at the start of each line.
- Clicking a cell no longer moves the page.
- The sheet box is taller, 72vh.
- Copy link puts the whole setup in the URL, and the address bar follows the
  state. PDF opens the browser print dialog with a print stylesheet that hides
  the chrome and scales the score to the page.
- The score renders the whole play order, with connected bars, up to four per
  line as width allows, and playback highlights the current cell and note.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&m=1&mv=ride&r=snare&l=kick`.
A three-cell score: `&sel=singles%7C4,doubles%7C6,singles%7C8`.

Known prototype limits: tempo changes take effect on the next pass, a phone
drops to one bar per line at high rates, print has no page-size control beyond
the browser dialog, and the click sound is synthesized.

### What to react to

1. Are the hints in the right place, above the configs?
2. Is selecting the current cell only by clicking a cell or a row title enough,
   now that column titles only show and hide?
3. Does the sheet box height work at 72vh?
4. Does PDF produce something usable, and is Copy link doing what you expect?
5. Four bars per line when it fits, three or two for dense rates: still fine?
6. What is missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
