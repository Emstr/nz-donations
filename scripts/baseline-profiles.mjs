#!/usr/bin/env node
/**
 * Write a baseline entry for every donor still without a profile.
 *
 * These donors were searched for and nothing reliable came back, so the page
 * says that rather than padding it out. The entry states only what the
 * Commission's own returns show. Research that later identifies a donor
 * overwrites the baseline through scripts/add-profiles.mjs.
 *
 * Usage: node scripts/baseline-profiles.mjs > /tmp/baseline.json
 */
import { readFileSync } from "node:fs";

const { donations } = JSON.parse(readFileSync("data/donations.json", "utf8"));
const existing = JSON.parse(readFileSync("data/donors.json", "utf8"));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const money = (n) => "$" + Math.round(n).toLocaleString("en-NZ");
const monthYear = (iso) => {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

const ORG_WORDS =
  /\b(Ltd|Limited|Union|Trust|Party|Group|Corporation|Incorporated|Inc|Company|Partnership|Holdings|Investments|Fund|Media|Chambers|Stud|Capital|Fintech|Properties|Seed|Timber|Energy|Construction|Management|Developments|Freight|Concrete|Wire)\b/i;

const byDonor = new Map();
for (const d of donations) {
  if (d.returnedToDonor) continue;
  const row = byDonor.get(d.donorSlug) ?? { name: d.donor, rows: [] };
  if (d.donor.length > row.name.length) row.name = d.donor;
  row.rows.push(d);
  byDonor.set(d.donorSlug, row);
}

const out = {};
for (const [slug, { name, rows }] of byDonor) {
  if (existing[slug]) continue;

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const parties = [...new Set(rows.map((r) => r.party))];
  const locality = rows.find((r) => r.locality)?.locality;
  const isEstate = /^(The )?Estate of /i.test(name);
  const kind = isEstate
    ? "estate"
    : /\bTrust\b/i.test(name)
      ? "trust"
      : /\bUnion\b/i.test(name)
        ? "union"
        : ORG_WORDS.test(name)
          ? "company"
          : "person";

  const where = locality ? `, filing from ${locality}` : "";
  const summary =
    rows.length === 1
      ? `Gave ${parties[0]} ${money(total)} in ${monthYear(rows[0].receivedByParty)}${where}.`
      : `Gave ${money(total)} across ${rows.length} donations to ${parties.join(" and ")}${where}.`;

  const timeline = rows
    .slice()
    .sort((a, b) => (a.receivedByParty < b.receivedByParty ? -1 : 1))
    .map((r) => `${money(r.amount)} to ${r.party} in ${monthYear(r.receivedByParty)}`)
    .join("; ");

  out[slug] = {
    slug,
    name,
    kind,
    noPublicProfile: true,
    summary,
    background:
      rows.length === 1
        ? "Searches found no reliable public information about this donor beyond the Commission's return."
        : `The returns show ${timeline}. Searches found no reliable public information about this donor beyond them.`,
  };
}

process.stdout.write(JSON.stringify(out, null, 1));
console.error(`${Object.keys(out).length} baseline entries`);
