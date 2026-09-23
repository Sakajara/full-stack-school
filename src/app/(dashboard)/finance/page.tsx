"use client";

import FinanceChart from "@/components/FinanceChart";
import { withSuspense } from "@/components/ui/Page";
import { col, useCount, useLiveQuery } from "@/lib/live";
import { formatKES } from "@/lib/money";
import type { Account, Payer } from "@/lib/types";
import { getAggregateFromServer, limit, orderBy, query, sum, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

const Stat = ({ label, value, href }: { label: string; value: string; href?: string }) => {
  const body = (
    <>
      <h1 className="text-2xl font-semibold my-2">{value}</h1>
      <h2 className="text-sm font-medium text-gray-500">{label}</h2>
    </>
  );
  const cls = "rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[150px]";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

// What each payer was expected to pay against what arrived, across all
// students. HELB and Universities Fund shortfalls show up here, rather than
// looking like student debt.
const usePayerTotals = (payers: Payer[]) => {
  const [rows, setRows] = useState<{ key: string; name: string; expected: number; received: number }[]>([]);
  const key = payers.map((p) => p.key).join(",");
  useEffect(() => {
    if (!payers.length) return;
    let cancelled = false;
    Promise.all(
      payers.map(async (p) => {
        const r = await getAggregateFromServer(query(col("accounts")), {
          expected: sum(`byPayer.${p.key}.expected`),
          received: sum(`byPayer.${p.key}.received`),
        });
        return { key: p.key, name: p.name, expected: r.data().expected ?? 0, received: r.data().received ?? 0 };
      })
    )
      .then((r) => !cancelled && setRows(r.filter((x) => x.expected || x.received)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return rows;
};

const FinancePage = () => {
  const payers = useLiveQuery<Payer>(() => query(col("payers"), where("active", "==", true)), "payers");
  const totals = usePayerTotals(payers.data);
  const pending = useCount(() => query(col("payments"), where("status", "==", "pending")), "pending");
  const inArrears = useCount(() => query(col("accounts"), where("balance", ">", 0)), "arrears");
  const arrears = useLiveQuery<Account>(
    () => query(col("accounts"), where("balance", ">", 0), orderBy("balance", "desc"), limit(10)),
    "arrears-top"
  );

  const billed = totals.reduce((s, t) => s + t.expected, 0);
  const received = totals.reduce((s, t) => s + t.received, 0);

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      <div className="w-full xl:w-2/3 flex flex-col gap-8">
        <div className="flex gap-4 justify-between flex-wrap">
          <Stat label="Billed" value={formatKES(billed)} href="/fees/invoices" />
          <Stat label="Received" value={formatKES(received)} href="/fees/payments?status=verified" />
          <Stat label="Payments to verify" value={pending === null ? "..." : String(pending)} href="/fees/payments?status=pending" />
          <Stat label="Students with a balance" value={inArrears === null ? "..." : String(inArrears)} />
        </div>
        <div className="w-full h-[450px]">
          <FinanceChart />
        </div>
        <div className="bg-surface p-4 rounded-md">
          <h1 className="text-lg font-semibold">By payer</h1>
          <p className="text-xs text-gray-400">Government shares that arrive late or in part show as a gap here.</p>
          <div className="overflow-x-auto">
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th>Payer</th>
                  <th className="text-right">Expected</th>
                  <th className="text-right">Received</th>
                  <th className="text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.key} className="border-b border-gray-100">
                    <td className="py-2">{t.name}</td>
                    <td className="text-right">{formatKES(t.expected)}</td>
                    <td className="text-right">{formatKES(t.received)}</td>
                    <td className={`text-right ${t.expected > t.received ? "text-amber-600" : ""}`}>
                      {formatKES(t.expected - t.received)}
                    </td>
                  </tr>
                ))}
                {!totals.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No invoices issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <div className="bg-surface p-4 rounded-md">
          <h1 className="text-lg font-semibold">Largest balances</h1>
          <ul className="mt-2 flex flex-col">
            {arrears.data.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-gray-100 py-2 text-sm">
                <Link href={`/fees/statement?id=${a.id}`} className="hover:underline">
                  {a.studentName}
                  <span className="block text-[11px] text-gray-400">{a.admissionNo}</span>
                </Link>
                <span className="font-medium">{formatKES(a.balance)}</span>
              </li>
            ))}
            {!arrears.loading && !arrears.data.length && <li className="text-sm text-gray-400 py-2">No balances.</li>}
          </ul>
        </div>
        <div className="bg-surface p-4 rounded-md flex flex-col gap-2 text-sm">
          <h1 className="text-lg font-semibold">Quick actions</h1>
          <Link className="underline" href="/fees/payments?status=pending">Verify reported payments</Link>
          <Link className="underline" href="/fees/remittances">Record a HELB or bursary transfer</Link>
          <Link className="underline" href="/fees/invoices">Issue semester invoices</Link>
          <Link className="underline" href="/fees/structures">Fee structures</Link>
          <Link className="underline" href="/fees/schemes">Funding schemes and payers</Link>
        </div>
      </div>
    </div>
  );
};

export default withSuspense(FinancePage);
