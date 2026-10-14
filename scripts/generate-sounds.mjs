import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLE_RATE = 48_000;
const TAU = Math.PI * 2;
const outputDirectory = join(process.cwd(), "public", "sounds");

function buffer(seconds) {
  return new Float64Array(Math.round(seconds * SAMPLE_RATE));
}

function envelope(time, duration, attack = 0.004, release = 0.06) {
  const fadeIn = attack <= 0 ? 1 : Math.min(1, time / attack);
  const fadeOut = release <= 0 ? 1 : Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function waveform(phase, type) {
  const sine = Math.sin(phase);
  if (type === "triangle") return (2 / Math.PI) * Math.asin(sine);
  if (type === "soft-square") return Math.tanh(sine * 1.7) / Math.tanh(1.7);
  return sine;
}

function addTone(samples, {
  start = 0,
  duration,
  frequency,
  endFrequency = frequency,
  amplitude = 0.2,
  attack = 0.004,
  release = 0.06,
  decay = 0,
  type = "sine",
}) {
  const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const sampleCount = Math.min(samples.length - startSample, Math.round(duration * SAMPLE_RATE));

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const glide = (endFrequency - frequency) / duration;
    const phase = TAU * (frequency * time + 0.5 * glide * time * time);
    const decayGain = decay > 0 ? Math.exp(-decay * time / duration) : 1;
    samples[startSample + index] += waveform(phase, type)
      * amplitude
      * envelope(time, duration, attack, release)
      * decayGain;
  }
}

function addNoise(samples, {
  seed,
  start = 0,
  duration,
  amplitude = 0.06,
  attack = 0.001,
  release = 0.03,
  decay = 6,
}) {
  let state = seed >>> 0;
  const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const sampleCount = Math.min(samples.length - startSample, Math.round(duration * SAMPLE_RATE));
  let previous = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const white = (state / 4_294_967_295) * 2 - 1;
    const softened = previous * 0.72 + white * 0.28;
    previous = softened;
    const time = index / SAMPLE_RATE;
    samples[startSample + index] += softened
      * amplitude
      * envelope(time, duration, attack, release)
      * Math.exp(-decay * time / duration);
  }
}

function normalize(samples, targetPeak = 0.32, pinSeam = true) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return samples;
  const scale = targetPeak / peak;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
  if (pinSeam) {
    samples[0] = 0;
    samples[samples.length - 1] = 0;
  }
  return samples;
}

function writeWav(filename, samples) {
  const dataSize = samples.length * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    wav.writeInt16LE(Math.round(clamped * 32_767), 44 + index * 2);
  }

  writeFileSync(join(outputDirectory, filename), wav);
}

function zeroingLoop() {
  const duration = 2.5;
  const samples = buffer(duration);
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const loopPhase = time / duration;
    const scanPulse = Math.pow(0.5 - 0.5 * Math.cos(TAU * 6 * loopPhase), 7);
    const lowPulse = Math.sin(TAU * 80 * time) * 0.055;
    const dataTone = (
      Math.sin(TAU * 640 * time) * 0.055
      + Math.sin(TAU * 960 * time) * 0.018
    ) * scanPulse;
    const texture = (
      Math.sin(TAU * 33 * loopPhase + 0.7)
      + Math.sin(TAU * 57 * loopPhase + 2.1) * 0.6
    ) * 0.006;
    samples[index] = lowPulse + dataTone + texture;
  }
  return normalize(samples, 0.2, false);
}

function ambientLoop() {
  const duration = 24;
  const samples = buffer(duration);

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const loopPhase = time / duration;
    const slowBreath = 0.78 + Math.sin(TAU * 2 * loopPhase - 0.45) * 0.08;
    const softPulse = Math.pow(0.5 - 0.5 * Math.cos(TAU * 12 * loopPhase), 5);
    const dataGate = Math.pow(0.5 - 0.5 * Math.cos(TAU * 6 * loopPhase + 1.1), 8);

    const lowBed = (
      Math.sin(TAU * 55 * time + 0.25) * 0.036
      + waveform(TAU * 82.5 * time + 1.2, "triangle") * 0.012
      + Math.sin(TAU * 110 * time + 2.35) * 0.008
    ) * slowBreath;
    const pulse = (
      Math.sin(TAU * 110 * time + 0.4) * 0.014
      + Math.sin(TAU * 165 * time + 1.7) * 0.006
    ) * softPulse;
    const digitalTexture = (
      Math.sin(TAU * 440 * time + 0.9) * 0.0032
      + Math.sin(TAU * 660 * time + 2.4) * 0.0018
      + Math.sin(TAU * 880 * time + 1.65) * 0.001
    ) * dataGate;

    samples[index] = lowBed + pulse + digitalTexture;
  }

  return normalize(samples, 0.3, false);
}

function countdownTick() {
  const samples = buffer(0.09);
  addTone(samples, { duration: 0.085, frequency: 920, endFrequency: 760, amplitude: 0.22, release: 0.045, decay: 2.4 });
  addTone(samples, { duration: 0.055, frequency: 1_480, amplitude: 0.07, release: 0.03, decay: 3.2, type: "triangle" });
  return normalize(samples, 0.28);
}

function roundStart() {
  const samples = buffer(0.46);
  addNoise(samples, { seed: 11, duration: 0.07, amplitude: 0.13, release: 0.045, decay: 7 });
  addTone(samples, { duration: 0.4, frequency: 120, endFrequency: 78, amplitude: 0.24, attack: 0.002, release: 0.16, decay: 2.8, type: "triangle" });
  addTone(samples, { duration: 0.27, frequency: 680, endFrequency: 310, amplitude: 0.12, release: 0.14, decay: 2.1 });
  return normalize(samples, 0.32);
}

