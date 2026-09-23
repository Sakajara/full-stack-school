"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";
import { useLiveDoc } from "@/lib/live";
import type { PrivateProfile } from "@/lib/types";
import { FormProps, FormShell, Section, useSubmit } from "./kit";

const ParentForm = ({ type, data, setOpen }: FormProps) => {
  const priv = useLiveDoc<PrivateProfile>(data?.id ? `private/${data.id}` : null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentSchema>({ resolver: zodResolver(parentSchema) });

  const { busy, error, run } = useSubmit(type === "create" ? createParent : updateParent, {
    success: `Guardian has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  if (priv.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Add a guardian" : "Update the guardian"}
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
          hint={type === "update" ? "Usernames cannot be changed." : "e.g. the phone number"}
          inputProps={{ readOnly: type === "update" }}
        />
        <InputField label="Email" name="email" defaultValue={data?.email ?? ""} register={register} error={errors?.email} />
        {type === "create" && (
          <InputField label="Password" name="password" type="password" register={register} error={errors?.password} />
        )}
      </Section>
      <Section title="Personal Information">
        <InputField label="First Name" name="name" defaultValue={data?.name} register={register} error={errors.name} />
        <InputField label="Last Name" name="surname" defaultValue={data?.surname} register={register} error={errors.surname} />
        <InputField label="Phone" name="phone" defaultValue={data?.phone} register={register} error={errors.phone} hint="The number that pays fees by M-Pesa" />
        <InputField label="Relationship" name="relationship" defaultValue={data?.relationship} register={register} hint="e.g. Mother, Uncle, Sponsor" />
        <InputField label="Address" name="address" defaultValue={priv.data?.address} register={register} error={errors.address} />
        <InputField label="National ID" name="nationalId" defaultValue={priv.data?.nationalId} register={register} />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
      </Section>
    </FormShell>
  );
};

export default ParentForm;
