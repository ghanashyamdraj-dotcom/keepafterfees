/**
 * versus.js — head-to-head channel cost comparison.
 *
 * Every other calculator on this site answers "what does THIS platform take?".
 * This one answers the question that actually precedes it: "which platform
 * should I be on at all?" — and that question has a different shape, because
 * the channels do not all charge the same KIND of money.
 *
 * A marketplace charges a percentage of each sale and nothing else. A
 * storefront charges a fixed monthly subscription and a much smaller
 * percentage. Those two cost curves cross, exactly once, at a computable
 * point — and every article comparing them says "it depends on your volume"
 * without ever saying what volume. The crossover is:
 *
 *   monthlyFixedGap / perOrderFeeGap = orders per month
 *
 * which this engine solves rather than describes.
 *
 * Design notes:
 *
 *   - A channel is DECLARED, not implemented. Each entry names an existing
 *     engine and how to feed it. No fee arithmetic lives in this file, so a
 *     rate correction in src/data/ moves every comparison automatically and
 *     there is no second copy of any fee rule to drift.
 *
 *   - Traits are PROBED, not asserted. "Does this platform charge its fee on
 *     the postage you collect?" is answered by running the channel twice and
 *     comparing, so the capability matrix on the comparison pages cannot go
 *     stale against a rate change or be wrong about a platform. See
 *     `probeTraits()`.
 *
 *   - Revenue is declared per channel rather than read from the engine's
 *     gross, because the engines disagree about what counts. eBay books the
 *     sales tax it collects as revenue and remits it as a cost (correct for
 *     that page, since eBay charges its fee on the tax); a channel comparison
 *     that carried tax into revenue would rank a platform higher for handling
 *     more money that was never the seller's. `revenueOf` is the seller's
 *     money only.
 */

import { nonNeg, num, round2, usd } from '../money.js';
import { result, invalid } from '../result.js';

import { calculateEtsy } from './etsy.js';
import { calculateEbay } from './ebay.js';
import { calculateShopify } from './shopify.js';
import { compareResellers } from './resellers.js';
import { calculateProcessorFee } from './processors.js';
import { referralFee } from './amazon.js';

const CALC = 'channel-versus';

/* ------------------------------------------------------------- helpers -- */

/** Total of the fee-kind lines in an engine result. Never counts your costs. */
function feeTotal(res) {
  if (!res?.ok) return null;
  return round2(
    res.lines
      .filter((l) => l.kind === 'fee' && l.amount)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0)
  );
}

/** The fee lines themselves, for the per-channel breakdown. */
function feeLines(res) {
  if (!res?.ok) return [];
  return res.lines
    .filter((l) => l.kind === 'fee' && l.amount)
    .map((l) => ({ label: l.label, amount: round2(Math.abs(l.amount)) }));
}

/**
 * One reseller platform, run through the shared reseller engine.
 *
 * `sellerPaysShipping: true` is passed deliberately: on a channel comparison
 * the seller has already decided to offer the buyer a delivered price, and the
 * whole point of the comparison is that Poshmark and Vinted hand the buyer a
 * prepaid label so that choice costs the seller nothing there and costs real
 * money everywhere else. Leaving it false would hide the single biggest
 * structural difference between these platforms.
 */
function reseller(id, input, rates) {
  const cmp = compareResellers(
    {
      salePrice: input.orderValue,
      shippingCharged: input.shippingCharged,
      shippingCost: input.shippingCost,
      sellerPaysShipping: true,
      itemCost: 0,
      stockxLevel: input.stockxLevel,
      platforms: [id],
    },
    rates.resellers
  );
  if (!cmp.ok || !cmp.rows.length) return null;
  const row = cmp.rows[0];
  const f = row.fees;
  return {
    revenue: row.grossRevenue,
    fees: f.totalFees,
    sellerShipping: f.shipping,
    lines: [
      { label: 'Commission', amount: f.commission },
      { label: 'Payment processing', amount: f.processing },
      { label: 'Per-order fee', amount: f.perOrder },
      { label: 'Listing fee', amount: f.listing },
    ].filter((l) => l.amount > 0),
  };
}

/* ------------------------------------------------------------ channels -- */

