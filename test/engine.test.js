/**
 * engine.test.js — the calculation engine.
 *
 * These tests exist because a fee calculator that is subtly wrong is worse than
 * no calculator: it produces confident, specific, incorrect numbers that people
 * price inventory against. The cases below are the ones where third-party fee
 * calculators are most often wrong.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import * as rates from '../src/lib/rates.generated.js';
import { toCents, tieredCents, round2, toRate, bracket } from '../src/lib/money.js';
import { calculateAmazonFBA, resolveSizeTier, referralFee, fulfillmentFee } from '../src/lib/calc/amazon.js';
import { calculateEtsy } from '../src/lib/calc/etsy.js';
import { calculateEbay } from '../src/lib/calc/ebay.js';
import { calculateShopify, comparePlans } from '../src/lib/calc/shopify.js';
import { compareResellers } from '../src/lib/calc/resellers.js';
import { calculateProcessorFee, calculateChargeToReceive, micropaymentsCrossover } from '../src/lib/calc/processors.js';
import { calculateSelfEmploymentTax } from '../src/lib/calc/setax.js';
import { calculatePaycheck } from '../src/lib/calc/paycheck.js';
import { calculateHourlyRate, salaryEquivalent } from '../src/lib/calc/freelance.js';
import { calculateMargin, marginFromMarkup, markupFromMargin } from '../src/lib/calc/margin.js';
import { bracketTax, selfEmploymentTax, ficaOnWages } from '../src/lib/calc/tax.js';

const near = (actual, expected, tol = 0.011, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `${msg ?? ''} expected ~${expected}, got ${actual} (diff ${Math.abs(actual - expected).toFixed(4)})`);

/* ============================================================== money ==== */

test('money: cents conversion survives the classic float traps', () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents(1.005), 101);          // not 100
  assert.equal(toCents(29.99), 2999);
  assert.equal(toCents(-5.55), -555);
  assert.equal(toCents('  $1,234.56 '), 123456);
  assert.equal(toCents('nonsense'), 0);
});

test('money: marginal vs flat tiering are genuinely different', () => {
  const tiers = [{ upTo: 100, rate: 0.2 }, { upTo: null, rate: 0.05 }];
  // Marginal: 20% of first $100, 5% of the next $100 = $20 + $5 = $25
  assert.equal(tieredCents(toCents(200), tiers, 'marginal'), toCents(25));
  // Flat: the whole $200 lands in the second tier = 5% of $200 = $10
  assert.equal(tieredCents(toCents(200), tiers, 'flat'), toCents(10));
});

test('money: toRate accepts both 15 and 0.15 as 15%', () => {
  assert.equal(toRate(15), 0.15);
  assert.equal(toRate(0.15), 0.15);
  assert.equal(toRate(0), 0);
});

test('money: bracket lookup returns the last entry when over range', () => {
  const b = [{ upTo: 10, value: 'a' }, { upTo: 20, value: 'b' }];
  assert.equal(bracket(5, b).value, 'a');
  assert.equal(bracket(15, b).value, 'b');
  assert.equal(bracket(500, b).value, 'b');
});

/* ============================================================= amazon ==== */

test('amazon: size tier uses dimensional weight above small-standard', () => {
  // A light, bulky item: 16 x 12 x 6 in, 14 oz. Fits the large-standard
  // envelope (18 x 14 x 8) on every axis, but dimensional weight is
  // 1152 / 139 = 8.29 lb = 132.6 oz — nearly ten times the actual weight.
  const tier = resolveSizeTier({ lengthIn: 16, widthIn: 12, heightIn: 6, weightOz: 14 }, rates.amazon);
  assert.equal(tier.id, 'large-standard');
  assert.ok(tier.dimensionalApplied, 'dimensional weight should govern');
  near(tier.dimensionalWeightOz, (16 * 12 * 6 / 139) * 16, 0.1);
  assert.ok(tier.billableWeightOz > 130, 'billable weight follows the dimensional figure, not the 14 oz scale reading');
});

test('amazon: an item past the large-standard envelope becomes large-bulky', () => {
  const tier = resolveSizeTier({ lengthIn: 24, widthIn: 18, heightIn: 10, weightOz: 14 }, rates.amazon);
  assert.equal(tier.id, 'large-bulky');
  assert.ok(tier.dimensionalApplied);
});

test('amazon: small-standard ignores dimensional weight', () => {
  const tier = resolveSizeTier({ lengthIn: 10, widthIn: 8, heightIn: 0.5, weightOz: 6 }, rates.amazon);
  assert.equal(tier.id, 'small-standard');
  assert.equal(tier.billableWeightOz, 6, 'small standard bills actual weight with no packaging add');
  assert.equal(tier.dimensionalApplied, false);
});

