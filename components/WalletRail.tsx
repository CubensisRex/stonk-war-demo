import { Landmark, Repeat2, WalletCards } from "lucide-react";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";
import { StockLogo } from "@/components/StockLogo";
import { formatUsdc } from "@/lib/format";
import { STOCKS } from "@/lib/stocks";
import type { Portfolio, Side, TokenPrices } from "@/types/game";

interface WalletRailProps {
  usdcBalance: number;
  portfolio: Portfolio;
  tokenPrices: TokenPrices;
  playableBalance: number;
  onTogglePlayable: (ticker: Side) => void;
  highlightedTicker: Side | null;
}

export function WalletRail({
  usdcBalance,
  portfolio,
  tokenPrices,
  playableBalance,
  onTogglePlayable,
  highlightedTicker,
}: WalletRailProps) {
  const holdings = STOCKS.flatMap((stock) => {
    const holding = portfolio[stock.ticker];
    return holding && holding.units > 0.0000001 ? [{ stock, holding }] : [];
  });

  return (
    <section className="wallet-rail" aria-labelledby="balance-heading">
      <div className="wallet-rail__top">
        <span className="wallet-rail__icon">
          <WalletCards size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow" id="balance-heading">Available to play</p>
          <AnimatedCurrency
            className="wallet-total"
            value={playableBalance}
            data-testid="playable-balance"
          />
        </div>
      </div>

      <div className="wallet-breakdown">
        <div className="wallet-row">
          <span className="wallet-row__asset"><span className="usdc-mark">$</span> USDC</span>
          <strong>{formatUsdc(usdcBalance)}</strong>
        </div>
        {holdings.map(({ stock, holding }) =>
          holding.playable ? (
            <div className="wallet-row" key={stock.ticker}>
              <span className="wallet-row__asset"><StockLogo side={stock.ticker} size={13} /> {stock.ticker}x</span>
              <span className="wallet-row__value">
                <strong>{formatUsdc(holding.units * tokenPrices[stock.ticker])}</strong>
                <small>Playable</small>
              </span>
            </div>
          ) : null,
        )}
      </div>

      {holdings.map(({ stock, holding }) => {
        const tokenValue = holding.units * tokenPrices[stock.ticker];
        return (
          <div
            className={`holding-card ${holding.playable ? "" : "holding-card--banked"} ${highlightedTicker === stock.ticker ? "holding-card--highlight" : ""}`}
            key={stock.ticker}
          >
            <div className="holding-card__heading">
              <div className="flex items-center gap-2">
                <StockLogo side={stock.ticker} size={18} />
                <div>
                  <strong>{stock.ticker}x</strong>
                  <span>{holding.units.toFixed(4)} tokens</span>
                </div>
              </div>
              <strong>{formatUsdc(tokenValue)}</strong>
            </div>
            <div className="holding-card__status">
              {holding.playable ? (
                <><Repeat2 size={14} /> Playable · can fund bets</>
              ) : (
                <><Landmark size={14} /> Banked portfolio</>
              )}
            </div>
            <button type="button" className="bank-button" onClick={() => onTogglePlayable(stock.ticker)}>
              {holding.playable ? `Bank ${stock.ticker}x` : "Make playable"}
            </button>
          </div>
        );
      })}
    </section>
  );
}
