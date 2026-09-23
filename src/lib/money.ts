const kes = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const formatKES = (amount: number) => kes.format(Math.round(amount || 0));

// Money is kept in whole shillings throughout, which is how Kenyan fee
// structures, M-Pesa and bank slips express it.
export const toShillings = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

export const sum = (values: number[]) => values.reduce((a, b) => a + (b || 0), 0);
