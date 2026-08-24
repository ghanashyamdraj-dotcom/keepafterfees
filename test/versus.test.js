/**
 * versus.test.js — the channel comparison engine.
 *
 * The comparison engine's job is to be right about WHICH CHANNEL WINS, so
 * these test the properties that decide a ranking rather than individual fee
 * figures. Each underlying engine's arithmetic is already covered in
 * engine.test.js and re-asserting it here would only prove that delegation
 * happened.
 *
 * The cases that matter are the ones where a comparison is easy to get
 * plausibly wrong: ranking on the fee column instead of on what the seller
 * keeps, letting a subscription scale per order, inventing a crossover between
 * two schedules that never actually cross, and reporting cent-rounding as if
 * it were a pricing cliff.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import * as rates from '../src/lib/rates.generated.js';
import { calculateEtsy } from '../src/lib/calc/etsy.js';
import { calculateEbay } from '../src/lib/calc/ebay.js';
import {
  compareChannels, volumeCrossover, crossoverAsymptote, priceCrossover,
  detectCliffs, probeTraits, versusTable, findChannel, CHANNELS, MATCHUPS,
} from '../src/lib/calc/versus.js';

const near = (actual, expected, tol = 0.011, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `${msg ?? ''} expected ~${expected}, got ${actual} (diff ${Math.abs(actual - expected).toFixed(4)})`);

const VS = {
  orderValue: 45, shippingCharged: 0, shippingCost: 9, itemCost: 0, monthlyOrders: 30,
  matchup: 'all-channels', shopifyPlan: 'basic', ebayStoreTier: 'none', stockxLevel: 'level-1',
};

/* ---------------------------------------------------------- delegation -- */

test('versus: every declared channel runs, and agrees with the engine behind it', () => {
  const res = compareChannels(VS, rates);
  assert.ok(res.ok);
  assert.equal(res.rows.length, CHANNELS.length, 'every channel should produce a row');

  // Spot-check against the engines these channels delegate to, so a change in
  // how a channel feeds its engine cannot pass silently.
  const etsyDirect = calculateEtsy({ itemPrice: 45, autoRenew: true }, rates.etsy);
  assert.equal(res.rows.find((r) => r.id === 'etsy').perOrderFees, etsyDirect.totals.fees);

  const ebayDirect = calculateEbay({ salePrice: 45 }, rates.ebay);
  assert.equal(res.rows.find((r) => r.id === 'ebay').perOrderFees, ebayDirect.totals.fees);
});

test('versus: sales tax is charged a fee on but never counted as revenue', () => {
  // eBay's own engine books collected tax as revenue and remits it as a cost,
  // which is right for that page. A channel comparison must not inherit it, or
  // eBay would rank higher for handling money that was never the seller's.
  const plain = compareChannels({ ...VS, matchup: 'ebay-vs-mercari' }, rates);
  const taxed = compareChannels({ ...VS, matchup: 'ebay-vs-mercari', salesTaxCollected: 100 }, rates);

  const ebayPlain = plain.rows.find((r) => r.id === 'ebay');
  const ebayTaxed = taxed.rows.find((r) => r.id === 'ebay');

  assert.equal(ebayTaxed.revenue, ebayPlain.revenue, 'collected tax is not the seller’s revenue');
  assert.ok(ebayTaxed.perOrderFees > ebayPlain.perOrderFees, 'but eBay does charge a fee on it');
  assert.ok(ebayTaxed.netPerOrder < ebayPlain.netPerOrder, 'so the seller keeps less');
});

/* ------------------------------------------------------------- ranking -- */

test('versus: rows are ranked by what the seller keeps, not by the fee', () => {
  const res = compareChannels(VS, rates);
  for (let i = 1; i < res.rows.length; i += 1) {
    assert.ok(res.rows[i - 1].monthlyNet >= res.rows[i].monthlyNet,
      `${res.rows[i - 1].label} should not rank above ${res.rows[i].label} while keeping less`);
  }

  // A platform charging a much larger percentage can still outrank one
  // charging less, because postage the seller never pays is worth more than
  // several points of commission. If this stops holding, the ranking has
  // quietly gone back to sorting on the fee column.
  const poshmark = res.rows.find((r) => r.id === 'poshmark');
  const mercari = res.rows.find((r) => r.id === 'mercari');
  assert.ok(poshmark.perOrderFees > mercari.perOrderFees, 'Poshmark charges more here');
  assert.ok(poshmark.monthlyNet > mercari.monthlyNet, 'yet keeps the seller more — the buyer pays postage');
});

