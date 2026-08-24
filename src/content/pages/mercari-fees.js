/**
 * mercari-fees.js — page definition for /mercari-fee-calculator/
 *
 * Content strategy notes:
 *
 *   - The reason this page exists as its own URL rather than a row in the
 *     comparison: "does Mercari charge sellers a fee" has a widely-believed
 *     wrong answer. Mercari ran a genuine zero-seller-fee period from March
 *     2024 to January 2025, an enormous amount of advice was written during
 *     it, and that advice is still circulating as current. The page leads with
 *     the correction and dates it.
 *
 *   - The second thing worth its own page: Mercari's fee base includes the
 *     postage you collect. A "free shipping" listing with delivery folded into
 *     the price is charged on the whole amount, so the common advice to bundle
 *     postage into the price to look cheaper costs you real money here.
 *
 *   - The buyer-side fee is stated in prose and NOT computed. Mercari charges
 *     buyers a protection fee on top of the asking price, which is a real
 *     competitive factor, but this site has no structured figure for it — and
 *     a number in a table implies a precision an unmodelled field does not
 *     have.
 */

const DEFAULTS = {
  platformId: 'mercari',
  salePrice: 45,
  shippingCharged: 8,
  shippingCost: 8,
  sellerPaysShipping: true,
  itemCost: 12,
};

