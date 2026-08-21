/**
 * etsy-fees.js — page definition for /etsy-fee-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is the free-shipping arithmetic. Etsy's search favours
 * listings with free domestic shipping, so sellers fold postage into the item
 * price. That means Etsy's 6.5% transaction fee lands on the postage too, and
 * almost nobody quantifies what that costs. This page does, with the numbers.
 */

const DEFAULTS = {
  itemPrice: 32,
  quantity: 1,
  shippingCharged: 0,
  shippingCost: 8,
  materialsCost: 9,
  giftWrap: 0,
  salesTaxCollected: 0,
  offsiteAds: false,
  highVolumeSeller: false,
  country: 'US',
  autoRenew: true,
  etsyPlus: false,
  monthlyOrders: 30,
};

export default {
  id: 'etsy-fees',
  kind: 'tool',
  calculator: 'etsy-fees',
  published: '2026-08-01',
  updated: '2026-08-01',
  defaults: DEFAULTS,

  appName: 'Etsy Fee & Profit Calculator',

  /**
   * Common sale prices, one tap each. These capture the "etsy fees on $50"
   * query family inside the tool; the matching server-rendered answers live in
   * the value sections further down the page, so the numbers exist in the HTML
   * whether or not these buttons are ever clicked.
   */
  presets: {
    field: 'itemPrice',
    label: 'How much does Etsy take from a…',
    values: [10, 20, 25, 50, 100, 200, 500, 1000],
  },

  featureList: [
    'Listing, transaction, and payment processing fees',
    'Offsite Ads at both the 15% and 12% rates, with the $100 per-order cap',
    'Transaction fee applied to shipping and gift wrap, as Etsy does',
    'Net profit, margin, and effective fee rate',
  ],

  groups: (rates) => [
    {
      legend: 'The sale',
      fields: [
        { name: 'itemPrice', label: 'Item price', prefix: '$', value: DEFAULTS.itemPrice },
        { name: 'quantity', label: 'Quantity', value: DEFAULTS.quantity, step: '1' },
        {
          name: 'shippingCharged', label: 'Shipping charged', prefix: '$', value: DEFAULTS.shippingCharged,
          help: 'Leave at $0 if you offer free shipping.',
        },
        { name: 'giftWrap', label: 'Gift wrap charged', prefix: '$', value: DEFAULTS.giftWrap },
        {
          name: 'salesTaxCollected', label: 'Sales tax collected', prefix: '$', value: DEFAULTS.salesTaxCollected,
          help: 'Etsy remits this, but processing fees still apply to it.',
        },
      ],
    },
    {
      legend: 'Your costs',
      fields: [
        { name: 'materialsCost', label: 'Materials / COGS', prefix: '$', value: DEFAULTS.materialsCost, help: 'Per unit.' },
        { name: 'shippingCost', label: 'Postage actually costs', prefix: '$', value: DEFAULTS.shippingCost },
      ],
    },
    {
      legend: 'Fees that may apply',
      fields: [
        {
          name: 'offsiteAds', label: 'This order came through an Offsite Ad', type: 'checkbox',
          value: DEFAULTS.offsiteAds, wide: true,
          help: 'Only charged on ad-attributed orders, not every sale.',
        },
        {
          name: 'highVolumeSeller', label: 'I made $10,000+ in the last 12 months', type: 'checkbox',
          value: DEFAULTS.highVolumeSeller, wide: true,
          help: 'Offsite Ads becomes mandatory but drops from 15% to 12%.',
        },
        {
          name: 'country', label: 'Bank account country', type: 'select', value: DEFAULTS.country,
          options: [
            { value: 'US', label: 'United States' },
            { value: 'GB', label: 'United Kingdom' },
            { value: 'CA', label: 'Canada' },
            { value: 'AU', label: 'Australia' },
          ],
          help: 'Processing rates follow your bank, not the buyer.',
        },
        { name: 'autoRenew', label: 'Charge the $0.20 renewal on this sale', type: 'checkbox', value: DEFAULTS.autoRenew, wide: true },
        { name: 'etsyPlus', label: 'Etsy Plus subscriber ($10/mo)', type: 'checkbox', value: DEFAULTS.etsyPlus, wide: true },
        { name: 'monthlyOrders', label: 'Orders per month', value: DEFAULTS.monthlyOrders, step: '1', help: 'Used to spread subscription costs.' },
      ],
    },
  ],

  /**
   * Answer-first block: the numeric answer inside the first 60 words, phrased
   * so it still makes sense lifted out of the page on its own. The $50 case is
   * the anchor because it is the most-searched value, and the Offsite Ads
   * variant is stated explicitly because that is the exact question people ask
   * an assistant ("if I sell for $50 with offsite ads on, what do I keep?").
   */
  answerBlock: ({ rates, valueRows, offsiteAdsAt50 }) => {
    const fifty = valueRows.find((r) => r.value === 50);
    return `
<p class="answer-block"><strong>On a $50 Etsy sale you keep $${fifty.net.toFixed(2)}. Etsy takes
$${fifty.fees.toFixed(2)}, or ${fifty.ratePct.toFixed(1)}%</strong> — a
$${rates.etsy.listingFee.amount.toFixed(2)} listing fee, a
${(rates.etsy.transactionFee.rate * 100).toFixed(1)}% transaction fee, and
${(rates.etsy.paymentProcessing.US.rate * 100).toFixed(0)}% + $${rates.etsy.paymentProcessing.US.fixed.toFixed(2)}
payment processing. If that order came through an Offsite Ad, Etsy takes
$${offsiteAdsAt50.fees.toFixed(2)} instead and you keep
<strong>$${offsiteAdsAt50.net.toFixed(2)}</strong>. Rates effective ${rates.etsy.effective}.</p>`;
  },

  faqs: ({ example, rates, valueRows, offsiteAdsAt50 }) => [
    {
      // Phrased as the query, not as a topic. Figures come from valueRows so
      // this answer moves with the rate file rather than going stale.
      q: 'How much does Etsy take from a $20 sale?',
      a: (() => {
        const r = valueRows.find((x) => x.value === 20);
        const fifty = valueRows.find((x) => x.value === 50);
        return `<p>Etsy takes <strong>$${r.fees.toFixed(2)}</strong> from a $20 sale, leaving you $${r.net.toFixed(2)} before your own costs. That is ${r.ratePct.toFixed(1)}% — noticeably higher than the ${fifty.ratePct.toFixed(1)}% it takes on a $50 sale, because the $${rates.etsy.listingFee.amount.toFixed(2)} listing fee and the $${rates.etsy.paymentProcessing.US.fixed.toFixed(2)} fixed processing charge are the same on both, and they weigh far more heavily on a small order.</p>`;
      })(),
    },
    {
      q: "What are all of Etsy's seller fees in 2026?",
      a: `<p>Five, for a US seller. A $${rates.etsy.listingFee.amount.toFixed(2)} listing fee per listing per ${rates.etsy.listingFee.renewalMonths} months; a ${(rates.etsy.transactionFee.rate * 100).toFixed(1)}% transaction fee on item price plus shipping and gift wrap; payment processing of ${(rates.etsy.paymentProcessing.US.rate * 100).toFixed(0)}% + $${rates.etsy.paymentProcessing.US.fixed.toFixed(2)}; Offsite Ads at ${(rates.etsy.offsiteAds.standardRate * 100).toFixed(0)}% or ${(rates.etsy.offsiteAds.highVolumeRate * 100).toFixed(0)}% on ad-attributed orders only; and ${(rates.etsy.currencyConversion.rate * 100).toFixed(1)}% currency conversion if your listing and bank currencies differ. Etsy Plus at $${rates.etsy.subscriptions.etsyPlusMonthly.toFixed(2)} a month is optional.</p>`,
    },
    {
      q: 'Is Etsy cheaper than Shopify for a small shop?',
      a: `<p>At low volume, yes. Etsy charges no monthly fee, so a shop selling ten $25 items a month pays fees only on what it sells. Shopify's Basic plan costs $${rates.shopify.plans[0].monthlyMonthly} a month before a single sale, and its card rate is ${(rates.shopify.plans[0].online.rate * 100).toFixed(1)}% + $${rates.shopify.plans[0].online.fixed.toFixed(2)} against Etsy's combined ${(rates.etsy.transactionFee.rate * 100).toFixed(1)}% + ${(rates.etsy.paymentProcessing.US.rate * 100).toFixed(0)}%. The crossover comes from volume, not rate: Shopify's fixed cost amortises away as orders rise, and it brings no marketplace traffic of its own.</p>`,
    },
    {
      q: 'How do I calculate my Etsy profit margin after fees?',
      a: `<p>Subtract Etsy's fees, your materials cost and your actual postage from what the buyer paid, then divide that by what the buyer paid. On the worked example above the margin is ${(example.totals.margin * 100).toFixed(1)}%. The mistake to avoid is dividing by the item price instead of the full order total — that inflates the figure, because Etsy charges its transaction fee on shipping and gift wrap as well.</p>`,
    },
    {
      q: 'Does Etsy charge fees on shipping?',
      a: `<p>Yes. Etsy's transaction fee applies to the total order value — item price plus the shipping and gift wrap you charge the buyer. This is the single most misunderstood Etsy fee. If you charge $32 for an item and $8 for postage, the transaction fee is 6.5% of $40, not of $32. Folding postage into the item price to offer "free shipping" does not avoid it, because the fee simply lands on the larger item price instead.</p>`,
    },
    {
      q: 'What is the Etsy Offsite Ads fee and can I opt out?',
      a: `<p>It is ${(rates.etsy.offsiteAds.standardRate * 100).toFixed(0)}% of the order total, or ${(rates.etsy.offsiteAds.highVolumeRate * 100).toFixed(0)}% once your shop passes $${rates.etsy.offsiteAds.highVolumeThreshold.toLocaleString('en-US')} in trailing sales, capped at $${rates.etsy.offsiteAds.capPerOrder} per order. On a $50 sale it turns $${valueRows.find((x) => x.value === 50).fees.toFixed(2)} of fees into $${offsiteAdsAt50.fees.toFixed(2)}.</p>
<p>You can opt out only below $10,000 in trailing 12-month sales. Under that threshold participation is optional and the rate is 15% if you stay in. At or above $10,000 participation becomes mandatory, but the rate falls to 12% and there is a $100 cap per order. Crossing the threshold is therefore a mixed event: you lose the ability to opt out, but every ad-attributed order becomes 3 percentage points cheaper.</p>
<p>Worth being precise about what triggers it: the fee applies only when a buyer clicks an Etsy-purchased ad and then orders from your shop within 30 days. It is not charged on organic sales, so your blended fee rate across all orders sits well below the headline number.</p>`,
    },
    {
      q: 'What is the $0.20 listing fee actually for?',
      a: `<p>It buys four months of listing time. You pay it when you publish, then again every four months if the listing auto-renews, and again each time a multi-quantity listing sells a unit. A listing that sits unsold for a year costs $0.60 before it earns anything. For a shop with 200 listings that is $120 a year in renewals regardless of sales — a real fixed cost that most Etsy fee calculators ignore entirely.</p>`,
    },
    {
      q: 'Is Etsy Plus worth $10 a month?',
      a: `<p>It includes 15 listing credits (a $3.00 value) and $5 of Etsy Ads credit, so roughly $8 of the $10 comes back as credits if you would have spent both anyway. The remaining value is in custom shop banners and restock requests. If you are not already spending $5 a month on Etsy Ads and publishing 15+ listings a month, you are paying for features rather than credits.</p>`,
    },
    {
      q: 'Why is my payout lower than this calculator shows?',
      a: `<p>Most often one of three things. First, currency conversion: if your listings are in a currency other than your bank account's, Etsy adds 2.5%. Second, a regulatory operating fee, which applies to sellers in the UK, France, Italy, Spain, and Turkey but not the US. Third, Etsy Ads — separate from Offsite Ads, this is your own chosen daily budget and is billed regardless of whether a sale results.</p>`,
    },
    {
      q: 'How much do I need to charge to make a specific profit?',
      a: `<p>Work backwards: your target profit plus your materials cost plus your actual postage, then divide by roughly 0.90 to cover the 6.5% transaction fee and 3% processing, and add about $0.45 for the fixed listing and processing components. On a $9 materials cost and $8 postage with a $15 profit target, that is ($15 + $9 + $8) ÷ 0.90 + $0.45 ≈ <strong>$36</strong>. Enter that in the calculator above to check it against the exact fee schedule.</p>`,
    },
  ],

  content: ({ example, rates, freeShippingComparison, valueSections }) => `
${valueSections}

<h2>How Etsy's fees are calculated</h2>

<p>Four fees, applied in a specific order to bases that are not the same. That last part is where the
confusion lives — the transaction fee and the processing fee are charged on different amounts.</p>

<div class="formula">listing fee      = $${rates.etsy.listingFee.amount.toFixed(2)} flat, per listing per ${rates.etsy.listingFee.renewalMonths} months
transaction fee  = ${(rates.etsy.transactionFee.rate * 100).toFixed(1)}% × (item price + shipping charged + gift wrap)
processing fee   = ${(rates.etsy.paymentProcessing.US.rate * 100).toFixed(0)}% × (item + shipping + gift wrap + sales tax) + $${rates.etsy.paymentProcessing.US.fixed.toFixed(2)}
offsite ads      = ${(rates.etsy.offsiteAds.standardRate * 100).toFixed(0)}% or ${(rates.etsy.offsiteAds.highVolumeRate * 100).toFixed(0)}% × order total, capped at $${rates.etsy.offsiteAds.capPerOrder}
                   (ad-attributed orders only)</div>

<p>The transaction fee base excludes sales tax; the payment processing base includes it. Etsy collects and
remits sales tax on your behalf under marketplace facilitator rules, so it never becomes your money — but
you still pay processing on it.</p>

<h2>The free shipping trap, with the actual arithmetic</h2>

<p>Etsy's search ranking favours listings with free domestic shipping, so the standard advice is to fold
postage into the item price. That advice is sound for visibility and it has a cost nobody quantifies. Here
is the same product priced both ways, with $${DEFAULTS.shippingCost} of real postage:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Approach</th>
  <th scope="col">Item price</th>
  <th scope="col">Shipping charged</th>
  <th scope="col">Etsy's cut</th>
  <th scope="col">You keep</th>
</tr></thead>
<tbody>
<tr>
  <td>Charge shipping separately</td>
  <td>$${(DEFAULTS.itemPrice - DEFAULTS.shippingCost).toFixed(2)}</td>
  <td>$${DEFAULTS.shippingCost.toFixed(2)}</td>
  <td>$${freeShippingComparison.separate.fees.toFixed(2)}</td>
  <td>$${freeShippingComparison.separate.net.toFixed(2)}</td>
</tr>
<tr>
  <td>"Free" shipping, price raised</td>
  <td>$${DEFAULTS.itemPrice.toFixed(2)}</td>
  <td>$0.00</td>
  <td>$${freeShippingComparison.bundled.fees.toFixed(2)}</td>
  <td>$${freeShippingComparison.bundled.net.toFixed(2)}</td>
</tr>
</tbody>
</table>
</div>

<p>The buyer pays $${DEFAULTS.itemPrice.toFixed(2)} either way and you post the same parcel either way. The
difference in what you keep is <strong>$${Math.abs(freeShippingComparison.delta).toFixed(2)}</strong>, because
Etsy's fees land on the same total regardless of how you split it. That is the honest answer to "does free
shipping cost me anything" — structurally, almost nothing. The real cost of free shipping is that sellers
often <em>forget</em> to raise the item price to cover the postage, and absorb $${DEFAULTS.shippingCost}
straight out of margin.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.itemPrice} handmade item, free shipping, $${DEFAULTS.shippingCost} to post</h3>
<p>Materials cost $${DEFAULTS.materialsCost}. The seller is under the $10,000 Offsite Ads threshold and this
order came in organically, so no ads fee applies.</p>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Order total</td><td>item + shipping charged</td><td>$${DEFAULTS.itemPrice.toFixed(2)}</td></tr>
<tr><td>Listing fee</td><td>flat</td><td>−$${rates.etsy.listingFee.amount.toFixed(2)}</td></tr>
<tr><td>Transaction fee</td><td>${(rates.etsy.transactionFee.rate * 100).toFixed(1)}% × $${DEFAULTS.itemPrice.toFixed(2)}</td><td>−$${(DEFAULTS.itemPrice * rates.etsy.transactionFee.rate).toFixed(2)}</td></tr>
<tr><td>Payment processing</td><td>${(rates.etsy.paymentProcessing.US.rate * 100).toFixed(0)}% × $${DEFAULTS.itemPrice.toFixed(2)} + $${rates.etsy.paymentProcessing.US.fixed.toFixed(2)}</td><td>−$${(DEFAULTS.itemPrice * rates.etsy.paymentProcessing.US.rate + rates.etsy.paymentProcessing.US.fixed).toFixed(2)}</td></tr>
<tr><td><strong>Etsy takes</strong></td><td>${(example.totals.effectiveFeeRate * 100).toFixed(1)}% of the order</td><td><strong>−$${example.totals.fees.toFixed(2)}</strong></td></tr>
<tr><td>Materials</td><td>your cost</td><td>−$${DEFAULTS.materialsCost.toFixed(2)}</td></tr>
<tr><td>Postage</td><td>what you actually pay</td><td>−$${DEFAULTS.shippingCost.toFixed(2)}</td></tr>
<tr><td><strong>Your profit</strong></td><td>${(example.totals.margin * 100).toFixed(1)}% margin</td><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>
<p>If that same order had arrived through an Offsite Ad, a further 15% — $${(DEFAULTS.itemPrice * 0.15).toFixed(2)} —
would come off, taking the profit to $${(example.totals.net - DEFAULTS.itemPrice * 0.15).toFixed(2)}. That is
the number worth stress-testing your pricing against, because you cannot control which orders arrive that way.</p>
</div>

<h2>Who this is for</h2>
<p>Etsy sellers pricing a new product, and sellers trying to work out why a shop with respectable revenue
produces so little profit. It is most useful when you run the same item through it twice — once as an
organic sale, once with Offsite Ads ticked. If the second version is a loss, your price is too low to
survive the traffic Etsy sends you, and no amount of volume fixes that.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Etsy Ads</strong> — your own daily-budget advertising, separate from Offsite Ads and charged
whether or not a sale results.</li>
<li><strong>Your time.</strong> For handmade sellers this is the largest uncosted input by a wide margin. A
$${example.totals.net.toFixed(2)} profit on a piece that takes three hours is $${(example.totals.net / 3).toFixed(2)} an hour
before you account for the unpaid hours spent listing, photographing, and answering messages.</li>
<li><strong>Returns, refunds, and lost parcels</strong>, which fall on the seller.</li>
<li><strong>Currency conversion</strong> at ${(rates.etsy.currencyConversion.rate * 100).toFixed(1)}% when your listing
and bank currencies differ.</li>
<li><strong>The regulatory operating fee</strong>, which applies to sellers in the UK, France, Italy, Spain,
and Turkey. US sellers are not charged it.</li>
<li><strong>Income tax.</strong> Etsy issues a 1099-K and the profit above is pre-tax. See the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Sources and dates</h2>
<p>All rates come from Etsy's own fees and payments policy and Offsite Ads help pages, listed below with the
date each was checked. Etsy has changed its transaction fee once since 2018 (from 5% to 6.5% in April 2022)
and adjusts Offsite Ads thresholds periodically. If a figure here disagrees with your Etsy payment account,
trust Etsy and <a href="/contact/">let us know</a>.</p>
`,
};
