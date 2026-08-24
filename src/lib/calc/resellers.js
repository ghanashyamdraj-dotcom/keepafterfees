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
const CALC_SINGLE = 'reseller-single';

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
    // `tierMode` because these are not all the same shape. eBay's tiers are
    // marginal — only the portion above the boundary re-rates. Grailed's are a
    // cliff: a $130 sale is charged 9% on the whole amount, not 6% on the
    // first $120. Defaulting to marginal keeps eBay unchanged.
    case 'tiered':
      commissionCents = tieredCents(base, c.tiers, c.tierMode ?? 'marginal');
      break;
    case 'level-based': {
      const level = c.levels.find((l) => l.id === (stockxLevel ?? 'level-1')) ?? c.levels[0];
      commissionCents = pctOfCents(base, level.rate);
      break;
    }
    case 'flat-rate':
    default:
      commissionCents = pctOfCents(base, c.rate ?? 0);
      break;
  }

  // A floor under the commission, applied whatever shape produced it. Hoisted
  // out of the switch because it is not a property of one fee shape — Facebook
  // puts a minimum under a flat rate, StockX under a level-based one, and
  // Grailed under a tier. It is what makes a cheap item disproportionately
  // expensive to sell, so it has to survive every branch above.
  if (c.minimumFee) commissionCents = Math.max(commissionCents, toCents(c.minimumFee));

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
/**
 * One platform, in full, as a proper receipt.
 *
 * compareResellers() answers "where should I list this?" and puts the fee
 * detail inside `rows[]`, which is the right shape for a ranked table and the
 * wrong shape for a page about a single platform: its `lines[]` carry the sale
 * and the seller's costs but no fee lines at all, so a breakdown rendered from
 * it would show a payout with nothing visibly taken out of it.
 *
 * This runs the same platformFees() and returns each charge as its own line,
 * which is what the per-platform pages need and what the CSV export, the copy
 * button and the parity test all read.
 *
 * @param {string} input.platformId  Which platform. Falls back to the first.
 */
export function calculateReseller(input, rates, { formatMoney = usd } = {}) {
  const salePrice = nonNeg(input.salePrice);
  if (salePrice <= 0) return invalid(CALC_SINGLE, 'Enter a sale price above $0 to see your payout.');

  const platform = rates.platforms.find((p) => p.id === input.platformId) ?? rates.platforms[0];
  const shippingCharged = nonNeg(input.shippingCharged);
  const shippingCost = nonNeg(input.shippingCost);
  const itemCost = nonNeg(input.itemCost);
  const sellerPaysShipping = Boolean(input.sellerPaysShipping);

  const fees = platformFees(platform, {
    salePrice, shippingCharged, shippingCost, sellerPaysShipping,
    stockxLevel: input.stockxLevel,
  });

  // Buyer-paid-label platforms never route postage through the seller, so the
  // postage they collect is not the seller's revenue either.
  const collectsShipping = platform.shippingModel === 'seller-choice';

  const r = result({ calculator: CALC_SINGLE, rates })
    .inputs({ ...input, platformId: platform.id })
    .revenue('sale', 'Sale price', salePrice)
    .revenue('shipping-charged', 'Postage charged to buyer', collectsShipping ? shippingCharged : 0)
    .fee('commission', commissionLabel(platform, salePrice), fees.commission)
    .fee('processing', processingLabel(platform), fees.processing)
    .fee('per-order', 'Per-order fee', fees.perOrder)
    .fee('listing', 'Listing fee', fees.listing)
    .cost('shipping-cost', 'Postage you pay', fees.shipping)
    .cost('item-cost', 'What the item cost you', itemCost);

  if (platform.commissionIncludesShipping && shippingCharged > 0) {
    r.note(`${platform.label} charges its fee on the postage you collect as well as the item price, so the ${formatMoney(shippingCharged)} of delivery is part of the fee base.`);
  }
  if (!collectsShipping && shippingCost > 0) {
    r.note(`${platform.label} supplies a prepaid label the buyer pays for, so the ${formatMoney(shippingCost)} of postage never touches your ledger here.`);
  }
  if (platform.commission?.minimumFee && fees.commission <= platform.commission.minimumFee + 0.005) {
    r.warn(`The ${formatMoney(platform.commission.minimumFee)} minimum fee applies at this price — it is higher than the percentage would have been, which is what makes cheap items disproportionately expensive to sell here.`);
  }

  const posh = platform.commission?.mode === 'hybrid-flat-under-threshold' ? platform.commission : null;
  if (posh && salePrice >= posh.threshold && salePrice < posh.threshold + 4) {
    const belowNet = round2(posh.threshold - 0.01 - posh.flatUnderThreshold);
    const hereNet = round2(salePrice - fees.commission);
    if (belowNet > hereNet) {
      r.warn(`Listing at ${formatMoney(posh.threshold - 0.01)} would leave you ${formatMoney(round2(belowNet - hereNet))} better off than listing at ${formatMoney(salePrice)}. ${platform.label} switches from a flat ${formatMoney(posh.flatUnderThreshold)} fee to ${(posh.rateAtOrAbove * 100).toFixed(0)}% at ${formatMoney(posh.threshold)}, and the whole sale re-rates.`);
    }
  }

  const built = r.build();
  built.platform = platform.label;
  built.platformId = platform.id;
  built.fees = fees;
  built.feeBase = round2(platform.commissionIncludesShipping ? salePrice + shippingCharged : salePrice);
  built.effectiveFeeRate = built.totals.gross > 0 ? fees.totalFees / built.totals.gross : 0;
  return built;
}

/** A commission label that states the shape actually applied at this price. */
function commissionLabel(platform, salePrice) {
  const c = platform.commission ?? {};
  switch (c.mode) {
    case 'hybrid-flat-under-threshold':
      return salePrice < c.threshold
        ? `Commission (flat ${usd(c.flatUnderThreshold)} under ${usd(c.threshold)})`
        : `Commission (${(c.rateAtOrAbove * 100).toFixed(0)}%)`;
    case 'tiered': {
      const tier = c.tiers.find((t) => t.upTo === null || salePrice <= t.upTo) ?? c.tiers.at(-1);
      return `Commission (${(tier.rate * 100).toFixed(1)}%)`;
    }
    case 'level-based':
      return 'Commission (by seller level)';
    default:
      return c.rate ? `Commission (${(c.rate * 100).toFixed(1)}%)` : 'Commission';
  }
}

function processingLabel(platform) {
  const rate = platform.processingRate ?? 0;
  const fixed = platform.processingFixed ?? 0;
  if (!rate && !fixed) return 'Payment processing';
  return `Payment processing (${(rate * 100).toFixed(2)}%${fixed ? ` + ${usd(fixed)}` : ''})`;
}

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
