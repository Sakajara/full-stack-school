"use client";

import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FeeSummary from "@/components/FeeSummary";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { useLiveDoc } from "@/lib/live";
import type { Student } from "@/lib/types";

const StudentPage = () => {
  const { user } = useAuth();
  const { data: me, loading } = useLiveDoc<Student>(user ? `students/${user.uid}` : null);

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Schedule{me?.className ? ` (${me.className})` : ""}</h1>
          {!loading && <BigCalendarContainer type="classId" id={me?.classId} />}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        {user && <FeeSummary studentId={user.uid} />}
        <EventCalendarContainer />
        <Announcements />
      </div>
    </div>
  );
};

export default withSuspense(StudentPage);
