# Big money in New Zealand elections

Every political donation over $20,000 declared to the New Zealand Electoral
Commission, with a researched profile of each donor.

The Commission publishes these returns as a long HTML table of individual PDFs.
This turns them into a dataset you can query, a set of charts, and a page per
donor and per party.

## The data

`data/donations.json` holds every counted return from the 2023 and 2026 cycles.
It is built from the Commission's register and nothing else.

**Donor street addresses are not in this repository.** The Commission publishes
them; we keep only the suburb and town. See [EDITORIAL.md](./EDITORIAL.md) for
why, and for the rules applied before writing about any donor.

```bash
node scripts/scrape.mjs      # drive a real Chrome, snapshot the register to .local/
node scripts/build-data.mjs  # parse it into data/donations.json, dropping addresses
```

The register sits behind a bot challenge, so `curl` and headless browsers get a
challenge page instead of the content. `scrape.mjs` drives a real headed Chrome
over the DevTools Protocol and reads the rendered DOM. Its output lands in
`.local/`, which is gitignored because it still contains addresses.

`data/donors.json` holds the researched profiles, keyed by donor slug. Each
profile carries its sources; donors with nothing reliable in the public record
are marked `noPublicProfile` rather than padded out.

## Running it

```bash
npm install
npm run dev
```

Next.js 16 (App Router), React 19, Tailwind v4. No database and no API: the
dataset is a static import, so every page prerenders.

## Corrections

If a figure or a profile is wrong, open an issue with the donation and a
source. Both the dataset and the profiles are meant to be corrected in public.

## Licence

Code MIT. The underlying returns are public records published by the Electoral
Commission; the compiled dataset and written profiles are CC BY 4.0 — use them,
credit the source.
