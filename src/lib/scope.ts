"use client";

import { query, where } from "firebase/firestore";
import { useAuth } from "./auth-context";
import { col, useLiveDoc, useLiveQuery } from "./live";
import type { Lesson, Student } from "./types";

// The classes that concern the signed-in user: a student's own class, a
// guardian's children's classes, the classes a lecturer teaches. Office
// staff see everything (null).
export const useMyClassIds = (): { ids: string[] | null; loading: boolean } => {
  const { role, user } = useAuth();
  const uid = user?.uid ?? "";
  const me = useLiveDoc<Student>(role === "student" ? `students/${uid}` : null);
  const children = useLiveQuery<Student>(
    () => (role === "parent" ? query(col("students"), where("parentId", "==", uid)) : null),
    `children|${role}|${uid}`
  );
  const lessons = useLiveQuery<Lesson>(
    () => (role === "teacher" ? query(col("lessons"), where("teacherId", "==", uid), where("active", "==", true)) : null),
    `mylessons|${role}|${uid}`
  );

  if (role === "admin" || role === "finance") return { ids: null, loading: false };
  if (role === "student") return { ids: me.data ? [me.data.classId] : [], loading: me.loading };
  if (role === "parent")
    return { ids: Array.from(new Set(children.data.map((c) => c.classId))), loading: children.loading };
  if (role === "teacher")
    return { ids: Array.from(new Set(lessons.data.map((l) => l.classId))), loading: lessons.loading };
  return { ids: [], loading: false };
};

// Firestore "in" filters take at most 30 values.
export const firstIds = (ids: string[]) => (ids.length ? ids.slice(0, 29) : ["-none-"]);

// Filters a query must carry for the security rules to allow it: a student
// may only ask for their own records, a guardian for their children's, and a
// lecturer (for marks and attendance) for their own classes'.
export const ownerFilters = (
  role: string | null,
  uid: string | undefined,
  opts: { teacherScoped?: boolean } = {}
) => {
  if (!uid) return [where("studentId", "==", "-none-")];
  if (role === "student") return [where("studentId", "==", uid)];
  if (role === "parent") return [where("parentId", "==", uid)];
  if (role === "teacher" && opts.teacherScoped) return [where("teacherId", "==", uid)];
  return [];
};
