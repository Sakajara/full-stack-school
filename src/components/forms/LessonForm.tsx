"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { FormProps, FormShell, SelectField, useSubmit } from "./kit";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const LessonForm = ({ type, data, setOpen }: FormProps) => {
  const subjects = useOptions("subjects");
  const classes = useOptions("classes");
  const teachers = useOptions("teachers", { order: "surname" });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      day: data?.day ?? "MONDAY",
      subjectId: data?.subjectId ?? "",
      classId: data?.classId ?? "",
      teacherId: data?.teacherId ?? "",
    },
  });

  const { busy, error, run } = useSubmit(type === "create" ? createLesson : updateLesson, {
    success: `Lesson has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  if (subjects.loading || classes.loading || teachers.loading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  return (
    <FormShell
      title={type === "create" ? "Add a lesson to the timetable" : "Update the lesson"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Lesson name" name="name" defaultValue={data?.name} register={register} error={errors?.name} hint="e.g. Lecture, Practical, Tutorial" />
        <SelectField
          label="Day"
          name="day"
          register={register}
          options={DAYS.map((d) => ({ value: d, label: d[0] + d.slice(1).toLowerCase() }))}
          error={errors.day}
        />
        <InputField label="Venue" name="venue" defaultValue={data?.venue} register={register} hint="e.g. LH 3, Lab 2" />
        <InputField label="Start time" name="startTime" type="time" defaultValue={data?.startTime} register={register} error={errors?.startTime} />
        <InputField label="End time" name="endTime" type="time" defaultValue={data?.endTime} register={register} error={errors?.endTime} />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField label="Unit" name="subjectId" register={register} options={subjects.options} error={errors.subjectId} />
        <SelectField label="Class" name="classId" register={register} options={classes.options} error={errors.classId} />
        <SelectField label="Lecturer" name="teacherId" register={register} options={teachers.options} error={errors.teacherId} />
      </div>
    </FormShell>
  );
};

export default LessonForm;
