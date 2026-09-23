"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMyLessons } from "./ExamForm";
import { dateInput, FormProps } from "./kit";

// Picks the lesson and date, then opens the class register.
const AttendanceForm = ({ setOpen }: FormProps) => {
  const lessons = useMyLessons();
  const router = useRouter();
  const [lesson, setLesson] = useState("");
  const [date, setDate] = useState(dateInput(new Date())!);

  if (lessons.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!lesson) return;
        setOpen(false);
        router.push(`/list/attendance/mark?lesson=${lesson}&date=${date}`);
      }}
    >
      <h1 className="text-xl font-semibold">Take attendance</h1>
      <div className="flex justify-between flex-wrap gap-4">
        <label className="flex flex-col gap-2 w-full md:w-[60%]">
          <span className="text-xs text-gray-500">Lesson</span>
          <select
            required
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-surface"
          >
            <option value="">Select...</option>
            {lessons.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 w-full md:w-[30%]">
          <span className="text-xs text-gray-500">Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          />
        </label>
      </div>
      <button className="bg-blue-400 text-white p-2 rounded-md">Open register</button>
    </form>
  );
};

export default AttendanceForm;
