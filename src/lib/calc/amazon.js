/**
 * amazon.js — Amazon FBA profit calculation.
 *
 * Models the four charges that actually decide whether an FBA product makes
 * money: the referral fee, the fulfillment fee, monthly storage, and your own
 * landed cost. Most third-party FBA calculators get two things wrong, and both
 * are handled explicitly here:
 *
 *   1. Size tier is decided by BILLABLE weight, not the number on the scale.
 *      Above the smallest tier, Amazon bills the greater of unit weight and
 *      dimensional weight (L x W x H / a per-marketplace divisor), then adds
 *      packaging weight. A light, bulky item is billed as if it were heavy.
 *      Every threshold, and even whether dimensional weight applies at all,
 *      lives in `rates.sizeTierRules.tiers` — Amazon UK's rate card (verified
 *      2 August 2026) has TWELVE tiers where the US has seven, several with
 *      their own separate dimensional-weight cap on top of the physical
 *      dimension cap, and envelopes billed on actual weight only regardless
 *      of shape. None of that is a unit conversion of the US numbers; it is
 *      a genuinely different tier structure, so the numbers AND the shape of
 *      the tier list are both data. The one thing resolveSizeTier assumes is
 *      that tiers are ordered smallest-to-largest and the first one an item
 *      fits is the one that applies — true of every Amazon marketplace's
 *      documented rate card so far.
 *
 *   2. Referral fee tiers come in two flavours. Clothing charges one rate on
 *      the whole price depending on which band the price falls in ("flat").
 *      Jewelry charges 20% on the first $250 and 5% on the rest ("marginal").
 *      Applying the wrong one is off by tens of dollars on a $400 item.
 */

import {
  bracket, nonNeg, num, pctOfCents, round2, tieredCents, toCents, toDollars, usd,
} from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'amazon-fba';

/**
 * Decide the FBA size tier from dimensions and weight.
 *
 * `rates.sizeTierRules.tiers` is an ORDERED array, smallest first; the first
 * tier an item fits is the one that applies. Each entry may specify:
 *   maxDimensions   [l, m, s] in descending order, null = no cap on that axis
 *   maxWeight       actual (not billable) weight ceiling, null = no cap
 *   maxDimensionalWeight   an independent cap some marketplaces apply on TOP
 *                   of the physical size cap (Amazon UK's parcel tiers do
 *                   this; the US does not) — an item can fit the physical
 *                   envelope and still miss the tier on dimensional weight
 *                   alone. Omit/null to skip this check.
 *   maxGirthPlusLength   optional, as used by the US large-bulky tier.
 *   usesDimensionalWeight   whether BILLING uses max(actual, dimensional) or
 *                   actual weight only. Envelopes and special-oversize items
 *                   are billed on actual weight regardless of shape.
 *   packagingWeight, reason, id
 * The last entry should have every cap set to null so it always matches —
 * that is what makes it the true catch-all, not a special case in code.
 *
 * Field names on the input (lengthIn/widthIn/heightIn/weightOz) and the
 * returned tier (billableWeightOz/dimensionalWeightOz/cubicFeet) are legacy
 * from the US-only version of this function. They hold whatever unit
 * `rates.units` declares — inches/ounces/cubic-feet for en-US, centimetres/
 * grams/cubic-metres for en-GB — not literally inches and ounces. Renaming
 * them would ripple into every page's form fields and shared-link query
 * params for no functional gain, so the names stay; only the values move.
 *
 * Returns { id, label, billableWeightOz, dimensionalWeightOz, reason }.
 */
export function resolveSizeTier({ lengthIn, widthIn, heightIn, weightOz }, rates) {
  const rules = rates.sizeTierRules;
  const dims = [nonNeg(lengthIn), nonNeg(widthIn), nonNeg(heightIn)].sort((a, b) => b - a);
  const [longest, median, shortest] = dims;
  const unitWeight = nonNeg(weightOz);
  const cubic = longest * median * shortest;

  // Dimensional weight: volume / divisor gives one unit (lb for US, kg for
  // UK), then the multiplier converts that into the engine's internal weight
  // unit (oz for US, g for UK) — two separate per-marketplace constants
  // because the "native" divisor output unit and the billing unit differ.
  const dimWeight = cubic > 0
    ? (cubic / rules.dimensionalWeightDivisor) * rules.dimensionalWeightUnitMultiplier
    : 0;
  const girth = 2 * (median + shortest);

  const fitsWithin = (max) => !max || (
    (max[0] == null || longest <= max[0])
    && (max[1] == null || median <= max[1])
    && (max[2] == null || shortest <= max[2])
  );

  const match = rules.tiers.find((t) =>
    fitsWithin(t.maxDimensions)
    && (t.maxWeight == null || unitWeight <= t.maxWeight)
    && (t.maxDimensionalWeight == null || dimWeight <= t.maxDimensionalWeight)
    && (t.maxGirthPlusLength == null || girth + longest <= t.maxGirthPlusLength)
  ) ?? rules.tiers.at(-1);

  const billable = match.usesDimensionalWeight
    ? Math.max(unitWeight, dimWeight) + (match.packagingWeight ?? 0)
    : unitWeight + (match.packagingWeight ?? 0);

  const tier = rates.sizeTiers.find((t) => t.id === match.id);
  return {
    id: match.id,
    label: tier ? tier.label : match.id,
    billableWeightOz: Math.round(billable * 100) / 100,
    unitWeightOz: unitWeight,
    dimensionalWeightOz: Math.round(dimWeight * 100) / 100,
    dimensionalApplied: match.usesDimensionalWeight && dimWeight > unitWeight,
    cubicFeet: cubic > 0 ? Math.round((cubic / rules.volumeDivisor) * 10000) / 10000 : 0,
    reason: match.reason,
  };
}

