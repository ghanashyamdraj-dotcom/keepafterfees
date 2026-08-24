/**
 * etsy-vs-shopify-fees.js — page definition for /etsy-vs-shopify-fees/
 *
 * Content strategy notes:
 *
 *   - Every article on this query says "it depends on your volume" and then
 *     never says what volume. It is a solvable problem: two cost curves of the
 *     form `fixed + rate x quantity` cross exactly once, and both sides of the
 *     comparison are already modelled by this site's own engines. Saying the
 *     number is the entire reason for this page to exist.
 *
 *   - The genuinely surprising result, and the thing that makes this page
 *     non-commodity: the crossover is a REVENUE figure, not an order count,
 *     and it barely moves. At $10 orders it is around $360 a month; at $250
 *     orders it is around $435; the limit is exactly the plan price divided by
 *     the gap in rates. Every rule of thumb phrased as "once you're doing N
 *     orders a month" is wrong for anyone whose basket differs from the one it
 *     was computed at. The same structural point already appears in
 *     planCrossovers() in src/lib/calc/shopify.js, applied there to Shopify's
 *     own plan ladder; this is the cross-platform version of it.
 *
 *   - The honest counterweight is stated rather than buried: the marketplace's
 *     percentage buys an audience and the subscription buys an empty shop. The
 *     arithmetic prices the audience; it does not tell you whether you can
 *     replace it.
 */

const DEFAULTS = {
  orderValue: 35,
  shippingCharged: 0,
  shippingCost: 0,
  itemCost: 0,
  monthlyOrders: 30,
  matchup: 'etsy-vs-shopify',
  shopifyPlan: 'basic',
};

