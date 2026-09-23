"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { eventSchema, EventSchema } from "@/lib/formValidationSchemas";
import { createEvent, updateEvent } from "@/lib/actions";
import { useOptions } from "@/lib/options";
import { dateTimeInput, FormProps, FormShell, SelectField, TextAreaField, useSubmit } from "./kit";

const EventForm = ({ type, data, setOpen }: FormProps) => {
  const classes = useOptions("classes");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    defaultValues: { classId: data?.classId ?? "" },
  });
  const { busy, error, run } = useSubmit(type === "create" ? createEvent : updateEvent, {
    success: `Event has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });
  if (classes.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell
      title={type === "create" ? "Create a new event" : "Update the event"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Title" name="title" defaultValue={data?.title} register={register} error={errors.title} />
        <InputField label="Starts" name="startTime" type="datetime-local" defaultValue={dateTimeInput(data?.startTime)} register={register} error={errors.startTime} />
        <InputField label="Ends" name="endTime" type="datetime-local" defaultValue={dateTimeInput(data?.endTime)} register={register} error={errors.endTime} />
        <SelectField label="For class" name="classId" register={register} options={classes.options} placeholder="Everyone" />
        {data && <InputField label="Id" name="id" defaultValue={data?.id} register={register} hidden />}
        <TextAreaField label="Description" name="description" defaultValue={data?.description} register={register} error={errors.description} />
      </div>
    </FormShell>
  );
};

export default EventForm;
