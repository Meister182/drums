---
id: "02"
title: Decide the exercise and sequence data model
labels: [wayfinder:grilling]
blocked_by: ["01"]
status: open
assignee:
---

## Question

Define the shape of what is authored, stored, shared, and exported.

- Combination fields: name, pulse value, check voice, subdivision, sticking,
  bar count, right-hand voice, left-hand voice, tempo, count-in.
- Which fields are optional and what the defaults are.
- Sequence shape: ordered combinations, per-step overrides, loop, intro count-in,
  title.
- Share link encoding: how a sequence becomes a URL without a backend, how long
  the link gets at a realistic size, and what happens when it is too long.
- Local storage layout and versioning, plus the JSON export/import schema.
- How a stored sequence migrates when the schema changes.

The resolution is a schema, not prose: field names, types, defaults, and one
example JSON document with an encoded link.
