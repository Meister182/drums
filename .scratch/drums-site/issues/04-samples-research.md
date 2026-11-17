---
id: "04"
title: Research drum samples and licensing
labels: [wayfinder:research]
blocked_by: []
status: closed
assignee: Alexandre Marques
---

## Question

Which freely usable drum sounds cover this site without a licensing headache?

Needed voices: snare, bass drum, ride, hi-hat, toms, and a metronome click, all
loaded client-side. Report sample sources with licenses that permit free public
hosting (CC0, CC-BY, or similar), file formats and total size, velocity layers,
whether the set is consistent enough to sound like one kit, and what attribution
is required.

Also cover whether the metronome click should be synthesized rather than sampled,
and how to schedule hits with Web Audio so playback stays tight at slow and fast
tempos.

Deliverable: one recommended sample set with a link and its license text, plus a
fallback.

## Assets

- [research/samples.md](../research/samples.md)

## Resolution

MuldjordKit, FreePats edition (CC BY 4.0), trimmed to about 2.5 MB of 16-bit mono
WAV one-shots from a 160 MB source library. One recorded kit, 8 to 14 velocity
groups, round robins, all needed voices. Required credit: "Drum samples provided
by DrumGizmo.org." on a credits page or footer.

Fallback is Virtuosity Drums (CC0, 1.1 GB source). The click is synthesized with
Web Audio, not sampled, and hits are scheduled with a lookahead scheduler rather
than `setTimeout` per hit.

Biggest risk: mobile output, where iOS Silent Mode mutes Web Audio and Bluetooth
latency is not reliably reported by `outputLatency`.
