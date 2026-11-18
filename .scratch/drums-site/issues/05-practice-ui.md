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

With the model settled, this is now narrow: the table (columns are notes per
bar, rows are sticking), the focused view for the selected combination with
sheet and playback, the metronome, and the R and L instrument assignment. It
also covers which columns are on the table.

Raise the fidelity with a rough, clickable prototype the teacher can react to,
including one screen at phone width. The resolution names the chosen layout and
links the prototype.

## Prototype

Live at <https://meister182.github.io/drums-page/prototype/>, source in
`prototype/`. Throwaway code: no tests, no persistence, audio is synthesized
stand-ins, notation uses VexFlow 5 with a hand-drawn sticking row.

Rebuilt after the pivot:

- Table: columns are notes per bar (1 to 16), rows are the five stickings.
  Column chips switch columns on and off; the default set is 1, 2, 3, 4, 6, 8,
  12, 16, with Common only and All buttons.
- Settings: bars, BPM, metronome on/off and its instrument, R stroke instrument,
  L stroke instrument, loop, count-in.
- Sheet: one staff per bar, sticking letters above, R strokes stem down, the
  metronome as an independent stem-up voice when it is a drum, tuplets numbered
  below the staff.
- Playback: plays the bars, the metronome clicks the quarters independently,
  loop and count-in available.

Reach the teacher's drill with
`?n=12&s=singles&bars=2&bpm=80&m=1&mv=ride&r=snare&l=kick&cols=1,2,3,4,6,8,12,16`,
then walk sticking from singles to doubles and the paradiddles, then change `n`
to 16. A voicing example: `&r=kick&l=snare&mv=ride`, the paradiddle split
between bass drum and snare with the ride on the quarters.

Known prototype limits: tempo changes take effect on the next pass, five and six
note columns at phone width are crowded, and the sheet is one staff per bar
rather than wrapping systems.

### What to react to

1. Is the table the right shape, and is an empty cell the right affordance?
2. Are the column chips the right way to enable only the relevant rates, and
   should the enabled set be remembered per exercise?
3. Is the sheet readable at 12 and 16 notes per bar, with sticking above and
   tuplets below?
4. Is the metronome right: quarters only, own instrument, independent of the
   strokes?
5. Do "R strokes" and "L strokes" cover your voicing examples, including feet?
6. Rows are only the five you named. Should triples and quadruples come back?
7. Keep loop and count-in, and are 2 bars and 80 BPM the right defaults?
8. What is missing before you would use this in a lesson?

The resolution is the teacher's verdict per question, then the choices are
folded into the build spec and the prototype comes off `main`.
