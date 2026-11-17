---
id: "01"
title: Settle the rhythm model and the align helper
labels: [wayfinder:grilling]
blocked_by: []
status: open
assignee:
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