test('versus: a subscription is charged monthly, not per order', () => {
  const one = compareChannels({ ...VS, monthlyOrders: 1 }, rates);
  const many = compareChannels({ ...VS, monthlyOrders: 100 }, rates);
  const fixedOf = (r, id) => r.rows.find((x) => x.id === id).monthlyFixed;

  assert.equal(fixedOf(one, 'shopify'), fixedOf(many, 'shopify'),
    'the plan fee must not scale with order count');

  const shopOne = one.rows.find((r) => r.id === 'shopify');
  const shopMany = many.rows.find((r) => r.id === 'shopify');
  assert.ok(shopOne.effectiveRate > shopMany.effectiveRate,
    'spreading a fixed cost over more orders must lower the all-in rate');
});

/* ---------------------------------------------------------- crossovers -- */

test('versus: the volume crossover really is where both cost the same', () => {
  const base = { ...VS, matchup: 'etsy-vs-shopify', shippingCost: 0 };
  const res = compareChannels(base, rates);
  const etsy = res.rows.find((r) => r.id === 'etsy');
  const shopify = res.rows.find((r) => r.id === 'shopify');

  const cross = volumeCrossover(etsy, shopify, base.orderValue);
  assert.ok(cross, 'these two schedules must cross');

  const costAt = (orders) => ({
    etsy: etsy.perOrderFees * orders,
    shopify: shopify.perOrderFees * orders + shopify.monthlyFixed,
  });

  const meeting = costAt(cross.orders);
  near(meeting.etsy, meeting.shopify, 0.01, 'costs should be equal at the crossover');

  // The cheaper side has to genuinely swap either side of it.
  const below = costAt(Math.max(1, cross.orders - 3));
  const above = costAt(cross.orders + 3);
  assert.ok(below.etsy < below.shopify, 'the marketplace is cheaper below the crossover');
  assert.ok(above.shopify < above.etsy, 'the storefront is cheaper above it');
});

test('versus: the crossover is a revenue threshold, not an order count', () => {
  // The claim /etsy-vs-shopify-fees/ is built on. As the basket grows the
  // order count collapses while the revenue it represents converges on
  // plan price / rate gap.
  const at = (orderValue) => {
    const r = compareChannels({ ...VS, matchup: 'etsy-vs-shopify', shippingCost: 0, orderValue }, rates);
    return volumeCrossover(
      r.rows.find((x) => x.id === 'etsy'),
      r.rows.find((x) => x.id === 'shopify'),
      orderValue
    );
  };
  const small = at(10);
  const large = at(1000);

  assert.ok(small.orders > large.orders * 50, 'the order count must fall steeply with basket size');
  assert.ok(large.revenue / small.revenue < 1.5, 'while the revenue it represents barely moves');

  const asym = crossoverAsymptote('etsy', 'shopify', { ...VS, shippingCost: 0 }, rates);
  assert.ok(asym, 'the limit must be solvable');
  near(large.revenue, asym.revenue, 5, 'a large basket should sit close to the limit');
});

test('versus: no crossover is reported when one channel wins everywhere', () => {
  // Mercari is cheaper than eBay at every price, and Stripe pairs a lower
  // percentage with a lower fixed fee than PayPal so it wins at every amount.
  // Reporting a threshold for either would invent a decision point that does
  // not exist, which is worse than saying nothing.
  assert.equal(priceCrossover('ebay', 'mercari', VS, rates), null);
  assert.equal(priceCrossover('paypal', 'stripe', VS, rates), null);

  // Neither pair carries a subscription, so there is no volume crossover.
  assert.equal(crossoverAsymptote('ebay', 'mercari', VS, rates), null);
});

test('versus: a real price crossover is found where one exists', () => {
  // PayPal micropayments trades a higher percentage for a lower fixed fee, so
  // it beats Stripe's card rate on small payments and loses on large ones.
  const flip = priceCrossover('paypal-micropayments', 'stripe', {}, rates, { from: 1, to: 200 });
  assert.ok(flip, 'these two must cross');
  assert.ok(flip.price > 5 && flip.price < 20, `crossover should be around $10, got $${flip.price}`);
  assert.equal(flip.cheaperBelow, 'PayPal Micropayments');
  assert.equal(flip.cheaperAbove, 'Stripe');
});

/* -------------------------------------------------------------- cliffs -- */

