import Link from "next/link";
import { PARTY_SLUGS, partyVar } from "@/lib/data";

export function Swatch({ party }: { party: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-[9px] shrink-0 rounded-[2px]"
      style={{ background: partyVar(party) }}
    />
  );
}

export function PartyChip({ party, link = true }: { party: string; link?: boolean }) {
  const inner = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium">
      <Swatch party={party} />
      {party}
    </span>
  );
  if (!link) return inner;
  return (
    <Link href={`/parties/${PARTY_SLUGS[party]}`} className="hover:underline underline-offset-2">
      {inner}
    </Link>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
      {children}
    </div>
  );
}

export function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-surface p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
        {label}
      </div>
      <div className="mt-2.5 font-display text-[30px] font-semibold tracking-[-0.02em] break-words">
        {value}
      </div>
      <div className="mt-1.5 text-[12.5px] text-ink-2">{sub}</div>
    </div>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-px overflow-hidden rounded-2xl border border-hair bg-hair">
      {children}
    </div>
  );
}
