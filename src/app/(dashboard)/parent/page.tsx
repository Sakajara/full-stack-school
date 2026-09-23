"use client";

import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FeeSummary from "@/components/FeeSummary";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import type { Student } from "@/lib/types";
import { query, where } from "firebase/firestore";

const ParentPage = () => {
  const { user } = useAuth();
  const { data: students, loading } = useLiveQuery<Student>(
    () => (user ? query(col("students"), where("parentId", "==", user.uid)) : null),
    `children|${user?.uid}`
  );

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {!loading && students.length === 0 && (
          <div className="bg-white p-4 rounded-md text-sm text-gray-400">
            No students are linked to your account yet. Contact the registry office.
          </div>
        )}
        {students.map((student) => (
          <div className="bg-white p-4 rounded-md" key={student.id}>
            <h1 className="text-xl font-semibold">
              Schedule ({student.name + " " + student.surname}, {student.className})
            </h1>
            <BigCalendarContainer type="classId" id={student.classId} />
          </div>
        ))}
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        {students.map((s) => (
          <FeeSummary key={s.id} studentId={s.id} name={s.name} />
        ))}
        <Announcements />
      </div>
    </div>
  );
};

export default withSuspense(ParentPage);