test('versus: cliffs are real discontinuities, not rounding', () => {
  const posh = rates.resellers.platforms.find((p) => p.id === 'poshmark');
  const poshmark = detectCliffs('poshmark', VS, rates);
  assert.equal(poshmark[0].price, posh.commission.threshold,
    'Poshmark’s flat-fee threshold is a cliff and must be found exactly');
  assert.ok(poshmark[0].recoversAt > poshmark[0].price,
    'you must have to charge MORE than the cliff to match what you kept below it');

  const grailed = detectCliffs('grailed', VS, rates);
  const cliff = grailed.find((c) => c.price === 120);
  assert.ok(cliff, 'Grailed re-rates the whole sale at $120 and that must be found');
  assert.ok(cliff.jump > 3, `the whole sale re-rates, so the jump is large: ${cliff.jump}`);
  assert.ok(cliff.deadZone > 1, 'and the dead band above it is wide enough to matter');
});

test('versus: a smooth schedule reports no cliffs at all', () => {
  // Etsy and Stripe are a flat percentage plus fixed fees with no thresholds
  // anywhere. Anything reported for them would be cent-rounding dressed up as
  // a pricing insight, which is exactly what an earlier version of the scan
  // produced before the threshold was raised above what rounding can cause.
  for (const id of ['etsy', 'stripe', 'mercari', 'vinted']) {
    assert.deepEqual(detectCliffs(id, VS, rates), [], `${id} has no cliffs`);
  }
});

test('versus: a minimum fee is a floor, not a cliff', () => {
  // Facebook and StockX both put a minimum under their commission. That makes
  // cheap items expensive but never makes charging more leave you with less,
  // so neither belongs in a cliff table.
  for (const id of ['facebook-marketplace', 'stockx']) {
    assert.deepEqual(detectCliffs(id, VS, rates), [], `${id} has a floor, not a cliff`);
  }
});

/* -------------------------------------------------------------- traits -- */

test('versus: traits are probed from the engines rather than declared', () => {
  const traits = probeTraits(['etsy', 'ebay', 'poshmark', 'vinted'], VS, rates, { at: 100 });
  const by = Object.fromEntries(traits.map((t) => [t.id, t]));

  // Etsy and eBay charge on the postage you collect. Poshmark and Vinted hand
  // the buyer a prepaid label, so there is no postage in their fee base.
  assert.equal(by.etsy.feeOnPostage, true);
  assert.equal(by.ebay.feeOnPostage, true);
  assert.equal(by.poshmark.feeOnPostage, false);
  assert.equal(by.vinted.feeOnPostage, false);
  assert.ok(by.ebay.postageFee > by.etsy.postageFee,
    'and not by the same amount — eBay takes more of it than Etsy does');

  assert.ok(by.ebay.salesTaxFee > 0, 'eBay charges its fee on tax that was never the seller’s');

  // Where an engine has no sales-tax input, the trait must be null. "Not
  // modelled" is not the same claim as "this platform charges nothing", and
  // the matrix on the comparison pages renders the two differently.
  assert.equal(by.poshmark.salesTaxFee, null);
  assert.equal(by.poshmark.feeOnSalesTax, null);

  assert.equal(by.vinted.feeAt, 0, 'Vinted takes nothing from the seller');
});

/* ------------------------------------------------------------ contract -- */

test('versus: every matchup names channels that exist', () => {
  for (const [name, m] of Object.entries(MATCHUPS)) {
    assert.ok(m.axis === 'volume' || m.axis === 'price', `${name} needs a valid axis`);
    assert.ok(m.channels.length >= 2, `${name} needs at least two channels`);
    for (const id of m.channels) {
      assert.ok(findChannel(id), `${name} names unknown channel "${id}"`);
    }
  }
});

test('versus: the table config ranks on the column the axis answers in', () => {
  // The ranked table marks its winner by `bestKey`, and renderComparison marks
  // the HIGHEST value. Both keys are "money kept" figures, so a bestKey that
  // pointed at a cost column would highlight the worst row as the best one.
  assert.equal(versusTable('volume').bestKey, 'monthlyNet');
  assert.equal(versusTable('price').bestKey, 'netPerOrder');

  for (const axis of ['volume', 'price']) {
    const { columns, bestKey } = versusTable(axis);
    assert.ok(columns.some((c) => c.key === bestKey), `${axis}: the ranking column must be shown`);
    for (const c of columns) {
      assert.ok(c.label, 'every column needs a header');
    }
  }
});

