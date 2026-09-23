"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { saveInstitution } from "@/lib/actions";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { LOGIN_DOMAIN } from "@/lib/firebase";
import { institutionSchema } from "@/lib/formValidationSchemas";
import { useState } from "react";
import { toast } from "react-toastify";

const field = "ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white p-4 rounded-md flex flex-col gap-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const PasswordCard = () => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Change password">
      <form
        className="flex flex-col gap-2 max-w-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (next.length < 8) return setError("The new password must be at least 8 characters.");
          if (next !== confirm) return setError("The new passwords do not match.");
          setBusy(true);
          try {
            await changePassword(current, next);
            setCurrent("");
            setNext("");
            setConfirm("");
            toast("Password changed.");
          } catch (err) {
            setError(authErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="password" autoComplete="current-password" placeholder="Current password" className={field} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <input type="password" autoComplete="new-password" placeholder="New password" className={field} value={next} onChange={(e) => setNext(e.target.value)} required />
        <input type="password" autoComplete="new-password" placeholder="Repeat new password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {error && <Notice tone="error">{error}</Notice>}
        <button disabled={busy} className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60">{busy ? "Saving..." : "Change password"}</button>
      </form>
    </Card>
  );
};

const RecoveryCard = () => {
  const { user, addRecoveryEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = user?.email && !user.email.endsWith(LOGIN_DOMAIN) ? user.email : null;
  return (
    <Card title="Recovery email">
      <p className="text-sm text-gray-500">
        {current
          ? `Your recovery email is ${current}. Sign in with it, and use it to reset a forgotten password.`
          : "Without a recovery email, a forgotten password cannot be reset. Once you add and confirm one, you sign in with that email instead of your username."}
      </p>
      <form
        className="flex gap-2 max-w-md flex-wrap"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await addRecoveryEmail(email);
            toast("Check your inbox and open the link to confirm.");
            setEmail("");
          } catch (err) {
            setError(authErrorMessage(err));
          }
        }}
      >
        <input type="email" required placeholder="you@example.com" className={`${field} flex-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="bg-lamaYellow py-2 px-4 rounded-md text-sm">{current ? "Change" : "Add"}</button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </Card>
  );
};

const InstitutionCard = () => {
  const { institution } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!institution) return null;
  const fields: [keyof typeof institution, string, string?][] = [
    ["name", "Full name"],
    ["shortName", "Short name"],
    ["motto", "Motto"],
    ["academicYear", "Current academic year", "e.g. 2026/2027"],
    ["semester", "Current semester"],
    ["paybill", "M-Pesa paybill"],
    ["bankDetails", "Bank details for fee payments"],
    ["examCardThreshold", "Fees paid before an exam card (%)"],
    ["supplementaryCap", "Supplementary mark cap"],
  ];
  return (
    <Card title="Institution">
      <Notice>
        Changing the academic year or semester moves everyone to it: new exams, CATs, marks and invoices are filed
        under the new semester. Earlier records keep theirs.
      </Notice>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const r = institutionSchema.safeParse(data);
          if (!r.success) {
            setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
            return;
          }
          setErrors({});
          setBusy(true);
          try {
            await saveInstitution(r.data);
            toast("Settings saved.");
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {fields.map(([name, label, hint]) => (
          <label key={name} className="flex flex-col gap-1 w-full md:w-[48%]">
            <span className="text-xs text-gray-500">{label}</span>
            <input name={name} defaultValue={String(institution[name] ?? "")} className={field} />
            {hint && !errors[name] && <span className="text-[11px] text-gray-400">{hint}</span>}
            {errors[name] && <span className="text-xs text-red-400">{errors[name]}</span>}
          </label>
        ))}
        <button disabled={busy} className="bg-blue-400 text-white p-2 px-6 rounded-md disabled:opacity-60">
          {busy ? "Saving..." : "Save"}
        </button>
      </form>
    </Card>
  );
};

const SettingsPage = () => {
  const { role } = useAuth();
  return (
    <div className="p-4 pt-0 flex flex-col gap-4 xl:w-2/3">
      <PasswordCard />
      <RecoveryCard />
      {role === "admin" && <InstitutionCard />}
    </div>
  );
};

export default withSuspense(SettingsPage);
