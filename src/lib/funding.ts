import { toShillings } from "./money";
import type {
  Account,
  FundingBand,
  FundingScheme,
  Invoice,
  InvoiceSplit,
  Payer,
  Payment,
} from "./types";

// Payers present on a new installation. The finance office can rename them
// or add others (a county bursary, a named sponsor) from Settings.
export const DEFAULT_PAYERS: Omit<Payer, "id">[] = [
  { key: "universities_fund", name: "Universities Fund (scholarship)", kind: "government_scholarship", active: true },
  { key: "helb", name: "HELB (loan)", kind: "government_loan", active: true },
  { key: "household", name: "Household", kind: "household", active: true },
  { key: "county_bursary", name: "County bursary", kind: "bursary", active: true },
  { key: "ng_cdf", name: "NG-CDF bursary", kind: "bursary", active: true },
  { key: "sponsor", name: "Private sponsor", kind: "sponsor", active: true },
  // Proposed by the Tertiary Education Placement and Funding Bill, 2026.
  { key: "tefa", name: "Tertiary Education Funding Authority (proposed)", kind: "government_loan", active: false },
];

const band = (
  n: number,
  label: string,
  scholarship: number,
  loan: number,
  household: number,
  upkeep: number
): FundingBand => ({
  band: n,
  label,
  shares: { universities_fund: scholarship, helb: loan, household },
  upkeep,
});

// Policies are data. When the law changes, the finance office adds a scheme
// and assigns it; no code changes and no history is rewritten.
export const DEFAULT_SCHEMES: Omit<FundingScheme, "id">[] = [
  {
    name: "Student-Centred Funding Model (2023)",
    description:
      "Means-tested bands. Stayed by the Court of Appeal in March 2025 pending the appeal against the High Court ruling of December 2024.",
    appliesTo: "GSS",
    defaultBand: 5,
    active: true,
    bands: [
      band(1, "Band 1 (household income below KES 5,995 a month)", 70, 25, 5, 60000),
      band(2, "Band 2 (KES 5,995 to 23,670)", 60, 30, 10, 55000),
      band(3, "Band 3 (KES 23,670 to 70,000)", 50, 30, 20, 50000),
      band(4, "Band 4 (KES 70,000 to 120,000)", 40, 30, 30, 45000),
      band(5, "Band 5 (above KES 120,000)", 30, 30, 40, 40000),
    ],
  },
  {
    name: "Full government funding (announced July 2026)",
    description:
      "Announced for students placed from September 2026. Whether it is a grant or a loan had not been published when this scheme was set up; adjust the shares once it is.",
    appliesTo: "GSS",
    defaultBand: 1,
    active: false,
    bands: [{ band: 1, label: "All students", shares: { universities_fund: 100 } }],
  },
  {
    name: "All-loan model (Tertiary Education Placement and Funding Bill, 2026)",
    description: "Draft bill in public participation in September 2026. Not law.",
    appliesTo: "GSS",
    defaultBand: 1,
    active: false,
    bands: [{ band: 1, label: "All students", shares: { tefa: 100 } }],
  },
  {
    name: "Self-sponsored programme",
    description: "The student or their sponsor pays the full fee.",
    appliesTo: "SSP",
    defaultBand: 1,
    active: true,
    bands: [{ band: 1, label: "Full fee", shares: { household: 100 } }],
  },
];

export const shareTotal = (b: FundingBand) =>
  Object.values(b.shares).reduce((s, v) => s + (Number(v) || 0), 0);

export const pickBand = (scheme: FundingScheme, bandNo?: number | null) =>
  scheme.bands.find((b) => b.band === bandNo) ??
  scheme.bands.find((b) => b.band === scheme.defaultBand) ??
  scheme.bands[0];

// Splits an invoice total between payers in whole shillings. Rounding
// differences go to the household share (or the last payer if there is no
// household share), so the splits always add up to the total exactly.
export const splitInvoice = (
  total: number,
  b: FundingBand,
  payerNames: Record<string, string> = {}
): InvoiceSplit[] => {
  if (shareTotal(b) !== 100) {
    throw new Error(`Shares in "${b.label}" add up to ${shareTotal(b)}%, not 100%.`);
  }
  const entries = Object.entries(b.shares).filter(([, pct]) => pct > 0);
  const splits = entries.map(([payer, pct]) => ({
    payer,
    payerName: payerNames[payer] ?? payer,
    expected: Math.floor((total * pct) / 100),
  }));
  const remainder = total - splits.reduce((s, x) => s + x.expected, 0);
  const target = splits.find((s) => s.payer === "household") ?? splits[splits.length - 1];
  if (target) target.expected += remainder;
  return splits;
};

// Rebuilds a student's running totals from the ledger. Only issued invoices
// and verified payments count.
export const computeAccount = (
  base: Pick<Account, "id" | "studentName" | "admissionNo" | "parentId" | "classId">,
  invoices: Pick<Invoice, "total" | "splits" | "status">[],
  payments: Pick<Payment, "amount" | "payer" | "status">[]
): Account => {
  const byPayer: Account["byPayer"] = {};
  let billed = 0;
  for (const inv of invoices) {
    if (inv.status !== "issued") continue;
    billed += inv.total;
    for (const s of inv.splits) {
      byPayer[s.payer] ??= { expected: 0, received: 0 };
      byPayer[s.payer].expected += s.expected;
    }
  }
  let paid = 0;
  for (const p of payments) {
    if (p.status !== "verified") continue;
    paid += p.amount;
    byPayer[p.payer] ??= { expected: 0, received: 0 };
    byPayer[p.payer].received += p.amount;
  }
  return { ...base, billed, paid, balance: billed - paid, byPayer };
};

// Share of what has been billed that has been paid, 0-100.
export const percentCleared = (account: Pick<Account, "billed" | "paid"> | null | undefined) => {
  if (!account || account.billed <= 0) return 100;
  return Math.min(100, Math.floor((account.paid / account.billed) * 100));
};

export const isClearedForExams = (
  account: Pick<Account, "billed" | "paid"> | null | undefined,
  threshold: number
) => percentCleared(account) >= threshold;

// The payment document id. Using the reference makes duplicates impossible:
// a second attempt to record the same M-Pesa code finds the id taken.
export const paymentId = (method: string, reference: string) =>
  `${method}_${reference.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")}`;

// M-Pesa confirmation codes are 10 upper-case letters and digits.
export const isMpesaCode = (reference: string) => /^[A-Z0-9]{10}$/.test(reference.trim().toUpperCase());

// Reads a beneficiary schedule pasted from HELB, the Universities Fund or a
// bursary committee: one "admission number, amount" per line.
export const parseAllocations = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: { admissionNo: string; amount: number; line: number }[] = [];
  const errors: string[] = [];
  lines.forEach((line, i) => {
    // Accepts "ADM, 12000", "ADM<TAB>12,000" or "ADM 12000".
    const m = line.match(/^(.+?)[\s,;\t]+([\d, ]+(?:\.\d+)?)$/);
    if (!m) {
      errors.push(`Line ${i + 1}: expected "admission number, amount"`);
      return;
    }
    const amount = toShillings(m[2]);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Line ${i + 1}: invalid amount`);
      return;
    }
    // A space inside an admission number would otherwise be read as part of
    // the amount ("J17 1234 18000"); no single allocation is this large.
    if (amount > 10_000_000) {
      errors.push(`Line ${i + 1}: amount too large; separate the admission number and amount with a comma`);
      return;
    }
    rows.push({ admissionNo: m[1].trim().toUpperCase(), amount, line: i + 1 });
  });
  return { rows, errors };
};

