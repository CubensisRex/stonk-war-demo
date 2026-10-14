import type { Side, StockDefinition } from "../types/game";

export const STOCKS: readonly StockDefinition[] = [
  { ticker: "NVDA", name: "NVIDIA", referencePrice: 132.84, color: "#76b900", simulatedForm: 0.9 },
  { ticker: "TSLA", name: "Tesla", referencePrice: 238.17, color: "#e82127", simulatedForm: -0.35 },
  { ticker: "AMD", name: "Advanced Micro Devices", referencePrice: 162.35, color: "#ed1c24", simulatedForm: 0.25 },
  { ticker: "META", name: "Meta", referencePrice: 640.21, color: "#0866ff", simulatedForm: 0.55 },
  { ticker: "COIN", name: "Coinbase", referencePrice: 318.44, color: "#0052ff", simulatedForm: -0.9 },
  { ticker: "PLTR", name: "Palantir", referencePrice: 178.32, color: "#e7eaed", simulatedForm: 0.05 },
] as const;

const STOCKS_BY_TICKER = Object.fromEntries(
  STOCKS.map((stock) => [stock.ticker, stock]),
) as Record<Side, StockDefinition>;

export function getStock(ticker: Side) {
  return STOCKS_BY_TICKER[ticker];
}

export function getStockIndex(ticker: Side) {
  return STOCKS.findIndex((stock) => stock.ticker === ticker);
}
