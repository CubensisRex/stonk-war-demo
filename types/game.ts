export type Side = "NVDA" | "TSLA" | "AMD" | "META" | "COIN" | "PLTR";

export interface StockDefinition {
  ticker: Side;
  name: string;
  referencePrice: number;
  color: string;
  simulatedForm: number;
}

export type GamePhase =
  | "ZEROING"
  | "LIVE"
  | "SETTLING"
  | "RESULT"
  | "PAYOUT_SELECTION"
  | "COMPLETE";

export type PlayerResult = "win" | "loss" | "none";

export interface RoundConfig {
  leftTicker: Side;
  rightTicker: Side;
  profileId: number;
  mirrored: boolean;
}

export interface MarketFrame {
  leftPerformance: number;
  rightPerformance: number;
  leftReferencePrice: number;
  rightReferencePrice: number;
}

export interface MarketPricing {
  sensitivity: number;
  gap: number;
  pLeft: number;
  pRight: number;
  leftMultiplier: number;
  rightMultiplier: number;
}

export interface Bet {
  id: string;
  side: Side;
  wager: number;
  entryPrice: number;
  multiplier: number;
  secondsRemaining: number;
}

export interface SettledBet extends Bet {
  won: boolean;
  payout: number;
  profit: number;
}

export interface PortfolioHolding {
  units: number;
  playable: boolean;
}

export type Portfolio = Partial<Record<Side, PortfolioHolding>>;
export type TokenPrices = Record<Side, number>;
