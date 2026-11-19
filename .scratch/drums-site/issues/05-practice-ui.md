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

Ninth revision after the 2026-11-19 feedback:

- Fixed dotted notes being placed a beat early. VexFlow needs the dot count on
  the note value itself, not only a Dot modifier, or the tick duration stays
  undotted. The dotted metronome click now sits at the true middle of a 6/8 bar,
  between the strokes, instead of on the second stroke.
- Added a metronome unit control: Bar, Beat, Eighths, with a visible label.

Eighth revision:

- The metronome unit is selectable: Bar (one click), Beat (the signature's beat,
  two dotted quarters in 6/8) and Eighths. Default is Beat. This explains the
  apparent polyrhythm: quarter-note strokes against a dotted-quarter beat are a
  3:2 relationship, which is correct, not a bug. Choosing Bar clicks once per
  bar; choosing Eighths clicks every eighth.

Seventh revision (same day):

- All 16 notes-per-bar columns are enabled by default.
- Fixed a sheet bug where the sticking restarted at each barline while the sound
  tiled it. The sheet now tiles across the whole cell, so 6/8 with doubles and
  quarter notes reads RR L | L RR.
- Added Triples (RRR LLL) and Quadruples (RRRR LLLL) rows.

Sixth revision:

- Playback now highlights the metronome notes too, as a circle around the note
  head on each beat, alongside the vertical stroke cursor.
- Dense rates cap at three bars per line; twelve notes per bar and below use
  four, medium widths two, phones one.
- Systems are 210 units tall so tuplets below the staff never clip, and the
  sheet box is 85vh.
- Print keeps the same bars per line as the screen, at A4, with each system as
  its own block.

Earlier in the same revision: column titles toggle counts, no per-cell configs,
hints then configs then grid then score, time signature at the start of each
line, triplet brackets, sticking letters clear of barlines, Copy link, PDF via
the print dialog.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&m=1&mv=ride&r=snare&l=kick`.
A dense case: `?n=16&s=singles&bars=12&m=1&mv=ride`.

Known prototype limits: tempo changes take effect on the next pass, the print
dialog has no page-size choice beyond A4, the click is synthesized, and a real
one-click PDF download is a separate decision.

### What to react to

1. Does the metronome highlight land on the ride notes as they sound?
2. Is three bars per line at dense rates the right cap, and is the sheet box
   tall enough now?
3. Is the PDF now the same layout as the screen, with no clipped lines?
4. Anything missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
