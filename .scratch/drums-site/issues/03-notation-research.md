---
id: "03"
title: Research notation rendering and PDF export
labels: [wayfinder:research]
blocked_by: []
status: closed
assignee: Alexandre Marques
---

## Question

Which client-side approach renders the sheet the teacher wants, on a static site?

Requirements: one staff per combination, sticking letters above the strokes, the
check voice on its own line in the right cymbal position, subdivisions 1 to 6
including tuplets, and a downloadable PDF.

Compare at least: VexFlow, abcjs, OpenSheetMusicDisplay, hand-rolled SVG, and
browser print to PDF. Report bundle size, tuplet and sticking support, PDF
fidelity, licensing, and the amount of custom work each needs.

Deliverable: a recommendation with a fallback, and a link to any working example.

## Assets

- [research/notation.md](../research/notation.md)

## Resolution

VexFlow 5.2.0 with the SVG backend, one SVG per combination, PDF through
`window.print()`. Percussion clef, cross noteheads, arbitrary tuplet ratios
(`5:4`, `6:4`), and two joined voices on one staff all work. Sticking is drawn
as a fixed-baseline text row after formatting rather than as VexFlow
annotations, because annotations chase stem ends and collide with tuplet
numbers. Use the `vexflow/bravura` entry at 408 KB gzip, MIT.

Fallback is abcjs 6.7.2 (148 KB gzip, MIT); control over spacing and vertical
stacking is the reason it is second. Hand-rolled SVG is the escape hatch, not a
third library.

Biggest risk: vertical stacking above the staff where sticking, tuplet numbers,
and up-stemmed cymbal notes compete. Test subdivision 5 and 6 at A4 width first.

## Note for the build

VexFlow 5 dotted notes: put `dots: 1` in the NoteStruct. Attaching only a Dot
modifier draws the dot but leaves the tick duration undotted, which misplaces
the note and underfills the voice.
