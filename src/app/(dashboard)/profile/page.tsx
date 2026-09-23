"use client";

import ProfileCard from "@/components/ProfileCard";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import { ROLE_LABEL, SPONSORSHIP_LABEL, type Person, type PrivateProfile, type Student, type Teacher } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { query, where } from "firebase/firestore";
import Link from "next/link";

const COLLECTION = { admin: "admins", finance: "admins", teacher: "teachers", student: "students", parent: "parents" };

const ProfilePage = () => {
  const { user, role, profile } = useAuth();
  const uid = user?.uid;
  const me = useLiveDoc<Person & Partial<Student> & Partial<Teacher>>(uid && role ? `${COLLECTION[role]}/${uid}` : null);
  const priv = useLiveDoc<PrivateProfile>(uid && role !== "admin" && role !== "finance" ? `private/${uid}` : null);
  const children = useLiveQuery<Student>(
    () => (role === "parent" && uid ? query(col("students"), where("parentId", "==", uid)) : null),
    `profile-children|${uid}`
  );

  if (me.loading || !role) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  const p = me.data;

  const subtitle =
    role === "student" && p
      ? `${p.admissionNo} · ${p.programmeName ?? ""} · ${p.className} · ${p.sponsorship ? SPONSORSHIP_LABEL[p.sponsorship] : ""}`
      : role === "teacher" && p
      ? [p.staffNo, p.departmentName].filter(Boolean).join(" · ")
      : ROLE_LABEL[role];

  return (
    <div className="p-4 pt-0 flex flex-col gap-4 xl:w-2/3">
      <ProfileCard
        img={p?.img}
        name={p ? `${p.name} ${p.surname}` : profile?.displayName ?? ""}
        subtitle={subtitle}
        details={[
          { icon: "/blood.png", value: priv.data?.bloodType, label: "Blood type" },
          { icon: "/date.png", value: priv.data?.birthday ? formatDate(priv.data.birthday) : null, label: "Birthday" },
          { icon: "/mail.png", value: p?.email, label: "Email" },
          { icon: "/phone.png", value: p?.phone, label: "Phone" },
        ]}
      />
      <div className="bg-surface p-4 rounded-md text-sm flex flex-col gap-2">
        <p>
          Signed in as <strong>{profile?.username}</strong> ({ROLE_LABEL[role]}).
        </p>
        {priv.data?.address && <p>Address: {priv.data.address}</p>}
        {priv.data?.county && <p>County: {priv.data.county}</p>}
        <p className="text-xs text-gray-400">
          To correct your details, contact the registry office. You can change your password and add a recovery email
          under <Link href="/settings" className="underline">Settings</Link>.
        </p>
      </div>
      {role === "parent" && (
        <div className="bg-surface p-4 rounded-md text-sm flex flex-col gap-2">
          <h2 className="font-semibold">Students</h2>
          {children.data.map((c) => (
            <div key={c.id} className="flex justify-between flex-wrap gap-2 border-b border-gray-100 py-2">
              <span>
                {c.name} {c.surname} ({c.admissionNo}), {c.className}
              </span>
              <span className="flex gap-3 text-xs">
                <Link className="underline" href={`/fees/statement?id=${c.id}`}>Fees</Link>
                <Link className="underline" href={`/transcript?id=${c.id}`}>Transcript</Link>
                <Link className="underline" href={`/list/results?studentId=${c.id}`}>Results</Link>
              </span>
            </div>
          ))}
          {!children.loading && !children.data.length && <p className="text-gray-400">No students linked yet.</p>}
        </div>
      )}
    </div>
  );
};

export default withSuspense(ProfilePage);
