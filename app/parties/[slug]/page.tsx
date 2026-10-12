import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Tile, TileGrid } from "@/components/bits";
import {
  compactMoney,
  counted,
  formatDate,
  money,
  PARTY_BY_SLUG,
  PARTY_SLUGS,
} from "@/lib/data";

export function generateStaticParams() {
  return Object.values(PARTY_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/parties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const party = PARTY_BY_SLUG[slug];
  if (!party) return {};
  return {
    title: party,
    description: `Donations over $20,000 declared by ${party}.`,
  };
}

export default async function PartyPage({ params }: PageProps<"/parties/[slug]">) {
  const { slug } = await params;
  const party = PARTY_BY_SLUG[slug];
  if (!party) notFound();

  const rows = counted
    .filter((d) => d.party === party)
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, d) => s + d.amount, 0);

  const byDonor = new Map<string, { name: string; slug: string; total: number }>();
  for (const d of rows) {
    const row = byDonor.get(d.donorKey) ?? { name: d.donor, slug: d.donorSlug, total: 0 };
    row.total += d.amount;
    if (d.donor.length > row.name.length) row.name = d.donor;
    byDonor.set(d.donorKey, row);
  }
  const donors = [...byDonor.values()].sort((a, b) => b.total - a.total);
  const perCycle = (cycle: string) =>
    rows.filter((d) => d.cycle === cycle).reduce((s, d) => s + d.amount, 0);

  return (
    <div className="pt-12 pb-4">
      <Link href="/parties" className="text-[13px] text-ink-3 hover:text-ink">
        ← All parties
      </Link>
      <h1 className="mt-4 font-display text-[clamp(30px,5vw,46px)] font-bold tracking-[-0.025em]">
        {party}
      </h1>

      <TileGrid>
        <Tile label="Total declared" value={money(total)} sub={`${rows.length} returns`} />
        <Tile label="2026 cycle" value={compactMoney(perCycle("2026"))} sub="1 Jan 2026 onwards" />
        <Tile label="2023 cycle" value={compactMoney(perCycle("2023"))} sub="1 Jan 2023 onwards" />
        <Tile
          label="Distinct donors"
          value={String(donors.length)}
          sub={`Top donor ${donors[0].name}`}
        />
      </TileGrid>

      <section className="mt-14">
        <h2 className="font-display text-[21px] font-semibold">Donors</h2>
        <ul className="mt-5 divide-y divide-hair border-y border-hair">
          {donors.map((d) => (
            <li key={d.slug}>
              <Link href={`/donors/${d.slug}`} className="flex items-baseline gap-4 py-3 hover:bg-surface">
                <span className="flex-1 text-[14.5px]">{d.name}</span>
                <span className="tnum text-[14px] font-semibold">{money(d.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-[21px] font-semibold">Returns</h2>
        <ul className="mt-5 divide-y divide-hair border-y border-hair text-[14px]">
          {rows.map((d, i) => (
            <li key={`${d.donorSlug}-${i}`} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3">
              <Link href={`/donors/${d.donorSlug}`} className="flex-1 basis-48 hover:underline underline-offset-2">
                {d.donor}
              </Link>
              <span className="tnum w-24 font-semibold">{money(d.amount)}</span>
              <span className="text-ink-2">{formatDate(d.receivedByParty)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
