/**
 * shopify.js — Shopify plan, gateway, and per-order cost calculation.
 *
 * The decision this tool actually exists to settle: whether using a third-party
 * payment gateway is worth it. Shopify charges an extra transaction fee — 2% on
 * Basic, down to 0.2% on Plus — on every order that does not go through Shopify
 * Payments. That fee is charged on top of whatever the outside gateway takes.
 *
 * On Basic, a 2% penalty plus a typical 2.9% + $0.30 gateway rate costs more
 * than Shopify Payments' own 2.9% + $0.30. The break-even only appears at
 * higher plan tiers or with a materially cheaper gateway.
 */

import { nonNeg, num, pctOfCents, round2, toCents, toDollars, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'shopify-fees';

/**
 * @param {object} input
 * @param {number} input.orderValue        Order total the customer pays.
 * @param {number} input.productCost       Your cost of goods for the order.
 * @param {number} input.shippingCharged   Shipping collected from the customer.
 * @param {number} input.shippingCost      Shipping you actually pay.
 * @param {string} input.plan              basic | grow | advanced | plus
 * @param {boolean} input.annualBilling    Annual plan pricing.
 * @param {string} input.channel           online | inPerson
 * @param {boolean} input.thirdPartyGateway  Using a gateway other than Shopify Payments.
 * @param {number} input.gatewayRate       Third-party gateway percentage, whole percent.
 * @param {number} input.gatewayFixed      Third-party gateway fixed fee.
 * @param {boolean} input.internationalCard
 * @param {boolean} input.currencyConversion
 * @param {boolean} input.amortisePlan     Spread the monthly plan cost per order.
 * @param {number} input.monthlyOrders     Orders per month, for amortising.
 * @param {number} input.appCosts          Monthly app subscriptions, amortised.
 */
export function calculateShopify(input, rates, { formatMoney = usd } = {}) {
  const orderValue = nonNeg(input.orderValue);
  if (orderValue <= 0) return invalid(CALC, 'Enter an order value above $0 to see your Shopify costs.');

  const shippingCharged = nonNeg(input.shippingCharged);
  const shippingCost = nonNeg(input.shippingCost);
  const productCost = nonNeg(input.productCost);

  const plan = rates.plans.find((p) => p.id === (input.plan ?? 'basic')) ?? rates.plans[0];
  const channel = input.channel === 'inPerson' ? 'inPerson' : 'online';

  const total = round2(orderValue + shippingCharged);
  const totalCents = toCents(total);

  const usingThirdParty = Boolean(input.thirdPartyGateway);

  let processingFee = 0;
  let processingLabel = '';

  if (usingThirdParty) {
    const gwRate = Math.max(0, num(input.gatewayRate, 2.9)) / 100;
    const gwFixed = nonNeg(num(input.gatewayFixed, 0.3));
    processingFee = toDollars(pctOfCents(totalCents, gwRate) + toCents(gwFixed));
    processingLabel = `Third-party gateway (${(gwRate * 100).toFixed(2)}% + ${formatMoney(gwFixed)})`;
  } else {
    const card = plan[channel];
    processingFee = toDollars(pctOfCents(totalCents, card.rate) + toCents(card.fixed));
    processingLabel = `Shopify Payments (${(card.rate * 100).toFixed(2)}%${card.fixed > 0 ? ` + ${formatMoney(card.fixed)}` : ''})`;
  }

  const shopifyTransactionFee = usingThirdParty
    ? toDollars(pctOfCents(totalCents, plan.thirdPartyGatewayRate))
    : 0;

  const internationalFee = input.internationalCard && !usingThirdParty
    ? toDollars(pctOfCents(totalCents, rates.internationalCardSurcharge.rate))
    : 0;

  const conversionFee = input.currencyConversion && !usingThirdParty
    ? toDollars(pctOfCents(totalCents, rates.currencyConversionFee.rate))
    : 0;

  const monthlyOrders = Math.max(1, num(input.monthlyOrders, 100));
  const planMonthly = input.annualBilling === false ? plan.monthlyMonthly : plan.monthlyAnnual;
  const planFee = input.amortisePlan ? round2(planMonthly / monthlyOrders) : 0;
  const appFee = input.amortisePlan ? round2(nonNeg(input.appCosts) / monthlyOrders) : 0;

  const r = result({ calculator: CALC, rates })
    .inputs(input)
    .revenue('order', 'Order value', orderValue)
    .revenue('shipping-charged', 'Shipping charged', shippingCharged)
    .fee('processing', processingLabel, processingFee)
    .fee('shopify-transaction', `Shopify transaction fee (${(plan.thirdPartyGatewayRate * 100).toFixed(2)}%)`, shopifyTransactionFee,
      usingThirdParty ? rates.thirdPartyGatewayNote : undefined)
    .fee('international', 'International card surcharge', internationalFee)
    .fee('conversion', 'Currency conversion', conversionFee)
    .fee('plan', `${plan.label} plan, amortised`, planFee)
    .fee('apps', 'App subscriptions, amortised', appFee)
    .cost('product', 'Cost of goods', productCost)
    .cost('shipping-cost', 'Actual shipping cost', shippingCost);

  // The comparison that makes this tool worth using.
  const alternative = calculateAlternativeGateway(input, rates, plan, channel, total, totalCents);
  if (alternative) {
    const delta = round2(alternative - (processingFee + shopifyTransactionFee));
    if (Math.abs(delta) >= 0.01) {
      if (delta > 0) {
        r.note(`Staying on Shopify Payments saves you ${formatMoney(delta)} on this order — ${formatMoney(round2(delta * monthlyOrders))} a month at ${monthlyOrders} orders.`);
      } else {
        r.note(`The third-party gateway saves you ${formatMoney(Math.abs(delta))} on this order even after Shopify's ${(plan.thirdPartyGatewayRate * 100).toFixed(2)}% penalty.`);
      }
    }
  }

  if (usingThirdParty && plan.id === 'basic') {
    r.warn(`On the Basic plan, Shopify's 2% third-party gateway fee is larger than the entire gap between most gateway rates. Check the comparison before switching away from Shopify Payments.`);
  }

  const built = r.build();
  built.plan = plan.label;
  built.processingFee = processingFee;
  built.shopifyTransactionFee = shopifyTransactionFee;
  built.planMonthly = planMonthly;
  built.totalPlatformCost = round2(processingFee + shopifyTransactionFee + internationalFee + conversionFee + planFee + appFee);
  return built;
}

function calculateAlternativeGateway(input, rates, plan, channel, total, totalCents) {
  if (input.thirdPartyGateway) {
    // What Shopify Payments would have cost instead.
    const card = plan[channel];
    return toDollars(pctOfCents(totalCents, card.rate) + toCents(card.fixed));
  }
  // What a typical third-party gateway plus the Shopify penalty would cost.
  const gwRate = Math.max(0, num(input.gatewayRate, 2.9)) / 100;
  const gwFixed = nonNeg(num(input.gatewayFixed, 0.3));
  return toDollars(
    pctOfCents(totalCents, gwRate) + toCents(gwFixed) + pctOfCents(totalCents, plan.thirdPartyGatewayRate)
  );
}

/**
 * The monthly REVENUE at which each plan overtakes the one below it.
 *
 * Shopify sells plans on price and buries the thing that actually decides the
 * choice: a dearer plan buys a lower processing rate, so it wins once you
 * process enough revenue for the rate saving to cover the extra subscription.
 * Two plans cost the same when
 *
 *   feeA + rateA x = feeB + rateB x
 *   x = (feeB - feeA) / (rateA - rateB)
 *
 * where x is monthly card revenue. Note what is NOT in that expression: order
 * count and average order value. The threshold is a revenue number, and the
 * "how many orders" answer people ask for is just x divided by their AOV —
 * which is why every order-count rule of thumb you see quoted is wrong for
 * anyone whose basket differs from the one it was computed at.
 *
 * The per-order fixed fee is identical across plans, so it cancels and does
 * not appear. Returns one entry per adjacent pair, cheapest plan first.
 */
export function planCrossovers(rates, { channel = 'online', annualBilling = true } = {}) {
  const monthly = (plan) => (annualBilling === false ? plan.monthlyMonthly : plan.monthlyAnnual);
  const out = [];

  for (let i = 0; i < rates.plans.length - 1; i += 1) {
    const lower = rates.plans[i];
    const upper = rates.plans[i + 1];
    const rateGap = lower[channel].rate - upper[channel].rate;
    const feeGap = monthly(upper) - monthly(lower);
    out.push({
      from: lower.id,
      fromLabel: lower.label,
      to: upper.id,
      toLabel: upper.label,
      feeGap: round2(feeGap),
      rateGap,
      // Parallel rate lines (or an upper plan that costs less) never cross.
      monthlyRevenue: rateGap > 0 ? round2(feeGap / rateGap) : null,
    });
  }
  return out;
}

/**
 * Compare total monthly cost across every plan at a given volume.
 * This is what answers "when should I upgrade from Basic to Grow?".
 */
export function comparePlans(input, rates) {
  const monthlyOrders = Math.max(1, num(input.monthlyOrders, 100));
  const rows = rates.plans.map((plan) => {
    const r = calculateShopify({ ...input, plan: plan.id, amortisePlan: false }, rates);
    if (!r.ok) return null;
    const planMonthly = input.annualBilling === false ? plan.monthlyMonthly : plan.monthlyAnnual;
    const perOrderFees = round2(r.totals.fees);
    const monthlyTotal = round2(perOrderFees * monthlyOrders + planMonthly);
    return {
      id: plan.id,
      label: plan.label,
      planMonthly,
      perOrderFees,
      monthlyTotal,
      monthlyRevenue: round2((nonNeg(input.orderValue) + nonNeg(input.shippingCharged)) * monthlyOrders),
    };
  }).filter(Boolean);

  const cheapest = rows.reduce((best, row) => (best === null || row.monthlyTotal < best.monthlyTotal ? row : best), null);
  return rows.map((row) => ({ ...row, isCheapest: cheapest !== null && row.id === cheapest.id }));
}
