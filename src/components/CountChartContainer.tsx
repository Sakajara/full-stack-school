"use client";

import { col, useCount } from "@/lib/live";
import { query, where } from "firebase/firestore";
import CountChart from "./CountChart";

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

const CountChartContainer = () => {
  const male = useCount(
    () => query(col("students"), where("active", "==", true), where("sex", "==", "MALE")),
    "count|male"
  );
  const female = useCount(
    () => query(col("students"), where("active", "==", true), where("sex", "==", "FEMALE")),
    "count|female"
  );
  const boys = male ?? 0;
  const girls = female ?? 0;

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Students</h1>
      </div>
      {/* CHART */}
      <CountChart boys={boys} girls={girls} />
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lamaSky rounded-full" />
          <h1 className="font-bold">{boys}</h1>
          <h2 className="text-xs text-gray-400">Male ({pct(boys, boys + girls)}%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lamaYellow rounded-full" />
          <h1 className="font-bold">{girls}</h1>
          <h2 className="text-xs text-gray-400">Female ({pct(girls, boys + girls)}%)</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
