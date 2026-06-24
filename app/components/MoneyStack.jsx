"use client";
import { fmtMoneyC } from "@/lib/use-store";

/**
 * Render a single number when only one currency has a non-zero total,
 * or stack USD on top + GBP underneath in smaller text when both exist.
 * Defaults to 2 decimal places for currency formatting.
 *
 *   <MoneyStack usd={12000} gbp={0}     />   →   $12,000.00
 *   <MoneyStack usd={0}     gbp={8500}  />   →   £8,500.00
 *   <MoneyStack usd={12000} gbp={8500}  />   →   $12,000.00
 *                                              £8,500.00
 */
export default function MoneyStack({ usd, gbp, inr, decimals = 2, color }) {
  const u = parseFloat(usd) || 0;
  const g = parseFloat(gbp) || 0;
  const i = parseFloat(inr) || 0;
  const entries = [
    { code: "USD", value: u },
    { code: "GBP", value: g },
    { code: "INR", value: i },
  ].filter((item) => item.value !== 0);

  const both = entries.length > 1;

  if (!both) {
    const single = entries[0];
    const value = single ? fmtMoneyC(single.value, single.code, decimals) : fmtMoneyC(0, "USD", decimals);
    return <span style={{ color }}>{value}</span>;
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.05, color }}>
      {entries.map((item, index) => (
        <span key={item.code} style={{ fontSize: index === 0 ? undefined : "0.72em", opacity: index === 0 ? 1 : 0.75 }}>
          {fmtMoneyC(item.value, item.code, decimals)}
        </span>
      ))}
    </span>
  );
}
