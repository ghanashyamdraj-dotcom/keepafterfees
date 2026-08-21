/**
 * registry.js — maps a page's data-calculator id to its engine and its
 * result presentation.
 *
 * Adding a calculator to the site is: write the engine, add one entry here,
 * add the page definition. The runtime, the copy button, the CSV export, the
 * localStorage persistence, and the shareable URL all come for free.
 */

import * as rates from '../lib/rates.generated.js';
import { calculateAmazonFBA } from '../lib/calc/amazon.js';
import { calculateEtsy } from '../lib/calc/etsy.js';
import { calculateEbay } from '../lib/calc/ebay.js';
import { calculateShopify, comparePlans } from '../lib/calc/shopify.js';
import { compareResellers } from '../lib/calc/resellers.js';
import { calculateProcessorFee, calculateChargeToReceive } from '../lib/calc/processors.js';
import { calculateHourlyRate, calculateInvoiceTakeHome, calculateDayRate } from '../lib/calc/freelance.js';
import { calculateSelfEmploymentTax } from '../lib/calc/setax.js';
import { calculatePaycheck } from '../lib/calc/paycheck.js';
import { calculateMargin } from '../lib/calc/margin.js';
import { usd, pctLabel, formatMoney } from '../lib/money.js';

const pct = (v) => (v === null || v === undefined ? '—' : pctLabel(v, 1));
const money = (v) => (v === null || v === undefined ? '—' : usd(v));

/** Resolve the state record a page needs, defaulting sensibly. */
function stateFor(input) {
  const code = (input.stateCode ?? '').toUpperCase();
  return rates.states[code] ?? null;
}

