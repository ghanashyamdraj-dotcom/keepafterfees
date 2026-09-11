/**
 * tools.js — the master registry of every tool on the hub.
 *
 * Drives the home page, the hub index pages, internal linking, the sitemap,
 * and the "related calculators" block. One list, so a tool cannot exist in the
 * nav but be missing from the sitemap.
 *
 * `status`:
 *   'live'    — page definition exists in src/content/pages/, fully built
 *   'planned' — registered and linked from the build order, page not yet written
 *
 * Build order follows the spec: amazon-fba -> etsy -> ebay -> reseller ->
 * paypal -> freelance-hourly -> self-employment-tax -> paycheck -> rest.
 */

export const GROUPS = {
  marketplace: {
    id: 'marketplace',
    label: 'Marketplace fees',
    path: '/marketplace-fees/',
    blurb: 'What Amazon, Etsy, eBay, and Shopify actually take from each sale.',
    body: `
<h2>Why two platforms charging the same percentage do not cost the same</h2>

<p>Marketplace fees get quoted as a single percentage often enough that sellers
compare them as single percentages. That comparison is usually wrong, and it is
wrong in four specific ways. Every calculator in this section exists because one
of them applies.</p>

<h3>What the percentage is charged on</h3>

<p>The fee base matters more than the rate. Several marketplaces apply their
commission to the postage you charge as well as the item price. A seller who
shifts cost out of the item and into shipping pays the same commission either
way, and a seller offering free shipping pays commission on money they never
counted as revenue. Two platforms at an identical headline rate diverge the
moment one includes postage in the base and the other does not. Each calculator
here states its own fee base, because it is the input that most often explains
the gap between what a seller expected and what landed.</p>

<h3>Whether processing is bundled or charged separately</h3>

<p>Some marketplaces quote one number that already contains card processing.
Others quote a commission and then deduct processing on top, which adds a
percentage plus a fixed amount per order. The fixed component is invisible at
high order values and dominant at low ones — it is the reason a platform that
looks cheapest on a $200 sale can be the most expensive on a $12 one.</p>

<h3>Fixed fees, tiers, and cliffs</h3>

<p>Percentage fees scale smoothly. Listing fees, per-order fees and flat-rate
commissions below a threshold do not. A platform that charges a flat fee under
some price and a percentage above it has a discontinuity at that price, and just
below it the seller keeps less in absolute terms than a seller just above. Our
reseller comparison marks these cliffs explicitly rather than drawing a smooth
curve through them, because the curve would be a lie at exactly the price points
low-value resellers actually list at.</p>

<h3>Fulfilment priced on the box, not the sale</h3>

<p>Fulfilment fees do not care what an item sold for. They are priced on
dimensions and weight, which means they are a near-fixed cost per unit against a
variable revenue line. The same product in the same box costs the same to ship
whether it sells for $15 or $45 — so fulfilment is a margin question, not a fee
question, and a size tier boundary can cost more than the commission does. The
Amazon calculators model the tier the box actually falls into rather than
applying an average.</p>

<h2>Which calculator answers which question</h2>

<p>Use a single-platform calculator when you already know where you are selling
and want the arithmetic for one sale. Use a comparison when the platform is the
decision — those pages run the same item through every engine and report where
each one wins, including the revenue point at which the answer changes. Use the
margin calculator when the fee is settled and the question is what price
supports the margin you need.</p>`,
  },
  processor: {
    id: 'processor',
    label: 'Payment processors',
    path: '/payment-processor-fees/',
    blurb: 'What PayPal, Stripe, and Square deduct before the money reaches you.',
    body: `
<h2>Why is the processor fee on a small payment so much higher than the rate?</h2>

<p>Because almost every processor charges a percentage <em>plus</em> a fixed
amount per transaction, and the fixed amount does not shrink with the payment.
A rate quoted as "2.9% + 30&cent;" is 2.9% only in the limit. On a $100 payment
the effective rate is about 3.2%. On a $10 payment it is about 5.9%. On a $3
payment it is over 12%. The headline rate is the number you approach from above,
never the number you pay.</p>

<p>This single mechanism explains most of the surprise in processor pricing, and
it has a practical consequence: batching matters. One $200 invoice costs less to
collect than ten $20 invoices, and the gap is the fixed fee times nine. If you
can consolidate billing, that is usually worth more than switching processor.</p>

<h2>What else comes out that is not in the headline rate?</h2>

<p>The advertised rate covers a domestic card in your own currency, presented
online, that is not disputed. Step outside any of those conditions and there is
usually a separate line:</p>

<ul>
<li><strong>Cross-border.</strong> A card issued in another country typically
carries an added percentage, applied on top of the standard rate rather than
instead of it.</li>
<li><strong>Currency conversion.</strong> Charged separately from the
cross-border fee, so an international sale in a foreign currency can attract
both. This is the line most often missed when a seller compares a domestic
quote against an international reality.</li>
<li><strong>Chargebacks and disputes.</strong> A flat fee per dispute,
frequently retained even when the dispute is resolved in your favour.</li>
<li><strong>Payout and account fees.</strong> Instant payouts, and in some cases
currency payouts to a foreign bank account, are priced separately from
accepting the payment.</li>
</ul>

<h2>How do I charge enough to receive a specific amount?</h2>

<p>You cannot add the fee percentage to the price and arrive at the right
number. Adding 2.9% to $100 gives $102.90, and the fee is then charged on
$102.90 rather than on $100 — so you land short. The correct operation is
division, not addition: the gross needed is the target plus the fixed fee, all
divided by one minus the rate. The charge-to-receive calculator performs exactly
that inversion, which is why it exists as its own tool rather than as a note on
another page.</p>

<h2>Which of these tools should I use?</h2>

<p>Use a single-processor calculator to see the deduction on a payment you are
about to take. Use the comparison when the processor itself is the open
question, and pay attention to where the lines cross rather than which is
cheaper on average — at typical small-ticket values the ranking can invert.
Use charge-to-receive whenever the amount you need to <em>end up with</em> is
fixed, which is the usual case for invoicing.</p>`,
  },
  freelance: {
    id: 'freelance',
    label: 'Freelance & contractor',
    path: '/freelance-tools/',
    blurb: 'Rates, quotes, quarterly tax, and what an invoice really leaves you.',
    body: `
<h2>Why is a freelance hourly rate not comparable to a salaried one?</h2>

<p>Because an hourly rate is charged on billable hours only, while a salary is
paid on all of them. A freelancer who bills 25 hours in a 40-hour week is
earning their rate on roughly 60% of the time they work — the rest goes to
quoting, invoicing, admin, and finding the next piece of work. Before any tax
enters the picture, the effective rate is already well below the quoted one.</p>

<p>Then three costs that an employer normally absorbs move onto the freelancer:
the employer half of payroll tax, paid holiday and sick leave, and benefits such
as health cover and retirement contributions. The common heuristic of doubling a
target salary to reach an hourly rate is a rough attempt to price all of this at
once. It is in the right region for many situations and badly wrong for some,
which is why the hourly-rate calculator asks for the specific inputs rather than
applying a multiplier.</p>

<h2>What is self-employment tax and why is it larger than expected?</h2>

<p>Self-employment tax is both halves of Social Security and Medicare. An
employee pays one half and never sees the other, because the employer remits it.
Someone self-employed is both parties and owes both halves — so the rate roughly
doubles relative to the number on a payslip. It is assessed on net business
profit rather than on gross receipts, and it sits alongside income tax rather
than replacing it.</p>

<p>Two things soften it, and both are frequently missed. A portion of the tax is
itself deductible when computing income tax, and business expenses reduce the
profit the tax is assessed on before the rate is applied. The self-employment
tax calculator applies both rather than quoting the headline rate against gross
income, which would overstate the bill considerably.</p>

<h2>Why do quarterly payments catch people out?</h2>

<p>Because nothing withholds them. An employee's tax arrives in instalments they
never have to schedule; a freelancer's does not arrive until they send it.
Income earned in one quarter is generally due shortly after that quarter closes,
not at the end of the year — so a profitable first quarter creates a payment
obligation months before any annual return exists. The money has usually been
spent by then. Estimating the liability as income is earned, rather than
reconstructing it later, is the entire point of doing this arithmetic early.</p>

<h2>Which of these tools should I use?</h2>

<p>Use the hourly-rate calculator when setting or revising what you charge, and
the day-rate calculator when a client wants a daily figure rather than an hourly
one — the conversion is not simply eight hours. Use the self-employment tax
calculator to estimate what to set aside as you earn. Use invoice take-home when
a specific invoice has landed and the question is what part of it is actually
yours.</p>`,
  },
  paycheck: {
    id: 'paycheck',
    label: 'Paycheck & tax',
    path: '/paycheck-calculator/',
    blurb: 'Take-home pay after federal, state, and FICA.',
  },
};

