import {
  beatsPerBar,
  clicksPerBar,
  planSteps,
  stickingById,
  type PlanStep,
  type Setup,
  type VoiceId,
} from './model';

export type PlayState =
  | { phase: 'countin'; beatsLeft: number }
  | {
      phase: 'playing';
      stepKey: string;
      stepIndex: number;
      stepCount: number;
      local: number;
      count: number;
      global: number;
    };

type SampleSet = { buffers: AudioBuffer[]; gain: number };

const FILES: Record<string, { file: string; gain: number }[]> = {
  kick: [
    { file: 'kick-1.wav', gain: 0.95 },
    { file: 'kick-2.wav', gain: 0.95 },
  ],
  snare: [
    { file: 'snare-1.wav', gain: 0.85 },
    { file: 'snare-2.wav', gain: 0.85 },
  ],
  hihat: [
    { file: 'hihat-1.wav', gain: 0.5 },
    { file: 'hihat-2.wav', gain: 0.5 },
  ],
  ride: [{ file: 'ride-1.wav', gain: 0.55 }],
  tom: [{ file: 'tom-1.wav', gain: 0.75 }],
};

export class Player {
  private ctx: AudioContext | null = null;
  private samples = new Map<string, SampleSet>();
  private roundRobin = new Map<string, number>();
  private sources: AudioScheduledSourceNode[] = [];
  private timer = 0;
  private raf = 0;
  private start = 0;
  private passDuration = 0;
  private steps: (PlanStep & { start: number; end: number; count: number; noteStart: number })[] = [];
  private plan: PlanStep[] = [];
  private beat = 0;
  private pass = 0;
  private loop = false;
  private countInBeats = 0;
  private setup: Setup | null = null;
  private onState: ((state: PlayState | null) => void) | null = null;
  loaded = false;
  loading: Promise<void> | null = null;

  private context() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  load(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.context();
    const base = `${import.meta.env.BASE_URL}audio/`;
    this.loading = Promise.all(
      Object.entries(FILES).map(async ([voice, entries]) => {
        const buffers: AudioBuffer[] = [];
        for (const entry of entries) {
          const response = await fetch(`${base}${entry.file}`);
          if (!response.ok) throw new Error(`Missing ${entry.file}`);
          buffers.push(await ctx.decodeAudioData(await response.arrayBuffer()));
        }
        this.samples.set(voice, { buffers, gain: entries[0].gain });
      }),
    ).then(() => {
      this.loaded = true;
    });
    return this.loading;
  }

  isPlaying() {
    return this.timer !== 0 || this.raf !== 0;
  }

  play(setup: Setup, options: { loop: boolean; countIn: boolean }, onState: (state: PlayState | null) => void) {
    const ctx = this.context();
    void ctx.resume();
    this.stop();
    this.setup = setup;
    this.onState = onState;
    this.loop = options.loop;
    this.countInBeats = options.countIn ? beatsPerBar(setup) : 0;
    this.beat = 60 / setup.bpm;
    this.plan = planSteps(setup);
    this.pass = 0;

    const countInStart = ctx.currentTime + 0.25;
    for (let i = 0; i < this.countInBeats; i += 1) {
      this.hit('click', countInStart + i * this.beat);
    }
    const start = countInStart + this.countInBeats * this.beat;
    const scheduled = this.schedulePass(start);
    this.start = start;
    this.passDuration = scheduled.duration;
    this.steps = scheduled.steps;

    if (this.loop) this.scheduleLoop();
    this.tick();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    this.timer = 0;
    this.raf = 0;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    if (this.onState) this.onState(null);
    this.setup = null;
  }

  private schedulePass(base: number) {
    if (!this.setup || !this.ctx) return { steps: [], duration: 0 };
    const setup = this.setup;
    const bpb = beatsPerBar(setup);
    const barDuration = bpb * this.beat;
    const steps: typeof this.steps = [];
    let time = base;
    let noteStart = 0;

    for (const step of this.plan) {
      const stroke = barDuration / step.n;
      const count = step.bars * step.n;
      const pattern = stickingById(step.sticking).pattern;
      for (let i = 0; i < count; i += 1) {
        const hand = pattern[i % pattern.length];
        this.hit(hand === 'R' ? step.right : step.left, time + i * stroke);
      }
      if (step.metronome) {
        const interval = barDuration / clicksPerBar(setup);
        for (let b = 0; b < step.bars * clicksPerBar(setup); b += 1) {
          this.hit(step.metroVoice, time + b * interval);
        }
      }
      const duration = step.bars * barDuration;
      steps.push({ ...step, start: time - base, end: time - base + duration, count, noteStart });
      noteStart += count;
      time += duration;
    }

    return { steps, duration: time - base };
  }

  private scheduleLoop() {
    if (!this.setup || !this.ctx) return;
    const boundary = this.start + (this.pass + 1) * this.passDuration;
    const delay = Math.max(0, (boundary - this.ctx.currentTime - 0.05) * 1000);
    this.timer = window.setTimeout(() => {
      if (!this.setup) return;
      this.pass += 1;
      this.schedulePass(this.start + this.pass * this.passDuration);
      if (this.loop) this.scheduleLoop();
    }, delay);
  }

  private tick = () => {
    if (!this.setup || !this.ctx) return;
    const elapsed = this.ctx.currentTime - this.start;

    if (elapsed < 0) {
      const left = Math.min(this.countInBeats, Math.max(1, Math.ceil(-elapsed / this.beat - 0.001)));
      this.onState?.({ phase: 'countin', beatsLeft: left });
    } else if (elapsed >= this.passDuration && !this.loop) {
      this.stop();
      return;
    } else if (this.passDuration > 0) {
      const inPass = elapsed % this.passDuration;
      const step = this.steps.find((s) => inPass >= s.start && inPass < s.end) ?? this.steps[this.steps.length - 1];
      if (step) {
        const stroke = (step.end - step.start) / step.count;
        const local = Math.min(step.count - 1, Math.max(0, Math.floor((inPass - step.start) / stroke)));
        this.onState?.({
          phase: 'playing',
          stepKey: step.key,
          stepIndex: this.steps.indexOf(step),
          stepCount: this.steps.length,
          local,
          count: step.count,
          global: step.noteStart + local,
        });
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private point(ctx: AudioContext, time: number) {
    const t = Math.max(time, ctx.currentTime + 0.001);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, t);
    gain.connect(ctx.destination);
    return { t, gain };
  }

  private hit(kind: VoiceId, time: number) {
    if (!this.ctx || kind === 'none') return;
    if (kind === 'click') {
      const { t, gain } = this.point(this.ctx, time);
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, t);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.28, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(env).connect(gain);
      osc.start(t);
      osc.stop(t + 0.06);
      this.sources.push(osc);
      return;
    }

    const set = this.samples.get(kind);
    if (!set) return;
    const index = this.roundRobin.get(kind) ?? 0;
    this.roundRobin.set(kind, (index + 1) % set.buffers.length);
    const { t, gain } = this.point(this.ctx, time);
    const source = this.ctx.createBufferSource();
    const voiceGain = this.ctx.createGain();
    source.buffer = set.buffers[index];
    voiceGain.gain.value = set.gain;
    source.connect(voiceGain).connect(gain);
    source.start(t);
    this.sources.push(source);
  }
}