/**
 * Every way of taking money that this site has verified rate data for.
 *
 * `run(input, rates)` returns the normalised shape every row is built from:
 *   revenue        — the seller's own money on one order, tax excluded
 *   fees           — what the channel takes from it
 *   sellerShipping — postage the seller pays out of that, if any
 *   lines[]        — the fee breakdown, for the per-channel detail
 * `monthlyFixed(input, rates)` is the subscription, zero for most channels.
 */
export const CHANNELS = [
  /* --- marketplaces you list on ------------------------------------- */
  {
    id: 'etsy',
    label: 'Etsy',
    kind: 'marketplace',
    sourceKey: 'etsy',
    path: '/etsy-fee-calculator/',
    blurb: 'A listing fee, 6.5% of the item and the postage, then card processing on top.',
    run: (i, rates) => {
      const res = calculateEtsy(
        {
          itemPrice: i.orderValue,
          shippingCharged: i.shippingCharged,
          salesTaxCollected: i.salesTaxCollected,
          autoRenew: true,
        },
        rates.etsy
      );
      const fees = feeTotal(res);
      if (fees === null) return null;
      return {
        revenue: round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged)),
        fees,
        sellerShipping: nonNeg(i.shippingCost),
        lines: feeLines(res),
      };
    },
    monthlyFixed: () => 0,
    modelsSalesTax: true,
  },

  {
    id: 'ebay',
    label: 'eBay',
    kind: 'marketplace',
    sourceKey: 'ebay',
    path: '/ebay-fee-calculator/',
    blurb: 'One final value fee that already includes processing, charged on the whole order.',
    run: (i, rates) => {
      const res = calculateEbay(
        {
          salePrice: i.orderValue,
          shippingCharged: i.shippingCharged,
          salesTaxCollected: i.salesTaxCollected,
          storeTier: i.ebayStoreTier ?? 'none',
          amortiseStore: false,
        },
        rates.ebay
      );
      const fees = feeTotal(res);
      if (fees === null) return null;
      return {
        // Deliberately excludes the sales tax eBay books as revenue: it is
        // remitted, never the seller's. eBay still charges its fee on it, and
        // that fee IS counted above — which is the point the eBay pages make.
        revenue: round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged)),
        fees,
        sellerShipping: nonNeg(i.shippingCost),
        lines: feeLines(res),
      };
    },
    monthlyFixed: (i, rates) => {
      const tier = rates.ebay.storeSubscriptions.find((s) => s.id === (i.ebayStoreTier ?? 'none'));
      return tier?.monthlyAnnual ?? 0;
    },
    modelsSalesTax: true,
  },

  /**
   * Amazon, referral fee only — twice, once per selling plan.
   *
   * FBA fulfilment is NOT included and must not be, on this page. It depends
   * on the packed dimensions and billable weight of a specific product, so
   * there is no honest single figure for "Amazon's fee on a $50 sale"; the
   * FBA calculator asks for the box because the box is the answer. What IS
   * comparable across channels is the referral fee, which is a pure function
   * of category and price, and that is what these two rows carry. Every page
   * using them says so in the row note.
   */
  {
    id: 'amazon-individual',
    label: 'Amazon (Individual)',
    kind: 'marketplace',
    sourceKey: 'amazon',
    path: '/amazon-fba-calculator/',
    blurb: 'Referral fee plus $0.99 per item sold. No monthly subscription.',
    note: 'Referral fee only — FBA fulfilment depends on size and weight.',
    run: (i, rates) => amazonRow(i, rates, false),
    monthlyFixed: () => 0,
  },
  {
    id: 'amazon-professional',
    label: 'Amazon (Professional)',
    kind: 'marketplace',
    sourceKey: 'amazon',
    path: '/amazon-fba-calculator/',
    blurb: 'Referral fee only, but $39.99 a month whether you sell anything or not.',
    note: 'Referral fee only — FBA fulfilment depends on size and weight.',
    run: (i, rates) => amazonRow(i, rates, true),
    monthlyFixed: (i, rates) => rates.amazon.accountFees.professionalMonthly,
  },

  /* --- your own storefront ------------------------------------------- */
  {
    id: 'shopify',
    label: 'Shopify',
    kind: 'storefront',
    sourceKey: 'shopify',
    path: '/shopify-fee-calculator/',
    blurb: 'A monthly plan buys a much lower card rate. Nothing else is taken.',
    run: (i, rates) => {
      const res = calculateShopify(
        {
          orderValue: i.orderValue,
          shippingCharged: i.shippingCharged,
          plan: i.shopifyPlan ?? 'basic',
          annualBilling: i.shopifyAnnual !== false,
          amortisePlan: false,
        },
        rates.shopify
      );
      const fees = feeTotal(res);
      if (fees === null) return null;
      return {
        revenue: round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged)),
        fees,
        sellerShipping: nonNeg(i.shippingCost),
        lines: feeLines(res),
      };
    },
    monthlyFixed: (i, rates) => {
      const plan = rates.shopify.plans.find((p) => p.id === (i.shopifyPlan ?? 'basic'))
        ?? rates.shopify.plans[0];
      return i.shopifyAnnual === false ? plan.monthlyMonthly : plan.monthlyAnnual;
    },
  },

  /* --- resale marketplaces ------------------------------------------- */
  ...[
    ['mercari', 'Mercari', '10% of the item plus the postage you collect, and nothing else.'],
    ['poshmark', 'Poshmark', 'A flat fee under $15, 20% at or above it. The buyer pays for the label.'],
    ['depop', 'Depop', 'No selling fee for US sellers — only Depop Payments processing.'],
    ['vinted', 'Vinted', 'Nothing at all from the seller. The buyer carries every fee.'],
    ['facebook-marketplace', 'Facebook Marketplace', '10% of the whole order, with a $0.80 floor.'],
    ['grailed', 'Grailed', '6% under $120, 9% at or above it, plus separate card processing.'],
    ['stockx', 'StockX', 'Commission by seller level plus 3% processing, and you ship for authentication.'],
  ].map(([id, label, blurb]) => ({
    id,
    label,
    kind: 'resale',
    sourceKey: 'resellers',
    path: '/reseller-fee-calculator/',
    blurb,
    run: (i, rates) => reseller(id, i, rates),
    monthlyFixed: () => 0,
  })),

  /* --- selling from your own site, processor only --------------------- */
  ...[
    ['paypal', 'PayPal', 'paypal', 'checkout', 'The default rate on a goods-and-services payment.'],
    ['paypal-micropayments', 'PayPal Micropayments', 'paypal', 'micropayments', 'A lower fixed fee bought with a higher percentage. Account-wide.'],
    ['stripe', 'Stripe', 'stripe', 'online-domestic', 'Standard card rate, no monthly cost on the pay-as-you-go plan.'],
    ['stripe-ach', 'Stripe (ACH)', 'stripe', 'ach', 'A percentage capped in absolute dollars, so it flattens on big invoices.'],
  ].map(([id, label, processorId, productId, blurb]) => ({
    id,
    label,
    kind: 'processor',
    sourceKey: 'processors',
    path: processorId === 'paypal' ? '/paypal-fee-calculator/' : '/stripe-fee-calculator/',
    blurb,
    run: (i, rates) => {
      const res = calculateProcessorFee(
        {
          amount: round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged)),
          processorId,
          productId,
          international: Boolean(i.international),
          currencyConversion: Boolean(i.currencyConversion),
        },
        rates.processors
      );
      const fees = feeTotal(res);
      if (fees === null) return null;
      return {
        revenue: round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged)),
        fees,
        sellerShipping: nonNeg(i.shippingCost),
        lines: feeLines(res),
      };
    },
    monthlyFixed: () => 0,
  })),
];

