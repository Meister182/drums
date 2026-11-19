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

Fifth revision after the 2026-11-19 feedback:

- Column titles toggle their notes-per-bar count; hidden counts are greyed and
  their cells disabled. Hiding a count removes its cells from the play order.
- No per-cell configs. Hints, then the config bar, then the grid, then the score.
- Four bars per line on a wide screen, two at medium widths, one on a phone.
  Dense rates scale the notation down instead of dropping to two bars per line.
- Triplets that cannot be beamed, such as half and quarter triplets, now get a
  bracket, so the group reads as connected.
- Sticking letters are kept clear of the barlines even at 16 notes per bar.
- The time signature prints at the start of each line.
- Sheet box is taller, 72vh.
- Each system is its own SVG block, which fixes the mostly blank first PDF page
  and lets systems break across pages. Print is A4, at 186mm wide.
- PDF still uses the browser print dialog, so saving is the dialog's Save as
  PDF. A one-click download would need a PDF library and is a separate decision.
- Copy link puts the whole setup in the URL and the address bar follows it.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&m=1&mv=ride&r=snare&l=kick`.
A three-cell score: `&sel=singles%7C4,doubles%7C6,singles%7C8`.

Known prototype limits: tempo changes take effect on the next pass, print has no
page-size choice beyond A4, the click sound is synthesized, and the score stays
on screen while an order plays.

### What to react to

1. Is four bars per line at 16 notes per bar readable enough on your screen, or
   did the scaling go too far?
2. Do the triplet brackets read right now?
3. Is the PDF usable, and is the print dialog acceptable or do you want a real
   one-click download?
4. Is the copy link doing what you expect?
5. What is missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