/** Fulfillment fee in dollars for a resolved tier and billable weight. */
export function fulfillmentFee(tierId, billableWeightOz, rates, { isApparel = false, isDangerousGoods = false } = {}) {
  const table = rates.fulfillment.tiers[tierId];
  if (!table) return 0;

  let feeCents;
  const hit = bracket(billableWeightOz, table.brackets);
  const maxBracket = table.brackets.at(-1);

  if (hit && (maxBracket.upTo === null || billableWeightOz <= maxBracket.upTo)) {
    feeCents = toCents(hit.value);
  } else if (table.overage) {
    const { baseOz, baseFee, perStepFee, stepOz } = table.overage;
    const over = Math.max(0, billableWeightOz - baseOz);
    const steps = Math.ceil(over / stepOz);
    feeCents = toCents(baseFee) + steps * toCents(perStepFee);
  } else {
    feeCents = toCents(maxBracket.value);
  }

  if (isApparel) feeCents += toCents(rates.fulfillment.apparelSurcharge);
  if (isDangerousGoods) feeCents += toCents(rates.fulfillment.dangerousGoodsSurcharge);

  return toDollars(feeCents);
}

/** Referral fee in dollars for a category and sale price. */
export function referralFee(categoryId, salePrice, rates) {
  const category = rates.referral.categories.find((c) => c.id === categoryId)
    ?? rates.referral.categories.find((c) => c.id === 'default');

  const priceCents = toCents(salePrice);
  const feeCents = tieredCents(priceCents, category.tiers, category.mode ?? 'flat');
  const minCents = toCents(rates.referral.minimumFee);

  return {
    amount: toDollars(Math.max(feeCents, priceCents > 0 ? minCents : 0)),
    closingFee: category.closingFee ?? 0,
    category,
    hitMinimum: feeCents < minCents && priceCents > 0,
    effectiveRate: priceCents > 0 ? Math.max(feeCents, minCents) / priceCents : 0,
  };
}

/** Monthly storage cost in dollars for one unit. */
export function storageCost(cubicFeet, tierId, rates, { months = 1, quarter = 'janSep' } = {}) {
  const isOversize = !tierId.startsWith('small-') && !tierId.startsWith('large-standard');
  const table = isOversize ? rates.storage.oversize : rates.storage.standard;
  const rate = table[quarter] ?? table.janSep;
  return round2(cubicFeet * rate * months);
}

/**
 * Full FBA profit calculation.
 *
 * @param {object} input
 * @param {number} input.salePrice       What the buyer pays for the item.
 * @param {number} input.productCost     Your unit cost from the supplier.
 * @param {number} input.shipToAmazon    Inbound shipping cost per unit.
 * @param {string} input.categoryId      Referral fee category id.
 * @param {number} input.lengthIn/widthIn/heightIn/weightOz  Packed dimensions.
 * @param {number} input.storageMonths   Average months held in an FBA warehouse.
 * @param {string} input.storageQuarter  'janSep' or 'octDec'.
 * @param {boolean} input.isApparel      Apparel surcharge applies.
 * @param {boolean} input.isDangerousGoods
 * @param {boolean} input.professionalPlan  Amortise the $39.99/mo plan fee.
 * @param {number} input.monthlyUnits    Units sold per month, for amortising.
 * @param {number} input.otherCosts      Prep, labels, inserts, anything else.
 * @param {number} input.units           Number of units to model (default 1).
 */
