import { describe, expect, it } from "vitest";
import { adjustScheduleToCurrentWeek, mondayOf } from "@/lib/utils";

describe("timetable placement", () => {
  it("finds Monday without changing the input date", () => {
    const sunday = new Date(2026, 8, 27, 15, 0);
    const copy = new Date(sunday);
    expect(mondayOf(sunday).getDate()).toBe(21);
    expect(sunday).toEqual(copy);
    expect(mondayOf(new Date(2026, 8, 23)).getDate()).toBe(21);
  });

  it("places slots by weekday and HH:mm", () => {
    const [e] = adjustScheduleToCurrentWeek(
      [{ name: "Lecture", day: "WEDNESDAY", startTime: "08:00", endTime: "10:00", subjectName: "Data Structures", className: "CS Y2", venue: "LH 3" }],
      new Date(2026, 8, 23)
    );
    expect(e.start).toEqual(new Date(2026, 8, 23, 8, 0));
    expect(e.end).toEqual(new Date(2026, 8, 23, 10, 0));
    expect(e.title).toContain("LH 3");
  });
});