export const TOOLS = [
  /* ---------------------------------------------- marketplace fees ------ */
  {
    id: 'amazon-fba',
    order: 1,
    status: 'live',
    group: 'marketplace',
    calculator: 'amazon-fba',
    path: '/amazon-fba-calculator/',
    slug: 'amazon-fba-calculator',
    h1: 'Amazon FBA Profit Calculator — Referral, Fulfillment & Storage Fees (2026)',
    linkLabel: 'Amazon FBA calculator',
    title: 'Amazon FBA Calculator 2026 — Referral, Fulfillment & Storage Fees',
    description:
      'Work out real FBA profit: referral fee by category, fulfillment fee by size tier, storage, and net margin. Free, no signup, 2026 rate card.',
    blurb: 'Referral fee, fulfillment fee, storage, and the margin left over.',
    keyword: 'amazon fba calculator',
    // No `locale` field = the en-US default. localeFamily groups this with
    // its /uk/ sibling (declared at the end of this array — see the note
    // there on why array POSITION, not the `order` field, matters here) so
    // both pages get a self-referencing hreflang cluster; see
    // hreflangCluster() in build/build.mjs.
    localeFamily: 'amazon-fba',
  },
  {
    id: 'etsy-fees',
    order: 2,
    status: 'live',
    group: 'marketplace',
    calculator: 'etsy-fees',
    path: '/etsy-fee-calculator/',
    slug: 'etsy-fee-calculator',
    h1: "Etsy Fee Calculator — See Exactly What You Keep After Etsy's Fees (2026)",
    linkLabel: 'Etsy fee calculator',
    title: 'Etsy Fee Calculator 2026 — What You Actually Keep on Any Sale',
    description:
      "Enter your item price and shipping. See Etsy's listing, transaction, processing and Offsite Ads fees, and your exact net profit. Free, 2026 rates.",
    blurb: 'The 6.5% that also applies to the shipping you charge.',
    keyword: 'etsy fee calculator',
  },
  {
    id: 'ebay-fees',
    order: 3,
    status: 'live',
    group: 'marketplace',
    calculator: 'ebay-fees',
    path: '/ebay-fee-calculator/',
    slug: 'ebay-fee-calculator',
    h1: 'eBay Fee Calculator — Final Value Fees and Your Net Payout (2026)',
    linkLabel: 'eBay fee calculator',
    title: 'eBay Fee Calculator 2026 — Final Value Fee & Net Payout',
    description:
      'Calculate eBay final value fees, per-order fees, store subscription discounts and promoted listing costs. See your exact payout on any sale. Free, 2026 rates.',
    blurb: 'Final value fee by category, including the part charged on shipping.',
    keyword: 'ebay fee calculator',
  },
  {
    id: 'reseller-comparison',
    order: 4,
    status: 'live',
    group: 'marketplace',
    calculator: 'reseller-comparison',
    path: '/reseller-fee-calculator/',
    slug: 'reseller-fee-calculator',
    h1: 'Reseller Fee Calculator — Compare Net Payout Across Poshmark, Mercari, Depop, eBay, Vinted & StockX',
    linkLabel: 'Reseller platform comparison',
    title: 'Reseller Fee Calculator — Which Platform Pays You Most?',
    description:
      'Enter one sale price. See side-by-side net payout across Poshmark, Mercari, Depop, eBay, Vinted and StockX. Find the platform that takes the least. 2026 fees.',
    blurb: 'Same item, eight platforms, side by side. Where should you list it?',
    keyword: 'reseller fee calculator',
  },
  {
    id: 'shopify-fees',
    order: 8,
    status: 'live',
    group: 'marketplace',
    calculator: 'shopify-fees',
    path: '/shopify-fee-calculator/',
    slug: 'shopify-fee-calculator',
    h1: 'Shopify Fee Calculator — Plan Costs, Payments and Gateway Fees (2026)',
    linkLabel: 'Shopify fee calculator',
    title: 'Shopify Fee Calculator 2026 — Plan, Payments & Gateway Costs',
    description:
      'Compare Shopify plan costs, Shopify Payments rates, and the extra transaction fee for third-party gateways. Find which plan is cheapest at your order volume.',
    blurb: 'Which plan is cheapest at your volume, and is a third-party gateway worth it?',
    keyword: 'shopify fee calculator',
  },

  /* ---------------------------------------------- payment processors ---- */
  {
    id: 'paypal-fees',
    order: 5,
    status: 'live',
    group: 'processor',
    calculator: 'processor-fees',
    path: '/paypal-fee-calculator/',
    slug: 'paypal-fee-calculator',
    h1: 'PayPal Fee Calculator — Goods & Services, International, and Invoice Fees (2026)',
    linkLabel: 'PayPal fee calculator',
    title: 'PayPal Fee Calculator 2026 — Goods & Services, International, Invoice',
    description:
      'Exactly what PayPal deducts on any payment — domestic, international, goods and services, or invoice — and what lands in your account. Reverse mode included.',
    blurb: 'Domestic, international, goods vs friends and family.',
    keyword: 'paypal fee calculator',
    defaults: { processorId: 'paypal', productId: 'checkout' },
  },
  {
    id: 'stripe-fees',
    order: 9,
    status: 'live',
    group: 'processor',
    calculator: 'processor-fees',
    path: '/stripe-fee-calculator/',
    slug: 'stripe-fee-calculator',
    h1: 'Stripe Fee Calculator — Card, ACH, International & Payout Fees (2026)',
    linkLabel: 'Stripe fee calculator',
    title: 'Stripe Fee Calculator 2026 — Card, International & Payout Fees',
    description:
      'Calculate Stripe processing fees for card payments, ACH, international cards, and currency conversion, including the instant payout surcharge.',
    blurb: 'Card, ACH, international, and currency conversion.',
    keyword: 'stripe fee calculator',
    defaults: { processorId: 'stripe', productId: 'online-domestic' },
  },
  {
    id: 'charge-to-receive',
    order: 10,
    status: 'live',
    group: 'processor',
    calculator: 'charge-to-receive',
    path: '/charge-to-receive-calculator/',
    slug: 'charge-to-receive-calculator',
    h1: 'Reverse Fee Calculator — What to Charge to Receive an Exact Amount',
    linkLabel: 'Charge-to-receive calculator',
    title: 'Reverse Fee Calculator — What to Charge to Receive Exactly $X',
    description:
      'You need $500 in your account. What do you invoice? Reverse-calculates the gross amount for PayPal, Stripe, Wise and card processing fees. Free, instant.',
    blurb: '"I need to receive exactly $500 — what do I charge?"',
    keyword: 'reverse paypal fee calculator',
  },

  /* ---------------------------------------------- freelance ------------- */
  {
    id: 'freelance-hourly-rate',
    order: 6,
    status: 'live',
    group: 'freelance',
    calculator: 'freelance-hourly-rate',
    path: '/freelance-hourly-rate-calculator/',
    slug: 'freelance-hourly-rate-calculator',
    h1: 'Freelance Hourly Rate Calculator — What to Charge Per Hour (2026)',
    linkLabel: 'Freelance hourly rate calculator',
    title: 'Freelance Hourly Rate Calculator 2026 — What to Charge Per Hour',
    description:
      'Work backwards from the income you want to the hourly rate you need, accounting for unbillable hours, self-employment tax, business expenses, and time off.',
    blurb: 'Work backwards from the income you want to the rate you need.',
    keyword: 'freelance hourly rate calculator',
  },
  {
    id: 'day-rate',
    order: 11,
    status: 'live',
    group: 'freelance',
    calculator: 'day-rate',
    path: '/day-rate-calculator/',
    slug: 'day-rate-calculator',
    h1: 'Day Rate Calculator — Contractor and Freelance Project Pricing (2026)',
    linkLabel: 'Day rate calculator',
    title: 'Day Rate Calculator 2026 — Contractor & Freelance Pricing',
    description:
      'Convert between hourly, day, and project rates, and see what a given day rate earns across a year once unbillable days and tax are accounted for.',
    blurb: 'Day rate to annual income, and back again.',
    keyword: 'day rate calculator',
  },
  {
    id: 'self-employment-tax',
    order: 7,
    status: 'live',
    group: 'freelance',
    calculator: 'self-employment-tax',
    path: '/self-employment-tax-calculator/',
    slug: 'self-employment-tax-calculator',
    h1: 'Self-Employment Tax Calculator 2026 — 1099 Tax and Quarterly Estimates',
    linkLabel: '1099 self-employment tax calculator',
    title: 'Self-Employment Tax Calculator 2026 — 1099 & Quarterly Estimates',
    description:
      'Estimate 2026 self-employment tax, federal and state income tax, and the QBI deduction on 1099 income — with a dated quarterly schedule and safe-harbour check.',
    blurb: 'SE tax, income tax, and a dated quarterly payment schedule.',
    keyword: 'self employment tax calculator',
    dataset: {
      name: 'US federal and state tax parameters, tax year 2026',
      description:
        'Federal brackets, standard deduction, FICA wage base, self-employment tax rates, QBI thresholds, and state income tax schedules for California, New York, Illinois, Texas, and Florida.',
      temporalCoverage: '2026',
    },
  },
  {
    id: 'invoice-take-home',
    order: 12,
    status: 'live',
    group: 'freelance',
    calculator: 'invoice-take-home',
    path: '/invoice-take-home-calculator/',
    slug: 'invoice-take-home-calculator',
    h1: 'Invoice Take-Home Calculator — What You Actually Keep From a 1099 Invoice',
    linkLabel: 'Invoice take-home calculator',
    title: 'Invoice Take-Home Calculator — What You Keep From a 1099',
    description:
      'Enter an invoice amount and see what actually reaches you after payment processing and the tax you need to set aside at your marginal rate.',
    blurb: 'How much of this invoice is actually yours to spend?',
    keyword: 'invoice take home calculator',
  },

  /* ---------------------------------------------- paycheck -------------- */
  {
    id: 'paycheck',
    order: 8,
    status: 'live',
    group: 'paycheck',
    calculator: 'paycheck',
    path: '/paycheck-calculator/',
    slug: 'paycheck-calculator',
    h1: 'Paycheck Calculator',
    linkLabel: 'US paycheck calculator',
    title: 'Paycheck Calculator 2026 — Take-Home Pay After Tax | AfterFees',
    description:
      'Calculate your 2026 take-home pay after federal income tax, state tax, Social Security, and Medicare, including 401(k) and pre-tax health deductions.',
    blurb: 'Gross to net, with 401(k) and pre-tax deductions handled correctly.',
    keyword: 'paycheck calculator',
    hasStateSpokes: true,
  },

  /* ---------------------------------------------- later ----------------- */
  {
    id: 'margin-markup',
    order: 13,
    status: 'live',
    group: 'marketplace',
    calculator: 'margin-markup',
    path: '/profit-margin-calculator/',
    slug: 'profit-margin-calculator',
    h1: 'Profit Margin & Markup Calculator — Price From a Target Margin',
    linkLabel: 'Profit margin calculator',
    title: 'Profit Margin & Markup Calculator — Price From a Margin',
    description:
      'Convert between margin and markup, price from a target margin, and find your break-even volume. A 50% markup is a 33% margin — this shows the difference.',
    blurb: 'Margin and markup are different numbers. This shows both.',
    keyword: 'profit margin calculator',
  },

  /* ---------------------------------------------- resale spokes --------- */
  /**
   * Two platforms from the reseller comparison get their own page, because
   * each has a question attached to it that the comparison cannot answer in a
   * table row: Poshmark's $15 cliff, and the very widely believed idea that
   * Mercari still charges sellers nothing. Both are at the end of the array
   * for the siblingsFor() reason documented on amazon-fba-uk.
   */
  {
    id: 'poshmark-fees',
    order: 19,
    status: 'live',
    group: 'marketplace',
    calculator: 'reseller-single',
    path: '/poshmark-fee-calculator/',
    slug: 'poshmark-fee-calculator',
    h1: 'Poshmark Fee Calculator — What You Keep After the 20% Commission (2026)',
    linkLabel: 'Poshmark fee calculator',
    title: 'Poshmark Fee Calculator 2026 — Commission and Net Payout',
    description:
      'What Poshmark takes from any sale, including the flat fee under $15 and the narrow band of prices just above it where charging more leaves you with less.',
    blurb: 'A flat fee under $15, 20% above — and a dead band between them.',
    keyword: 'poshmark fee calculator',
  },
  {
    id: 'mercari-fees',
    order: 20,
    status: 'live',
    group: 'marketplace',
    calculator: 'reseller-single',
    path: '/mercari-fee-calculator/',
    slug: 'mercari-fee-calculator',
    h1: 'Mercari Fee Calculator — The 10% Seller Fee and What You Keep (2026)',
    linkLabel: 'Mercari fee calculator',
    title: 'Mercari Fee Calculator 2026 — Seller Fee and Net Payout',
    description:
      'Mercari charges sellers 10% again — on the item price plus the postage you collect. Work out the fee and your exact payout on any sale.',
    blurb: 'Yes, Mercari charges sellers again. 10%, including on postage.',
    keyword: 'mercari fee calculator',
  },

  /* ---------------------------------------------- head-to-head ---------- */
  /**
   * The comparison pages. Deliberately filed under the SAME groups as the
   * calculators they compare rather than in a "comparisons" group of their
   * own: a visitor browses by subject (marketplace fees, processors), not by
   * the format of the page, and a fifth index page listing four items would
   * mostly duplicate what the group pages already say.
   *
   * Placed here, near the end of the array, for the reason spelled out on
   * amazon-fba-uk below — siblingsFor() slices TOOLS by array POSITION. The
   * three `marketplace` entries change nothing for existing marketplace tools,
   * whose sibling lists were already five deep. The one `processor` entry DOES
   * change the related-links block on the three processor pages, which is the
   * intended effect: /paypal-vs-stripe-fees/ has to be reachable from
   * /paypal-fee-calculator/ or it has no internal links pointing at it at all.
   * The marketplace three get theirs from COMPARISONS below instead.
   */
  {
    id: 'marketplace-fee-comparison',
    order: 15,
    status: 'live',
    group: 'marketplace',
    calculator: 'channel-versus',
    path: '/marketplace-fee-comparison/',
    slug: 'marketplace-fee-comparison',
    h1: 'Marketplace Fee Comparison 2026 — What Every Selling Channel Actually Takes',
    linkLabel: 'Marketplace fee comparison',
    title: 'Marketplace Fee Comparison 2026 — Etsy vs eBay vs Amazon vs More',
    description:
      'One price in, sixteen selling channels ranked by what you keep. Etsy, eBay, Amazon, Shopify, Mercari, Poshmark, Depop, Vinted and more, at your own volume.',
    blurb: 'Sixteen selling channels, one sale price, ranked by what reaches you.',
    keyword: 'marketplace fee comparison',
  },
  {
    id: 'etsy-vs-shopify-fees',
    order: 16,
    status: 'live',
    group: 'marketplace',
    calculator: 'channel-versus',
    path: '/etsy-vs-shopify-fees/',
    slug: 'etsy-vs-shopify-fees',
    h1: 'Etsy vs Shopify Fees (2026) — The Exact Sales Volume Where Shopify Gets Cheaper',
    linkLabel: 'Etsy vs Shopify fees',
    title: 'Etsy vs Shopify Fees 2026 — Where Shopify Becomes Cheaper',
    description:
      "Etsy takes a cut of every sale; Shopify charges a flat monthly plan. The two costs cross at one computable point. This works out exactly where yours is.",
    blurb: 'A cut of every sale against a flat monthly plan. Where do they cross?',
    keyword: 'etsy vs shopify fees',
  },
  {
    id: 'ebay-vs-mercari-fees',
    order: 17,
    status: 'live',
    group: 'marketplace',
    calculator: 'channel-versus',
    path: '/ebay-vs-mercari-fees/',
    slug: 'ebay-vs-mercari-fees',
    h1: 'eBay vs Mercari Fees (2026) — What Each One Takes From the Same Sale',
    linkLabel: 'eBay vs Mercari fees',
    title: 'eBay vs Mercari Fees 2026 — Side by Side on the Same Sale',
    description:
      "eBay's 13.6% against Mercari's 10%, on the same item, including what each charges on postage and sales tax. See the real gap and what it costs you a year.",
    blurb: 'Same item, both listings. What the 3.6-point gap is really worth.',
    keyword: 'ebay vs mercari fees',
  },
  {
    id: 'paypal-vs-stripe-fees',
    order: 18,
    status: 'live',
    group: 'processor',
    calculator: 'channel-versus',
    path: '/paypal-vs-stripe-fees/',
    slug: 'paypal-vs-stripe-fees',
    h1: 'PayPal vs Stripe Fees (2026) — Which Costs Less on Your Payment Size',
    linkLabel: 'PayPal vs Stripe fees',
    title: 'PayPal vs Stripe Fees 2026 — Which Is Cheaper at Your Amount',
    description:
      'PayPal 3.49% + $0.49 against Stripe 2.9% + $0.30, plus the two pricing tiers that beat both — micropayments under $10 and ACH above it. With the crossovers.',
    blurb: 'Which is cheaper depends on the amount. Here are the crossovers.',
    keyword: 'paypal vs stripe fees',
  },

  /* ---------------------------------------------- locale variants -------- */
  /**
   * Declared LAST, not next to `amazon-fba` above, on purpose. siblingsFor()
   * builds each page's "related calculators" from TOOLS array POSITION
   * (filter, then slice(0, N)) — every other 'marketplace' tool's sibling
   * list is already 5-deep, so inserting this earlier in the array would
   * silently bump one of their existing links and change already-shipped
   * pages. At the end, it only ever affects ITS OWN sibling list.
   */
  {
    id: 'amazon-fba-uk',
    order: 14,
    status: 'live',
    group: 'marketplace',
    calculator: 'amazon-fba-uk',
    locale: 'en-GB',
    localeFamily: 'amazon-fba',
    path: '/uk/amazon-fba-calculator/',
    // Matches the nested dist/uk/amazon-fba-calculator/ directory writePage()
    // creates from `path` (strips leading/trailing slashes, keeps the rest).
    // A flat hyphenated slug here would look right but silently point
    // parity.test.js's file lookup and the /og/ image path at the wrong file.
    slug: 'uk/amazon-fba-calculator',
    h1: 'Amazon FBA UK Profit Calculator',
    linkLabel: 'Amazon FBA UK calculator',
    title: 'Amazon FBA UK Calculator 2026 — Fees, Size Tiers & Profit',
    description:
      'Work out real FBA UK profit in GBP: referral fee, fulfilment fee by Amazon.co.uk’s own 13 size tiers, storage, and net margin. Free, no signup, 2026 rate card.',
    blurb: 'UK referral fee, fulfilment fee by Amazon.co.uk’s own size tiers, storage, and the margin left over.',
    keyword: 'amazon fba uk calculator',
  },
];

