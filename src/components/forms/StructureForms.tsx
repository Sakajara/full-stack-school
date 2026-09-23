"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  departmentSchema,
  DepartmentSchema,
  facultySchema,
  FacultySchema,
  programmeSchema,
  ProgrammeSchema,
  staffSchema,
  StaffSchema,
} from "@/lib/formValidationSchemas";
import { createStaff, saveDepartment, saveFaculty, saveProgramme } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { FormProps, FormShell, Section, SelectField, useSubmit } from "./kit";

const verb = (type: FormProps["type"]) => (type === "create" ? "created" : "updated");

export const FacultyForm = ({ type, data, setOpen }: FormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FacultySchema>({
    resolver: zodResolver(facultySchema),
  });
  const { busy, error, run } = useSubmit(saveFaculty, { success: `Faculty has been ${verb(type)}!`, setOpen });
  return (
    <FormShell title={type === "create" ? "Create a faculty or school" : "Update the faculty"} onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel={type === "create" ? "Create" : "Update"}>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Code" name="code" defaultValue={data?.code} register={register} error={errors.code} hint="e.g. SPAS" />
        <InputField label="Name" name="name" defaultValue={data?.name} register={register} error={errors.name} hint="e.g. School of Pure and Applied Sciences" />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
      </div>
    </FormShell>
  );
};

export const DepartmentForm = ({ type, data, setOpen }: FormProps) => {
  const faculties = useOptions("faculties");
  const { register, handleSubmit, formState: { errors } } = useForm<DepartmentSchema>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { facultyId: data?.facultyId ?? "" },
  });
  const { busy, error, run } = useSubmit(saveDepartment, { success: `Department has been ${verb(type)}!`, setOpen });
  if (faculties.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell title={type === "create" ? "Create a department" : "Update the department"} onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel={type === "create" ? "Create" : "Update"}>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Code" name="code" defaultValue={data?.code} register={register} error={errors.code} />
        <InputField label="Name" name="name" defaultValue={data?.name} register={register} error={errors.name} />
        <SelectField label="Faculty or school" name="facultyId" register={register} options={faculties.options} error={errors.facultyId} />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
      </div>
    </FormShell>
  );
};

export const ProgrammeForm = ({ type, data, setOpen }: FormProps) => {
  const departments = useOptions("departments");
  const { register, handleSubmit, formState: { errors } } = useForm<ProgrammeSchema>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      level: data?.level ?? "degree",
      departmentId: data?.departmentId ?? "",
      durationYears: data?.durationYears ?? 4,
      semestersPerYear: data?.semestersPerYear ?? 2,
      passMark: data?.passMark ?? 40,
    },
  });
  const { busy, error, run } = useSubmit(saveProgramme, { success: `Programme has been ${verb(type)}!`, setOpen });
  if (departments.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell title={type === "create" ? "Create a programme" : "Update the programme"} onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel={type === "create" ? "Create" : "Update"}>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Code" name="code" defaultValue={data?.code} register={register} error={errors.code} hint="e.g. SC211" />
        <InputField label="Name" name="name" defaultValue={data?.name} register={register} error={errors.name} hint="e.g. BSc Computer Science" />
        <SelectField
          label="Level"
          name="level"
          register={register}
          options={["certificate", "diploma", "degree", "masters", "phd"].map((l) => ({ value: l, label: l === "phd" ? "PhD" : l[0].toUpperCase() + l.slice(1) }))}
        />
        <SelectField label="Department" name="departmentId" register={register} options={departments.options} error={errors.departmentId} />
        <InputField label="Duration (years)" name="durationYears" type="number" register={register} error={errors.durationYears} />
        <InputField label="Semesters per year" name="semestersPerYear" type="number" register={register} error={errors.semestersPerYear} />
        <InputField label="Pass mark" name="passMark" type="number" register={register} error={errors.passMark} hint="40 for most programmes; higher for some medical ones" />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
      </div>
    </FormShell>
  );
};

export const StaffForm = ({ setOpen }: FormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<StaffSchema>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: "finance" },
  });
  const { busy, error, run } = useSubmit(createStaff, { success: "Staff account has been created!", setOpen });
  return (
    <FormShell title="Add office staff" onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel="Create">
      <Section title="Account">
        <InputField label="Username" name="username" register={register} error={errors.username} />
        <InputField label="Password" name="password" type="password" register={register} error={errors.password} />
        <SelectField
          label="Role"
          name="role"
          register={register}
          options={[
            { value: "finance", label: "Finance office" },
            { value: "admin", label: "Administrator" },
          ]}
        />
      </Section>
      <Section title="Details">
        <InputField label="First Name" name="name" register={register} error={errors.name} />
        <InputField label="Last Name" name="surname" register={register} error={errors.surname} />
        <InputField label="Email" name="email" register={register} error={errors.email} />
        <InputField label="Phone" name="phone" register={register} error={errors.phone} />
      </Section>
    </FormShell>
  );
};
