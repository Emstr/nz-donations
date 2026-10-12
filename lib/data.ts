import donationsFile from "@/data/donations.json";
import donorsFile from "@/data/donors.json";

export type Cycle = "2026" | "2023";

export type Donation = {
  cycle: Cycle;
  party: string;
  partyAsFiled: string;
  donor: string;
  donorKey: string;
  donorSlug: string;
  locality: string;
  coDonors: string[];
  actingVia: string | null;
  amount: number;
  receivedByParty: string;
  declaredToCommission: string;
  amended: boolean;
  returnedToDonor: boolean;
  returnUrl: string | null;
};

/** A researched profile. Every claim carries a source; unknowns stay absent. */
export type DonorProfile = {
  slug: string;
  name: string;
  kind: "person" | "company" | "union" | "trust" | "estate" | "other";
  summary?: string;
  /** What they are known for, in public life or business. */
  background?: string;
  /** Companies Office / public register facts. */
  register?: {
    nzbn?: string;
    companyNumber?: string;
    incorporated?: string;
    directors?: string[];
    shareholders?: string[];
    industry?: string;
  };
  /** Publicly reported wealth, only where a named outlet has reported it. */
  wealth?: string;
  interests?: string[];
  /** Why this donation might matter — policy exposure, contracts, regulation. */
  stake?: string;
  sources?: { title: string; url: string }[];
  /** Set when research found nothing reliable, so the page says so honestly. */
  noPublicProfile?: boolean;
};

const file = donationsFile as {
  source: string;
  retrieved: string;
  note: string;
  donations: Donation[];
};

export const SOURCE_URL = file.source;
export const RETRIEVED = file.retrieved;
export const donations: Donation[] = file.donations;
export const profiles = donorsFile as Record<string, DonorProfile>;

export const CYCLES: Cycle[] = ["2026", "2023"];

/** Returns the party actually gave back are excluded from every total. */
export const counted = donations.filter((d) => !d.returnedToDonor);

export function byCycle(cycle: Cycle) {
  return counted.filter((d) => d.cycle === cycle);
}

export type PartyTotal = { party: string; total: number; count: number };

export function partyTotals(cycle: Cycle): PartyTotal[] {
  const map = new Map<string, PartyTotal>();
  for (const d of byCycle(cycle)) {
    const row = map.get(d.party) ?? { party: d.party, total: 0, count: 0 };
    row.total += d.amount;
    row.count += 1;
    map.set(d.party, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export type DonorSummary = {
  slug: string;
  key: string;
  name: string;
  localities: string[];
  total: number;
  count: number;
  parties: { party: string; total: number }[];
  cycles: Cycle[];
  first: string;
  last: string;
  profile?: DonorProfile;
};

/** One row per distinct donor, across both cycles. */
export function donorSummaries(): DonorSummary[] {
  const map = new Map<
    string,
    Omit<DonorSummary, "parties" | "cycles" | "localities"> & {
      partyMap: Map<string, number>;
      cycleSet: Set<Cycle>;
      localitySet: Set<string>;
    }
  >();

  for (const d of counted) {
    const row =
      map.get(d.donorKey) ??
      {
        slug: d.donorSlug,
        key: d.donorKey,
        name: d.donor,
        total: 0,
        count: 0,
        first: d.receivedByParty,
        last: d.receivedByParty,
        partyMap: new Map<string, number>(),
        cycleSet: new Set<Cycle>(),
        localitySet: new Set<string>(),
      };
    row.total += d.amount;
    row.count += 1;
    // Keep the fullest spelling the Commission has on file.
    if (d.donor.length > row.name.length) row.name = d.donor;
    row.partyMap.set(d.party, (row.partyMap.get(d.party) ?? 0) + d.amount);
    row.cycleSet.add(d.cycle);
    if (d.locality) row.localitySet.add(d.locality);
    if (d.receivedByParty < row.first) row.first = d.receivedByParty;
    if (d.receivedByParty > row.last) row.last = d.receivedByParty;
    map.set(d.donorKey, row);
  }

  return [...map.values()]
    .map(({ partyMap, cycleSet, localitySet, ...rest }) => ({
      ...rest,
      parties: [...partyMap]
        .map(([party, total]) => ({ party, total }))
        .sort((a, b) => b.total - a.total),
      cycles: [...cycleSet].sort().reverse() as Cycle[],
      localities: [...localitySet],
      profile: profiles[rest.slug],
    }))
    .sort((a, b) => b.total - a.total);
}

export function donorBySlug(slug: string): DonorSummary | undefined {
  return donorSummaries().find((d) => d.slug === slug);
}

export function donationsForDonor(slug: string): Donation[] {
  return donations
    .filter((d) => d.donorSlug === slug)
    .sort((a, b) => (a.receivedByParty < b.receivedByParty ? 1 : -1));
}

export const money = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-NZ");

export const compactMoney = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}m`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}k`
      : money(n);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const PARTY_SLUGS: Record<string, string> = Object.fromEntries(
  [...new Set(donations.map((d) => d.party))].map((p) => [
    p,
    p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  ]),
);

export const PARTY_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PARTY_SLUGS).map(([party, slug]) => [slug, party]),
);

/** Brand-ish colours, defined as CSS variables in globals.css. */
export function partyVar(party: string) {
  const key: Record<string, string> = {
    National: "--p-national",
    ACT: "--p-act",
    Labour: "--p-labour",
    Green: "--p-green",
    "NZ First": "--p-nzfirst",
    "Te Pāti Māori": "--p-tpm",
    TOP: "--p-top",
  };
  return `var(${key[party] ?? "--p-other"})`;
}