export const REGISTRY = {
  'amazon-fba': {
    run: (input) => calculateAmazonFBA(input, rates.amazon),
    headlineLabel: 'Net profit per unit',
    headline: (r) => money(r.netPerUnit ?? r.totals.net),
    stats: (r) => [
      { label: 'Margin', value: pct(r.totals.margin) },
      { label: 'ROI', value: pct(r.totals.roi) },
      { label: 'Break-even', value: money(r.breakEvenPrice) },
    ],
  },

  // Distinct id from 'amazon-fba' rather than a locale flag on the same
  // entry — this closure fixes its rates object (rates.byLocale.amazon
  // ['en-GB']) at module load, so a UK visitor's live recalculation never
  // touches US rates. See the matching case in build/build.mjs.
  'amazon-fba-uk': (() => {
    const gbRates = rates.byLocale.amazon['en-GB'];
    const locale = rates.locales['en-GB'];
    const gbp = (v) => (v === null || v === undefined ? '—' : formatMoney(v, locale));
    return {
      run: (input) => calculateAmazonFBA(input, gbRates, { formatMoney: gbp }),
      headlineLabel: 'Net profit per unit',
      headline: (r) => gbp(r.netPerUnit ?? r.totals.net),
      stats: (r) => [
        { label: 'Margin', value: pct(r.totals.margin) },
        { label: 'ROI', value: pct(r.totals.roi) },
        { label: 'Break-even', value: gbp(r.breakEvenPrice) },
      ],
      locale,
    };
  })(),

  'etsy-fees': {
    run: (input) => calculateEtsy(input, rates.etsy),
    headlineLabel: 'Your profit',
    headline: (r) => money(r.totals.net),
    stats: (r) => [
      { label: 'Etsy takes', value: money(r.totals.fees) },
      { label: 'Fee rate', value: pct(r.totals.effectiveFeeRate) },
      { label: 'Margin', value: pct(r.totals.margin) },
    ],
  },

  'ebay-fees': {
    run: (input) => calculateEbay(input, rates.ebay),
    headlineLabel: 'Your profit',
    headline: (r) => money(r.totals.net),
    stats: (r) => [
      { label: 'eBay payout', value: money(r.totals.payout) },
      { label: 'Total fees', value: money(r.totals.fees) },
      { label: 'Fee rate', value: pct(r.effectiveFvfRate) },
    ],
  },

  'shopify-fees': {
    run: (input) => calculateShopify(input, rates.shopify),
    headlineLabel: 'Net per order',
    headline: (r) => money(r.totals.net),
    stats: (r) => [
      { label: 'Processing', value: money(r.processingFee) },
      { label: 'Platform cost', value: money(r.totalPlatformCost) },
      { label: 'Margin', value: pct(r.totals.margin) },
    ],
    // The plan comparison is the reason to use this tool, and it moves with
    // order value and volume — so it re-renders live. Must mirror the same
    // block in build/build.mjs's 'shopify-fees' case, or the table the build
    // ships would be replaced by a different one on first keystroke.
    // `cheapness` is -monthlyTotal because renderComparison marks the highest.
    extraRender: (r) => renderComparison(
      comparePlans(r.inputs, rates.shopify).map((p) => ({ ...p, cheapness: -p.monthlyTotal })),
      {
        columns: [
          { key: 'label', label: 'Plan' },
          { key: 'planMonthly', label: 'Plan/mo', format: (row) => usd(row.planMonthly) },
          { key: 'perOrderFees', label: 'Fees/order', format: (row) => usd(row.perOrderFees) },
          { key: 'monthlyTotal', label: 'Total/mo', format: (row) => usd(row.monthlyTotal) },
        ],
        bestKey: 'cheapness',
      }
    ),
  },

  'reseller-comparison': {
    run: (input) => compareResellers(input, rates.resellers),
    headlineLabel: 'Best payout',
    headline: (r) => (r.best ? `${r.best.label} — ${usd(r.best.netProfit)}` : '—'),
    stats: (r) => [
      { label: 'Spread', value: r.best && r.worst ? money(r.best.netProfit - r.worst.netProfit) : '—' },
      { label: 'Platforms', value: String(r.rows?.length ?? 0) },
    ],
    extraRender: (r) => renderComparison(r.rows, {
      columns: [
        { key: 'label', label: 'Platform' },
        { key: 'fees', label: 'Fees', format: (row) => usd(row.fees.totalFees) },
        { key: 'effectiveFeeRate', label: 'Fee rate', format: (row) => pct(row.effectiveFeeRate) },
        { key: 'payout', label: 'Payout', format: (row) => usd(row.payout) },
        { key: 'netProfit', label: 'Net profit', format: (row) => usd(row.netProfit) },
      ],
      bestKey: 'netProfit',
    }),
  },

  /**
   * Forward and reverse in one tool.
   *
   * "What do I charge to receive exactly $500?" is a different question from
   * "what does PayPal take from $500", and it is the one freelancers actually
   * ask. Rather than send them to a second page, the direction radio swaps
   * which engine runs. `chargeAmount` is only ever present on a reverse
   * result, so it doubles as the discriminator for the display fields.
   *
   * The server renders the forward default, and so does the client on load, so
   * the parity test still compares like with like.
   */
  'processor-fees': {
    run: (input) => (input.direction === 'reverse'
      ? calculateChargeToReceive({ ...input, targetNet: input.amount }, rates.processors)
      : calculateProcessorFee(input, rates.processors)),
    headlineLabel: (r) => (r.chargeAmount != null ? 'Charge this amount' : 'You receive'),
    headline: (r) => money(r.chargeAmount != null ? r.chargeAmount : r.totals.net),
    stats: (r) => (r.chargeAmount != null
      ? [
          { label: 'Fee', value: money(r.fee) },
          { label: 'You receive', value: money(r.actualNet) },
        ]
      : [
          { label: 'Fee', value: money(r.totals.fees) },
          { label: 'Effective rate', value: pct(r.totals.effectiveFeeRate) },
        ]),
    totalOverride: (r) => (r.chargeAmount != null ? r.chargeAmount : r.totals.net),
    totalLabel: (r) => (r.chargeAmount != null ? 'Invoice this' : 'You receive'),
  },

  'charge-to-receive': {
    run: (input) => calculateChargeToReceive(input, rates.processors),
    headlineLabel: 'Charge this amount',
    headline: (r) => money(r.chargeAmount),
    stats: (r) => [
      { label: 'Fee', value: money(r.fee) },
      { label: 'You receive', value: money(r.actualNet) },
    ],
    // Net is not the meaningful total here — the charge amount is.
    totalOverride: (r) => r.chargeAmount,
    totalLabel: 'Invoice this',
  },

  'freelance-hourly-rate': {
    run: (input) => calculateHourlyRate(input, rates.federal, stateFor(input)),
    headlineLabel: 'Your hourly rate',
    headline: (r) => `${money(r.hourlyRate)}/hr`,
    stats: (r) => [
      { label: 'Day rate', value: money(r.dayRate) },
      { label: 'Week', value: money(r.weekRate) },
      { label: 'Billable hrs', value: r.billableHours ? String(Math.round(r.billableHours)) : '—' },
    ],
    totalOverride: (r) => r.hourlyRate,
    totalLabel: 'Hourly rate',
  },

  'day-rate': {
    run: (input) => calculateDayRate(input, rates.federal, stateFor(input)),
    headlineLabel: 'Your day rate',
    headline: (r) => money(r.dayRate ?? r.totals.net),
    stats: (r) => [
      { label: 'Hourly', value: money(r.hourlyRate) },
      { label: 'Week', value: money(r.weekRate) },
    ],
  },

  'self-employment-tax': {
    run: (input) => calculateSelfEmploymentTax(input, rates.federal, stateFor(input)),
    headlineLabel: 'Total tax owed',
    headline: (r) => money(r.totalTax),
    stats: (r) => [
      { label: 'SE tax', value: money(r.se?.total) },
      { label: 'Per quarter', value: money(r.quarterly?.perQuarter) },
      { label: 'Effective rate', value: pct(r.effectiveTaxRate) },
    ],
    totalOverride: (r) => -Math.abs(r.totalTax ?? 0),
    totalLabel: 'Total tax owed',
    extraRender: (r) => renderQuarterly(r.quarterly),
  },

  'invoice-take-home': {
    run: (input) => calculateInvoiceTakeHome(input, rates.federal, stateFor(input), rates.processors),
    headlineLabel: 'You keep',
    headline: (r) => money(r.takeHome),
    stats: (r) => [
      { label: 'Set aside', value: money(r.invoiceTax) },
      { label: 'Marginal rate', value: pct(r.marginalRate) },
    ],
    totalOverride: (r) => r.takeHome,
    totalLabel: 'You keep',
  },

  paycheck: {
    run: (input) => calculatePaycheck(input, rates.federal, stateFor(input)),
    headlineLabel: 'Take-home pay',
    headline: (r) => money(r.totals.net),
    stats: (r) => [
      { label: 'Per year', value: money(r.annual?.takeHome) },
      { label: 'Tax rate', value: pct(r.effectiveTaxRate) },
      { label: 'Frequency', value: r.payFrequencyLabel ?? '—' },
    ],
  },

  'margin-markup': {
    run: (input) => calculateMargin(input),
    headlineLabel: 'Profit per unit',
    headline: (r) => money(r.profit),
    stats: (r) => [
      { label: 'Margin', value: pct(r.margin) },
      { label: 'Markup', value: pct(r.markup) },
      { label: 'Price', value: money(r.price) },
    ],
    totalOverride: (r) => r.profit,
    totalLabel: 'Profit per unit',
  },
};

