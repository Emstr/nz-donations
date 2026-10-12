import type { Metadata } from "next";
import { counted, donations, donorSummaries, RETRIEVED, SOURCE_URL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Method",
  description:
    "Where the data comes from, what we leave out, and the rules we apply before writing about a donor.",
};

export default function MethodPage() {
  const returned = donations.filter((d) => d.returnedToDonor).length;
  const amended = donations.filter((d) => d.amended).length;

  return (
    <div className="max-w-[68ch] pt-12 pb-4">
      <h1 className="font-display text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.025em]">
        Method and editorial policy
      </h1>

      <Section title="Where the data comes from">
        <p>
          Every figure here is taken from the Electoral Commission&rsquo;s
          register of{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener" className="underline underline-offset-2">
            donations exceeding $20,000
          </a>
          , retrieved on {RETRIEVED}. Parties must file a return within 20
          working days of receiving more than $20,000 from a single donor
          between 1 January of election year and the day before election day.
          That window was 10 working days in 2023, and the threshold was $30,000
          over any 12 months before 2023.
        </p>
        <p>
          The register is rendered behind a bot challenge, so the scraper drives
          a real browser and reads the page it renders. Both the scraper and the
          parser are in the repository; running them reproduces{" "}
          <code className="text-[13px]">data/donations.json</code> exactly.
        </p>
      </Section>

      <Section title="What we leave out">
        <p>
          The Commission publishes each donor&rsquo;s street address. We do not.
          The dataset keeps the suburb and town, because where the money comes
          from is part of the story and a suburb identifies no household. Street
          numbers and street names are dropped during the parse and never
          written to disk in this repository.
        </p>
        <p>
          The original returns are linked on every donation, so anyone can check
          a figure against the Commission&rsquo;s own PDF.
        </p>
      </Section>

      <Section title="Rules for writing about a donor">
        <p>
          Donating to a political party is a public act, and the register exists
          so that it can be scrutinised. That does not make a donor&rsquo;s
          whole life public. The depth of a profile scales with how public the
          donor already is and how large the donation is.
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li>
            Companies, unions, trusts and estates get the full public record:
            directors, shareholders, industry, related entities, what they do.
          </li>
          <li>
            People who are already public figures &mdash; company founders,
            chief executives, board members, politicians &mdash; are written
            about in that public capacity, including wealth where a named outlet
            has reported it.
          </li>
          <li>
            Private individuals who simply gave money are identified and placed
            in their public role, and nothing more. No family, no relationships,
            no employers dug out of nowhere, nothing about anyone&rsquo;s
            children, nothing that would help someone find their door.
          </li>
          <li>
            Every claim carries a source. Where research found nothing reliable,
            the page says so instead of guessing. A thin profile is better than
            a confident wrong one.
          </li>
        </ul>
      </Section>

      <Section title="How the numbers are counted">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Totals exclude the {returned} donation
            {returned === 1 ? "" : "s"} a party gave back to the donor. Those
            returns are still listed, flagged.
          </li>
          <li>
            {amended} returns were later amended. The amended figure is the one
            counted, once.
          </li>
          <li>
            Donations are dated by the day the party received the money, not the
            day the return was filed. The two can be weeks apart.
          </li>
          <li>
            Donors are merged when the same person filed under different
            spellings &mdash; &ldquo;Nicholas Mowbray&rdquo; and &ldquo;Nicholas
            James Mowbray&rdquo; are one donor. Merging is by first initial and
            surname, so two different people who share both would merge
            wrongly; none in this dataset appear to.
          </li>
          <li>
            There are {counted.length} counted donations from{" "}
            {donorSummaries().length} distinct donors.
          </li>
        </ul>
      </Section>

      <Section title="Corrections">
        <p>
          If something here is wrong, it should be fixed. Open an issue on the
          repository with the donation and the source, and the dataset or the
          profile will be corrected.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-[21px] font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15.5px] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}