test('amazon: clothing referral is banded (flat), jewelry is marginal', () => {
  // Clothing: 5% under $15, 10% to $20, 17% above.
  near(referralFee('clothing', 14.99, rates.amazon).amount, 0.75, 0.01);
  near(referralFee('clothing', 19.99, rates.amazon).amount, 2.0, 0.01);
  near(referralFee('clothing', 20.99, rates.amazon).amount, 3.57, 0.01);

  // Jewelry: 20% of the first $250, then 5%. On $600 = $50 + $17.50 = $67.50.
  near(referralFee('jewelry', 600, rates.amazon).amount, 67.5, 0.01);
  // A flat 20% would be $120 — the bug this test guards against.
  assert.notEqual(round2(referralFee('jewelry', 600, rates.amazon).amount), 120);
});

test('amazon: minimum referral fee applies on cheap items', () => {
  const r = referralFee('home-kitchen', 1.5, rates.amazon);
  assert.equal(r.amount, rates.amazon.referral.minimumFee);
  assert.ok(r.hitMinimum);
  assert.ok(r.effectiveRate > 0.15, 'effective rate exceeds the headline percentage');
});

test('amazon: fulfillment fee grows with weight and uses the overage formula', () => {
  const light = fulfillmentFee('large-standard', 10, rates.amazon);
  const heavy = fulfillmentFee('large-standard', 40, rates.amazon);
  const overage = fulfillmentFee('large-standard', 200, rates.amazon);
  assert.ok(light < heavy, 'heavier costs more');
  assert.ok(heavy < overage, 'overage formula continues past the last bracket');
});

test('amazon: full calculation reconciles and break-even is a real zero', () => {
  const input = {
    salePrice: 29.99, productCost: 7.5, shipToAmazon: 0.85, otherCosts: 0.4,
    categoryId: 'home-kitchen', lengthIn: 9, widthIn: 6, heightIn: 3, weightOz: 12,
    storageMonths: 2, monthlyUnits: 150, professionalPlan: true,
  };
  const r = calculateAmazonFBA(input, rates.amazon);

  assert.ok(r.ok);
  // The line items must sum to the stated net.
  const sum = r.lines.filter((l) => l.kind !== 'info').reduce((a, l) => a + l.amount, 0);
  near(sum, r.totals.net, 0.011, 'lines must sum to net');

  // Break-even must actually produce ~zero profit.
  const atBreakEven = calculateAmazonFBA({ ...input, salePrice: r.breakEvenPrice }, rates.amazon);
  assert.ok(Math.abs(atBreakEven.totals.net) < 0.05,
    `break-even $${r.breakEvenPrice} should net ~0, got ${atBreakEven.totals.net}`);

  // Margin and ROI must be internally consistent.
  near(r.totals.margin, r.totals.net / r.totals.gross, 0.0001);
  near(r.totals.roi, r.totals.net / r.totals.costs, 0.0001);
});

test('amazon: rejects a zero sale price rather than dividing by zero', () => {
  const r = calculateAmazonFBA({ salePrice: 0 }, rates.amazon);
  assert.equal(r.ok, false);
  assert.match(r.error, /sale price/i);
});

/* =============================================================== etsy ==== */

test('etsy: transaction fee applies to shipping charged', () => {
  const withShipping = calculateEtsy(
    { itemPrice: 24, shippingCharged: 8, shippingCost: 8, materialsCost: 0 }, rates.etsy);
  const withoutShipping = calculateEtsy(
    { itemPrice: 24, shippingCharged: 0, shippingCost: 8, materialsCost: 0 }, rates.etsy);

  // Fees are higher when shipping is charged, because 6.5% + 3% land on it too.
  assert.ok(withShipping.totals.fees > withoutShipping.totals.fees);
  // But revenue rises by the full $8, so net is better despite the larger fee.
  assert.ok(withShipping.totals.net > withoutShipping.totals.net);
});

test('etsy: free shipping vs charged shipping nets nearly the same on equal buyer total', () => {
  const base = { shippingCost: 8, materialsCost: 9, quantity: 1 };
  const separate = calculateEtsy({ ...base, itemPrice: 24, shippingCharged: 8 }, rates.etsy);
  const bundled = calculateEtsy({ ...base, itemPrice: 32, shippingCharged: 0 }, rates.etsy);
  // Same $32 to the buyer either way, so the seller keeps the same amount.
  near(separate.totals.net, bundled.totals.net, 0.02);
});

test('etsy: offsite ads is capped per order', () => {
  const r = calculateEtsy(
    { itemPrice: 5000, shippingCost: 0, materialsCost: 0, offsiteAds: true }, rates.etsy);
  const adsLine = r.lines.find((l) => l.id === 'offsite-ads');
  assert.equal(Math.abs(adsLine.amount), rates.etsy.offsiteAds.capPerOrder);
});