export default {
  id: 'mercari-fees',
  kind: 'tool',
  calculator: 'reseller-single',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'Mercari Fee Calculator',

  presets: {
    field: 'salePrice',
    label: 'Work out the fee on a sale of…',
    values: [10, 25, 45, 100, 250, 500],
  },
  featureList: [
    'Mercari selling fee and net payout on any sale price',
    'Charges the fee on the postage you collect as well as the item, which is how Mercari actually bills it',
    'Separates what Mercari takes from you from what it charges the buyer on top',
    'Reflects the 10% seller fee reinstated in January 2025, not the zero-fee period that ended with it',
  ],

  groups: () => [
    {
      legend: 'The sale',
      fields: [
        { name: 'salePrice', label: 'Listing price', prefix: '$', value: DEFAULTS.salePrice, help: 'What the buyer pays for the item itself.' },
        { name: 'itemCost', label: 'What it cost you', prefix: '$', value: DEFAULTS.itemCost, help: 'Sourcing cost. Enter 0 if you are clearing out your own cupboard.' },
      ],
    },
    {
      legend: 'Postage',
      note: 'Mercari charges its fee on the postage you collect as well as the item price, so delivery is never free money here.',
      fields: [
        { name: 'shippingCharged', label: 'Postage charged to the buyer', prefix: '$', value: DEFAULTS.shippingCharged, help: 'Part of the fee base. Set to 0 if you offer free delivery.' },
        { name: 'shippingCost', label: 'Postage it costs you', prefix: '$', value: DEFAULTS.shippingCost, help: 'What the label actually costs.' },
        { name: 'sellerPaysShipping', label: 'I cover the postage (free delivery to the buyer)', type: 'checkbox', value: DEFAULTS.sellerPaysShipping, wide: true },
        { name: 'platformId', type: 'hidden', value: DEFAULTS.platformId },
      ],
    },
  ],

  answerBlock: ({ example, platform }) => `
<p class="answer-block"><strong>On a $${DEFAULTS.salePrice.toFixed(2)} item with
$${DEFAULTS.shippingCharged.toFixed(2)} of postage collected, Mercari takes
$${example.fees.totalFees.toFixed(2)} and pays you $${example.totals.payout.toFixed(2)}.</strong>
The selling fee is ${(platform.commission.rate * 100).toFixed(0)}% — charged on the item price
<em>plus</em> the postage you collect, so the fee base here is
$${example.feeBase.toFixed(2)}, not $${DEFAULTS.salePrice.toFixed(2)}. Mercari reinstated this fee on
6 January 2025; the zero-seller-fee period that a lot of still-circulating advice was written during ran
for ten months and is over.</p>`,

  faqs: ({ example, ladder, platform, rates }) => [
    {
      q: 'Does Mercari charge sellers a fee in 2026?',
      a: `<p>Yes — ${(platform.commission.rate * 100).toFixed(0)}% of the item price plus the postage you collect. This is the single most out-of-date thing circulating about Mercari, and the confusion is understandable: it genuinely charged sellers nothing between March 2024 and January 2025.</p>
<p>That window was ten months long and produced a great deal of advice that is still repeated as current. The fee came back on 6 January 2025 and has applied since.</p>`,
    },
    {
      q: 'What does Mercari charge its fee on?',
      a: `<p>The item price and the postage you collect, together. On the example above that makes the fee base $${example.feeBase.toFixed(2)} rather than $${DEFAULTS.salePrice.toFixed(2)}, and the fee $${example.fees.totalFees.toFixed(2)} rather than $${(DEFAULTS.salePrice * platform.commission.rate).toFixed(2)}.</p>
<p>The practical consequence: folding delivery into the item price to advertise "free shipping" does not reduce your fee. The base is the same either way, because it was already counting the postage.</p>
<p>Sellers are no longer charged a separate payment processing fee on top — the ${(platform.commission.rate * 100).toFixed(0)}% is the whole seller-side charge.</p>`,
    },
    {
      q: 'What is the Buyer Protection fee, and does it come out of my money?',
      a: `<p>No. Mercari charges the buyer a protection fee on top of your asking price; it does not touch your proceeds and it does not appear in the calculator above, which models your payout only.</p>
<p>It does still matter to you, for a reason that has nothing to do with fees: the buyer sees a higher total than your listed price. Against the identical item listed at the identical price on a platform with no buyer-side fee, yours looks more expensive at checkout. This site has no structured figure for that fee, so it is described here rather than computed — a number in a table would imply a precision the data does not have.</p>`,
    },
    {
      q: 'Is Mercari cheaper than eBay?',
      a: `<p>On fees, yes — at every price this site has been able to test. eBay's final value fee is higher, it adds a per-order fee Mercari does not have, and it charges on the sales tax it collects on your behalf, which Mercari's published base does not include.</p>
<p>Whether that makes it the better place to list is a different question, and it usually comes down to whether your item sells. The <a href="/ebay-vs-mercari-fees/">eBay vs Mercari page</a> works the gap out per sale and per year, and is honest about what eBay's higher fee is buying.</p>`,
    },
    {
      q: 'What is the cheapest way to sell on Mercari?',
      a: `<p>There is no rate to optimise — one percentage, no thresholds, no tiers, no minimum, no subscription. That is genuinely unusual and it makes Mercari the most predictable platform on this site: the fee is the same share of every sale at every price.</p>
<p>The only lever is the fee base. Because postage you collect is part of it, the cheaper the label you can buy, the smaller the fee — so the arithmetic rewards accurate postage rather than padded postage. Padding delivery to make the item look cheap costs you ${(platform.commission.rate * 100).toFixed(0)}% of the padding.</p>`,
    },
    {
      q: 'How current is this figure?',
      a: `<p>It reflects Mercari's published fee page as of ${rates.resellers.effective}, last checked ${rates.resellers.verifiedOn ?? 'not yet verified'}. This is the fastest-moving category on the site — Mercari alone has changed its fee model more than once in three years — so re-check before making a pricing decision on it. If you find a figure that has moved, <a href="/contact/">tell us</a> and it gets fixed.</p>`,
    },
  ],

  content: ({ example, ladder, freeShipping, platform, rates }) => `
<h2>What Mercari charges, and on what</h2>

<p>One fee, one rate, no thresholds. Mercari is the simplest fee schedule on this site — and the simplicity
hides the one detail that actually decides your payout, which is what the percentage is applied to.</p>

<div class="formula">fee base   = item price + postage you collect from the buyer
selling fee = ${(platform.commission.rate * 100).toFixed(0)}% of the fee base

you keep   = item price + postage collected
             &minus; selling fee
             &minus; postage you actually pay
             &minus; what the item cost you</div>

<p>There is no listing fee, no renewal fee, no subscription, no minimum, and — since the 2025 change —
no separate payment processing charge on the seller side either. A listing that never sells costs nothing.</p>

<h2>The fee came back in January 2025</h2>

<p>Between March 2024 and January 2025 Mercari charged sellers nothing at all. It was a real policy, it
lasted ten months, and an enormous amount of "Mercari is free for sellers" advice was written during it.
That advice is still circulating and it is now wrong: the
${(platform.commission.rate * 100).toFixed(0)}% selling fee was reinstated on 6 January 2025.</p>

<p>What did change permanently is the processing fee — sellers are no longer charged one separately, so the
${(platform.commission.rate * 100).toFixed(0)}% is genuinely the whole seller-side charge rather than a
headline with card fees underneath it. Comparing it against a platform that quotes commission and charges
processing on top understates that platform by roughly three points.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.salePrice.toFixed(2)} item with $${DEFAULTS.shippingCharged.toFixed(2)} postage, costing you $${DEFAULTS.itemCost.toFixed(2)}</h3>

<div class="table-scroll">
<table>
<tbody>
<tr><th scope="row">Item price</th><td>$${DEFAULTS.salePrice.toFixed(2)}</td></tr>
<tr><th scope="row">Postage collected</th><td>$${DEFAULTS.shippingCharged.toFixed(2)}</td></tr>
<tr><th scope="row"><strong>Fee is charged on</strong></th><td><strong>$${example.feeBase.toFixed(2)}</strong></td></tr>
${example.lines
    .filter((l) => l.kind === 'fee' && l.amount)
    .map((l) => `<tr><th scope="row">${l.label}</th><td>&minus;$${Math.abs(l.amount).toFixed(2)}</td></tr>`)
    .join('\n')}
<tr><th scope="row"><strong>Mercari pays you</strong></th><td><strong>$${example.totals.payout.toFixed(2)}</strong></td></tr>
<tr><th scope="row">Postage you pay</th><td>&minus;$${DEFAULTS.shippingCost.toFixed(2)}</td></tr>
<tr><th scope="row">What the item cost you</th><td>&minus;$${DEFAULTS.itemCost.toFixed(2)}</td></tr>
<tr><th scope="row"><strong>You keep</strong></th><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>The fee is $${example.fees.totalFees.toFixed(2)} rather than the
$${(DEFAULTS.salePrice * platform.commission.rate).toFixed(2)} that
${(platform.commission.rate * 100).toFixed(0)}% of the item price alone would have been. The difference is
the ${(platform.commission.rate * 100).toFixed(0)}% charged on the
$${DEFAULTS.shippingCharged.toFixed(2)} of postage — $${(DEFAULTS.shippingCharged * platform.commission.rate).toFixed(2)}
on this one sale.</p>
</div>

${freeShipping ? `<h2>Does "free shipping" cost you anything here?</h2>

<p>The usual advice is to fold delivery into the item price so the listing shows free shipping. On a
platform that charges its fee on the item price alone, that would raise your fee. On Mercari it changes
nothing, because the postage was already in the base:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">Item + postage split</th><th scope="col">Delivery folded in</th></tr></thead>
<tbody>
<tr><th scope="row">Buyer pays</th><td>$${freeShipping.split.buyerTotal.toFixed(2)}</td><td>$${freeShipping.bundled.buyerTotal.toFixed(2)}</td></tr>
<tr><th scope="row">Fee charged on</th><td>$${freeShipping.split.feeBase.toFixed(2)}</td><td>$${freeShipping.bundled.feeBase.toFixed(2)}</td></tr>
<tr><th scope="row">Selling fee</th><td>&minus;$${freeShipping.split.fee.toFixed(2)}</td><td>&minus;$${freeShipping.bundled.fee.toFixed(2)}</td></tr>
<tr><th scope="row"><strong>You keep</strong></th><td><strong>$${freeShipping.split.net.toFixed(2)}</strong></td><td><strong>$${freeShipping.bundled.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>${Math.abs(freeShipping.split.net - freeShipping.bundled.net) < 0.005
    ? 'Identical, to the cent. So on Mercari the decision is purely a marketing one — free shipping may sell better, and it costs you nothing extra to offer as long as you have priced the postage in.'
    : `A difference of $${Math.abs(freeShipping.split.net - freeShipping.bundled.net).toFixed(2)}, because rounding lands differently on the two bases.`}
What it does <em>not</em> do is dodge the fee, which is the reason the tactic is usually recommended.</p>` : ''}

<h2>What Mercari keeps at every common price</h2>

<p>Item price only, no postage, so these are the clean per-item figures. Computed by the same engine as the
calculator above:</p>

<div class="table-scroll">
<table class="value-table">
<thead><tr>
  <th scope="col">Item price</th><th scope="col">Selling fee</th>
  <th scope="col">Effective rate</th><th scope="col">Mercari pays you</th>
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

<p>The effective rate is flat all the way down the column, which almost nothing else on this site manages.
No fixed fee means no penalty on cheap items: a $5 sale is charged the same
${(platform.commission.rate * 100).toFixed(0)}% as a $500 one. On eBay the same $5 sale pays over 19% once
the per-order fee is counted, and on Poshmark it pays 59%. If you sell a lot of low-value items, that is the
comparison that matters and it is the one Mercari wins comfortably.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>The Buyer Protection fee.</strong> Charged to the buyer on top of your price, so it does not
reduce your payout — but it does raise what the buyer sees. Not modelled; no structured figure for it.</li>
<li><strong>Promoted listings and Smart Offers.</strong> Both reduce your realised payout and neither is
included here.</li>
<li><strong>Mercari Local.</strong> Different mechanics and different costs.</li>
<li><strong>Sales tax.</strong> Mercari's published fee base is the item plus postage with no tax term.
This site does not model a tax component for it, which is stated rather than assumed to be zero.</li>
<li><strong>Sell-through.</strong> The biggest omission on any of these pages.</li>
<li><strong>Income tax.</strong> These are payout figures — see the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Who this is for</h2>
<p>Mercari sellers pricing an item, and anyone who read that Mercari is free for sellers and wants to know
what it actually costs now. To compare it against the alternatives, the
<a href="/ebay-vs-mercari-fees/">eBay vs Mercari page</a> takes the closest rival head-on and the
<a href="/reseller-fee-calculator/">reseller fee calculator</a> ranks nine platforms on the same sale.</p>
`,
};
