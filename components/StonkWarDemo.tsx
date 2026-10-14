"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";
import { BattleArena } from "@/components/BattleArena";
import { BetPanel } from "@/components/BetPanel";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import { SettlementPanel } from "@/components/SettlementPanel";
import { WalletRail } from "@/components/WalletRail";
import { audioManager } from "@/lib/audioManager";
import { addToPosition, getPlayerResult } from "@/lib/betting";
import { getMarketFrame, getZeroMarketFrame } from "@/lib/market-feed";
import { calculateMarketPricing, calculateZeroingPricing } from "@/lib/pricing";
import { createRandomRound } from "@/lib/round-selection";
import { getStock, STOCKS } from "@/lib/stocks";
import { formatUsdc } from "@/lib/format";
import type {
  Bet,
  GamePhase,
  Portfolio,
  RoundConfig,
  SettledBet,
  Side,
  TokenPrices,
} from "@/types/game";

const ZEROING_LENGTH_MS = 30_000;
const ROUND_LENGTH_MS = 60_000;
const DEFAULT_ROUND: RoundConfig = {
  leftTicker: "NVDA",
  rightTicker: "TSLA",
  profileId: 1,
  mirrored: false,
};

export function StonkWarDemo() {
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [round, setRound] = useState<RoundConfig>(DEFAULT_ROUND);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundReady, setRoundReady] = useState(true);
  const [phase, setPhase] = useState<GamePhase>("ZEROING");
  const [zeroingSecondsRemaining, setZeroingSecondsRemaining] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [selectedSide, setSelectedSide] = useState<Side>(DEFAULT_ROUND.rightTicker);
  const [wager, setWager] = useState("25.00");
  const [bets, setBets] = useState<Bet[]>([]);
  const [settlements, setSettlements] = useState<SettledBet[]>([]);
  const [usdcBalance, setUsdcBalance] = useState(1000);
  const [portfolio, setPortfolio] = useState<Portfolio>({});
  const [payoutChoice, setPayoutChoice] = useState<"USDC" | "STOCK">("STOCK");
  const [pendingPayout, setPendingPayout] = useState(0);
  const [formError, setFormError] = useState("");
  const [leaderFlipPulse, setLeaderFlipPulse] = useState(false);
  const [assetClock, setAssetClock] = useState(0);
  const [lastPlacedBet, setLastPlacedBet] = useState<Bet | null>(null);
  const [highlightedHolding, setHighlightedHolding] = useState<Side | null>(null);
  const [roundTransition, setRoundTransition] = useState<"idle" | "out" | "in">("idle");
  const initialisedRef = useRef(false);
  const zeroingStartTimeRef = useRef<number | null>(null);
  const liveStartTimeRef = useRef<number | null>(null);
  const previousLeaderRef = useRef<Side | "TIED">("TIED");
  const previousPhaseRef = useRef<GamePhase>("ZEROING");
  const lastCountdownSoundRef = useRef(-1);
  const betsRef = useRef<Bet[]>([]);
  const settlementTimeoutsRef = useRef<number[]>([]);
  const replayTimeoutsRef = useRef<number[]>([]);
  const betFeedbackTimeoutRef = useRef<number | null>(null);
  const holdingHighlightTimeoutRef = useRef<number | null>(null);

  const leftStock = getStock(round.leftTicker);
  const rightStock = getStock(round.rightTicker);
  const tokenPrices = useMemo(
    () => Object.fromEntries(
      STOCKS.map((stock, index) => [
        stock.ticker,
        stock.referencePrice * (
          1 +
          Math.sin(assetClock / 4.3 + index * 0.77) * 0.0024 +
          Math.sin(assetClock / 8.7 + index * 0.31) * 0.0013
        ),
      ]),
    ) as TokenPrices,
    [assetClock],
  );
  const playableStockValue = STOCKS.reduce((total, stock) => {
    const holding = portfolio[stock.ticker];
    return total + (holding?.playable ? holding.units * tokenPrices[stock.ticker] : 0);
  }, 0);
  const playableBalance = usdcBalance + playableStockValue;
  const frame = useMemo(
    () => phase === "ZEROING" ? getZeroMarketFrame(round) : getMarketFrame(round, secondsRemaining),
    [phase, round, secondsRemaining],
  );
  const openingRightProbability = useMemo(
    () => calculateZeroingPricing(round, 0).pRight,
    [round],
  );
  const pricing = useMemo(
    () => phase === "ZEROING"
      ? calculateZeroingPricing(round, zeroingSecondsRemaining)
      : calculateMarketPricing(
          frame.leftPerformance,
          frame.rightPerformance,
          secondsRemaining,
          openingRightProbability,
        ),
    [frame, openingRightProbability, phase, round, secondsRemaining, zeroingSecondsRemaining],
  );
  const movementDirection = useMemo(() => {
    if (phase !== "LIVE") return "neutral" as const;
    const previousFrame = getMarketFrame(round, Math.min(60, secondsRemaining + 0.45));
    const previousGap = previousFrame.rightPerformance - previousFrame.leftPerformance;
    const movement = pricing.gap - previousGap;
    if (Math.abs(movement) < 0.0006) return "neutral" as const;
    return movement > 0 ? "right" as const : "left" as const;
  }, [phase, pricing.gap, round, secondsRemaining]);
  const meterAudioPosition = useMemo(
    () => Math.tanh(pricing.gap * 4.5),
    [pricing.gap],
  );
  const leader: Side | "TIED" =
    Math.abs(pricing.gap) < 0.004
      ? "TIED"
      : pricing.gap > 0
        ? round.rightTicker
        : round.leftTicker;
  const finalFrame = useMemo(() => getMarketFrame(round, 0), [round]);
  const winnerTicker = finalFrame.leftPerformance > finalFrame.rightPerformance
    ? round.leftTicker
    : round.rightTicker;
  const winner = getStock(winnerTicker);
  const playerResult = getPlayerResult(bets[0], winnerTicker);
  const finalAdvantage = Math.abs(finalFrame.leftPerformance - finalFrame.rightPerformance);
  const hasHoldings = STOCKS.some((stock) => (portfolio[stock.ticker]?.units ?? 0) > 0.0000001);
  const bettingOpen = roundReady && phase === "ZEROING" && !showHowToPlay;

  const clearSettlementTimers = useCallback(() => {
    settlementTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    settlementTimeoutsRef.current = [];
  }, []);

  const clearInterfaceTimers = useCallback(() => {
    replayTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    replayTimeoutsRef.current = [];
    if (betFeedbackTimeoutRef.current !== null) window.clearTimeout(betFeedbackTimeoutRef.current);
    if (holdingHighlightTimeoutRef.current !== null) window.clearTimeout(holdingHighlightTimeoutRef.current);
  }, []);

  const highlightHolding = (ticker: Side) => {
    setHighlightedHolding(ticker);
    if (holdingHighlightTimeoutRef.current !== null) window.clearTimeout(holdingHighlightTimeoutRef.current);
    holdingHighlightTimeoutRef.current = window.setTimeout(() => setHighlightedHolding(null), 900);
  };

  const settleRound = useCallback(() => {
    const settled = betsRef.current.map<SettledBet>((bet) => {
      const won = bet.side === winnerTicker;
      const payout = won ? bet.wager * bet.multiplier : 0;
      return {
        ...bet,
        won,
        payout,
        profit: payout - bet.wager,
      };
    });
    const totalPayout = settled.reduce((total, bet) => total + bet.payout, 0);
    setSettlements(settled);
    setPendingPayout(totalPayout);
    setPhase("SETTLING");

    const resultTimeout = window.setTimeout(() => {
      setPhase("RESULT");
      if (totalPayout > 0) {
        const payoutTimeout = window.setTimeout(() => setPhase("PAYOUT_SELECTION"), 650);
        settlementTimeoutsRef.current.push(payoutTimeout);
      }
    }, 700);
    settlementTimeoutsRef.current.push(resultTimeout);
  }, [winnerTicker]);

  useEffect(() => {
    const enabled = audioManager.getEnabledPreference();
    audioManager.setEnabled(enabled, false);
    setSoundEnabled(enabled);
    const unbindFirstInteraction = audioManager.bindFirstInteraction();

    return () => {
      unbindFirstInteraction();
      audioManager.stopAll();
    };
  }, []);

  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    const initialRound = createRandomRound();
    setRound(initialRound);
    setSelectedSide(initialRound.rightTicker);
    zeroingStartTimeRef.current = null;
    setRoundReady(true);
  }, []);

  useEffect(() => {
    if (phase !== "ZEROING" || !roundReady || showHowToPlay) return;
    let animationFrame = 0;
    let lastPaint = 0;

    const tick = (now: number) => {
      if (zeroingStartTimeRef.current === null) zeroingStartTimeRef.current = now;
      const elapsed = now - zeroingStartTimeRef.current;
      if (now - lastPaint >= 40) {
        setZeroingSecondsRemaining(Math.max(0, (ZEROING_LENGTH_MS - elapsed) / 1000));
        lastPaint = now;
      }
      if (elapsed >= ZEROING_LENGTH_MS) {
        setZeroingSecondsRemaining(0);
        setSecondsRemaining(60);
        liveStartTimeRef.current = now;
        setPhase("LIVE");
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [phase, roundReady, showHowToPlay]);

  useEffect(() => {
    if (phase !== "LIVE") return;
    let animationFrame = 0;
    let lastPaint = 0;

    const tick = (now: number) => {
      if (liveStartTimeRef.current === null) liveStartTimeRef.current = now;
      const elapsed = now - liveStartTimeRef.current;
      if (now - lastPaint >= 40) {
        setSecondsRemaining(Math.max(0, (ROUND_LENGTH_MS - elapsed) / 1000));
        lastPaint = now;
      }
      if (elapsed >= ROUND_LENGTH_MS) {
        setSecondsRemaining(0);
        settleRound();
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [phase, settleRound]);

  useEffect(() => {
    if (soundEnabled) {
      void audioManager.startLoop("stonk-war-ambient-loop");
      return () => audioManager.stopLoop("stonk-war-ambient-loop", 320);
    }
    audioManager.stopLoop("stonk-war-ambient-loop", 80);
  }, [soundEnabled]);

  useEffect(() => {
    if (phase === "ZEROING" && roundReady && !showHowToPlay && soundEnabled) {
      void audioManager.startLoop("zeroing-loop");
      return () => audioManager.stopLoop("zeroing-loop");
    }
    audioManager.stopLoop("zeroing-loop", 80);
  }, [phase, roundReady, showHowToPlay, soundEnabled]);

  useEffect(() => {
    if (phase !== "LIVE" || !soundEnabled) {
      audioManager.stopMeterSignal();
      return;
    }
    audioManager.setMeterSignal(meterAudioPosition);
  }, [meterAudioPosition, phase, soundEnabled]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    if (previousPhase === phase) return;

    if (soundEnabled && previousPhase === "ZEROING" && phase === "LIVE") {
      void audioManager.play("round-start");
    }
    if (soundEnabled && previousPhase === "LIVE" && phase === "SETTLING") {
      void audioManager.play("round-freeze");
    }
    if (soundEnabled && previousPhase === "SETTLING" && phase === "RESULT") {
      if (playerResult === "win") void audioManager.play("win");
      if (playerResult === "loss") void audioManager.play("loss");
    }

    previousPhaseRef.current = phase;
  }, [phase, playerResult, soundEnabled]);

  useEffect(() => {
    if (phase !== "LIVE") {
      lastCountdownSoundRef.current = -1;
      return;
    }

    const wholeSecond = Math.ceil(secondsRemaining);
    if (wholeSecond === lastCountdownSoundRef.current) return;
    lastCountdownSoundRef.current = wholeSecond;
    if (!soundEnabled) return;

    if (wholeSecond === 5 || wholeSecond === 4) {
      void audioManager.play("final-seconds");
    } else if (wholeSecond >= 1 && wholeSecond <= 3) {
      void audioManager.play("countdown-tick");
    }
  }, [phase, secondsRemaining, soundEnabled]);

  useEffect(() => {
    if (leader === "TIED") return;
    if (previousLeaderRef.current !== leader && previousLeaderRef.current !== "TIED") {
      setLeaderFlipPulse(true);
      if (phase === "LIVE" && soundEnabled) {
        void audioManager.play("lead-change");
      }
      const timeout = window.setTimeout(() => setLeaderFlipPulse(false), 620);
      previousLeaderRef.current = leader;
      return () => window.clearTimeout(timeout);
    }
    previousLeaderRef.current = leader;
  }, [leader, phase, soundEnabled]);

  useEffect(() => {
    if (!hasHoldings) return;
    const interval = window.setInterval(() => setAssetClock((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [hasHoldings]);

  useEffect(() => () => {
    clearSettlementTimers();
    clearInterfaceTimers();
  }, [clearInterfaceTimers, clearSettlementTimers]);

  const placeBet = () => {
    const amount = Number(wager);
    const existingPosition = betsRef.current[0];
    if (!Number.isFinite(amount) || amount < 1) {
      setFormError("Enter a wager of at least $1.00.");
      return;
    }
    if (amount > playableBalance + 0.005) {
      setFormError(`Your maximum playable wager is ${formatUsdc(playableBalance)}.`);
      return;
    }
    if (existingPosition && existingPosition.side !== selectedSide) {
      setFormError(`This round's position is locked to ${existingPosition.side}.`);
      return;
    }

    const stockNeeded = Math.max(0, amount - usdcBalance);
    setUsdcBalance((balance) => Math.max(0, balance - amount));
    if (stockNeeded > 0) {
      setPortfolio((current) => {
        const next = { ...current };
        let remaining = stockNeeded;
        for (const stock of STOCKS) {
          const holding = next[stock.ticker];
          if (!holding?.playable || holding.units <= 0 || remaining <= 0) continue;
          const price = tokenPrices[stock.ticker];
          const availableValue = holding.units * price;
          const valueToUse = Math.min(remaining, availableValue);
          next[stock.ticker] = {
            ...holding,
            units: Math.max(0, holding.units - valueToUse / price),
          };
          remaining -= valueToUse;
        }
        return next;
      });
    }

    const probability = selectedSide === round.leftTicker ? pricing.pLeft : pricing.pRight;
    const nextPosition = addToPosition({
      existingPosition,
      side: selectedSide,
      amount,
      entryPrice: probability,
      secondsRemaining: phase === "ZEROING" ? 60 : secondsRemaining,
      id: `${Date.now()}-position`,
    });
    betsRef.current = [nextPosition];
    setBets([nextPosition]);
    setSelectedSide(nextPosition.side);
    setLastPlacedBet(nextPosition);
    if (betFeedbackTimeoutRef.current !== null) window.clearTimeout(betFeedbackTimeoutRef.current);
    betFeedbackTimeoutRef.current = window.setTimeout(() => {
      setLastPlacedBet((current) => current?.id === nextPosition.id ? null : current);
    }, 1000);
    setFormError("");
    if (soundEnabled) void audioManager.play("bet-placed");
  };

  const claimPayout = () => {
    if (pendingPayout <= 0) return;
    if (payoutChoice === "USDC") {
      setUsdcBalance((balance) => balance + pendingPayout);
    } else {
      setPortfolio((current) => {
        const existing = current[winnerTicker];
        return {
          ...current,
          [winnerTicker]: {
            units: (existing?.units ?? 0) + pendingPayout / winner.referencePrice,
            playable: true,
          },
        };
      });
      highlightHolding(winnerTicker);
      if (soundEnabled) void audioManager.play("stock-received");
    }
    setPhase("COMPLETE");
  };

  const choosePayout = (choice: "USDC" | "STOCK") => {
    if (choice === "STOCK" && payoutChoice !== "STOCK" && soundEnabled) {
      void audioManager.play("stock-received");
    }
    setPayoutChoice(choice);
  };

  const prepareRound = (nextRound: RoundConfig) => {
    clearSettlementTimers();
    setRound(nextRound);
    setSecondsRemaining(60);
    setZeroingSecondsRemaining(30);
    setBets([]);
    betsRef.current = [];
    setSettlements([]);
    setPendingPayout(0);
    setPayoutChoice("STOCK");
    setSelectedSide(nextRound.rightTicker);
    setWager("25.00");
    setFormError("");
    setLastPlacedBet(null);
    setHighlightedHolding(null);
    setLeaderFlipPulse(false);
    previousLeaderRef.current = "TIED";
    liveStartTimeRef.current = null;
    zeroingStartTimeRef.current = performance.now();
    setRoundReady(true);
    setPhase("ZEROING");
  };

  const startNewRound = () => {
    if (roundTransition !== "idle") return;
    const nextRound = createRandomRound(round);
    setRoundReady(false);
    setRoundTransition("out");

    const swapTimeout = window.setTimeout(() => {
      prepareRound(nextRound);
      setRoundNumber((value) => value + 1);
      setRoundTransition("in");
    }, 320);
    const finishTimeout = window.setTimeout(() => setRoundTransition("idle"), 780);
    replayTimeoutsRef.current.push(swapTimeout, finishTimeout);
  };

  const resetDemo = () => {
    clearInterfaceTimers();
    setUsdcBalance(1000);
    setPortfolio({});
    setAssetClock(0);
    setRoundNumber(1);
    setRoundTransition("idle");
    prepareRound(createRandomRound(round));
  };

  const togglePlayable = (ticker: Side) => {
    setPortfolio((current) => {
      const holding = current[ticker];
      if (!holding) return current;
      return {
        ...current,
        [ticker]: { ...holding, playable: !holding.playable },
      };
    });
    highlightHolding(ticker);
    if (soundEnabled) void audioManager.play("bank");
  };

  const startFirstRound = () => {
    void audioManager.unlock();
    zeroingStartTimeRef.current = performance.now();
    setShowHowToPlay(false);
  };

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      audioManager.setEnabled(next);
      if (next) void audioManager.unlock();
      return next;
    });
  };

  return (
    <>
    <main
      className={`app-shell ${roundTransition !== "idle" ? `round-transition--${roundTransition}` : ""}`}
      inert={showHowToPlay}
      aria-hidden={showHowToPlay}
    >
      <header className="topbar">
        <div className="brand-lockup" aria-label="Stonk War">
          <span className="brand-mark"><span />W</span>
          <div>
            <strong>STONK<span>WAR</span></strong>
            <small>60-second market battles</small>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="demo-pill"><ShieldCheck size={14} /> Demo funds only</div>
          <button
            type="button"
            className={`sound-toggle ${soundEnabled ? "" : "sound-toggle--muted"}`}
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Mute sound" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          </button>
          <div className="mini-balance">
            <span>Available to play</span>
            <AnimatedCurrency value={playableBalance} />
          </div>
          <button type="button" className="reset-button" onClick={resetDemo} aria-label="Reset demo">
            <RotateCcw size={15} /> <span>Reset demo</span>
          </button>
        </div>
      </header>

      <div className="round-meta">
        <span>ROUND {roundNumber.toString().padStart(2, "0")}</span>
        <span className="round-meta__line" />
        <span>NASDAQ SHOWDOWN</span>
        <span className="round-meta__line" />
        <span>WINNER TAKES THE POSITION</span>
      </div>

      <BattleArena
        leftStock={leftStock}
        rightStock={rightStock}
        frame={frame}
        pricing={pricing}
        secondsRemaining={secondsRemaining}
        zeroingSecondsRemaining={zeroingSecondsRemaining}
        phase={phase}
        leader={leader}
        leaderFlipPulse={leaderFlipPulse}
        movementDirection={movementDirection}
        playerResult={playerResult}
      />

      <div className="lower-grid">
        <div className="primary-rail">
          {phase === "ZEROING" || phase === "LIVE" ? (
            <BetPanel
              leftStock={leftStock}
              rightStock={rightStock}
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
              wager={wager}
              onWagerChange={setWager}
              playableBalance={playableBalance}
              pricing={pricing}
              bets={bets}
              error={formError}
              onPlaceBet={placeBet}
              disabled={!bettingOpen}
              zeroing={phase === "ZEROING"}
              lastPlacedBet={lastPlacedBet}
            />
          ) : (
            <SettlementPanel
              phase={phase}
              winner={winner}
              finalAdvantage={finalAdvantage}
              settlements={settlements}
              payoutChoice={payoutChoice}
              onPayoutChoice={choosePayout}
              pendingPayout={pendingPayout}
              onClaimPayout={claimPayout}
              onReplay={startNewRound}
            />
          )}
        </div>
        <aside className="side-rail">
          <WalletRail
            usdcBalance={usdcBalance}
            portfolio={portfolio}
            tokenPrices={tokenPrices}
            playableBalance={playableBalance}
            onTogglePlayable={togglePlayable}
            highlightedTicker={highlightedHolding}
          />
          <div className="rules-note">
            <span>How this round resolves</span>
            <p>Both stocks started at 0.00%. The better relative performance at 00:00 wins.</p>
          </div>
        </aside>
      </div>

      <footer className="footer-note">
        <span>Simulated market · no real money</span>
        <span>Prices react to performance + time remaining</span>
      </footer>
    </main>
    {showHowToPlay ? <HowToPlayModal onStart={startFirstRound} /> : null}
    </>
  );
}
