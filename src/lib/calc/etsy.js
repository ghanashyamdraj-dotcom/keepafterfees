/**
 * etsy.js — Etsy fee and profit calculation.
 *
 * The detail sellers most often miss: Etsy's 6.5% transaction fee applies to
 * the shipping you charge the buyer, not just the item price. If you offer
 * "free shipping" by folding $8 of postage into a $32 item, Etsy takes 6.5% of
 * the whole $40, and you pay postage out of what's left.
 *
 * Offsite Ads is the other trap. It is charged only on orders that came through
 * an Etsy-bought ad, so it does not apply to every sale — but when it does fire
 * it is 12-15% on top of everything else, which is enough to turn a healthy
 * margin negative on a low-priced item.
 */

import { nonNeg, num, pctOfCents, round2, toCents, toDollars, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'etsy-fees';

/**
 * @param {object} input
 * @param {number} input.itemPrice        Listed price of the item.
 * @param {number} input.quantity         Units in the order.
 * @param {number} input.shippingCharged  What you charge the buyer for postage.
 * @param {number} input.shippingCost     What postage actually costs you.
 * @param {number} input.materialsCost    Your cost of goods per unit.
 * @param {number} input.giftWrap         Gift wrap charged to the buyer.
 * @param {boolean} input.offsiteAds      This order came via an Offsite Ad.
 * @param {boolean} input.highVolumeSeller  $10k+ in trailing 12-month sales.
 * @param {string} input.country          Seller bank country: US, GB, CA, AU.
 * @param {boolean} input.autoRenew       Charge the $0.20 renewal on this sale.
 * @param {number} input.salesTaxCollected  Tax Etsy collects and remits.
 * @param {boolean} input.etsyPlus        Amortise the $10/mo subscription.
 * @param {number} input.monthlyOrders    Orders per month, for amortising.
 */
export function calculateEtsy(input, rates, { formatMoney = usd } = {}) {
  const itemPrice = nonNeg(input.itemPrice);
  if (itemPrice <= 0) return invalid(CALC, 'Enter an item price above $0 to see your Etsy payout.');

  const quantity = Math.max(1, Math.floor(num(input.quantity, 1)));
  const shippingCharged = nonNeg(input.shippingCharged);
  const shippingCost = nonNeg(input.shippingCost);
  const materialsCost = nonNeg(input.materialsCost);
  const giftWrap = nonNeg(input.giftWrap);
  const salesTax = nonNeg(input.salesTaxCollected);

  const itemTotal = round2(itemPrice * quantity);

  // Transaction fee base excludes sales tax; payment processing base includes it.
  const transactionBase = round2(itemTotal + shippingCharged + giftWrap);
  const processingBase = round2(transactionBase + salesTax);

  const listingFee = input.autoRenew === false ? 0 : rates.listingFee.amount;
  const transactionFee = toDollars(pctOfCents(toCents(transactionBase), rates.transactionFee.rate));

  const processing = rates.paymentProcessing[input.country ?? 'US'] ?? rates.paymentProcessing.US;
  const processingFee = toDollars(
    pctOfCents(toCents(processingBase), processing.rate) + toCents(processing.fixed)
  );

  let offsiteAdsFee = 0;
  let offsiteRate = 0;
  if (input.offsiteAds) {
    offsiteRate = input.highVolumeSeller ? rates.offsiteAds.highVolumeRate : rates.offsiteAds.standardRate;
    offsiteAdsFee = Math.min(
      toDollars(pctOfCents(toCents(transactionBase), offsiteRate)),
      rates.offsiteAds.capPerOrder
    );
  }

  const plusFee = input.etsyPlus
    ? round2(rates.subscriptions.etsyPlusMonthly / Math.max(1, num(input.monthlyOrders, 30)))
    : 0;

  const r = result({ calculator: CALC, rates })
    .inputs(input)
    .revenue('item', `Item price${quantity > 1 ? ` x ${quantity}` : ''}`, itemTotal)
    .revenue('shipping-charged', 'Shipping charged to buyer', shippingCharged)
    .revenue('gift-wrap', 'Gift wrap charged', giftWrap)
    .fee('listing', 'Listing fee', listingFee, 'Charged on publish and every 4 months, or on each sale with auto-renew on.')
    .fee('transaction', `Transaction fee (${(rates.transactionFee.rate * 100).toFixed(1)}%)`, transactionFee,
      'Charged on the item price plus the shipping and gift wrap you collect.')
    .fee('processing', `Payment processing (${(processing.rate * 100).toFixed(1)}% + ${formatMoney(processing.fixed)})`, processingFee)
    .fee('offsite-ads', `Offsite Ads (${(offsiteRate * 100).toFixed(0)}%)`, offsiteAdsFee)
    .fee('etsy-plus', 'Etsy Plus, amortised', plusFee)
    .cost('materials', `Materials / cost of goods${quantity > 1 ? ` x ${quantity}` : ''}`, materialsCost * quantity)
    .cost('shipping-cost', 'Actual postage cost', shippingCost);

  if (shippingCharged > 0 && shippingCharged < shippingCost) {
    r.warn(`You are charging ${formatMoney(shippingCharged)} for shipping that costs you ${formatMoney(shippingCost)}. The ${formatMoney(shippingCost - shippingCharged)} gap comes straight out of your margin.`);
  }
  if (input.offsiteAds && offsiteAdsFee >= rates.offsiteAds.capPerOrder) {
    r.warn(`The Offsite Ads fee hit the ${formatMoney(rates.offsiteAds.capPerOrder)} per-order cap.`);
  }
  if (!input.offsiteAds) {
    r.note('This estimate assumes the order did not come through an Offsite Ad. Etsy charges that fee on ad-attributed orders only, so your blended fee rate across all sales will sit between this figure and the Offsite Ads figure.');
  }
  if (input.highVolumeSeller && !input.offsiteAds) {
    r.note(`At or above ${formatMoney(rates.offsiteAds.highVolumeThreshold)} in trailing 12-month sales, Offsite Ads participation is mandatory — you cannot opt out, but the rate drops to ${(rates.offsiteAds.highVolumeRate * 100).toFixed(0)}%.`);
  }

  const built = r.build();
  built.feeBreakdownRate = transactionBase > 0 ? built.totals.fees / transactionBase : 0;
  built.perUnitProfit = round2(built.totals.net / quantity);
  return built;
}
