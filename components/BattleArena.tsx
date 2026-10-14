import type { CSSProperties } from "react";
import { Activity, Radio } from "lucide-react";
import { StockLogo } from "@/components/StockLogo";
import { formatPerformance, formatTimer } from "@/lib/format";
import type { GamePhase, MarketFrame, MarketPricing, PlayerResult, Side, StockDefinition } from "@/types/game";

interface BattleArenaProps {
  leftStock: StockDefinition;
  rightStock: StockDefinition;
  frame: MarketFrame;
  pricing: MarketPricing;
  secondsRemaining: number;
  zeroingSecondsRemaining: number;
  phase: GamePhase;
  leader: Side | "TIED";
  leaderFlipPulse: boolean;
  movementDirection: "left" | "right" | "neutral";
  playerResult: PlayerResult;
}

function StockFighter({
  stock,
  position,
  performance,
  probability,
  leader,
  showStanding,
}: {
  stock: StockDefinition;
  position: "left" | "right";
  performance: number;
  probability: number;
  leader: Side | "TIED";
  showStanding: boolean;
}) {
  const isLeader = leader === stock.ticker;
  const isTrailing = showStanding && leader !== "TIED" && !isLeader;

  return (
    <div className={`fighter fighter--${position} ${isLeader ? "fighter--leading" : ""}`}>
      <div className="flex min-w-0 items-center gap-3">
        <StockLogo side={stock.ticker} size={28} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="fighter__ticker">{stock.ticker}</h2>
            {showStanding && isLeader ? <span className="leader-tag">Leading</span> : null}
            {isTrailing ? <span className="leader-tag leader-tag--trailing">Trailing</span> : null}
          </div>
          <p className="fighter__name">{stock.name}</p>
        </div>
      </div>
      <div className="fighter__numbers">
        <p className="fighter__performance">{formatPerformance(performance)}</p>
        <p className="fighter__meta">
          <span>Market odds</span> {Math.round(probability * 100)}¢
        </p>
      </div>
    </div>
  );
}

export function BattleArena({
  leftStock,
  rightStock,
  frame,
  pricing,
  secondsRemaining,
  zeroingSecondsRemaining,
  phase,
  leader,
  leaderFlipPulse,
  movementDirection,
  playerResult,
}: BattleArenaProps) {
  const gapMagnitude = Math.abs(pricing.gap);
  const meterPosition = Math.max(8, Math.min(92, 50 + Math.tanh(pricing.gap * 4.5) * 43));
  const zeroing = phase === "ZEROING";
  const live = phase === "LIVE";
  const isFinished = !zeroing && !live;
  const displayTime = zeroing ? zeroingSecondsRemaining : secondsRemaining;
  const finalTen = live && secondsRemaining <= 10;
  const criticalCountdown = (live && secondsRemaining <= 5) || (zeroing && zeroingSecondsRemaining <= 3);
  const launching = live && secondsRemaining > 59.35;
  const tensionProgress = finalTen ? Math.min(1, Math.max(0, (10 - secondsRemaining) / 10)) : 0;
  const leaderText =
    leader === "TIED" ? "DEAD EVEN" : `${leader} LEADS +${gapMagnitude.toFixed(2)}%`;
  const resultText = `${leader} WINS · +${gapMagnitude.toFixed(2)}% ADVANTAGE`;

  return (
    <section
      className={`arena-shell ${zeroing ? "arena-shell--zeroing" : ""} ${finalTen ? "arena-shell--final-ten" : ""} ${launching ? "arena-shell--launch" : ""}`}
      aria-label={`${leftStock.ticker} versus ${rightStock.ticker}`}
      data-testid="battle-arena"
    >
      <div className="arena-kicker">
        <span className={`live-dot ${live || zeroing ? "live-dot--active" : ""}`} />
        <span>{zeroing ? "Zeroing · betting" : live ? "Live" : "Round final"}</span>
        {zeroing ? <span className="arena-betting-pill">Betting open</span> : null}
        <span className="arena-kicker__divider" />
        <Radio size={13} aria-hidden="true" />
        <span>Simulated feed</span>
      </div>

      <div className="battle-heading">
        <StockFighter
          stock={leftStock}
          position="left"
          performance={frame.leftPerformance}
          probability={pricing.pLeft}
          leader={leader}
          showStanding={!zeroing}
        />

        <div className={`countdown ${finalTen ? "countdown--danger" : ""} ${criticalCountdown ? "countdown--critical" : ""}`}>
          <span className="countdown__label">{zeroing ? "Betting closes in" : "Round clock"}</span>
          <strong
            key={`${phase}-${Math.ceil(displayTime)}`}
            className="countdown__time"
            data-testid={zeroing ? "zeroing-countdown" : "countdown"}
          >
            {formatTimer(displayTime)}
          </strong>
          <span className="countdown__sub">{zeroing ? "Round starts next" : "60 second battle"}</span>
        </div>

        <StockFighter
          stock={rightStock}
          position="right"
          performance={frame.rightPerformance}
          probability={pricing.pRight}
          leader={leader}
          showStanding={!zeroing}
        />
      </div>

      <div className={`battle-readout ${zeroing ? "battle-readout--zeroing" : ""}`} aria-live="polite">
        <Activity size={16} aria-hidden="true" />
        {zeroing ? (
          <span className="zeroing-readout">
            <strong data-testid="leader-readout">ZEROING MARKET</strong>
            <small>0.00% baseline · opening odds balancing</small>
          </span>
        ) : (
          <strong key={leaderText} className={leaderFlipPulse ? "lead-flip" : ""} data-testid="leader-readout">
            {isFinished ? resultText : leaderText}
          </strong>
        )}
      </div>

      <div className="meter-wrap">
        <div className="meter-labels" aria-hidden="true">
          <span data-ticker={leftStock.ticker}>{leftStock.ticker} ADVANTAGE</span>
          <span>DEAD EVEN</span>
          <span data-ticker={rightStock.ticker}>{rightStock.ticker} ADVANTAGE</span>
        </div>
        <div
          className={`battle-meter battle-meter--${movementDirection} ${zeroing ? "battle-meter--zeroing" : ""} ${finalTen ? "battle-meter--final-ten" : ""} ${launching ? "battle-meter--launch" : ""}`}
          role="img"
          aria-label={`Relative advantage: ${leaderText}`}
        >
          <div className={`battle-meter__half battle-meter__half--nvda ${leaderFlipPulse && leader === leftStock.ticker ? "battle-meter__half--pulse" : ""}`} />
          <div className={`battle-meter__half battle-meter__half--tsla ${leaderFlipPulse && leader === rightStock.ticker ? "battle-meter__half--pulse" : ""}`} />
          <div className="battle-meter__centre" />
          <div
            className={`battle-marker battle-marker--${leader.toLowerCase()} ${zeroing ? "battle-marker--zeroing" : ""} ${isFinished ? `battle-marker--final battle-marker--result-${playerResult}` : ""} ${leaderFlipPulse ? "battle-marker--flip" : ""}`}
            style={{
              "--marker-position": `${meterPosition}%`,
              "--marker-shake": `${0.4 + tensionProgress * 2.6}px`,
              "--marker-twist": `${0.8 + tensionProgress * 3.2}deg`,
              "--marker-shake-duration": `${Math.round(220 - tensionProgress * 140)}ms`,
            } as CSSProperties}
          >
            <span className="battle-marker__core" />
          </div>
        </div>
        <div className="meter-foot">
          <span>Normalised at open</span>
          <span>Relative performance decides the winner</span>
        </div>
      </div>
    </section>
  );
}
