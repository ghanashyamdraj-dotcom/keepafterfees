/**
 * processors.js — payment processor fees, and the reverse calculation.
 *
 * The forward direction (what do I keep from a $500 invoice?) is easy.
 * The reverse direction (I need to receive exactly $500 — what do I invoice?)
 * is where people get it wrong, and they get it wrong the same way every time:
 * they add the fee to the target instead of grossing up.
 *
 *   Wrong:  $500 + 2.9% + $0.30 = $514.80  -> you receive $499.57. Short.
 *   Right:  ($500 + $0.30) / (1 - 0.029)   = $515.24 -> you receive $500.00.
 *
 * The fee applies to the LARGER amount you charge, not to the target. Every
 * "just add the percentage" invoice comes up a few dollars short.
 */

import { nonNeg, num, pctOfCents, round2, toCents, toDollars, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC_FORWARD = 'processor-fees';
const CALC_REVERSE = 'charge-to-receive';

/**
 * Look up a processor and one of its products.
 *
 * `productId` may be a bare id ("ach") or a qualified "processor:product"
 * ("stripe:ach"), in which case the prefix wins over `processorId`. The
 * qualified form exists so a page that spans processors can drive both values
 * from ONE <select> — readForm() in app.js has no way to repopulate a second
 * select when the first changes, so two independent selects can display a
 * schedule belonging to a processor other than the one being calculated.
 *
 * Returns the resolved processorId alongside the objects, because callers
 * branch on it (the PayPal micropayments hint) and must not read a stale
 * `input.processorId` that the qualified form has overridden.
 */
export function getProduct(rates, processorId, productId) {
  let id = productId;
  if (typeof id === 'string' && id.includes(':')) {
    const [prefix, rest] = id.split(':');
    if (rates[prefix]) {
      processorId = prefix;
      id = rest;
    }
  }
  const processor = rates[processorId];
  if (!processor) return null;
  const product = processor.products.find((p) => p.id === id) ?? processor.products[0];
  return { processor, product, processorId, productId: product.id };
}

/**
 * Effective rate and fixed fee once surcharges are applied.
 * Returned as { rate, fixed, cap, components[] } so the UI can show the maths.
 */
export function effectiveRate(rates, { processorId = 'stripe', productId, international = false, currencyConversion = false }) {
  const found = getProduct(rates, processorId, productId);
  if (!found) return null;
  const { processor, product } = found;

  const components = [{ label: product.label, rate: product.rate, fixed: product.fixed }];
  let rate = product.rate;
  const fixed = product.fixed;

  if (product.extraRate) {
    rate += product.extraRate;
    components.push({ label: product.extraNote ?? 'Product surcharge', rate: product.extraRate, fixed: 0 });
  }

  const crossBorder = processor.crossBorderFee ?? processor.internationalCardSurcharge;
  if (international && crossBorder) {
    rate += crossBorder.rate;
    components.push({ label: 'International / cross-border', rate: crossBorder.rate, fixed: 0 });
  }

  if (currencyConversion && processor.currencyConversion) {
    rate += processor.currencyConversion.rate;
    components.push({ label: 'Currency conversion', rate: processor.currencyConversion.rate, fixed: 0 });
  }

  return {
    rate, fixed, cap: product.cap ?? null, components, processor, product,
    // Resolved, not as supplied — a qualified productId can override it.
    processorId: found.processorId, productId: found.productId,
  };
}

/**
 * Forward: what lands in your account from a given charge.
 *
 * @param {object} input
 * @param {number} input.amount        Amount charged to the customer.
 * @param {string} input.processorId   paypal | stripe | square | wise | payoneer
 * @param {string} input.productId     Which fee schedule within that processor.
 * @param {boolean} input.international
 * @param {boolean} input.currencyConversion
 * @param {number} input.transactions  Model N identical transactions.
 */
export function calculateProcessorFee(input, rates, { formatMoney = usd } = {}) {
  const amount = nonNeg(input.amount);
  if (amount <= 0) return invalid(CALC_FORWARD, 'Enter an amount above $0 to see the processing fee.');

  const eff = effectiveRate(rates, input);
  if (!eff) return invalid(CALC_FORWARD, 'Unknown payment processor.');

  const transactions = Math.max(1, Math.floor(num(input.transactions, 1)));

  let feeCents = pctOfCents(toCents(amount), eff.rate) + toCents(eff.fixed);
  if (eff.cap !== null) feeCents = Math.min(feeCents, toCents(eff.cap));

  const fee = toDollars(feeCents);
  const paidBySender = eff.product.paidBy === 'sender';

  const r = result({ calculator: CALC_FORWARD, rates })
    .inputs(input)
    .revenue('charged', `Amount charged${transactions > 1 ? ` x ${transactions}` : ''}`, amount * transactions)
    .fee('processing', `${eff.processor.label} — ${eff.product.label}`, paidBySender ? 0 : fee * transactions,
      formulaLabel(eff, formatMoney))
    .info('effective-rate', 'Effective fee rate', `${((fee / amount) * 100).toFixed(2)}%`,
      'The fixed component means the effective rate falls as the transaction gets bigger.')
    .extra({ effective: eff, feePerTransaction: fee });

  if (paidBySender) {
    r.note(`${eff.product.label} is charged to the sender, not to you. You receive the full amount.`);
  }
  if (eff.cap !== null && feeCents >= toCents(eff.cap)) {
    r.note(`This fee is capped at ${formatMoney(eff.cap)}, so larger transactions cost the same in absolute terms.`);
  }
  // Micropayments is cheaper below the crossover and dearer above it. The
  // comparison below is exact, so it needs no amount threshold guarding it —
  // an earlier `amount < 12` gate here suppressed the hint across the entire
  // $12–$26 range where micropayments genuinely wins (the real crossover is
  // ~$26.67, not $12). Products where micropayments can never win — Friends &
  // Family at 0%, the QR rates — fail `microFee < fee` on their own.
  if (eff.processorId === 'paypal' && eff.productId !== 'micropayments') {
    const micro = rates.paypal.products.find((p) => p.id === 'micropayments');
    const microFee = toDollars(pctOfCents(toCents(amount), micro.rate) + toCents(micro.fixed));
    if (microFee < fee) {
      r.note(`At ${formatMoney(amount)}, PayPal micropayments pricing would cost ${formatMoney(microFee)} instead of ${formatMoney(fee)} — a saving of ${formatMoney(fee - microFee)} per transaction. Micropayments must be requested and applies to your whole account.`);
    }
  }

  // The reverse warning matters more, because micropayments is an account-wide
  // setting: someone who opted in for $5 sales is overpaying on every large one.
  if (eff.processorId === 'paypal' && eff.productId === 'micropayments') {
    const std = rates.paypal.products.find((p) => p.id === 'checkout');
    const stdFee = toDollars(pctOfCents(toCents(amount), std.rate) + toCents(std.fixed));
    if (stdFee < fee) {
      r.note(`At ${formatMoney(amount)}, standard pricing would cost ${formatMoney(stdFee)} instead of ${formatMoney(fee)} — micropayments is costing you ${formatMoney(fee - stdFee)} on this transaction. Micropayments applies account-wide, so it only pays off if most of your payments sit below the crossover.`);
    }
  }

  return r.build();
}

/**
 * The amount at which two fee schedules cost exactly the same.
 *
 * Two schedules of the form `rate x + fixed` cross at most once. Setting them
 * equal and solving:
 *
 *   rateA x + fixedA = rateB x + fixedB
 *   x = (fixedA - fixedB) / (rateB - rateA)
 *
 * The classic use is PayPal standard (3.49% + $0.49) against micropayments
 * (4.99% + $0.09): the lower percentage is paired with the higher fixed fee, so
 * micropayments wins on small amounts and loses on large ones. Returns null
 * when the lines are parallel or never cross at a positive amount — i.e. when
 * one schedule simply dominates the other everywhere.
 *
 * The value is exact algebra on the un-rounded lines. Because each side is
 * independently rounded to the cent, real fees tie for a few cents either side
 * of the crossover rather than flipping at a single point; `strictBelow` and
 * `strictAbove` bound that tie region.
 */
export function scheduleCrossover(a, b) {
  const rateGap = b.rate - a.rate;
  const fixedGap = a.fixed - b.fixed;
  if (rateGap === 0) return null;
  const x = fixedGap / rateGap;
  if (!Number.isFinite(x) || x <= 0) return null;

  const feeAt = (s, amount) => toDollars(pctOfCents(toCents(amount), s.rate) + toCents(s.fixed));
  // Walk out from the algebraic crossover to the last cent where each side is
  // strictly cheaper, so callers can state the boundary without asserting a
  // precision the cent-rounding does not actually have.
  let strictBelow = null;
  let strictAbove = null;
  for (let c = Math.max(1, Math.floor(x * 100) - 200); c <= Math.ceil(x * 100) + 200; c++) {
    const amount = c / 100;
    if (feeAt(b, amount) < feeAt(a, amount)) strictBelow = amount;
    if (strictAbove === null && feeAt(a, amount) < feeAt(b, amount)) strictAbove = amount;
  }
  return { amount: x, strictBelow, strictAbove };
}

/** PayPal standard-checkout vs micropayments crossover, from the rate card. */
export function micropaymentsCrossover(rates) {
  const products = rates?.paypal?.products ?? [];
  const std = products.find((p) => p.id === 'checkout');
  const micro = products.find((p) => p.id === 'micropayments');
  if (!std || !micro) return null;
  return scheduleCrossover(std, micro);
}

function formulaLabel(eff, formatMoney = usd) {
  const pctPart = `${(eff.rate * 100).toFixed(2)}%`;
  const fixedPart = eff.fixed > 0 ? ` + ${formatMoney(eff.fixed)}` : '';
  const capPart = eff.cap !== null ? `, capped at ${formatMoney(eff.cap)}` : '';
  return `${pctPart}${fixedPart}${capPart}`;
}

/**
 * Reverse: what to charge so a target amount lands in your account.
 *
 * Closed form for the linear case:  charge = (target + fixed) / (1 - rate)
 * Rounded UP to the cent, because rounding down leaves you a penny short and
 * a penny short on an invoice is a support email.
 *
 * @param {object} input
 * @param {number} input.targetNet   What you need to actually receive.
 * @param {string} input.processorId
 * @param {string} input.productId
 * @param {boolean} input.international
 * @param {boolean} input.currencyConversion
 */
export function calculateChargeToReceive(input, rates, { formatMoney = usd } = {}) {
  const targetNet = nonNeg(input.targetNet);
  if (targetNet <= 0) return invalid(CALC_REVERSE, 'Enter the amount you need to receive.');

  const eff = effectiveRate(rates, input);
  if (!eff) return invalid(CALC_REVERSE, 'Unknown payment processor.');
  if (eff.rate >= 1) return invalid(CALC_REVERSE, 'This fee schedule takes 100% or more — no charge amount can produce that net.');

  // Closed form, then round up to the nearest cent.
  let charge = (targetNet + eff.fixed) / (1 - eff.rate);
  charge = Math.ceil(charge * 100) / 100;

  // A capped fee (ACH) breaks the linear model above the cap. Re-solve.
  if (eff.cap !== null) {
    const cappedCharge = round2(targetNet + eff.cap);
    const feeAtCapped = Math.min(
      pctOfCents(toCents(cappedCharge), eff.rate) + toCents(eff.fixed),
      toCents(eff.cap)
    );
    if (toDollars(feeAtCapped) >= eff.cap - 0.005) charge = cappedCharge;
  }

  let feeCents = pctOfCents(toCents(charge), eff.rate) + toCents(eff.fixed);
  if (eff.cap !== null) feeCents = Math.min(feeCents, toCents(eff.cap));
  const fee = toDollars(feeCents);
  const actualNet = round2(charge - fee);

  // What the naive "just add the percentage" approach would have produced.
  const naiveCharge = round2(targetNet * (1 + eff.rate) + eff.fixed);
  let naiveFeeCents = pctOfCents(toCents(naiveCharge), eff.rate) + toCents(eff.fixed);
  if (eff.cap !== null) naiveFeeCents = Math.min(naiveFeeCents, toCents(eff.cap));
  const naiveNet = round2(naiveCharge - toDollars(naiveFeeCents));
  const shortfall = round2(targetNet - naiveNet);

  const r = result({ calculator: CALC_REVERSE, rates })
    .inputs(input)
    .revenue('charge', 'Charge this amount', charge)
    .fee('processing', `${eff.processor.label} — ${eff.product.label}`, fee, formulaLabel(eff, formatMoney))
    .info('target', 'You wanted to receive', formatMoney(targetNet))
    .info('actual', 'You will actually receive', formatMoney(actualNet))
    .info('markup', 'Gross-up', `${(((charge - targetNet) / targetNet) * 100).toFixed(2)}%`,
      'The percentage you have to add on top of your target, which is always larger than the fee percentage itself.')
    .extra({
      chargeAmount: charge,
      actualNet,
      fee,
      effective: eff,
      naive: { charge: naiveCharge, net: naiveNet, shortfall },
      formula: `charge = (${targetNet.toFixed(2)} + ${eff.fixed.toFixed(2)}) / (1 - ${eff.rate.toFixed(4)}) = ${charge.toFixed(2)}`,
    });

  if (shortfall > 0.005) {
    r.note(`Adding the fee percentage to your target instead of grossing up would have you invoice ${formatMoney(naiveCharge)} and receive ${formatMoney(naiveNet)} — ${formatMoney(shortfall)} short.`);
  }

  return r.build();
}

/** Compare the same charge across every processor and product. */
export function compareProcessors(amount, rates, { international = false, currencyConversion = false } = {}) {
  const rows = [];
  for (const [processorId, processor] of Object.entries(rates)) {
    if (!processor || typeof processor !== 'object' || !Array.isArray(processor.products)) continue;
    for (const product of processor.products) {
      const r = calculateProcessorFee(
        { amount, processorId, productId: product.id, international, currencyConversion },
        rates
      );
      if (!r.ok) continue;
      rows.push({
        processorId,
        processor: processor.label,
        productId: product.id,
        product: product.label,
        fee: r.totals.fees,
        net: r.totals.net,
        effectiveRate: amount > 0 ? r.totals.fees / amount : 0,
      });
    }
  }
  return rows.sort((a, b) => a.fee - b.fee);
}
