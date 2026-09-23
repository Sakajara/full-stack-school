"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useState } from "react";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { createStudent, updateStudent } from "@/lib/actions";
import { useLiveDoc } from "@/lib/live";
import { useOptions } from "@/lib/options";
import type { PrivateProfile, SchoolClass } from "@/lib/types";
import { dateInput, FormProps, FormShell, PhotoField, Section, SelectField, useSubmit } from "./kit";

const StudentForm = ({ type, data, setOpen }: FormProps) => {
  const priv = useLiveDoc<PrivateProfile>(data?.id ? `private/${data.id}` : null);
  const grades = useOptions<{ id: string; level: number }>("grades", {
    order: "level",
    archivable: false,
    label: (g) => `Year ${g.level}`,
  });
  const classes = useOptions<SchoolClass & { id: string }>("classes", {
    label: (c) => `${c.name} (${c.studentCount ?? 0}/${c.capacity})`,
  });
  const parents = useOptions("parents", { order: "surname" });
  const programmes = useOptions("programmes");

  if (priv.loading || grades.loading || classes.loading || parents.loading || programmes.loading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }
  return (
    <Inner
      type={type}
      data={data}
      setOpen={setOpen}
      priv={priv.data}
      grades={grades.options}
      classes={classes.options}
      parents={parents.options}
      programmes={programmes.options}
    />
  );
};

type Opt = { value: string; label: string }[];

const Inner = ({
  type,
  data,
  setOpen,
  priv,
  grades,
  classes,
  parents,
  programmes,
}: FormProps & { priv: PrivateProfile | null; grades: Opt; classes: Opt; parents: Opt; programmes: Opt }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      sex: data?.sex ?? priv?.sex ?? undefined,
      gradeId: data?.gradeId ?? "",
      classId: data?.classId ?? "",
      parentId: data?.parentId ?? "",
      programmeId: data?.programmeId ?? "",
      sponsorship: data?.sponsorship ?? "GSS",
      fundingBand: data?.fundingBand ?? "",
      status: data?.status ?? "active",
    },
  });

  const [img, setImg] = useState<string | null>(data?.img ?? null);

  const { busy, error, run } = useSubmit(
    (d: StudentSchema) => (type === "create" ? createStudent : updateStudent)({ ...d, img }),
    { success: `Student has been ${type === "create" ? "created" : "updated"}!`, setOpen }
  );

  return (
    <FormShell
      title={type === "create" ? "Admit a new student" : "Update the student"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <Section title="Authentication Information">
        <InputField
          label="Admission number"
          name="username"
          defaultValue={data?.admissionNo ?? data?.username}
          register={register}
          error={errors?.username}
          hint={type === "update" ? "Admission numbers cannot be changed." : "e.g. SCT221-0001/2025. Used to sign in and as the M-Pesa account number."}
          inputProps={{ readOnly: type === "update" }}
        />
        <InputField label="Email" name="email" defaultValue={data?.email ?? ""} register={register} error={errors?.email} />
        {type === "create" ? (
          <InputField label="Password" name="password" type="password" register={register} error={errors?.password} />
        ) : (
          <p className="text-xs text-gray-400 w-full md:w-[30%] self-center">
            Students change their own password under Settings.
          </p>
        )}
      </Section>
      <Section title="Personal Information">
        <InputField label="First Name" name="name" defaultValue={data?.name} register={register} error={errors.name} />
        <InputField label="Last Name" name="surname" defaultValue={data?.surname} register={register} error={errors.surname} />
        <InputField label="Phone" name="phone" defaultValue={data?.phone ?? ""} register={register} error={errors.phone} />
        <InputField label="Address" name="address" defaultValue={priv?.address} register={register} error={errors.address} />
        <InputField label="National ID / Birth cert. no." name="nationalId" defaultValue={priv?.nationalId} register={register} />
        <InputField label="Home county" name="county" defaultValue={priv?.county} register={register} />
        <InputField label="Blood Type" name="bloodType" defaultValue={priv?.bloodType} register={register} error={errors.bloodType} />
        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={dateInput(priv?.birthday)}
          register={register}
          error={errors.birthday}
          type="date"
        />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <SelectField
          label="Sex"
          name="sex"
          register={register}
          options={[
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
          ]}
          error={errors.sex}
        />
        <SelectField label="Guardian" name="parentId" register={register} options={parents} placeholder="None" error={errors.parentId} />
        <PhotoField value={img} onChange={setImg} />
      </Section>
      <Section title="Academic and funding">
        <SelectField label="Programme" name="programmeId" register={register} options={programmes} placeholder="From the class" />
        <SelectField label="Year of study" name="gradeId" register={register} options={grades} error={errors.gradeId} />
        <SelectField label="Class" name="classId" register={register} options={classes} error={errors.classId} />
        <SelectField
          label="Sponsorship"
          name="sponsorship"
          register={register}
          options={[
            { value: "GSS", label: "Government sponsored (KUCCPS)" },
            { value: "SSP", label: "Self-sponsored" },
          ]}
          error={errors.sponsorship}
        />
        <SelectField
          label="Funding band"
          name="fundingBand"
          register={register}
          options={[1, 2, 3, 4, 5].map((b) => ({ value: b, label: `Band ${b}` }))}
          placeholder="Not yet assigned"
          error={errors.fundingBand}
        />
        <InputField label="KUCCPS index number" name="kuccpsIndex" defaultValue={data?.kuccpsIndex ?? ""} register={register} />
        <SelectField
          label="Status"
          name="status"
          register={register}
          options={["active", "deferred", "suspended", "discontinued", "graduated"].map((s) => ({
            value: s,
            label: s[0].toUpperCase() + s.slice(1),
          }))}
        />
      </Section>
    </FormShell>
  );
};

export default StudentForm;
