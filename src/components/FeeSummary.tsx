"use client";

import { useAuth } from "@/lib/auth-context";
import { isClearedForExams, percentCleared } from "@/lib/funding";
import { useLiveDoc } from "@/lib/live";
import { useOptions } from "@/lib/options";
import { formatKES } from "@/lib/money";
import type { Account } from "@/lib/types";
import Link from "next/link";

// Balance, who still owes what, and whether the exam card can be issued.
const FeeSummary = ({ studentId, name }: { studentId: string; name?: string }) => {
  const { institution } = useAuth();
  const { data: account, loading } = useLiveDoc<Account>(`accounts/${studentId}`);
  const payers = useOptions<{ id: string; name: string }>("payers", { label: (p) => p.name });
  const payerName = (key: string) =>
    payers.options.find((p) => p.value === key)?.label ?? key.replace(/_/g, " ");
  const threshold = institution?.examCardThreshold ?? 100;
  const cleared = isClearedForExams(account, threshold);
  const pct = percentCleared(account);

  if (loading) return <div className="bg-white p-4 rounded-md text-sm text-gray-400">Loading fees...</div>;

  return (
    <div className="bg-white p-4 rounded-md flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fees{name ? ` (${name})` : ""}</h1>
        <Link href={`/fees/statement?id=${studentId}`} className="text-xs text-gray-400">
          Statement
        </Link>
      </div>
      {!account ? (
        <p className="text-sm text-gray-400">No invoice has been issued yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-lamaSkyLight rounded-md p-2">
              <p className="text-[11px] text-gray-500">Billed</p>
              <p className="font-semibold text-sm">{formatKES(account.billed)}</p>
            </div>
            <div className="bg-lamaPurpleLight rounded-md p-2">
              <p className="text-[11px] text-gray-500">Paid</p>
              <p className="font-semibold text-sm">{formatKES(account.paid)}</p>
            </div>
            <div className="bg-lamaYellowLight rounded-md p-2">
              <p className="text-[11px] text-gray-500">{account.balance < 0 ? "In credit" : "Balance"}</p>
              <p className="font-semibold text-sm">{formatKES(Math.abs(account.balance))}</p>
            </div>
          </div>
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden" aria-label={`${pct}% paid`}>
              <div className="h-full bg-lamaSky" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {pct}% paid.{" "}
              {cleared ? (
                <span className="text-green-600 font-medium">Cleared for exams.</span>
              ) : (
                <span className="text-red-500">
                  {threshold}% is needed for an exam card.
                </span>
              )}
            </p>
          </div>
          {Object.keys(account.byPayer ?? {}).length > 0 && (
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="font-normal">Payer</th>
                  <th className="font-normal text-right">Expected</th>
                  <th className="font-normal text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(account.byPayer).map(([payer, v]) => (
                  <tr key={payer} className="border-t border-gray-100">
                    <td className="py-1">{payerName(payer)}</td>
                    <td className="text-right">{formatKES(v.expected)}</td>
                    <td className={`text-right ${v.received < v.expected ? "text-amber-600" : ""}`}>
                      {formatKES(v.received)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {cleared && (
            <Link
              href={`/fees/statement?id=${studentId}&card=1`}
              className="text-center text-sm bg-lamaSky rounded-md p-2 font-medium"
            >
              View exam card
            </Link>
          )}
        </>
      )}
    </div>
  );
};

export default FeeSummary;
