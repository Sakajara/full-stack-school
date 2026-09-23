"use client";

import { col, useLiveQuery } from "@/lib/live";
import type { Lesson } from "@/lib/types";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";
import { query, where } from "firebase/firestore";
import BigCalendar from "./BigCalender";

const BigCalendarContainer = ({ type, id }: { type: "teacherId" | "classId"; id: string | null | undefined }) => {
  const { data, loading } = useLiveQuery<Lesson>(
    () => (id ? query(col("lessons"), where(type, "==", id), where("active", "==", true)) : null),
    `cal|${type}|${id}`
  );

  if (!id) return <p className="text-sm text-gray-400 p-4">No timetable yet.</p>;
  if (loading) return <p className="text-sm text-gray-400 p-4">Loading timetable...</p>;

  return (
    <div className="h-[600px]">
      <BigCalendar data={adjustScheduleToCurrentWeek(data)} />
    </div>
  );
};

export default BigCalendarContainer;
