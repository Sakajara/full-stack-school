import { describe, expect, it } from "vitest";
import { classification, letterGrade, unitOutcome, weightedMean } from "@/lib/grading";

describe("letterGrade", () => {
  it("follows the CUE scale", () => {
    expect([100, 70, 69.9, 60, 50, 40, 39.9, 0].map(letterGrade)).toEqual([
      "A", "A", "B", "B", "C", "D", "E", "E",
    ]);
  });
});

describe("unitOutcome", () => {
  it("weights coursework 30 and the exam 70", () => {
    const o = unitOutcome([
      { kind: "cat", score: 20, maxScore: 30 },
      { kind: "assignment", score: 8, maxScore: 10 },
      { kind: "main", score: 60, maxScore: 100 },
    ]);
    // coursework mean 73.33% -> 22.0 of 30; exam 60% -> 42 of 70
    expect(o.coursework).toBe(22);
    expect(o.exam).toBe(42);
    expect(o.mark).toBe(64);
    expect(o.grade).toBe("B");
    expect(o.status).toBe("complete");
  });

  it("is incomplete without an exam or without coursework", () => {
    expect(unitOutcome([{ kind: "cat", score: 10, maxScore: 10 }]).status).toBe("incomplete");
    expect(unitOutcome([{ kind: "main", score: 90, maxScore: 100 }]).status).toBe("incomplete");
  });

  it("flags a failed unit for a supplementary", () => {
    const o = unitOutcome([
      { kind: "cat", score: 10, maxScore: 30 },
      { kind: "main", score: 30, maxScore: 100 },
    ]);
    expect(o.mark).toBe(31);
    expect(o.grade).toBe("E");
    expect(o.status).toBe("supplementary");
  });

  it("caps a passed supplementary", () => {
    const o = unitOutcome([
      { kind: "cat", score: 10, maxScore: 30 },
      { kind: "main", score: 30, maxScore: 100 },
      { kind: "supplementary", score: 78, maxScore: 100 },
    ]);
    expect(o.mark).toBe(50);
    expect(o.grade).toBe("C");
    expect(o.status).toBe("passed_supplementary");
  });

  it("does not cap a special examination", () => {
    const o = unitOutcome([
      { kind: "cat", score: 30, maxScore: 30 },
      { kind: "special", score: 80, maxScore: 100 },
    ]);
    expect(o.mark).toBe(86);
    expect(o.grade).toBe("A");
  });

  it("respects a higher pass mark", () => {
    const o = unitOutcome(
      [
        { kind: "cat", score: 15, maxScore: 30 },
        { kind: "main", score: 45, maxScore: 100 },
      ],
      50
    );
    expect(o.mark).toBe(46.5);
    expect(o.passed).toBe(false);
  });
});

describe("classification", () => {
  it("weights by credit hours", () => {
    const mean = weightedMean([
      { mark: 80, creditHours: 3 },
      { mark: 60, creditHours: 1 },
      { mark: null, creditHours: 3 },
    ]);
    expect(mean).toBe(75);
    expect(classification(mean)).toBe("First Class Honours");
    expect(classification(65)).toMatch(/Upper/);
    expect(classification(55)).toMatch(/Lower/);
    expect(classification(45)).toBe("Pass");
    expect(classification(null)).toBe("Not yet classified");
  });
});