export function calculateAmazonFBA(input, rates, { solveBreakEvenPrice = true, formatMoney = usd } = {}) {
  const salePrice = nonNeg(input.salePrice);
  if (salePrice <= 0) return invalid(CALC, 'Enter a sale price above $0 to see your FBA profit.');

  const units = Math.max(1, Math.floor(num(input.units, 1)));
  const productCost = nonNeg(input.productCost);
  const shipToAmazon = nonNeg(input.shipToAmazon);
  const otherCosts = nonNeg(input.otherCosts);
  const storageMonths = Math.max(0, num(input.storageMonths, 1));

  const tier = resolveSizeTier(input, rates);
  const referral = referralFee(input.categoryId ?? 'default', salePrice, rates);
  const fulfillment = fulfillmentFee(tier.id, tier.billableWeightOz, rates, {
    isApparel: Boolean(input.isApparel),
    isDangerousGoods: Boolean(input.isDangerousGoods),
  });
  const storage = storageCost(tier.cubicFeet, tier.id, rates, {
    months: storageMonths,
    quarter: input.storageQuarter ?? 'janSep',
  });

  const monthlyUnits = Math.max(1, num(input.monthlyUnits, 100));
  const planFeePerUnit = input.professionalPlan
    ? round2(rates.accountFees.professionalMonthly / monthlyUnits)
    : 0;

  const r = result({ calculator: CALC, rates })
    .inputs({ ...input, units, resolvedTier: tier.id })
    .revenue('sale', `Sale price${units > 1 ? ` x ${units}` : ''}`, salePrice * units)
    .fee('referral', `Referral fee (${(referral.effectiveRate * 100).toFixed(1)}%)`, referral.amount * units)
    .fee('closing', 'Media closing fee', referral.closingFee * units)
    .fee('fulfillment', `FBA fulfillment fee — ${tier.label}`, fulfillment * units)
    .fee('storage', `Storage (${storageMonths} mo)`, storage * units)
    .fee('plan', 'Professional plan, amortised', planFeePerUnit * units)
    .cost('product', 'Product cost', productCost * units)
    .cost('inbound', 'Ship to Amazon', shipToAmazon * units)
    .cost('other', 'Prep, labels & other costs', otherCosts * units)
    .info('tier', 'Size tier', tier.label, tier.reason)
    .info('billable-weight', 'Billable weight', `${tier.billableWeightOz.toFixed(2)} oz`,
      tier.dimensionalApplied
        ? `Dimensional weight (${tier.dimensionalWeightOz.toFixed(2)} oz) exceeded the actual weight, so Amazon bills the larger figure.`
        : 'Actual unit weight plus packaging.')
    .extra({ tier, referral: { ...referral, category: referral.category.label } });

  if (tier.dimensionalApplied) {
    r.warn('Dimensional weight is driving your fulfillment fee. Shrinking the package is worth more than shaving grams off the product.');
  }
  if (referral.hitMinimum) {
    r.warn(`The ${formatMoney(rates.referral.minimumFee)} minimum referral fee applies — it is higher than the percentage would have been at this price.`);
  }
  if (storageMonths > 6) {
    r.warn('Above 181 days in a fulfilment centre Amazon adds an aged-inventory surcharge, which this estimate does not include.');
  }

  const built = r.build();

  // Break-even sale price: the price at which net profit is exactly zero.
  // Skipped in the recursive probe calls, which is what makes the solve
  // terminate rather than recursing forever.
  built.breakEvenPrice = solveBreakEvenPrice ? solveBreakEven(input, rates) : null;
  built.netPerUnit = round2(built.totals.net / units);
  built.perUnit = {
    referral: referral.amount,
    fulfillment,
    storage,
    totalFees: round2(referral.amount + referral.closingFee + fulfillment + storage + planFeePerUnit),
    totalCosts: round2(productCost + shipToAmazon + otherCosts),
  };

  return built;
}

/** Lowest sale price at which this product does not lose money. */
function solveBreakEven(input, rates) {
  let lo = 0.01;
  let hi = 10000;
  const netAt = (price) => {
    const r = calculateAmazonFBA({ ...input, salePrice: price, units: 1 }, rates, { solveBreakEvenPrice: false });
    return r.ok ? r.totals.net : NaN;
  };
  if (netAt(hi) < 0) return null;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (netAt(mid) < 0) lo = mid;
    else hi = mid;
  }
  return round2(Math.ceil(hi * 100) / 100);
}

/** Category options for the UI dropdown, alphabetised with Default first. */
export function categoryOptions(rates) {
  const [def, ...rest] = [
    rates.referral.categories.find((c) => c.id === 'default'),
    ...rates.referral.categories.filter((c) => c.id !== 'default'),
  ];
  return [def, ...rest.sort((a, b) => a.label.localeCompare(b.label))]
    .map((c) => ({ value: c.id, label: c.label }));
}