test('etsy: high-volume sellers get the lower offsite ads rate', () => {
  const std = calculateEtsy({ itemPrice: 100, offsiteAds: true, highVolumeSeller: false }, rates.etsy);
  const high = calculateEtsy({ itemPrice: 100, offsiteAds: true, highVolumeSeller: true }, rates.etsy);
  assert.ok(high.totals.fees < std.totals.fees, '12% must cost less than 15%');
});

/* =============================================================== ebay ==== */

/** The default category on the schedule a seller with no store is charged from. */
const ebayStandardDefault = () => {
  const schedule = rates.ebay.finalValueFee.schedules.find((s) => s.storeTiers.includes('none'));
  return schedule.categories.find((c) => c.id === 'default');
};

test('ebay: final value fee is charged on shipping and sales tax too', () => {
  const baseRate = ebayStandardDefault().tiers[0].rate;
  const noShip = calculateEbay({ salePrice: 100, shippingCharged: 0 }, rates.ebay);
  const withShip = calculateEbay({ salePrice: 100, shippingCharged: 20 }, rates.ebay);
  const fvfA = Math.abs(noShip.lines.find((l) => l.id === 'fvf').amount);
  const fvfB = Math.abs(withShip.lines.find((l) => l.id === 'fvf').amount);
  near(fvfB - fvfA, 20 * baseRate, 0.02, 'fee should rise by the base rate applied to the shipping');
});

test('ebay: high-value sales use the marginal rate above the first tier boundary', () => {
  const [first, second] = ebayStandardDefault().tiers;
  const sale = 10000;
  const r = calculateEbay({ salePrice: sale }, rates.ebay);
  const fvf = Math.abs(r.lines.find((l) => l.id === 'fvf').amount);
  const expected = first.upTo * first.rate + (sale - first.upTo) * second.rate;
  near(fvf, expected, 0.02);
  // Applying the headline rate flat across the whole sale is the bug this guards against.
  assert.ok(fvf < sale * first.rate);
});

test('ebay: Basic and above are charged from the cheaper store fee table', () => {
  const input = { salePrice: 400, shippingCharged: 0, salesTaxCollected: 0 };
  const noStore = calculateEbay({ ...input, storeTier: 'none' }, rates.ebay);
  const starter = calculateEbay({ ...input, storeTier: 'starter' }, rates.ebay);
  const basic = calculateEbay({ ...input, storeTier: 'basic' }, rates.ebay);
  const fvf = (r) => Math.abs(r.lines.find((l) => l.id === 'fvf').amount);
  // Starter is on the standard table; Basic is not.
  near(fvf(starter), fvf(noStore), 0.001, 'Starter uses the standard fee table');
  assert.ok(fvf(basic) < fvf(noStore), 'Basic must be cheaper than no store on the same sale');
});

test('ebay: cliff categories re-rate the whole sale, not just the excess', () => {
  const jewelry = rates.ebay.finalValueFee.schedules[0].categories.find((c) => c.id === 'jewelry');
  const boundary = jewelry.tiers[0].upTo;
  const under = calculateEbay({ salePrice: boundary - 100, categoryId: 'jewelry' }, rates.ebay);
  const over = calculateEbay({ salePrice: boundary + 100, categoryId: 'jewelry' }, rates.ebay);
  const fvf = (r) => Math.abs(r.lines.find((l) => l.id === 'fvf').amount);
  // A cliff means the bigger sale pays the LOWER rate on everything, so the fee drops.
  assert.ok(fvf(over) < fvf(under), 'crossing a cliff threshold should lower the whole fee');
  near(fvf(over), (boundary + 100) * jewelry.tiers[1].rate, 0.02);
});

test('ebay: athletic shoes lose the per-order fee only above the threshold', () => {
  const cat = rates.ebay.finalValueFee.schedules[0].categories.find((c) => c.id === 'sneakers-over-150');
  const threshold = cat.noPerOrderFeeAbove;
  const below = calculateEbay({ salePrice: threshold - 1, categoryId: 'sneakers-over-150' }, rates.ebay);
  const above = calculateEbay({ salePrice: threshold + 1, categoryId: 'sneakers-over-150' }, rates.ebay);
  const perOrder = (r) => Math.abs(r.lines.find((l) => l.id === 'per-order')?.amount ?? 0);
  assert.ok(perOrder(below) > 0, 'below the threshold the per-order fee still applies');
  assert.equal(perOrder(above), 0, 'at or above the threshold it is waived');
});

test('ebay: per-order fee steps at $10', () => {
  const small = calculateEbay({ salePrice: 8 }, rates.ebay);
  const big = calculateEbay({ salePrice: 50 }, rates.ebay);
  assert.equal(Math.abs(small.lines.find((l) => l.id === 'per-order').amount), 0.3);
  assert.equal(Math.abs(big.lines.find((l) => l.id === 'per-order').amount), 0.4);
});

