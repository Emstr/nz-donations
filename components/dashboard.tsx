"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Cycle, Donation } from "@/lib/data";
import {
  compactMoney,
  formatDate,
  money,
  PARTY_SLUGS,
  partyVar,
} from "@/lib/data";
import { PartyChip, Swatch, Tile, TileGrid } from "./bits";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

type Props = { donations: Donation[] };

export function Dashboard({ donations }: Props) {
  const [cycle, setCycle] = useState<Cycle>("2026");

  const current = useMemo(
    () => donations.filter((d) => d.cycle === cycle),
    [donations, cycle],
  );
  const other = useMemo(
    () => donations.filter((d) => d.cycle !== cycle),
    [donations, cycle],
  );

  const total = current.reduce((s, d) => s + d.amount, 0);
  const otherTotal = other.reduce((s, d) => s + d.amount, 0);
  const biggest = [...current].sort((a, b) => b.amount - a.amount)[0];

  const donorTotals = useMemo(() => {
    const map = new Map<
      string,
      { name: string; slug: string; total: number; parties: Map<string, number> }
    >();
    for (const d of current) {
      const row =
        map.get(d.donorKey) ??
        { name: d.donor, slug: d.donorSlug, total: 0, parties: new Map<string, number>() };
      row.total += d.amount;
      if (d.donor.length > row.name.length) row.name = d.donor;
      row.parties.set(d.party, (row.parties.get(d.party) ?? 0) + d.amount);
      map.set(d.donorKey, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [current]);

  const parties = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const d of current) {
      const row = map.get(d.party) ?? { total: 0, count: 0 };
      row.total += d.amount;
      row.count += 1;
      map.set(d.party, row);
    }
    return [...map].map(([party, v]) => ({ party, ...v })).sort((a, b) => b.total - a.total);
  }, [current]);

  const otherParties = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of other) map.set(d.party, (map.get(d.party) ?? 0) + d.amount);
    return map;
  }, [other]);

  const topDonor = donorTotals[0];
  const diffPct = Math.round((Math.abs(total - otherTotal) / otherTotal) * 100);
  const barMax = Math.max(parties[0].total, ...otherParties.values());

  return (
    <>
      <header className="pt-14">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Electoral Commission disclosures
        </div>
        <h1 className="mt-3.5 font-display text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-0.025em]">
          Who is paying for
          <br />
          the {cycle} election
        </h1>
        <p className="mt-4 max-w-[62ch] text-[16.5px] text-ink-2">
          Parties must tell the Electoral Commission within 20 working days when
          a single donor gives more than <b className="font-semibold text-ink">$20,000</b>. This is
          every one of those returns: <b className="font-semibold text-ink">{money(total)}</b> from{" "}
          <b className="font-semibold text-ink">{current.length}</b> donations.
        </p>

        <div
          role="group"
          aria-label="Election cycle"
          className="mt-7 flex w-max gap-1 rounded-full border border-hair bg-surface p-1"
        >
          {(["2026", "2023"] as Cycle[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                cycle === c ? "bg-ink text-page" : "text-ink-2 hover:text-ink"
              }`}
            >
              {c} cycle
            </button>
          ))}
        </div>
      </header>

      <TileGrid>
        <Tile
          label="Declared so far"
          value={money(total)}
          sub={`${total >= otherTotal ? `${diffPct}% more` : `${diffPct}% less`} than the ${
            cycle === "2026" ? "2023" : "2026"
          } cycle at ${money(otherTotal)}`}
        />
        <Tile
          label="Returns filed"
          value={String(current.length)}
          sub={`Averaging ${money(total / current.length)} a donation`}
        />
        <Tile
          label="Biggest single cheque"
          value={money(biggest.amount)}
          sub={`${biggest.donor} to ${biggest.party}, ${formatDate(biggest.receivedByParty)}`}
        />
        <Tile
          label="Biggest donor"
          value={money(topDonor.total)}
          sub={`${topDonor.name} across ${topDonor.parties.size} ${
            topDonor.parties.size === 1 ? "party" : "parties"
          }`}
        />
      </TileGrid>

      <section className="mt-16">
        <h2 className="font-display text-[23px] font-semibold tracking-[-0.01em]">
          Declared by party
        </h2>
        <p className="mt-2 text-[13.5px] text-ink-3">
          Grey tick marks the same party&rsquo;s total in the other cycle.
        </p>
        <div className="mt-7 flex flex-col gap-3.5">
          {parties.map(({ party, total: t, count }) => {
            const width = (t / barMax) * 78;
            const ghost = otherParties.get(party);
            return (
              <div key={party} className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                <div className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium">
                  <Swatch party={party} />
                  <Link href={`/parties/${PARTY_SLUGS[party]}`} className="truncate hover:underline underline-offset-2">
                    {party}
                  </Link>
                  <span className="text-ink-3 font-normal">· {count}</span>
                </div>
                <div className="relative h-[30px] min-w-0">
                  <span
                    className="absolute inset-y-[3px] left-0 rounded-r"
                    style={{ width: `${width}%`, background: partyVar(party) }}
                  />
                  {ghost !== undefined && (
                    <span
                      className="absolute inset-y-0 w-0.5 bg-rule"
                      style={{ left: `${(ghost / barMax) * 78}%` }}
                      title={`${party} in the ${cycle === "2026" ? "2023" : "2026"} cycle: ${money(ghost)}`}
                    />
                  )}
                  <span
                    className="tnum absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[12.5px] font-semibold"
                    style={{ left: `calc(${width}% + 10px)` }}
                  >
                    {compactMoney(t)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <RaceChart donations={current} cycle={cycle} />

      <section className="mt-16">
        <h2 className="font-display text-[23px] font-semibold tracking-[-0.01em]">
          Biggest donors
        </h2>
        <p className="mt-2 max-w-[58ch] text-[13.5px] text-ink-3">
          Bars split by the party that got the money. Names merge where the same
          donor filed under different spellings.
        </p>
        <div className="mt-6 flex flex-col gap-3.5">
          {donorTotals.slice(0, 12).map((d) => {
            const segs = [...d.parties].sort((a, b) => b[1] - a[1]);
            const width = (d.total / donorTotals[0].total) * 78;
            return (
              <div key={d.slug} className="grid grid-cols-[124px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[210px_minmax(0,1fr)]">
                <div className="min-w-0 text-[13.5px] font-medium">
                  <Link href={`/donors/${d.slug}`} className="hover:underline underline-offset-2">
                    {d.name}
                  </Link>
                  <small className="block text-[11.5px] font-normal text-ink-3">
                    {segs.map((s) => s[0]).join(" + ")}
                  </small>
                </div>
                <div className="relative h-[26px] min-w-0">
                  <span className="absolute inset-y-0 left-0 flex gap-0.5" style={{ width: `${width}%` }}>
                    {segs.map(([party, amount]) => (
                      <span
                        key={party}
                        style={{ flex: `${amount} 0 0`, background: partyVar(party) }}
                        title={`${party}: ${money(amount)}`}
                      />
                    ))}
                  </span>
                  <span
                    className="tnum absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[12.5px] font-semibold"
                    style={{ left: `calc(${width}% + 10px)` }}
                  >
                    {compactMoney(d.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ReturnsTable donations={current} />
    </>
  );
}

function RaceChart({ donations, cycle }: { donations: Donation[]; cycle: Cycle }) {
  const series = useMemo(() => {
    const sorted = [...donations].sort(
      (a, b) => dayNumber(a.receivedByParty) - dayNumber(b.receivedByParty),
    );
    const totals = new Map<string, number>();
    for (const d of sorted) totals.set(d.party, (totals.get(d.party) ?? 0) + d.amount);
    const top = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => p);
    const year = Number(cycle);
    const start = Date.UTC(year, 0, 1);
    const end = Math.max(...sorted.map((d) => dayNumber(d.receivedByParty)));
    return {
      start,
      end,
      lines: top.map((party) => {
        let running = 0;
        const points: [number, number][] = [[start, 0]];
        for (const d of sorted) {
          if (d.party !== party) continue;
          running += d.amount;
          points.push([dayNumber(d.receivedByParty), running]);
        }
        points.push([end, running]);
        return { party, points, total: running };
      }),
    };
  }, [donations, cycle]);

  const W = 900;
  const H = 380;
  const L = 56;
  const R = 92;
  const T = 14;
  const B = 34;
  const yMax = Math.max(...series.lines.map((l) => l.total)) * 1.08;
  const sx = (t: number) => L + ((t - series.start) / (series.end - series.start)) * (W - L - R);
  const sy = (v: number) => H - B - (v / yMax) * (H - T - B);

  const gridStep = yMax > 2_000_000 ? 500_000 : 250_000;
  const gridLines: number[] = [];
  for (let v = 0; v <= yMax; v += gridStep) gridLines.push(v);

  const lastMonth = new Date(series.end).getUTCMonth();
  const monthTicks = Array.from({ length: lastMonth + 1 }, (_, m) => m).filter(
    (m) => Date.UTC(Number(cycle), m, 1) <= series.end,
  );

  // Nudge end labels apart so they never collide.
  const labelled = [...series.lines].sort((a, b) => b.total - a.total);
  let prevY = -Infinity;
  const labels = labelled.map((l) => {
    const y = Math.max(sy(l.total), prevY + 15);
    prevY = y;
    return { party: l.party, y };
  });

  return (
    <section className="mt-16">
      <h2 className="font-display text-[23px] font-semibold tracking-[-0.01em]">
        The money race
      </h2>
      <p className="mt-2 max-w-[58ch] text-[13.5px] text-ink-3">
        Running total through the year, by the date the party received the money.
      </p>
      <figure className="mt-6 rounded-2xl border border-hair bg-surface p-4 pb-2">
        <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 pb-3">
          {series.lines.map((l) => (
            <span key={l.party} className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
              <Swatch party={l.party} />
              {l.party} {compactMoney(l.total)}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Cumulative declared donations by party through ${cycle}`}
        >
          {gridLines.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} style={{ stroke: "var(--hair)" }} strokeWidth={1} />
              <text x={L - 10} y={sy(v) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--ink-3)" }}>
                {v ? compactMoney(v) : "0"}
              </text>
            </g>
          ))}
          {monthTicks.map((m) => (
            <text
              key={m}
              x={sx(Date.UTC(Number(cycle), m, 1))}
              y={H - B + 20}
              textAnchor="middle"
              fontSize={11}
              style={{ fill: "var(--ink-3)" }}
            >
              {MONTHS[m]}
            </text>
          ))}
          <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} style={{ stroke: "var(--rule)" }} strokeWidth={1} />
          {series.lines.map((l) => (
            <g key={l.party}>
              <path
                d={l.points.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(" ")}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ stroke: partyVar(l.party) }}
              />
              <circle cx={sx(series.end)} cy={sy(l.total)} r={3.5} style={{ fill: partyVar(l.party) }} />
            </g>
          ))}
          {labels.map((l) => (
            <text
              key={l.party}
              x={W - R + 10}
              y={l.y + 4}
              fontSize={11.5}
              fontWeight={600}
              style={{ fill: partyVar(l.party) }}
            >
              {l.party}
            </text>
          ))}
        </svg>
      </figure>
    </section>
  );
}

