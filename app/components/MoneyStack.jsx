"use client";
import { fmtMoneyC } from "@/lib/use-store";

/**
 * Render a single number when only one currency has a non-zero total,
 * or stack USD on top + GBP underneath in smaller text when both exist.
 *
 *   <MoneyStack usd={12000} gbp={0}     />   →   $12,000
 *   <MoneyStack usd={0}     gbp={8500}  />   →   £8,500
 *   <MoneyStack usd={12000} gbp={8500}  />   →   $12,000
 *                                              £8,500
 */
export default function MoneyStack({ usd, gbp, decimals = 0, color }) {
  const u = parseFloat(usd) || 0;
  const g = parseFloat(gbp) || 0;
  const both = u !== 0 && g !== 0;

  if (!both) {
    const value = u !== 0
      ? fmtMoneyC(u, "USD", decimals)
      : fmtMoneyC(g, "GBP", decimals);
    return <span style={{ color }}>{value}</span>;
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.05, color }}>
      <span>{fmtMoneyC(u, "USD", decimals)}</span>
      <span style={{ fontSize: "0.72em", opacity: 0.75 }}>{fmtMoneyC(g, "GBP", decimals)}</span>
    </span>
  );
}
