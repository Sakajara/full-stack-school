# Chuo

Management system for Kenyan universities and colleges: students, lecturers,
timetables, CATs and exams, transcripts, attendance, and fees split between
the Universities Fund, HELB, households, bursaries and sponsors.

It runs entirely on the free (Spark) plan of Google Firebase and installs on
phones as a Progressive Web App. Everything updates live: when the finance
office verifies an M-Pesa payment, the student's balance changes on their
phone at once.

Based on the Lama Dev school dashboard tutorial
([safak/full-stack-school](https://github.com/safak/full-stack-school)). See
[docs/RESTRUCTURING.md](docs/RESTRUCTURING.md) for what changed and why.

## What it does

| Role | Can |
|---|---|
| Administrator (registry) | Set up faculties, departments, programmes, classes, units and the timetable; admit students; add lecturers, guardians and office staff; archive and restore records; everything below |
| Finance office | Fee structures, funding schemes and payers; issue semester invoices; record and verify payments; record HELB, Universities Fund and bursary transfers; statements |
| Lecturer | Their timetable, students and units; set CATs, assignments and exams on their own lessons; mark sheets; class registers |
| Student | Timetable, results, provisional transcript, fee statement, exam card once fees are cleared, report an M-Pesa payment |
| Guardian | The same for each of their children |

The funding rules are data, not code. The 2023 banding model, the full
funding announced in July 2026, and the all-loan model in the Tertiary
Education Placement and Funding Bill, 2026 are all included as schemes; the
finance office picks one when issuing invoices, and can add more as the
policy changes.

## Running it locally

Needs Node.js 20 or newer and Java 11 or newer (for the Firebase emulators).

```bash
npm install
npm run dev:emulators   # terminal 1: local Auth and Firestore
npm run dev             # terminal 2: http://localhost:3000
```

Without a `.env.local`, the app talks to the local emulators. Open
http://localhost:3000, follow "Set it up now" to create the institution and
the first administrator, and sign in. The emulator UI at
http://localhost:4000 shows the data.

## Loading an institution's structure

`data/mmu.json` holds the public academic structure of the Multimedia
University of Kenya: its 6 faculties and 16 departments, 25 degree and 5
diploma programmes with their KUCCPS codes, 18 units from its e-learning
catalogue, and year-1 programme costs. Each part names its source. Load it
(or a file in the same shape for another institution) as an administrator:

```bash
CHUO_ADMIN_USERNAME=admin CHUO_ADMIN_PASSWORD=... npm run seed:structure data/mmu.json
```

It can be run again safely: records are matched by code and updated.

## Themes

Light and dark themes follow the device by default; users can pick one
under Settings or with the moon/sun button in the top bar. All colours are
CSS variables in `src/app/globals.css`, so a theme is changed in one place.

## Tests

```bash
npm test             # grading, fee splitting, search, timetable logic
npm run test:rules   # security rules: who can read and write what
npm run test:flow    # a whole semester end to end against the emulators
npm run typecheck && npm run lint && npm run build
```

The flow test runs the app's own code as each role in turn: setup, admissions,
timetable clashes, marks, invoices split by band, a guardian's M-Pesa report
verified by the office, a HELB transfer across students, a reversal, and
archiving.

## Deploying (free)

1. Create a Firebase project at https://console.firebase.google.com (the
   Spark plan is enough).
2. In the project: Build > Authentication > enable Email/Password; Build >
   Firestore Database > create it in `africa-south1` (Johannesburg, closest
   to Kenya). Do this before the first deploy: deploying rules to a project
   without a database creates one in the United States (`nam5`), and a
   database's location can never be changed.
3. Project settings > Your apps > add a Web app, then copy its config into
   `.env.local` (see `.env.example`).
4. Deploy:

   ```bash
   npx firebase login
   # set your project id as "prod" in .firebaserc
   npm run deploy                # builds, then deploys hosting, rules and indexes
   ```

5. Open the site and run the one-time setup.

On a phone, open the site and choose "Add to Home screen" (Android) or
Share > "Add to Home Screen" (iPhone).

### Free-plan limits to know about

- 50,000 document reads and 20,000 writes a day. Lists are paged and counts
  use aggregation queries, so a department or a small college fits
  comfortably. A large university will outgrow it; the Blaze plan then costs
  about USD 0.06 per 100,000 reads, with no code changes.
- No file storage on Spark: profile photos are shrunk in the browser and
  kept in the record (about 20 KB each).
- No server code on Spark, so M-Pesa payments are confirmed by the finance
  office against the paybill statement rather than automatically. Adding
  Daraja callbacks needs the Blaze plan and one Cloud Function.
- A forgotten password can be reset only for users who added a recovery
  email under Settings. Resetting it for someone else needs the Admin SDK,
  which also needs a server.

## How access is controlled

`firestore.rules` is the security boundary. Google checks it on every read
and write, whatever the browser does. The route guard in the app only
decides what to show. Among other things, the rules ensure:

- only administrators create or change people, classes and units;
- lecturers set exams and enter marks only for their own lessons;
- students and guardians read only their own (or their children's) marks,
  attendance, invoices and payments;
- birthdays, blood types, national IDs and addresses are hidden from
  lecturers;
- students report payments only as pending, only for themselves, and never
  the same M-Pesa code twice;
- nothing is ever hard-deleted; records are archived.

## Project layout

```
firestore.rules            security rules (tested in tests/rules)
firestore.indexes.json     composite indexes for the app's queries
src/lib/types.ts           the data model
src/lib/actions.ts         writes for people, academics, calendar, messages
src/lib/finance-actions.ts invoices, payments, transfers, reconciliation
src/lib/funding.ts         payers, funding schemes and fee splitting
src/lib/grading.ts         CAT 30 / exam 70, supplementaries, classification
src/lib/live.ts            live Firestore queries used by every page
src/app/                   pages (static export)
public/sw.js               offline app shell
```
