---
id: "02"
title: Decide the exercise data model
labels: [wayfinder:grilling]
blocked_by: ["01"]
status: closed
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

## Resolution

A setup is the whole visible state of the page. One schema, used by the library,
by share links, and by the app.

```ts
type Setup = {
  version: 1,
  sig: '2/4' | '3/4' | '4/4' | '6/8' | '12/8',
  bpm: number,            // 30 to 200, metronome beats per minute
  bars: number,           // 1 to 16
  metronome: boolean,
  metroUnit: 'bar' | 'beat' | 'eighth',
  metroVoice: VoiceId,    // click | snare | kick | ride | hihat | tom
  right: VoiceId,
  left: VoiceId,
  notesPerBar: number,    // 1 to 16
  sticking: StickingId,   // singles | doubles | triples | quadruples |
                          // single-paradiddle | double-paradiddle |
                          // paradiddle-diddle
  shown: number[],        // enabled notes-per-bar counts
  selection: string[],    // "sticking|notesPerBar", play order
}
```

- **Defaults**: 4/4, 80 BPM, 2 bars, metronome on the beat with the click voice,
  R snare, L bass drum, 12 notes per bar, singles, all counts shown, no
  selection.
- **Saved library**: `localStorage` key `drums.setups.v1`, value
  `{ version: 1, setups: [{ id, name, setup, savedAt }] }`. Saving with an
  existing name updates it. Names are not part of the setup for sharing.
- **Share link**: the setup fields as URL parameters, `sig`, `bpm`, `bars`, `m`,
  `mu`, `mv`, `r`, `l`, `n`, `s`, `shown`, `sel`. Opening a link loads it but
  does not save it.
- **Custom stickings** and **file export** are out of v1. The library plus share
  links cover saving and sending.
