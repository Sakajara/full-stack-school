import type { Role } from "./types";

export const ITEM_PER_PAGE = 10;

const ALL: Role[] = ["admin", "finance", "teacher", "student", "parent"];
const OFFICE: Role[] = ["admin", "finance"];

// Which roles may open which pages. This only decides what the interface
// shows; firestore.rules enforce what data each role can actually read or
// change. The first matching pattern wins.
export const routeAccessMap: [string, Role[]][] = [
  ["/admin(.*)", ["admin"]],
  ["/finance(.*)", OFFICE],
  ["/student(.*)", ["student"]],
  ["/teacher(.*)", ["teacher"]],
  ["/parent(.*)", ["parent"]],
  ["/list/teachers(.*)", ["admin", "finance", "teacher"]],
  ["/list/students(.*)", ["admin", "finance", "teacher"]],
  ["/list/parents(.*)", ["admin", "finance", "teacher"]],
  ["/list/subjects(.*)", ["admin", "teacher"]],
  ["/list/classes(.*)", ["admin", "teacher"]],
  ["/list/lessons(.*)", ["admin", "teacher"]],
  ["/list/staff(.*)", ["admin"]],
  ["/list/faculties(.*)", ["admin"]],
  ["/list/departments(.*)", ["admin"]],
  ["/list/programmes(.*)", ["admin"]],
  ["/list/exams(.*)", ALL],
  ["/list/assignments(.*)", ALL],
  ["/list/results(.*)", ALL],
  ["/list/attendance(.*)", ALL],
  ["/list/events(.*)", ALL],
  ["/list/announcements(.*)", ALL],
  ["/list/messages(.*)", ALL],
  ["/transcript(.*)", ["admin", "student", "parent"]],
  ["/fees/structures(.*)", ALL],
  ["/fees/statement(.*)", ["admin", "finance", "student", "parent"]],
  ["/fees/payments(.*)", ["admin", "finance", "student", "parent"]],
  ["/fees(.*)", OFFICE],
  ["/profile(.*)", ALL],
  ["/settings(.*)", ALL],
  ["/logout(.*)", ALL],
];

const compiled = routeAccessMap.map(
  ([pattern, roles]) => [new RegExp(`^${pattern}$`), roles] as const
);

export const allowedRoles = (pathname: string): Role[] | null => {
  const clean = pathname.replace(/\/+$/, "") || "/";
  for (const [re, roles] of compiled) if (re.test(clean)) return roles;
  return null;
};

export const canAccess = (pathname: string, role: Role | null) => {
  if (!role) return false;
  const roles = allowedRoles(pathname);
  return roles === null || roles.includes(role);
};

export const homeFor = (role: Role) => `/${role}`;