/* ------------------------------------------------------- extra renderers -- */

function renderComparison(rows, { columns, bestKey }) {
  if (!rows?.length) return '';
  const best = rows.reduce((a, b) => (b[bestKey] > a[bestKey] ? b : a));

  const head = columns.map((c) => `<th scope="col">${c.label}</th>`).join('');
  const body = rows
    .map((row, i) => {
      const cells = columns
        .map((c) => {
          const v = c.format ? c.format(row) : row[c.key];
          return `<td>${v}</td>`;
        })
        .join('');
      return `<tr${row === best ? ' data-best' : ''}><td class="rank">${i + 1}</td>${cells}</tr>`;
    })
    .join('');

  return `<div class="table-scroll"><table class="compare-table">
  <caption class="visually-hidden">Net payout by platform, best first</caption>
  <thead><tr><th scope="col"><span class="visually-hidden">Rank</span></th>${head}</tr></thead>
  <tbody>${body}</tbody>
</table></div>`;
}

function renderQuarterly(q) {
  if (!q?.payments?.length) return '';
  const rows = q.payments
    .map(
      (p) => `<tr>
    <td>Q${p.quarter}</td><td>${p.period}</td>
    <td>${new Date(`${p.due}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</td>
    <td>${usd(p.amount)}</td>
  </tr>`
    )
    .join('');

  return `<div class="quarterly">
  <h3>Your quarterly payment schedule</h3>
  <p class="callout callout--note">${q.explanation}</p>
  <div class="table-scroll"><table class="compare-table">
    <thead><tr><th scope="col">Quarter</th><th scope="col">Income period</th><th scope="col">Payment due</th><th scope="col">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3"><strong>Total for the year</strong></td><td><strong>${usd(q.remaining)}</strong></td></tr></tfoot>
  </table></div>
</div>`;
}

export { rates };
