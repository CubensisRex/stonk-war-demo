import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOUND_URLS } from "../lib/audioManager";

const EXPECTED_DURATIONS: Record<keyof typeof SOUND_URLS, [number, number]> = {
  "stonk-war-ambient-loop": [20, 30],
  "zeroing-loop": [2, 3],
  "countdown-tick": [0.05, 0.2],
  "round-start": [0.25, 0.65],
  "bet-placed": [0.1, 0.2],
  "lead-change": [0.05, 0.2],
  "final-seconds": [0.1, 0.3],
  "round-freeze": [0.25, 0.6],
  win: [1, 1.5],
  loss: [0.35, 0.8],
  "stock-received": [0.4, 0.9],
  bank: [0.05, 0.2],
};

describe("Stonk War sound pack", () => {
  it("ships every requested sound as conservative mono 48kHz WAV audio", () => {
    expect(Object.keys(SOUND_URLS)).toHaveLength(12);

    for (const [sound, url] of Object.entries(SOUND_URLS)) {
      const wav = readFileSync(join(process.cwd(), "public", url.replace(/^\//, "")));
      expect(wav.toString("ascii", 0, 4), sound).toBe("RIFF");
      expect(wav.toString("ascii", 8, 12), sound).toBe("WAVE");
      expect(wav.readUInt16LE(22), sound).toBe(1);
      expect(wav.readUInt32LE(24), sound).toBe(48_000);
      expect(wav.readUInt16LE(34), sound).toBe(16);

      const dataBytes = wav.readUInt32LE(40);
      const duration = dataBytes / 2 / 48_000;
      const [minimum, maximum] = EXPECTED_DURATIONS[sound as keyof typeof SOUND_URLS];
      expect(duration, sound).toBeGreaterThanOrEqual(minimum);
      expect(duration, sound).toBeLessThanOrEqual(maximum);

      let peak = 0;
      for (let offset = 44; offset < wav.length; offset += 2) {
        peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)));
      }
      expect(peak, sound).toBeGreaterThan(2_000);
      expect(peak, sound).toBeLessThanOrEqual(10_500);
    }
  });

  it.each(["zeroing-loop.wav", "stonk-war-ambient-loop.wav"])(
    "keeps %s continuous across its loop seam",
    (filename) => {
      const wav = readFileSync(join(process.cwd(), "public", "sounds", filename));
      const first = wav.readInt16LE(44);
      const last = wav.readInt16LE(wav.length - 2);
      expect(Math.abs(first - last)).toBeLessThan(250);
    },
  );
});