/**
 * Amazon referral fee on the seller's total sales price.
 *
 * Amazon's own definition of the referral base is the item price plus the
 * delivery charge plus gift wrap, so the postage the seller collects is part
 * of it — unlike the FBA calculator, which models the FBA case where Amazon
 * does the shipping and there is no postage to collect.
 */
function amazonRow(i, rates, professional) {
  const base = round2(nonNeg(i.orderValue) + nonNeg(i.shippingCharged));
  if (base <= 0) return null;
  const ref = referralFee(i.amazonCategoryId ?? 'default', base, rates.amazon);
  const perItem = professional ? 0 : rates.amazon.accountFees.individualPerItem;
  return {
    revenue: base,
    fees: round2(ref.amount + ref.closingFee + perItem),
    sellerShipping: nonNeg(i.shippingCost),
    lines: [
      { label: `Referral fee (${(ref.effectiveRate * 100).toFixed(1)}%)`, amount: ref.amount },
      { label: 'Media closing fee', amount: ref.closingFee },
      { label: 'Individual plan, per item', amount: perItem },
    ].filter((l) => l.amount > 0),
  };
}

export const findChannel = (id) => CHANNELS.find((c) => c.id === id);

/* ------------------------------------------------------------ matchups -- */

/**
 * The named comparisons the pages are built on.
 *
 * `axis` decides which question the page answers, and the result block relabels
 * itself from it:
 *   'volume' — a subscription is in play, so the answer is a monthly total and
 *              the interesting number is the orders-per-month crossover.
 *   'price'  — every contender charges per sale, so the answer is per sale and
 *              the interesting number is the sale price at which the winner
 *              changes, if it ever does.
 */
