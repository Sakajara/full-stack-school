"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { subjectSchema, SubjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { FormProps, FormShell, SelectField, useSubmit } from "./kit";

const SubjectForm = ({ type, data, setOpen }: FormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { teachers: data?.teacherIds ?? [], creditHours: data?.creditHours ?? 3 },
  });

  const { busy, error, run } = useSubmit(type === "create" ? createSubject : updateSubject, {
    success: `Unit has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  const teachers = useOptions("teachers", { order: "surname" });
  const departments = useOptions("departments");

  if (teachers.loading || departments.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Create a new unit" : "Update the unit"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Unit code"
          name="code"
          defaultValue={data?.code}
          register={register}
          error={errors?.code}
          hint="e.g. SCO 201"
        />
        <InputField label="Unit name" name="name" defaultValue={data?.name} register={register} error={errors?.name} />
        <InputField
          label="Credit hours"
          name="creditHours"
          type="number"
          register={register}
          error={errors?.creditHours}
        />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField
          label="Department"
          name="departmentId"
          register={register}
          options={departments.options}
          defaultValue={data?.departmentId ?? ""}
          placeholder="None"
        />
        <SelectField
          label="Lecturers"
          name="teachers"
          register={register}
          options={teachers.options}
          error={errors.teachers}
          multiple
        />
      </div>
    </FormShell>
  );
};

export default SubjectForm;
