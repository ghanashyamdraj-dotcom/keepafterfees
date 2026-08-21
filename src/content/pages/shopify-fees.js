/**
 * shopify-fees.js — page definition for /shopify-fee-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that the plan upgrade question has a clean closed
 * form, and everyone answers it with the wrong variable.
 *
 * Shopify sells plans on monthly price; the thing that decides the choice is
 * that a dearer plan buys a lower processing rate. Two plans cost the same when
 * the rate saving covers the extra subscription:
 *
 *   x = (monthly fee difference) / (processing rate difference)
 *
 * x is monthly card REVENUE. Order count and average order value do not appear
 * in it — which is precisely why every "upgrade at N orders a month" rule of
 * thumb is wrong for anyone whose basket differs from the one it was computed
 * at. Basic to Grow is $25,000/month of revenue whether that is 1,000 orders of
 * $25 or 100 orders of $250. planCrossovers() in shopify.js derives it, and the
 * engine test checks it against a brute-force search of the plan comparison.
 */

const DEFAULTS = {
  orderValue: 60,
  productCost: 22,
  shippingCharged: 0,
  shippingCost: 6,
  plan: 'basic',
  annualBilling: true,
  channel: 'online',
  thirdPartyGateway: false,
  gatewayRate: 2.9,
  gatewayFixed: 0.3,
  internationalCard: false,
  currencyConversion: false,
  amortisePlan: true,
  monthlyOrders: 300,
  appCosts: 0,
};

