/**
 * poshmark-fees.js — page definition for /poshmark-fee-calculator/
 *
 * Content strategy notes:
 *
 *   - The whole page is built around the $15 cliff, because it is the one
 *     piece of Poshmark arithmetic that is genuinely actionable and that no
 *     competing calculator surfaces. Below $15 the commission is a flat fee;
 *     at $15 it becomes a percentage of the WHOLE sale. So a $14.99 listing
 *     nets more than a $15.00 one, and there is a narrow band above the
 *     threshold where charging more leaves you with less.
 *
 *   - The dead band is SOLVED, not derived. An earlier version of this
 *     arithmetic on the comparison page computed it as `threshold / (1 - rate)`
 *     and got $18.75, which is about seventy-five times too wide. The real
 *     boundary is the lowest price at which you net what you netted a cent
 *     below the cliff. detectCliffs() in versus.js scans for it.
 *
 *   - The second thing worth a page: Poshmark's fee looks brutal at 20% and
 *     often is not, because the buyer pays for the prepaid label. On a $45
 *     item with $8 of postage, a 10% platform where you buy the label can
 *     leave you with less than a 20% platform where you do not. That is the
 *     comparison the reseller pages exist to make.
 */

const DEFAULTS = {
  platformId: 'poshmark',
  salePrice: 45,
  shippingCharged: 0,
  shippingCost: 0,
  sellerPaysShipping: false,
  itemCost: 12,
};

