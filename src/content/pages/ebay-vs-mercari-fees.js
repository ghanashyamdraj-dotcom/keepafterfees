/**
 * ebay-vs-mercari-fees.js — page definition for /ebay-vs-mercari-fees/
 *
 * Content strategy notes:
 *
 *   - The honest headline is that Mercari is cheaper at every price, and the
 *     page says so rather than manufacturing a crossover. priceCrossover()
 *     returns null for this pair across the whole range, which is checked at
 *     build time rather than assumed — so if either platform changes its
 *     schedule and a crossover appears, the page reports it instead.
 *
 *   - A comparison where one side always wins is only worth publishing if it
 *     quantifies the gap and then explains why anyone would still choose the
 *     dearer one. That is what the page does: the fee gap is the price of
 *     eBay's traffic, stated per sale and per year, and the counterweights
 *     (buyer-side fees, audience size, category depth) are given room.
 *
 *   - The two structural differences that a "13.6% vs 10%" comparison misses
 *     are both surfaced with computed dollar figures: what each charges on the
 *     postage you collect, and what each charges on the sales tax it collects
 *     on your behalf. eBay charges its full final value fee on tax that was
 *     never yours; that is modelled, verified, and worth its own section.
 *
 *   - Mercari's sales tax treatment is NOT modelled by this site, so the page
 *     says "not modelled" rather than "nothing". Its published fee base is the
 *     item plus postage with no tax term, but an absence in a rate file is not
 *     evidence, and a money tool should not launder one into the other.
 */

const DEFAULTS = {
  orderValue: 45,
  shippingCharged: 8,
  shippingCost: 8,
  salesTaxCollected: 0,
  itemCost: 0,
  monthlyOrders: 20,
  matchup: 'ebay-vs-mercari',
  ebayStoreTier: 'none',
};

