import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Eyebrow, PartyChip, Tile, TileGrid } from "@/components/bits";
import {
  compactMoney,
  donationsForDonor,
  donorBySlug,
  donorSummaries,
  formatDate,
  money,
} from "@/lib/data";

export function generateStaticParams() {
  return donorSummaries().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/donors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const donor = donorBySlug(slug);
  if (!donor) return {};
  return {
    title: donor.name,
    description:
      donor.profile?.summary ??
      `${donor.name} has declared ${money(donor.total)} in donations over $20,000 to ${donor.parties
        .map((p) => p.party)
        .join(", ")}.`,
  };
}

export default async function DonorPage({ params }: PageProps<"/donors/[slug]">) {
  const { slug } = await params;
  const donor = donorBySlug(slug);
  if (!donor) notFound();

  const rows = donationsForDonor(slug);
  const profile = donor.profile;
  const biggest = [...rows].sort((a, b) => b.amount - a.amount)[0];

  return (
    <article className="pt-12 pb-4">
      <Link href="/donors" className="text-[13px] text-ink-3 hover:text-ink">
        ← All donors
      </Link>

      <h1 className="mt-4 font-display text-[clamp(30px,5vw,46px)] font-bold tracking-[-0.025em]">
        {donor.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-ink-2">
        {profile?.kind && <span className="capitalize">{profile.kind}</span>}
        {donor.localities.length > 0 && <span>{donor.localities.join(" · ")}</span>}
        <span>
          {donor.cycles.length === 2 ? "Gave in both cycles" : `${donor.cycles[0]} cycle`}
        </span>
      </div>

      {profile?.summary && (
        <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed">{profile.summary}</p>
      )}

      {!profile && (
        <p className="mt-6 max-w-[64ch] text-[15px] text-ink-2">
          No profile written yet. What is on this page comes straight from the
          Commission&rsquo;s returns.
        </p>
      )}

      {profile?.noPublicProfile && (
        <p className="mt-6 max-w-[64ch] text-[15px] text-ink-2">
          We looked and found no reliable public information about this donor
          beyond the returns themselves. Rather than guess, we have left it at
          that.
        </p>
      )}

      {profile?.notResearched && (
        <p className="mt-6 max-w-[64ch] rounded-xl border border-hair bg-surface p-4 text-[15px] text-ink-2">
          No one has researched this donor yet. Everything below comes from the
          Commission&rsquo;s returns. That is a gap, not a finding &mdash; it
          does not mean there is nothing to find.
        </p>
      )}

      <TileGrid>
        <Tile
          label="Total declared"
          value={money(donor.total)}
          sub={`${donor.count} ${donor.count === 1 ? "donation" : "donations"} since ${donor.first.slice(0, 4)}`}
        />
        <Tile
          label="Biggest single"
          value={money(biggest.amount)}
          sub={`${biggest.party}, ${formatDate(biggest.receivedByParty)}`}
        />
        <Tile
          label="Parties backed"
          value={String(donor.parties.length)}
          sub={donor.parties.map((p) => `${p.party} ${compactMoney(p.total)}`).join(" · ")}
        />
      </TileGrid>

      {profile?.background && (
        <section className="mt-14">
          <h2 className="font-display text-[21px] font-semibold">Background</h2>
          <p className="mt-3 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">
            {profile.background}
          </p>
        </section>
      )}

      {profile?.register && (
        <section className="mt-12">
          <h2 className="font-display text-[21px] font-semibold">Public record</h2>
          <dl className="mt-4 grid max-w-[64ch] grid-cols-[minmax(110px,auto)_1fr] gap-x-6 gap-y-2.5 text-[14px]">
            {profile.register.industry && (
              <Row label="Industry">{profile.register.industry}</Row>
            )}
            {profile.register.incorporated && (
              <Row label="Incorporated">{profile.register.incorporated}</Row>
            )}
            {profile.register.companyNumber && (
              <Row label="Company no.">{profile.register.companyNumber}</Row>
            )}
            {profile.register.nzbn && <Row label="NZBN">{profile.register.nzbn}</Row>}
            {profile.register.directors?.length ? (
              <Row label="Directors">{profile.register.directors.join(", ")}</Row>
            ) : null}
            {profile.register.shareholders?.length ? (
              <Row label="Shareholders">{profile.register.shareholders.join(", ")}</Row>
            ) : null}
          </dl>
        </section>
      )}

      {profile?.wealth && (
        <section className="mt-12">
          <h2 className="font-display text-[21px] font-semibold">Reported wealth</h2>
          <p className="mt-3 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">
            {profile.wealth}
          </p>
        </section>
      )}

      {profile?.stake && (
        <section className="mt-12">
          <h2 className="font-display text-[21px] font-semibold">What is at stake</h2>
          <p className="mt-3 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">
            {profile.stake}
          </p>
        </section>
      )}

      <section className="mt-14">
        <h2 className="font-display text-[21px] font-semibold">The donations</h2>
        <ul className="mt-5 divide-y divide-hair border-y border-hair">
          {rows.map((d, i) => (
            <li
              key={`${d.receivedByParty}-${i}`}
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3.5 text-[14px]"
            >
              <span className="w-36">
                <PartyChip party={d.party} />
              </span>
              <span className="tnum w-24 font-semibold">{money(d.amount)}</span>
              <span className="text-ink-2">{formatDate(d.receivedByParty)}</span>
              {d.amended && <span className="text-[12px] text-ink-3">amended return</span>}
              {d.returnedToDonor && (
                <span className="text-[12px] text-ink-3">returned by the party</span>
              )}
              {d.actingVia && (
                <span className="text-[12px] text-ink-3">via {d.actingVia}</span>
              )}
              {d.returnUrl && (
                <a
                  href={d.returnUrl}
                  target="_blank"
                  rel="noopener"
                  className="ml-auto border-b border-rule text-[12.5px] text-ink-2 hover:text-ink"
                >
                  Commission return
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {profile?.sources?.length ? (
        <section className="mt-12">
          <Eyebrow>Sources</Eyebrow>
          <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px]">
            {profile.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                  className="text-ink-2 underline underline-offset-2 hover:text-ink"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
