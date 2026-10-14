export const SOUND_URLS = {
  "stonk-war-ambient-loop": "/sounds/stonk-war-ambient-loop.wav",
  "zeroing-loop": "/sounds/zeroing-loop.wav",
  "countdown-tick": "/sounds/countdown-tick.wav",
  "round-start": "/sounds/round-start.wav",
  "bet-placed": "/sounds/bet-placed.wav",
  "lead-change": "/sounds/lead-change.wav",
  "marker-left": "/sounds/marker-left.wav",
  "marker-right": "/sounds/marker-right.wav",
  "final-seconds": "/sounds/final-seconds.wav",
  "round-freeze": "/sounds/round-freeze.wav",
  win: "/sounds/win.wav",
  loss: "/sounds/loss.wav",
  "stock-received": "/sounds/stock-received.wav",
  bank: "/sounds/bank.wav",
} as const;

export type SoundId = keyof typeof SOUND_URLS;

const SOUND_GAINS: Record<SoundId, number> = {
  "stonk-war-ambient-loop": 0.1,
  "zeroing-loop": 0.28,
  "countdown-tick": 0.42,
  "round-start": 0.48,
  "bet-placed": 0.42,
  "lead-change": 0.32,
  "marker-left": 0.24,
  "marker-right": 0.24,
  "final-seconds": 0.36,
  "round-freeze": 0.46,
  win: 0.5,
  loss: 0.4,
  "stock-received": 0.44,
  bank: 0.34,
};

const SOUND_PREFERENCE_KEY = "stonk-war-sound-enabled";
type LoopSoundId = "stonk-war-ambient-loop" | "zeroing-loop";
type EffectSoundId = Exclude<SoundId, LoopSoundId>;

const DUCKED_EFFECTS = new Set<EffectSoundId>([
  "countdown-tick",
  "final-seconds",
  "round-start",
  "round-freeze",
  "win",
  "loss",
  "stock-received",
]);

