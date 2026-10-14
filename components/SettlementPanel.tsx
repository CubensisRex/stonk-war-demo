import type { CSSProperties } from "react";
import { ArrowRight, CircleCheck, Landmark, RotateCcw, Trophy } from "lucide-react";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";
import { StockLogo } from "@/components/StockLogo";
import { formatUsdc } from "@/lib/format";
import { getStock } from "@/lib/stocks";
import type { GamePhase, SettledBet, StockDefinition } from "@/types/game";

interface SettlementPanelProps {
  phase: GamePhase;
  winner: StockDefinition;
  finalAdvantage: number;
  settlements: SettledBet[];
  payoutChoice: "USDC" | "STOCK";
  onPayoutChoice: (choice: "USDC" | "STOCK") => void;
  pendingPayout: number;
  onClaimPayout: () => void;
  onReplay: () => void;
}

export function SettlementPanel({
  phase,
  winner,
  finalAdvantage,
  settlements,
  payoutChoice,
  onPayoutChoice,
  pendingPayout,
  onClaimPayout,
  onReplay,
}: SettlementPanelProps) {
  const settling = phase === "SETTLING";
  const complete = phase === "COMPLETE";
  const choosingPayout = phase === "PAYOUT_SELECTION";
  const hasBets = settlements.length > 0;
  const hasWinningBet = settlements.some((bet) => bet.won);
  const winningProfit = settlements.reduce((total, bet) => total + (bet.won ? bet.profit : 0), 0);
  const stockShareCount = pendingPayout / winner.referencePrice;
  const formattedStockShares = stockShareCount.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

  if (settling) {
    return (
      <section className="settlement-panel settlement-panel--loading" aria-live="assertive">
        <span className="settling-spinner" />
        <p className="eyebrow">Round final</p>
        <h2>Locking the result…</h2>
        <p>Final performance and pricing are frozen.</p>
      </section>
    );
  }

  if (complete) {
    return (
      <section className="settlement-panel payout-complete" aria-live="polite">
        <span className="success-seal"><CircleCheck size={24} /></span>
        <p className="eyebrow">Payout complete</p>
        <h2>{payoutChoice === "STOCK" ? `${winner.ticker}x is now yours` : "USDC received"}</h2>
        <p>
          {payoutChoice === "STOCK"
            ? `${formattedStockShares} simulated ${winner.ticker}x shares are now playable and their value can move.`
            : `${formatUsdc(pendingPayout)} has been added to your playable USDC balance.`}
        </p>
        <button type="button" className="replay-button replay-button--attention" onClick={onReplay} data-testid="play-another-round">
          <RotateCcw size={17} /> Play another round
        </button>
      </section>
    );
  }

  return (
    <section
      className={`settlement-panel ${hasWinningBet ? "settlement-panel--win" : hasBets ? "settlement-panel--loss" : ""}`}
      aria-labelledby="result-heading"
      data-testid="settlement-panel"
    >
      <div className="winner-lockup">
        <span className="trophy-wrap"><Trophy size={20} /></span>
        <div>
          <p className="eyebrow">{hasWinningBet ? "You won" : hasBets ? "Round lost" : "Final result"}</p>
          <h2 id="result-heading">{winner.ticker} wins</h2>
          <p>+{finalAdvantage.toFixed(2)}% performance advantage</p>
        </div>
        <StockLogo side={winner.ticker} size={30} />
      </div>

      {hasWinningBet ? (
        <div className="win-summary" aria-live="polite">
          <span>Profit on winning position</span>
          <AnimatedCurrency value={winningProfit} prefix="+" fromZero duration={680} />
          <small><AnimatedCurrency value={pendingPayout} fromZero duration={680} /> total payout</small>
        </div>
      ) : null}

      {settlements.length > 0 ? (
        <div className="settlement-list">
          {settlements.map((bet) => {
            const stock = getStock(bet.side);
            return (
              <div className={`settlement-bet ${bet.won ? "settlement-bet--won" : "settlement-bet--lost"}`} key={bet.id}>
                <div>
                  <span
                    className="active-bet__side"
                    style={{ "--stock-color": stock.color } as CSSProperties}
                  >
                    {bet.side}
                  </span>
                  <span className={bet.won ? "result-win" : "result-loss"}>{bet.won ? "Won" : "Lost"}</span>
                </div>
                <dl>
                  <div><dt>Wager</dt><dd>{formatUsdc(bet.wager)}</dd></div>
                  <div><dt>Profit</dt><dd>{bet.profit > 0 ? "+" : ""}{formatUsdc(bet.profit)}</dd></div>
                  <div><dt>Total payout</dt><dd>{formatUsdc(bet.payout)}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-bet-result">
          <p>You watched the battle from the sidelines.</p>
          <button type="button" className="replay-button" onClick={onReplay}>
            <RotateCcw size={17} /> Play another round
          </button>
        </div>
      )}

      {phase === "RESULT" && settlements.length > 0 && pendingPayout === 0 ? (
        <button type="button" className="replay-button replay-button--attention" onClick={onReplay}>
          <RotateCcw size={17} /> Play another round
        </button>
      ) : null}

      {choosingPayout && pendingPayout > 0 ? (
        <div className="payout-choice-wrap">
          <div className="payout-copy">
            <p className="eyebrow">Choose your payout</p>
            <h3>Win the war. Own the winner.</h3>
          </div>
          <div className="payout-options" role="radiogroup" aria-label="Choose payout type">
            <button
              type="button"
              role="radio"
              aria-checked={payoutChoice === "USDC"}
              className={`payout-option ${payoutChoice === "USDC" ? "payout-option--selected" : ""}`}
              onClick={() => onPayoutChoice("USDC")}
            >
              <span className="payout-option__icon"><span className="usdc-mark">$</span></span>
              <span><strong>USDC</strong><small>Full payout in playable balance</small></span>
              <span className="radio-dot" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={payoutChoice === "STOCK"}
              className={`payout-option payout-option--stock ${payoutChoice === "STOCK" ? "payout-option--selected" : ""}`}
              onClick={() => onPayoutChoice("STOCK")}
            >
              <span className="payout-option__icon"><StockLogo side={winner.ticker} size={17} /></span>
              <span><strong>Winning stock</strong><small>{formattedStockShares} {winner.ticker}x shares</small></span>
              <span className="radio-dot" />
            </button>
          </div>
          <button type="button" className="claim-button" onClick={onClaimPayout} data-testid="claim-payout">
            {payoutChoice === "STOCK" ? <StockLogo side={winner.ticker} size={16} /> : <Landmark size={17} />}
            Receive {payoutChoice === "STOCK" ? `${winner.ticker}x` : "USDC"}
            <span className="claim-button__value">
              {payoutChoice === "STOCK" ? <small>{formattedStockShares} shares</small> : null}
              <AnimatedCurrency value={pendingPayout} fromZero duration={680} />
            </span>
            <ArrowRight size={17} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
