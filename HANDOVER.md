# AfterFees — Handover (2026-08-24)

**Site is live:** https://keepafterfees.com
**Repo:** https://github.com/ghanashyamdraj-dotcom/keepafterfees (branch `main`)
**Path:** `C:\Users\ghana\Desktop\all hubs\tools\afterfees`
**Maintainer:** one person, no finance or tax credential — so site copy claims *method* (cited sources, shown arithmetic), never professional authority. **The maintainer is not named anywhere on the site or in this file, by decision** — see §1.4. Hub 1 of 3; hub 2 (MaterialMath, estimatormath.com) is live and further ahead; hub 3 not started.

```
cd "C:\Users\ghana\Desktop\all hubs\tools\afterfees"
npm run dev      # zero-dep dev server, localhost:4321
npm run build    # node build/build.mjs
npm test         # 86 tests
npm run audit    # build-spec compliance, 26 checks
npm run check    # full pipeline (verify:rates + build + test + audit)
```

Current state: **85 passing + 1 skipped of 86 tests, 26/26 audit checks, 31
pages, 0 broken internal links.** Everything is committed, pushed and live.

> **AdSense, 2026-09-11 — superseded the ads.txt issue.** The dashboard moved
> from "Getting ready" to **"Needs attention"** with a **Low value content**
> policy violation. Site ownership is verified; ads.txt was never the blocker
> and `ADS-TXT-HANDOVER.md` is now historical only.
>
> Measured cause: five per-state paycheck spokes were 80–92% textually
> identical to each other (Florida vs Texas: 438 lines, 42 differing, every one
> the state name), and four hub pages carried 4–10% unique text. Both are
> fixed — see §1.5. **A review has not yet been requested.** Do not tick
> "I confirm that I have fixed the issues" without first confirming the fixes
> are live in production.
>
> Still open: off-site corroboration is zero and `organization.sameAs` is
> empty **by decision** — the build warns about it on every run and that
> warning is expected, not a regression.

Gotcha: never run `dev` and `build` at the same time — they race on `dist/`. Line endings are normalized via `.gitattributes` (LF everywhere) — don't remove it or every file diffs on the next Windows commit.

---

## 1. What happened this session

### 1.1 The four comparison pages — DONE

All four the previous handover called out as the highest-value remaining work,
built as full interactive tool pages rather than articles:

| Page | The question it answers | The non-obvious finding |
|---|---|---|
| `/marketplace-fee-comparison/` | Where should I sell, at my volume? | 16 channels ranked on one axis; $512/mo spread at 30 orders |
| `/etsy-vs-shopify-fees/` | When does a storefront beat a marketplace? | The crossover is a **revenue** figure (~$439/mo), not an order count, and it barely moves |
| `/ebay-vs-mercari-fees/` | What is eBay's reach costing me? | Mercari is cheaper at *every* price — the page says so instead of inventing a crossover |
| `/paypal-vs-stripe-fees/` | Which processor is cheaper? | Stripe always, on standard rates — but neither headline rate is the cheapest thing either company sells |

**New engine: `src/lib/calc/versus.js`.** Declares 16 "channels" (marketplaces,
storefront, resale platforms, processor schedules), each naming an existing
engine and how to feed it. No fee arithmetic lives in that file, so a rate
correction in `src/data/` moves every comparison automatically.

Three things in it are worth knowing because they are the pages' whole value:

- **`crossoverAsymptote()`** — solves where two cost curves meet as the basket
  grows: `subscriptionGap / rateGap`. This is what makes the Etsy-vs-Shopify
  page say a number instead of "it depends on your volume".
- **`probeTraits()`** — the capability matrix is *probed*, not typed. "Does this
  platform charge its fee on the postage you collect?" is answered by running
  the channel twice and comparing. It cannot go stale against a rate change.
- **`detectCliffs()`** — scans each fee schedule a cent at a time for points
  where one more cent of asking price costs more than a cent, then measures the
  dead band above it. Finds Poshmark $15.00, eBay $10.01, Grailed $120.00 (with
  a **$4.10** dead band). Rounding is excluded by requiring a jump > $0.02,
  because a channel typically rounds two components independently.

One calculator id (`channel-versus`) serves all four pages; which channels are
compared is a hidden `matchup` field in the page markup, so a new comparison is
a data change rather than a code change.

**Tests:** `test/versus.test.js`, 17 new cases. They test the properties that
decide a *ranking* — that rows sort on what the seller keeps rather than on the
fee, that a subscription is charged monthly and not per order, that no
crossover is reported when one channel wins everywhere, and that a minimum fee
is a floor and not a cliff.

