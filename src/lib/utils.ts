import type { Day, Lesson } from "./types";

const DAY_INDEX: Record<Day, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
};

// Monday of the week containing `reference`. On Sunday this is the Monday
// just gone, which is the week the calendar shows.
export const mondayOf = (reference: Date = new Date()) => {
  const d = new Date(reference);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const at = (base: Date, dayOffset: number, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setDate(base.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};

// Places weekly timetable slots on the dates of the current week.
export const adjustScheduleToCurrentWeek = (
  lessons: Pick<Lesson, "name" | "day" | "startTime" | "endTime" | "subjectName" | "className" | "venue">[],
  reference: Date = new Date()
) => {
  const monday = mondayOf(reference);
  return lessons.map((l) => ({
    title: `${l.subjectName} (${l.name})${l.venue ? ` - ${l.venue}` : ""}${l.className ? ` - ${l.className}` : ""}`,
    start: at(monday, DAY_INDEX[l.day], l.startTime),
    end: at(monday, DAY_INDEX[l.day], l.endTime),
  }));
};

export const isoDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDate = (d?: { toDate: () => Date } | Date | null, locale = "en-GB") =>
  d ? new Intl.DateTimeFormat(locale).format(d instanceof Date ? d : d.toDate()) : "-";

export const formatDateTime = (d?: { toDate: () => Date } | Date | null) =>
  d
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
        d instanceof Date ? d : d.toDate()
      )
    : "-";
