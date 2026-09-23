"use client";

import { col, useLiveQuery } from "@/lib/live";
import { formatKES } from "@/lib/money";
import type { FinanceMonth } from "@/lib/types";
import { documentId, query, where } from "firebase/firestore";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const lastTwelve = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, name: MONTHS[d.getMonth()] };
  });
};

const compact = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);

// Fees billed against money received, month by month, from the running
// monthly totals the finance office's actions keep.
const FinanceChart = () => {
  const months = lastTwelve();
  const { data: rows } = useLiveQuery<FinanceMonth>(
    () => query(col("financeMonths"), where(documentId(), ">=", months[0].key)),
    `finance|${months[0].key}`
  );
  const byKey = Object.fromEntries(rows.map((r) => [r.id, r]));
  const data = months.map((m) => ({
    name: m.name,
    billed: byKey[m.key]?.billed ?? 0,
    collected: byKey[m.key]?.collected ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Finance (KES)</h1>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis dataKey="name" axisLine={false} tick={{ fill: "#9ca3af" }} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} tick={{ fill: "#9ca3af" }} tickLine={false} tickMargin={20} tickFormatter={compact} />
          <Tooltip formatter={(v: number) => formatKES(v)} />
          <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }} />
          <Line type="monotone" dataKey="billed" name="Billed" stroke="#CFCEFF" strokeWidth={5} />
          <Line type="monotone" dataKey="collected" name="Collected" stroke="#C3EBFA" strokeWidth={5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
