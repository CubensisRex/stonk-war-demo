interface GapKeyframe {
  secondsRemaining: number;
  gap: number;
}

export interface RoundProfile {
  id: number;
  name: string;
  keyframes: readonly GapKeyframe[];
}

export const ROUND_PROFILES: readonly RoundProfile[] = [
  {
    id: 1,
    name: "Late comeback",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 45, gap: 0.08 },
      { secondsRemaining: 30, gap: 0.18 },
      { secondsRemaining: 20, gap: 0.14 },
      { secondsRemaining: 12, gap: 0 },
      { secondsRemaining: 8, gap: -0.1 },
      { secondsRemaining: 0, gap: -0.24 },
    ],
  },
  {
    id: 2,
    name: "Comfortable win",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: 0.05 },
      { secondsRemaining: 40, gap: 0.11 },
      { secondsRemaining: 30, gap: 0.15 },
      { secondsRemaining: 20, gap: 0.19 },
      { secondsRemaining: 10, gap: 0.23 },
      { secondsRemaining: 0, gap: 0.27 },
    ],
  },
  {
    id: 3,
    name: "Constant lead changes",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: 0.07 },
      { secondsRemaining: 42, gap: -0.04 },
      { secondsRemaining: 34, gap: 0.09 },
      { secondsRemaining: 26, gap: -0.08 },
      { secondsRemaining: 18, gap: 0.05 },
      { secondsRemaining: 10, gap: -0.06 },
      { secondsRemaining: 0, gap: -0.14 },
    ],
  },
  {
    id: 4,
    name: "Last-second steal",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 45, gap: -0.06 },
      { secondsRemaining: 30, gap: -0.13 },
      { secondsRemaining: 20, gap: -0.17 },
      { secondsRemaining: 10, gap: -0.14 },
      { secondsRemaining: 5, gap: -0.05 },
      { secondsRemaining: 2, gap: 0.02 },
      { secondsRemaining: 0, gap: 0.08 },
    ],
  },
  {
    id: 5,
    name: "Early shock, recovery",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 52, gap: -0.16 },
      { secondsRemaining: 44, gap: -0.22 },
      { secondsRemaining: 35, gap: -0.14 },
      { secondsRemaining: 25, gap: -0.05 },
      { secondsRemaining: 15, gap: 0.04 },
      { secondsRemaining: 8, gap: 0.13 },
      { secondsRemaining: 0, gap: 0.21 },
    ],
  },
  {
    id: 6,
    name: "Neck and neck",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: 0.02 },
      { secondsRemaining: 40, gap: -0.03 },
      { secondsRemaining: 30, gap: 0.02 },
      { secondsRemaining: 20, gap: -0.02 },
      { secondsRemaining: 10, gap: 0.03 },
      { secondsRemaining: 5, gap: 0.01 },
      { secondsRemaining: 0, gap: 0.06 },
    ],
  },
  {
    id: 7,
    name: "Breakaway",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: 0.03 },
      { secondsRemaining: 40, gap: 0.08 },
      { secondsRemaining: 30, gap: 0.16 },
      { secondsRemaining: 20, gap: 0.25 },
      { secondsRemaining: 10, gap: 0.34 },
      { secondsRemaining: 0, gap: 0.42 },
    ],
  },
  {
    id: 8,
    name: "Fake comeback",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 48, gap: 0.11 },
      { secondsRemaining: 35, gap: 0.21 },
      { secondsRemaining: 25, gap: 0.24 },
      { secondsRemaining: 16, gap: 0.12 },
      { secondsRemaining: 9, gap: 0.03 },
      { secondsRemaining: 5, gap: 0.09 },
      { secondsRemaining: 0, gap: 0.18 },
    ],
  },
  {
    id: 9,
    name: "Momentum reversal",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: -0.04 },
      { secondsRemaining: 40, gap: -0.1 },
      { secondsRemaining: 30, gap: -0.16 },
      { secondsRemaining: 22, gap: -0.08 },
      { secondsRemaining: 15, gap: 0.03 },
      { secondsRemaining: 8, gap: 0.17 },
      { secondsRemaining: 0, gap: 0.3 },
    ],
  },
  {
    id: 10,
    name: "Photo finish",
    keyframes: [
      { secondsRemaining: 60, gap: 0 },
      { secondsRemaining: 50, gap: 0.04 },
      { secondsRemaining: 40, gap: 0.01 },
      { secondsRemaining: 30, gap: -0.05 },
      { secondsRemaining: 20, gap: -0.02 },
      { secondsRemaining: 12, gap: 0.04 },
      { secondsRemaining: 6, gap: -0.01 },
      { secondsRemaining: 3, gap: 0.02 },
      { secondsRemaining: 0, gap: 0.04 },
    ],
  },
] as const;

export function getRoundProfile(profileId: number) {
  const profile = ROUND_PROFILES.find((candidate) => candidate.id === profileId);
  if (!profile) throw new Error(`Unknown Stonk War profile: ${profileId}`);
  return profile;
}