test('ebay: below-standard rating adds 6 points', () => {
  const ok = calculateEbay({ salePrice: 100 }, rates.ebay);
  const bad = calculateEbay({ salePrice: 100, belowStandard: true }, rates.ebay);
  near(bad.totals.fees - ok.totals.fees, 6.0, 0.02);
});

/* ============================================================ shopify ==== */

test('shopify: third-party gateway adds the plan penalty on top of the gateway rate', () => {
  const own = calculateShopify({ orderValue: 100, plan: 'basic', thirdPartyGateway: false }, rates.shopify);
  const third = calculateShopify(
    { orderValue: 100, plan: 'basic', thirdPartyGateway: true, gatewayRate: 2.9, gatewayFixed: 0.3 },
    rates.shopify);
  // Identical gateway rate, so the whole difference is Shopify's 2% penalty.
  near(third.totals.fees - own.totals.fees, 2.0, 0.02);
});

test('shopify: plan comparison identifies exactly one cheapest option', () => {
  const rows = comparePlans({ orderValue: 60, monthlyOrders: 500 }, rates.shopify);
  assert.equal(rows.filter((r) => r.isCheapest).length, 1);
  const cheapest = rows.find((r) => r.isCheapest);
  assert.ok(rows.every((r) => r.monthlyTotal >= cheapest.monthlyTotal));
});

/* ========================================================== resellers ==== */

test('resellers: poshmark flat fee applies below $15 and 20% at or above', () => {
  const under = compareResellers({ salePrice: 14.99, itemCost: 0 }, rates.resellers);
  const over = compareResellers({ salePrice: 15.0, itemCost: 0 }, rates.resellers);
  const p1 = under.rows.find((r) => r.id === 'poshmark');
  const p2 = over.rows.find((r) => r.id === 'poshmark');
  near(p1.fees.commission, 2.95, 0.01);
  near(p2.fees.commission, 3.0, 0.01);
  // The cliff: one cent more on the price costs five cents more in fees.
  assert.ok(p2.fees.commission > p1.fees.commission);
});

test('resellers: comparison is sorted best-first and every row reconciles', () => {
  const r = compareResellers({ salePrice: 60, shippingCharged: 8, shippingCost: 7, itemCost: 20 }, rates.resellers);
  assert.ok(r.ok);
  for (let i = 1; i < r.rows.length; i += 1) {
    assert.ok(r.rows[i - 1].netProfit >= r.rows[i].netProfit, 'rows must be sorted descending');
  }
  for (const row of r.rows) {
    near(row.payout, row.grossRevenue - row.fees.totalFees, 0.011, `${row.label} payout`);
    near(row.netProfit, row.payout - row.fees.shipping - 20, 0.011, `${row.label} net`);
  }
});

/* ========================================================= processors ==== */

test('processors: forward fee matches the published formula', () => {
  const r = calculateProcessorFee(
    { amount: 100, processorId: 'stripe', productId: 'online-domestic' }, rates.processors);
  near(r.totals.fees, 100 * 0.029 + 0.3, 0.01);
  near(r.totals.net, 100 - (100 * 0.029 + 0.3), 0.01);
});

test('processors: ACH fee respects its $5 cap', () => {
  const r = calculateProcessorFee({ amount: 5000, processorId: 'stripe', productId: 'ach' }, rates.processors);
  assert.equal(r.totals.fees, 5.0, '0.8% of $5,000 is $40, but the cap is $5');
});

test('processors: a qualified "processor:product" id resolves both', () => {
  // One <select> has to carry both values on the charge-to-receive page —
  // readForm() rebuilds the engine input from the DOM and nothing repopulates
  // a dependent select, so two selects could display one processor's schedule
  // while the engine computed another's.
  const qualified = calculateChargeToReceive(
    { targetNet: 500, processorId: 'stripe', productId: 'paypal:micropayments' }, rates.processors);
  const explicit = calculateChargeToReceive(
    { targetNet: 500, processorId: 'paypal', productId: 'micropayments' }, rates.processors);
  assert.equal(qualified.chargeAmount, explicit.chargeAmount,
    'the prefix must win over processorId');
  assert.match(qualified.lines.find((l) => l.id === 'processing').label, /PayPal — Micropayments/);

  // Bare ids must keep working — every other page passes them.
  const bare = calculateChargeToReceive(
    { targetNet: 500, processorId: 'stripe', productId: 'online-domestic' }, rates.processors);
  assert.ok(bare.ok && bare.chargeAmount > 500);

  // An unknown prefix must fall back rather than throw or silently mislabel.
  const bogus = calculateChargeToReceive(
    { targetNet: 500, processorId: 'stripe', productId: 'nosuch:thing' }, rates.processors);
  assert.equal(bogus.chargeAmount, bare.chargeAmount);

  // Branches keyed on the processor must read the RESOLVED one, not the input.
  const hinted = calculateProcessorFee(
    { amount: 10, processorId: 'stripe', productId: 'paypal:checkout' }, rates.processors);
  assert.ok(hinted.notes.some((n) => n.includes('micropayments')),
    'the PayPal micropayments hint must follow the resolved processor');
});

