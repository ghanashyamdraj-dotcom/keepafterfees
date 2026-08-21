/**
 * margin.js — profit margin, markup, and break-even.
 *
 * Margin and markup are not the same number and confusing them is the most
 * expensive arithmetic error in small-business pricing. A 50% markup is a 33.3%
 * margin. Someone who wants a 50% margin and applies a 50% markup is
 * under-charging by a third.
 *
 *   margin = profit / revenue     (share of the SALE price you keep)
 *   markup = profit / cost        (share of the COST you added on top)
 */

import { nonNeg, num, round2, usd } from '../money.js';
import { result, invalid } from '../result.js';

const CALC = 'margin-markup';

export const marginFromMarkup = (markup) => markup / (1 + markup);
export const markupFromMargin = (margin) => (margin >= 1 ? Infinity : margin / (1 - margin));

/**
 * @param {object} input
 * @param {string} input.mode  'fromPrice' | 'fromMargin' | 'fromMarkup'
 * @param {number} input.cost
 * @param {number} input.price
 * @param {number} input.targetMargin  whole percent
 * @param {number} input.targetMarkup  whole percent
 * @param {number} input.fixedCosts    monthly fixed costs, for break-even units
 */
export function calculateMargin(input, rates = null, { formatMoney = usd } = {}) {
  const cost = nonNeg(input.cost);
  const mode = input.mode ?? 'fromPrice';

  let price;
  if (mode === 'fromMargin') {
    const m = Math.max(0, num(input.targetMargin, 0)) / 100;
    if (m >= 1) return invalid(CALC, 'A margin of 100% or more is impossible — margin is a share of the sale price.');
    price = round2(cost / (1 - m));
  } else if (mode === 'fromMarkup') {
    const mk = Math.max(0, num(input.targetMarkup, 0)) / 100;
    price = round2(cost * (1 + mk));
  } else {
    price = nonNeg(input.price);
  }

  if (price <= 0) return invalid(CALC, 'Enter a price above $0.');

  const profit = round2(price - cost);
  const margin = price > 0 ? profit / price : 0;
  const markup = cost > 0 ? profit / cost : null;

  const fixedCosts = nonNeg(input.fixedCosts);
  const breakEvenUnits = profit > 0 && fixedCosts > 0 ? Math.ceil(fixedCosts / profit) : null;

  const r = result({ calculator: CALC, rates })
    .inputs(input)
    .revenue('price', 'Selling price', price)
    .cost('cost', 'Unit cost', cost)
    .info('margin', 'Profit margin', `${(margin * 100).toFixed(2)}%`, 'Share of the sale price you keep.')
    .info('markup', 'Markup', markup === null ? 'n/a' : `${(markup * 100).toFixed(2)}%`, 'Percentage added on top of your cost.')
    .extra({ price, cost, profit, margin, markup, breakEvenUnits, fixedCosts });

  if (breakEvenUnits) {
    r.info('break-even', 'Break-even volume', `${breakEvenUnits} units/month`,
      `At ${formatMoney(profit)} profit per unit you need ${breakEvenUnits} sales a month to cover ${formatMoney(fixedCosts)} of fixed costs.`);
  }

  if (markup !== null && Math.abs(markup - margin) > 0.001) {
    r.note(`A ${(markup * 100).toFixed(1)}% markup produces a ${(margin * 100).toFixed(1)}% margin. If you meant to keep ${(markup * 100).toFixed(1)}% of the sale price, you need to charge ${formatMoney(round2(cost / (1 - Math.min(0.99, markup))))} instead.`);
  }
  if (margin < 0) {
    r.warn('You are selling below cost. Every unit sold loses money.');
  }

  return r.build();
}

/** Margin table across a range of prices — useful for pricing experiments. */
export function marginTable(cost, prices) {
  return prices.map((price) => {
    const profit = round2(price - cost);
    return {
      price: round2(price),
      profit,
      margin: price > 0 ? profit / price : 0,
      markup: cost > 0 ? profit / cost : null,
    };
  });
}
