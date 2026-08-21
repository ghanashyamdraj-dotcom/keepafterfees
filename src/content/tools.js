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
  },
  processor: {
    id: 'processor',
    label: 'Payment processors',
    path: '/payment-processor-fees/',
    blurb: 'What PayPal, Stripe, and Square deduct before the money reaches you.',
  },
  freelance: {
    id: 'freelance',
    label: 'Freelance & contractor',
    path: '/freelance-tools/',
    blurb: 'Rates, quotes, quarterly tax, and what an invoice really leaves you.',
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

/** State spokes for the paycheck cluster. Start with five, expand later. */
export const PAYCHECK_STATES = ['CA', 'TX', 'NY', 'FL', 'IL'];

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
};

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
