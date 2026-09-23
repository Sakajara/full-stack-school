"use client";

import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FormContainer from "@/components/FormContainer";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";

const TeacherPage = () => {
  const { user } = useAuth();
  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Schedule</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              Take attendance <FormContainer table="attendance" type="create" />
            </div>
          </div>
          <BigCalendarContainer type="teacherId" id={user?.uid} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer />
        <Announcements />
      </div>
    </div>
  );
};

export default withSuspense(TeacherPage);
