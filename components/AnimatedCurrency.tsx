"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsdc } from "@/lib/format";

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  duration?: number;
  fromZero?: boolean;
  prefix?: string;
  "data-testid"?: string;
}

export function AnimatedCurrency({
  value,
  className = "",
  duration = 520,
  fromZero = false,
  prefix = "",
  "data-testid": testId,
}: AnimatedCurrencyProps) {
  const [displayValue, setDisplayValue] = useState(fromZero ? 0 : value);
  const [animating, setAnimating] = useState(fromZero);
  const displayRef = useRef(displayValue);
  const mountedRef = useRef(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startValue = mountedRef.current ? displayRef.current : fromZero ? 0 : value;
    mountedRef.current = true;

    if (reducedMotion || Math.abs(value - startValue) < 0.005) {
      displayRef.current = value;
      setDisplayValue(value);
      setAnimating(false);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    setAnimating(true);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (value - startValue) * eased;
      displayRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setAnimating(false);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, fromZero, value]);

  return (
    <span
      className={`${className} animated-currency ${animating ? "animated-currency--moving" : ""}`.trim()}
      aria-label={`${prefix}${formatUsdc(value)}`}
      data-testid={testId}
    >
      <span aria-hidden="true">{prefix}{formatUsdc(displayValue)}</span>
    </span>
  );
}
