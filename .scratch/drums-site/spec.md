---
title: "Drums exercise site: notes-per-bar table, sheet, playback, hosting"
labels: [wayfinder:map]
feature: drums-site
---

## Destination

A build-ready spec for a free, static drums-exercise site: a table of notes per
bar by sticking, the sheet and playback for the selected combination or the
selected order, metronome and instrument assignment, and a published link the
teacher can share. Charting ends with the spec; building it is the second phase.

## Notes

Domain: a drums teacher picks a rate (notes per bar) and a sticking, assigns
instruments to the R and L strokes, sets the bar count, time signature and
tempo, and plays it. Students open a link and practise.

Settled as of 2026-11-19:

- Page order: the config bar, then the hints right above the grid, then the
  grid, then the score. Transport controls (Play, Share, PDF) sit in the score
  header.
- The config bar holds bars, time signature, a tempo text box, metronome, R and
  L strokes, loop and count-in. There are no per-cell configs; everything is
  shared.
- The grid always shows 1 to 16 notes per bar, all enabled by default. Clicking
  a column title shows or hides that count, and hiding it removes its cells from
  the play order. Hidden cells are greyed out and disabled.
- The current combination is chosen by clicking a cell, or a sticking row title.
- Rows are stickings: singles, doubles, triples, quadruples, single paradiddle,
  double paradiddle, paradiddle-diddle. Custom rows are not decided.
- Time signature is selectable: 2/4, 3/4, 4/4, 6/8, 12/8, default 4/4, and is
  printed at the start of each line. Tempo is BPM counting the metronome beat:
  the quarter in x/4, the dotted quarter in 6/8 and 12/8.
- Dotted note values carry their dot in the note value itself, so their duration
  and position are correct.
- Sheets lay out four bars per line on a wide screen, three when the rate is
  above twelve notes per bar, two at medium widths and one on a phone. The
  notation scales to fit; bars are connected. Tuplets that cannot be beamed get
  a bracket.
- The sheet renders the whole play order when cells are selected, and the
  current cell alone otherwise. It lives in its own scroll box, 85vh tall, so
  the table stays put. Clicking a cell does not move the page.
- Playing highlights the current cell in the table and the current stroke note
  in the sheet with a moving red bar, scrolling the sheet box to keep it
  visible. Metronome notes are not highlighted.
- Sticking tiles continuously across bars in both the sound and the sheet.
- The metronome is an independent layer with its own instrument, even when a
  stroke uses the same instrument. Its unit is selectable: the bar (one click),
  the beat (the signature's beat, the quarter in x/4 and the dotted quarter in
  6/8), or eighth notes. Default is the beat.
- R strokes and L strokes each get an instrument; feet are just instruments.
- Shift-click and shift-drag build a play order across cells, numbered in
  click order.
- Copy link puts the whole setup in the URL: signature, rate, sticking, bars,
  tempo, metronome, instruments, visible counts and the play order.
- PDF prints the score through the browser's print dialog: A4, the same bars per
  line as on screen, each system its own block so pages break cleanly, no
  page-sized blank at the start.
- Page scroll is preserved across config changes.
- No alignment helper, no leftover math.

Dropped in the pivot: the old clicks-per-bar and notes-per-click axes, student
mode, layout variants, and paths.

Skills: `grilling`, `domain-modeling`, `prototype`, `research`.

## Decisions so far

- [Research notation rendering and PDF export](issues/03-notation-research.md):
  VexFlow 5.2.0 SVG with a hand-drawn sticking row, PDF via `window.print()`;
  abcjs as fallback.
- [Research drum samples and licensing](issues/04-samples-research.md):
  MuldjordKit FreePats edition (CC BY 4.0, 2.5 MB shipped), synthesized click,
  lookahead scheduler; credit "Drum samples provided by DrumGizmo.org."
- [Stand up GitHub Pages hosting](issues/07-github-pages.md):
  live at <https://meister182.github.io/drums/> from `Meister182/drums`,
  legacy Pages on `main`, push to redeploy.
- [Settle the rhythm model](issues/01-settle-rhythm-model.md):
  notes per bar as the single axis, selectable time signature, configurable
  bars, BPM in beats, independent metronome, R and L stroke instruments.
- [Design the practice UI](issues/05-practice-ui.md):
  the accepted prototype is the UI reference: grid, score, config bar, Share
  links, print to PDF, no per-cell configs.
- [Decide the exercise data model](issues/02-data-model.md):
  one Setup object, saved in `localStorage` under `drums.setups.v1`, shared as
  URL parameters; custom stickings and file export out of v1.
- [Write the build spec](issues/08-build-spec.md):
  Vite, TypeScript, VexFlow 5, Web Audio with real MuldjordKit samples, a saved
  library and share links, deployed by Actions to Pages.

## Status

The map is charted. The build is phase two and proceeds from the build spec.

v1 built and deployed on 2026-11-19 at <https://meister182.github.io/drums/>, with
the accepted layout, real samples, the saved library, share links and PDF print.
Deploys run through GitHub Actions. The prototype stays at `/prototype/` for
reference.

## Not yet specified

- Custom stickings and how rows are added; hand-foot coordination was mentioned.
- Whether feet get their own layer or stay as instruments in the R/L list.
- Whether the metronome rate is configurable beyond the beat.
- Phone layout: two bars per line at narrow widths needs a smaller notation
  scale, so it currently drops to one.
- Whether a saved library or export file is needed beyond share links.
- Print layout details: page size, margins, how many bars fit on A4.

## Out of scope

- The align helper and leftover-cycle badges. Dropped from the model.
- Student mode, and layout variants B and C.
- Accounts, a teacher dashboard, native apps, backing tracks.
- The earlier auto-advance and path design from
  [Design sequence playback](issues/06-sequence-playback.md). Ordered play of
  selected cells replaces it and is being prototyped in ticket 05.