export const MATCHUPS = {
  'etsy-vs-shopify': {
    axis: 'volume',
    channels: ['etsy', 'shopify'],
  },
  'ebay-vs-mercari': {
    axis: 'price',
    channels: ['ebay', 'mercari'],
  },
  'paypal-vs-stripe': {
    axis: 'price',
    channels: ['paypal', 'stripe', 'paypal-micropayments', 'stripe-ach'],
  },
  'all-channels': {
    axis: 'volume',
    channels: CHANNELS.map((c) => c.id),
  },
};

function resolveMatchup(input) {
  if (Array.isArray(input.channels) && input.channels.length) {
    return { axis: input.axis ?? 'price', channels: input.channels };
  }
  return MATCHUPS[input.matchup] ?? MATCHUPS['all-channels'];
}

/* ----------------------------------------------------------- the engine -- */

/**
 * @param {object} input
 * @param {number} input.orderValue      What the buyer pays for the item.
 * @param {number} input.shippingCharged Postage collected from the buyer.
 * @param {number} input.shippingCost    Postage the seller actually pays.
 * @param {number} input.itemCost        What the item cost the seller.
 * @param {number} input.monthlyOrders   Orders per month, for the monthly total.
 * @param {string} input.matchup         A key of MATCHUPS.
 * @param {string[]} [input.channels]    An explicit channel subset, overriding it.
 */
