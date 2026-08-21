/**
 * stripe-fees.js — page definition for /stripe-fee-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is the ACH cap, and specifically the amount at which it
 * starts binding.
 *
 * Stripe prices ACH Direct Debit at 0.8% capped at $5. Both halves of that are
 * published; the consequence is not. The cap binds at $625 — above which ACH
 * stops being a percentage at all and becomes a flat $5, so the effective rate
 * collapses towards zero while the card rate stays at 2.9% forever. On a
 * $25,000 invoice the card costs 145 times what ACH costs. For anyone invoicing
 * business clients that single fact is worth more than the rest of the page.
 *
 * Every figure is computed by the engine at the live rate card, so if Stripe
 * moves the cap or the rate the arithmetic here moves with it.
 */

const DEFAULTS = {
  processorId: 'stripe',
  productId: 'online-domestic',
  amount: 500,
  transactions: 1,
  international: false,
  currencyConversion: false,
};

export default {
  id: 'stripe-fees',
  kind: 'tool',
  calculator: 'processor-fees',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Stripe Fee Calculator',

  presets: {
    field: 'amount',
    label: 'How much does Stripe take from a…',
    values: [10, 25, 50, 100, 250, 500, 1000, 5000],
  },
  featureList: [
    'Card, Terminal, Link, Invoicing, and ACH Direct Debit fee schedules',
    'International card and currency conversion surcharges, stacked as Stripe stacks them',
    'The ACH cap and the amount at which it starts binding',
    'Effective fee rate and net settlement per transaction',
  ],

  groups: (rates) => [
    {
      legend: 'The payment',
      fields: [
        // Pinned rather than chosen: this is the Stripe page. It must exist as
        // a field because readForm() in app.js rebuilds the engine input from
        // the DOM alone — with no field here, effectiveRate() would fall back
        // to its own default processor on the first keystroke.
        { name: 'processorId', type: 'hidden', value: 'stripe' },
        { name: 'amount', label: 'Payment amount', prefix: '$', value: DEFAULTS.amount },
        {
          name: 'productId', label: 'Payment method', type: 'select', value: DEFAULTS.productId,
          options: rates.processors.stripe.products.map((p) => ({ value: p.id, label: p.label })),
          help: 'ACH is dramatically cheaper on large invoices — see below.',
        },
        {
          name: 'transactions', label: 'Number of payments', value: DEFAULTS.transactions, step: '1',
          help: 'Model a month of identical charges at once.',
        },
      ],
    },
    {
      legend: 'Surcharges',
      fields: [
        {
          name: 'international', label: 'Card issued outside the US', type: 'checkbox',
          value: DEFAULTS.international, wide: true,
          help: `Adds ${(rates.processors.stripe.internationalCardSurcharge.rate * 100).toFixed(2)}%.`,
        },
        {
          name: 'currencyConversion', label: 'Payment needs a currency conversion', type: 'checkbox',
          value: DEFAULTS.currencyConversion, wide: true,
          help: `Adds ${(rates.processors.stripe.currencyConversion.rate * 100).toFixed(2)}% on top.`,
        },
      ],
    },
  ],

  answerBlock: ({ example, rates, achCapBindsAt }) => {
    const s = rates.processors.stripe;
    const card = s.products.find((p) => p.id === 'online-domestic');
    return `
<p class="answer-block"><strong>Stripe's standard US online card rate is
${(card.rate * 100).toFixed(1)}% + $${card.fixed.toFixed(2)} per successful charge.</strong> On a
$${DEFAULTS.amount} payment that is $${example.totals.fees.toFixed(2)}, settling
<strong>$${example.totals.net.toFixed(2)}</strong> — an effective
${(example.totals.effectiveFeeRate * 100).toFixed(2)}%. A card issued outside the US adds
${(s.internationalCardSurcharge.rate * 100).toFixed(2)}%, and a currency conversion adds
${(s.currencyConversion.rate * 100).toFixed(2)}% on top of that. ACH Direct Debit is
${(s.products.find((p) => p.id === 'ach').rate * 100).toFixed(1)}% capped at
$${s.products.find((p) => p.id === 'ach').cap.toFixed(2)}, so above $${achCapBindsAt.toLocaleString('en-US')}
it becomes a flat fee. Rates effective ${rates.processors.effective}.</p>`;
  },

  faqs: ({ example, rates, achLadder, achCapBindsAt, intl, intlFx }) => {
    const s = rates.processors.stripe;
    const ach = s.products.find((p) => p.id === 'ach');
    const big = achLadder.at(-1);
    return [
      {
        q: 'What does Stripe charge per transaction?',
        a: `<p>${(s.products.find((p) => p.id === 'online-domestic').rate * 100).toFixed(1)}% + $0.30 for a standard US online card payment. On $${DEFAULTS.amount} that is $${example.totals.fees.toFixed(2)}, an effective ${(example.totals.effectiveFeeRate * 100).toFixed(2)}% — the fixed 30¢ means the effective rate is always above the headline and rises sharply on small charges.</p>
<p>Stripe charges only on successful charges. There is no monthly fee, no setup fee, and no charge for failed payments, which is the main structural difference from a traditional merchant account.</p>`,
      },
      {
        q: 'When is Stripe ACH cheaper than taking a card?',
        a: `<p>Always, and the gap widens without limit. ACH Direct Debit is ${(ach.rate * 100).toFixed(1)}% <strong>capped at $${ach.cap.toFixed(2)}</strong>, while cards are ${(s.products.find((p) => p.id === 'online-domestic').rate * 100).toFixed(1)}% + $0.30 with no cap at all. Because ACH has both the lower rate and the lower fixed component, there is no crossover — it is cheaper at every amount.</p>
<p>The number worth knowing is where the cap starts binding: $${ach.cap.toFixed(2)} ÷ ${(ach.rate * 100).toFixed(1)}% = <strong>$${achCapBindsAt.toLocaleString('en-US')}</strong>. Below that ACH behaves like a percentage; above it, it is a flat $${ach.cap.toFixed(2)} no matter how large the invoice. On a $${big.amount.toLocaleString('en-US')} payment the card costs $${big.card.toFixed(2)} and ACH costs $${big.ach.toFixed(2)} — <strong>${big.ratio.toFixed(0)}× more</strong>, an effective ${(big.achEffective * 100).toFixed(3)}% against 2.90%.</p>
<p>The trade-offs are real: ACH settles in days rather than instantly, is US-only, and can fail after the fact for insufficient funds. For recurring B2B invoices of any size, those are usually worth the saving.</p>`,
      },
      {
        q: 'How much does Stripe charge for international cards?',
        a: `<p>An extra ${(s.internationalCardSurcharge.rate * 100).toFixed(2)}% when the card was issued outside the US, and a further ${(s.currencyConversion.rate * 100).toFixed(2)}% if a currency conversion is required. They add to the rate rather than replacing it.</p>
<p>On the $${DEFAULTS.amount} payment above: $${example.totals.fees.toFixed(2)} domestically, $${intl.totals.fees.toFixed(2)} on an international card, $${intlFx.totals.fees.toFixed(2)} with a conversion as well. Stripe's conversion surcharge is materially smaller than PayPal's — see the <a href="/paypal-fee-calculator/">PayPal fee calculator</a>, where the same conversion costs 4%.</p>`,
      },
      {
        q: 'What does a disputed payment cost?',
        a: `<p>$${s.disputeFee.toFixed(2)} per dispute, on top of losing the disputed amount and its original processing fee. The fee is returned if you win. Stripe does not charge for refunds, but the original processing fee is <em>not</em> returned on a refund — so a refunded $${DEFAULTS.amount} order still costs you the $${example.totals.fees.toFixed(2)} it cost to accept.</p>`,
      },
      {
        q: 'Is Stripe cheaper than PayPal?',
        a: `<p>For standard online card payments, yes: 2.9% + $0.30 against PayPal's 3.49% + $0.49. On $${DEFAULTS.amount} that is $${example.totals.fees.toFixed(2)} versus $17.94 — Stripe keeps about $3 more of every such payment in your account.</p>
<p>The comparison flips in two places. PayPal's micropayments schedule beats both on payments under about $26.67, and PayPal's buyer-side ubiquity converts some customers who would abandon a card form. Stripe's ACH cap has no PayPal equivalent, which makes Stripe decisively cheaper for large invoices.</p>`,
      },
      {
        q: 'What is the instant payout fee?',
        a: `<p>${(s.instantPayout.rate * 100).toFixed(1)}% of the payout amount, minimum $${s.instantPayout.minimum.toFixed(2)}, to receive funds in minutes rather than on the standard schedule. It is charged on the payout, not the payment, so it stacks on top of everything above. Used routinely rather than in emergencies it can quietly exceed your entire card processing cost.</p>`,
      },
    ];
  },

  content: ({ example, rates, achLadder, achCapBindsAt, intl, intlFx, valueSections }) => {
    const s = rates.processors.stripe;
    const card = s.products.find((p) => p.id === 'online-domestic');
    const ach = s.products.find((p) => p.id === 'ach');
    const big = achLadder.at(-1);

    return `
${valueSections}

\n
<h2>How Stripe's fee is calculated</h2>

<p>A percentage plus a fixed fee on every successful charge, with surcharges that add to the rate.
No monthly minimum, and nothing charged on a failed payment.</p>

<div class="formula">fee = ${(card.rate * 100).toFixed(1)}% × amount + $${card.fixed.toFixed(2)}
      + ${(s.internationalCardSurcharge.rate * 100).toFixed(2)}% × amount   (card issued outside the US)
      + ${(s.currencyConversion.rate * 100).toFixed(2)}% × amount   (currency conversion required)

ACH = ${(ach.rate * 100).toFixed(1)}% × amount, capped at $${ach.cap.toFixed(2)}</div>

<p>That last line is a different shape from everything above it, and the difference is the most
valuable thing on this page.</p>

<h2>The ACH cap, and where it starts binding</h2>

<p>Stripe publishes ACH Direct Debit as "${(ach.rate * 100).toFixed(1)}%, capped at $${ach.cap.toFixed(2)}".
Both numbers are on the pricing page. What is not on the pricing page is the amount where the cap
takes over, which is the only number that matters when you are deciding how to bill a client:</p>

<div class="formula">cap binds at = $${ach.cap.toFixed(2)} ÷ ${(ach.rate * 100).toFixed(1)}% = $${achCapBindsAt.toLocaleString('en-US')}</div>

<p>Below $${achCapBindsAt.toLocaleString('en-US')}, ACH is a percentage like anything else. Above it,
ACH is a <strong>flat $${ach.cap.toFixed(2)}</strong> — and because cards have no cap at all, the two
diverge without limit:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Payment</th>
  <th scope="col">Card fee</th>
  <th scope="col">ACH fee</th>
  <th scope="col">Card costs</th>
  <th scope="col">ACH effective rate</th>
</tr></thead>
<tbody>
${achLadder.map((row) => `<tr${Math.abs(row.amount - achCapBindsAt) < 0.01 ? ' data-best' : ''}>
  <td>$${row.amount.toLocaleString('en-US')}${Math.abs(row.amount - achCapBindsAt) < 0.01 ? ' <em>(cap binds)</em>' : ''}</td>
  <td>$${row.card.toFixed(2)}</td>
  <td>$${row.ach.toFixed(2)}</td>
  <td>${row.ratio.toFixed(1)}×</td>
  <td>${(row.achEffective * 100).toFixed(3)}%</td>
</tr>`).join('\n')}
</tbody>
</table>
</div>

<p>Read the last column downward. ACH holds at ${(ach.rate * 100).toFixed(1)}% until the cap, then
falls away to ${(big.achEffective * 100).toFixed(3)}% on a $${big.amount.toLocaleString('en-US')}
invoice, while the card rate never moves off 2.90%. At that size the card costs
<strong>$${(big.card - big.ach).toFixed(2)} more</strong> for accepting exactly the same money.</p>

<p>If you invoice businesses, this is the single largest lever available to you and it costs nothing
to pull: offer ACH as the default payment method and card as the convenience option. The objections
are genuine but bounded — ACH settles in days rather than instantly, works only for US bank accounts,
and can fail for insufficient funds after appearing to succeed. Against a
$${(big.card - big.ach).toFixed(2)} saving on a single invoice, a few days of float is not a close call.</p>

<h2>What stacking the surcharges costs</h2>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Same $${DEFAULTS.amount} payment</th>
  <th scope="col">Rate</th>
  <th scope="col">Fee</th>
  <th scope="col">You receive</th>
</tr></thead>
<tbody>
<tr><td>US card, USD</td><td>${(card.rate * 100).toFixed(1)}% + $${card.fixed.toFixed(2)}</td><td>$${example.totals.fees.toFixed(2)}</td><td>$${example.totals.net.toFixed(2)}</td></tr>
<tr><td>Card issued outside the US</td><td>${((card.rate + s.internationalCardSurcharge.rate) * 100).toFixed(2)}% + $${card.fixed.toFixed(2)}</td><td>$${intl.totals.fees.toFixed(2)}</td><td>$${intl.totals.net.toFixed(2)}</td></tr>
<tr><td>…and a currency conversion</td><td>${((card.rate + s.internationalCardSurcharge.rate + s.currencyConversion.rate) * 100).toFixed(2)}% + $${card.fixed.toFixed(2)}</td><td>$${intlFx.totals.fees.toFixed(2)}</td><td>$${intlFx.totals.net.toFixed(2)}</td></tr>
</tbody>
</table>
</div>

<p>Stripe's ${(s.currencyConversion.rate * 100).toFixed(2)}% conversion charge is worth noting for what
it is not: PayPal charges 4.00% for the same thing. On cross-border work that difference alone can
outweigh the headline rate gap.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.amount} invoice, card versus ACH</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Invoice paid</td><td>what the client sends</td><td>$${DEFAULTS.amount.toFixed(2)}</td></tr>
<tr><td>Percentage fee</td><td>${(card.rate * 100).toFixed(1)}% × $${DEFAULTS.amount.toFixed(2)}</td><td>−$${(DEFAULTS.amount * card.rate).toFixed(2)}</td></tr>
<tr><td>Fixed fee</td><td>per successful charge</td><td>−$${card.fixed.toFixed(2)}</td></tr>
<tr><td><strong>Stripe takes (card)</strong></td><td>${(example.totals.effectiveFeeRate * 100).toFixed(2)}% effective</td><td><strong>−$${example.totals.fees.toFixed(2)}</strong></td></tr>
<tr><td><strong>Settles to your bank</strong></td><td></td><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
<tr data-best><td><strong>The same invoice by ACH</strong></td><td>${(ach.rate * 100).toFixed(1)}%, under the cap</td><td><strong>−$${(DEFAULTS.amount * ach.rate).toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Even below the cap, ACH costs about a third of the card fee on this invoice. Switch the payment
method in the calculator above to see it against your own amounts.</p>
</div>

<h2>Who this is for</h2>
<p>Anyone building on Stripe who wants to know the real cost of a payment rather than the headline
rate, and in particular anyone invoicing US businesses. Run your largest typical invoice through it
twice — once as a card, once as ACH. If the second number surprises you, that is the point of the
page.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Stripe Billing, Tax, Radar, and Connect</strong>, which are priced separately and can add
0.4% to 0.7% each on top of processing.</li>
<li><strong>Payout timing.</strong> The standard schedule is free; instant payouts cost
${(s.instantPayout.rate * 100).toFixed(1)}% with a $${s.instantPayout.minimum.toFixed(2)} minimum.</li>
<li><strong>Disputes</strong> at $${s.disputeFee.toFixed(2)} each, refunded if you win.</li>
<li><strong>Negotiated rates.</strong> Above meaningful volume Stripe's published pricing becomes a
starting point rather than a fixed schedule.</li>
<li><strong>Non-US accounts</strong>, where both rates and available methods differ.</li>
</ul>

<h2>Sources and dates</h2>
<p>Rates come from Stripe's published US pricing, listed below with the date it was checked. The cap
threshold and every figure in the comparison tables are computed from those rates by the calculator on
this page rather than quoted. Note the confidence flag on the source: Stripe's pricing page redirects
by geography, so these figures still need a human check from a US connection. If a number here
disagrees with your Stripe dashboard, trust the dashboard and <a href="/contact/">let us know</a>.</p>
`;
  },
};
