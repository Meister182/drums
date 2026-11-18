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

Second revision after the 2026-11-18 feedback:

- Page order: table, then settings, then sheet. The sheet header holds Bars, Sig,
  Tempo and Play.
- Rates: every integer from 1 to 16, switchable on and off, default 1, 2, 3, 4,
  6, 8, 12, 16.
- Time signature: 2/4, 3/4, 4/4, 6/8, 12/8. Rate names and notation follow it.
- Sheet: up to four bars per line, fewer when the rate needs the room, one clef
  per line, sticking above, tuplets below, the metronome as its own stem-up
  voice.
- Ordered play: shift-click or shift-drag cells to build an order, numbers show
  the position, removing a cell renumbers the rest, and Play runs the order with
  a per-step status and the playing cell highlighted.
- Per-cell overrides: right-click a cell for its own bars, R instrument and L
  instrument. Overridden cells show a dot. Overrides apply when the cell plays.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&m=1&mv=ride&r=snare&l=kick&rates=1,2,3,4,6,8,12,16`,
then walk sticking from singles to doubles and the paradiddles, then change `n`
to 16. A voicing example: `&r=kick&l=snare&mv=ride`. A selection example:
`&sel=singles%7C4,doubles%7C6,singles%7C8,doubles%7C12`.

Known prototype limits: tempo changes take effect on the next pass, the sheet
stays on the focused cell while an order plays (only the status and the
highlight move), per-cell overrides do not change the sheet, right-click has no
touch equivalent, and a phone drops to one bar per line at high rates.

### What to react to

1. Is the page order and the split of controls right: table, settings, then the
   sheet header holding bars, sig, tempo and Play?
2. Are the column chips the right control, and is "Rates" the right name?
3. Does the sheet read well at four bars per line, and is dropping to three or
   two for dense rates acceptable?
4. Is the time signature behaviour right, including BPM counting the beat and
   dotted-quarter beats in 6/8?
5. Is shift-click and shift-drag the right gesture for the play order, and do
   the numbers make the order clear?
6. Is the per-cell override idea worth keeping, and should it cover rates and
   stickings too, not just bars and instruments?
7. What is missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
