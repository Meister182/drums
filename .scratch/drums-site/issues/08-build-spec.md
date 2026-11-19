---
id: "08"
title: Write the build spec
labels: [wayfinder:grilling]
blocked_by: ["01", "02", "03", "04", "05", "07"]
status: closed
assignee:
---

## Question

Turn the resolved decisions into the destination artifact: a spec a build effort
can execute without deciding anything new.

Contents: the tech stack and why, the table screen, the rhythm engine, the
notation and audio pipelines, the data model, the hosting and deploy story, and a
v1 cut line that names what is deliberately not built. No sequences, no paths,
no alignment helper.

Include acceptance criteria a non-author can check, written so the teacher can
confirm the site does what it promised. Anything that would need a new decision
gets its own ticket rather than a paragraph in the spec.

## Resolution

### Stack

- Vite with TypeScript, no UI framework, one page.
- VexFlow 5 from npm for notation, SVG backend, hand-drawn sticking row.
- Web Audio API with a lookahead scheduler and decoded one-shot samples.
- Vitest for model and share-link tests.
- GitHub Actions builds and publishes to GitHub Pages at
  `https://meister182.github.io/drums/`.

### Page

One page, top to bottom: config bar, hints, grid, score header (Play, Save,
Share, PDF), score, library row. The prototype at `/prototype/` stays for
reference. Mobile stacks the same content; the score drops to two or one bar per
line and the grid scrolls sideways.

### Rhythm engine

- 4/4 default; signatures 2/4, 3/4, 4/4, 6/8, 12/8.
- Notes per bar 1 to 16, evenly spaced. Standard counts use note values and
  dotted values where they land; other counts use one tuplet over the bar. In
  4/4 the counts 3, 6, 12 stay grouped as triplets.
- Dotted values carry `dots` in the VexFlow note struct.
- Sticking tiles across the whole cell; bars are configurable 1 to 16.
- Metronome: independent, units Bar, Beat, Eighths, default Beat, own voice
  (click by default).
- R and L strokes each get an instrument; feet are just instruments.

### Score

- The whole play order, or the current cell when nothing is selected.
- Connected bars, one clef and time signature per line, up to four bars per
  line, three above twelve notes per bar, two at medium width, one on phones.
- Sticking above, tuplets below with a bracket when they cannot be beamed.
- Playback moves a red bar over the current stroke note and highlights the
  current cell in the grid.
- Print: A4, same bars per line as the screen, no blank first page. PDF is the
  browser print dialog.

### Audio

- MuldjordKit FreePats one-shots, CC BY 4.0, trimmed to 16-bit mono 44.1 kHz
  WAV, about 2.5 MB: kick, snare, closed hi-hat, ride, three toms, two round
  robins for the repeated voices.
- Metronome click synthesized.
- Sample loading shows a small loading state; Play waits for decode.
- Shipping credit in the footer and `public/audio/CREDITS.txt`, with
  "Drum samples provided by DrumGizmo.org."

### Data and sharing

- The Setup object from the data-model ticket.
- Named setups in `localStorage` under `drums.setups.v1`, with load and delete.
- Share links carry the setup fields; opening one loads without saving.
- No presets in v1.

### v1 cut line

In: the accepted prototype behaviour, saved library, share links, print to PDF,
real samples, mobile layout, deploy.

Out: custom stickings, per-cell configs, accounts, progress tracking, a PDF
library or direct PDF download, presets, file import/export, MIDI, offline mode,
wake lock, non-4/4-family signatures, sequences beyond the play order.

### Acceptance criteria

1. Opening the site shows the accepted layout with all counts enabled and 12
   notes per bar, singles, two bars, 4/4, 80 BPM.
2. Clicking a cell, a row title, or a column title does what the prototype does,
   including greying hidden counts and removing their cells from the order.
3. Playback sounds the strokes and the metronome in time, follows the play order,
   loops when asked, and highlights the current cell and stroke note.
4. A 6/8 exercise with quarter-note strokes and the metronome on Bar clicks once
   per bar; on Beat it clicks on the dotted-quarter beats, not on the second
   stroke.
5. Signing up nothing: no account is needed, and the site works on a phone.
6. Save gives a named entry that survives reload; Load restores every field;
   Delete removes it.
7. Share copies a link that reproduces the setup in another browser, including
   the play order.
8. PDF prints the score on A4 with the same bars per line and no blank page.
9. `npm run build` succeeds and the Pages workflow publishes the site.