function ReturnsTable({ donations }: { donations: Donation[] }) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("");

  const partyOptions = useMemo(
    () => [...new Set(donations.map((d) => d.party))].sort(),
    [donations],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return donations
      .filter((d) => (party ? d.party === party : true))
      .filter((d) =>
        q ? `${d.donor} ${d.locality} ${d.party}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.amount - a.amount);
  }, [donations, query, party]);

  return (
    <section className="mt-16">
      <h2 className="font-display text-[23px] font-semibold tracking-[-0.01em]">
        Every return
      </h2>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <input
          id="returns-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search donor, suburb or party"
          aria-label="Search returns"
          className="min-w-0 flex-1 basis-56 rounded-[10px] border border-hair bg-surface px-3 py-2.5 text-[13.5px]"
        />
        <select
          id="returns-party"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          aria-label="Filter by party"
          className="rounded-[10px] border border-hair bg-surface px-3 py-2.5 text-[13.5px]"
        >
          <option value="">All parties</option>
          {partyOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="tnum ml-auto text-[12.5px] text-ink-3">
          {rows.length} of {donations.length} returns
        </span>
      </div>

      <div className="mt-4 max-h-[620px] overflow-auto rounded-2xl border border-hair bg-surface">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Party", "Donor", "Amount", "Received", "Declared", "Return"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={`sticky top-0 z-10 whitespace-nowrap border-b border-rule bg-surface px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 ${
                    h === "Amount" ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={`${d.donorSlug}-${d.receivedByParty}-${i}`}>
                <td className="border-b border-hair px-3.5 py-2.5 align-top">
                  <PartyChip party={d.party} />
                </td>
                <td className="border-b border-hair px-3.5 py-2.5 align-top">
                  <Link href={`/donors/${d.donorSlug}`} className="hover:underline underline-offset-2">
                    {d.donor}
                  </Link>
                  {d.amended && <Flag>amended</Flag>}
                  {d.returnedToDonor && <Flag>returned</Flag>}
                  {d.locality && (
                    <div className="text-[11.5px] text-ink-3">{d.locality}</div>
                  )}
                </td>
                <td className="tnum border-b border-hair px-3.5 py-2.5 text-right align-top font-semibold whitespace-nowrap">
                  {money(d.amount)}
                </td>
                <td className="border-b border-hair px-3.5 py-2.5 align-top whitespace-nowrap">
                  {formatDate(d.receivedByParty)}
                </td>
                <td className="border-b border-hair px-3.5 py-2.5 align-top whitespace-nowrap">
                  {formatDate(d.declaredToCommission)}
                </td>
                <td className="border-b border-hair px-3.5 py-2.5 align-top">
                  {d.returnUrl && (
                    <a
                      href={d.returnUrl}
                      target="_blank"
                      rel="noopener"
                      className="whitespace-nowrap border-b border-rule text-[12px] text-ink-2 hover:text-ink"
                    >
                      View
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-ink-2">
            No returns match that search.
          </p>
        )}
      </div>
    </section>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-block rounded-[5px] border border-rule px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-2">
      {children}
    </span>
  );
}
