import type { CSSProperties } from "react";
import { ArrowRight, CircleCheck, LockKeyhole, Plus } from "lucide-react";
import { StockLogo } from "@/components/StockLogo";
import { formatUsdc } from "@/lib/format";
import { getStock } from "@/lib/stocks";
import type { Bet, MarketPricing, Side, StockDefinition } from "@/types/game";

interface BetPanelProps {
  leftStock: StockDefinition;
  rightStock: StockDefinition;
  selectedSide: Side;
  onSelectSide: (side: Side) => void;
  wager: string;
  onWagerChange: (value: string) => void;
  playableBalance: number;
  pricing: MarketPricing;
  bets: Bet[];
  error: string;
  onPlaceBet: () => void;
  disabled: boolean;
  zeroing: boolean;
  lastPlacedBet: Bet | null;
}

export function BetPanel({
  leftStock,
  rightStock,
  selectedSide,
  onSelectSide,
  wager,
  onWagerChange,
  playableBalance,
  pricing,
  bets,
  error,
  onPlaceBet,
  disabled,
  zeroing,
  lastPlacedBet,
}: BetPanelProps) {
  const probability = selectedSide === leftStock.ticker ? pricing.pLeft : pricing.pRight;
  const multiplier = 1 / probability;
  const numericWager = Number(wager) || 0;
  const estimatedPayout = numericWager * multiplier;
  const totalPotentialPayout = bets.reduce((total, bet) => total + bet.wager * bet.multiplier, 0);
  const activePosition = bets[0] ?? null;
  const quoteLocked = disabled && activePosition !== null;
  const displayedProbability = quoteLocked ? activePosition.entryPrice : probability;
  const displayedMultiplier = quoteLocked ? activePosition.multiplier : multiplier;
  const displayedPayout = quoteLocked
    ? activePosition.wager * activePosition.multiplier
    : estimatedPayout;

  const setQuickWager = (amount: number) => {
    onWagerChange(Math.min(amount, playableBalance).toFixed(2));
  };

  return (
    <section className={`bet-panel ${zeroing ? "bet-panel--zeroing" : ""}`} aria-labelledby="bet-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Place your position</p>
          <h2 id="bet-heading">Pick the winner</h2>
        </div>
        <span className={`open-badge ${disabled ? "open-badge--closed" : ""}`}>
          <span /> {disabled ? "Betting closed" : "Betting open"}
        </span>
      </div>

      <div className="side-selector" role="group" aria-label="Choose a stock">
        {[leftStock, rightStock].map((stock) => {
          const confirmedForStock = lastPlacedBet?.side === stock.ticker;
          const isPositionSide = activePosition?.side === stock.ticker;
          const lockedToOtherSide = Boolean(activePosition && !isPositionSide);
          return (
            <button
              key={stock.ticker}
              type="button"
              className={`side-option ${selectedSide === stock.ticker ? "side-option--active" : ""} ${confirmedForStock ? "side-option--confirmed" : ""} ${lockedToOtherSide ? "side-option--locked" : ""}`}
              onClick={() => onSelectSide(stock.ticker)}
              disabled={disabled || lockedToOtherSide}
              aria-pressed={selectedSide === stock.ticker}
            >
              <StockLogo side={stock.ticker} size={18} />
              <span>
                <span className="side-option__action">
                  {lockedToOtherSide ? "Locked" : confirmedForStock ? "Updated" : isPositionSide ? "Your pick" : "Back"}
                </span>
                <strong>{stock.ticker}</strong>
              </span>
            </button>
          );
        })}
      </div>

      <div className="quote-strip">
        <div>
          <span>{quoteLocked ? "Locked odds" : "Market odds"}</span>
          <strong key={`price-${displayedProbability.toFixed(2)}`} className="live-value">{displayedProbability.toFixed(2)}</strong>
        </div>
        <div>
          <span>{quoteLocked ? "Locked return" : "Potential return"}</span>
          <strong key={`return-${displayedMultiplier.toFixed(2)}`} className="live-value">{displayedMultiplier.toFixed(2)}×</strong>
        </div>
        <div>
          <span>{quoteLocked ? "Locked payout" : "Estimated payout"}</span>
          <strong key={`payout-${displayedPayout.toFixed(2)}`} className="live-value">{formatUsdc(displayedPayout)}</strong>
        </div>
      </div>

      <label className="wager-label" htmlFor="wager">
        <span>Wager</span>
        <span>{formatUsdc(playableBalance)} available</span>
      </label>
      <div className="wager-input-wrap">
        <span>$</span>
        <input
          id="wager"
          name="wager"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.01"
          value={wager}
          onChange={(event) => onWagerChange(event.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "wager-error" : undefined}
        />
        <span>USDC</span>
      </div>

      <div className="quick-bets" aria-label="Quick wager amounts">
        {[10, 25, 50, 100].map((amount) => (
          <button key={amount} type="button" onClick={() => setQuickWager(amount)} disabled={disabled}>
            ${amount}
          </button>
        ))}
        <button type="button" onClick={() => setQuickWager(playableBalance)} disabled={disabled}>
          Max
        </button>
      </div>

      {error ? (
        <p className="form-error" id="wager-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className={`place-bet-button ${lastPlacedBet ? "place-bet-button--confirmed" : ""}`}
        onClick={onPlaceBet}
        disabled={disabled || numericWager <= 0}
        data-testid="place-bet"
      >
        {disabled ? <LockKeyhole size={17} /> : lastPlacedBet ? <CircleCheck size={17} /> : <Plus size={17} />}
        {disabled
          ? "Betting closed"
          : lastPlacedBet
            ? "Position updated"
            : activePosition
              ? `Add to ${selectedSide}`
              : `Back ${selectedSide}`}
        {disabled || lastPlacedBet ? null : <ArrowRight size={17} />}
      </button>

      {lastPlacedBet ? (
        <div className="bet-confirmation" role="status">
          <CircleCheck size={13} aria-hidden="true" />
          <span>Position now {formatUsdc(lastPlacedBet.wager)} on {lastPlacedBet.side}</span>
        </div>
      ) : null}

      {bets.length > 0 ? (
        <div className="active-bets" aria-live="polite">
          <div className="active-bets__title">
            <span>Your position</span>
            <span aria-label="One position">1</span>
          </div>
          <div className="active-bets__summary">
            <span>{quoteLocked ? "Locked payout" : "Current potential payout"}</span>
            <strong>{formatUsdc(totalPotentialPayout)}</strong>
          </div>
          <div className="active-bets__list">
            {activePosition ? (
              <div className="active-bet" key={activePosition.id}>
                <span
                  className="active-bet__side"
                  style={{ "--stock-color": getStock(activePosition.side).color } as CSSProperties}
                >
                  {activePosition.side}
                </span>
                <span>{formatUsdc(activePosition.wager)} wager</span>
                <span>@ {activePosition.entryPrice.toFixed(2)}</span>
                <strong>{formatUsdc(activePosition.wager * activePosition.multiplier)}</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
