# Restructuring plan

This app started as a tutorial school dashboard (Next.js, Clerk, Prisma,
PostgreSQL, Cloudinary). This plan turns it into a management system for
Kenyan universities and colleges, with fee and funding tracking, running
entirely on the free tier of Google Firebase, and installable on phones as a
Progressive Web App.

The rule for the restructuring: nothing is removed, everything is improved.
Every screen and feature in the original survives. Tutorial placeholders and
mock data are replaced by the real thing.

## 1. The niche: how Kenyan higher education works

### Structure

- Institutions are public universities, private universities and TVET
  colleges. Universities are regulated by the Commission for University
  Education (CUE).
- An institution is organised as faculties or schools, then departments, then
  programmes (certificate, diploma, degree, masters, PhD).
- Students are placed in public institutions by KUCCPS as Government
  Sponsored Students (GSS). Others join directly as Self-Sponsored (SSP,
  sometimes called Module II) and pay the full cost.
- Each student has an admission number (for example `SCT221-0001/2025`) that
  is also their login and their M-Pesa account number for fee payments.
- The year is split into two semesters (some institutions use trimesters).
  Students register for units (courses) each semester, identified by codes
  such as `SCO 201`.

### Assessment

- Each unit is marked as continuous assessment (CATs and assignments, 30%)
  plus the final examination (70%).
- Grades: A 70-100, B 60-69, C 50-59, D 40-49, E 0-39. Pass mark is 40 for
  most programmes (higher for some medical programmes).
- An E requires a supplementary examination, usually capped at 50 (grade C)
  when passed. Students who missed an exam for a valid reason sit a special
  examination, which is not capped.
- An exam card is issued only when the student has cleared their fees to the
  threshold the institution sets. This makes fee tracking and academics
  directly connected.
- Degrees are classified as First Class Honours, Second Class Upper,
  Second Class Lower, and Pass.

### Funding (the hard part, and the reason this app exists)

A government-sponsored student's fees are not paid by one party. They are
split between several payers:

| Payer | What it pays | How money arrives |
|---|---|---|
| Universities Fund | Scholarship share of tuition | Lump-sum remittance to the institution with a list of students |
| HELB | Loan share of tuition (plus upkeep paid to the student directly) | Lump-sum remittance with a student list |
| Household | The remaining share | M-Pesa paybill (account = admission number), bank deposit |
| County bursaries, NG-CDF, sponsors (Equity Wings to Fly, HEF, churches, employers) | Fixed amounts | Cheque or EFT, often with a list of beneficiaries |

Since 2023 the split has been decided by the Student-Centred Funding Model.
The Means Testing Instrument puts each student in one of five bands:

| Band | Monthly household income (KES) | Scholarship | Loan | Household | Upkeep loan |
|---|---|---|---|---|---|
| 1 | below 5,995 | 70% | 25% | 5% | 60,000 |
| 2 | 5,995 to 23,670 | 60% | 30% | 10% | 55,000 |
| 3 | 23,670 to 70,000 | 50% | 30% | 20% | 50,000 |
| 4 | 70,000 to 120,000 | 40% | 30% | 30% | 45,000 |
| 5 | above 120,000 | 30% | 30% | 40% | 40,000 |

**This policy is changing right now, and the app has to survive that.**

- The High Court declared the model unconstitutional in December 2024. The
  Court of Appeal stayed that ruling in March 2025, so the model still runs.
- In July 2026 the President announced "full funding" for every student
  placed in a public institution from September 2026, with household
  contribution becoming voluntary. No details have been published.
- The Tertiary Education Placement and Funding Bill, 2026 is in public
  participation (hearings in all 47 counties until 2 October 2026). It would
  merge HELB, the Universities Fund and the TVET Fund into one Tertiary
  Education Funding Authority (TEFA) and move to an all-loan model from 2027.
- The 2025/26 budget covered only about half of the Sh77.6 billion needed,
  so government shares often arrive late, partly, or not at all.

What this means for the design:

1. Funding policy is data, not code. An administrator defines funding
   schemes (bands and percentages, or a flat rule such as "100% government",
   or "100% loan") and chooses which one applies to each intake. When the law
   changes, nobody edits code.
2. Expected and received money are tracked separately for each payer. A
   student's statement shows "HELB expected 30,000, received 18,000" so that
   late or partial government remittances are visible, and are not
   mistaken for student debt.
3. Payers can be renamed or added (for example, when TEFA replaces HELB and
   the Universities Fund) without losing history.

Sources: Universities Fund, Citizen Digital, The Star (24 Aug 2026),
Tech-ish (21 Jul 2026), Education News (Sep 2026), Kenyans.co.ke.

## 2. Target architecture (free tier only)

The app must cost nothing to run. That rules out every Firebase product that
needs the Blaze plan: Cloud Functions, Cloud Storage (a Blaze requirement
since February 2026) and App Hosting.