export default {
  id: 'etsy-vs-shopify-fees',
  kind: 'tool',
  calculator: 'channel-versus',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'Etsy vs Shopify Fee Comparison',
  traitsAt: 35,

  presets: {
    field: 'monthlyOrders',
    label: 'At this many orders a month…',
    format: (v) => `${v}/mo`,
    values: [5, 10, 20, 30, 60, 150],
  },
  featureList: [
    'Monthly cost of selling on Etsy against Shopify at your own order value and volume',
    'Solves the exact number of orders a month at which Shopify becomes the cheaper channel',
    'Shows why that crossover is a revenue figure rather than an order count, and how little it moves',
    'Compares every Shopify plan tier against Etsy, including annual against monthly billing',
  ],

  groups: (rates) => [
    {
      legend: 'Your typical order',
      fields: [
        { name: 'orderValue', label: 'Item price', prefix: '$', value: DEFAULTS.orderValue, help: 'Your average order value, before postage.' },
        { name: 'shippingCharged', label: 'Postage charged', prefix: '$', value: DEFAULTS.shippingCharged, help: 'Both channels charge their percentage on this, so it is not free money on either.' },
        { name: 'shippingCost', label: 'Postage it costs you', prefix: '$', value: DEFAULTS.shippingCost, help: 'Identical on both channels, so it shifts both figures equally and never changes the winner.' },
        { name: 'itemCost', label: 'What the goods cost you', prefix: '$', value: DEFAULTS.itemCost },
      ],
    },
    {
      legend: 'Your volume',
      note: 'This is the field that decides the answer. Everything else moves both channels together.',
      fields: [
        { name: 'monthlyOrders', label: 'Orders a month', value: DEFAULTS.monthlyOrders, step: '1' },
      ],
    },
    {
      legend: 'Shopify plan',
      fields: [
        {
          name: 'shopifyPlan', label: 'Plan', type: 'select', value: DEFAULTS.shopifyPlan,
          options: rates.shopify.plans.map((p) => ({
            value: p.id,
            label: `${p.label} — $${p.monthlyAnnual}/mo billed annually, ${(p.online.rate * 100).toFixed(2)}% + $${p.online.fixed}`,
          })),
          wide: true,
          help: 'A dearer plan buys a lower card rate, which moves the crossover.',
        },
        { name: 'matchup', type: 'hidden', value: DEFAULTS.matchup },
      ],
    },
  ],

  answerBlock: ({ example, crossover, asymptote }) => {
    const etsy = example.rows.find((r) => r.id === 'etsy');
    const shopify = example.rows.find((r) => r.id === 'shopify');
    return `
<p class="answer-block"><strong>On a $${DEFAULTS.orderValue.toFixed(2)} order, Etsy takes
$${etsy.perOrderFees.toFixed(2)} and Shopify takes $${shopify.perOrderFees.toFixed(2)} — but Shopify also
bills $${shopify.monthlyFixed.toFixed(2)} a month whether you sell anything or not. The two costs cross at
${crossover ? `<strong>${crossover.ordersRounded} orders a month</strong>, which at this order value is
$${crossover.revenue.toFixed(2)} of monthly sales` : 'no point in this range'}.</strong>
Below that Etsy is cheaper; above it Shopify is, and the gap widens from there.
${asymptote ? `Raise the order value and the crossover falls to about $${asymptote.revenue.toFixed(0)} of
monthly revenue and stops moving — because it is a revenue threshold, not an order count.` : ''}</p>`;
  },

  faqs: ({ example, crossover, asymptote, crossoverLadder, rates }) => {
    const etsy = example.rows.find((r) => r.id === 'etsy');
    const shopify = example.rows.find((r) => r.id === 'shopify');
    const basic = rates.shopify.plans[0];
    const spread = crossoverLadder ?? [];
    return [
      {
        q: 'Is Shopify cheaper than Etsy?',
        a: `<p>Above ${crossover ? `about $${crossover.revenue.toFixed(0)} a month in sales` : 'a certain volume'}, yes — and the threshold is much lower than most people assume. At the settings this page loads with, Etsy costs $${etsy.monthlyCost.toFixed(2)} a month and Shopify costs $${shopify.monthlyCost.toFixed(2)}, including the plan.</p>
<p>Below the crossover Etsy is genuinely cheaper, because it charges you nothing in a month where you sell nothing. That asymmetry is the whole trade: a marketplace's cost is proportional to what you make, a storefront's is not.</p>`,
      },
      {
        q: 'How many sales a month before Shopify is worth it?',
        a: `<p>${crossover ? `At a $${DEFAULTS.orderValue.toFixed(2)} order value, ${crossover.ordersRounded}. But that number is misleading on its own, and it is the number every other comparison quotes.</p>
<p>The crossover is really a <strong>revenue</strong> threshold. Halve your order value and you need roughly twice as many orders, so the revenue at which the two cross barely moves${spread.length ? ` — it runs from $${spread[0].revenue.toFixed(0)} at $${spread[0].value} orders to $${spread.at(-1).revenue.toFixed(0)} at $${spread.at(-1).value.toLocaleString('en-US')} orders, across a hundredfold change in basket size` : ''}.</p>` : '<p>At the current settings the two never cross.</p>'}
<p>That is not a coincidence, it falls out of the algebra: the per-order fixed fees stop mattering as the basket grows, and what is left is the plan price divided by the gap in percentage rates.</p>
<p>${asymptote ? `With the ${basic.label} plan at $${shopify.monthlyFixed.toFixed(2)} a month and a rate gap of ${(asymptote.rateGap * 100).toFixed(2)} percentage points, that limit is <strong>$${asymptote.revenue.toFixed(2)} of monthly revenue</strong>. Quote that, not an order count.` : ''}</p>`,
      },
      {
        q: 'What does Etsy actually charge?',
        a: `<p>Three separate fees, which is why the headline "6.5%" understates it by a third. On a $${DEFAULTS.orderValue.toFixed(2)} order:</p>
<div class="table-scroll"><table>
<tbody>${etsy.lines.map((l) => `<tr><th scope="row">${l.label}</th><td>&minus;$${l.amount.toFixed(2)}</td></tr>`).join('')}
<tr><th scope="row"><strong>Total</strong></th><td><strong>&minus;$${etsy.perOrderFees.toFixed(2)}</strong></td></tr></tbody>
</table></div>
<p>That is ${(etsy.effectiveRate * 100).toFixed(2)}% of the order, not 6.5%. The transaction fee also applies to the postage you charge, so a "free shipping" listing with $8 of delivery folded into the price is charged on the whole amount. The <a href="/etsy-fee-calculator/">Etsy fee calculator</a> breaks that down further, including Offsite Ads.</p>`,
      },
      {
        q: 'What does Shopify actually charge?',
        a: `<p>The plan, and the card rate on Shopify Payments. On the ${basic.label} plan that is $${basic.monthlyAnnual} a month billed annually — $${basic.monthlyMonthly} if you pay month to month — plus ${(basic.online.rate * 100).toFixed(2)}% + $${basic.online.fixed.toFixed(2)} per order, which comes to $${shopify.perOrderFees.toFixed(2)} on this one.</p>
<p>There is one trap worth knowing: use a payment gateway other than Shopify Payments and Shopify adds a further ${(basic.thirdPartyGatewayRate * 100).toFixed(2)}% transaction fee on Basic, on top of whatever the outside gateway charges. That penalty is usually larger than any rate saving the alternative gateway offers. The <a href="/shopify-fee-calculator/">Shopify fee calculator</a> compares the two directly.</p>`,
      },
      {
        q: 'So should I move off Etsy?',
        a: `<p>The fee arithmetic on this page answers a narrower question than that one. What it tells you is exactly what Etsy's audience is costing you: at the current settings, $${Math.abs(etsy.monthlyCost - shopify.monthlyCost).toFixed(2)} a month more than running your own shop would.</p>
<p>Whether that is worth paying depends entirely on how much of your traffic Etsy is finding for you. A storefront starts with no visitors at all, and the money you save on fees goes straight back out on ads if you have to buy the traffic Etsy was supplying. The realistic answer for most sellers is not a move but an overlap: keep the marketplace for discovery, run the storefront for repeat buyers who already know your name, and let the fee difference on returning customers pay for itself.</p>`,
      },
      {
        q: 'Does the comparison change if I offer free shipping?',
        a: `<p>Not in the direction most people expect. Both channels charge their percentage on the postage you collect, so folding delivery into the item price rather than charging it separately leaves the fee base identical on both — you have not avoided anything, you have just relabelled it.</p>
<p>What does change is your own postage cost, and that is identical on both channels too, so it moves the two figures together and never changes the winner. It only matters for whether either is profitable at all. Enter your real postage cost above and the ranking will hold; the margins under it will not.</p>`,
      },
    ];
  },

  content: ({ example, crossover, asymptote, crossoverLadder, rates }) => {
    const etsy = example.rows.find((r) => r.id === 'etsy');
    const shopify = example.rows.find((r) => r.id === 'shopify');
    const ladder = crossoverLadder ?? [];

    return `
<h2>Two costs of completely different shapes</h2>

<p>Etsy and Shopify are not two prices for the same thing. Etsy charges a percentage of every sale and
nothing at all in a month where you sell nothing. Shopify charges a subscription every month regardless,
and a much smaller percentage on top. Comparing "6.5% versus $29 a month" is comparing a rate to an amount,
which is why so many answers to this question end at "it depends on your volume" and stop there.</p>

<p>It does depend on your volume, and the dependency is exactly solvable:</p>

<div class="formula">Etsy per month     = orders x (listing + transaction% + processing% + processing fixed)
Shopify per month  = plan + orders x (card% + card fixed)

they are equal when   orders = plan / (Etsy per order &minus; Shopify per order)</div>

<p>Two straight lines, one with a y-intercept and a shallow slope, one starting at the origin with a steep
one. They cross once. Everything below is Etsy's; everything above is Shopify's.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.orderValue.toFixed(2)} order, ${DEFAULTS.monthlyOrders} times a month</h3>

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">Etsy</th><th scope="col">Shopify ${shopify.label === 'Shopify' ? `(${rates.shopify.plans[0].label})` : ''}</th></tr></thead>
<tbody>
<tr><th scope="row">Fee on one $${DEFAULTS.orderValue.toFixed(2)} order</th><td>$${etsy.perOrderFees.toFixed(2)}</td><td>$${shopify.perOrderFees.toFixed(2)}</td></tr>
<tr><th scope="row">Subscription</th><td>—</td><td>$${shopify.monthlyFixed.toFixed(2)}/mo</td></tr>
<tr><th scope="row">Total cost at ${DEFAULTS.monthlyOrders} orders</th><td>$${etsy.monthlyCost.toFixed(2)}</td><td>$${shopify.monthlyCost.toFixed(2)}</td></tr>
<tr><th scope="row">All-in rate on $${etsy.monthlyRevenue.toFixed(2)} of sales</th><td>${(etsy.effectiveRate * 100).toFixed(2)}%</td><td>${(shopify.effectiveRate * 100).toFixed(2)}%</td></tr>
<tr><th scope="row"><strong>You keep</strong></th><td><strong>$${etsy.monthlyNet.toFixed(2)}</strong></td><td><strong>$${shopify.monthlyNet.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>Etsy's per-order fee is $${(etsy.perOrderFees - shopify.perOrderFees).toFixed(2)} higher, so every order
past the ${crossover ? crossover.ordersRounded : '—'}th pays down Shopify's subscription and then starts
saving you money. At ${DEFAULTS.monthlyOrders} orders the gap is
<strong>$${Math.abs(etsy.monthlyCost - shopify.monthlyCost).toFixed(2)} a month</strong>, or
$${(Math.abs(etsy.monthlyCost - shopify.monthlyCost) * 12).toFixed(0)} a year.</p>
</div>

<h2>The crossover is a revenue figure, not an order count</h2>

<p>This is the part worth taking away, and it is the reason "once you're doing about fifty orders a month"
is bad advice: it is only true for whoever's average order value it was calculated at.</p>

<p>Watch what happens to the crossover as the order value changes. The order count collapses; the revenue
it represents hardly moves at all:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Average order</th><th scope="col">Etsy fee</th><th scope="col">Shopify fee</th><th scope="col">Gap per order</th><th scope="col">Crossover</th><th scope="col">= monthly revenue</th></tr></thead>
<tbody>
${ladder
      .map(
        (row) => `<tr${row.value === DEFAULTS.orderValue ? ' data-best' : ''}>
    <td>$${row.value.toFixed(2)}</td>
    <td>&minus;$${row.feeA.toFixed(2)}</td>
    <td>&minus;$${row.feeB.toFixed(2)}</td>
    <td>$${row.gap.toFixed(2)}</td>
    <td>${row.orders < 1 ? 'under 1' : row.orders.toFixed(1)} orders/mo</td>
    <td><strong>$${row.revenue.toFixed(2)}</strong></td>
  </tr>`
      )
      .join('\n')}
</tbody>
</table>
</div>

<p>${asymptote
      ? `As the order value grows, the per-order fixed components stop mattering and the crossover converges
on the plan price divided by the gap in percentage rates —
$${shopify.monthlyFixed.toFixed(2)} &divide; ${(asymptote.rateGap * 100).toFixed(2)}% =
<strong>$${asymptote.revenue.toFixed(2)} of monthly revenue</strong>. Etsy's all-in percentage is
${(asymptote.rateA * 100).toFixed(2)}% and Shopify's is ${(asymptote.rateB * 100).toFixed(2)}%; the whole
decision sits in the ${(asymptote.rateGap * 100).toFixed(2)} points between them.`
      : 'At the current plan the two schedules never cross.'}</p>

<p>So the useful sentence is <strong>"a storefront starts paying for itself somewhere around
$${asymptote ? asymptote.revenue.toFixed(0) : '—'} a month in sales"</strong>, and it holds whether you sell
$12 candles or $400 furniture. On monthly rather than annual billing the plan costs more, and the threshold
moves up with it — the toggle is on the <a href="/shopify-fee-calculator/">Shopify calculator</a>.</p>

<h2>What the fee difference is not telling you</h2>

<p>Everything above prices one side of the decision precisely and the other side not at all.</p>

<p>Etsy's ${(etsy.effectiveRate * 100).toFixed(2)}% is not purely a payment fee. It is the rent on a
marketplace with buyers already in it, a search engine those buyers already use, and a checkout they
already trust. Shopify's $${shopify.monthlyFixed.toFixed(2)} buys hosting and a card rate, and an empty
shop that no one has any reason to visit. The moment you have to buy traffic to fill it, the ad spend lands
on the same line of your accounts that the Etsy fee used to.</p>

<p>Read the crossover as a price tag on Etsy's audience rather than as a recommendation. At the current
settings Etsy is charging you $${Math.abs(etsy.monthlyCost - shopify.monthlyCost).toFixed(2)} a month more
than self-hosting would. If you could reliably buy the same number of orders for less than that, the move
makes sense; if you could not, the fee is doing real work.</p>

<p>Which is why the common answer among sellers who have run both is not a switch at all. The marketplace
keeps doing discovery, the storefront takes the repeat buyers who already know the name and would have come
back anyway, and the fee saving on those returning orders — the ones the marketplace was charging full rate
for but no longer finding — covers the subscription on its own.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Etsy Offsite Ads.</strong> Charged at 12–15% on ad-attributed orders on top of everything here,
and mandatory above $${rates.etsy.offsiteAds.highVolumeThreshold.toLocaleString('en-US')} of trailing sales.
It only fires on some orders, so it raises your blended rate rather than this one.</li>
<li><strong>Apps and themes.</strong> Shopify's ecosystem is a real recurring cost for most shops and none
of it is in the plan price.</li>
<li><strong>Third-party gateways.</strong> Shopify penalises them at up to
${(rates.shopify.plans[0].thirdPartyGatewayRate * 100).toFixed(2)}% on Basic. This comparison assumes
Shopify Payments.</li>
<li><strong>Domain, email and the rest of running a shop</strong> — small, but not zero.</li>
<li><strong>Your time.</strong> A storefront is a thing you maintain.</li>
<li><strong>Income tax.</strong> These are payout figures, not profit after tax. See the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Who this is for</h2>
<p>Etsy sellers wondering whether they have outgrown the fees, and anyone weighing a first sales channel who
has been told "Shopify once you're big enough" without being told what big enough means. If you are already
running both, the useful reading is the per-order gap: it is what each order routed to the storefront rather
than the marketplace is worth to you.</p>
`;
  },
};
