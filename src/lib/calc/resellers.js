/**
 * resellers.js — side-by-side net payout across resale marketplaces.
 *
 * The reason a comparison is worth building rather than eight separate
 * calculators: the platforms do not just differ on rate, they differ on
 * STRUCTURE, and the structure decides which platform wins at which price.
 *
 *   - Poshmark charges a flat $2.95 below $15 and 20% at or above it. That
 *     cliff means a $14.99 item nets more than a $15.49 item, in absolute
 *     dollars. Nothing else in resale behaves that way.
 *   - Vinted takes nothing from sellers; buyers pay the protection fee.
 *   - eBay's fee lands on the shipping you collect, so a "free shipping"
 *     listing is charged differently from the same item with postage split out.
 *   - StockX takes a commission that falls with seller level, plus 3%
 *     processing, and the seller pays to ship for authentication.
 *
 * A single rate comparison table cannot express that. A calculator can.
 */

import { nonNeg, num, round2, tieredCents, toCents, toDollars, pctOfCents, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'reseller-comparison';

/** Fees charged by one platform on one sale. Returns dollars. */
function platformFees(platform, { salePrice, shippingCharged, sellerPaysShipping, shippingCost, stockxLevel }) {
  const priceCents = toCents(salePrice);
  // Whether the platform's cut is charged on the postage the buyer paid is a
  // property of the platform, not of its name — eBay, Etsy and Mercari all do it.
  const base = platform.commissionIncludesShipping
    ? toCents(salePrice + shippingCharged)
    : priceCents;

  let commissionCents = 0;
  const c = platform.commission;

  switch (c.mode) {
    case 'hybrid-flat-under-threshold':
      commissionCents = salePrice < c.threshold
        ? toCents(c.flatUnderThreshold)
        : pctOfCents(base, c.rateAtOrAbove);
      break;
    case 'tiered':
      commissionCents = tieredCents(base, c.tiers, 'marginal');
      break;
    case 'level-based': {
      const level = c.levels.find((l) => l.id === (stockxLevel ?? 'level-1')) ?? c.levels[0];
      commissionCents = pctOfCents(base, level.rate);
      break;
    }
    case 'flat-rate':
    default:
      commissionCents = pctOfCents(base, c.rate ?? 0);
      if (c.minimumFee) commissionCents = Math.max(commissionCents, toCents(c.minimumFee));
      break;
  }

  const processingCents = pctOfCents(base, platform.processingRate ?? 0)
    + toCents(platform.processingFixed ?? 0);

  let perOrderCents = 0;
  if (platform.perOrderFee) {
    const orderTotal = salePrice + shippingCharged;
    perOrderCents = toCents(orderTotal <= 10 ? platform.perOrderFee.underOrEqual10 : platform.perOrderFee.over10);
  }

  const listingCents = toCents(platform.listingFee ?? 0);

  // Poshmark and Vinted supply the buyer-paid label, so seller shipping is 0
  // unless the seller opted to discount it. StockX always costs the seller.
  let sellerShipping = 0;
  if (platform.shippingModel === 'seller-pays') sellerShipping = shippingCost;
  else if (platform.shippingModel === 'seller-choice' && sellerPaysShipping) sellerShipping = shippingCost;

  return {
    commission: toDollars(commissionCents),
    processing: toDollars(processingCents),
    perOrder: toDollars(perOrderCents),
    listing: toDollars(listingCents),
    shipping: round2(sellerShipping),
    totalFees: toDollars(commissionCents + processingCents + perOrderCents + listingCents),
  };
}

/**
 * @param {object} input
 * @param {number} input.salePrice          Item price on every platform.
 * @param {number} input.shippingCharged    Postage collected from the buyer.
 * @param {number} input.shippingCost       Postage the seller pays.
 * @param {boolean} input.sellerPaysShipping  Seller absorbs postage where optional.
 * @param {number} input.itemCost           What the item cost the seller.
 * @param {string} input.stockxLevel        StockX seller level.
 * @param {string[]} input.platforms        Optional subset of platform ids.
 */
export function compareResellers(input, rates, { formatMoney = usd } = {}) {
  const salePrice = nonNeg(input.salePrice);
  if (salePrice <= 0) return invalid(CALC, 'Enter a sale price above $0 to compare platforms.');

  const shippingCharged = nonNeg(input.shippingCharged);
  const shippingCost = nonNeg(input.shippingCost);
  const itemCost = nonNeg(input.itemCost);
  const wanted = Array.isArray(input.platforms) && input.platforms.length
    ? new Set(input.platforms)
    : null;

  const rows = rates.platforms
    .filter((p) => !wanted || wanted.has(p.id))
    .map((platform) => {
      const fees = platformFees(platform, {
        salePrice,
        shippingCharged,
        shippingCost,
        sellerPaysShipping: Boolean(input.sellerPaysShipping),
        stockxLevel: input.stockxLevel,
      });

      // Revenue the seller sees. Platforms with buyer-paid labels don't pass
      // the shipping through the seller's ledger at all.
      const collectsShipping = platform.shippingModel === 'seller-choice';
      const grossRevenue = round2(salePrice + (collectsShipping ? shippingCharged : 0));

      const payout = round2(grossRevenue - fees.totalFees);
      const netProfit = round2(payout - fees.shipping - itemCost);

      return {
        id: platform.id,
        label: platform.label,
        grossRevenue,
        fees,
        payout,
        netProfit,
        effectiveFeeRate: grossRevenue > 0 ? fees.totalFees / grossRevenue : 0,
        margin: grossRevenue > 0 ? netProfit / grossRevenue : null,
        shippingModel: platform.shippingModel,
        note: platform.note,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);

  const best = rows[0];
  const worst = rows.at(-1);

  const r = result({ calculator: CALC, rates })
    .inputs(input)
    .revenue('sale', 'Sale price', salePrice)
    .revenue('shipping-charged', 'Shipping charged to buyer', shippingCharged)
    .cost('item-cost', 'Cost of item', itemCost)
    .info('best', 'Best payout', `${best.label} — ${formatMoney(best.netProfit)}`)
    .info('spread', 'Spread across platforms', formatMoney(round2(best.netProfit - worst.netProfit)),
      `Selling the same item on ${best.label} rather than ${worst.label} is worth ${formatMoney(round2(best.netProfit - worst.netProfit))} on this sale.`)
    .extra({ rows, best, worst });

  // Poshmark's threshold cliff is the single most actionable insight here.
  const posh = rates.platforms.find((p) => p.id === 'poshmark');
  if (posh && salePrice >= posh.commission.threshold && salePrice < posh.commission.threshold + 4) {
    const belowNet = round2(posh.commission.threshold - 0.01 - posh.commission.flatUnderThreshold - itemCost);
    const atNet = rows.find((x) => x.id === 'poshmark')?.netProfit ?? 0;
    if (belowNet > atNet) {
      r.warn(`Poshmark switches from a flat ${formatMoney(posh.commission.flatUnderThreshold)} fee to ${(posh.commission.rateAtOrAbove * 100).toFixed(0)}% at ${formatMoney(posh.commission.threshold)}. Listing at ${formatMoney(posh.commission.threshold - 0.01)} would net you ${formatMoney(round2(belowNet - atNet))} more than listing at ${formatMoney(salePrice)}.`);
    }
  }

  if (shippingCost > 0 && !input.sellerPaysShipping) {
    r.note('This comparison assumes the buyer pays postage wherever the platform lets you choose. Tick "I cover shipping" to see how absorbing it changes the ranking.');
  }

  return r.build();
}

/** Break-even sale price on each platform, given the item cost. */
export function breakEvenByPlatform(input, rates) {
  const itemCost = nonNeg(input.itemCost);
  if (itemCost <= 0) return [];

  return rates.platforms.map((platform) => {
    let lo = 0.01;
    let hi = 100000;
    for (let i = 0; i < 50; i += 1) {
      const mid = (lo + hi) / 2;
      const cmp = compareResellers({ ...input, salePrice: mid, platforms: [platform.id] }, rates);
      const net = cmp.ok ? cmp.rows[0].netProfit : NaN;
      if (!Number.isFinite(net)) break;
      if (net < 0) lo = mid;
      else hi = mid;
    }
    return { id: platform.id, label: platform.label, breakEven: round2(Math.ceil(hi * 100) / 100) };
  }).sort((a, b) => a.breakEven - b.breakEven);
}
