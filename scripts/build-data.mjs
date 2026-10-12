#!/usr/bin/env node
/**
 * Turn the raw page snapshot into the published dataset.
 *
 * Donor home addresses appear in the Commission's table. They are dropped here
 * and never written to data/ — see EDITORIAL.md. The suburb and town are kept,
 * because where money comes from is part of the story and a suburb does not
 * identify a household. Street numbers and street names are not kept.
 *
 * Usage: node scripts/build-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = ".local/page-snapshot.html";
const OUT_DONATIONS = "data/donations.json";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const html = readFileSync(SRC, "utf8");

/** Strip tags, turning <br> and block ends into newlines. */
function cellLines(fragment) {
  const text = fragment
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, name) =>
      ({ rsquo: "’", lsquo: "‘", mdash: "—", ndash: "–", quot: '"' })[name] ?? m,
    );
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

function parseDate(text) {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2][0].toUpperCase() + m[2].slice(1).toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
}

/** Canonical short party names. Order matters: first match wins. */
const PARTY_RULES = [
  ["national", "National"],
  ["act", "ACT"],
  ["labour", "Labour"],
  ["first", "NZ First"],
  ["green", "Green"],
  ["māori", "Te Pāti Māori"],
  ["maori", "Te Pāti Māori"],
  ["opportun", "TOP"],
  ["freedoms", "Freedoms NZ"],
  ["vision", "Vision NZ"],
  ["newzeal", "NewZeal"],
  ["democracynz", "DemocracyNZ"],
  ["outdoors", "Outdoors & Freedom"],
  ["tai tokerau", "Te Tai Tokerau"],
];

function normaliseParty(raw) {
  const clean = raw.replace(/\s+/g, " ").trim();
  const low = clean.toLowerCase();
  for (const [needle, name] of PARTY_RULES) if (low.includes(needle)) return name;
  return clean;
}

/** Tidy a donor name without changing who it refers to. */
function canonDonor(raw) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ via .*$/, "")
    .replace(/^C\/-\s*/, "")
    .replace(/\bLimited\b/g, "Ltd");
}

const ORG_WORDS =
  /\b(Ltd|Limited|Union|Trust|Party|Group|Corporation|Incorporated|Inc|Company|Partnership|Holdings|Investments|Estate|Fund|Media|Chambers|Stud|Capital|Fintech|Properties|Seed|Timber|Energy|Construction|Management|Developments|Freight|Concrete|Wire|Nationalist|Workers|Maritime|Dairy|Meat|Rail|E Tu)\b/i;
const TITLES = /^(Sir|Dame|Lady|Hon\.?|Rt Hon\.?|Mr|Mrs|Ms|Dr)\s+/i;

/**
 * Organisations that filed under more than one name. People merge
 * automatically on initial and surname; organisations need to be told.
 */
const ALIASES = new Map(
  Object.entries({
    "New Zealand Dairy Workers Union": "Dairy Workers Union",
    "NZ Dairy Workers Union": "Dairy Workers Union",
    "Rail & Maritime Transport Union of New Zealand": "Rail & Maritime Transport Union",
    "Canterbury Nationalist Trust (Trustee Jim Gerard QSO)": "Canterbury Nationalist Trust",
    "The Estate of Hugh Barr": "Estate of Hugh Barr",
    "Estate of Hugh Barr": "Estate of Hugh Barr",
    "J&G Ayling Partnership trading as Mahala Enterprises": "J&G Ayling Partnership",
    // Separate legal entities are NOT merged here, even with common owners —
    // VDB Management Services and Van Den Brink Karaka stay distinct, and the
    // connection is drawn in the written profile instead.
  }).map(([from, to]) => [from.toLowerCase(), to]),
);

/** Stable identity key, so "Nicholas Mowbray" and "Nicholas James Mowbray" merge. */
const PARTICLES = new Set(["van", "von", "de", "der", "den", "du", "le", "la", "di", "da", "dos", "te"]);

function donorKey(canon) {
  const alias = ALIASES.get(canon.toLowerCase());
  if (alias) return alias;
  let s = canon.replace(/^(The )?Estate of /i, "");
  s = s.replace(TITLES, "").replace(/\b(QC|QSO|KC)\b/g, "").trim();
  if (ORG_WORDS.test(s)) return s;
  const parts = s.replace(/ and /g, " ").split(" ").filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return s;
  // Keep name particles with the surname: "Karl van Randow" -> "K van Randow".
  let start = parts.length - 1;
  while (start > 1 && PARTICLES.has(parts[start - 1].toLowerCase())) start--;
  return `${parts[0][0]} ${parts.slice(start).join(" ")}`;
}

export function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Split the Commission's address block into the parts worth publishing.
 *
 * A block can hold a street address, the name of a second donor on a joint
 * return, and the trustee or firm the money came through. Only the suburb and
 * town survive into the dataset; the rest is either dropped (street) or lifted
 * into its own field (co-donor, acting via).
 */
