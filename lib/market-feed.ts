import { getRoundProfile } from "./round-profiles";
import { getStock, getStockIndex } from "./stocks";
import type { MarketFrame, RoundConfig } from "../types/game";

const smoothstep = (value: number) => value * value * (3 - 2 * value);
const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getZeroMarketFrame(round: RoundConfig): MarketFrame {
  return {
    leftPerformance: 0,
    rightPerformance: 0,
    leftReferencePrice: getStock(round.leftTicker).referencePrice,
    rightReferencePrice: getStock(round.rightTicker).referencePrice,
  };
}

export function getMarketFrame(round: RoundConfig, secondsRemaining: number): MarketFrame {
  const seconds = clamp(secondsRemaining, 0, 60);
  const profile = getRoundProfile(round.profileId);
  let start = profile.keyframes[0];
  let end = profile.keyframes[profile.keyframes.length - 1];

  for (let index = 0; index < profile.keyframes.length - 1; index += 1) {
    const upper = profile.keyframes[index];
    const lower = profile.keyframes[index + 1];
    if (seconds <= upper.secondsRemaining && seconds >= lower.secondsRemaining) {
      start = upper;
      end = lower;
      break;
    }
  }

  const segmentLength = start.secondsRemaining - end.secondsRemaining;
  const progress = segmentLength === 0 ? 1 : (start.secondsRemaining - seconds) / segmentLength;
  const eased = smoothstep(progress);
  const elapsed = 60 - seconds;
  const edgeFade = Math.sin(Math.PI * progress);
  const seed =
    profile.id * 0.71 +
    getStockIndex(round.leftTicker) * 0.37 +
    getStockIndex(round.rightTicker) * 0.19;
  const microVariance = edgeFade * (
    Math.sin(elapsed * (1.43 + profile.id * 0.013) + seed) * 0.0032 +
    Math.sin(elapsed * 0.61 + seed * 1.7) * 0.0016
  );
  const orientation = round.mirrored ? -1 : 1;
  const relativeGap = (lerp(start.gap, end.gap, eased) + microVariance) * orientation;
  const commonDrift =
    Math.sin(Math.PI * (elapsed / 60)) *
    (Math.sin(elapsed * 0.19 + seed) * 0.018 + Math.sin(elapsed * 0.047 + seed) * 0.009);

  const leftPerformance = commonDrift + relativeGap / 2;
  const rightPerformance = commonDrift - relativeGap / 2;
  const leftStock = getStock(round.leftTicker);
  const rightStock = getStock(round.rightTicker);

  return {
    leftPerformance,
    rightPerformance,
    leftReferencePrice: leftStock.referencePrice * (1 + leftPerformance / 100),
    rightReferencePrice: rightStock.referencePrice * (1 + rightPerformance / 100),
  };
}
