import { describe, expect, it } from "vitest";
import { addToPosition, getPlayerResult } from "../lib/betting";
import { getMarketFrame, getZeroMarketFrame } from "../lib/market-feed";
import { calculateMarketPricing, calculateZeroingPricing } from "../lib/pricing";
import { ROUND_PROFILES } from "../lib/round-profiles";
import { createRandomRound } from "../lib/round-selection";
import { STOCKS } from "../lib/stocks";
import type { RoundConfig } from "../types/game";

const BASE_ROUND: RoundConfig = {
  leftTicker: "NVDA",
  rightTicker: "TSLA",
  profileId: 1,
  mirrored: false,
};

describe("Stonk War round engine", () => {
  it("provides six reusable stocks and ten deterministic race profiles", () => {
    expect(STOCKS.map((stock) => stock.ticker)).toEqual([
      "NVDA",
      "TSLA",
      "AMD",
      "META",
      "COIN",
      "PLTR",
    ]);
    expect(ROUND_PROFILES).toHaveLength(10);
  });

  it("keeps performance zeroed while opening odds move around a pair-specific form lean", () => {
    const frame = getZeroMarketFrame(BASE_ROUND);
    const opening = calculateZeroingPricing(BASE_ROUND, 30);
    const later = calculateZeroingPricing(BASE_ROUND, 20);

    expect(frame.leftPerformance).toBe(0);
    expect(frame.rightPerformance).toBe(0);
    expect(opening.gap).toBe(0);
    expect(opening.pLeft + opening.pRight).toBeCloseTo(1, 10);
    expect(opening.pLeft).toBeGreaterThanOrEqual(0.2);
    expect(opening.pLeft).toBeLessThanOrEqual(0.8);
    expect(later.pLeft).not.toBe(opening.pLeft);
    expect(calculateZeroingPricing(BASE_ROUND, 30)).toEqual(opening);
  });

  it("opens a strong-versus-weak form matchup with a visibly decisive market lean", () => {
    const opening = calculateZeroingPricing({
      ...BASE_ROUND,
      leftTicker: "NVDA",
      rightTicker: "COIN",
    }, 30);

    expect(opening.pLeft).toBeGreaterThan(0.7);
    expect(opening.pRight).toBeLessThan(0.3);
    expect(opening.pLeft + opening.pRight).toBeCloseTo(1, 10);
  });

  it("carries the closing opening-market odds into a dead-even live start", () => {
    const opening = calculateZeroingPricing(BASE_ROUND, 0);
    const liveStart = calculateMarketPricing(0, 0, 60, opening.pRight);

    expect(liveStart.gap).toBe(0);
    expect(liveStart.pLeft).toBeCloseTo(opening.pLeft, 10);
    expect(liveStart.pRight).toBeCloseTo(opening.pRight, 10);
  });

  it("preserves every intended final gap and reverses it when mirrored", () => {
    for (const profile of ROUND_PROFILES) {
      const expectedGap = profile.keyframes.at(-1)?.gap ?? 0;
      const normal = getMarketFrame({ ...BASE_ROUND, profileId: profile.id, mirrored: false }, 0);
      const mirrored = getMarketFrame({ ...BASE_ROUND, profileId: profile.id, mirrored: true }, 0);

      expect(normal.leftPerformance - normal.rightPerformance).toBeCloseTo(expectedGap, 10);
      expect(mirrored.leftPerformance - mirrored.rightPerformance).toBeCloseTo(-expectedGap, 10);
    }
  });

  it("selects distinct stocks and avoids immediately repeating the prior pair and profile", () => {
    const first = createRandomRound(undefined, () => 0);
    const second = createRandomRound(first, () => 0);

    expect(first.leftTicker).not.toBe(first.rightTicker);
    expect(second.leftTicker).not.toBe(second.rightTicker);
    expect(new Set([second.leftTicker, second.rightTicker])).not.toEqual(
      new Set([first.leftTicker, first.rightTicker]),
    );
    expect(second.profileId).not.toBe(first.profileId);
  });

  it("increases pricing conviction as time runs down and respects clamps", () => {
    const early = calculateMarketPricing(0, 0.2, 50);
    const late = calculateMarketPricing(0, 0.2, 10);
    const extreme = calculateMarketPricing(-5, 5, 0);

    expect(late.pRight).toBeGreaterThan(early.pRight);
    expect(extreme.pRight).toBe(0.92);
    expect(extreme.pLeft).toBeCloseTo(0.08, 10);
  });

  it("keeps repeated stakes on the same stock in one blended position", () => {
    const firstPosition = addToPosition({
      side: "META",
      amount: 100,
      entryPrice: 0.5,
      secondsRemaining: 60,
      id: "round-position",
    });
    const toppedUpPosition = addToPosition({
      existingPosition: firstPosition,
      side: "META",
      amount: 50,
      entryPrice: 0.4,
      secondsRemaining: 55,
      id: "ignored-for-top-up",
    });

    expect(toppedUpPosition.id).toBe("round-position");
    expect(toppedUpPosition.wager).toBe(150);
    expect(toppedUpPosition.wager * toppedUpPosition.multiplier).toBeCloseTo(325, 10);
    expect(toppedUpPosition.entryPrice).toBeCloseTo(150 / 325, 10);
  });

  it("rejects a stake on the opposing stock once the round position is set", () => {
    const position = addToPosition({
      side: "META",
      amount: 100,
      entryPrice: 0.5,
      secondsRemaining: 60,
      id: "round-position",
    });

    expect(() => addToPosition({
      existingPosition: position,
      side: "TSLA",
      amount: 25,
      entryPrice: 0.5,
      secondsRemaining: 60,
      id: "opposing-position",
    })).toThrow("Position is already locked to META.");
  });

  it("maps the final animation to the player's result rather than the winning brand", () => {
    const position = addToPosition({
      side: "META",
      amount: 100,
      entryPrice: 0.5,
      secondsRemaining: 60,
      id: "round-position",
    });

    expect(getPlayerResult(position, "META")).toBe("win");
    expect(getPlayerResult(position, "TSLA")).toBe("loss");
    expect(getPlayerResult(undefined, "META")).toBe("none");
  });
});
