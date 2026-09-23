"use client";

import { bootstrap } from "@/lib/actions";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { institutionSchema } from "@/lib/formValidationSchemas";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

const adminSchema = z.object({
  username: z.string().trim().min(3, "At least 3 characters").regex(/^[A-Za-z0-9._-]+$/, "Letters, digits, . _ - only"),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().trim().min(1, "Required"),
  surname: z.string().trim().min(1, "Required"),
});

const thisYear = new Date().getFullYear();
const defaultYear = new Date().getMonth() >= 7 ? `${thisYear}/${thisYear + 1}` : `${thisYear - 1}/${thisYear}`;

const Field = ({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  error?: string;
  hint?: string;
}) => (
  <label className="flex flex-col gap-1 w-full sm:w-[48%]">
    <span className="text-xs text-gray-500">{label}</span>
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
    />
    {hint && !error && <span className="text-[11px] text-gray-400">{hint}</span>}
    {error && <span className="text-xs text-red-400">{error}</span>}
  </label>
);

const SetupPage = () => {
  const { setupDone, role } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role) router.replace(`/${role}`);
    else if (setupDone) router.replace("/");
  }, [setupDone, role, router]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFailure(null);
    const form = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    // The institution and the administrator both have a "name"; the
    // administrator's is submitted as name_admin.
    const a = adminSchema.safeParse({ ...form, name: form.name_admin });
    const i = institutionSchema.safeParse(form);
    const errs: Record<string, string> = {};
    if (!a.success) {
      for (const issue of a.error.issues) {
        const key = issue.path[0] === "name" ? "name_admin" : String(issue.path[0]);
        errs[key] ??= issue.message;
      }
    }
    if (!i.success) for (const issue of i.error.issues) errs[String(issue.path[0])] ??= issue.message;
    setErrors(errs);
    if (!a.success || !i.success) return;
    setBusy(true);
    try {
      await bootstrap(a.data, i.data);
      router.replace("/admin");
    } catch (err) {
      setFailure(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-lamaSkyLight flex justify-center p-4">
      <form onSubmit={submit} className="bg-surface rounded-md shadow-2xl p-6 sm:p-10 w-full max-w-2xl flex flex-col gap-6 my-auto">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image src="/logo.png" alt="" width={24} height={24} />
            Set up your institution
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            This runs once. It creates the first administrator account and the basic settings. The
            default funding schemes (the 2023 banding model and the proposals announced in 2026) and
            payers (Universities Fund, HELB, household, bursaries) are added for you and can be
            changed later.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-gray-400 font-medium">Institution</h2>
          <div className="flex flex-wrap justify-between gap-3">
            <Field label="Full name" name="name" error={errors.name} hint="e.g. Kirinyaga University" />
            <Field label="Short name" name="shortName" error={errors.shortName} hint="Shown in the app, e.g. KyU" />
            <Field label="Current academic year" name="academicYear" defaultValue={defaultYear} error={errors.academicYear} />
            <Field label="Current semester" name="semester" type="number" defaultValue={1} error={errors.semester} />
            <Field label="M-Pesa paybill (optional)" name="paybill" error={errors.paybill} />
            <Field
              label="Fees paid before an exam card is issued (%)"
              name="examCardThreshold"
              type="number"
              defaultValue={100}
              error={errors.examCardThreshold}
            />
            <Field
              label="Supplementary mark cap"
              name="supplementaryCap"
              type="number"
              defaultValue={50}
              error={errors.supplementaryCap}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-gray-400 font-medium">First administrator</h2>
          <div className="flex flex-wrap justify-between gap-3">
            <Field label="First name" name="name_admin" error={errors.name_admin} />
            <Field label="Last name" name="surname" error={errors.surname} />
            <Field label="Username" name="username" error={errors.username} hint="Used to sign in" />
            <Field label="Password" name="password" type="password" error={errors.password} />
          </div>
        </section>

        {failure && <p className="text-sm text-red-500" role="alert">{failure}</p>}
        <button disabled={busy} className="bg-blue-500 text-white rounded-md text-sm p-[10px] disabled:opacity-60">
          {busy ? "Setting up..." : "Create institution"}
        </button>
      </form>
    </div>
  );
};

export default SetupPage;