### 1.2 Three real bugs found and fixed

Found while building, all pre-existing, all now covered by tests:

1. **The total row disagreed with the headline on three shipped pages.** The
   client registry has expressed `totalOverride`/`totalLabel` since those pages
   were written; the server template ignored both and rendered `totals.net`
   regardless. `/freelance-hourly-rate-calculator/` was serving **"Your hourly
   rate $85,000.55"** to anything that does not run JavaScript — which is every
   AI crawler except Googlebot. Also hit `/charge-to-receive-calculator/` and
   `/self-employment-tax-calculator/`. Fixed in `resultBlock()` + six build
   cases; guarded by a new parity test that reads the `<tfoot>`.

2. **localStorage collided between pages sharing a calculator.** The key was
   the calculator id alone, so `/paypal-fee-calculator/` and
   `/stripe-fee-calculator/` shared one saved form — visit PayPal then Stripe
   and the Stripe page silently restored `processorId: paypal`. Fixed by
   keying on the path too (`src/client/app.js`).

3. **The Poshmark dead-zone figure on `/reseller-fee-calculator/` was wrong by
   ~75×.** The prose computed `threshold / (1 - rate)` = $18.75. The real
   boundary is the lowest price at which you net what you netted a cent below
   the cliff: **$15.05**. Now computed by `detectCliffs()` instead of derived
   by algebra. The worked example also pointed at $15.49, which is *past* the
   dead band — so the section was demonstrating the opposite of its heading. It
   now uses $15.00.

Also: **Depop was missing `commissionIncludesShipping: true`** in
`resellers/en-US.json`, understating its fee whenever the seller charges
postage. The file's own verified note says the processing base is "the item
price plus shipping plus any applicable taxes", so the flag now matches the
note. Surfaced by `probeTraits()` — the probe reported Depop as not charging on
postage, which contradicted its own note.

### 1.3 The redesign — three passes, ending at "Ledger"

Driven by the design critique file on the Desktop (three models, strong
consensus), then corrected twice by the user against their Pixelforge Studio
reference screenshots.

**Pass 1 → "Quiet Ledger" (rejected).** The critique said the UI was shouting,
so the accent was cut from ~15 uses a screen to 2, every category colour was
removed, and the bars, pills and badges went with them. The user's verdict:
*"you have made it a little too minimal, and now there is almost nothing…
there's literally no distinct color and it all looks like just one whole block
of text."* Correct. Restraint is not the same as absence.

**Pass 2 → "Ledger" (current).** The diagnosis that was actually right: the
problem was never the AMOUNT of colour, it was that the colour meant nothing.
Every colour now has a job and never does a second one:

| Role | Colour | Where it appears |
|---|---|---|
| **Structure** | deep forest | header + footer only. Nowhere else, ever. |
| **Money kept** | emerald | payout figures, the answer block, the primary action |
| **Money taken** | terracotta | the waterfall segments and a negative total |
| **Marketplace** | amber | nav, mega panel, card edge, card glyph, sidebar, section band |
| **Processors** | indigo | the same five places |
| **Freelance** | teal | the same five places |
| **Paycheck** | plum | the same five places |

The four category hues are what pass 1 removed and should not have — a reader
scanning nineteen cards needs to see four families, and four hues do that
instantly where four identical grey glyphs do not. They are set once, as
`--cat` / `--cat-bg` / `--cat-line`, by a `[data-group]` attribute; no component
ever names a hue itself, which is what keeps amber meaning "marketplace" in
five components without five places to keep in sync.

**The ground changed completely.** Warm paper (`#F4F1EA`), not grey — this is a
ledger, and `#f8fafc` is the colour of a dashboard. **Light is now the designed
default**; dark is a real second theme, warm-shifted rather than blue-black.
That flip answers the "completely change the colour" instruction and matches
both reference screenshots.

**Two new pieces of navigation, both asked for:**

- **A hover mega menu.** Each top-nav section drops a full-width panel listing
  every tool in it, with a glyph, a name and a one-line description, and a band
  in the section's own colour along the top edge. CSS-only — `:hover` for a
  mouse, `:focus-within` for a keyboard — so it works with JS disabled and has
  no aria-expanded state for script to get out of sync with. Hidden below
  980px where the hamburger takes over: a hover menu on a touch screen is a
  trap. A section with fewer than two tools renders as a plain link rather than
  a panel that reveals one link to the page you were already going to.
- **An in-section sidebar on every tool page.** Every calculator in the same
  family, the current one marked with an edge in the section colour, plus a way
  out to the full directory. Sticky on desktop; moves *below* the content on
  mobile rather than disappearing.

