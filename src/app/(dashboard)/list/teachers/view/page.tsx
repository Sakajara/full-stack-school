"use client";

import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import ProfileCard, { SmallCard } from "@/components/ProfileCard";
import { Notice, withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import type { Lesson, PrivateProfile, Teacher } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { query, where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SingleTeacherPage = () => {
  const id = useSearchParams().get("id");
  const { role, user } = useAuth();
  const { data: teacher, loading, error } = useLiveDoc<Teacher>(id ? `teachers/${id}` : null);
  const canSeePrivate = role === "admin" || role === "finance" || user?.uid === id;
  const priv = useLiveDoc<PrivateProfile>(id && canSeePrivate ? `private/${id}` : null);
  const lessons = useLiveQuery<Lesson>(
    () => (id ? query(col("lessons"), where("teacherId", "==", id), where("active", "==", true)) : null),
    `tlessons|${id}`
  );
  const classCount = new Set(lessons.data.map((l) => l.classId)).size;

  if (loading) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  if (!teacher) return <div className="m-4"><Notice tone="error">{error ?? "Lecturer not found."}</Notice></div>;

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          <ProfileCard
            img={teacher.img}
            name={`${teacher.name} ${teacher.surname}`}
            subtitle={[teacher.staffNo, teacher.departmentName].filter(Boolean).join(" · ") || undefined}
            details={[
              { icon: "/blood.png", value: priv.data?.bloodType, label: "Blood type" },
              { icon: "/date.png", value: priv.data?.birthday ? formatDate(priv.data.birthday) : null, label: "Birthday" },
              { icon: "/mail.png", value: teacher.email, label: "Email" },
              { icon: "/phone.png", value: teacher.phone, label: "Phone" },
            ]}
            action={role === "admin" && <FormContainer table="teacher" type="update" data={teacher} />}
          />
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            <SmallCard icon="/singleBranch.png" value={teacher.subjectIds?.length ?? 0} label="Units" />
            <SmallCard icon="/singleLesson.png" value={lessons.data.length} label="Lessons a week" />
            <SmallCard icon="/singleClass.png" value={classCount} label="Classes" />
            <SmallCard icon="/singleAttendance.png" value={teacher.departmentName ?? "-"} label="Department" />
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4">
          <h1>Lecturer&apos;s Schedule</h1>
          <BigCalendarContainer type="teacherId" id={teacher.id} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/classes?supervisorId=${teacher.id}`}>
              Classes advised
            </Link>
            <Link className="p-3 rounded-md bg-lamaPurpleLight" href={`/list/students?teacherId=${teacher.id}`}>
              Lecturer&apos;s Students
            </Link>
            <Link className="p-3 rounded-md bg-lamaYellowLight" href={`/list/lessons?teacherId=${teacher.id}`}>
              Lecturer&apos;s Lessons
            </Link>
            <Link className="p-3 rounded-md bg-pink-50" href={`/list/exams?teacherId=${teacher.id}`}>
              Lecturer&apos;s Exams
            </Link>
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/assignments?teacherId=${teacher.id}`}>
              Lecturer&apos;s CATs
            </Link>
            <Link className="p-3 rounded-md bg-lamaPurpleLight" href={`/list/subjects?teacherId=${teacher.id}`}>
              Lecturer&apos;s Units
            </Link>
          </div>
        </div>
        <Announcements />
      </div>
    </div>
  );
};

export default withSuspense(SingleTeacherPage);