export function compareChannels(input, rates, { formatMoney = usd } = {}) {
  const orderValue = nonNeg(input.orderValue);
  if (orderValue <= 0) return invalid(CALC, 'Enter an order value above $0 to compare channels.');

  const { axis, channels } = resolveMatchup(input);
  const monthlyOrders = Math.max(1, Math.floor(num(input.monthlyOrders, 1)));
  const itemCost = nonNeg(input.itemCost);

  const rows = [];
  for (const id of channels) {
    const channel = findChannel(id);
    if (!channel) continue;
    const r = channel.run(input, rates);
    if (!r) continue;

    const monthlyFixed = round2(channel.monthlyFixed(input, rates));
    const netPerOrder = round2(r.revenue - r.fees - r.sellerShipping - itemCost);
    const monthlyNet = round2(netPerOrder * monthlyOrders - monthlyFixed);

    rows.push({
      id,
      label: channel.label,
      path: channel.path,
      kind: channel.kind,
      blurb: channel.blurb,
      note: channel.note ?? null,
      revenue: r.revenue,
      perOrderFees: r.fees,
      sellerShipping: r.sellerShipping,
      lines: r.lines,
      monthlyFixed,
      netPerOrder,
      monthlyNet,
      monthlyRevenue: round2(r.revenue * monthlyOrders),
      monthlyCost: round2(r.fees * monthlyOrders + monthlyFixed),
      // What the channel takes as a share of the seller's own money. The
      // subscription is folded in at this volume, which is the only way a
      // fixed cost and a percentage can be put on one axis at all.
      effectiveRate: r.revenue > 0 ? (r.fees * monthlyOrders + monthlyFixed) / (r.revenue * monthlyOrders) : 0,
    });
  }

  if (!rows.length) return invalid(CALC, 'No channels matched that comparison.');

  const key = axis === 'volume' ? 'monthlyNet' : 'netPerOrder';
  rows.sort((a, b) => b[key] - a[key] || a.monthlyFixed - b.monthlyFixed);

  const best = rows[0];
  const worst = rows.at(-1);
  const spread = round2(best[key] - worst[key]);

  // No `rates` on the builder: this result draws on several rate files at
  // once, so there is no single version/effective date to stamp on it and a
  // meta block naming one of them would be a citation for the wrong thing.
  // The comparison pages assemble the union of sources instead — see
  // mergedSources() in build/build.mjs.
  const r = result({ calculator: CALC })
    .inputs(input)
    .revenue('order', `Order value${monthlyOrders > 1 ? ` x ${monthlyOrders} a month` : ''}`, orderValue * monthlyOrders)
    .revenue('shipping-charged', 'Postage charged to the buyer', nonNeg(input.shippingCharged) * monthlyOrders)
    .cost('item-cost', 'What the goods cost you', itemCost * monthlyOrders)
    .info('best', axis === 'volume' ? 'Cheapest at this volume' : 'Best net per sale',
      `${best.label} — ${formatMoney(best[key])}`)
    .info('spread', 'Gap to the worst option', formatMoney(spread),
      `Choosing ${best.label} over ${worst.label} is worth ${formatMoney(spread)}${axis === 'volume' ? ' a month' : ' on every sale'}.`)
    .extra({ rows, best, worst, spread, axis, monthlyOrders, matchup: input.matchup ?? null });

  if (axis === 'volume' && rows.some((x) => x.monthlyFixed > 0)) {
    r.note('A subscription is a cost you pay whether or not you sell anything, so it is folded into the monthly totals here rather than shown as a rate. Drop the order count and watch the ranking turn over.');
  }
  if (rows.some((x) => x.id.startsWith('amazon'))) {
    r.note('The Amazon rows carry the referral fee only. FBA fulfilment is charged by packed size and billable weight, so it has no single figure at a given price — the Amazon FBA calculator asks for the box because the box is what decides it.');
  }

  return r.build();
}

/**
 * Column set for the ranked table, keyed on the comparison's axis.
 *
 * Lives here, next to the engine, rather than being written out twice in
 * build/build.mjs and src/client/registry.js the way the older comparison
 * tables are. Both of those call renderComparison() with whatever this
 * returns, so the server-rendered table and the one the browser re-renders on
 * the first keystroke cannot describe different columns.
 */
export function versusTable(axis) {
  const money = (v) => usd(v ?? 0);
  const rate = (v) => `${((v ?? 0) * 100).toFixed(2)}%`;

  if (axis === 'volume') {
    return {
      bestKey: 'monthlyNet',
      columns: [
        { key: 'label', label: 'Channel' },
        { key: 'perOrderFees', label: 'Fee per order', format: (r) => money(r.perOrderFees) },
        { key: 'monthlyFixed', label: 'Plan / month', format: (r) => (r.monthlyFixed ? money(r.monthlyFixed) : '—') },
        { key: 'monthlyCost', label: 'Total cost / month', format: (r) => money(r.monthlyCost) },
        { key: 'effectiveRate', label: 'All-in rate', format: (r) => rate(r.effectiveRate) },
        { key: 'monthlyNet', label: 'You keep / month', format: (r) => money(r.monthlyNet) },
      ],
    };
  }

  return {
    bestKey: 'netPerOrder',
    columns: [
      { key: 'label', label: 'Channel' },
      { key: 'perOrderFees', label: 'Fee', format: (r) => money(r.perOrderFees) },
      { key: 'effectiveRate', label: 'Fee rate', format: (r) => rate(r.effectiveRate) },
      { key: 'sellerShipping', label: 'Postage you pay', format: (r) => (r.sellerShipping ? money(r.sellerShipping) : '—') },
      { key: 'netPerOrder', label: 'You keep', format: (r) => money(r.netPerOrder) },
    ],
  };
}

/* -------------------------------------------------------- the crossover -- */

