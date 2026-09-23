import { describe, expect, it } from "vitest";
import {
  computeAccount,
  DEFAULT_SCHEMES,
  isClearedForExams,
  isMpesaCode,
  paymentId,
  percentCleared,
  pickBand,
  shareTotal,
  splitInvoice,
} from "@/lib/funding";
import type { FundingScheme } from "@/lib/types";

const scfm = { id: "scfm", ...DEFAULT_SCHEMES[0] } as FundingScheme;

describe("default schemes", () => {
  it("every band adds up to 100%", () => {
    for (const s of DEFAULT_SCHEMES) for (const b of s.bands) expect(shareTotal(b)).toBe(100);
  });
});

describe("splitInvoice", () => {
  it("splits band 3 as 50/30/20", () => {
    const splits = splitInvoice(100_000, pickBand(scfm, 3));
    expect(Object.fromEntries(splits.map((s) => [s.payer, s.expected]))).toEqual({
      universities_fund: 50_000,
      helb: 30_000,
      household: 20_000,
    });
  });

  it("gives rounding shillings to the household so the total is exact", () => {
    const splits = splitInvoice(33_333, pickBand(scfm, 1));
    expect(splits.reduce((s, x) => s + x.expected, 0)).toBe(33_333);
    expect(splits.find((s) => s.payer === "universities_fund")!.expected).toBe(23_333);
    expect(splits.find((s) => s.payer === "helb")!.expected).toBe(8_333);
    expect(splits.find((s) => s.payer === "household")!.expected).toBe(1_667);
  });

  it("falls back to the default band when a student has none", () => {
    expect(pickBand(scfm, null).band).toBe(5);
    expect(pickBand(scfm, 9).band).toBe(5);
  });

  it("rejects a band that does not add up to 100%", () => {
    expect(() => splitInvoice(1000, { band: 1, label: "bad", shares: { household: 90 } })).toThrow(/90%/);
  });
});

describe("computeAccount", () => {
  const base = { id: "s1", studentName: "A", admissionNo: "X", parentId: null, classId: "c" };
  it("counts only issued invoices and verified payments", () => {
    const a = computeAccount(
      base,
      [
        { total: 100_000, status: "issued", splits: [{ payer: "helb", payerName: "", expected: 30_000 }, { payer: "household", payerName: "", expected: 70_000 }] },
        { total: 50_000, status: "cancelled", splits: [] },
      ],
      [
        { amount: 18_000, payer: "helb", status: "verified" },
        { amount: 20_000, payer: "household", status: "verified" },
        { amount: 99_000, payer: "household", status: "pending" },
        { amount: 5_000, payer: "household", status: "reversed" },
      ]
    );
    expect(a.billed).toBe(100_000);
    expect(a.paid).toBe(38_000);
    expect(a.balance).toBe(62_000);
    expect(a.byPayer.helb).toEqual({ expected: 30_000, received: 18_000 });
    expect(percentCleared(a)).toBe(38);
    expect(isClearedForExams(a, 38)).toBe(true);
    expect(isClearedForExams(a, 50)).toBe(false);
  });

  it("treats nothing billed as cleared", () => {
    expect(percentCleared({ billed: 0, paid: 0 })).toBe(100);
  });
});

describe("payment references", () => {
  it("normalises ids so the same code cannot be recorded twice", () => {
    expect(paymentId("MPESA", " sjk4h7x2pq ")).toBe(paymentId("MPESA", "SJK4H7X2PQ"));
    expect(paymentId("BANK", "FT-2026/0001")).toBe("BANK_FT20260001");
  });
  it("recognises M-Pesa codes", () => {
    expect(isMpesaCode("SJK4H7X2PQ")).toBe(true);
    expect(isMpesaCode("SJK4H7X2P")).toBe(false);
  });
});

describe("parseAllocations", () => {
  it("reads pasted schedules in common shapes", async () => {
    const { parseAllocations } = await import("@/lib/funding");
    const r = parseAllocations("SCT221-0001/2025, 18000\nsct221-0002/2025\t12,500\n\nSCT221-0003/2025 9 000");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      { admissionNo: "SCT221-0001/2025", amount: 18000, line: 1 },
      { admissionNo: "SCT221-0002/2025", amount: 12500, line: 2 },
      { admissionNo: "SCT221-0003/2025", amount: 9000, line: 3 },
    ]);
  });
  it("reports bad lines", async () => {
    const { parseAllocations } = await import("@/lib/funding");
    const r = parseAllocations("SCT221-0001/2025\nX, -5");
    expect(r.rows).toEqual([]);
    expect(r.errors.length).toBe(2);
  });
});
