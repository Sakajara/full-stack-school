"use client";

import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FeeSummary from "@/components/FeeSummary";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import ProfileCard, { SmallCard } from "@/components/ProfileCard";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import { Notice, withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useCount, useLiveDoc } from "@/lib/live";
import { SPONSORSHIP_LABEL, type PrivateProfile, type Student } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SingleStudentPage = () => {
  const id = useSearchParams().get("id");
  const { role } = useAuth();
  const { data: student, loading, error } = useLiveDoc<Student>(id ? `students/${id}` : null);
  // Lecturers are not allowed these details; the page shows "-" for them.
  const priv = useLiveDoc<PrivateProfile>(id && role !== "teacher" ? `private/${id}` : null);
  const lessons = useCount(
    () => (student ? query(col("lessons"), where("classId", "==", student.classId), where("active", "==", true)) : null),
    `lessons|${student?.classId}`
  );

  if (loading) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  if (!student) return <div className="m-4"><Notice tone="error">{error ?? "Student not found."}</Notice></div>;

  const office = role === "admin" || role === "finance";

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          <ProfileCard
            img={student.img}
            name={`${student.name} ${student.surname}`}
            subtitle={`${student.admissionNo} · ${student.programmeName ?? "No programme"} · ${SPONSORSHIP_LABEL[student.sponsorship]}${
              student.fundingBand ? `, band ${student.fundingBand}` : ""
            }${student.status !== "active" ? ` · ${student.status}` : ""}`}
            details={[
              { icon: "/blood.png", value: priv.data?.bloodType, label: "Blood type" },
              { icon: "/date.png", value: priv.data?.birthday ? formatDate(priv.data.birthday) : null, label: "Birthday" },
              { icon: "/mail.png", value: student.email, label: "Email" },
              { icon: "/phone.png", value: student.phone, label: "Phone" },
            ]}
            action={role === "admin" && <FormContainer table="student" type="update" data={student} />}
          />
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image src="/singleAttendance.png" alt="" width={24} height={24} className="w-6 h-6" />
              <StudentAttendanceCard id={student.id} />
            </div>
            <SmallCard icon="/singleBranch.png" value={`Year ${student.gradeLevel}`} label="Year of study" />
            <SmallCard icon="/singleLesson.png" value={lessons ?? "-"} label="Lessons a week" />
            <SmallCard icon="/singleClass.png" value={student.className} label="Class" />
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4">
          <h1>Student&apos;s Schedule</h1>
          <BigCalendarContainer type="classId" id={student.classId} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/lessons?classId=${student.classId}`}>
              Student&apos;s Lessons
            </Link>
            <Link className="p-3 rounded-md bg-lamaPurpleLight" href={`/list/teachers?classId=${student.classId}`}>
              Student&apos;s Lecturers
            </Link>
            <Link className="p-3 rounded-md bg-pink-50" href={`/list/exams?classId=${student.classId}`}>
              Student&apos;s Exams
            </Link>
            <Link className="p-3 rounded-md bg-lamaSkyLight" href={`/list/assignments?classId=${student.classId}`}>
              Student&apos;s CATs
            </Link>
            <Link className="p-3 rounded-md bg-lamaYellowLight" href={`/list/results?studentId=${student.id}`}>
              Student&apos;s Results
            </Link>
            <Link className="p-3 rounded-md bg-lamaPurpleLight" href={`/list/attendance?studentId=${student.id}`}>
              Attendance
            </Link>
            {role === "admin" && (
              <Link className="p-3 rounded-md bg-pink-50" href={`/transcript?id=${student.id}`}>
                Transcript
              </Link>
            )}
            {office && (
              <Link className="p-3 rounded-md bg-lamaYellowLight" href={`/fees/statement?id=${student.id}`}>
                Fee statement
              </Link>
            )}
          </div>
        </div>
        {office && <FeeSummary studentId={student.id} />}
        {role !== "finance" && <Performance studentId={student.id} />}
        <Announcements />
      </div>
    </div>
  );
};

export default withSuspense(SingleStudentPage);