/**
 * State spokes for the paycheck cluster. DELIBERATELY EMPTY — do not refill
 * this without reading the rest of this comment.
 *
 * It held ['CA', 'TX', 'NY', 'FL', 'IL'] until 2026-09-11, which generated five
 * ~2,200-word pages at /paycheck-calculator/<state>/. Measured against each
 * other they were 80–92% identical text: the Florida and Texas pages ran to 438
 * lines each and differed on 42, every one of them the state name substituted.
 * Neither state levies income tax, so the arithmetic was byte-identical and the
 * ranking sentence rendered as "Texas ranks 2 of 5, $0 a year behind Florida".
 *
 * That is Google's definition of a doorway page — near-duplicate pages spun up
 * to catch keyword variants — and it is the most likely trigger for the
 * "Low value content" policy violation AdSense raised against the site.
 *
 * The spoke machinery below (`hasStateSpokes`, `def.spoke()`, the spoke loop in
 * build.mjs) is left intact and dormant, because per-state pages are a good
 * idea IF each one carries content only that state can justify — NYC's local
 * income tax, California's SDI, Illinois' flat rate. Refill this array only
 * alongside that content, and never with a state whose only distinguishing
 * fact is its name. The five-state comparison table on the hub page already
 * covers the comparison itself, and keeps doing so with this empty.
 */
