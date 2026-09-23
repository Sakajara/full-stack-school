import { describe, expect, it } from "vitest";
import { keywordsFor, searchTerm } from "@/lib/search";

describe("keywordsFor", () => {
  it("indexes word prefixes and compact codes", () => {
    const k = keywordsFor("Wanjiru Kamau", "SCT221-0001/2025", null);
    expect(k).toContain("wan");
    expect(k).toContain("kamau");
    expect(k).toContain("sct2210001");
    expect(k).toContain("sct");
    expect(k).not.toContain("");
  });
  it("uses the first word of a search", () => {
    expect(searchTerm("  Kamau  John")).toBe("kamau");
    expect(searchTerm("")).toBeNull();
  });
});
