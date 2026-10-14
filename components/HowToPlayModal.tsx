import { ArrowRight, ShieldCheck } from "lucide-react";

interface HowToPlayModalProps {
  onStart: () => void;
}

const RULES = [
  "Two stocks start together at 0.00%. Bet on which one will perform better over the next 60 seconds.",
  "Place your bet during the ZEROING countdown. When the battle starts, betting closes and your odds are locked.",
  "Both stocks can go up or down. Only the gap between them matters. The stock with the better % performance at 00:00 wins.",
  "Win and choose USDC, or take the winning stock and start building your portfolio.",
] as const;

export function HowToPlayModal({ onStart }: HowToPlayModalProps) {
  return (
    <div
      className="how-to-overlay"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") onStart();
      }}
    >
      <section
        className="how-to-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-title"
        aria-describedby="how-to-summary"
      >
        <div className="how-to-modal__status">
          <span>Quick briefing</span>
          <span><ShieldCheck size={13} aria-hidden="true" /> Demo money only</span>
        </div>

        <h2 id="how-to-title">How to play</h2>
        <p id="how-to-summary"><strong>Pick a side. Lock your bet. Watch the battle.</strong></p>

        <ul className="how-to-rules">
          {RULES.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>

        <button type="button" className="how-to-button" onClick={onStart} autoFocus>
          Start round <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
