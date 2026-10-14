const usdcFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUsdc = (value: number) => usdcFormatter.format(value);

export const formatPerformance = (value: number) =>
  Math.abs(value) < 0.0005
    ? "0.00%"
    : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const formatTimer = (seconds: number) =>
  `00:${Math.max(0, Math.ceil(seconds)).toString().padStart(2, "0")}`;