class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<SoundId, AudioBuffer>();
  private bufferPromises = new Map<SoundId, Promise<AudioBuffer>>();
  private enabled = true;
  private unlocked = false;
  private pendingLoops = new Set<LoopSoundId>();
  private loopSources = new Map<LoopSoundId, AudioBufferSourceNode>();
  private loopGains = new Map<LoopSoundId, GainNode>();
  private loopRequests = new Map<LoopSoundId, number>();
  private effectSource: AudioBufferSourceNode | null = null;

  getEnabledPreference() {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "false";
    } catch {
      return true;
    }
  }

  setEnabled(enabled: boolean, persist = true) {
    this.enabled = enabled;
    if (persist && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
      } catch {
        // Sound still works when storage is unavailable.
      }
    }
    if (!enabled) this.stopAll();
  }

  bindFirstInteraction() {
    if (typeof document === "undefined") return () => undefined;

    const unlock = () => {
      cleanup();
      void this.unlock();
    };
    const cleanup = () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };

    if (this.unlocked) {
      void this.preload();
      return cleanup;
    }

    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return cleanup;
  }

  async unlock() {
    if (typeof window === "undefined") return;
    try {
      const context = this.getContext();
      if (context.state !== "running") await context.resume();
      this.unlocked = context.state === "running";
      if (!this.unlocked) return;

      void this.preload();
      if (this.enabled) {
        for (const sound of this.pendingLoops) void this.startLoop(sound);
      }
    } catch {
      this.unlocked = false;
      // Audio is enhancement-only and must never interrupt the game.
    }
  }

  async preload() {
    if (!this.unlocked) return;
    await Promise.allSettled(
      (Object.keys(SOUND_URLS) as SoundId[]).map((sound) => this.loadBuffer(sound)),
    );
  }

  async play(sound: EffectSoundId) {
    if (!this.enabled || !this.unlocked) return;
    try {
      const audioBuffer = await this.loadBuffer(sound);
      if (!this.enabled || !this.unlocked) return;
      const context = this.getContext();

      this.stopEffect();
      if (DUCKED_EFFECTS.has(sound)) this.duckMusic(audioBuffer.duration);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = audioBuffer;
      gain.gain.value = SOUND_GAINS[sound];
      source.connect(gain).connect(context.destination);
      source.onended = () => {
        if (this.effectSource === source) this.effectSource = null;
      };
      this.effectSource = source;
      source.start();
    } catch {
      // UI audio is enhancement-only and must never interrupt the game.
    }
  }

  async startLoop(sound: LoopSoundId) {
    if (sound === "stonk-war-ambient-loop" && this.prefersReducedMotion()) {
      this.stopLoop(sound, 0);
      return;
    }

    this.pendingLoops.add(sound);
    if (!this.enabled || !this.unlocked) return;
    const activeSource = this.loopSources.get(sound);
    if (activeSource && activeSource.buffer === this.buffers.get(sound)) return;

    const request = (this.loopRequests.get(sound) ?? 0) + 1;
    this.loopRequests.set(sound, request);
    try {
      const audioBuffer = await this.loadBuffer(sound);
      if (
        request !== this.loopRequests.get(sound)
        || !this.pendingLoops.has(sound)
        || !this.enabled
        || !this.unlocked
      ) return;

      this.stopActiveLoop(sound, 0);
      const context = this.getContext();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = audioBuffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(SOUND_GAINS[sound], context.currentTime + 0.14);
      source.connect(gain).connect(context.destination);
      this.loopSources.set(sound, source);
      this.loopGains.set(sound, gain);
      source.onended = () => {
        if (this.loopSources.get(sound) === source) {
          this.loopSources.delete(sound);
          this.loopGains.delete(sound);
        }
      };
      source.start();
    } catch {
      // UI audio is enhancement-only and must never interrupt the game.
    }
  }

  stopLoop(sound: LoopSoundId, fadeMilliseconds = 180) {
    this.pendingLoops.delete(sound);
    this.loopRequests.set(sound, (this.loopRequests.get(sound) ?? 0) + 1);
    this.stopActiveLoop(sound, fadeMilliseconds);
  }

  stopAll() {
    for (const sound of [...this.pendingLoops, ...this.loopSources.keys()]) {
      this.stopLoop(sound, 80);
    }
    this.stopEffect();
  }

  private getContext() {
    this.context ??= new AudioContext({ latencyHint: "interactive" });
    return this.context;
  }

  private async loadBuffer(sound: SoundId) {
    const existing = this.buffers.get(sound);
    if (existing) return existing;
    const pending = this.bufferPromises.get(sound);
    if (pending) return pending;

    const promise = fetch(SOUND_URLS[sound])
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${SOUND_URLS[sound]}`);
        return response.arrayBuffer();
      })
      .then((data) => this.getContext().decodeAudioData(data))
      .then((decoded) => {
        this.buffers.set(sound, decoded);
        return decoded;
      })
      .catch((error) => {
        this.bufferPromises.delete(sound);
        throw error;
      });

    this.bufferPromises.set(sound, promise);
    return promise;
  }

  private stopEffect() {
    if (!this.effectSource) return;
    try {
      this.effectSource.stop();
    } catch {
      // It may already have ended.
    }
    this.effectSource = null;
  }

  private duckMusic(effectDuration: number) {
    const gain = this.loopGains.get("stonk-war-ambient-loop");
    const context = this.context;
    if (!gain || !context) return;

    const now = context.currentTime;
    const normalGain = SOUND_GAINS["stonk-war-ambient-loop"];
    const duckedGain = normalGain * 0.74;
    const holdUntil = now + Math.min(1.2, Math.max(0.12, effectDuration * 0.8));
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(duckedGain, now + 0.045);
    gain.gain.setValueAtTime(duckedGain, holdUntil);
    gain.gain.linearRampToValueAtTime(normalGain, holdUntil + 0.28);
  }

  private prefersReducedMotion() {
    return typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }

  private stopActiveLoop(sound: LoopSoundId, fadeMilliseconds: number) {
    const source = this.loopSources.get(sound);
    const gain = this.loopGains.get(sound);
    this.loopSources.delete(sound);
    this.loopGains.delete(sound);
    if (!source) return;

    const context = this.context;
    if (!context || !gain || fadeMilliseconds <= 0) {
      try {
        source.stop();
      } catch {
        // It may already have ended.
      }
      return;
    }

    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeMilliseconds / 1_000);
    window.setTimeout(() => {
      try {
        source.stop();
      } catch {
        // It may already have ended.
      }
    }, fadeMilliseconds + 30);
  }
}

export const audioManager = new AudioManager();
