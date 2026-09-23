// Firestore cannot search inside strings, so each searchable record stores
// the prefixes of its words. Searching "wan" then becomes an
// array-contains query that matches "Wanjiru" and "Wanyama".

const MAX_PREFIX = 20;

const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const keywordsFor = (...fields: (string | number | null | undefined)[]) => {
  const out = new Set<string>();
  for (const field of fields) {
    if (field === null || field === undefined || field === "") continue;
    const text = String(field);
    // Codes such as "SCT221-0001/2025" or "SCO 201" are also matched whole,
    // without their punctuation.
    const compact = text.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const w of [...words(text), compact]) {
      for (let i = 1; i <= Math.min(w.length, MAX_PREFIX); i++) out.add(w.slice(0, i));
    }
  }
  return Array.from(out);
};

// The term to pass to array-contains. Only the first word is used, because
// Firestore allows one array-contains filter per query.
export const searchTerm = (input: string | null | undefined) => {
  if (!input) return null;
  const first = words(input)[0];
  return first ? first.slice(0, MAX_PREFIX) : null;
};