/**
 * The order count at which two channels cost exactly the same, and the monthly
 * revenue that represents.
 *
 * Both curves are `monthlyFixed + perOrderFee x N`, so they meet where
 *
 *   fixedA + feeA N = fixedB + feeB N
 *   N = (fixedA - fixedB) / (feeB - feeA)
 *
 * Note which side each gap is on: the channel with the LARGER subscription has
 * to have the SMALLER per-order fee for a positive crossover to exist at all.
 * When it does not — both fixed costs equal, or the dearer subscription also
 * charges more per order — one channel simply wins everywhere and this returns
 * null rather than a number that would imply a decision point that isn't there.
 *
 * `revenue` is N x the order value, and it is the more useful of the two
 * figures: it barely moves as the order value changes, because N falls at
 * almost exactly the rate the order value rises. See the asymptote below.
 */
export function volumeCrossover(a, b, orderValue) {
  if (!a || !b) return null;
  const fixedGap = a.monthlyFixed - b.monthlyFixed;
  const feeGap = b.perOrderFees - a.perOrderFees;
  if (feeGap === 0) return null;
  const orders = fixedGap / feeGap;
  if (!Number.isFinite(orders) || orders <= 0) return null;
  return {
    orders,
    ordersRounded: Math.ceil(orders),
    revenue: round2(orders * nonNeg(orderValue)),
    cheaperBelow: a.monthlyFixed < b.monthlyFixed ? a : b,
    cheaperAbove: a.monthlyFixed < b.monthlyFixed ? b : a,
  };
}

/**
 * The monthly revenue the volume crossover converges on as the order value
 * grows without bound.
 *
 * Writing each channel's per-order fee as `rate x value + fixed`, the crossover
 * revenue is
 *
 *   N x value = subscriptionGap x value / (rateGap x value + fixedGap)
 *
 * whose limit as value -> infinity is simply `subscriptionGap / rateGap`. The
 * per-order fixed components drop out entirely. That is why "you need about
 * $600 a month in sales before a storefront beats a marketplace" is a far more
 * robust sentence than any order count, and why this site quotes the revenue
 * figure rather than the order count that every other comparison quotes.
 *
 * Probed rather than read off the rate cards, so it holds for any pair of
 * channels regardless of which engines back them. Returns null when the
 * schedules never cross.
 */
export function crossoverAsymptote(idA, idB, input, rates) {
  const a = findChannel(idA);
  const b = findChannel(idB);
  if (!a || !b) return null;

  const feeAt = (channel, value) => {
    const r = channel.run({ ...input, orderValue: value, shippingCharged: 0 }, rates);
    return r ? r.fees : null;
  };

  // Two widely separated probes give the slope of each fee line. Linear
  // schedules are exact; a schedule with a threshold between the probes would
  // not be, which is what `isLinear` checks for before the caller trusts it.
  const lo = 1000;
  const hi = 2000;
  const [aLo, aHi, bLo, bHi] = [feeAt(a, lo), feeAt(a, hi), feeAt(b, lo), feeAt(b, hi)];
  if ([aLo, aHi, bLo, bHi].some((v) => v === null)) return null;

  const rateA = (aHi - aLo) / (hi - lo);
  const rateB = (bHi - bLo) / (hi - lo);
  const rateGap = rateA - rateB;

  const fixedGap = a.monthlyFixed(input, rates) - b.monthlyFixed(input, rates);
  if (rateGap === 0 || fixedGap === 0) return null;

  // The curves only cross if the channel charging the larger subscription is
  // the one charging the smaller percentage. Same sign on both gaps means one
  // channel is dearer on both counts and simply loses everywhere — there is no
  // decision point to report, and inventing one would be worse than silence.
  if (Math.sign(rateGap) === Math.sign(fixedGap)) return null;

  return {
    revenue: round2(Math.abs(fixedGap) / Math.abs(rateGap)),
    rateGap: Math.abs(rateGap),
    rateA,
    rateB,
    cheaperBelow: fixedGap < 0 ? a : b,
    cheaperAbove: fixedGap < 0 ? b : a,
  };
}

/**
 * The sale price at which the ranking between two channels flips, if it does.
 *
 * There is no closed form here — a channel may be backed by a tiered schedule,
 * a cliff, a minimum fee, or all three — so this bisects on the sign of the
 * difference in net per order. It first checks the two ends of the range: when
 * they agree, one channel wins across the whole range and the honest answer is
 * that there is no crossover, not a bisection artefact.
 */
