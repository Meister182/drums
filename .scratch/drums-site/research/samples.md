# Drum samples, licences, and playback timing

Research for ticket `04-samples-research`. Date: 2026-11-17.

Scope: acoustic drum one-shots for snare, bass drum, ride, hi-hat and toms, plus a
metronome click, all loaded client-side by a static site on GitHub Pages. The
exercise plays subdivision strokes against a simultaneous pulse voice, from very
slow to fast tempos, so clarity and timing matter more than production polish.

## Recommendation

Use **MuldjordKit, FreePats edition**.

- Sound bank page: <https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html#MuldjordKit>
- Samples, SFZ mapping and licence file: <https://github.com/freepats/muldjordkit>
- Pinned revision used here: `719fe72bc6693b94f1229674e202881145ab44ed` (2024-10-20).
- Release used by the sound bank page: `2020-10-18`.

Licence: **Creative Commons Attribution 4.0 International (CC BY 4.0)**. The
project README states:

> The original MuldjordKit for DrumGuizmo is made by Lars Muldjord. Published
> under the terms of the Creative Commons Attribution 4.0 International License:
> http://creativecommons.org/licenses/by/4.0/

and adds a specific credit line:

> NOTE: Since 2021-01, attribution is required in the "album credits" field, or
> similiar album linear notes. The text is: Drum samples provided by
> DrumGizmo.org.

