#!/usr/bin/env node
/**
 * Merge a batch of researched profiles into data/donors.json.
 *
 * Reads a JSON object (slug -> profile) on stdin and merges it in, keeping the
 * file sorted by slug so diffs stay readable.
 *
 * Usage: node scripts/add-profiles.mjs < batch.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/donors.json";

const incoming = JSON.parse(readFileSync(0, "utf8"));
const existing = JSON.parse(readFileSync(FILE, "utf8"));

const valid = new Set(
  JSON.parse(readFileSync("data/donations.json", "utf8")).donations.map(
    (d) => d.donorSlug,
  ),
);

const unknown = Object.keys(incoming).filter((slug) => !valid.has(slug));
if (unknown.length) {
  console.error("No donation has these slugs:", unknown.join(", "));
  process.exit(1);
}

const missingSource = Object.entries(incoming).filter(
  ([, p]) => !p.noPublicProfile && !(p.sources?.length > 0),
);
if (missingSource.length) {
  console.error(
    "Every profile needs a source or noPublicProfile:",
    missingSource.map(([s]) => s).join(", "),
  );
  process.exit(1);
}

// Merge field by field, so a prose pass does not drop register facts added
// earlier (and vice versa). Sources accumulate, de-duplicated by URL.
// Guard against a written profile reintroducing what the parser strips: a
// numbered street address, or a donor's street named as their address. A
// landmark ("the Queen Street tower") is fine and deliberately not matched.
const STREET_TYPES = "Road|Street|Avenue|Place|Drive|Crescent|Terrace|Lane|Quay|Parade|Close|Court";
const ADDRESS_PATTERNS = [
  new RegExp(`\\b\\d+[a-zA-Z]?\\s+[A-Z][a-z]+\\s+(${STREET_TYPES})\\b`),
  new RegExp(`\\b[A-Z][a-z]+\\s+(${STREET_TYPES})\\s+address\\b`),
];
const leaks = Object.entries(incoming).flatMap(([slug, p]) => {
  const text = JSON.stringify(p);
  const hit = ADDRESS_PATTERNS.map((re) => text.match(re)?.[0]).find(Boolean);
  return hit ? [`${slug}: "${hit}"`] : [];
});
if (leaks.length) {
  console.error("Looks like a donor's street address — see EDITORIAL.md:\n  " + leaks.join("\n  "));
  process.exit(1);
}

const merged = { ...existing };
for (const [slug, profile] of Object.entries(incoming)) {
  const before = existing[slug] ?? {};
  const sources = [...(before.sources ?? []), ...(profile.sources ?? [])];
  merged[slug] = {
    ...before,
    ...profile,
    register: { ...(before.register ?? {}), ...(profile.register ?? {}) },
    sources: [...new Map(sources.map((s) => [s.url, s])).values()],
  };
  if (!Object.keys(merged[slug].register).length) delete merged[slug].register;
}
const sorted = Object.fromEntries(
  Object.keys(merged)
    .sort()
    .map((k) => [k, merged[k]]),
);

writeFileSync(FILE, JSON.stringify(sorted, null, 1) + "\n");
console.log(
  `${Object.keys(incoming).length} added/updated · ${Object.keys(sorted).length} of ${valid.size} donors now have a profile`,
);
