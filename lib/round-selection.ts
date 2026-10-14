import { ROUND_PROFILES } from "./round-profiles";
import { STOCKS } from "./stocks";
import type { RoundConfig } from "../types/game";

const pairKey = (round: RoundConfig) =>
  [round.leftTicker, round.rightTicker].sort().join(":");

export function createRandomRound(
  previous?: RoundConfig,
  random: () => number = Math.random,
): RoundConfig {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const leftIndex = Math.floor(random() * STOCKS.length);
    let rightIndex = Math.floor(random() * (STOCKS.length - 1));
    if (rightIndex >= leftIndex) rightIndex += 1;

    const next: RoundConfig = {
      leftTicker: STOCKS[leftIndex].ticker,
      rightTicker: STOCKS[rightIndex].ticker,
      profileId: ROUND_PROFILES[Math.floor(random() * ROUND_PROFILES.length)].id,
      mirrored: random() < 0.5,
    };

    if (!previous || (pairKey(next) !== pairKey(previous) && next.profileId !== previous.profileId)) {
      return next;
    }
  }

  const previousLeftIndex = previous
    ? STOCKS.findIndex((stock) => stock.ticker === previous.leftTicker)
    : 0;
  const leftIndex = (previousLeftIndex + 1) % STOCKS.length;
  const rightIndex = (leftIndex + 1) % STOCKS.length;

  return {
    leftTicker: STOCKS[leftIndex].ticker,
    rightTicker: STOCKS[rightIndex].ticker,
    profileId: previous ? (previous.profileId % ROUND_PROFILES.length) + 1 : 1,
    mirrored: previous ? !previous.mirrored : false,
  };
}