The CC BY 4.0 legal code grants the right to "reproduce and Share the Licensed
Material, in whole or in part" and to "produce, reproduce, and Share Adapted
Material" for any purpose, including commercially, provided the attribution
conditions in section 3(a) are met: identify the creator, give the licence and a
link to it, indicate changes, and keep any supplied notices
(<https://creativecommons.org/licenses/by/4.0/legalcode.en>). A credits page or
footer is the "similar linear notes" the project asks for.

### Why this kit

- **One session, one kit.** The samples come from a single 2009 recording of one
  rock/metal kit, so toms, snare, kick and cymbals share a room and a voice. It
  will sound like one kit, not a collage.
- **All required voices.** Kick left and right, two snare voices, closed and open
  hi-hat, ride left and right plus bells, four toms, crashes and china.
- **Dry, close-miked character.** The source session used close mics plus
  overheads, and the FreePats edition keeps that articulate, unroomy character.
  It is short enough to hear subdivisions at fast tempos better than a roomy jazz
  kit.
- **Enough variation to avoid machine-gunning.** The SFZ maps 8 to 14 velocity
  groups and 4 to 5 round robins per key, drawing on 10 to 16 distinct samples
  per key. The folders contain more raw takes than the mapping uses. Keep two
  round robins for the repeated voices in the shipped subset below.
- **Small source and small payload.** The GitHub repo is about 160 MB (370 FLAC
  files, 168 MB by tree size). The sound bank also offers a 157 MiB SFZ+FLAC
  archive, a 223 MiB SFZ+WAV archive, a 53 MiB SF2 and a 131 MiB Hydrogen kit.
  Individual files are downloadable, so the site only needs about 20 to 30 of
  them.
- **Verified audio format.** The files inspected (kick, snare, hi-hat, ride and
  two toms) are 44.1 kHz, 24-bit, mono FLAC. Mono is an advantage: pan in Web
  Audio and ship half the bytes.

### What the site should actually ship

Do not ship the whole library. Extract a small one-shot set, trim the tails, and
convert to 16-bit mono PCM WAV at 44.1 kHz. WAV is the safe baseline for
`decodeAudioData` and avoids lossy-encoder priming at the start of a hit.

| Voice | Layers | Round robins | Max length | Approx. size |
| --- | ---: | ---: | ---: | ---: |
| Kick (KdrumL) | 3 | 2 | 0.5 s | 260 KB |
| Snare (Snare1) | 3 | 2 | 0.8 s | 420 KB |
| Hi-hat closed | 3 | 2 | 0.4 s | 210 KB |
| Ride (RideL) | 3 | 1 | 3 to 4 s | 0.8 to 1.1 MB |
| Tom 1, 2, 3 | 2 each | 1 | 1.0 s | 530 KB |
| Hi-hat open (optional) | 2 | 1 | 0.8 s | 140 KB |
| **Total** | | | | **about 2.5 MB** |

Measured full lengths are longer: kick 1.67 s, snare 1.91 s, hi-hat 0.57 s, ride
17.1 s, toms 4.6 to 5.0 s. Trimming is expected. A 4 s ride with a short fade is
still a long ring for practice; 2.5 to 3 s is often better at fast tempos, and a
closed hi-hat or a short ride ping is a clearer pulse voice than a washing ride.

Processing recipe:

1. Pick 2 or 3 velocity groups and 1 or 2 round robins per voice from the SFZ
   mapping (keys 48 kick, 50 snare, 52 closed hat, 54 ride, 61 to 63 toms).
2. Trim to the lengths above and apply a 5 to 10 ms fade-out.
3. Convert to 16-bit mono WAV at 44.1 kHz.
4. Peak-normalise each voice to a common target (for example -3 dBFS), then set
   musical balance with per-voice gain in the app.
5. Keep the source files out of git if they are large, but keep a `CREDITS` file
   and the licence text beside the shipped WAVs.

Result: about 2.5 MB on first load, roughly 5.4 MB of decoded mono float32 memory
at a 48 kHz context. That is trivial against the GitHub Pages limits of a 1 GB
published site and a 100 GB per month soft bandwidth cap
(<https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>).

### Attribution block to ship

CC BY 4.0 requires the credit and an indication of changes. A suitable block,
linked from the site footer and included in the repository:

```text
Drum samples: MuldjordKit by Lars Muldjord, assembled for the FreePats project
by Roberto (zenvoid.org). Licensed under CC BY 4.0:
https://creativecommons.org/licenses/by/4.0/
Source: https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html
Changes: selected one-shots, trimmed tails, converted to 16-bit mono WAV.
Drum samples provided by DrumGizmo.org.
```

The phrase "Drum samples provided by DrumGizmo.org." is the exact credit the
source asks for. Keep it verbatim.

### Caveat before committing

The GitHub FLAC release is not a single premixed stereo kit: the files inspected
are mono, exposed as separate voices (Kick L/R, Snare 1/2, toms, hats and rides).
Snare 1 and Snare 2 are separate mappings, and Kick L and Kick R are two bass
drums. Audition both and choose, or blend them with phase checked, then pan in
the app. This is a one-time selection task, not a blocker. The kit is also a
rock/metal kit; it is punchy and dry, which suits practice, but it will not sound
like a jazz or orchestral kit.

## Fallback

Use **Virtuosity Drums** if a CC0 kit is required or the Muldjord timbre does not
suit.

- Project page: <https://versilian-studios.com/virtuosity-drums/>
- Samples and licence: <https://github.com/sfzinstruments/virtuosity_drums>
- Pinned revision: `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc` (2026-04-21).

Licence: **CC0 1.0 Universal**. The project page describes it as "an open source
(Creative Commons 0) contemporary Jazz drum kit library", and the repository
contains the CC0 1.0 legal code. The CC0 deed says the work has been dedicated to
the public domain and that you can "copy, modify, distribute and perform the
work, even for commercial purposes, all without asking permission"
(<https://creativecommons.org/publicdomain/zero/1.0/>). No attribution is
required.

Tradeoffs:

- About **1.1 GB** installed, plus about 1.1 GB of installation files, with 1,000
  performances and 4,900 files across six mic positions.
- Up to 36 dynamic layers on kick, snare and toms; cymbals use discrete layers
  with 4 round robins.
- It is a jazz kit recorded with room and overhead mics, so it is roomier and
  less dry than Muldjord. At fast subdivisions the room wash can obscure strokes
  unless the mix is tightened.
- The samples are per-mic FLAC files (the inspected file is 48 kHz, 24-bit mono).
  Building a stereo mix means summing and panning at least overhead plus kick and
  snare close mics. That is more audio work than the FreePats one-shots, but it
  gives full control and removes the attribution obligation.
- It covers every required voice: kick, snare, toms, closed/open hi-hat, ride and
  ride bell.

For this project, the fallback is the better choice only if CC0 is a hard
requirement. Otherwise the smaller, already-separated Muldjord one-shots are the
less risky path.

## Sample-set comparison

Sizes and licences below are from the linked project or, where marked "listing",
from the SFZ Instruments drum directory
(<https://sfzinstruments.github.io/drums>). "Free download" is not the same as
"free to redistribute": many commercial free packs forbid hosting the raw
samples, so they are not usable here.

| Set | Licence | Source size | Voices | Layers / round robins | Format | Kit consistency | Attribution |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| **MuldjordKit, FreePats** | CC BY 4.0 | ~160 MB repo; 157 MiB FLAC archive; 53 MiB SF2 | Full kit: 2 kick voices, 2 snare voices, 4 toms, closed/open hat, 2 rides, bells, crashes, china | 8 to 14 velocity groups, 4 to 5 RR per key; 10 to 16 distinct samples per key | 44.1 kHz, 24-bit mono FLAC | Single 2009 session, one rock/metal kit; close-miked and dry | Credit Lars Muldjord, FreePats and DrumGizmo.org; indicate trims and conversion |
| **Virtuosity Drums** | CC0 1.0 | 1.1 GB installed plus 1.1 GB installer; 4,900 files | Full jazz kit, six mic positions | Up to 36 dynamic layers; cymbals 4 RR | 48 kHz, 24-bit per-mic FLAC; inspected files mono | Single session, one house kit; roomy and detailed | None |
| **Salamander Drumkit** | CC BY-SA 3.0 (listing) | 369.7 MB | Full kit, WAV | Not verified | WAV | Single kit, older library | Credit, link, indicate changes, and share adaptations under CC BY-SA |
| **SM Drums** | Public domain (listing only; project site has no explicit licence) | 3+ GB of listed archives (listing says 2.2+ GB) | Full kit, Kontakt and SFZ | Deeply sampled, multi-mic | WAV and sampler formats | Single kit, deeply sampled | None if the public-domain claim holds; verify first |
| **Big Rusty Drums** (Karoryfer) | CC0 1.0 (listing) | 2.3 GB | 1980s Polish kit | Not verified | SFZ and samples | Single kit | None |
| **Tchimera Drum Kit** | Split: music use CC0, derivative kits CC BY-SA 4.0 | ~900 MB repo | Full kit, SFZ | Not verified | Audio samples and SFZ | Single kit, Tchackpoum samples | Music use needs no credit; redistributing a modified kit needs credit to Vincent Sermone and CC BY-SA 4.0 |
| **Gogodze Phu Vol II** (Karoryfer) | CC0 1.0 | 133 MB download; 400 MB+ extracted | Kick, snare, 3 toms, hi-hat; **no ride** | 1,701 samples, several mic mixes | SFZ and samples | Single kit, deliberately lo-fi | None |
| Commercial "free" packs (Splice, MusicRadar, 99Sounds, etc.) | EULA, usually royalty-free but not redistributable | Varies | Varies | Varies | Varies | Varies | Not suitable: hosting the raw samples is typically forbidden |

Notes:

- **Tchimera** is the clearest licensing trap. The README permits music made with
  it under CC0, but derivative virtual drum kits must be CC BY-SA 4.0 and must
  credit Vincent Sermone. Trimming and repackaging the samples for a web app is a
  derivative kit, so the permissive music clause does not cover it.
- **Salamander** is usable under CC BY-SA 3.0, but share-alike on the audio assets
  is an extra obligation with no benefit over CC BY or CC0 here.
- **SM Drums** may be the best public-domain kit if the claim is true, but the
  project site itself does not state a licence. Treat it as unverified.
- **Gogodze Phu Vol II** fails the voice requirement because it has no ride.
- **Virtuosity** is the only fully verified CC0 option here that has every
  required voice and a clearly documented licence, which is why it is the
  fallback.

## Click: synthesise, do not sample

**Decision: synthesise the metronome click in Web Audio.** Do not load a click
sample.

Why:

- **No licence, no file, no decode.** A click generated from an oscillator has no
  attribution requirement and adds zero bytes to the payload.
- **Exact onset.** The click is generated at the scheduled audio time. A sampled
  click adds a decode and, if it is ever compressed, possible encoder priming.
- **Adjustable and distinct.** You can choose a pitch and envelope that cuts
  through the drum kit and change the accent per beat without shipping variants.
- **No masking at fast tempos.** A short, high click stays audible over repeated
  snare or hi-hat strokes; a low or ringing sampled click turns into mush.

Suggested sound:

- Normal click: sine at about 1.6 kHz, 30 to 40 ms exponential decay.
- Accent or downbeat: about 2.4 kHz and 3 to 6 dB louder.
- Optional tick: 3 to 5 ms of band-passed noise at 2 to 4 kHz, mixed low, to add
  attack on phone speakers.
- Keep the click on its own gain bus so the student can balance it against the
  drums. Put it 3 to 6 dB above the drum bus by default.

Sketch:

```js
function click(when, accent) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(accent ? 2400 : 1600, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.55, when + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);
  osc.connect(gain).connect(clickBus);
  osc.start(when);
  osc.stop(when + 0.04);
}
```

Exponential ramps cannot target zero, hence the 0.0001 endpoints. The short ramp
also prevents a click at the start and end of the tone.

When would a sample be justified? Only if the teacher specifically wants a
woodblock or cowbell timbre. In that case, synthesise the woodblock offline
(filtered noise through a resonant band-pass) or use a verified CC0 percussion
sample. Do not use the kit's rimshot or cross-stick as the click: it will be
confused with the exercise strokes.

If the exercise wants a separate pulse voice plus a click, run three buses:
subdivision drum, pulse drum, and click. Schedule all three at the same `when`
time so they are sample-aligned. The click can also serve as the pulse voice if
the exercise only needs one reference sound.

## Scheduler design sketch

The standard approach is a **lookahead scheduler**: a JavaScript timer wakes up
frequently, but it does not play anything. It only schedules Web Audio events
slightly in the future on the audio clock. The audio thread then plays them
sample-accurately even if the main thread stalls. Chris Wilson's article
documents the pattern and the 25 ms interval / 100 ms lookahead starting point
(<https://web.dev/articles/audio-scheduling>).

### Core loop

```js
const ctx = new AudioContext({ latencyHint: "interactive" }); // do not force sampleRate
const LOOKAHEAD = 0.100;   // seconds of future events
const TICK_MS = 25;        // scheduler wake-up interval
let nextTime = 0;
let step = 0;
let timer = null;

function start() {
  nextTime = ctx.currentTime + 0.15; // cushion for the first tick and output pipeline
  step = 0;
  timer = setInterval(schedule, TICK_MS);
  schedule();
}

function schedule() {
  const now = ctx.currentTime;
  const horizon = now + LOOKAHEAD;
  let stepDur = (60 / bpm) / subdivision;

  // If the main thread stalled for longer than the lookahead, do not fire a
  // burst of late notes. Drop the missed steps and stay on the original grid.
  if (nextTime < now) {
    const missed = Math.floor((now - nextTime) / stepDur) + 1;
    step += missed;
    nextTime += missed * stepDur;
  }

  while (nextTime < horizon) {
    const onBeat = step % subdivision === 0;
    const onDownbeat = step % (subdivision * 4) === 0;

    play(subdivisionBuffer, nextTime, 0.7);
    if (onBeat) {
      play(pulseBuffer, nextTime, 1.0);
      click(nextTime, onDownbeat);
    }

    stepDur = (60 / bpm) / subdivision; // tempo may change between ticks
    nextTime += stepDur;
    step++;
    if (exerciseComplete(step)) { stop(); return; }
  }
}

function play(buffer, when, velocity) {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = velocity;
  src.connect(gain).connect(voiceBus);
  src.start(when);
  activeSources.add(src);
  src.onended = () => activeSources.delete(src);
}
```

Notes on the loop:

- `setInterval` is only a wake-up. All actual timing is `nextTime`, which is in
  `AudioContext.currentTime` seconds. Timer jitter therefore does not accumulate.
- The `while` loop can schedule several events per wake-up. At 6 subdivisions per
  beat and 240 bpm, events are 41.7 ms apart, so a 100 ms lookahead holds two or
  three events. At slow tempos it usually schedules nothing.
- Do not schedule much further ahead. Tempo changes and stop take effect only
  after the already-scheduled window has drained. 100 ms is a good default.
- Two voices that must sound together receive the same `when` value. They are
  then aligned to the same sample frame, regardless of when the JavaScript ran.
  Give each voice its own gain bus (pass the bus into `play()`), so the pulse
  voice can be balanced independently of the subdivision strokes.
- Pick velocity layers before this call. With only 2 or 3 layers, choose the
  nearest layer and use gain for the fine dynamic. Do not crossfade two layers
  unless they are phase-aligned; two simultaneous copies can comb-filter.
- The click placement is a choice. The sketch clicks every beat; only clicking
  the downbeat, or only the first beat of a count-in, can be clearer at fast
  tempos. Make it a setting rather than baking it into the scheduler.
- A count-in is the same scheduler with the drum buses muted for one bar. It does
  not need a separate timing path.

### Latency pitfalls

- **Autoplay blocking.** Browsers suspend audio until a user gesture. Creating the
  context early is fine, but it will start suspended; resume it in the Play button
  handler. MDN documents the Web Audio autoplay rules
  (<https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay>).
- **`baseLatency` is not the whole story.** It covers processing inside the audio
  graph, not the path to the speaker. `outputLatency` estimates the rest. The
  spec says `outputLatency` is an estimate, depends on the device and may change
  while the context is running; query it again when the output route changes
  (<https://www.w3.org/TR/webaudio/#dom-audiocontext-outputlatency>). MDN notes
  `outputLatency` only became available across browsers in March 2025, so keep a
  fallback for older Safari
  (<https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency>).
- **Visual sync.** A hit scheduled at audio time `T` is heard at roughly
  `T + baseLatency + outputLatency`. In `requestAnimationFrame`, advance the
  playhead using `ctx.currentTime - latency`, not raw `currentTime`, or the
  notation will lead the sound. Expose a small manual offset slider because the
  estimate is imperfect.
- **Bluetooth and phone speakers.** Wireless output can add a large,
  device-specific delay that `outputLatency` does not reliably capture. The
  internal pulse stays tight, but the student's perceived reference can feel
  detached from their hands. Recommend wired headphones or the device speaker,
  and test on real phones.
- **iOS Silent Mode.** WebKit has treated Web Audio as subject to the ringer
  switch, so on affected iOS versions an iPhone in Silent Mode can produce no
  sound at all with no error
  (<https://bugs.webkit.org/show_bug.cgi?id=237322>). Show a "no sound? check
  Silent Mode" hint; there is no web API to detect or override it.

### Sample-rate and format pitfalls

- **Do not force a sample rate.** An `AudioContext` defaults to the output
  device's rate, often 48 kHz. If you construct it with a different rate, the
  user agent must resample the output, and the spec warns that latency may be
  affected "possibly by a large amount"
  (<https://www.w3.org/TR/webaudio/#dom-audiocontextoptions-samplerate>). Use the
  default.
- **`decodeAudioData` resamples to the context rate.** The spec explicitly says
  the decoded data is resampled to the `BaseAudioContext` sample rate
  (<https://www.w3.org/TR/webaudio/#dom-baseaudiocontext-decodeaudiodata>). So a
  44.1 kHz file decoded into a 48 kHz context is already 48 kHz; do not convert
  twice, and do not schedule by file sample count.
- **Use seconds, not sample indices.** `buffer.duration` and
  `ctx.currentTime` are in seconds. If you ever need samples, use
  `ctx.sampleRate`, not the source file's rate.
- **`start(when)` is sample-accurate, including fractional times.** The spec says
  the exact value of `when` is used without rounding to the nearest sample frame
  (<https://www.w3.org/TR/webaudio/#dom-audioscheduledsourcenode-start>). A
  `when` in the past starts immediately, which is why the guard above matters.
- **Decode before playing.** Load and `decodeAudioData` every buffer before the
  first hit. Decoding on the first note causes a delay and a main-thread stall.
  Preload the files early and decode them once the context is running.
- **WAV, 16-bit, mono.** 16-bit PCM has about 96 dB of signal-to-noise, ample for
  drum one-shots, and is universally decodable. 24-bit WAV and FLAC are not
  worth the compatibility risk for a 2.5 MB set. If you later switch to AAC, MP3
  or Opus to save bytes, test onset alignment: lossy encoders can add priming
  samples at the start, which is exactly the wrong error for a practice tool.

### Lifecycle pitfalls

- **Stopping must cancel scheduled sources.** A `clearInterval` only stops future
  scheduling; notes already queued for the next 100 ms still play. Ramp the master
  gain down over about 10 ms first, then call `stop()` on the active sources.
  Stopping a source abruptly can pop.
- **Pause and restart.** On restart, reset `nextTime` to `ctx.currentTime + 0.1`
  and reset the exercise step. Do not resume from a stale `nextTime`.
- **Background tabs.** Chrome throttles chained timers in hidden pages, but not
  while the page has made noise in the past 30 seconds
  (<https://developer.chrome.com/blog/timer-throttling-in-chrome-88>). A playing
  exercise therefore keeps its timer at normal priority; if playback stops for
  longer than that while hidden, the timer can be throttled. A Web Worker timer
  is a common extra safeguard, but test it on the target browsers rather than
  assuming it is immune. A Wake Lock keeps the practice screen alive.
- **One context, reused.** Do not create a new `AudioContext` per exercise.
  `AudioBufferSourceNode` is single-use by design, but nodes are cheap and
  garbage-collect after they end. Creating a few dozen per second is fine.

## Open risks

1. **Mobile output is the biggest risk.** The scheduling is sample-accurate, but
   the student's reference goes through iOS Silent Mode, phone speakers and
   Bluetooth. Silent Mode can mute Web Audio entirely, phone speakers cannot
   reproduce the kick's low end, and Bluetooth latency is not fully reported.
   Mitigate with an explicit sound check, a "wired headphones recommended" note,
   a manual visual offset, and testing on real iOS and Android devices. Do not
   assume desktop Chrome behaviour generalises.
2. **Attribution drift.** CC BY 4.0 is easy to satisfy once and easy to lose on a
   fork or redesign. Keep the exact credit text, the licence link and a
   "changes" note in the repository and in a visible credits page. A missing
   credit is a licence violation, not a cosmetic issue.
3. **Mapping and timbre ambiguity.** Snare 1/2 and Kick L/R are separate voices,
   and the ride has a long tail. Audition, choose or blend, normalise levels, and
   trim. The kit is rock/metal; it may be too aggressive for a beginner exercise.
   Keep the Virtuosity fallback available if the sound does not work.
4. **Level and clipping at fast tempos.** At six subdivisions per beat, tails
   overlap. Peak-normalising each one-shot does not guarantee a safe mix. Leave
   6 dB of headroom on the master, trim long ride/tom tails, and avoid a master
   compressor if it adds latency. A gentle limiter is optional.
5. **Sample-source availability.** The FreePats repository is a small volunteer
   project. Pin the commit, keep a local copy of the exact files and the licence,
   and record the source file names and commit in a manifest. CC BY permits
   redistribution, so vendoring is safe.
6. **Machine-gun repetition.** Three velocity layers and two round robins are far
   better than one sample, but still limited. Use both round robins, vary gain
   slightly, and avoid triggering the same layer for every stroke at fast tempos.
7. **Format and browser drift.** 16-bit WAV is the safe baseline. If a future
   optimisation switches to Opus, AAC or FLAC, re-test `decodeAudioData` on
   Safari and re-check onset alignment. Do not ship 24-bit WAV by accident after
   trimming in an editor.
8. **"Free" packs are not all redistributable.** The set is hosted in a public
   repository, so the licence must permit redistribution of the audio files, not
   just use in a track. Most commercial free packs do not. Check before swapping
   the kit.

## Sources

Primary sources for the recommendation and fallback:

- FreePats MuldjordKit sound bank and licence statement:
  <https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html#MuldjordKit>
- MuldjordKit FreePats repository, `README.txt`, `LICENSE.txt` and SFZ mapping:
  <https://github.com/freepats/muldjordkit>
- Virtuosity Drums project page:
  <https://versilian-studios.com/virtuosity-drums/>
- Virtuosity Drums repository and CC0 licence:
  <https://github.com/sfzinstruments/virtuosity_drums>

Licence texts:

- CC BY 4.0 legal code: <https://creativecommons.org/licenses/by/4.0/legalcode.en>
- CC0 1.0 deed: <https://creativecommons.org/publicdomain/zero/1.0/>

Other sample sets:

- SFZ Instruments drum directory:
  <https://sfzinstruments.github.io/drums>
- Salamander Drumkit listing:
  <https://sfzinstruments.github.io/drums/salamander>
- SM Drums: <https://smmdrums.wordpress.com/>
- Tchimera Drum Kit (split licence in README):
  <https://github.com/michaelwillis/tchimera-drum-kit>
- Gogodze Phu Vol II:
  <https://shop.karoryfer.com/pages/free-gogodze-phu-vol-ii>

Playback and timing:

- Chris Wilson, "Scheduling web audio with precision":
  <https://web.dev/articles/audio-scheduling>
- W3C Web Audio API specification (latency, `start(when)`, `decodeAudioData`,
  sample rate):
  <https://www.w3.org/TR/webaudio/>
- MDN `AudioContext.baseLatency`:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency>
- MDN `AudioContext.outputLatency`:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency>
- MDN autoplay guide:
  <https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay>
- Chrome timer throttling:
  <https://developer.chrome.com/blog/timer-throttling-in-chrome-88>
- WebKit bug 237322, Web Audio muted by the iOS ringer switch:
  <https://bugs.webkit.org/show_bug.cgi?id=237322>
- GitHub Pages limits:
  <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>