test('processors: the micropayments crossover is derived, not asserted', () => {
  const c = micropaymentsCrossover(rates.processors);
  const p = rates.processors.paypal.products;
  const std = p.find((x) => x.id === 'checkout');
  const micro = p.find((x) => x.id === 'micropayments');

  // Solved from the two rate lines, so it tracks a rate-card change.
  near(c.amount, (std.fixed - micro.fixed) / (micro.rate - std.rate), 1e-9);

  // The tie region the page quotes must bracket the algebraic crossover.
  assert.ok(c.strictBelow < c.amount && c.amount < c.strictAbove,
    `crossover ${c.amount} must sit inside [${c.strictBelow}, ${c.strictAbove}]`);

  const fee = (amount, productId) =>
    calculateProcessorFee({ amount, processorId: 'paypal', productId }, rates.processors).totals.fees;
  assert.ok(fee(c.strictBelow, 'micropayments') < fee(c.strictBelow, 'checkout'));
  assert.ok(fee(c.strictAbove, 'checkout') < fee(c.strictAbove, 'micropayments'));
});

test('processors: the micropayments hint fires across the whole range where it wins', () => {
  // Regression guard. An `amount < 12` gate used to sit in front of this hint,
  // silencing it across $12-$26 where micropayments genuinely saves money —
  // the real crossover is ~$26.67. The hint must follow the arithmetic, not a
  // hardcoded threshold.
  const hinted = (amount, productId) =>
    calculateProcessorFee({ amount, processorId: 'paypal', productId }, rates.processors)
      .notes.some((n) => n.toLowerCase().includes('micropayments'));

  for (const amount of [5, 10, 15, 20, 25]) {
    assert.ok(hinted(amount, 'checkout'),
      `$${amount} is below the crossover — micropayments should have been suggested`);
  }
  for (const amount of [30, 100, 500]) {
    assert.ok(!hinted(amount, 'checkout'),
      `$${amount} is above the crossover — micropayments must not be suggested`);
  }
  // And the reverse: on micropayments pricing, large payments must be flagged.
  assert.ok(hinted(500, 'micropayments'), 'a $500 micropayments charge is overpaying and should say so');
  assert.ok(!hinted(5, 'micropayments'), '$5 is what micropayments is for — no warning');
});

test('charge-to-receive: grossing up actually lands on the target', () => {
  for (const target of [500, 1000, 47.5, 12345.67]) {
    const r = calculateChargeToReceive(
      { targetNet: target, processorId: 'stripe', productId: 'online-domestic' }, rates.processors);
    assert.ok(r.actualNet >= target, `must never come up short: wanted ${target}, got ${r.actualNet}`);
    assert.ok(r.actualNet - target < 0.02, `must not overshoot: wanted ${target}, got ${r.actualNet}`);
  }
});

test('charge-to-receive: the naive "just add the percentage" method comes up short', () => {
  const r = calculateChargeToReceive(
    { targetNet: 500, processorId: 'stripe', productId: 'online-domestic' }, rates.processors);
  assert.ok(r.naive.net < 500, 'the naive method must under-deliver');
  assert.ok(r.naive.shortfall > 0);
  assert.ok(r.chargeAmount > r.naive.charge);
});

/* ================================================================ tax ==== */

test('tax: progressive brackets are marginal, not flat', () => {
  const brackets = rates.federal.brackets.single;
  // First bracket only.
  near(bracketTax(10000, brackets), 1000, 0.01);
  // Straddling two: 10% of 12,400 + 12% of the rest.
  const expected = 12400 * 0.1 + (20000 - 12400) * 0.12;
  near(bracketTax(20000, brackets), expected, 0.02);
  assert.equal(bracketTax(0, brackets), 0);
  assert.equal(bracketTax(-500, brackets), 0);
});

test('tax: SE tax uses the 92.35% base and 15.3% combined rate', () => {
  const se = selfEmploymentTax(100000, 'single', rates.federal);
  near(se.taxableBase, 92350, 0.01);
  near(se.total, 92350 * 0.153, 0.05);
  near(se.deductibleHalf, se.total / 2, 0.05);
});

test('tax: SE tax below the $400 threshold is zero', () => {
  const se = selfEmploymentTax(400, 'single', rates.federal);
  assert.equal(se.total, 0);
  assert.ok(se.belowThreshold);
});