**The tool page is now three columns:** 224px sidebar | content | 300px ad rail.
The rail joins at 1360px — where there is room for it *and* for a usable
calculator beside it. The tool itself uses a **container query**, not a media
query, so it lays out against the column it is in rather than the viewport;
before that it kept its two-column form inside a 580px column and gave the
inputs about 150px.

**Ad inventory is intact and unchanged** — all five slots (`leaderboard`,
`result`, `midContent`, `endContent`, `rail`) render on every tool page,
verified in-browser at both desktop and mobile widths. The rail reserves a real
300×600.

**Page weight.** The mega menu plus the sidebar initially pushed the largest
page to 104 KB, over the audit's budget. Fixed properly rather than by deleting
the features:

- Icons are now **one inline SVG sprite** per page instead of a full `<svg>` at
  every use site. A page had reached 39 inline SVGs and 11 KB of duplicated
  path data; it is now 10 `<symbol>` definitions plus 39 ~60-byte `<use>` refs.
  The sprite has to be inline — cross-document `<use>` is blocked in every
  modern browser, and an external sprite is exactly the extra request this site
  refuses to make.
- JSON-LD is **no longer pretty-printed** — that was shipping ~3 KB of
  indentation per page.

Largest page **96.9 KB**, average 71.0 KB.

**Verification.** ~3,870 elements checked in-browser across 20 page-loads
(10 paths × light, 10 × dark), with the mega panels force-opened and CSS
transitions frozen so computed styles reflect the matched rule rather than a
mid-transition value — **zero WCAG AA contrast failures**, zero horizontal
overflow, mobile 375px clean.

Two contrast bugs that sweep caught and fixed:

- `--ink-faint` measured 4.20:1 on every tinted panel it actually appears on.
  It had been claimed as 5.6:1 in a code comment, twice, without being
  measured. Now checked against all six grounds it lands on: 4.95:1 worst case.
- `--keep` inverts between schemes, so a hardcoded `color: #fff` on a `--keep`
  fill was 5.8:1 in light and **1.98:1 in dark** — hitting the primary button
  and the skip link. Now a `--on-keep` token that flips with the scheme.

### 1.4 Attribution is now organisation-only

Per explicit instruction — **the maintainer's name must not appear anywhere on
the site.** Removed from the byline, the About page, the `Person` JSON-LD node,
`site.json`, and both `sameAs` arrays (the GitHub profile and repo URLs each
contain the username). Verified: zero occurrences anywhere in `dist/`.

The byline now reads *"Written and maintained by AfterFees"* and links to
`/about/`. Schema falls back to the Organization as `author` on every page,
which schema.org accepts. Hub 2 (MaterialMath) already runs this way, so it is
a portfolio pattern rather than an improvisation.

The About page says plainly that the maintainer is not named and that nothing
on the site asks you to take a reputation on trust — the sourcing, the dates
and the shown arithmetic are offered as the credential instead. That is the
honest version of the trade, and it is worth keeping if the copy is ever
rewritten.

Two checks that assumed a named human were rewritten rather than deleted:

- The audit's "Person schema present" is now "Every page names an author entity
  (Person or Organization)".
- The build's `author.sameAs is empty` warning is now about
  `organization.sameAs`.

> **That second warning is live and worth acting on.** The site now has **no
> external profile of any kind** pointing back at it, which is the one entity
> signal it has no substitute for. The fix does not require naming anyone: a
> GitHub *organisation*, or an X / LinkedIn page in the site's name, linked
> from `organization.sameAs`. See §2.6.

### 1.5 Two more pages: Poshmark and Mercari

The last buildable item on the previous list. Both are per-platform spokes off
the reseller comparison, and each exists because it has a question attached
that a table row cannot answer:

- **`/poshmark-fee-calculator/`** — the $15 cliff. Below it the commission is a
  flat fee; at it, the WHOLE sale re-rates to 20%. So $14.99 nets more than
  $15.00, and there is a narrow band above the threshold where charging more
  pays less. The band is solved by `detectCliffs()`, not derived — the algebra
  version of this got it 75× too wide on the comparison page.
- **`/mercari-fee-calculator/`** — the correction. Mercari genuinely charged
  sellers nothing from March 2024 to January 2025, and a great deal of advice
  written in that window still circulates as current. The page leads with the
  10% reinstatement, dates it, and shows that the fee base includes the postage
  you collect (so folding delivery into the price dodges nothing).

**New engine function: `calculateReseller()` in `resellers.js`.** Needed
because `compareResellers()` puts its fee detail inside `rows[]` — right for a
ranked table, wrong for a single-platform page, whose breakdown would otherwise
show a payout with nothing visibly taken out of it. Registry id
`reseller-single`; the platform is a hidden `platformId` field, so a third
per-platform page is a definition file and not a code change.