test('versus: garbage in does not produce a confident ranking', () => {
  for (const bad of [{}, { orderValue: 0 }, { orderValue: -5 }, { orderValue: 'abc' }]) {
    const res = compareChannels({ ...bad, matchup: 'all-channels' }, rates);
    assert.equal(res.ok, false);
    assert.ok(res.error, 'a failed comparison must still explain itself');
  }
});

test('versus: an unknown matchup falls back rather than throwing', () => {
  const res = compareChannels({ ...VS, matchup: 'not-a-real-matchup' }, rates);
  assert.ok(res.ok);
  assert.equal(res.rows.length, CHANNELS.length);
});

/* ============================================ single-platform resale ==== */

/**
 * calculateReseller() exists because compareResellers() puts its fee detail
 * inside `rows[]` — the right shape for a ranked table and the wrong one for a
 * page about one platform, whose breakdown would otherwise show a payout with
 * nothing visibly taken out of it. These check that the single-platform view
 * agrees with the comparison it was extracted from.
 */

test('reseller-single: one platform agrees with the comparison it came from', async () => {
  const { calculateReseller, compareResellers } = await import('../src/lib/calc/resellers.js');
  const input = { salePrice: 45, shippingCharged: 8, shippingCost: 8, itemCost: 12, sellerPaysShipping: true };

  for (const id of ['poshmark', 'mercari', 'depop', 'vinted', 'grailed']) {
    const single = calculateReseller({ ...input, platformId: id }, rates.resellers);
    const row = compareResellers({ ...input, platforms: [id] }, rates.resellers).rows[0];

    assert.ok(single.ok, `${id} should compute`);
    assert.equal(single.fees.totalFees, row.fees.totalFees, `${id}: fee total must match the comparison`);
    assert.equal(single.totals.net, row.netProfit, `${id}: net must match the comparison`);
  }
});

test('reseller-single: every fee the platform charges appears as its own line', async () => {
  const { calculateReseller } = await import('../src/lib/calc/resellers.js');
  const input = { salePrice: 200, shippingCharged: 8, shippingCost: 8, itemCost: 0, sellerPaysShipping: true };

  for (const id of ['poshmark', 'mercari', 'grailed', 'stockx']) {
    const r = calculateReseller({ ...input, platformId: id }, rates.resellers);
    const lineTotal = r.lines
      .filter((l) => l.kind === 'fee' && l.amount)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    near(lineTotal, r.fees.totalFees, 0.011,
      `${id}: the fee lines must sum to the fee total, or the breakdown hides a charge`);
  }

  // Vinted takes nothing, so it must show nothing rather than a zero line.
  const vinted = calculateReseller({ ...input, platformId: 'vinted' }, rates.resellers);
  assert.equal(vinted.lines.filter((l) => l.kind === 'fee' && l.amount).length, 0);
  assert.equal(vinted.fees.totalFees, 0);
});

test('reseller-single: postage enters the fee base only where the platform says so', async () => {
  const { calculateReseller } = await import('../src/lib/calc/resellers.js');
  const at = (id, shippingCharged) => calculateReseller(
    { platformId: id, salePrice: 45, shippingCharged, shippingCost: 0, itemCost: 0 }, rates.resellers);

  // Mercari charges on item + postage; Poshmark's buyer-paid label is not
  // the seller's revenue and not in the base.
  assert.ok(at('mercari', 10).fees.totalFees > at('mercari', 0).fees.totalFees);
  assert.equal(at('poshmark', 10).fees.totalFees, at('poshmark', 0).fees.totalFees);

  assert.equal(at('mercari', 10).feeBase, 55);
  assert.equal(at('poshmark', 10).feeBase, 45);
});

test('reseller-single: the Poshmark cliff raises a warning inside the dead band', async () => {
  const { calculateReseller } = await import('../src/lib/calc/resellers.js');
  const posh = rates.resellers.platforms.find((p) => p.id === 'poshmark');
  const at = (salePrice) => calculateReseller(
    { platformId: 'poshmark', salePrice, shippingCharged: 0, shippingCost: 0, itemCost: 0 }, rates.resellers);

  const inside = at(posh.commission.threshold);
  assert.ok(inside.warnings.some((w) => w.includes('better off')),
    'a price on the cliff must warn that listing a cent lower pays more');

  // And the warning must be TRUE — the cent below really does net more.
  const below = at(posh.commission.threshold - 0.01);
  assert.ok(below.totals.net > inside.totals.net);

  // Well clear of the band, no warning.
  assert.equal(at(45).warnings.length, 0);
});
