"use client";

import { col } from "@/lib/live";
import { isoDate, mondayOf } from "@/lib/utils";
import { getCountFromServer, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import AttendanceChart from "./AttendanceChart";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Counts, not documents: each bar is an aggregation query, so a week of
// attendance for the whole institution costs a handful of reads.
const AttendanceChartContainer = () => {
  const [data, setData] = useState(DAYS.map((name) => ({ name, present: 0, absent: 0 })));

  useEffect(() => {
    const monday = mondayOf();
    let cancelled = false;
    Promise.all(
      DAYS.map(async (name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const date = isoDate(d);
        const [p, a] = await Promise.all(
          [true, false].map((present) =>
            getCountFromServer(
              query(col("attendance"), where("date", "==", date), where("present", "==", present))
            ).then((r) => r.data().count)
          )
        );
        return { name, present: p, absent: a };
      })
    )
      .then((rows) => !cancelled && setData(rows))
      .catch((e) => console.warn("Attendance chart:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = data[5].present + data[5].absent > 0 ? data : data.slice(0, 5);

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance this week</h1>
      </div>
      <AttendanceChart data={shown} />
    </div>
  );
};

export default AttendanceChartContainer;
