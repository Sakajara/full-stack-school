"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { where } from "firebase/firestore";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { examSchema, ExamSchema } from "@/lib/formValidationSchemas";
import { createExam, updateExam } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useOptions } from "@/lib/options";
import type { Lesson } from "@/lib/types";
import { dateTimeInput, FormProps, FormShell, SelectField, useSubmit } from "./kit";

// Lecturers can only set exams on their own lessons (enforced by the rules).
export const useMyLessons = () => {
  const { role, user } = useAuth();
  const mine = role === "teacher" && user;
  return useOptions<Lesson & { id: string }>("lessons", {
    filters: mine ? [where("teacherId", "==", user.uid)] : [],
    filterKey: mine ? user.uid : "all",
    label: (l) => `${l.subjectCode ? l.subjectCode + " " : ""}${l.subjectName} - ${l.className} (${l.day.slice(0, 3)} ${l.startTime})`,
  });
};

const ExamForm = ({ type, data, setOpen }: FormProps) => {
  const lessons = useMyLessons();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
    defaultValues: { kind: data?.kind ?? "main", maxScore: data?.maxScore ?? 100, lessonId: data?.lessonId ?? "" },
  });

  const { busy, error, run } = useSubmit(type === "create" ? createExam : updateExam, {
    success: `Exam has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  if (lessons.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Create a new exam" : "Update the exam"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Exam title" name="title" defaultValue={data?.title} register={register} error={errors?.title} />
        <InputField
          label="Start Date"
          name="startTime"
          defaultValue={dateTimeInput(data?.startTime)}
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />
        <InputField
          label="End Date"
          name="endTime"
          defaultValue={dateTimeInput(data?.endTime)}
          register={register}
          error={errors?.endTime}
          type="datetime-local"
        />
        <InputField label="Venue" name="venue" defaultValue={data?.venue} register={register} />
        <InputField label="Out of" name="maxScore" type="number" register={register} error={errors?.maxScore} />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField
          label="Sitting"
          name="kind"
          register={register}
          options={[
            { value: "main", label: "Main examination" },
            { value: "supplementary", label: "Supplementary" },
            { value: "special", label: "Special" },
          ]}
        />
        <SelectField label="Lesson" name="lessonId" register={register} options={lessons.options} error={errors.lessonId} wide />
      </div>
    </FormShell>
  );
};

export default ExamForm;