function betPlaced() {
  const samples = buffer(0.16);
  addNoise(samples, { seed: 23, duration: 0.025, amplitude: 0.1, release: 0.018, decay: 8 });
  addTone(samples, { start: 0.008, duration: 0.12, frequency: 740, amplitude: 0.14, release: 0.07, decay: 1.4 });
  addTone(samples, { start: 0.035, duration: 0.1, frequency: 1_110, amplitude: 0.09, release: 0.06, decay: 1.8 });
  return normalize(samples, 0.27);
}

function markerSignal({ direction }) {
  const samples = buffer(0.14);
  const rises = direction === "right";
  addNoise(samples, { seed: rises ? 37 : 43, duration: 0.014, amplitude: 0.05, release: 0.01, decay: 9 });
  addTone(samples, {
    duration: 0.125,
    frequency: rises ? 560 : 900,
    endFrequency: rises ? 900 : 560,
    amplitude: 0.1,
    release: 0.075,
    decay: 1.9,
    type: "triangle",
  });
  addTone(samples, {
    start: 0.028,
    duration: 0.09,
    frequency: rises ? 840 : 650,
    endFrequency: rises ? 1_020 : 500,
    amplitude: 0.035,
    release: 0.055,
    decay: 2.2,
  });
  return normalize(samples, 0.2);
}

function leadChange() {
  const samples = buffer(0.105);
  addNoise(samples, { seed: 37, duration: 0.018, amplitude: 0.08, release: 0.012, decay: 9 });
  addTone(samples, { duration: 0.09, frequency: 1_280, endFrequency: 880, amplitude: 0.12, release: 0.05, decay: 2.5, type: "triangle" });
  return normalize(samples, 0.22);
}

function finalSeconds() {
  const samples = buffer(0.18);
  addTone(samples, { duration: 0.16, frequency: 510, endFrequency: 470, amplitude: 0.16, release: 0.08, decay: 1.5, type: "soft-square" });
  addTone(samples, { start: 0.018, duration: 0.125, frequency: 765, amplitude: 0.07, release: 0.065, decay: 2 });
  return normalize(samples, 0.27);
}

function roundFreeze() {
  const samples = buffer(0.42);
  addNoise(samples, { seed: 41, duration: 0.045, amplitude: 0.12, release: 0.03, decay: 7 });
  addTone(samples, { duration: 0.34, frequency: 210, endFrequency: 105, amplitude: 0.2, release: 0.15, decay: 2.5, type: "triangle" });
  addTone(samples, { duration: 0.24, frequency: 840, endFrequency: 260, amplitude: 0.085, release: 0.13, decay: 2.6 });
  return normalize(samples, 0.3);
}

function win() {
  const samples = buffer(1.28);
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((frequency, index) => {
    addTone(samples, {
      start: index * 0.145,
      duration: 0.72,
      frequency,
      amplitude: index === notes.length - 1 ? 0.105 : 0.085,
      attack: 0.012,
      release: 0.32,
      decay: 0.8,
      type: index % 2 === 0 ? "sine" : "triangle",
    });
  });
  addTone(samples, { start: 0.48, duration: 0.76, frequency: 220, amplitude: 0.055, attack: 0.02, release: 0.38, decay: 0.7 });
  return normalize(samples, 0.31);
}

function loss() {
  const samples = buffer(0.62);
  [392, 349.23, 293.66].forEach((frequency, index) => {
    addTone(samples, {
      start: index * 0.13,
      duration: 0.34,
      frequency,
      amplitude: 0.1,
      attack: 0.008,
      release: 0.18,
      decay: 1.1,
    });
  });
  return normalize(samples, 0.23);
}

function stockReceived() {
  const samples = buffer(0.7);
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    addTone(samples, {
      start: index * 0.115,
      duration: 0.38,
      frequency,
      amplitude: 0.105,
      attack: 0.006,
      release: 0.19,
      decay: 1.2,
      type: index === 1 ? "triangle" : "sine",
    });
  });
  addNoise(samples, { seed: 59, start: 0.23, duration: 0.06, amplitude: 0.025, release: 0.05, decay: 4 });
  return normalize(samples, 0.27);
}

function bank() {
  const samples = buffer(0.13);
  addNoise(samples, { seed: 71, duration: 0.02, amplitude: 0.08, release: 0.014, decay: 8 });
  addTone(samples, { duration: 0.11, frequency: 330, endFrequency: 270, amplitude: 0.12, release: 0.065, decay: 2.3, type: "triangle" });
  addTone(samples, { start: 0.012, duration: 0.085, frequency: 660, amplitude: 0.055, release: 0.05, decay: 2.7 });
  return normalize(samples, 0.23);
}

const sounds = {
  "stonk-war-ambient-loop.wav": ambientLoop(),
  "zeroing-loop.wav": zeroingLoop(),
  "countdown-tick.wav": countdownTick(),
  "round-start.wav": roundStart(),
  "bet-placed.wav": betPlaced(),
  "lead-change.wav": leadChange(),
  "marker-left.wav": markerSignal({ direction: "left" }),
  "marker-right.wav": markerSignal({ direction: "right" }),
  "final-seconds.wav": finalSeconds(),
  "round-freeze.wav": roundFreeze(),
  "win.wav": win(),
  "loss.wav": loss(),
  "stock-received.wav": stockReceived(),
  "bank.wav": bank(),
};

mkdirSync(outputDirectory, { recursive: true });
for (const [filename, samples] of Object.entries(sounds)) {
  writeWav(filename, samples);
  const duration = samples.length / SAMPLE_RATE;
  console.log(`${filename.padEnd(22)} ${duration.toFixed(3)}s`);
}
