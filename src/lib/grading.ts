// Assessment rules used across Kenyan universities (CUE guidelines):
// continuous assessment 30%, final examination 70%; A 70-100, B 60-69,
// C 50-59, D 40-49, E below 40. A failed unit is retaken as a
// supplementary examination, capped (usually at 50). A special
// examination, for students who missed the main one for a valid reason, is
// not capped.

export const COURSEWORK_WEIGHT = 30;
export const EXAM_WEIGHT = 70;
export const DEFAULT_PASS_MARK = 40;
export const DEFAULT_SUPPLEMENTARY_CAP = 50;

export type Letter = "A" | "B" | "C" | "D" | "E";

export const letterGrade = (mark: number): Letter =>
  mark >= 70 ? "A" : mark >= 60 ? "B" : mark >= 50 ? "C" : mark >= 40 ? "D" : "E";

export type Assessed = {
  kind: "cat" | "assignment" | "main" | "supplementary" | "special";
  score: number;
  maxScore: number;
};

export type UnitOutcome = {
  coursework: number | null; // out of 30
  exam: number | null; // out of 70
  mark: number | null; // out of 100
  grade: Letter | null;
  passed: boolean | null;
  status: "complete" | "incomplete" | "supplementary" | "passed_supplementary";
};

const percent = (a: Assessed) => (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0);

const round1 = (n: number) => Math.round(n * 10) / 10;

export const unitOutcome = (
  assessments: Assessed[],
  passMark = DEFAULT_PASS_MARK,
  supplementaryCap = DEFAULT_SUPPLEMENTARY_CAP
): UnitOutcome => {
  const coursework = assessments.filter((a) => a.kind === "cat" || a.kind === "assignment");
  const byKind = (k: Assessed["kind"]) => assessments.find((a) => a.kind === k);

  const cw = coursework.length
    ? (coursework.reduce((s, a) => s + percent(a), 0) / coursework.length) * (COURSEWORK_WEIGHT / 100)
    : null;

  // A special examination replaces a missed main examination.
  const sitting = byKind("special") ?? byKind("main");
  const ex = sitting ? percent(sitting) * (EXAM_WEIGHT / 100) : null;

  if (cw === null || ex === null) {
    return {
      coursework: cw === null ? null : round1(cw),
      exam: ex === null ? null : round1(ex),
      mark: null,
      grade: null,
      passed: null,
      status: "incomplete",
    };
  }

  const first = round1(cw + ex);
  const supp = byKind("supplementary");

  if (first >= passMark || !supp) {
    return {
      coursework: round1(cw),
      exam: round1(ex),
      mark: first,
      grade: letterGrade(first),
      passed: first >= passMark,
      status: first >= passMark ? "complete" : "supplementary",
    };
  }

  // The supplementary examination is marked out of 100 on its own and the
  // result is capped.
  const suppMark = round1(percent(supp));
  const passedSupp = suppMark >= passMark;
  const mark = passedSupp ? Math.min(suppMark, supplementaryCap) : suppMark;
  return {
    coursework: round1(cw),
    exam: round1(ex),
    mark,
    grade: letterGrade(mark),
    passed: passedSupp,
    status: passedSupp ? "passed_supplementary" : "supplementary",
  };
};

// Credit-weighted mean of unit marks.
export const weightedMean = (units: { mark: number | null; creditHours: number }[]) => {
  const graded = units.filter((u) => u.mark !== null && u.creditHours > 0);
  const credits = graded.reduce((s, u) => s + u.creditHours, 0);
  if (!credits) return null;
  return round1(graded.reduce((s, u) => s + (u.mark as number) * u.creditHours, 0) / credits);
};

export const classification = (mean: number | null) => {
  if (mean === null) return "Not yet classified";
  if (mean >= 70) return "First Class Honours";
  if (mean >= 60) return "Second Class Honours (Upper Division)";
  if (mean >= 50) return "Second Class Honours (Lower Division)";
  if (mean >= 40) return "Pass";
  return "Fail";
};
