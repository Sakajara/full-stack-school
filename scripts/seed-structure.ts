// Loads an institution's academic structure (faculties, departments,
// programmes, units and year-1 government-sponsored fee structures) from a
// data file, using the app's own actions, signed in as an administrator.
// Safe to run again: records are matched by code and updated, not
// duplicated.
//
//   CHUO_ADMIN_USERNAME=admin CHUO_ADMIN_PASSWORD=... \
//     npx tsx --env-file=.env.local scripts/seed-structure.ts data/mmu.json

import { readFileSync } from "node:fs";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { saveDepartment, saveFaculty, saveProgramme, createSubject, updateSubject, institution } from "@/lib/actions";
import { saveFeeStructure } from "@/lib/finance-actions";
import { firebase, usernameToEmail } from "@/lib/firebase";
import type { ProgrammeLevel } from "@/lib/types";

type Data = {
  institution: string;
  faculties: { code: string; name: string }[];
  departments: { code: string; name: string; faculty: string }[];
  programmes: { code: string; name: string; level: ProgrammeLevel; department: string; years: number; cost: number | null }[];
  units: { code: string; name: string; department: string | null; creditHours?: number }[];
};

const file = process.argv[2];
if (!file) throw new Error("Usage: seed-structure.ts <data.json>");
const data = JSON.parse(readFileSync(file, "utf8")) as Data;

const { auth, db } = firebase();

const idByCode = async (col: string, code: string) => {
  const snap = await getDocs(query(collection(db, col), where("code", "==", code.toUpperCase())));
  return snap.empty ? undefined : snap.docs[0].id;
};

const main = async () => {
  const username = process.env.CHUO_ADMIN_USERNAME;
  const password = process.env.CHUO_ADMIN_PASSWORD;
  if (!username || !password) throw new Error("Set CHUO_ADMIN_USERNAME and CHUO_ADMIN_PASSWORD.");
  await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  console.log(`Signed in to ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "the emulator"}. Loading ${data.institution}.`);

  const faculty: Record<string, string> = {};
  for (const f of data.faculties) {
    await saveFaculty({ id: await idByCode("faculties", f.code), code: f.code, name: f.name });
    faculty[f.code] = (await idByCode("faculties", f.code))!;
  }
  console.log(`${data.faculties.length} faculties`);

  const dept: Record<string, string> = {};
  for (const d of data.departments) {
    await saveDepartment({ id: await idByCode("departments", d.code), code: d.code, name: d.name, facultyId: faculty[d.faculty] });
    dept[d.code] = (await idByCode("departments", d.code))!;
  }
  console.log(`${data.departments.length} departments`);

  const programme: Record<string, string> = {};
  for (const p of data.programmes) {
    await saveProgramme({
      id: await idByCode("programmes", p.code),
      code: p.code,
      name: p.name,
      level: p.level,
      departmentId: dept[p.department],
      durationYears: p.years,
      semestersPerYear: 2,
      passMark: 40,
    });
    programme[p.code] = (await idByCode("programmes", p.code))!;
  }
  console.log(`${data.programmes.length} programmes`);

  for (const u of data.units) {
    const input = {
      code: u.code,
      name: u.name,
      creditHours: u.creditHours ?? 3,
      departmentId: u.department ? dept[u.department] : "",
      teachers: [],
    };
    const id = await idByCode("subjects", u.code);
    if (id) await updateSubject({ ...input, id });
    else await createSubject(input);
  }
  console.log(`${data.units.length} units`);

  // The published figure is the year's programme cost; MMU runs two
  // semesters, so each semester is billed half.
  const inst = await institution();
  let structures = 0;
  for (const p of data.programmes) {
    if (!p.cost) continue;
    const first = Math.floor(p.cost / 2);
    for (const [semester, amount] of [[1, first], [2, p.cost - first]] as const) {
      await saveFeeStructure({
        programmeId: programme[p.code],
        sponsorship: "GSS",
        gradeLevel: 1,
        academicYear: inst.academicYear,
        semester,
        items: [{ name: "Programme cost (KUCCPS year 1, semester share)", amount }],
      });
      structures++;
    }
  }
  console.log(`${structures} fee structures for ${inst.academicYear}`);
  await signOut(auth);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