export function priceCrossover(idA, idB, input, rates, { from = 1, to = 5000 } = {}) {
  const a = findChannel(idA);
  const b = findChannel(idB);
  if (!a || !b) return null;

  const diff = (value) => {
    const ra = a.run({ ...input, orderValue: value }, rates);
    const rb = b.run({ ...input, orderValue: value }, rates);
    if (!ra || !rb) return null;
    return (ra.revenue - ra.fees - ra.sellerShipping) - (rb.revenue - rb.fees - rb.sellerShipping);
  };

  const dLo = diff(from);
  const dHi = diff(to);
  if (dLo === null || dHi === null) return null;
  if (Math.sign(dLo) === Math.sign(dHi)) return null;

  let lo = from;
  let hi = to;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const d = diff(mid);
    if (d === null) return null;
    if (Math.sign(d) === Math.sign(dLo)) lo = mid;
    else hi = mid;
  }
  return {
    price: round2(Math.ceil(hi * 100) / 100),
    cheaperBelow: dLo > 0 ? a.label : b.label,
    cheaperAbove: dHi > 0 ? a.label : b.label,
  };
}

/**
 * Prices at which one more cent of asking price costs you more than a cent.
 *
 * This is the only kind of fee-schedule boundary a seller can actually act on.
 * A tier boundary that changes the slope of the fee is arithmetic trivia — you
 * still keep more by charging more. A CLIFF is different: crossing it re-rates
 * the whole sale, so there is a band of prices just above it where raising
 * your asking price leaves you with strictly less money. Poshmark's $15 is the
 * famous one; Grailed added a second at $120 in May 2026 and eBay's per-order
 * fee steps at $10. No platform publishes the dead zone that follows.
 *
 * The test is exact and needs no assumption about the shape of the schedule:
 *
 *   fee(p) - fee(p - $0.01) > $0.01
 *
 * At any rate below 100%, a single cent of extra price can only add a cent of
 * fee, plus at most a cent of rounding. Anything larger is a discontinuity.
 *
 * Cent-resolution scanning across the whole range would be tens of thousands
 * of engine runs per channel, so a coarse pass at whole dollars nominates
 * candidates by second difference — which catches a change of SLOPE as well as
 * a jump in level, and so does not miss Poshmark, whose fee rises only five
 * cents at its cliff — and only those neighbourhoods are scanned by the cent.
 *
 * Build-time only. A few hundred engine runs is nothing in a static build and
 * far too much on every keystroke, so no page calls this from the browser.
 */
