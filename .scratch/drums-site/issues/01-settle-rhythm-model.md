---
id: "01"
title: Settle the rhythm model
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

This is a conversation, not a deliverable. The resolution records the rules as
plain statements plus one worked example.

## Resolution

Revised 2026-11-18 after the teacher pivoted. The earlier clicks-per-bar model
with a notes-per-click axis and an alignment helper is dropped.

- **Time signature**: 4/4 only. One bar is four quarter-note beats.
- **Rate**: notes per bar, every integer from 1 to 16. The column set is the
  single rate axis. Columns can be switched on and off so the table shows only
  what the exercise needs.
- **Notation**: standard counts use their note value (1 whole, 2 half, 4
  quarter, 8 eighth, 16 sixteenth). 3 and 6 and 12 are triplets in the usual
  groups of three. Every other count is one tuplet over the bar, written in the
  next lower power-of-two value (5:4, 7:4, 9:8 through 15:8).
- **Bars**: configurable, no helper, no leftover math. The sticking tiles from
  the first stroke through the last, even when the cycle ends mid-pattern.
- **Tempo**: BPM counting quarter notes.
- **Metronome**: an independent layer. When enabled it clicks the quarter notes
  for the whole exercise on its own instrument, even when a stroke plays the
  same instrument at the same instant.
- **Instruments**: the R strokes and the L strokes each get an instrument from
  click, snare, bass drum, ride, hi-hat, tom, or no sound. Feet are not special;
  a foot is just an instrument assigned to a side. Example: R on bass drum, L on
  snare, metronome on the ride, which gives a paradiddle split across snare and
  bass drum with the ride marking the quarters.
- **Stickings**: singles, doubles, single paradiddle, double paradiddle,
  paradiddle-diddle. Custom rows are undecided.

Worked example: 12 notes per bar on the 8th-triplet column, doubles on snare
over bass drum, two bars, 80 BPM, metronome on the ride. 24 strokes, sticking
tiled from the first stroke, ride clicking every quarter.
