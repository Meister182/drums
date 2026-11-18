---
id: "02"
title: Decide the exercise data model
labels: [wayfinder:grilling]
blocked_by: ["01"]
status: open
assignee:
---

## Question

Define the shape of what is authored, stored, and eventually shared, now that
the model is small.

- Combination fields: notes per bar, sticking, bars, BPM, metronome on and its
  instrument, R stroke instrument, L stroke instrument, and which columns are
  enabled.
- Which fields are optional and what the defaults are.
- Whether the enabled column set belongs to the exercise or to the app.
- How a custom sticking is stored once that is decided (letters, name).
- Where state lives: browser storage only, or an exportable file, or a share
  link that carries the combination.
- Versioning and migration for the stored shape.

The resolution is a schema, not prose: field names, types, defaults, and one
example JSON document. Sequence playback is out of scope, so no sequence shape.
