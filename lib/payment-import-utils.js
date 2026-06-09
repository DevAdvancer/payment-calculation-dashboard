export function normalizePaymentImportAmounts({ amount, paid, due, status }) {
  const total = parseFloat(amount) || 0;
  const paidValue = parseFloat(paid) || 0;
  const dueValue = parseFloat(due) || 0;

  if (status === "Received") {
    return {
      paid: paidValue || total,
      due: 0,
    };
  }

  if (status === "Pending") {
    return {
      paid: paidValue,
      due: dueValue || Math.max(0, total - paidValue),
    };
  }

  return {
    paid: paidValue,
    due: dueValue || total,
  };
}