test('tax: social security stops at the wage base, medicare does not', () => {
  const base = rates.federal.fica.socialSecurity.wageBase;
  const under = ficaOnWages(base - 10000, 'single', rates.federal);
  const over = ficaOnWages(base + 50000, 'single', rates.federal);
  near(over.socialSecurity, base * 0.062, 0.05, 'SS capped at the wage base');
  assert.ok(over.medicare > under.medicare, 'Medicare keeps accruing');
  assert.ok(over.hitWageBase);
});

test('tax: additional medicare tax fires above the filing-status threshold', () => {
  const t = rates.federal.fica.medicare.additionalThreshold.single;
  const under = ficaOnWages(t - 1000, 'single', rates.federal);
  const over = ficaOnWages(t + 100000, 'single', rates.federal);
  assert.equal(under.additionalMedicare, 0);
  near(over.additionalMedicare, 100000 * 0.009, 0.05);
});

test('setax: full estimate is internally consistent and produces four dated payments', () => {
  const r = calculateSelfEmploymentTax(
    { grossRevenue: 95000, businessExpenses: 12000, filingStatus: 'single', stateCode: 'TX' },
    rates.federal, rates.states.TX);

  assert.ok(r.ok);
  near(r.netBusinessIncome, 83000, 0.01);
  // incomeTax is post-QBI; federal.tax is the pre-QBI figure.
  near(r.totalTax, r.se.total + r.incomeTax + r.state.total, 0.02);
  assert.ok(r.incomeTax <= r.federal.tax, 'the QBI deduction cannot increase tax owed');
  assert.equal(r.quarterly.payments.length, 4);
  near(r.quarterly.payments.reduce((a, p) => a + p.amount, 0), r.quarterly.remaining, 0.02);
  for (const p of r.quarterly.payments) {
    assert.match(p.due, /^\d{4}-\d{2}-\d{2}$/, 'every payment carries a real ISO date');
  }
});

test('setax: safe harbour uses 110% of prior year above the AGI threshold', () => {
  const r = calculateSelfEmploymentTax(
    { grossRevenue: 300000, filingStatus: 'single', priorYearTax: 40000, priorYearAgi: 200000 },
    rates.federal, null);
  assert.equal(r.quarterly.safeHarborMultiplier, 1.1);
  near(r.quarterly.safeHarborPrior, 44000, 0.01);
});

/* =========================================================== paycheck ==== */

test('paycheck: no-income-tax states show zero state tax but full federal', () => {
  const input = { grossPay: 3000, payFrequency: 'biweekly', filingStatus: 'single' };
  const tx = calculatePaycheck(input, rates.federal, rates.states.TX);
  const ca = calculatePaycheck(input, rates.federal, rates.states.CA);

  assert.equal(tx.annual.state, 0);
  assert.ok(ca.annual.state > 0, 'California must charge income tax');
  assert.ok(tx.totals.net > ca.totals.net, 'Texas take-home must exceed California');
  assert.ok(tx.annual.federal > 0, 'federal tax still applies in Texas');
});

test('paycheck: traditional 401k reduces income tax but not FICA', () => {
  const base = { grossPay: 4000, payFrequency: 'biweekly', filingStatus: 'single', stateCode: 'TX' };
  const no401k = calculatePaycheck(base, rates.federal, rates.states.TX);
  const with401k = calculatePaycheck({ ...base, retirement401kPct: 10 }, rates.federal, rates.states.TX);

  assert.ok(with401k.annual.federal < no401k.annual.federal, '401(k) cuts income tax');
  near(with401k.annual.socialSecurity, no401k.annual.socialSecurity, 0.05,
    '401(k) must NOT reduce Social Security wages');
});

test('paycheck: pre-tax health premiums DO reduce FICA', () => {
  const base = { grossPay: 4000, payFrequency: 'biweekly', filingStatus: 'single', stateCode: 'TX' };
  const none = calculatePaycheck(base, rates.federal, rates.states.TX);
  const withPremium = calculatePaycheck({ ...base, healthPremium: 200 }, rates.federal, rates.states.TX);
  assert.ok(withPremium.annual.socialSecurity < none.annual.socialSecurity,
    'Section 125 premiums reduce FICA wages');
});

test('paycheck: California SDI is charged with no wage cap', () => {
  const low = calculatePaycheck(
    { grossPay: 2000, payFrequency: 'biweekly', filingStatus: 'single' }, rates.federal, rates.states.CA);
  const high = calculatePaycheck(
    { grossPay: 20000, payFrequency: 'biweekly', filingStatus: 'single' }, rates.federal, rates.states.CA);
  assert.ok(high.annual.statePayroll > low.annual.statePayroll * 5,
    'SDI has no ceiling, so it scales with income');
});

test('paycheck: line items sum to the stated net', () => {
  const r = calculatePaycheck(
    { grossPay: 3500, payFrequency: 'biweekly', filingStatus: 'married_joint',
      retirement401kPct: 6, healthPremium: 180, stateCode: 'NY' },
    rates.federal, rates.states.NY);
  const sum = r.lines.filter((l) => l.kind !== 'info').reduce((a, l) => a + l.amount, 0);
  near(sum, r.totals.net, 0.011);
});

