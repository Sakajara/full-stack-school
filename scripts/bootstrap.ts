// One-time setup of a new installation without going through the web page,
// so the setup screen is never open to the public on a fresh deploy.
//
//   CHUO_ADMIN_USERNAME=admin CHUO_ADMIN_PASSWORD=... CHUO_ADMIN_NAME=... \
//   CHUO_ADMIN_SURNAME=... CHUO_INSTITUTION_NAME=... CHUO_INSTITUTION_SHORT=... \
//     npx tsx --env-file=.env.local scripts/bootstrap.ts

import { signOut } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { bootstrap } from "@/lib/actions";
import { firebase } from "@/lib/firebase";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k}.`);
  return v;
};

const main = async () => {
  const { auth, db } = firebase();
  if ((await getDoc(doc(db, "meta/setup"))).exists()) {
    console.log("Already set up; nothing to do.");
    process.exit(0);
  }
  const year = new Date().getFullYear();
  const academicYear = process.env.CHUO_ACADEMIC_YEAR ?? (new Date().getMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`);
  await bootstrap(
    {
      username: need("CHUO_ADMIN_USERNAME"),
      password: need("CHUO_ADMIN_PASSWORD"),
      name: need("CHUO_ADMIN_NAME"),
      surname: need("CHUO_ADMIN_SURNAME"),
    },
    {
      name: need("CHUO_INSTITUTION_NAME"),
      shortName: need("CHUO_INSTITUTION_SHORT"),
      academicYear,
      semester: Number(process.env.CHUO_SEMESTER ?? 1),
      paybill: process.env.CHUO_PAYBILL ?? "",
      examCardThreshold: Number(process.env.CHUO_EXAM_CARD_THRESHOLD ?? 100),
      supplementaryCap: 50,
    }
  );
  console.log(`Set up ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}: ${academicYear}, administrator "${process.env.CHUO_ADMIN_USERNAME}".`);
  await signOut(auth);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
