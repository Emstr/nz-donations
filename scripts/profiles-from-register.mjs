#!/usr/bin/env node
/**
 * Turn Companies Office lookups into profile stubs.
 *
 * Everything written here is a register fact with the register as its source.
 * Prose about what a company does, who is behind it and what it wants from
 * government is added by hand on top of these stubs.
 *
 * Usage: node scripts/profiles-from-register.mjs > /tmp/register-stubs.json
 */
import { readFileSync } from "node:fs";

const companies = JSON.parse(readFileSync(".local/companies.json", "utf8"));
const worklist = JSON.parse(readFileSync(".local/worklist.json", "utf8"));

const bySlug = new Map(worklist.map((w) => [w.name, w]));
const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Of|And|The|Nz)\b/g, (m) => (m === "Nz" ? "NZ" : m.toLowerCase()))
    .replace(/^(.)/, (m) => m.toUpperCase());

const out = {};
for (const c of companies) {
  if (!c.found) continue;
  const w = bySlug.get(c.query);
  if (!w) continue;

  const holders = c.shareholders.map((s) => `${titleCase(s.name)} (${s.share})`);
  const directors = c.directors.map((d) => titleCase(d.name));
  const controlling = c.shareholders.find((s) => parseFloat(s.share) >= 50);

  const bits = [];
  if (c.incorporated) bits.push(`Incorporated ${c.incorporated}`);
  if (controlling)
    bits.push(
      `${titleCase(controlling.name)} holds ${controlling.share} of the shares`,
    );
  else if (holders.length) bits.push(`Shareholding is split between ${holders.length} parties`);

  out[w.slug] = {
    slug: w.slug,
    name: w.name,
    kind: "company",
    summary: `${bits.join(". ")}.`,
    register: {
      nzbn: c.nzbn ?? undefined,
      incorporated: c.incorporated ?? undefined,
      directors,
      shareholders: holders,
    },
    sources: [
      { title: `${c.name} — Companies Office register`, url: c.url },
    ],
  };
  if (c.formerNames?.length) {
    out[w.slug].background = `Formerly ${c.formerNames
      .map((f) => f.replace(/\s*\(from.*$/, "").trim())
      .map(titleCase)
      .join(", ")}.`;
  }
}

process.stdout.write(JSON.stringify(out, null, 1));
console.error(`${Object.keys(out).length} register stubs`);