/* ========================================================== freelance ==== */

test('freelance: solved rate actually delivers the target take-home', () => {
  const r = calculateHourlyRate(
    { targetIncome: 80000, billableHoursPerWeek: 25, weeksOff: 6,
      businessExpenses: 6000, healthInsurance: 7200, filingStatus: 'single', stateCode: 'TX' },
    rates.federal, rates.states.TX);

  assert.ok(r.ok);
  assert.ok(r.hourlyRate > 0);
  // Billing the solved rate for the solved hours must produce the target.
  // Tolerance scales with hours: the rate is rounded to the cent, and that
  // rounding is multiplied by ~1,150 billable hours.
  near(r.requiredRevenue, r.hourlyRate * r.billableHours, r.billableHours * 0.01);
  // And it must be meaningfully above the naive salary ÷ 2080 figure.
  assert.ok(r.hourlyRate > r.naiveRate * 1.5,
    `honest rate ${r.hourlyRate} should far exceed naive ${r.naiveRate}`);
});

test('freelance: more time off means a higher required rate', () => {
  const base = { targetIncome: 80000, billableHoursPerWeek: 25, filingStatus: 'single' };
  const little = calculateHourlyRate({ ...base, weeksOff: 2 }, rates.federal, null);
  const lots = calculateHourlyRate({ ...base, weeksOff: 12 }, rates.federal, null);
  assert.ok(lots.hourlyRate > little.hourlyRate);
});

/* ============================================================= margin ==== */

test('freelance: the salary equivalent actually delivers the same take-home', () => {
  for (const target of [45000, 85000, 160000]) {
    const opts = { filingStatus: 'single', stateCode: 'CA', healthInsurance: 9000, retirement: 6000 };
    const salary = salaryEquivalent(target, opts, rates.federal, rates.states.CA);
    const check = calculatePaycheck(
      { grossPay: salary, payFrequency: 'annual', filingStatus: 'single', stateCode: 'CA',
        healthPremium: 9000, otherPreTax: 6000 },
      rates.federal, rates.states.CA
    );
    assert.ok(check.totals.net >= target, `must not undershoot: ${check.totals.net} < ${target}`);
    assert.ok(check.totals.net - target < 1, `must not overshoot: ${check.totals.net} vs ${target}`);
  }
});

test('freelance: an employer-paid premium is worth its face value in salary', () => {
  const opts = { filingStatus: 'single', stateCode: 'CA', healthInsurance: 9000, retirement: 6000 };
  const own = salaryEquivalent(85000, opts, rates.federal, rates.states.CA);
  const employer = salaryEquivalent(85000, { ...opts, healthInsurance: 0 }, rates.federal, rates.states.CA);
  // A Section 125 premium is excluded from income tax AND from the FICA base,
  // so it costs exactly its face value in gross salary — no more, no less.
  near(own - employer, 9000, 1);
});

test('freelance: self-employment tax IS charged on health insurance premiums', () => {
  // The self-employed health insurance deduction is an above-the-line income
  // tax deduction only — it does not reduce net earnings from self-employment.
  // An employee's Section 125 premium escapes FICA entirely. This asymmetry is
  // the freelance-hourly-rate page's central claim, so it is pinned here.
  const net = 140000;
  const premium = 9000;
  const full = selfEmploymentTax(net, 'single', rates.federal);
  const lessPremium = selfEmploymentTax(net - premium, 'single', rates.federal);
  const chargedOnPremium = full.total - lessPremium.total;

  assert.ok(chargedOnPremium > 0, 'SE tax must be charged on money spent on premiums');
  const se = rates.federal.selfEmployment;
  const expected = (se.socialSecurityRate + se.medicareRate) * se.netEarningsFactor;
  near(chargedOnPremium / premium, expected, 0.001);
});

test('margin: markup and margin conversions are inverses', () => {
  near(marginFromMarkup(0.5), 1 / 3, 0.0001, 'a 50% markup is a 33.3% margin');
  near(markupFromMargin(1 / 3), 0.5, 0.0001);
  near(markupFromMargin(marginFromMarkup(0.85)), 0.85, 0.0001);
});

test('margin: pricing from a target margin hits that margin', () => {
  const r = calculateMargin({ mode: 'fromMargin', cost: 20, targetMargin: 40 });
  near(r.margin, 0.4, 0.001);
  near(r.price, 20 / 0.6, 0.01);
});

test('margin: a 100% margin is rejected rather than dividing by zero', () => {
  const r = calculateMargin({ mode: 'fromMargin', cost: 20, targetMargin: 100 });
  assert.equal(r.ok, false);
});

/* ====================================================== result contract == */

