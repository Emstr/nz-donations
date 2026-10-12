import Link from "next/link";
import type { Metadata } from "next";
import { PartyChip } from "@/components/bits";
import { compactMoney, donorSummaries } from "@/lib/data";

export const metadata: Metadata = {
  title: "Donors",
  description:
    "Every donor who has given a New Zealand political party more than $20,000 in a single donation since 2023.",
};

export default function DonorsPage() {
  const donors = donorSummaries();
  const researched = donors.filter(
    (d) => d.profile && !d.profile.noPublicProfile && !d.profile.notResearched,
  ).length;
  const searchedEmpty = donors.filter((d) => d.profile?.noPublicProfile).length;
  const pending = donors.filter((d) => d.profile?.notResearched).length;

  return (
    <div className="pt-12 pb-4">
      <h1 className="font-display text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.025em]">
        Every donor
      </h1>
      <p className="mt-4 max-w-[62ch] text-[16px] text-ink-2">
        {donors.length} donors have given more than $20,000 in a single
        donation since 2023. {researched} have a researched profile;{" "}
        {searchedEmpty} were searched for and turned up nothing reliable
        beyond the returns, and say so.
        {pending > 0 ? ` ${pending} have not been researched yet.` : ""}
      </p>

      <ul className="mt-10 divide-y divide-hair border-y border-hair">
        {donors.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/donors/${d.slug}`}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5 hover:bg-surface"
            >
              <span className="flex-1 basis-56 text-[14.5px] font-medium">
                {d.name}
                {d.profile?.summary && (
                  <span className="block text-[12.5px] font-normal text-ink-3">
                    {d.profile.summary}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-2">
                {d.parties.map((p) => (
                  <PartyChip key={p.party} party={p.party} link={false} />
                ))}
              </span>
              <span className="tnum w-20 text-right text-[14px] font-semibold">
                {compactMoney(d.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