export default {
  id: 'ebay-vs-mercari-fees',
  kind: 'tool',
  calculator: 'channel-versus',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'eBay vs Mercari Fee Comparison',
  traitsAt: 45,

  presets: {
    field: 'orderValue',
    label: 'Compare both on a sale of…',
    values: [10, 25, 45, 75, 150, 400],
  },
  featureList: [
    'Net payout on the same item listed on eBay and on Mercari, side by side',
    'Models the fee each charges on the postage you collect, not just on the item price',
    'Shows what eBay charges on the sales tax it collects and remits on your behalf',
    'Converts the per-sale gap into what it costs across a year at your own volume',
  ],

  groups: (rates) => [
    {
      legend: 'The sale',
      fields: [
        { name: 'orderValue', label: 'Item price', prefix: '$', value: DEFAULTS.orderValue, help: 'The same asking price on both platforms.' },
        { name: 'shippingCharged', label: 'Postage charged', prefix: '$', value: DEFAULTS.shippingCharged, help: 'Both platforms charge their fee on this. It is not free money on either.' },
        { name: 'shippingCost', label: 'Postage it costs you', prefix: '$', value: DEFAULTS.shippingCost, help: 'Identical on both, so it moves both figures equally.' },
        { name: 'itemCost', label: 'What the item cost you', prefix: '$', value: DEFAULTS.itemCost, help: 'Enter 0 if you are clearing out your own cupboard.' },
      ],
    },
    {
      legend: 'Sales tax and volume',
      note: 'eBay charges its final value fee on the sales tax it collects. Enter a tax amount to see what that costs.',
      fields: [
        { name: 'salesTaxCollected', label: 'Sales tax collected', prefix: '$', value: DEFAULTS.salesTaxCollected, help: 'Collected and remitted by the platform — never yours to keep, but eBay still charges a fee on it.' },
        { name: 'monthlyOrders', label: 'Sales a month', value: DEFAULTS.monthlyOrders, step: '1', help: 'Used to turn the per-sale gap into a monthly one.' },
      ],
    },
    {
      legend: 'eBay store',
      fields: [
        {
          name: 'ebayStoreTier', label: 'Store subscription', type: 'select', value: DEFAULTS.ebayStoreTier,
          options: rates.ebay.storeSubscriptions.map((s) => ({
            value: s.id,
            label: s.monthlyAnnual > 0 ? `${s.label} — $${s.monthlyAnnual}/mo` : s.label,
          })),
          wide: true,
          help: 'Basic and above move you onto eBay’s cheaper fee table, and charge a subscription for it.',
        },
        { name: 'matchup', type: 'hidden', value: DEFAULTS.matchup },
      ],
    },
  ],

  answerBlock: ({ example, flip }) => {
    const ebay = example.rows.find((r) => r.id === 'ebay');
    const mercari = example.rows.find((r) => r.id === 'mercari');
    const gap = Math.abs(ebay.perOrderFees - mercari.perOrderFees);
    return `
<p class="answer-block"><strong>On a $${DEFAULTS.orderValue.toFixed(2)} item with
$${DEFAULTS.shippingCharged.toFixed(2)} of postage collected, eBay takes
$${ebay.perOrderFees.toFixed(2)} and Mercari takes $${mercari.perOrderFees.toFixed(2)} — a gap of
$${gap.toFixed(2)} on one sale, or $${(gap * DEFAULTS.monthlyOrders * 12).toFixed(0)} a year at
${DEFAULTS.monthlyOrders} sales a month.</strong>
${flip
      ? `The ranking flips at $${flip.price.toFixed(2)}: ${flip.cheaperBelow} is cheaper below it and ${flip.cheaperAbove} above.`
      : `Mercari is cheaper at every price this calculator can find — there is no crossover to look for. What the gap buys on eBay is traffic, and this page is about whether that trade is worth it at your prices.`}</p>`;
  },

  faqs: ({ example, traits, flip, rates }) => {
    const ebay = example.rows.find((r) => r.id === 'ebay');
    const mercari = example.rows.find((r) => r.id === 'mercari');
    const gap = Math.abs(ebay.perOrderFees - mercari.perOrderFees);
    const ebayTrait = traits.find((t) => t.id === 'ebay');
    const mercariTrait = traits.find((t) => t.id === 'mercari');
    const mercariNote = rates.resellers.platforms.find((p) => p.id === 'mercari')?.note ?? '';
    return [
      {
        q: 'Is Mercari cheaper than eBay?',
        a: `<p>${flip
          ? `Not everywhere — the two cross at $${flip.price.toFixed(2)}.`
          : `Yes, on fees, at every price this calculator was able to test. On a $${DEFAULTS.orderValue.toFixed(2)} sale with $${DEFAULTS.shippingCharged.toFixed(2)} postage, Mercari takes $${mercari.perOrderFees.toFixed(2)} against eBay's $${ebay.perOrderFees.toFixed(2)}. That is ${(mercari.effectiveRate * 100).toFixed(2)}% against ${(ebay.effectiveRate * 100).toFixed(2)}%.`}</p>
<p>The gap is wider than the headline rates suggest, because eBay's ${(ebay.effectiveRate * 100).toFixed(2)}% includes a per-order fee that Mercari does not charge, and because eBay's fee base includes the sales tax it collects while Mercari's published base does not. On a small sale the per-order fee alone is most of the difference.</p>`,
      },
      {
        q: 'What does eBay charge that Mercari does not?',
        a: `<p>Three things, at the settings on this page:</p>
<ul>
<li><strong>A higher rate on the same base.</strong> eBay's final value fee is ${(rates.ebay.finalValueFee.schedules[0].categories.find((c) => c.id === 'default').tiers[0].rate * 100).toFixed(1)}% in most categories against Mercari's ${(rates.resellers.platforms.find((p) => p.id === 'mercari').commission.rate * 100).toFixed(0)}%.</li>
<li><strong>A per-order fee.</strong> $${rates.ebay.perOrderFee.underOrEqual10.toFixed(2)} on orders up to $10 and $${rates.ebay.perOrderFee.over10.toFixed(2)} above, charged once per order. Mercari has none.</li>
<li><strong>A fee on the sales tax.</strong> eBay applies the full final value fee to tax it collects and remits on your behalf${ebayTrait?.salesTaxFee ? ` — $${ebayTrait.salesTaxFee.toFixed(2)} on every $10 of tax` : ''}. That is money you never touch.</li>
</ul>
<p>Both charge their fee on the postage you collect${ebayTrait?.postageFee && mercariTrait?.postageFee ? `, but not equally: on $10 of postage eBay takes $${ebayTrait.postageFee.toFixed(2)} and Mercari takes $${mercariTrait.postageFee.toFixed(2)}` : ''}. That is one reason a "free shipping" listing costs more than it looks on either.</p>`,
      },
      {
        q: 'If Mercari is cheaper, why does anyone sell on eBay?',
        a: `<p>Because the fee is not what you are buying. eBay has an order of magnitude more buyers, a far deeper category structure — motors, industrial parts, collectables, anything with a serial number — and an international audience Mercari does not reach. An item that sells on eBay in a week and sits on Mercari for six months earns more on eBay at any fee rate, because $${ebay.netPerOrder.toFixed(2)} now beats $${mercari.netPerOrder.toFixed(2)} eventually.</p>
<p>What this page gives you is the price of that reach, stated plainly: $${gap.toFixed(2)} per sale, $${(gap * DEFAULTS.monthlyOrders).toFixed(2)} a month at ${DEFAULTS.monthlyOrders} sales. Whether eBay finds you enough extra buyers to justify it is a question about your category, not your arithmetic — and for most sellers the answer differs item by item rather than platform by platform.</p>`,
      },
      {
        q: 'Does Mercari really charge sellers 10% again?',
        a: `<p>Yes, and this is the single most out-of-date thing circulating about Mercari. ${mercariNote.split('.')[0]}. The zero-seller-fee period ran from March 2024 to January 2025 only, and a great deal of advice written during that window is still being repeated as current.</p>
<p>Separately, Mercari charges the <em>buyer</em> a Buyer Protection fee on top of your asking price. That does not come out of your proceeds, so it does not appear in the fee column here — but it does mean the buyer sees a higher total than your listed price, which is a real disadvantage when the same item is listed at the same price on eBay.</p>`,
      },
      {
        q: 'Is an eBay store subscription worth it?',
        a: `<p>It buys a genuinely different fee table, not a discount. From Basic upwards eBay charges you from its lower schedule, which cuts the headline rate and also drops the first tier boundary from $${rates.ebay.finalValueFee.schedules[0].categories.find((c) => c.id === 'default').tiers[0].upTo.toLocaleString('en-US')} to $${rates.ebay.finalValueFee.schedules[1].categories.find((c) => c.id === 'default').tiers[0].upTo.toLocaleString('en-US')}.</p>
<p>Change the store dropdown above and watch both the per-sale fee and the monthly total move — the subscription only pays for itself past a volume that the monthly figures make visible. It does not close the gap to Mercari at typical prices; it narrows it.</p>`,
      },
      {
        q: 'Which should I list on if I only pick one?',
        a: `<p>If your items are ordinary consumer goods — clothing, electronics, homeware, toys — that sell on both, Mercari keeps you more of each sale and the difference compounds. If your items are specialised, high value, international, or in a category eBay has spent twenty years indexing, list on eBay and treat the extra $${gap.toFixed(2)} as advertising.</p>
<p>Most people who sell seriously use both, and the reason is visible in the numbers above: the fee gap is real but small next to the difference between selling and not selling. For a wider view including Poshmark, Depop, Vinted and the rest, see the <a href="/reseller-fee-calculator/">reseller fee calculator</a>.</p>`,
      },
    ];
  },

  content: ({ example, traits, flip, rates }) => {
    const ebay = example.rows.find((r) => r.id === 'ebay');
    const mercari = example.rows.find((r) => r.id === 'mercari');
    const gap = Math.abs(ebay.perOrderFees - mercari.perOrderFees);
    const ebayTrait = traits.find((t) => t.id === 'ebay');
    const mercariTrait = traits.find((t) => t.id === 'mercari');
    const defaultCat = rates.ebay.finalValueFee.schedules[0].categories.find((c) => c.id === 'default');

    return `
<h2>Where the 3.6-point gap actually comes from</h2>

<p>Written as headline rates this looks like a small difference: eBay charges
${(defaultCat.tiers[0].rate * 100).toFixed(1)}% in most categories, Mercari charges
${(rates.resellers.platforms.find((p) => p.id === 'mercari').commission.rate * 100).toFixed(0)}%. In
practice the gap on a real sale is wider, and it is wider for three reasons that have nothing to do with
that headline.</p>

<div class="formula">eBay      = (item + postage collected + sales tax) x final value fee % + per-order fee
Mercari   = (item + postage collected) x 10%</div>

<p>The base is different, the rate is different, and only one of them has a fixed fee attached. Each of
those pushes the same direction.</p>

<h3>1. eBay charges a fee on the sales tax it collects</h3>

<p>eBay collects sales tax on your behalf and remits it to the state. The money is never yours — it passes
through your order and out again — and eBay charges its full final value fee on it on the way past.
${ebayTrait?.salesTaxFee
      ? `That costs $${ebayTrait.salesTaxFee.toFixed(2)} for every $10 of tax on your orders.`
      : ''}
Enter a tax figure in the calculator above and watch it land on eBay's side alone.</p>

<p>Mercari's published fee base is the item price plus the postage you collect, with no tax term in it.
This site does not model a sales tax component for Mercari at all, so the comparison holds it at zero on
that side — which means the gap shown here is the <em>optimistic</em> one for eBay, not a worst case. An
absence in our rate data is not the same as a documented zero, and this page does not treat it as one.</p>

<h3>2. eBay has a per-order fee and Mercari does not</h3>

<p>$${rates.ebay.perOrderFee.underOrEqual10.toFixed(2)} on orders up to $10 and
$${rates.ebay.perOrderFee.over10.toFixed(2)} above it, charged once per order regardless of size. On a $400
sale that is a rounding error. On an $8 sale it is
${((rates.ebay.perOrderFee.underOrEqual10 / 8) * 100).toFixed(1)}% on its own, before the percentage fee is
applied at all — which is why eBay's effective rate on cheap items is far above its advertised one, and why
the two platforms diverge most at the bottom of the price range rather than the top.</p>

<h3>3. Both charge on postage, but not by the same amount</h3>

${ebayTrait?.feeOnPostage && mercariTrait?.feeOnPostage
      ? `<p>Neither platform lets you escape the fee by splitting delivery out of the price: both charge their
percentage on the postage you collect. But they charge different percentages of it. On $10 of postage, eBay
takes $${ebayTrait.postageFee.toFixed(2)} and Mercari takes $${mercariTrait.postageFee.toFixed(2)}.</p>`
      : '<p>The two platforms differ in whether postage enters the fee base at all — see the comparison table above.</p>'}

<p>The practical consequence is that "offer free shipping and build it into the price" changes nothing
about your fee on either platform. It is the same base either way.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.orderValue.toFixed(2)} item with $${DEFAULTS.shippingCharged.toFixed(2)} postage, sold on each</h3>

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">eBay</th><th scope="col">Mercari</th></tr></thead>
<tbody>
<tr><th scope="row">You collect</th><td>$${ebay.revenue.toFixed(2)}</td><td>$${mercari.revenue.toFixed(2)}</td></tr>
<tr><th scope="row">Platform fee</th><td>&minus;$${ebay.perOrderFees.toFixed(2)}</td><td>&minus;$${mercari.perOrderFees.toFixed(2)}</td></tr>
<tr><th scope="row">Effective rate</th><td>${(ebay.effectiveRate * 100).toFixed(2)}%</td><td>${(mercari.effectiveRate * 100).toFixed(2)}%</td></tr>
<tr><th scope="row">Postage you pay</th><td>&minus;$${ebay.sellerShipping.toFixed(2)}</td><td>&minus;$${mercari.sellerShipping.toFixed(2)}</td></tr>
<tr><th scope="row"><strong>You keep</strong></th><td><strong>$${ebay.netPerOrder.toFixed(2)}</strong></td><td><strong>$${mercari.netPerOrder.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>The difference is <strong>$${gap.toFixed(2)} on one sale</strong>. At
${DEFAULTS.monthlyOrders} sales a month that is $${(gap * DEFAULTS.monthlyOrders).toFixed(2)} a month and
<strong>$${(gap * DEFAULTS.monthlyOrders * 12).toFixed(0)} a year</strong> — for listing the identical item,
at the identical price, in a different place.</p>
</div>

<h2>Does the answer ever flip?</h2>

${flip
      ? `<p>Yes. The two schedules cross at <strong>$${flip.price.toFixed(2)}</strong>: below it
${flip.cheaperBelow} keeps you more, above it ${flip.cheaperAbove} does. That boundary is solved from the
schedules themselves on every build, so it moves when either platform changes its rates.</p>`
      : `<p>No — and that is worth stating plainly rather than manufacturing a threshold to make the page
feel balanced. This site searches the whole price range from $1 to $5,000 on every build looking for a
crossing point between these two schedules, and there is not one. Mercari's fee is lower at every price.</p>

<p>The search is real rather than an assumption: if either platform changed its schedule so that a
crossover appeared, this section would report the price instead of this paragraph. Until then, anyone
telling you eBay becomes cheaper above some threshold is describing a fee structure neither platform
currently has.</p>

<p>What does change with price is the <em>size</em> of the gap as a percentage. eBay's per-order fee makes
cheap sales disproportionately expensive there, so the two are furthest apart on small items and converge —
without ever meeting — as the sale price rises. Run the presets above from $10 to $400 and watch the
effective rates close.</p>`}

<h2>What the fee gap is buying</h2>

<p>A comparison where one side wins everywhere is only useful if it says what the losing side is for. On
fees alone the recommendation would be trivial, and it would also be wrong for a lot of sellers.</p>

<p>eBay is roughly an order of magnitude larger by buyer count, indexes categories Mercari does not
meaningfully serve — vehicle parts, industrial equipment, collectables, anything identified by a part
number — and reaches buyers outside the United States. Mercari is a domestic app aimed at everyday
secondhand goods, and it is very good at those.</p>

<p>The arithmetic that matters is not $${ebay.perOrderFees.toFixed(2)} against
$${mercari.perOrderFees.toFixed(2)}. It is $${ebay.netPerOrder.toFixed(2)} in a week against
$${mercari.netPerOrder.toFixed(2)} in three months, or never. A ${((gap / mercari.netPerOrder) * 100).toFixed(1)}%
difference in payout is small next to a difference in whether the item sells at all, and this calculator
cannot measure sell-through — nobody's can, because it depends on your specific item.</p>

<p>The version of this that survives contact with reality: list ordinary consumer goods where they cost you
least, list anything specialised where the buyers already are, and stop treating it as a single decision
about a platform rather than a decision per item.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Buyer-side fees.</strong> Mercari charges buyers a Buyer Protection fee on top of your asking
price and eBay does not. Your payout is unaffected, but the buyer's total is not, and the same item at the
same price looks cheaper on eBay to the person deciding.</li>
<li><strong>Promoted listings.</strong> eBay's ad rates are seller-set and come straight off this payout.
Mercari has its own promotion mechanics. Neither is included here.</li>
<li><strong>Sell-through.</strong> The largest omission, and the one that most often reverses the
conclusion.</li>
<li><strong>Category exceptions.</strong> eBay's final value fee is not one rate — several categories are
charged differently and a few are cliffs rather than marginal tiers. The
<a href="/ebay-fee-calculator/">eBay fee calculator</a> carries the full table.</li>
<li><strong>Returns and disputes.</strong> Policies and costs differ, and neither is modelled.</li>
<li><strong>Income tax.</strong> These are payout figures. See the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a> if this is a business.</li>
</ul>

<h2>Who this is for</h2>
<p>Resellers who list on one and wonder about the other, and anyone who has read that Mercari charges
sellers nothing — which was true for ten months and has not been true since January 2025. If you are
choosing between more than these two, the <a href="/reseller-fee-calculator/">reseller fee calculator</a>
ranks nine platforms at once and the
<a href="/marketplace-fee-comparison/">marketplace fee comparison</a> adds the storefront options.</p>
`;
  },
};
