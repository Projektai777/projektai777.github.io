# Licensed design fonts go here

The EF grid design uses two commercial typefaces. The client's designer handles
the licence; we only need the web files.

Drop these in, with these exact names:

| file | used for | weights needed |
|---|---|---|
| `RoobertArabicVF.woff2` | all headings | 400 and 500 (a variable file covers both) |
| `Nekst-Medium.woff2` | small caps labels (SERVICES, SECTORS, …) | 500 |

Then uncomment the `fonts.css` <link> in `../index.html`. That is the whole job —
the CSS font stack already prefers these families.

## Before buying, check the licence type

A **desktop** licence does NOT permit putting the font on a website. Embedding
needs a **web / webfont (self-hosting)** licence, normally priced by monthly
pageviews. Roobert is from Displaay Type Foundry. The file in the Figma is a
TRIAL build and must never be shipped.

## No rush

Measured 2026-07-29: rendering every heading with the real Roobert versus the
free stand-in produces the same line count on all 9 headings and the identical
page height (6813 px), max width drift 8 px. The licensed file can be dropped in
at any time with no layout consequences.
