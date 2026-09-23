"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { assignmentSchema, AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import { useMyLessons } from "./ExamForm";
import { dateInput, FormProps, FormShell, SelectField, useSubmit } from "./kit";

const AssignmentForm = ({ type, data, setOpen }: FormProps) => {
  const lessons = useMyLessons();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { kind: data?.kind ?? "cat", maxScore: data?.maxScore ?? 30, lessonId: data?.lessonId ?? "" },
  });

  const { busy, error, run } = useSubmit(type === "create" ? createAssignment : updateAssignment, {
    success: `Assessment has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  if (lessons.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Create a CAT or assignment" : "Update the CAT or assignment"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Title" name="title" defaultValue={data?.title} register={register} error={errors?.title} />
        <InputField
          label="Start date"
          name="startDate"
          type="date"
          defaultValue={dateInput(data?.startDate)}
          register={register}
          error={errors?.startDate}
        />
        <InputField
          label="Due date"
          name="dueDate"
          type="date"
          defaultValue={dateInput(data?.dueDate)}
          register={register}
          error={errors?.dueDate}
        />
        <InputField label="Out of" name="maxScore" type="number" register={register} error={errors?.maxScore} />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField
          label="Type"
          name="kind"
          register={register}
          options={[
            { value: "cat", label: "CAT (continuous assessment test)" },
            { value: "assignment", label: "Assignment" },
          ]}
        />
        <SelectField label="Lesson" name="lessonId" register={register} options={lessons.options} error={errors.lessonId} wide />
      </div>
    </FormShell>
  );
};

export default AssignmentForm;
