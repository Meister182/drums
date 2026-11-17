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

Settle: the grid (pulse rows, subdivision columns, sticking selector) and what
a cell opens; the focused view for one combination with notation, playback,
tempo, and voices; the visual cue showing what is changing as the student moves
along a path; path mode (row, column, diagonal, saved sequence); student versus
authoring mode.

Raise the fidelity with a rough, clickable prototype the teacher can react to,
including one screen at phone width. The resolution names the chosen layout and
links the prototype.

## Prototype

Live at <https://meister182.github.io/drums-page/prototype/>, source in
`prototype/`. Throwaway code: no tests, no persistence, audio is synthesized
stand-ins, notation uses VexFlow 5 with a hand-drawn sticking row.

Three layout variants, switch with A / B / C:

- **A** grid and practice side by side, grid as an overview map.
- **B** practice first, grid and settings folded away.
- **C** one combination per step in a vertical list, current step expanded.

Shared in all three: clicks per bar, notes per click, sticking, bars with the
align helper, tempo in clicks per minute, check/right/left voices, play with
count-in and loop, row/column/diagonal paths with previous/next, a change line
naming what moved, and a student view toggle.

Reach the teacher's real exercise with
`?cpb=4&npc=3&sticking=singles&bars=2&check=ride&right=snare&left=kick`, then
walk sticking to doubles, triples, quadruples, paradiddles. Try
`?npc=4` for the same drill on sixteenths. Add `&variant=b` or `&variant=c`.

Known prototype limits: tempo changes take effect on the next loop pass,
sticking collisions at 5 and 6 notes per click at phone width are unresolved,
and the sheet is one staff per bar rather than wrapping systems.

### What to react to

1. Which variant, especially on a phone propped on a stand.
2. Does the grid read as a map of combinations, and is the leftover badge
   ("+4") understandable?
3. Does "Snap to N bars" match how you decide bar counts?
4. Is the change line ("Changed: notes per click 3 → 4") useful or noise?
5. Is the sheet readable at 3 and 4 notes per click, with sticking above and
   the check on its own voice?
6. Do check/right/left voices cover your exercises, including both hands on
   one drum?
7. In student view, should the grid disappear or stay?
8. What is missing before this is usable in a lesson?

The resolution is the teacher's verdict per question, then the layout choices
are folded into the build spec and the prototype comes off `main`.
