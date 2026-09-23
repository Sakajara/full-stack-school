"use client";

import { useAuth } from "@/lib/auth-context";
import { col, useCount } from "@/lib/live";
import { ownerFilters } from "@/lib/scope";
import { query, where } from "firebase/firestore";

const StudentAttendanceCard = ({ id }: { id: string }) => {
  const { role, user } = useAuth();
  // A student's own filter already names them; others add the student.
  const scope = [
    ...ownerFilters(role, user?.uid, { teacherScoped: true }),
    ...(role === "student" ? [] : [where("studentId", "==", id)]),
  ];
  const since = `${new Date().getFullYear()}-01-01`;
  const key = `att|${id}|${role}`;
  const total = useCount(
    () => query(col("attendance"), ...scope, where("date", ">=", since)),
    `${key}|all`
  );
  const present = useCount(
    () =>
      query(col("attendance"), ...scope, where("present", "==", true), where("date", ">=", since)),
    `${key}|present`
  );
  const percentage = total ? Math.round(((present ?? 0) / total) * 100) : null;
  return (
    <div className="">
      <h1 className="text-xl font-semibold">{percentage === null ? "-" : `${percentage}%`}</h1>
      <span className="text-sm text-gray-400">Attendance{role === "teacher" ? " in your lessons" : ""}</span>
    </div>
  );
};

export default StudentAttendanceCard;
