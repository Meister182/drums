---
id: "01"
title: Settle the rhythm model and the align helper
labels: [wayfinder:grilling]
blocked_by: []
status: closed
assignee: Alexandre Marques
---

## Question

Pin the exact timing rules, with the teacher in the room.

- Map each pulse value to pulses per 4/4 bar (whole, half, quarter), and to how
  long one subdivision stroke lasts.
- Fix how subdivision 5 and 6 are notated (quintuplet, sextuplet) and what
  happens when the subdivision does not divide the pulse cleanly.
- Confirm the check voice sounds on the pulse while the subdivision strokes
  play, and how it is displayed.
- Define what the align helper computes: given pulse, subdivision, sticking, and
  bar count, does the sticking end exactly on the last stroke? What does it
  suggest when the current count does not land, and how is a deliberately
  non-landing count kept?
- Decide whether the helper also works across a whole sequence, not just a
  single combination.

Worked example to keep the discussion concrete: quarter pulse on the ride,
subdivision 3, two bars, singles then doubles then triples then quadruples then
paradiddles, all on snare and bass drum, then the same at subdivision 4.

This is a conversation, not a deliverable. The resolution records the rules as
plain statements plus one worked example.

## Resolution

The model has three numbers, plus the sticking and the voices.

- **Clicks per bar**: 1, 2, or 4 in a 4/4 bar, which is the whole, half, or
  quarter pulse. UI wording is left to the practice UI prototype.
- **Tempo**: clicks per minute, the rate of the check voice. No quarter-note BPM
  abstraction; the click is what the student follows.
- **Notes per click**: 1 to 6. Each click is divided into that many equal
  strokes, so 1 lands on the click, 3 is triplets, 4 is sixteenths, 5 and 6 are
  quintuplets and sextuplets.

Rules:

- The check sounds on every click, for the whole exercise, on any chosen voice
  or muted. The first stroke of each click lands with it, so they overlap.
- Sticking tiles continuously from the first stroke and never restarts at a bar
  line.
- Bar count is authored freely. The exercise is exactly
  `bars x clicksPerBar x notesPerClick` strokes and stops on the last stroke,
  even mid-cycle. No padding.
- Align helper: with S strokes and a sticking cycle of C, it lands when
  `S mod C = 0`. Cycles: singles 1, doubles 2, triples 3, quadruples 4, single
  paradiddle 8, double paradiddle 12, triple paradiddle 16. It suggests the
  smallest bar count at or above the current one that lands, and shows the
  stroke count and the leftover. Advisory only.
- The helper stays per combination. In a sequence it flags the steps that do
  not land; nothing is auto-fixed.

Worked example: 4 clicks per bar, 3 notes per click, 1 bar is 12 strokes, so
doubles, triples and quadruples land and paradiddles need 2 bars. At 4 notes per
click, 1 bar is 16 strokes, so triples need 3 bars.

Notation: the stroke value and tuplet ratio per notes-per-click setting are in
[research/notation.md](../research/notation.md).