export const PAYCHECK_STATES = [];

/**
 * Directory card metadata chips.
 *
 * These replaced the old `live` tag, which appeared identically on every card
 * and told a visitor nothing. Each chip names something this specific tool
 * models that a naive percentage calculator does not — which is also the thing
 * that makes the page worth visiting.
 *
 * Rule: a chip states a CAPABILITY, never a rate. Rates live in the rate JSON
 * and reach the card through the computed footer stat, so a chip can never go
 * stale against a fee change.
 */
export const CARD_CHIPS = {
  'amazon-fba': ['Size tiers', 'Storage fees', 'Dimensional weight'],
  'amazon-fba-uk': ['UK · GBP', '13 size tiers'],
  'etsy-fees': ['Offsite Ads', 'Fee on shipping'],
  'ebay-fees': ['Store tiers', 'Fee on sales tax'],
  'reseller-comparison': ['9 platforms', 'Ranked payout'],
  'shopify-fees': ['Plan comparison', 'Gateway fees'],
  'paypal-fees': ['International', 'Micropayments'],
  'stripe-fees': ['International', 'ACH & disputes'],
  'charge-to-receive': ['Gross-up', 'Any processor'],
  'freelance-hourly-rate': ['W-2 equivalent', 'Unpaid time'],
  'day-rate': ['Project minimum'],
  'invoice-take-home': ['Federal + state'],
  'self-employment-tax': ['Quarterly schedule', 'Schedule SE'],
  paycheck: ['5 states', 'FICA + federal'],
  'margin-markup': ['Margin vs markup'],
  'marketplace-fee-comparison': ['16 channels', 'Ranked by payout', 'Fee cliffs'],
  'poshmark-fees': ['$15 cliff', 'Buyer-paid label'],
  'mercari-fees': ['Fee on postage', 'Flat 10%'],
  'etsy-vs-shopify-fees': ['Volume crossover', 'Plan vs commission'],
  'ebay-vs-mercari-fees': ['Fee on postage', 'Fee on sales tax'],
  'paypal-vs-stripe-fees': ['Crossover amounts', 'ACH & micropayments'],
};