export default {
  id: 'poshmark-fees',
  kind: 'tool',
  calculator: 'reseller-single',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'Poshmark Fee Calculator',

  presets: {
    field: 'salePrice',
    label: 'Work out the fee on a sale of…',
    values: [10, 14.99, 15, 45, 100, 250],
  },
  featureList: [
    'Poshmark commission and net payout on any sale price',
    'Models the flat-fee-under-$15 threshold as the cliff it actually is',
    'Solves the exact band of prices above $15 where charging more leaves you with less',
    'Accounts for Poshmark supplying a buyer-paid prepaid label, so postage never enters the seller ledger',
  ],

  groups: () => [
    {
      legend: 'The sale',
      fields: [
        { name: 'salePrice', label: 'Listing price', prefix: '$', value: DEFAULTS.salePrice, help: 'What the buyer pays for the item itself.' },
        { name: 'itemCost', label: 'What it cost you', prefix: '$', value: DEFAULTS.itemCost, help: 'Sourcing cost. Enter 0 if you are clearing out your own wardrobe.' },
      ],
    },
    {
      legend: 'Postage',
      note: 'Poshmark sends the buyer a prepaid label, so postage normally never touches your side of the ledger. It only does if you choose to discount the label.',
      fields: [
        { name: 'shippingCost', label: 'Postage you cover', prefix: '$', value: DEFAULTS.shippingCost, help: 'Only if you discount the buyer’s label out of your own proceeds.' },
        { name: 'platformId', type: 'hidden', value: DEFAULTS.platformId },
      ],
    },
  ],

  answerBlock: ({ example, platform }) => `
<p class="answer-block"><strong>On a $${DEFAULTS.salePrice.toFixed(2)} Poshmark sale, Poshmark takes
$${example.fees.totalFees.toFixed(2)} and you keep $${example.totals.payout.toFixed(2)} —
${(example.effectiveFeeRate * 100).toFixed(1)}% of the sale.</strong> Poshmark charges a flat
$${platform.commission.flatUnderThreshold.toFixed(2)} on anything under
$${platform.commission.threshold.toFixed(2)} and
${(platform.commission.rateAtOrAbove * 100).toFixed(0)}% at or above it — and because that switch re-rates
the whole sale rather than the part above the line, there is a narrow band of prices where asking for more
leaves you with less. The commission covers payment processing, and the buyer pays for the postage label.</p>`,

  faqs: ({ example, cliff, platform, rates }) => [
    {
      q: 'What percentage does Poshmark take?',
      a: `<p>${(platform.commission.rateAtOrAbove * 100).toFixed(0)}% of the sale price on anything at or above $${platform.commission.threshold.toFixed(2)}, and a flat $${platform.commission.flatUnderThreshold.toFixed(2)} below it. On this page's $${DEFAULTS.salePrice.toFixed(2)} example that is $${example.fees.totalFees.toFixed(2)}.</p>
<p>There is no separate payment processing fee, no listing fee and no monthly cost — the commission is the whole charge. That matters when comparing against a platform advertising a lower rate, because most of them add processing on top of it.</p>`,
    },
    {
      q: 'Do I really keep more by listing at $14.99 than at $15.00?',
      a: cliff
        ? `<p>Yes, and it is the most useful thing on this page. At $${(cliff.price - 0.01).toFixed(2)} the commission is the flat $${platform.commission.flatUnderThreshold.toFixed(2)} and you keep $${cliff.netBelow.toFixed(2)}. At $${cliff.price.toFixed(2)} the whole sale re-rates to ${(platform.commission.rateAtOrAbove * 100).toFixed(0)}%, the fee jumps $${cliff.jump.toFixed(2)}, and you keep less.</p>
<p>You do not get back to $${cliff.netBelow.toFixed(2)} until you charge <strong>$${cliff.recoversAt.toFixed(2)}</strong>. Everything between $${cliff.price.toFixed(2)} and $${(cliff.recoversAt - 0.01).toFixed(2)} — a $${cliff.deadZone.toFixed(2)} band — pays you less than a cent below the threshold would have. There is no reason to ever price inside it.</p>
<p>The band is narrow, which is exactly why it is worth knowing: it is small enough that nobody notices it and easy enough to avoid once you do.</p>`
        : `<p>At the current rate card the threshold does not create a band where charging more pays less.</p>`,
    },
    {
      q: 'Is 20% not very high for a resale platform?',
      a: `<p>It is the highest headline rate of the platforms this site models — but the headline rate is not the comparison that decides your payout, because Poshmark pays for the postage and most of the others do not.</p>
<p>A platform charging 10% where you buy an $8 label nets you less on a $45 item than Poshmark charging 20% where the buyer's label is prepaid. Whether that holds at your prices depends on your postage cost and your item value: the cheaper the item relative to the postage, the better Poshmark looks. Put your own numbers into the <a href="/reseller-fee-calculator/">reseller fee calculator</a> and it ranks nine platforms at once.</p>`,
    },
    {
      q: 'Does Poshmark charge a separate payment processing fee?',
      a: `<p>No. ${platform.note.split('.')[0]}. That is unusual — Etsy, Depop, Grailed and StockX all charge processing on top of their commission, so a like-for-like comparison has to add theirs in before setting it against Poshmark's single number.</p>
<p>There is also no listing fee, no renewal fee and no subscription, so a listing that never sells costs you nothing.</p>`,
    },
    {
      q: 'What about bundles and offers?',
      a: `<p>Not modelled here, and both change the arithmetic. A bundle is charged as one sale, so several cheap items bundled past the $${platform.commission.threshold.toFixed(2)} threshold move from several flat fees to one percentage — which can go either way depending on how many items and at what prices.</p>
<p>Offers to likers and shipping discounts come straight off your proceeds. Enter a discounted postage figure above to model the second one; for the first, reduce the listing price to what you actually expect to accept.</p>`,
    },
    {
      q: 'How current is this figure?',
      a: `<p>It reflects Poshmark's published seller fee page as of ${rates.resellers.effective}, last checked ${rates.resellers.verifiedOn ?? 'not yet verified'}. Resale fees are the fastest-moving category on this site — several platforms have shifted commission between buyers and sellers since 2024 — so treat the structure as the durable part and re-check the rate before pricing on it. If you spot a figure that has moved, <a href="/contact/">tell us</a>.</p>`,
    },
  ],

  content: ({ example, cliff, ladder, platform, rates }) => `
<h2>How Poshmark's fee actually works</h2>

<p>Poshmark charges one fee and nothing else. There is no listing fee, no renewal fee, no subscription and
no separate payment processing charge — which makes it simpler than almost every platform it competes with,
and makes the single number it does charge easy to compare wrongly.</p>

<div class="formula">sale under $${platform.commission.threshold.toFixed(2)}   commission = $${platform.commission.flatUnderThreshold.toFixed(2)} flat
sale at or above    commission = ${(platform.commission.rateAtOrAbove * 100).toFixed(0)}% of the WHOLE sale price

you keep = sale price &minus; commission &minus; what the item cost you
           (postage is not in this line — the buyer pays for the label)</div>

<p>Read the second line carefully, because it is where the money is. At the threshold the percentage applies
to the entire sale, not to the portion above it. That is a <em>cliff</em>, not a tier — and a cliff is the
only kind of fee boundary that can make charging more leave you with less.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.salePrice.toFixed(2)} item that cost you $${DEFAULTS.itemCost.toFixed(2)}</h3>

<div class="table-scroll">
<table>
<tbody>
<tr><th scope="row">Listing price</th><td>$${DEFAULTS.salePrice.toFixed(2)}</td></tr>
${example.lines
    .filter((l) => l.kind === 'fee' && l.amount)
    .map((l) => `<tr><th scope="row">${l.label}</th><td>&minus;$${Math.abs(l.amount).toFixed(2)}</td></tr>`)
    .join('\n')}
<tr><th scope="row">Postage</th><td>$0.00 — the buyer's label is prepaid</td></tr>
<tr><th scope="row"><strong>Poshmark pays you</strong></th><td><strong>$${example.totals.payout.toFixed(2)}</strong></td></tr>
<tr><th scope="row">What the item cost you</th><td>&minus;$${DEFAULTS.itemCost.toFixed(2)}</td></tr>
<tr><th scope="row"><strong>You keep</strong></th><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>The effective rate is ${(example.effectiveFeeRate * 100).toFixed(1)}% of the sale. On a platform where
you also bought the postage label, the same $${DEFAULTS.salePrice.toFixed(2)} sale would have to clear an
$8-or-so label before it caught up.</p>
</div>

${cliff ? `<h2>The $${cliff.price.toFixed(2)} cliff, and the band above it you should never price in</h2>

<p>This is the one piece of Poshmark arithmetic worth memorising.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Listed at</th><th scope="col">Commission</th><th scope="col">You keep</th><th scope="col"></th></tr></thead>
<tbody>
<tr><td>$${(cliff.price - 0.01).toFixed(2)}</td><td>$${cliff.feeBelow.toFixed(2)}</td><td>$${cliff.netBelow.toFixed(2)}</td><td>flat fee</td></tr>
<tr><td>$${cliff.price.toFixed(2)}</td><td>$${cliff.feeAt.toFixed(2)}</td><td>$${(cliff.price - cliff.feeAt).toFixed(2)}</td><td>the whole sale re-rates</td></tr>
<tr data-best><td>$${cliff.recoversAt.toFixed(2)}</td><td>$${(cliff.recoversAt * platform.commission.rateAtOrAbove).toFixed(2)}</td><td>$${cliff.netBelow.toFixed(2)}</td><td>back to level</td></tr>
</tbody>
</table>
</div>

<p>One extra cent of asking price costs you <strong>$${cliff.jump.toFixed(2)}</strong> of extra fee. You do
not recover until <strong>$${cliff.recoversAt.toFixed(2)}</strong>, so the
$${cliff.deadZone.toFixed(2)} band from $${cliff.price.toFixed(2)} to
$${(cliff.recoversAt - 0.01).toFixed(2)} is money given away for nothing. Price below the threshold or
clearly above the band; never inside it.</p>

<p>The general lesson travels: any platform with a flat fee, a minimum fee or a threshold has a dead zone
just above it. Grailed added one at $120 in May 2026 that is $4.10 wide — far more expensive than this one.
The <a href="/marketplace-fee-comparison/">marketplace fee comparison</a> scans every platform's schedule
for them.</p>` : ''}

<h2>What Poshmark keeps at every common price</h2>

<p>Computed by the same engine as the calculator above, so these cannot drift out of sync with it:</p>

<div class="table-scroll">
<table class="value-table">
<thead><tr>
  <th scope="col">Listing price</th><th scope="col">Commission</th>
  <th scope="col">Effective rate</th><th scope="col">Poshmark pays you</th>
</tr></thead>
<tbody>
${ladder
    .map(
      (row) => `<tr${row.price === DEFAULTS.salePrice ? ' data-best' : ''}>
    <th scope="row">$${row.price.toFixed(2)}</th>
    <td>&minus;$${row.fee.toFixed(2)}</td>
    <td>${(row.rate * 100).toFixed(1)}%</td>
    <td>$${row.payout.toFixed(2)}</td>
  </tr>`
    )
    .join('\n')}
</tbody>
</table>
</div>

<p>Notice the effective rate at the bottom of the table. The flat fee means a cheap item is charged a far
higher percentage than the headline ${(platform.commission.rateAtOrAbove * 100).toFixed(0)}% — a $5 sale
pays ${((platform.commission.flatUnderThreshold / 5) * 100).toFixed(0)}% — and then the rate drops as you
cross the threshold before settling at the flat percentage. That non-monotonic shape is unusual and it is
the reason a single quoted rate describes Poshmark badly.</p>

<h2>Where Poshmark sits against the alternatives</h2>

<p>Its headline rate is the highest of the platforms this site models, and its real cost is frequently not.
Two structural facts do the work:</p>

<ul>
<li><strong>The buyer pays for the label.</strong> Poshmark and Vinted are the only two platforms here where
postage never enters the seller's ledger. At typical parcel costs that is worth more than several
percentage points of commission on a mid-priced item.</li>
<li><strong>The commission includes processing.</strong> Most competitors charge a percentage <em>plus</em>
card processing of around 3% + $0.30. Comparing Poshmark's single number against somebody else's
commission-only figure understates them by roughly three points.</li>
</ul>

<p>Where it genuinely loses is at the top of the price range: ${(platform.commission.rateAtOrAbove * 100).toFixed(0)}%
of a $400 item is $${(400 * platform.commission.rateAtOrAbove).toFixed(2)}, and no shipping saving covers
that. High-value items belong somewhere with a lower rate — see the
<a href="/reseller-fee-calculator/">reseller fee calculator</a> for the ranking at your own price.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Bundles.</strong> Charged as one sale, which changes how the threshold applies to a group of
cheap items.</li>
<li><strong>Offers and shipping discounts.</strong> Both come off your proceeds and neither is modelled.</li>
<li><strong>Posh Shows and promoted listings.</strong> Separate mechanics with their own costs.</li>
<li><strong>Sell-through.</strong> The largest omission on any of these pages. A platform that pays more per
sale and sells nothing pays nothing.</li>
<li><strong>Income tax.</strong> These are payout figures. If reselling is a business rather than clearing a
wardrobe, see the <a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Who this is for</h2>
<p>Poshmark sellers pricing an item, and anyone deciding whether to list there at all. If you are choosing
between platforms rather than pricing on one, the <a href="/reseller-fee-calculator/">reseller fee
calculator</a> compares nine of them on the same sale, and the
<a href="/ebay-vs-mercari-fees/">eBay vs Mercari page</a> covers the two most common alternatives.</p>
`,
};
