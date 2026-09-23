"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { announcementSchema, AnnouncementSchema } from "@/lib/formValidationSchemas";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { dateInput, FormProps, FormShell, SelectField, TextAreaField, useSubmit } from "./kit";

const AnnouncementForm = ({ type, data, setOpen }: FormProps) => {
  const classes = useOptions("classes");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { classId: data?.classId ?? "" },
  });
  const { busy, error, run } = useSubmit(type === "create" ? createAnnouncement : updateAnnouncement, {
    success: `Announcement has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });
  if (classes.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell
      title={type === "create" ? "Create a new announcement" : "Update the announcement"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Title" name="title" defaultValue={data?.title} register={register} error={errors.title} />
        <InputField label="Date" name="date" type="date" defaultValue={dateInput(data?.date) ?? dateInput(new Date())} register={register} error={errors.date} />
        <SelectField label="For class" name="classId" register={register} options={classes.options} placeholder="Everyone" />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <TextAreaField label="Description" name="description" defaultValue={data?.description} register={register} error={errors.description} />
      </div>
    </FormShell>
  );
};

export default AnnouncementForm;
