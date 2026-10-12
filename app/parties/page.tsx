import Link from "next/link";
import type { Metadata } from "next";
import { Swatch } from "@/components/bits";
import { compactMoney, counted, PARTY_SLUGS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Parties",
  description: "Large declared donations by party, 2023 and 2026 cycles.",
};

export default function PartiesPage() {
  const map = new Map<string, { total: number; count: number }>();
  for (const d of counted) {
    const row = map.get(d.party) ?? { total: 0, count: 0 };
    row.total += d.amount;
    row.count += 1;
    map.set(d.party, row);
  }
  const parties = [...map]
    .map(([party, v]) => ({ party, ...v }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="pt-12 pb-4">
      <h1 className="font-display text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.025em]">
        Parties
      </h1>
      <p className="mt-4 max-w-[62ch] text-[16px] text-ink-2">
        Declared donations over $20,000, both cycles combined.
      </p>
      <ul className="mt-10 divide-y divide-hair border-y border-hair">
        {parties.map((p) => (
          <li key={p.party}>
            <Link
              href={`/parties/${PARTY_SLUGS[p.party]}`}
              className="flex items-baseline gap-4 py-4 hover:bg-surface"
            >
              <Swatch party={p.party} />
              <span className="flex-1 text-[15px] font-medium">{p.party}</span>
              <span className="text-[13px] text-ink-3">{p.count} returns</span>
              <span className="tnum w-20 text-right text-[14.5px] font-semibold">
                {compactMoney(p.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
