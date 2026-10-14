import type { MarketPricing, RoundConfig } from "@/types/game";
import { getStock } from "./stocks";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function calculateMarketPricing(
  leftPerformance: number,
  rightPerformance: number,
  secondsRemaining: number,
  priorRightProbability = 0.5,
): MarketPricing {
  const gap = rightPerformance - leftPerformance;
  const sensitivity = 2.5 + 0.08 * (60 - clamp(secondsRemaining, 0, 60));
  const prior = clamp(priorRightProbability, 0.08, 0.92);
  const priorLogOdds = Math.log(prior / (1 - prior));
  const pRight = clamp(sigmoid(priorLogOdds + gap * sensitivity), 0.08, 0.92);
  const pLeft = 1 - pRight;

  return {
    sensitivity,
    gap,
    pLeft,
    pRight,
    leftMultiplier: 1 / pLeft,
    rightMultiplier: 1 / pRight,
  };
}

function roundSeed(round: RoundConfig) {
  const source = `${round.leftTicker}:${round.rightTicker}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function calculateZeroingPricing(
  round: RoundConfig,
  secondsRemaining: number,
): MarketPricing {
  const seed = roundSeed(round);
  const elapsed = 30 - clamp(secondsRemaining, 0, 30);
  const formGap = getStock(round.leftTicker).simulatedForm - getStock(round.rightTicker).simulatedForm;
  const baseline = clamp(
    0.5 + formGap * 0.14 + (seed - 0.5) * 0.02,
    0.24,
    0.76,
  );
  const balancingFlow =
    Math.sin(elapsed * 0.72 + seed * 11.3) * 0.018 +
    Math.sin(elapsed * 1.67 + seed * 4.7) * 0.008;
  const pLeft = clamp(baseline + balancingFlow, 0.2, 0.8);
  const pRight = 1 - pLeft;

  return {
    sensitivity: 0,
    gap: 0,
    pLeft,
    pRight,
    leftMultiplier: 1 / pLeft,
    rightMultiplier: 1 / pRight,
  };
}
