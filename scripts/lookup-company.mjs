#!/usr/bin/env node
/**
 * Look a company up on the Companies Office register.
 *
 * The register lists directors' and shareholders' residential addresses. This
 * script never returns them: it extracts names, dates and company identifiers
 * only, so an address cannot reach data/ through this path. See EDITORIAL.md.
 *
 * Usage: node scripts/lookup-company.mjs "Rank Group Limited" [...more names]
 */
const BASE = "https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const get = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
};

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Lines that look like a street address are dropped on sight. */
const ADDRESSY =
  /\d|\b(road|street|avenue|place|drive|crescent|terrace|lane|quay|parade|close|court|highway|level|floor|unit|suite|apartment|rd|st|ave)\b/i;

async function search(name) {
  const q = encodeURIComponent(name.replace(/\bLtd\b/i, "Limited"));
  const html = await get(
    `${BASE}/search?q=${q}&entityTypes=ALL&entityStatusGroups=ALL&addressTypes=ALL&start=0&limit=15&mode=standard`,
  );
  const hits = [...html.matchAll(/viewCompanyDetails\('(\d+)'\);"[^>]*>([\s\S]*?)<\/a>/g)].map(
    (m) => {
      const text = strip(m[2]).join(" ");
      return {
        id: m[1],
        name: text.replace(/\(\d+\).*$/, "").trim(),
        nzbn: text.match(/NZBN:\s*(\d+)/)?.[1] ?? null,
        status: /Registered/i.test(text) ? "Registered" : /Removed/i.test(text) ? "Removed" : null,
      };
    },
  );
  const target = name.replace(/\bLtd\b/i, "Limited").toUpperCase();
  const exact = hits.filter((h) => h.name.toUpperCase() === target);
  // Several entities can share a name over time; the live one is the donor.
  return exact.find((h) => h.status === "Registered") ?? exact[0] ?? hits[0] ?? null;
}

const tidyName = (s) => s.replace(/\s+/g, " ").trim();

/**
 * Directors are laid out as: given names, SURNAME, "Residential Address:",
 * the address, then "Appointment Date:" and the date. We take the two name
 * lines and the date, and step over the address without reading it.
 */
async function directors(id) {
  const lines = strip(await get(`${BASE}/${id}/directors`));
  const out = [];
  lines.forEach((line, i) => {
    if (!/^Residential Address:?$/i.test(line)) return;
    const name = tidyName(`${lines[i - 2] ?? ""} ${lines[i - 1] ?? ""}`);
    if (!name || ADDRESSY.test(name)) return;
    const dateAt = lines.findIndex((l, j) => j > i && /^Appointment Date:?$/i.test(l));
    out.push({ name, appointed: dateAt > 0 ? lines[dateAt + 1] : null });
  });
  return [...new Map(out.map((p) => [p.name, p])).values()];
}

/** Shareholders appear as an allocation percentage followed by the name. */
async function shareholders(id) {
  const lines = strip(await get(`${BASE}/${id}/shareholdings`));
  const out = [];
  lines.forEach((line, i) => {
    const pct = line.match(/^\((\d+(?:\.\d+)?)%\)$/);
    if (!pct) return;
    const name = tidyName(lines[i + 1] ?? "");
    if (!name || ADDRESSY.test(name)) return;
    out.push({ name, share: `${pct[1]}%` });
  });
  return [...new Map(out.map((p) => [p.name, p])).values()];
}

async function incorporation(id) {
  const lines = strip(await get(`${BASE}/${id}`));
  const at = lines.findIndex((l) => /^Incorporation Date/i.test(l));
  const former = lines.filter((l) => /\(from \d{2} \w{3} \d{4}/.test(l));
  return {
    incorporated: at >= 0 ? lines[at + 1] : null,
    formerNames: former.slice(0, 3),
  };
}

for (const name of process.argv.slice(2)) {
  try {
    const hit = await search(name);
    if (!hit) {
      console.log(JSON.stringify({ query: name, found: false }, null, 1));
      continue;
    }
    const [dirs, shares, extra] = await Promise.all([
      directors(hit.id),
      shareholders(hit.id),
      incorporation(hit.id),
    ]);
    console.log(
      JSON.stringify(
        {
          query: name,
          found: true,
          ...hit,
          ...extra,
          url: `${BASE}/${hit.id}`,
          directors: dirs,
          shareholders: shares,
        },
        null,
        1,
      ),
    );
  } catch (err) {
    console.log(JSON.stringify({ query: name, error: String(err) }, null, 1));
  }
}