export default {
  id: 'shopify-fees',
  kind: 'tool',
  calculator: 'shopify-fees',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Shopify Fee Calculator',

  presets: {
    field: 'orderValue',
    label: 'On an order of…',
    values: [25, 50, 100, 250, 500],
  },
  featureList: [
    'Every plan tier compared at your own order value and volume',
    'Shopify Payments rates by plan and channel, online and in person',
    "Shopify's third-party gateway penalty, and when a cheaper gateway still loses",
    'The monthly revenue at which each plan upgrade pays for itself',
  ],

  groups: (rates) => [
    {
      legend: 'The order',
      fields: [
        { name: 'orderValue', label: 'Order value', prefix: '$', value: DEFAULTS.orderValue },
        { name: 'shippingCharged', label: 'Shipping charged', prefix: '$', value: DEFAULTS.shippingCharged },
        { name: 'productCost', label: 'Cost of goods', prefix: '$', value: DEFAULTS.productCost },
        { name: 'shippingCost', label: 'Shipping actually costs', prefix: '$', value: DEFAULTS.shippingCost },
      ],
    },
    {
      legend: 'Your plan',
      fields: [
        {
          name: 'plan', label: 'Shopify plan', type: 'select', value: DEFAULTS.plan,
          options: rates.shopify.plans.map((p) => ({ value: p.id, label: p.label })),
        },
        { name: 'annualBilling', label: 'Billed annually (cheaper)', type: 'checkbox', value: DEFAULTS.annualBilling, wide: true },
        {
          name: 'channel', label: 'Sales channel', type: 'select', value: DEFAULTS.channel,
          options: [
            { value: 'online', label: 'Online store' },
            { value: 'inPerson', label: 'In person (POS)' },
          ],
        },
        { name: 'monthlyOrders', label: 'Orders per month', value: DEFAULTS.monthlyOrders, step: '1', help: 'Drives the plan comparison below.' },
        { name: 'appCosts', label: 'App subscriptions per month', prefix: '$', value: DEFAULTS.appCosts },
        { name: 'amortisePlan', label: 'Spread plan and app costs per order', type: 'checkbox', value: DEFAULTS.amortisePlan, wide: true },
      ],
    },
    {
      legend: 'Payment processing',
      fields: [
        {
          name: 'thirdPartyGateway', label: 'Using a third-party gateway', type: 'checkbox',
          value: DEFAULTS.thirdPartyGateway, wide: true,
          help: 'Shopify adds a penalty on top of whatever the gateway charges.',
        },
        { name: 'gatewayRate', label: 'Gateway rate', suffix: '%', value: DEFAULTS.gatewayRate },
        { name: 'gatewayFixed', label: 'Gateway fixed fee', prefix: '$', value: DEFAULTS.gatewayFixed },
        { name: 'internationalCard', label: 'International card', type: 'checkbox', value: DEFAULTS.internationalCard, wide: true },
        { name: 'currencyConversion', label: 'Currency conversion', type: 'checkbox', value: DEFAULTS.currencyConversion, wide: true },
      ],
    },
  ],

  answerBlock: ({ example, crossovers, rates }) => {
    const basic = rates.shopify.plans[0];
    const first = crossovers[0];
    return `
<p class="answer-block"><strong>On the ${basic.label} plan, Shopify Payments takes
${(basic.online.rate * 100).toFixed(1)}% + $${basic.online.fixed.toFixed(2)} of each online order,
on top of the $${basic.monthlyAnnual}/month subscription.</strong> On a $${DEFAULTS.orderValue} order
that is $${example.processingFee.toFixed(2)} of processing and
$${example.totalPlatformCost.toFixed(2)} of total platform cost, leaving
<strong>$${example.totals.net.toFixed(2)}</strong> after $${DEFAULTS.productCost} of goods and
$${DEFAULTS.shippingCost} of shipping. Upgrading from ${first.fromLabel} to ${first.toLabel} pays for
itself at <strong>$${first.monthlyRevenue.toLocaleString('en-US')} a month</strong> of card revenue —
a revenue threshold, not an order count. Rates effective ${rates.shopify.effective}.</p>`;
  },

  faqs: ({ example, plans, crossovers, viaGateway, rates }) => {
    const cheapest = plans.reduce((a, b) => (b.monthlyTotal < a.monthlyTotal ? b : a));
    return [
      {
        q: 'When should I upgrade my Shopify plan?',
        a: `<p>When your monthly card revenue passes the point where the lower processing rate covers the higher subscription. That is a single division, and it does not depend on how many orders you take:</p>
<ul>
${crossovers.filter((c) => c.monthlyRevenue).map((c) => `<li><strong>${c.fromLabel} → ${c.toLabel}</strong> at $${c.monthlyRevenue.toLocaleString('en-US')} a month — $${c.feeGap.toLocaleString('en-US')} more subscription buys ${(c.rateGap * 100).toFixed(2)}% off processing</li>`).join('\n')}
</ul>
<p>Note what is missing from that list: order counts. A threshold of $${crossovers[0].monthlyRevenue.toLocaleString('en-US')} is ${Math.round(crossovers[0].monthlyRevenue / 25).toLocaleString('en-US')} orders at a $25 basket and ${Math.round(crossovers[0].monthlyRevenue / 250).toLocaleString('en-US')} at a $250 basket. Any advice phrased as "upgrade at N orders a month" is only right for the basket size it was worked out at.</p>`,
      },
      {
        q: 'Which plan is cheapest for me right now?',
        a: `<p>At ${DEFAULTS.monthlyOrders} orders a month of $${DEFAULTS.orderValue}, that is $${(DEFAULTS.orderValue * DEFAULTS.monthlyOrders).toLocaleString('en-US')} of monthly revenue, and the cheapest plan is <strong>${cheapest.label}</strong> at $${cheapest.monthlyTotal.toLocaleString('en-US')} a month all in. The full comparison:</p>
<ul>
${plans.map((p) => `<li>${p.label} — $${p.planMonthly}/mo subscription + $${(p.perOrderFees * DEFAULTS.monthlyOrders).toFixed(2)} of fees = <strong>$${p.monthlyTotal.toLocaleString('en-US')}</strong></li>`).join('\n')}
</ul>
<p>Change the order value and monthly orders in the calculator and the table above it re-ranks live.</p>`,
      },
      {
        q: 'Is a third-party payment gateway ever worth it?',
        a: `<p>Rarely, and the reason is the penalty rather than the gateway. Shopify charges an extra ${(rates.shopify.plans[0].thirdPartyGatewayRate * 100).toFixed(2)}% on the Basic plan for every order that does not go through Shopify Payments — which is larger than the entire spread between most gateways' rates.</p>
<p>On the $${DEFAULTS.orderValue} order in this example, Shopify Payments costs $${example.processingFee.toFixed(2)} while a ${DEFAULTS.gatewayRate}% + $${DEFAULTS.gatewayFixed} gateway costs $${viaGateway.processingFee.toFixed(2)} <em>plus</em> $${viaGateway.shopifyTransactionFee.toFixed(2)} of penalty — $${(viaGateway.processingFee + viaGateway.shopifyTransactionFee).toFixed(2)} in total. The penalty falls on higher plans (${rates.shopify.plans.map((p) => `${p.label} ${(p.thirdPartyGatewayRate * 100).toFixed(2)}%`).join(', ')}), so the calculation is worth redoing if you move up.</p>
<p>The cases where it still makes sense are where Shopify Payments is not an option at all: an unsupported country, a prohibited product category, or an existing merchant account with negotiated rates well below the published card rate.</p>`,
      },
      {
        q: 'Does Shopify charge a transaction fee on top of the card rate?',
        a: `<p>Only if you do not use Shopify Payments. With Shopify Payments there is no extra transaction fee — just the card rate. With any other gateway, Shopify adds its own percentage on top of what the gateway charges, and that fee is levied on the full order total including shipping and tax.</p>`,
      },
      {
        q: 'Is annual billing worth it?',
        a: `<p>On the current rate card, yes — every plan is cheaper billed annually. ${rates.shopify.plans.map((p) => `${p.label} is $${p.monthlyAnnual} annually against $${p.monthlyMonthly} monthly`).join('; ')}. On Basic that is $${((rates.shopify.plans[0].monthlyMonthly - rates.shopify.plans[0].monthlyAnnual) * 12).toFixed(0)} a year for committing twelve months up front.</p>
<p>The catch is ordinary: you are paying a year ahead for a platform you may want to leave. For an established store the discount is close to free money; for a store in its first three months it is a bet.</p>`,
      },
      {
        q: 'What is my real cost per order?',
        a: `<p>On this example, $${example.totalPlatformCost.toFixed(2)} — $${example.processingFee.toFixed(2)} of card processing plus the amortised subscription. That is ${((example.totalPlatformCost / (DEFAULTS.orderValue + DEFAULTS.shippingCharged)) * 100).toFixed(1)}% of the order, against a headline processing rate of ${(rates.shopify.plans[0].online.rate * 100).toFixed(1)}%.</p>
<p>Amortising the subscription across orders is what makes low-volume stores expensive: at 20 orders a month the Basic subscription alone is $${(rates.shopify.plans[0].monthlyAnnual / 20).toFixed(2)} per order, which can exceed the card fee entirely.</p>`,
      },
    ];
  },

  content: ({ example, rates, plans, crossovers, viaGateway }) => {
    const basic = rates.shopify.plans[0];
    const cheapest = plans.reduce((a, b) => (b.monthlyTotal < a.monthlyTotal ? b : a));
    const monthlyRevenue = DEFAULTS.orderValue * DEFAULTS.monthlyOrders;

    return `
<h2>How Shopify's costs are calculated</h2>

<p>Two costs that behave completely differently. A fixed monthly subscription that does not care how
much you sell, and a percentage of every order that does. Which one dominates depends entirely on your
volume, and that is the whole plan question.</p>

<div class="formula">processing   = plan card rate × (order + shipping) + $${basic.online.fixed.toFixed(2)}
gateway fee  = ${(basic.thirdPartyGatewayRate * 100).toFixed(2)}% × order total    (only if NOT using Shopify Payments)
plan cost    = monthly subscription ÷ orders per month   (when amortised)
total        = processing + gateway fee + amortised plan + apps</div>

<h2>The upgrade threshold is a revenue number, not an order count</h2>

<p>Shopify's plans differ in two things at once: the subscription goes up and the processing rate goes
down. So a dearer plan is cheaper once you process enough revenue for the rate saving to cover the
extra subscription. Setting the two total costs equal:</p>

<div class="formula">feeA + rateA × revenue = feeB + rateB × revenue

revenue = (feeB − feeA) ÷ (rateA − rateB)</div>

<p>The per-order fixed fee is identical across plans, so it cancels and drops out. What is left is a
monthly revenue threshold — and notice that neither order count nor average order value appears in it:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Upgrade</th>
  <th scope="col">Extra subscription</th>
  <th scope="col">Rate saving</th>
  <th scope="col">Pays for itself at</th>
</tr></thead>
<tbody>
${crossovers.filter((c) => c.monthlyRevenue).map((c) => `<tr>
  <td>${c.fromLabel} → ${c.toLabel}</td>
  <td>$${c.feeGap.toLocaleString('en-US')}/mo</td>
  <td>${(c.rateGap * 100).toFixed(2)}%</td>
  <td><strong>$${c.monthlyRevenue.toLocaleString('en-US')}/mo</strong></td>
</tr>`).join('\n')}
</tbody>
</table>
</div>

<p>This is why "upgrade to Grow at 400 orders a month" is bad advice rather than merely rough. It is
true at a $60 basket and wrong everywhere else. The same
$${crossovers[0].monthlyRevenue.toLocaleString('en-US')} threshold is
${Math.round(crossovers[0].monthlyRevenue / 25).toLocaleString('en-US')} orders at $25,
${Math.round(crossovers[0].monthlyRevenue / 60).toLocaleString('en-US')} at $60, and
${Math.round(crossovers[0].monthlyRevenue / 250).toLocaleString('en-US')} at $250. Work in revenue and
the answer stops moving.</p>

<p>At your current inputs — ${DEFAULTS.monthlyOrders} orders of $${DEFAULTS.orderValue}, so
$${monthlyRevenue.toLocaleString('en-US')} a month — the cheapest plan is
<strong>${cheapest.label}</strong> at $${cheapest.monthlyTotal.toLocaleString('en-US')} all in. The
ranked comparison sits above the fold with the calculator and re-ranks as you type.</p>

<h2>The third-party gateway penalty</h2>

<p>Shopify charges an extra percentage on every order that does not go through Shopify Payments. It is
levied on the full order total, and on ${basic.label} it is
${(basic.thirdPartyGatewayRate * 100).toFixed(2)}% — larger than the entire spread between most
gateways' published rates, which is what makes switching almost always a loss.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">$${DEFAULTS.orderValue} order on ${basic.label}</th><th scope="col">Processing</th><th scope="col">Shopify penalty</th><th scope="col">Total</th></tr></thead>
<tbody>
<tr data-best><td>Shopify Payments</td><td>$${example.processingFee.toFixed(2)}</td><td>$0.00</td><td><strong>$${example.processingFee.toFixed(2)}</strong></td></tr>
<tr><td>${DEFAULTS.gatewayRate}% + $${DEFAULTS.gatewayFixed} gateway</td><td>$${viaGateway.processingFee.toFixed(2)}</td><td>$${viaGateway.shopifyTransactionFee.toFixed(2)}</td><td>$${(viaGateway.processingFee + viaGateway.shopifyTransactionFee).toFixed(2)}</td></tr>
</tbody>
</table>
</div>

<p>A gateway matching Shopify's own rate exactly still costs
$${(viaGateway.processingFee + viaGateway.shopifyTransactionFee - example.processingFee).toFixed(2)}
more per order, because the penalty is pure addition. The penalty does fall on higher plans —
${rates.shopify.plans.map((p) => `${p.label} ${(p.thirdPartyGatewayRate * 100).toFixed(2)}%`).join(', ')} —
so a store on Plus with a negotiated merchant account is in a genuinely different position from a
store on Basic.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.orderValue} order on ${basic.label}, ${DEFAULTS.monthlyOrders} orders a month</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
${example.lines.filter((l) => l.kind !== 'info' && l.amount !== 0).map((l) => `<tr><td>${l.label}</td><td>${l.detail ?? ''}</td><td>${l.amount < 0 ? '−' : ''}$${Math.abs(l.amount).toFixed(2)}</td></tr>`).join('\n')}
<tr><td><strong>Your profit</strong></td><td>${(example.totals.margin * 100).toFixed(1)}% margin</td><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Platform cost is $${example.totalPlatformCost.toFixed(2)} of the
$${(DEFAULTS.orderValue + DEFAULTS.shippingCharged).toFixed(2)} order —
${((example.totalPlatformCost / (DEFAULTS.orderValue + DEFAULTS.shippingCharged)) * 100).toFixed(1)}%,
against a headline card rate of ${(basic.online.rate * 100).toFixed(1)}%. The gap is the amortised
subscription, and it is why low-volume stores are so much more expensive per order than the pricing
page suggests: at 20 orders a month the ${basic.label} subscription alone works out at
$${(basic.monthlyAnnual / 20).toFixed(2)} per order.</p>
</div>

<h2>Who this is for</h2>
<p>Store owners deciding whether to upgrade a plan, whether to keep Shopify Payments, and what an
order actually earns after everything. It is most useful entered with your real average order value
and your real monthly order count, then read as a revenue figure — the plan table is the answer, and
it is usually not the plan people assume.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Shipping labels bought through Shopify</strong>, which carry their own discounted rates.</li>
<li><strong>Chargebacks</strong>, which cost the disputed amount plus a fee.</li>
<li><strong>Sales tax and duties</strong> — collected and remitted, never yours, but processed.</li>
<li><strong>Shopify Plus terms.</strong> Plus is quoted from $2,300/month but is negotiated, so real
Plus pricing is frequently not the published figure.</li>
<li><strong>Apps.</strong> The field above amortises a monthly total, but app costs are the most
underestimated line in most Shopify P&Ls.</li>
<li><strong>Your time</strong>, and the cost of migrating a store between plans or gateways.</li>
</ul>

<h2>Sources and dates</h2>
<p>Plan prices, card rates by plan and channel, and the third-party gateway percentages come from
Shopify's published pricing, listed below with the date it was checked. Every crossover figure is
derived from those rates by the formula above rather than quoted — Shopify publishes the inputs and
not the thresholds. If a figure disagrees with your Shopify invoice, trust the invoice and
<a href="/contact/">let us know</a>.</p>
`;
  },
};
