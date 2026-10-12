# Editorial policy

This repository publishes a public register and writes about the people and
organisations in it. These are the rules it follows.

## Addresses

The Electoral Commission publishes each donor's street address alongside their
name and the amount. This project does not reproduce them.

- The parser drops street numbers and street names. They are never written to
  `data/`.
- The suburb and town are kept. Where money comes from is part of the story,
  and a suburb identifies no household.
- The raw page snapshot in `.local/` still contains addresses and is
  gitignored. Do not commit it.
- Every donation links to the Commission's original return, so anyone who needs
  the full filing can read it at the source.

If a street address ever appears in `data/`, that is a bug. `build-data.mjs`
fails the build if it detects one.

## Writing about donors

Giving money to a political party is a public act, and the register exists so
it can be scrutinised. That does not make the donor's whole life public. How
much a profile says scales with how public the donor already is and how much
they gave.

**Organisations** — companies, unions, trusts, estates. Full public record:
directors, shareholders, NZBN, industry, related entities, what the business
does, who controls it, what it stands to gain or lose from policy.

**Public figures** — founders, chief executives, directors, politicians, people
who have put themselves in public life. Written about in that public capacity.
Reported wealth is included where a named outlet has published a figure, cited
to that outlet.

**Private individuals** — people who appear in the register and nowhere else.
Identified, placed in their public role if they have one, and nothing further.
Specifically not included for anyone in this group:

- family members, partners, anything about children
- home details beyond suburb and town
- employment dug out of social media rather than a public register
- health, religion, or anything a reasonable person would call private

**Everyone** — every claim carries a source. Inference is labelled as
inference. Where research turns up nothing reliable, the profile is marked
`noPublicProfile` and the page says so. A thin profile is better than a
confident wrong one.

## Figures

- Donations a party returned to the donor are excluded from totals and flagged
  in the listing.
- Amended returns are counted once, at the amended value.
- Donations are dated by when the party received the money, not when the return
  was filed.
- Donors are merged across spellings by first initial and surname. Two distinct
  people sharing both would merge wrongly; none in the current dataset appear
  to.

## Corrections

Open an issue with the donation and the source. Corrections to the dataset and
to profiles are made in public, in the commit history.