Four tests added (86 total) — including one that asserts the cliff warning is
not just present but *true*, by checking the cent below really does net more.

### 1.6 The paycheck layout bug

Reported from a screenshot: the whole article rendered in a narrow strip down
the left edge. Cause: `toolSidebar()` needs two or more tools, the paycheck
group holds exactly ONE entry in `TOOLS` (its five state pages are spokes, not
TOOLS entries), so no sidebar rendered — but the layout grid kept declaring a
224px sidebar column, and auto-placement dropped `.tool-main` into it.

Fixed twice over, because either alone would have left a trap:

1. **`sidebarTools()`** now builds the paycheck sidebar from the hub plus its
   five state spokes, which is what a visitor on that page actually wants next.
   Every paycheck page now has a real six-item sidebar.
2. **`.tool-layout--no-side`** — the grid's column count is now a function of
   whether the sidebar actually rendered, so no future page without one can
   break the same way.

---

## 2. What is NOT done — action items

### 2.1 Look at the redesign, then commit

Nothing is committed. Run `npm run dev`, look at `/`, `/tools/`, one
calculator, and one comparison page in both themes. Then commit and push.

### 2.2 Amazon fulfillment fee verification (unchanged, still the top data gap)

Plug 5 dimension/weight combos into `sellercentral.amazon.com/revcalpublic`
(public, no login), "Define product" mode, US store, inches, Home & Kitchen,
$29.99 sale price, and report the **fulfillment fee** for each:

| Dimensions | Weight | Our current figure |
|---|---|---|
| 9 × 6 × 0.6 in | 0.38 lb | $3.24 |
| 12 × 9 × 2 in | 1 lb | $5.77 |
| 14 × 10 × 3 in | 3 lb | $7.08 |
| 20 × 16 × 10 in | 10 lb | $18.73 |
| 40 × 20 × 12 in | 30 lb | $36.21 |

All 5 matching takes `rates/amazon/en-US.json` to fully verified.

### 2.3 Remaining partially-verified rate files

- **Amazon US/UK fulfillment** — see above.
- **Shopify** — annual-billing prices, in-person card rates, intl surcharge, FX
  fee, chargeback fee. (Monthly plan prices and card rates confirmed.)
- **Processors** — Wise, Payoneer, Stripe Instant Payouts.
- **The India data** — 4 user-supplied amazon.in / Stripe India snippets are
  still in limbo. Either build an `en-IN` locale properly (architecture supports
  it, see the `/uk/` pattern) or discard them.

### 2.4 SEO content not yet started

The Poshmark and Mercari spoke pages are **done** — see §1.5. What remains here
is the part that cannot be built.

- Poshmark / Mercari standalone spoke pages (lower priority follow-on).
- **Off-site work** — Reddit participation in r/Flipping, r/EtsySellers,
  r/eBaySellers, r/freelance. The keyword spec calls this "the biggest lever for
  a zero-authority domain" and it is the one thing here Claude cannot do. Still
  zero progress. Audit category 6 (off-site corroboration) remains: no.

### 2.5 Deliberate spec deviation, still unresolved with you

The keyword spec wants 8 near-identical H2 sections per tool page (one per
dollar value). Built pages do the anchor value that way and put the rest in one
sortable table, because the spec's own GEO guidance says tables beat repeated
prose and separately warns that near-identical per-value sections read as
doorway pages. Flagged twice now, never confirmed or overruled.

### 2.6 The site has no external profile pointing at it

The build now warns about this on every run, and it is the one real cost of
going anonymous. `organization.sameAs` is empty because the only two URLs in it
— a GitHub profile and the repo — both contain the maintainer's username.

An entity with no external profile anywhere is harder for a search engine to
recognise as a thing that exists, and this is audit category 6 (off-site
corroboration), which is already the site's weakest area. It does **not**
require naming anyone. Any of these closes it:

- A GitHub **organisation** account (e.g. `afterfees`) owning the repo.
- An X or LinkedIn page in the site's name rather than a person's.
- A Bluesky / Mastodon handle for the brand.

Create one, put its URL in `site.json` → `organization.sameAs`, and the warning
clears.

> **Worth knowing while you are at it:** the name is gone from the site, but the
> repository it deploys from is public and its URL still contains the
> maintainer's username. Removing the byline does not hide anything from
> someone who looks at the GitHub. If the anonymity is meant to hold against
> more than a casual reader, transferring the repo to a GitHub **organisation**
> is the move — and it solves the `organization.sameAs` gap above in the same
> step, since the org page is exactly the kind of external profile that entry
> wants.

