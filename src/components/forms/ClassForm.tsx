"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, ClassSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { FormProps, FormShell, SelectField, useSubmit } from "./kit";

const ClassForm = ({ type, data, setOpen }: FormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
  });

  const { busy, error, run } = useSubmit(type === "create" ? createClass : updateClass, {
    success: `Class has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  const teachers = useOptions("teachers", { order: "surname" });
  const grades = useOptions<{ id: string; level: number }>("grades", {
    order: "level",
    archivable: false,
    label: (g) => `Year ${g.level}`,
  });
  const programmes = useOptions("programmes");

  if (grades.loading || teachers.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Create a new class" : "Update the class"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Class name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
          hint="e.g. BSc Computer Science Y2 (2025 intake)"
        />
        <InputField
          label="Capacity"
          name="capacity"
          type="number"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
        <InputField
          label="Intake"
          name="intake"
          defaultValue={data?.intake}
          register={register}
          error={errors?.intake}
          hint="e.g. September 2025"
        />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField
          label="Class adviser"
          name="supervisorId"
          register={register}
          options={teachers.options}
          defaultValue={data?.supervisorId ?? ""}
          placeholder="None"
          error={errors.supervisorId}
        />
        <SelectField
          label="Year of study"
          name="gradeId"
          register={register}
          options={grades.options}
          defaultValue={data?.gradeId}
          error={errors.gradeId}
        />
        <SelectField
          label="Programme"
          name="programmeId"
          register={register}
          options={programmes.options}
          defaultValue={data?.programmeId ?? ""}
          placeholder="None"
        />
      </div>
    </FormShell>
  );
};

export default ClassForm;