test('every calculator returns the same result shape', () => {
  const results = [
    calculateAmazonFBA({ salePrice: 30, weightOz: 10, lengthIn: 8, widthIn: 6, heightIn: 2 }, rates.amazon),
    calculateEtsy({ itemPrice: 30 }, rates.etsy),
    calculateEbay({ salePrice: 30 }, rates.ebay),
    calculateShopify({ orderValue: 30 }, rates.shopify),
    compareResellers({ salePrice: 30 }, rates.resellers),
    calculateProcessorFee({ amount: 30, processorId: 'paypal', productId: 'checkout' }, rates.processors),
    calculateChargeToReceive({ targetNet: 30, processorId: 'paypal', productId: 'checkout' }, rates.processors),
    calculateSelfEmploymentTax({ grossRevenue: 60000, filingStatus: 'single' }, rates.federal, null),
    calculatePaycheck({ grossPay: 2000, payFrequency: 'biweekly', filingStatus: 'single' }, rates.federal, rates.states.TX),
    calculateHourlyRate({ targetIncome: 60000, filingStatus: 'single' }, rates.federal, null),
    calculateMargin({ mode: 'fromPrice', cost: 10, price: 25 }),
  ];

  for (const r of results) {
    assert.ok(r.ok, `${r.calculator} should succeed on valid input: ${r.error ?? ''}`);
    assert.ok(Array.isArray(r.lines), `${r.calculator} must return lines[]`);
    assert.ok(Array.isArray(r.warnings), `${r.calculator} must return warnings[]`);
    assert.ok(r.totals && typeof r.totals.net === 'number', `${r.calculator} must return totals.net`);
    for (const key of ['gross', 'fees', 'costs', 'net', 'payout']) {
      assert.equal(typeof r.totals[key], 'number', `${r.calculator}.totals.${key} must be a number`);
      assert.ok(Number.isFinite(r.totals[key]), `${r.calculator}.totals.${key} must be finite`);
    }
    for (const line of r.lines) {
      assert.ok(line.id && line.label, `${r.calculator} line missing id or label`);
      if (line.kind !== 'info') {
        assert.ok(Number.isFinite(line.amount), `${r.calculator} line "${line.id}" has a non-finite amount`);
      }
    }
  }
});

test('every calculator rejects garbage input without throwing', () => {
  const junk = [
    () => calculateAmazonFBA({ salePrice: 'abc', weightOz: -5 }, rates.amazon),
    () => calculateEtsy({ itemPrice: null }, rates.etsy),
    () => calculateEbay({ salePrice: NaN }, rates.ebay),
    () => calculateShopify({ orderValue: undefined }, rates.shopify),
    () => compareResellers({ salePrice: -10 }, rates.resellers),
    () => calculateProcessorFee({ amount: Infinity, processorId: 'nope' }, rates.processors),
    () => calculateSelfEmploymentTax({ grossRevenue: '' }, rates.federal, null),
    () => calculatePaycheck({ grossPay: 'x', payFrequency: 'nonsense' }, rates.federal, null),
    () => calculateMargin({ mode: 'fromPrice', cost: 'x', price: 'y' }),
  ];
  for (const fn of junk) {
    const r = fn();
    assert.equal(typeof r.ok, 'boolean');
    if (!r.ok) assert.ok(typeof r.error === 'string' && r.error.length > 0);
  }
});

/* ============================================================ rate data == */

test('rate data: every file carries version, effective date, and sources', () => {
  const files = [
    ['amazon', rates.amazon], ['etsy', rates.etsy], ['ebay', rates.ebay],
    ['shopify', rates.shopify], ['processors', rates.processors],
    ['resellers', rates.resellers], ['federal', rates.federal],
    ...Object.entries(rates.states),
  ];
  for (const [name, data] of files) {
    assert.ok(data.version, `${name} missing version`);
    assert.ok(data.effective, `${name} missing effective date`);
    assert.ok(Array.isArray(data.sources) && data.sources.length > 0, `${name} missing sources`);
    for (const s of data.sources) {
      assert.ok(s.url?.startsWith('http'), `${name} source "${s.label}" has no usable URL`);
    }
  }
});

test('rate data: tax brackets are ascending and terminate with an open band', () => {
  const all = [
    ...Object.entries(rates.federal.brackets),
    ...Object.values(rates.states).flatMap((s) => Object.entries(s.brackets ?? {})),
  ];
  for (const [status, brackets] of all) {
    assert.equal(brackets.at(-1).upTo, null, `${status} must end with an open-ended bracket`);
    for (let i = 1; i < brackets.length; i += 1) {
      if (brackets[i].upTo === null) continue;
      assert.ok(brackets[i].upTo > brackets[i - 1].upTo, `${status} brackets must ascend`);
      assert.ok(brackets[i].rate >= brackets[i - 1].rate, `${status} rates must not decrease`);
    }
  }
});
