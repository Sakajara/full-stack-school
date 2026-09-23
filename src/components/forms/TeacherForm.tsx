"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useState } from "react";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useLiveDoc } from "@/lib/live";
import { useOptions } from "@/lib/options";
import type { PrivateProfile } from "@/lib/types";
import { dateInput, FormProps, FormShell, PhotoField, Section, SelectField, useSubmit } from "./kit";

const TeacherForm = ({ type, data, setOpen }: FormProps) => {
  const priv = useLiveDoc<PrivateProfile>(data?.id ? `private/${data.id}` : null);
  const subjects = useOptions("subjects");
  const departments = useOptions("departments");

  if (priv.loading || subjects.loading || departments.loading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }
  return (
    <Inner
      type={type}
      data={data}
      setOpen={setOpen}
      priv={priv.data}
      subjects={subjects.options}
      departments={departments.options}
    />
  );
};

const Inner = ({
  type,
  data,
  setOpen,
  priv,
  subjects,
  departments,
}: FormProps & {
  priv: PrivateProfile | null;
  subjects: { value: string; label: string }[];
  departments: { value: string; label: string }[];
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      subjects: data?.subjectIds ?? [],
      sex: data?.sex ?? priv?.sex ?? undefined,
      departmentId: data?.departmentId ?? "",
    },
  });

  const [img, setImg] = useState<string | null>(data?.img ?? null);

  const { busy, error, run } = useSubmit(
    (d: TeacherSchema) => (type === "create" ? createTeacher : updateTeacher)({ ...d, img }),
    { success: `Lecturer has been ${type === "create" ? "created" : "updated"}!`, setOpen }
  );

  return (
    <FormShell
      title={type === "create" ? "Create a new lecturer" : "Update the lecturer"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <Section title="Authentication Information">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
          hint={type === "update" ? "Usernames cannot be changed." : "Usually the staff number"}
          inputProps={{ readOnly: type === "update", disabled: false }}
        />
        <InputField label="Email" name="email" defaultValue={data?.email ?? ""} register={register} error={errors?.email} />
        {type === "create" ? (
          <InputField label="Password" name="password" type="password" register={register} error={errors?.password} />
        ) : (
          <p className="text-xs text-gray-400 w-full md:w-[30%] self-center">
            Lecturers change their own password under Settings.
          </p>
        )}
      </Section>
      <Section title="Personal Information">
        <InputField label="First Name" name="name" defaultValue={data?.name} register={register} error={errors.name} />
        <InputField label="Last Name" name="surname" defaultValue={data?.surname} register={register} error={errors.surname} />
        <InputField label="Staff number" name="staffNo" defaultValue={data?.staffNo} register={register} error={errors.staffNo} />
        <InputField label="Phone" name="phone" defaultValue={data?.phone ?? ""} register={register} error={errors.phone} />
        <InputField label="Address" name="address" defaultValue={priv?.address} register={register} error={errors.address} />
        <InputField label="National ID" name="nationalId" defaultValue={priv?.nationalId} register={register} error={errors.nationalId} />
        <InputField label="County" name="county" defaultValue={priv?.county} register={register} error={errors.county} />
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
        <SelectField label="Department" name="departmentId" register={register} options={departments} placeholder="None" />
        <SelectField label="Units" name="subjects" register={register} options={subjects} error={errors.subjects} multiple />
        <PhotoField value={img} onChange={setImg} />
      </Section>
    </FormShell>
  );
};

export default TeacherForm;
