---
title: "Drums exercise site: grid, practice view, sequences, sheets, hosting"
labels: [wayfinder:map]
feature: drums-site
---

## Destination

A build-ready spec for a free, static drums-exercise site: exercise grid,
focused practice view, sequences, notation with PDF export, audio playback, and
shareable links, deployed on GitHub Pages. Charting ends with the spec; building
it is the second phase of this map.

## Notes

Domain: a drums teacher authors combinations of pulse, subdivision, sticking,
bar count, and voices, and students practise them alone or as a sequence.

Settled before charting:

- Fixed 4/4 in v1.
- Pulse note values: whole, half, quarter.
- Subdivision: 1 to 6.
- Sticking: singles, doubles, triples, quadruples, single paradiddle, double
  paradiddle, triple paradiddle. Flams, drags, and rolls come later.
- Sticking tiles continuously across the exercise; it does not restart at each
  bar. A bar count that does not land neatly is allowed on purpose.
- Voices are assignable, including per hand (right snare, left bass drum).
- Content lives in browser local storage, with JSON export/import and share
  links that carry a sequence. No accounts, no backend.
- Student mode is the default for shared links; authoring is behind a toggle.
- Hosting: GitHub Pages project site at `https://<user>.github.io/drums-page/`,
  public repo.

Skills: `grilling`, `domain-modeling`, `prototype`, `research`.

Order: prototype the practice UI before locking the schema, so the teacher
reacts to something concrete instead of a field list.

## Decisions so far

- [Research notation rendering and PDF export](issues/03-notation-research.md):
  VexFlow 5.2.0 SVG with a hand-drawn sticking row, PDF via `window.print()`;
  abcjs as fallback.
- [Research drum samples and licensing](issues/04-samples-research.md):
  MuldjordKit FreePats edition (CC BY 4.0, 2.5 MB shipped), synthesized click,
  lookahead scheduler; credit "Drum samples provided by DrumGizmo.org."
- [Stand up GitHub Pages hosting](issues/07-github-pages.md):
  live at <https://meister182.github.io/drums-page/> from `Meister182/drums-page`,
  legacy Pages on `main`, push to redeploy.
- [Settle the rhythm model and the align helper](issues/01-settle-rhythm-model.md):
  clicks per bar (1, 2, 4), tempo in clicks per minute, notes per click (1 to 6),
  continuous tiling, align helper on `S mod C = 0`, advisory and per combination.

## Not yet specified

- Phone and tablet layout, and keeping the screen awake while practising.
- Print layout details beyond PDF export.
- Rudiments beyond v1: flams, drags, rolls.
- Tempo ramp, per-bar practice loops, and counted repeats.
- Organising the exercise library once it grows past a handful of items.
- Whether students need to save progress or favourite sequences.

## Out of scope

- Accounts, login, and a teacher dashboard with student progress.
- Native apps.
- Backing tracks and recorded accompaniment.
- Multiple teachers or per-student permissions.