export function detectCliffs(id, input, rates, { from = 1, to = 400, limit = 4 } = {}) {
  const channel = findChannel(id);
  if (!channel) return [];

  // Postage is zeroed on both sides: a cliff is a property of the fee
  // schedule, and leaving the seller's own postage in would subtract a
  // constant from every net figure here, which changes nothing about where the
  // cliff is but makes the quoted "you net" numbers read as the platform's
  // doing rather than the seller's own shipping choice.
  const netAt = (value) => {
    const r = channel.run({ ...input, orderValue: value, shippingCharged: 0, shippingCost: 0 }, rates);
    return r ? { fee: r.fees, net: round2(r.revenue - r.fees - r.sellerShipping) } : null;
  };
  const feeAt = (value) => netAt(value)?.fee ?? null;

  /* --- coarse pass: nominate dollars where the schedule changes shape --- */
  const candidates = [];
  let prevDelta = null;
  let prevFee = feeAt(from);

  for (let v = from + 1; v <= to; v += 1) {
    const f = feeAt(v);
    if (f === null || prevFee === null) { prevFee = f; continue; }
    const delta = round2(f - prevFee);
    if (prevDelta !== null && Math.abs(delta - prevDelta) > 0.02) candidates.push(v);
    prevDelta = delta;
    prevFee = f;
  }

  /* --- fine pass: the exact cent, and only if it is a real cliff -------- */
  const cliffs = [];
  const seen = new Set();

  for (const v of candidates) {
    if (cliffs.length >= limit) break;

    let hit = null;
    for (let c = Math.max(1, (v - 1) * 100); c <= (v + 1) * 100; c += 1) {
      const price = round2(c / 100);
      const before = feeAt(round2(price - 0.01));
      const after = feeAt(price);
      if (before === null || after === null) continue;
      // Three cents, not two. A channel typically rounds two components to
      // the cent independently — a commission and a processing fee — and a
      // single cent of price can tip both at once, so a two-cent step is
      // explainable by rounding alone and is not a schedule boundary. Only a
      // jump larger than the rounding can produce is structural.
      const jump = round2(after - before);
      if (jump > 0.02 && (!hit || jump > hit.jump)) hit = { price, jump, before, after };
    }
    if (!hit || seen.has(hit.price)) continue;
    seen.add(hit.price);

    // The dead zone: how far above the cliff you have to price before you are
    // back to keeping what you kept one cent below it. This is the number that
    // makes the cliff actionable, and it is the whole reason to compute the
    // boundary rather than just quote the rate change.
    const under = netAt(round2(hit.price - 0.01));
    let recovery = null;
    if (under) {
      for (let c = hit.price * 100; c <= (hit.price + 60) * 100; c += 1) {
        const price = round2(c / 100);
        const here = netAt(price);
        if (here && here.net >= under.net) { recovery = price; break; }
      }
    }

    cliffs.push({
      price: hit.price,
      feeBelow: hit.before,
      feeAt: hit.after,
      jump: hit.jump,
      netBelow: under?.net ?? null,
      // null means the seller never recovers within the search window, which
      // is a stronger statement than a number and is rendered as such.
      recoversAt: recovery,
      deadZone: recovery ? round2(recovery - hit.price) : null,
    });
  }

  return cliffs;
}

/**
 * Probed capability matrix for a set of channels.
 *
 * Every column here is the result of running the channel twice and comparing,
 * never of a field somebody typed into this file. A platform that starts
 * charging its fee on postage, or stops, changes this table on the next build
 * with no edit anywhere.
 */
export function probeTraits(ids, input, rates, { at = 100 } = {}) {
  const base = { ...input, orderValue: at, shippingCharged: 0, salesTaxCollected: 0, shippingCost: 0 };

  return ids.map((id) => {
    const channel = findChannel(id);
    if (!channel) return null;

    const plain = channel.run(base, rates);
    if (!plain) return null;

    const withPostage = channel.run({ ...base, shippingCharged: 10 }, rates);
    const withTax = channel.run({ ...base, salesTaxCollected: 10 }, rates);
    const withCost = channel.run({ ...base, shippingCost: 10 }, rates);
    const doubled = channel.run({ ...base, orderValue: at * 2 }, rates);

    return {
      id,
      label: channel.label,
      kind: channel.kind,
      path: channel.path,
      blurb: channel.blurb,
      note: channel.note ?? null,
      feeOnPostage: withPostage ? withPostage.fees - plain.fees > 0.005 : false,
      // The dollar figure, not just the flag. "Charges a fee on postage" is
      // true of both Etsy and eBay and hides the fact that eBay takes half
      // again as much of it; a boolean column would flatten the difference the
      // reader came for.
      postageFee: withPostage ? round2(withPostage.fees - plain.fees) : null,
      // Only meaningful where the channel's engine takes a sales-tax input at
      // all. Anywhere else this is "not modelled", not "no" — a claim that a
      // platform does not charge on tax is one this site has no data for.
      feeOnSalesTax: channel.modelsSalesTax
        ? Boolean(withTax && withTax.fees - plain.fees > 0.005)
        : null,
      salesTaxFee: channel.modelsSalesTax && withTax ? round2(withTax.fees - plain.fees) : null,
      sellerPaysPostage: withCost ? withCost.sellerShipping > 0.005 : false,
      monthlyFixed: round2(channel.monthlyFixed(input, rates)),
      feeAt: plain.fees,
      rateAt: plain.revenue > 0 ? plain.fees / plain.revenue : 0,
      // A schedule whose fee exactly doubles when the price doubles has no
      // fixed component; anything else does, and that is what makes a cheap
      // sale disproportionately expensive on that channel.
      hasFixedComponent: doubled ? Math.abs(doubled.fees - plain.fees * 2) > 0.005 : false,
    };
  }).filter(Boolean);
}