| Concern | Before | After |
|---|---|---|
| Login | Clerk | Firebase Authentication (email/password; username is mapped to an internal email) |
| Database | PostgreSQL + Prisma | Cloud Firestore |
| Access control | Next.js middleware (bypassable) and none on writes | Firestore Security Rules, enforced by Google on every read and write, with automated tests |
| Images | Cloudinary | Resized in the browser to a small WebP and stored in the profile document |
| Hosting | A Node server | Static export on Firebase Hosting |
| Real-time | None (page loads a snapshot) | Firestore live listeners on every list and dashboard |
| Phones | Desktop layout | Responsive layout, installable PWA, offline reads through Firestore's local cache |

Consequences of having no server, and how each is handled:

- **Creating accounts:** an admin creates a user through a second, separate
  Firebase app instance, so the admin stays signed in.
- **Deleting accounts:** a browser cannot delete another person's login.
  Records are archived instead (status `inactive`), and the rules deny
  inactive accounts. Institutions must keep academic and financial records
  anyway, so archiving is the correct behaviour, not a workaround.
- **M-Pesa:** automatic confirmation (Daraja callbacks) needs a server.
  Instead, a student or guardian submits the M-Pesa code, and the finance
  office verifies it against the paybill statement. M-Pesa codes are unique,
  so a code cannot be recorded twice. Daraja can be added later if the
  institution ever moves to a paid plan.
- **Documents:** fee statements, exam cards and transcripts are printed from
  the browser.

Free-tier limits that shape the design: 50,000 document reads and 20,000
writes per day. Lists are paged, counts use aggregation queries (one read
per 1,000 records), and dashboard totals are kept in summary documents that
are updated in the same transaction as the change.

## 3. How existing features map to the new model

Nothing is removed. Existing entities keep their names in code and get
Kenyan higher-education labels in the interface.

| Original | Becomes |
|---|---|
| Teacher | Lecturer |
| Parent | Guardian / sponsor (pays the household share) |
| Grade (level) | Year of study |
| Class | Cohort or stream (programme + year + intake) |
| Subject | Unit (with code and credit hours) |
| Lesson | Timetable slot (with venue) |
| Assignment | CAT or assignment (continuous assessment) |
| Exam | Examination (main, supplementary, special) |
| Result | Mark, feeding the CAT 30 / exam 70 unit grade |
| Attendance chart | Real attendance, marked by lecturers per lesson |
| Finance chart (fake numbers) | Fees billed vs collected per month, by payer |
| Delete buttons | Archive, with restore |
| Menu links to missing pages | Real pages: attendance, messages, profile, settings, sign out |

New:

- Faculties, departments, programmes, academic years and semesters.
- Fee structures per programme, sponsorship type, year of study and
  academic year.
- Funding schemes (configurable policy), and a funding band per student.
- Invoices (one per student per semester), split by payer.
- Payments: M-Pesa, bank, cheque, EFT; pending until verified.
- Remittances: one HELB, Universities Fund or bursary transfer allocated
  across many students.
- Fee statement, receipts, and exam card with fee-clearance check.
- Transcript with unit grades, GPA-style average and classification.
- A finance role (bursar's office), besides admin, lecturer, student and
  guardian.

## 4. Phases

Each phase leaves the app working and ends with tests passing.

1. **Foundation.** Firebase project config and local emulators, sign-in
   with username, roles, client-side route guard, security rules with tests,
   static export for Firebase Hosting, PWA manifest and service worker,
   first-run setup that creates the first admin. Security updates for the
   dependencies.
2. **Port every existing screen** to Firestore with live updates, fixing
   every bug from the review (wrong delete handler, unguarded profile pages,
   password write failure, results search, crashes on bad input, and so on).
   Complete the seven missing forms. Replace every piece of mock data.
3. **Academic structure.** Faculties, departments, programmes, units,
   academic calendar, marks, unit grades, supplementaries, transcripts.
4. **Fees and funding.** Fee structures, funding schemes, invoicing,
   payments, remittances, statements, receipts, exam-card clearance, and
   the real finance chart.
5. **Deploy.** A Firebase project created by the owner, deployment
   instructions, and a checklist for installing the app on phones.

## 5. Status (23 September 2026)

Phases 1 to 4 are done on the `restructure/firebase-kenya` branch:

- Every original screen is ported to Firestore with live updates, and the
  seven missing forms exist. All mock data is gone: the dashboard counts,
  charts, finance chart, performance gauge, navbar and profiles read real
  records.
- Every flaw from the review is fixed, and each one has a test in
  `tests/rules` or `tests/integration` that would catch it coming back.
- Academic structure, marks, mark sheets, class registers, transcripts,
  fees, funding schemes, invoicing, payments, transfers, statements and exam
  cards are in place.
- Checked in a real browser against the emulators (desktop and phone width),
  for all five roles, with no console or permission errors.

Phase 5 (deployment) waits on the owner's Firebase project.

Not done yet, and worth doing next:

- Unit registration per semester (students currently take every unit on
  their class timetable).
- Bulk import of students from a KUCCPS placement list or a spreadsheet.
- An offline tool, possibly in Swa, that reconciles an exported M-Pesa
  paybill statement against payments recorded in the app.

## 6. Owner actions needed

- Create a free Firebase project (Spark plan) at console.firebase.google.com,
  enable Email/Password sign-in and Firestore, and add the web app config to
  `.env.local` (see `.env.example`).
- Until then, everything runs and is tested against the local Firebase
  emulators, which need Java 11 or newer.
