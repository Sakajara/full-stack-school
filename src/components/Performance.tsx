"use client";

import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import { ownerFilters } from "@/lib/scope";
import type { Result } from "@/lib/types";
import { query, where } from "firebase/firestore";
import { PieChart, Pie, ResponsiveContainer } from "recharts";

// The student's average mark (as a percentage) across every assessment
// recorded this semester.
const Performance = ({ studentId }: { studentId: string }) => {
  const { role, user, institution } = useAuth();
  const scope = [
    ...ownerFilters(role, user?.uid, { teacherScoped: true }),
    ...(role === "student" ? [] : [where("studentId", "==", studentId)]),
  ];
  const { data } = useLiveQuery<Result>(
    () =>
      institution
        ? query(
            col("results"),
            ...scope,
            where("academicYear", "==", institution.academicYear),
            where("semester", "==", institution.semester)
          )
        : null,
    `perf|${studentId}|${role}|${institution?.academicYear}|${institution?.semester}`
  );
  const avg = data.length
    ? Math.round((data.reduce((s, r) => s + r.score / r.maxScore, 0) / data.length) * 1000) / 10
    : null;
  const chart = [
    { name: "Score", value: avg ?? 0, fill: "#C3EBFA" },
    { name: "Remaining", value: 100 - (avg ?? 0), fill: "#FAE27C" },
  ];

  return (
    <div className="bg-surface p-4 rounded-md h-80 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Performance</h1>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie dataKey="value" startAngle={180} endAngle={0} data={chart} cx="50%" cy="50%" innerRadius={70} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <h1 className="text-3xl font-bold">{avg === null ? "-" : avg}</h1>
        <p className="text-xs text-gray-400">average % over {data.length} assessment{data.length === 1 ? "" : "s"}</p>
      </div>
      <h2 className="font-medium absolute bottom-16 left-0 right-0 m-auto text-center">
        {institution ? `${institution.academicYear}, semester ${institution.semester}` : ""}
      </h2>
    </div>
  );
};

export default Performance;
