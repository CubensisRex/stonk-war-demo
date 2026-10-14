import type { Bet, PlayerResult, Side } from "@/types/game";

interface AddToPositionInput {
  existingPosition?: Bet;
  side: Side;
  amount: number;
  entryPrice: number;
  secondsRemaining: number;
  id: string;
}

export function addToPosition({
  existingPosition,
  side,
  amount,
  entryPrice,
  secondsRemaining,
  id,
}: AddToPositionInput): Bet {
  if (existingPosition && existingPosition.side !== side) {
    throw new Error(`Position is already locked to ${existingPosition.side}.`);
  }

  const additionMultiplier = 1 / entryPrice;
  if (!existingPosition) {
    return {
      id,
      side,
      wager: amount,
      entryPrice,
      multiplier: additionMultiplier,
      secondsRemaining,
    };
  }

  const wager = existingPosition.wager + amount;
  const potentialPayout =
    existingPosition.wager * existingPosition.multiplier + amount * additionMultiplier;
  const multiplier = potentialPayout / wager;

  return {
    ...existingPosition,
    wager,
    entryPrice: 1 / multiplier,
    multiplier,
    secondsRemaining: Math.min(existingPosition.secondsRemaining, secondsRemaining),
  };
}

export function getPlayerResult(position: Bet | undefined, winner: Side): PlayerResult {
  if (!position) return "none";
  return position.side === winner ? "win" : "loss";
}