### 2.7 Four ad slots still have no unit

The **leaderboard** now carries a real unit (`1805655779`, horizontal
responsive) on every page. The other four are still reserved-but-empty, and
each wants a unit of its own shape:

| Position | Where it sits | Shape to create |
|---|---|---|
| `result` | beside the calculator | rectangle, 336x280 / 300x250 |
| `midContent` | inside the 720px prose column | rectangle, same |
| `endContent` | end of the article | rectangle, same |
| `rail` | the gutter, 1360px and up only | vertical, 300x600 |

Create them in AdSense, paste each id into `site.json` → `adSlots.slotIds`, and
set `adSlots.formats` for that position if the unit is responsive (any
non-empty value there switches the container from a fixed box to full width
with the declared size as a min-height, and adds `data-ad-format` /
`data-full-width-responsive`).

**Do not reuse `1805655779` across the other four.** It is permitted by
AdSense, but reporting merges placements that share a unit id, so you would
never learn which position earns — and it is a horizontal unit being asked to
fill rectangle and vertical boxes.

Note the loader script lives in `<head>` once per page, emitted by
`layout.js`. The full AdSense snippet includes it; pasting that snippet at a
placement would load `adsbygoogle.js` a second and third time. `adSlot()`
emits only the `<ins>` and its `push()`.

### 2.8 Small things

- The **favicon is still mint on obsidian** while the in-page brand mark is now
  monochrome. Deliberate — a favicon has to be findable among thirty tabs and
  is not competing with page content — but it is an inconsistency worth a
  decision.
- `.claude/launch.json` now runs `node build/dev.mjs` instead of `npx serve`.
  The old config needed a network and downloaded a package, which contradicts
  the zero-dependency design.
- `--step-3` and `--sp-10` are defined but unused, on purpose: a hole in a scale
  is worse than a spare rung on one.

---

## 3. File map

```
src/data/site.json              — THE config file. Domain, author, adSlots, verification tokens.
src/data/rates/*/en-*.json      — per-platform fee data. verifiedOn/confidence drive VERIFY.md.
src/data/tax/                   — federal + 5-state tax data, all fully verified.
src/lib/calc/*.js               — pure calculator engines, one per platform/concept.
src/lib/calc/versus.js          — NEW. Channel comparison: crossovers, probed traits, cliff scan.
src/lib/rates.generated.js      — DO NOT EDIT, built from src/data by gen-rates.mjs.
src/content/tools.js            — registry of all 19 tools + COMPARISONS cross-link map.
src/content/pages/*.js          — per-tool page content: defaults, form groups, answerBlock, faqs.
src/templates/                  — layout.js, components.js, icons.js, schema.js.
src/styles/tokens.css           — the palette AND the accent rule. Read its header first.
src/styles/                     — base.css (chrome), tool.css, home.css — bundled 3 ways in loadCss().
src/client/app.js               — the one client script; registry.js is its dispatch table.
build/build.mjs                 — the static site generator. Also writes ads.txt, sitemap, robots.txt.
build/audit.mjs                 — the 26-check build-spec compliance script.
test/versus.test.js             — NEW. The comparison engine's ranking properties.
VERIFY.md                       — auto-generated, DO NOT hand-edit.
```

## 4. Traps worth carrying forward

- `form.elements[name]` is unsafe for any field named `length` — collides with
  `HTMLFormControlsCollection.length`. Always `form.querySelector('[name="..."]')`.
- `dist/` is wiped on every build — never hand-place a file there.
- This machine's git identity is `brightgamer476-png`, not the user's main
  GitHub account — hence collaborator-add rather than re-auth.
- This machine's DNS sometimes returns IPv6-only records for keepafterfees.com
  with no local IPv6 route; `curl https://keepafterfees.com` can fail here even
  when the site is fine. Use `curl --resolve keepafterfees.com:443:<cf-ip>`.
- **`siblingsFor()` slices `TOOLS` by array POSITION.** Inserting a tool
  mid-array silently rewrites the related-links block on already-shipped pages.
  New tools go at the END. The `COMPARISONS` map exists so comparison pages
  could be cross-linked without touching that function at all.
- **Two pages can share a calculator id.** When they do, anything keyed on the
  id alone (localStorage, and previously the saved form) collides across them.
- When editing a shared renderer (`waterfall`, `renderComparison`,
  `renderQuarterly`) edit **both** copies — server and client — or
  `parity.test.js` fails. `versusTable()` avoids this by living in `versus.js`
  and being imported by both.
