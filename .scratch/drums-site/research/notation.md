# Notation rendering and PDF export

Research for ticket [03](../issues/03-notation-research.md).

Versions checked against the npm registry and GitHub releases on 2026-11-17.
Bundle sizes are measured, not quoted: I took each package's published browser
bundle, ran it through `terser --compress --mangle`, then `gzip -9`. The VexFlow
and OSMD bundles are already minified, so re-minifying changes them by under 1%;
these are production numbers.

## Recommendation

**VexFlow 5.2.0, SVG backend, one SVG per combination, print-to-PDF through
`window.print()`.**

It covers all four hard requirements in one library, with the most control over
the result: a real percussion staff with cross noteheads, arbitrary tuplet
ratios on beamed groups, two independently stemmed voices on one staff, and SVG
output that the app owns and can lay out freely.

Concretely:

- **Staff.** `new Stave(x, y, w).addClef('percussion')`. A five-line percussion
  staff is a first-class clef in VexFlow
  ([`src/clef.ts`](https://github.com/vexflow/vexflow/blob/main/src/clef.ts),
  `clef: { code: unpitchedPercussionClef1 }`), exercised in
  [`tests/percussion_tests.ts`](https://github.com/vexflow/vexflow/blob/main/tests/percussion_tests.ts).
- **Voices.** "On its own line" is read here as its own voice and stem line on the
  single staff, not a second staff (a second staff is drawable but contradicts
  one staff per combination). The check voice sits on the cymbal line: ride =
  F5, the top line, cross notehead `f/5/x2`, stems up
  ([Weinberg-style drum key](https://web.mit.edu/merolish/Public/drums.pdf),
  p. 3: "the standard position for a ride cymbal is on the top line").
  Subdivision strokes go on `c/5` (snare), `f/4` (bass), or whatever voice map
  the teacher settles in the GLOSSARY, stems down. Format with
  `Formatter.joinVoices([check, subs])` before `formatToStave`, which is
  VexFlow's documented way to handle two voices sharing a stave
  ([`docs/score-layout.md`](https://github.com/vexflow/vexflow/blob/main/docs/score-layout.md)).
- **Tuplets.** `new Tuplet(group, { numNotes: 5, notesOccupied: 4 })`. Ratios are
  arbitrary, not limited to 2 and 3, and beamed groups default to a bare number
  instead of a bracket ([`src/tuplet.ts`](https://github.com/vexflow/vexflow/blob/main/src/tuplet.ts)).
  VexFlow's own tests use 5 and 7
  ([`tests/tuplet_tests.ts`](https://github.com/vexflow/vexflow/blob/main/tests/tuplet_tests.ts)).
- **Sticking.** Do **not** use `Annotation` for this. VexFlow places a top
  annotation above the note's stem end, so an up-stemmed check note on the
  cymbal line pushes the letter much higher than the letter over a down-stemmed
  snare stroke, and tuplet numbers compete for the same space
  ([`src/annotation.ts`](https://github.com/vexflow/vexflow/blob/main/src/annotation.ts),
  `computeY()`). Draw one fixed-baseline text row yourself, after formatting,
  using `note.getAbsoluteX()` for x and a baseline computed from the stave top
  plus a reserved tuplet band. About 40 lines, full control, and it matches how
  sticking is printed in real drum charts.
- **Layout.** One `Renderer` per exercise in SVG mode, sized to content, stacked
  in HTML with the combination name above each staff. That gives "one staff per
  exercise" for free and makes the print stylesheet trivial. `Sheet`/`System`
  ([`docs/sheets-and-themes.md`](https://github.com/vexflow/vexflow/blob/main/docs/sheets-and-themes.md))
  exist if multi-system wrapping is ever needed, but they are newer API and do
  not paginate, so do not build the first version on them.
- **Bundle.** Use the `vexflow/bravura` entry (core plus the Bravura and
  Academico faces): 801 KB minified, 408 KB gzip. The default entry also inlines
  Petaluma, Petaluma Script and Gonville and is 1.20 MB / 710 KB gzip.
  `vexflow/core` is 404 KB / 113 KB gzip, but it carries no music font, and the
  Bravura font module alone is 330 KB / 248 KB gzip, so there is no materially
  smaller usable combination
  ([package.json exports](https://unpkg.com/vexflow@5.2.0/package.json)).

Duration mapping, so the note builder stays small:

| Subdivision | Written stroke value | Tuplet |
| --- | --- | --- |
| 1 | the pulse value | none |
| 2 | pulse / 2 | none |
| 3 | pulse / 2 | `3:2` |
| 4 | pulse / 4 | none |
| 5 | pulse / 4 | `5:4` |
| 6 | pulse / 4 | `6:4` |

The ratio is always "s in the time of 4 (or 2)" of the written value, so the
builder emits one `(duration, tuplet ratio)` pair per bar and VexFlow does the
rest. Bar counts that do not land neatly cost nothing here: bars are fixed
length, only the sticking run stops mid-pattern, which is model state, not
notation.

Working example: the interactive playground at
<https://vexflow.com/guide/> (playground stage, same library).

## Fallback

**abcjs 6.7.2, generating an ABC string per exercise.**

Everything the content needs is expressible in ABC and implemented in abcjs:

- percussion clef (`V:1 clef=perc`, glyph in
  [`src/write/creation/create-clef.js`](https://github.com/paulrosen/abcjs/blob/main/src/write/creation/create-clef.js));
- per-note cross noteheads (`!style=x!` or `K:... style=x`, documented under
  "Additions to the standard" on
  [docs.abcjs.net](https://docs.abcjs.net/overview/abc-notation.html));
- quintuplets and sextuplets, including explicit ratios
  (`(5:4:5`, parsed in
  [`src/parse/abc_parse_music.js`](https://github.com/paulrosen/abcjs/blob/main/src/parse/abc_parse_music.js));
- two voices on one staff (`%%score (1 2)`, handled in
  [`src/parse/abc_parse_directive.js`](https://github.com/paulrosen/abcjs/blob/main/src/parse/abc_parse_directive.js))
  with forced stem directions (`V:2 stem=down`, in
  [`src/parse/abc_parse_key_voice.js`](https://github.com/paulrosen/abcjs/blob/main/src/parse/abc_parse_key_voice.js));
- sticking through absolutely positioned annotations (`"@0,6 R"`), which the
  parser converts to an x/y offset in staff steps
  ([parser, `letter_to_chord`](https://github.com/paulrosen/abcjs/blob/main/src/parse/abc_parse_music.js)).

It is 512 KB minified / 148 KB gzip, a third of VexFlow, and the whole input is
text you can snapshot in tests. The cost is control: abcjs owns spacing,
beaming and vertical stacking, and the absolutely positioned sticking letters do
not reflow when the staff width changes. Expect to fight overlaps between
sticking, tuplet numbers and beams.

Working example: <https://editor.drawthedots.com/> and the library's own samples
at <https://examples.abcjs.net/>.

If the blocker turns out to be "no library will place this text where I want",
the escape hatch is the hand-rolled SVG below, not a third library.

## Comparison

| | Notation and tuplets | Sticking + separate pulse voice | PDF path | Bundle (min / gzip) | License | Custom work | Status in 2026 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **VexFlow 5.2.0** | Full engraver. Percussion clef, SMuFL noteheads (`x2` cross), arbitrary tuplet ratios, beam generation. | Yes: two `Voice`s joined on one stave; sticking as a hand-placed text row (do not rely on `Annotation`). | Print-to-PDF; optional vector PDF via `toSVG()` + svg2pdf. | 801 KB / 408 KB (`vexflow/bravura`); 1.20 MB / 710 KB default entry. | MIT | Medium: data→notes mapper, vertical metrics, ~40-line sticking row, print CSS. ~400-600 LOC. | Very active. 5.2.0 on 2026-11-17; 5.1.x the day before; 5.0.0 was 2025-03. Small core team. |
| **abcjs 6.7.2** | ABC notation. Percussion clef, per-note notehead styles, tuplets 2-9 and `p:q:r` ratios. Layout and beaming are automatic. | Yes: `%%score (1 2)` plus per-voice `stem=`; sticking via `"@x,y R"`. No collision handling for annotations. | Print-to-PDF from the generated SVG (vector, selectable text). | 512 KB / 148 KB | MIT | Low to medium: ABC string builder plus positioning and spacing tuning. ~250-350 LOC. | Active. 6.7.2 on 2026-10-16, commits through 2026-11-16. One dominant maintainer (2291 of ~2600 commits) and a large issue backlog. |
| **OpenSheetMusicDisplay 2.3.1** | Full MusicXML renderer. Tuplets, percussion clef, `<notehead>`, multiple voices per staff. | Pulse voice yes (`<backup>` + voices). Sticking only as `<direction><words default-y>`, because MusicXML has no sticking element. | Its own demo exports PDF with jsPDF: raster JPEG by default, svg2pdf when asked. | 1.48 MB / 379 KB (bundles VexFlow 1.2.93) | BSD-3-Clause | High: MusicXML generator, a document per exercise, plus text directions for every sticking letter. ~400-500 LOC and least control over the exercise grid. | Very active (commits daily, 2.3.1 on 2026-11-12) but pinned to a VexFlow published 2020-04-03. |
| **Hand-rolled SVG** | Whatever you build. All six subdivisions, tuplets, beams and the one staff shape are a small closed set. | Yes, by construction, and it is the only option with exact control of the sticking row and pulse line. | Print-to-PDF, or svg2pdf, from your own SVG. | ~0 library KB; a Bravura subset of the ~15 glyphs used is a few KB of path data. | Yours; Bravura is OFL 1.1. | Highest: spacing, beams, tuplet brackets, glyph outlines, visual QA. ~600-1000 LOC plus test sheets. | N/A. No upstream, no version churn, no bug fixes from anyone else. |
| **Browser print-to-PDF** | Not a renderer. Composes with every row above. | N/A | `window.print()` + `@page` + `break-inside: avoid`. Vector, real text, selectable. | 0 KB | N/A | Low: a print stylesheet and a button. ~60 LOC. | Platform: Chromium, Firefox and Safari print SVG line art as vector by default. |

### Notes per option

**VexFlow.** Strongest fit, and it documents a score-to-path-only-SVG export:
`SVGContext.toSVG(fonts)` turns every text element into paths
using opentype.js, so the exported file needs no fonts, CSS or scripts
([`docs/portable-svg.md`](https://github.com/vexflow/vexflow/blob/main/docs/portable-svg.md)).
Two caveats. The library gives you no drum-kit layout: the voice→(line,
notehead) map is yours, which is good here because the teacher owns it. And
VexFlow 5.x is moving fast: 5.1.0, 5.1.1, 5.1.2 and 5.2.0 all landed on
2026-11-16/17, so pin an exact version and read release notes before bumping.

**abcjs.** Cheapest route to a correct-looking prototype, and its feature set is
genuinely complete for this content. The weakness is that it is a tune
renderer: abcjs decides where lines break, how beams group, and which vertical
lane each annotation occupies. Sticking has to be pinned with absolute `@x,y`
offsets that do not survive a width change. That is a smaller problem than it
sounds because a sheet is printed at a fixed width, but it means the screen and
the print sheet need separate tuning.

**OpenSheetMusicDisplay.** The mismatch is architectural, not technical. OSMD
renders a MusicXML *document*: title, parts, systems, page layout. "One staff
per combination, stacked in a grid" means one OSMD instance per combination, or
one document with N parts and then fighting part labels, brackets and system
spacing. And sticking has no MusicXML representation at all: the 4.0 reference
for `<technical>` lists no sticking child
([W3C](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/)),
the 4.0 XSD contains no `sticking` element, and a vendor that implemented it
confirms the format lacks it and tools use lyrics or plain text instead
([Soundslice](https://www.soundslice.com/blog/212/native-support-for-drum-sticking)).
OSMD can still draw the letters as `<words default-y>` directions (it reads
`words` with `default-y` in
[`ExpressionReader.ts`](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/src/MusicalScore/ScoreIO/MusicSymbolModules/ExpressionReader.ts)),
but that is one absolute-positioned direction per letter, with x/y computed by
you. Working example, including its PDF button:
<https://opensheetmusicdisplay.github.io/demo/>. Its own PDF export is
informative: raster JPEG by default, vector only via svg2pdf, with the source
comment warning that svg2pdf "may not correctly handle unicode or 8-digit hex
colors" ([`demo/index.js`](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/demo/index.js)).

**Hand-rolled SVG.** Tempting because the notation is so narrow: one clef, no
key signature, no accidentals, no pitch, six subdivisions, one text row. The
work is not the shapes, it is proportional spacing, beam angles and tuplet
bracket clearing. Recommend it only if a library's layout proves unworkable,
and then extract glyph paths from Bravura (OFL 1.1,
[license](https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt))
rather than drawing noteheads by eye.

**Browser print-to-PDF.** Evaluated in the next section; it is a delivery
mechanism, not a competitor.

## PDF path

**Primary: print to PDF.** Render each exercise as inline SVG, add a print
stylesheet, call `window.print()`
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/print)):

```css
@media print {
  @page { size: A4 portrait; margin: 14mm 12mm; }
  .exercise { break-inside: avoid; }
  .exercise svg { width: 100%; height: auto; }
  .no-print { display: none; }
}
```

Why this is the right default:

- VexFlow's SVG emits glyphs as `<text>` and shapes as `<path>`
  ([`src/svgcontext.ts`](https://github.com/vexflow/vexflow/blob/main/src/svgcontext.ts)),
  so the browser's PDF has vector glyphs, embedded subset fonts and selectable
  text. Nothing is rasterized.
- Zero dependencies, zero extra bytes, and `@page` gives real A4 geometry
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)); per-exercise
  blocks never split across pages with `break-inside: avoid`
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside)).
- A whole sheet, not one exercise, is one print job, which is what a teacher
  wants to hand out.

One gotcha: VexFlow sizes the SVG with width/height attributes, so the print
stylesheet only scales it if the element also has a `viewBox`. Call
`context.setViewBox(0, 0, width, height)`
([`src/svgcontext.ts`](https://github.com/vexflow/vexflow/blob/main/src/svgcontext.ts))
when you draw, otherwise set one on the element before printing.

Known limits: the print dialog's header/footer (URL, date, page number) is the
browser's setting, not the page's; the file is produced by the user choosing
"Save as PDF"; and on iOS the flow is Print → share → Save to Files, which is
clunky for students. Do not claim "one-click download" for this path.

**Secondary, only if a real one-click download is required:** render the sheet
to path-only SVG with `SVGContext.toSVG(fonts)` and convert with jsPDF 4.2.1
(MIT) plus svg2pdf.js 2.9.0 (MIT), lazy-loaded behind the button. That is
roughly 155 KB gzip extra (130 + 25), and because VexFlow has already converted
text to outlines there is no font embedding problem and no unicode problem.
This is the same pattern OSMD's demo uses; its caveat about svg2pdf and text is
the reason to feed svg2pdf paths rather than text. `toSVG` needs opentype.js
pinned at 1.3.4 and OTF (not WOFF2) copies of Bravura and Academico
([`docs/portable-svg.md`](https://github.com/vexflow/vexflow/blob/main/docs/portable-svg.md);
opentype.js latest is 2.0.0, so pin it).

Do not rasterize. OSMD's default image export shows the trade: a JPEG of the
page at scale 2 is soft at print size and loses selectable text, which is the
wrong trade for line art made of thin stems and small letters.

## Open risks

1. **Vertical stacking is the real work, in every option.** Sticking letters,
   tuplet numbers, beams and up-stemmed cymbal notes all want the space above
   the staff. Budget for a fixed band layout: tuplet number on the beam, a
   reserved gap, then the sticking row, then the staff. Test with subdivision 5
   and 6, two-bar and three-bar combinations, at A4 width.
2. **Horizontal density.** Six strokes per pulse, two voices, plus tuplet
   numbers is the worst case. VexFlow's formatter will compress spacing to fit
   the stave width; plan for per-exercise width and a print sheet that gives
   each exercise a full line, and consider fewer bars per staff on phones.
3. **VexFlow 5.x churn.** Four releases in two days (5.1.0 through 5.2.0), a
   fifteen-month gap before them, and no LTS. Pin the exact version, keep the
   score builder behind one module, and treat `Sheet`/`System` as experimental.
4. **Payload.** 408 KB gzip is the largest part of the app. The Bravura module
   is 248 KB gzip of that and cannot be subset through the public API. Accept it
   (static hosting, cached, one page) or budget a custom subset build as a later
   optimization.
5. **"Odd groupings."** The mapping above assumes every subdivision fits inside
   one pulse. A grouping that spans pulses (for example five strokes across two
   pulses) needs a different tuplet group and does not fall out of the same
   builder. Ticket 01 settles whether that case exists; if it does, the note
   builder needs explicit group spans rather than a per-pulse loop.
6. **Where sticking attaches.** The plan puts letters over subdivision strokes
   only. If the teacher also wants sticking over the check strokes (the ride is
   played by a hand too), the row needs both voices and the collision budget
   doubles.
7. **Print-to-PDF UX.** Browser chrome, page-size defaults and the mobile save
   flow are outside your control. If the teacher's main workflow is "send a PDF
   to a student", test that flow on the actual phone and desktop they use before
   committing to print-only.
8. **Licenses are clean but check the font.** VexFlow (MIT), abcjs (MIT), OSMD
   (BSD-3-Clause), jsPDF and svg2pdf (MIT) are all permissive. Bravura is SIL
   OFL 1.1 with a Reserved Font Name; embedding it in a PDF is fine, shipping a
   *modified* Bravura subset must not use the reserved name. Converting to paths
   for export sidesteps the question entirely.
