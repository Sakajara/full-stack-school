"use client";

import { useAuth } from "@/lib/auth-context";
import { col, useCount } from "@/lib/live";
import { query, where } from "firebase/firestore";
import Link from "next/link";

const SOURCES = {
  admin: { collection: "admins", label: "Office staff", href: "/list/staff" },
  teacher: { collection: "teachers", label: "Lecturers", href: "/list/teachers" },
  student: { collection: "students", label: "Students", href: "/list/students" },
  parent: { collection: "parents", label: "Guardians", href: "/list/parents" },
};

const UserCard = ({ type }: { type: keyof typeof SOURCES }) => {
  const { institution } = useAuth();
  const source = SOURCES[type];
  const count = useCount(
    () => query(col(source.collection), where("active", "==", true)),
    `usercard|${type}`
  );

  return (
    <Link
      href={source.href}
      className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]"
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          {institution?.academicYear ?? ""}
        </span>
      </div>
      <h1 className="text-2xl font-semibold my-4">{count ?? "..."}</h1>
      <h2 className="text-sm font-medium text-gray-500">{source.label}</h2>
    </Link>
  );
};

export default UserCard;