// Full words only. Abbreviations like "st" and "rd" would eat suburbs such as
// "St Heliers"; lines that start with a street number are caught separately.
const STREET =
  /\b(road|street|avenue|place|drive|crescent|terrace|lane|quay|parade|close|court|highway|level|floor|unit|suite|apartment|po box)\b/i;
const AGENT = /^(c\/-|trustee:|trustees:)/i;
const FIRM =
  /\b(Ltd|Limited|Trust|Trustee|Public Trust|PWC|PwC|BDO|Legal|Lawyers|Chambers|Building|Business Park|Village|Tower|House)\b/;
// A second person on a joint return is detected by shared surname, not by
// "looks like a name" — plenty of NZ suburbs read as two capitalised words.
function splitAddressBlock(lines, donorSurname) {
  const locality = [];
  const coDonors = [];
  let actingVia = null;

  for (const raw of lines) {
    const line = raw
      .replace(/\s*\d{4}\s*$/, "") // postcode
      .replace(/^RD\s?\d+\s*/i, "") // rural delivery number, keep the place
      .replace(/\s+RD\s?\d+$/i, "")
      .trim();
    if (!line) continue;
    if (AGENT.test(line) || /\bvia\b/i.test(line)) {
      actingVia ??= line.replace(AGENT, "").replace(/^.*\bvia\b\s*/i, "").trim() || line;
      continue;
    }
    if (STREET.test(line) || /^\d/.test(line)) continue;
    if (FIRM.test(line)) continue;
    if (donorSurname && line.split(" ").length >= 2 && line.endsWith(donorSurname)) {
      coDonors.push(line);
      continue;
    }
    locality.push(line);
  }

  return {
    // The last two surviving lines are the suburb and the town.
    locality: locality.slice(-2).join(", "),
    coDonors,
    actingVia,
  };
}

// --- parse the two tables -----------------------------------------------
const sections = html.split(/<h2[^>]*>/).slice(1);
const donations = [];

for (const section of sections) {
  const heading = cellLines(section.split("</h2>")[0] ?? "").join(" ");
  if (!/exceeding \$20,000/i.test(heading)) continue;
  const cycle = heading.includes("2026") ? "2026" : "2023";
  const table = section.match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!table) continue;

  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1]);
    if (cells.length < 3) continue;
    const [partyCell, donorCell, amountCell] = cells.map(cellLines);
    if (partyCell.join(" ").includes("Name and address")) continue;

    const partyText = partyCell.join(" ");
    const amountText = amountCell[0] ?? "";
    const amount = Number(
      (amountText.match(/\$([\d,]+(?:\.\d+)?)/)?.[1] ?? "").replace(/,/g, ""),
    );
    if (!amount) continue;

    const canon = canonDonor(donorCell[0] ?? "");
    const href = tr.match(/href="([^"]+)"/)?.[1] ?? null;
    const isPerson = !ORG_WORDS.test(canon);
    const surname = isPerson ? canon.split(" ").filter(Boolean).at(-1) : null;
    const { locality, coDonors, actingVia } = splitAddressBlock(donorCell.slice(1), surname);
    const viaInName = (donorCell[0] ?? "").match(/ via (.+)$/)?.[1]?.trim() ?? null;

    donations.push({
      cycle,
      party: normaliseParty(partyCell[0] ?? ""),
      partyAsFiled: (partyCell[0] ?? "").trim(),
      donor: canon,
      donorKey: donorKey(canon),
      donorSlug: slugify(donorKey(canon)),
      // Street address deliberately omitted — see EDITORIAL.md.
      locality,
      coDonors,
      actingVia: viaInName ?? actingVia,
      amount,
      receivedByParty: parseDate(amountText.split(",").slice(1).join(",")),
      declaredToCommission: parseDate(partyText),
      amended: /amended/i.test(partyText),
      returnedToDonor: /returned to the donor/i.test(partyText),
      returnUrl: href?.startsWith("/") ? `https://elections.nz${href}` : href,
    });
  }
}

donations.sort((a, b) => (a.receivedByParty < b.receivedByParty ? 1 : -1));

mkdirSync("data", { recursive: true });
writeFileSync(
  OUT_DONATIONS,
  JSON.stringify(
    {
      source:
        "https://elections.nz/democracy-in-nz/political-parties-in-new-zealand/donations-exceeding-20000",
      retrieved: new Date().toISOString().slice(0, 10),
      note: "Donor street addresses published by the Commission are omitted here. Suburb and town are kept.",
      donations,
    },
    null,
    1,
  ),
);

const withAddress = /\b\d+[a-zA-Z]?\s+[A-Z][a-z]+\s+(Road|Street|Avenue|Place|Drive|Crescent|Terrace|Lane|Way|Quay|Parade)\b/;
const leaked = donations.filter((d) => withAddress.test(d.locality));
if (leaked.length) {
  console.error("Street addresses leaked into locality:", leaked.slice(0, 5));
  process.exit(1);
}

console.log(
  `Wrote ${OUT_DONATIONS}: ${donations.length} donations, ` +
    `${new Set(donations.map((d) => d.donorKey)).size} distinct donors.`,
);