/**
 * Head-to-head pages worth linking from a given calculator.
 *
 * A separate map rather than a change to siblingsFor(), because that function
 * builds every page's related-links block by slicing TOOLS in array order and
 * any change to what it returns rewrites blocks on already-shipped pages that
 * had nothing to do with this. This adds a second, smaller block instead, and
 * each entry is a deliberate choice about which comparison a reader of that
 * specific calculator would actually want next.
 *
 * The processor pages are absent on purpose: /paypal-vs-stripe-fees/ shares
 * their group, so siblingsFor() already surfaces it there and a second link to
 * the same page on the same page helps nobody.
 */
export const COMPARISONS = {
  'etsy-fees': ['etsy-vs-shopify-fees', 'marketplace-fee-comparison'],
  'shopify-fees': ['etsy-vs-shopify-fees', 'marketplace-fee-comparison'],
  'ebay-fees': ['ebay-vs-mercari-fees', 'marketplace-fee-comparison'],
  'reseller-comparison': ['ebay-vs-mercari-fees', 'marketplace-fee-comparison'],
  'poshmark-fees': ['marketplace-fee-comparison', 'ebay-vs-mercari-fees'],
  'mercari-fees': ['ebay-vs-mercari-fees', 'marketplace-fee-comparison'],
  'amazon-fba': ['marketplace-fee-comparison'],
  'margin-markup': ['marketplace-fee-comparison'],
  // And the reverse direction: a comparison page points at the other three.
  'marketplace-fee-comparison': ['etsy-vs-shopify-fees', 'ebay-vs-mercari-fees', 'paypal-vs-stripe-fees'],
  'etsy-vs-shopify-fees': ['marketplace-fee-comparison', 'ebay-vs-mercari-fees'],
  'ebay-vs-mercari-fees': ['marketplace-fee-comparison', 'etsy-vs-shopify-fees'],
  'paypal-vs-stripe-fees': ['marketplace-fee-comparison'],
};

/** The comparison pages to surface on a tool page, as full TOOLS entries. */
export function comparisonsFor(toolId) {
  return (COMPARISONS[toolId] ?? []).map(findTool).filter(Boolean);
}

export const liveTools = () => TOOLS.filter((t) => t.status === 'live');
export const findTool = (id) => TOOLS.find((t) => t.id === id);

/**
 * Sibling links for a tool page. The spec wants 3-5 internal links to related
 * tools; this picks same-group first, then fills from other groups so every
 * page links across the hub rather than staying in its silo.
 */
export function siblingsFor(toolId, count = 4) {
  const tool = findTool(toolId);
  if (!tool) return [];
  const sameGroup = TOOLS.filter((t) => t.group === tool.group && t.id !== toolId);
  const otherGroups = TOOLS.filter((t) => t.group !== tool.group);
  return [...sameGroup, ...otherGroups].slice(0, count);
}
