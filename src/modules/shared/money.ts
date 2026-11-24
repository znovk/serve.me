/**
 * Money is stored as integer minor units (cents). Never use floats for money.
 */
export function parseMoneyToMinor(input: string): number | null {
  const v = input.trim().replace(/[$,\s]/g, "");
  if (v === "") return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(v);
  if (!m) return Number.NaN;
  const whole = Number(m[1]);
  const cents = Number((m[2] ?? "").padEnd(2, "0"));
  return whole * 100 + cents;
}

export function formatMinor(minor: number | null | undefined, currency = "USD"): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

/** Basis points (1% = 100 bps) → "12.5%". */
export function formatBps(bps: number | null | undefined): string {
  if (bps == null) return "—";
  return `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export function parsePercentToBps(input: string): number | null {
  const v = input.trim().replace(/%$/, "");
  if (v === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v)) return Number.NaN;
  const bps = Math.round(Number(v) * 100);
  return bps <= 10000 ? bps : Number.NaN;
}
