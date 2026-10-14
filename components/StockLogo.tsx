import { siAmd, siCoinbase, siMeta, siNvidia, siPalantir, siTesla } from "simple-icons";
import type { Side } from "@/types/game";

const STOCK_ICONS = {
  NVDA: siNvidia,
  TSLA: siTesla,
  AMD: siAmd,
  META: siMeta,
  COIN: siCoinbase,
  PLTR: siPalantir,
} as const;

export function StockLogo({ side, size = 30 }: { side: Side; size?: number }) {
  const icon = STOCK_ICONS[side];

  return (
    <span
      className={`stock-logo stock-logo--${side.toLowerCase()}`}
      style={{ width: size + 22, height: size + 22 }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" role="img">
        <path d={icon.path} fill="currentColor" />
      </svg>
    </span>
  );
}
