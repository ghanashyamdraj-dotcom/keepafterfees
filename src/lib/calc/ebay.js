/**
 * ebay.js — eBay final value fee and payout calculation.
 *
 * Two things separate this from a naive percentage calculation:
 *
 *   1. eBay charges the final value fee on the TOTAL amount of the sale —
 *      item price, the shipping you collect, and the sales tax eBay collects
 *      on your behalf. Sellers routinely forget the shipping component and
 *      under-estimate the fee by 13% of their postage.
 *
 *   2. The rate is genuinely marginal above $7,500 in most categories: 13.25%
 *      on the portion up to $7,500 and 2.35% on everything above it. Applying
 *      one blended rate to the whole amount is wrong on high-value items.
 */

import { nonNeg, num, pctOfCents, round2, tieredCents, toCents, toDollars, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'ebay-fees';

/**
 * @param {object} input
 * @param {number} input.salePrice        Item price.
 * @param {number} input.shippingCharged  Postage you collect from the buyer.
 * @param {number} input.shippingCost     Postage you actually pay.
 * @param {number} input.itemCost         What the item cost you.
 * @param {string} input.categoryId       Final value fee category.
 * @param {string} input.storeTier        none | starter | basic | premium | anchor | enterprise
 * @param {number} input.promotedRate     Promoted Listings ad rate, whole percent.
 * @param {boolean} input.international   Buyer registered outside the US.
 * @param {boolean} input.belowStandard   Seller rated Below Standard.
 * @param {number} input.salesTaxCollected
 * @param {boolean} input.amortiseStore   Spread the store subscription per sale.
 * @param {number} input.monthlySales     Sales per month, for amortising.
 * @param {boolean} input.annualStore     Store billed annually (cheaper).
 * @param {number} input.insertionFees    Insertion fees attributable to this sale.
 */
export function calculateEbay(input, rates, { formatMoney = usd } = {}) {
  const salePrice = nonNeg(input.salePrice);
  if (salePrice <= 0) return invalid(CALC, 'Enter a sale price above $0 to see your eBay payout.');

  const shippingCharged = nonNeg(input.shippingCharged);
  const shippingCost = nonNeg(input.shippingCost);
  const itemCost = nonNeg(input.itemCost);
  const salesTax = nonNeg(input.salesTaxCollected);

  // The fee base. Note sales tax is included — eBay charges FVF on it.
  const feeBase = round2(salePrice + shippingCharged + salesTax);
  const feeBaseCents = toCents(feeBase);

  // eBay publishes two different fee tables. Basic and above are charged from a
  // cheaper one that also drops the first tier boundary from $7,500 to $2,500, so
  // the schedule has to be picked before the category is.
  const storeTier = input.storeTier ?? 'none';
  const schedule = rates.finalValueFee.schedules.find((s) => s.storeTiers.includes(storeTier))
    ?? rates.finalValueFee.schedules[0];

  const category = schedule.categories.find((c) => c.id === input.categoryId)
    ?? schedule.categories.find((c) => c.id === 'default');

  // Not every category is marginal. Several are cliffs — "9% if the sale is over
  // $5,000" charges 9% on the whole amount, not just the portion above.
  let fvfCents = tieredCents(feeBaseCents, category.tiers, category.mode ?? 'marginal');

  if (input.belowStandard) {
    fvfCents += pctOfCents(feeBaseCents, rates.belowStandardSurcharge.rate);
  }

  // Athletic shoes lose the per-order fee, but only once the sale clears $150.
  const perOrderWaived = category.noPerOrderFee
    || (category.noPerOrderFeeAbove != null && feeBase >= category.noPerOrderFeeAbove);
  const perOrderFee = perOrderWaived
    ? 0
    : feeBase <= 10
      ? rates.perOrderFee.underOrEqual10
      : rates.perOrderFee.over10;

  const internationalFee = input.international
    ? toDollars(pctOfCents(feeBaseCents, rates.internationalFee.rate))
    : 0;

  const promotedRate = Math.max(0, num(input.promotedRate, 0)) / 100;
  const promotedFee = promotedRate > 0 ? toDollars(pctOfCents(feeBaseCents, promotedRate)) : 0;

  const store = rates.storeSubscriptions.find((s) => s.id === storeTier)
    ?? rates.storeSubscriptions[0];
  const storeMonthly = input.annualStore === false
    ? (store.monthlyMonthly ?? store.monthlyAnnual)
    : store.monthlyAnnual;
  const storeFee = input.amortiseStore && storeMonthly > 0
    ? round2(storeMonthly / Math.max(1, num(input.monthlySales, 50)))
    : 0;

  const effectiveFvfRate = feeBase > 0 ? toDollars(fvfCents) / feeBase : 0;

  const r = result({ calculator: CALC, rates })
    .inputs(input)
    .revenue('sale', 'Item price', salePrice)
    .revenue('shipping-charged', 'Shipping charged to buyer', shippingCharged)
    .revenue('sales-tax', 'Sales tax collected', salesTax, 'eBay collects and remits this, but still charges the final value fee on it.')
    .fee('fvf', `Final value fee (${(effectiveFvfRate * 100).toFixed(2)}%)`, toDollars(fvfCents),
      `${category.label}. Charged on the item price, shipping, and sales tax combined.`)
    .fee('per-order', 'Per-order fee', perOrderFee)
    .fee('international', `International fee (${(rates.internationalFee.rate * 100).toFixed(2)}%)`, internationalFee)
    .fee('promoted', `Promoted Listings (${(promotedRate * 100).toFixed(1)}%)`, promotedFee)
    .fee('insertion', 'Insertion fees', nonNeg(input.insertionFees))
    .fee('store', 'Store subscription, amortised', storeFee)
    .cost('item-cost', 'Cost of item', itemCost)
    .cost('shipping-cost', 'Actual postage cost', shippingCost)
    .cost('sales-tax-remit', 'Sales tax remitted', salesTax, 'Passed through to the tax authority — never yours to keep.')
    .info('fee-base', 'Fee is charged on', formatMoney(feeBase), 'Item price + shipping collected + sales tax.');

  if (salesTax > 0) {
    r.note(`eBay charged you ${formatMoney(toDollars(pctOfCents(toCents(salesTax), effectiveFvfRate)))} in final value fees on sales tax you never got to keep.`);
  }
  if (shippingCharged > shippingCost && shippingCost > 0) {
    r.note(`You collected ${formatMoney(shippingCharged - shippingCost)} more in shipping than it cost you, but eBay took a fee on the whole amount.`);
  }
  if (input.belowStandard) {
    r.warn(`Below Standard seller rating adds ${(rates.belowStandardSurcharge.rate * 100).toFixed(0)} percentage points to the final value fee, rising to ${(rates.belowStandardSurcharge.escalatedRate * 100).toFixed(0)} after ${rates.belowStandardSurcharge.escalatesAfterMonths} consecutive months. Resolving the underlying defects is the single highest-value action available to you.`);
  }
  // Only meaningful on marginal categories — on a cliff category the whole amount
  // moves to the lower rate, which is a different sentence entirely.
  if ((category.mode ?? 'marginal') === 'marginal'
    && feeBase > (category.tiers[0]?.upTo ?? Infinity) && category.tiers.length > 1) {
    r.note(`The portion of this sale above ${formatMoney(category.tiers[0].upTo)} is charged at the lower ${(category.tiers.at(-1).rate * 100).toFixed(2)}% rate.`);
  }
  if ((category.mode ?? 'marginal') === 'flat' && category.tiers.length > 1) {
    r.note(`This category is charged as a cliff, not a marginal rate: crossing a threshold moves the whole sale to the new rate, not just the portion above it.`);
  }
  if (schedule.id !== 'standard') {
    r.note(`${schedule.label} sellers are charged from eBay's lower fee table, which also drops the first tier boundary to ${formatMoney(category.tiers[0]?.upTo ?? 0)}.`);
  }

  const built = r.build();
  built.effectiveFvfRate = effectiveFvfRate;
  built.feeBase = feeBase;
  built.category = category.label;
  return built;
}

/** Compare payout across every store tier at a given monthly sales volume. */
export function compareStoreTiers(input, rates) {
  const monthlySales = Math.max(1, num(input.monthlySales, 50));
  return rates.storeSubscriptions.map((store) => {
    const r = calculateEbay({ ...input, storeTier: store.id, amortiseStore: true, monthlySales }, rates);
    return {
      id: store.id,
      label: store.label,
      monthlyCost: store.monthlyAnnual,
      freeListings: store.freeListings,
      netPerSale: r.ok ? r.totals.net : null,
      netPerMonth: r.ok ? round2(r.totals.net * monthlySales) : null,
    };
  });
}
