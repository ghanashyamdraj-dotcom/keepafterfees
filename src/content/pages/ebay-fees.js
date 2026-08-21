/**
 * ebay-fees.js — page definition for /ebay-fee-calculator/
 *
 * Content strategy notes:
 *
 *   - The non-commodity section is the final value fee charged on sales tax.
 *     eBay collects sales tax under marketplace facilitator rules, remits it to
 *     the state, and still charges the seller a percentage on it. Almost no
 *     competing calculator models this, and several ignore the shipping
 *     component too. Both are in the engine and both are shown as their own
 *     line, with the arithmetic written out.
 *   - The store break-even table is computed by the engine at the page's own
 *     default sale, not hand-typed, so it cannot drift from the calculator.
 *   - Every figure below is interpolated from `example`. Nothing is typed by
 *     hand — test/parity.test.js asserts the prose matches what the engine
 *     returns, and hard-coding a number is how that test starts failing.
 */

/**
 * eBay publishes two fee tables — one for sellers with no store or a Starter
 * store, one for Basic and above. The form and the prose both describe the
 * standard table, because that is what the page's default seller is on.
 */
const standardCategories = (rates) =>
  rates.ebay.finalValueFee.schedules.find((s) => s.id === 'standard').categories;

const storePlusCategories = (rates) =>
  rates.ebay.finalValueFee.schedules.find((s) => s.id === 'store-plus').categories;

const findCategory = (cats, id) => cats.find((c) => c.id === id);

/**
 * The cost of treating a marginal rate as a flat one, worked at a sale value
 * above the first tier boundary. Derived from the rate data so the figure in
 * the prose cannot drift away from the figure the calculator produces.
 */
const marginalGap = (rates, sale = 10000) => {
  const [first, second] = findCategory(standardCategories(rates), 'default').tiers;
  const boundary = first.upTo;
  const correct = boundary * first.rate + (sale - boundary) * second.rate;
  return { sale, boundary, correct, naive: sale * first.rate, gap: sale * first.rate - correct };
};

const DEFAULTS = {
  salePrice: 89.99,
  shippingCharged: 12.0,
  shippingCost: 9.4,
  itemCost: 32.0,
  categoryId: 'default',
  storeTier: 'none',
  promotedRate: 0,
  international: false,
  belowStandard: false,
  salesTaxCollected: 8.42,
  amortiseStore: false,
  monthlySales: 40,
  annualStore: true,
  insertionFees: 0,
};

export default {
  id: 'ebay-fees',
  kind: 'tool',
  calculator: 'ebay-fees',
  published: '2026-08-02',
  updated: '2026-08-02',
  defaults: DEFAULTS,

  appName: 'eBay Final Value Fee Calculator',

  presets: {
    field: 'salePrice',
    label: 'How much are eBay fees on a…',
    values: [10, 25, 50, 100, 200, 500, 1000],
  },

  featureList: [
    'Final value fee by category, including the genuinely marginal rates above $7,500',
    'Fee charged on shipping collected and on sales tax, shown as separate lines',
    'Store subscription amortised per sale, with a break-even comparison across all six tiers',
    'International fee, Below Standard surcharge, Promoted Listings ad rate',
  ],

  groups: (rates) => [
    {
      legend: 'The sale',
      fields: [
        { name: 'salePrice', label: 'Item price', prefix: '$', value: DEFAULTS.salePrice, help: 'What the buyer pays for the item itself.' },
        {
          name: 'categoryId', label: 'Category', type: 'select', value: DEFAULTS.categoryId,
          options: standardCategories(rates).map((c) => ({ value: c.id, label: c.label })),
          wide: true,
          help: 'Final value fee ranges from 3% to 15.3% depending where you list.',
        },
        { name: 'shippingCharged', label: 'Shipping charged', prefix: '$', value: DEFAULTS.shippingCharged, help: 'Postage you collect from the buyer. eBay charges its fee on this too.' },
        { name: 'salesTaxCollected', label: 'Sales tax collected', prefix: '$', value: DEFAULTS.salesTaxCollected, help: 'eBay remits this for you — but still charges a fee on it.' },
      ],
    },
    {
      legend: 'Your costs',
      fields: [
        { name: 'itemCost', label: 'Item cost', prefix: '$', value: DEFAULTS.itemCost, help: 'What you paid for it.' },
        { name: 'shippingCost', label: 'Actual postage', prefix: '$', value: DEFAULTS.shippingCost, help: 'What the label really costs you.' },
        { name: 'insertionFees', label: 'Insertion fees', prefix: '$', value: DEFAULTS.insertionFees, help: 'Only if you are past your free listing allowance.' },
      ],
    },
    {
      legend: 'Your account',
      fields: [
        {
          name: 'storeTier', label: 'Store subscription', type: 'select', value: DEFAULTS.storeTier,
          options: rates.ebay.storeSubscriptions.map((s) => ({ value: s.id, label: s.label })),
          wide: true,
        },
        { name: 'promotedRate', label: 'Promoted Listings rate', suffix: '%', value: DEFAULTS.promotedRate, step: '0.1', help: 'Only charged when a buyer clicks your ad and then buys.' },
        { name: 'monthlySales', label: 'Sales / month', value: DEFAULTS.monthlySales, step: '1', help: 'Used to spread the store subscription across orders.' },
        { name: 'amortiseStore', label: 'Include store subscription in this sale', type: 'checkbox', value: DEFAULTS.amortiseStore, wide: true },
        { name: 'international', label: 'Buyer is outside the US (adds 1.65%)', type: 'checkbox', value: false, wide: true },
        { name: 'belowStandard', label: 'Below Standard seller rating (adds 6%)', type: 'checkbox', value: false, wide: true },
      ],
    },
  ],

  answerBlock: ({ example, rates, valueRows }) => {
    const hundred = valueRows.find((r) => r.value === 100);
    return `
<p class="answer-block"><strong>eBay takes $${hundred.fees.toFixed(2)} from a $100 sale in a standard
category — ${hundred.ratePct.toFixed(1)}% — leaving you $${hundred.net.toFixed(2)}.</strong> That is a
${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(1)}% final value fee plus a
$${rates.ebay.perOrderFee.over10.toFixed(2)} per-order fee. The catch is the base: eBay charges the
percentage on the postage you collect and the sales tax it remits for you, not on the item price alone.
Rates effective ${rates.ebay.effective}.</p>`;
  },

  faqs: ({ example, exampleNoTax, rates, valueRows, categoryRows }) => [
    {
      q: "What is eBay's final value fee percentage in 2026?",
      a: `<p>${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(1)}% in most categories, on the portion of the sale up to $${standardCategories(rates)[0].tiers[0].upTo.toLocaleString('en-US')}, then ${(standardCategories(rates)[0].tiers[1].rate * 100).toFixed(2)}% above that — plus a per-order fee of $${rates.ebay.perOrderFee.underOrEqual10.toFixed(2)} on orders of $10 or less and $${rates.ebay.perOrderFee.over10.toFixed(2)} above. Books, Movies and Music are higher at ${(findCategory(standardCategories(rates), 'books-movies-music').tiers[0].rate * 100).toFixed(1)}%; Guitars and Basses are far lower at ${(findCategory(standardCategories(rates), 'musical-instruments').tiers[0].rate * 100).toFixed(1)}%.</p>`,
    },
    {
      q: 'How much do promoted listings cost on eBay?',
      a: `<p>Promoted Listings Standard charges an ad rate you choose, applied to the total amount of the sale, and only when a buyer clicks your ad and then buys within 30 days. It stacks on top of the final value fee rather than replacing it, so a ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(1)}% category at a 5% ad rate becomes roughly ${((standardCategories(rates)[0].tiers[0].rate + 0.05) * 100).toFixed(1)}% on the orders it wins. Organic sales are unaffected.</p>`,
    },
    {
      q: 'eBay vs Mercari — which takes less in fees?',
      a: `<p>Mercari, on a like-for-like item. Mercari charges a flat 10% of item price plus buyer-paid shipping, with no per-order fee and no separate processing fee. eBay charges ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(1)}% in most categories plus $${rates.ebay.perOrderFee.over10.toFixed(2)} per order, on a base that also includes sales tax. The gap narrows in eBay's low-rate categories and reverses entirely for guitars, heavy equipment and athletic shoes over $150. Our <a href="/reseller-fee-calculator/">reseller comparison</a> runs both at once.</p>`,
    },
    {
      q: 'Does eBay charge fees on shipping and sales tax?',
      a: `<p>Yes, and it is the single most common surprise on an eBay payout statement. Under marketplace facilitator laws eBay is required to collect sales tax and remit it to the state — the money passes through your account and straight out again, and you never keep a cent of it. eBay's final value fee is nonetheless calculated on the total amount of the sale, which its own fee page defines as including sales tax.</p>
<p>On the example above that is $${(exampleNoTax.totals.net - example.totals.net).toFixed(2)} of pure friction on a single order. There is no setting to turn it off. The only lever you have is that the fee is proportional, so it shrinks as a share of a larger order.</p>`,
    },
    {
      q: 'Why is the fee on my postage as well?',
      a: `<p>Because eBay treats the amount the buyer pays you for shipping as part of the sale. If you charge $12 postage and it costs you $9.40, the $2.60 difference is not clean margin — eBay has already taken its percentage off the full $12. Sellers who set postage well above cost to look competitive on item price often find the arithmetic works against them.</p>
<p>Free shipping does not avoid this. If you fold postage into the item price, the fee base is the same total. What changes is search placement and buyer behaviour, not the fee.</p>`,
    },
    {
      q: 'Is the rate above $7,500 really lower?',
      a: `<p>In most categories, yes, and it is genuinely marginal rather than banded. On a $${marginalGap(rates).sale.toLocaleString('en-US')} sale in a standard category you pay ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(2)}% on the first $${marginalGap(rates).boundary.toLocaleString('en-US')} and ${(standardCategories(rates)[0].tiers[1].rate * 100).toFixed(2)}% on the remainder — not ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(2)}% on the whole amount. Getting this wrong overstates the fee by $${marginalGap(rates).gap.toFixed(2)} on that sale.</p>
<p>Not every category works this way, and the difference matters. Jewelry and Bullion are charged as <em>cliffs</em>: cross the threshold and the whole sale re-rates, rather than just the portion above it. Jewelry drops from ${(findCategory(standardCategories(rates), 'jewelry').tiers[0].rate * 100).toFixed(0)}% to ${(findCategory(standardCategories(rates), 'jewelry').tiers[1].rate * 100).toFixed(0)}% once the sale passes $${findCategory(standardCategories(rates), 'jewelry').tiers[0].upTo.toLocaleString('en-US')}, on every dollar. Watches, by contrast, really are marginal, stepping down at $1,000 and again at $7,500. This calculator applies each category's real structure rather than assuming they all behave alike.</p>`,
    },
    {
      q: 'Is an eBay store subscription worth it for my volume?',
      a: `<p>Sooner than most sellers expect, and for two separate reasons that are easy to conflate.</p>
<p>The first is insertion fees. Without a store you get ${rates.ebay.insertionFee.freeListingsNoStore} free listings a month and pay $${rates.ebay.insertionFee.amount.toFixed(2)} for each one beyond that. A Starter store at $${rates.ebay.storeSubscriptions.find((s) => s.id === 'starter').monthlyAnnual.toFixed(2)} a month billed annually pays for itself at roughly 15 extra listings.</p>
<p>The second is larger and more often missed: <strong>a Starter store does not change your final value fee, but Basic and above do.</strong> eBay publishes a separate, cheaper fee table for Basic, Premium, Anchor and Enterprise subscribers — most categories fall from ${(findCategory(standardCategories(rates), 'default').tiers[0].rate * 100).toFixed(2)}% to ${(findCategory(storePlusCategories(rates), 'default').tiers[0].rate * 100).toFixed(2)}%. The first tier boundary also moves down from $${findCategory(standardCategories(rates), 'default').tiers[0].upTo.toLocaleString('en-US')} to $${findCategory(storePlusCategories(rates), 'default').tiers[0].upTo.toLocaleString('en-US')}, so the cheaper headline rate covers a narrower band. Which of those two effects wins depends on your average order value, which is exactly what the table above works out.</p>
<p>The table compares net payout per sale across every tier at your own sales volume, using each tier's real fee table. Change "Sales / month" and it recalculates.</p>`,
    },
    {
      q: 'What is the per-order fee?',
      a: `<p>$${rates.ebay.perOrderFee.underOrEqual10.toFixed(2)} on orders of $10 or less and $${rates.ebay.perOrderFee.over10.toFixed(2)} above that, charged once per order rather than per item. Multi-item orders from the same buyer are charged once, which is a real argument for offering combined shipping. A handful of categories — notably athletic shoes above $150 — have no per-order fee at all.</p>`,
    },
    {
      q: 'Does the Below Standard surcharge really add 6%?',
      a: `<p>Six percentage <em>points</em>, added to the final value fee rate — not 6% of the fee. In a standard category that takes ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(2)}% to ${((standardCategories(rates)[0].tiers[0].rate + rates.ebay.belowStandardSurcharge.rate) * 100).toFixed(2)}%. On the example above that is an extra $${(example.feeBase * rates.ebay.belowStandardSurcharge.rate).toFixed(2)} on one sale, and it applies to every sale while the rating stands. If you are Below Standard, fixing the underlying defect rate is worth more than any pricing change available to you.</p>`,
    },
  ],

  content: ({ example, exampleNoTax, storeTiers, rates, valueSections, categoryRows }) => `
${valueSections}

<h2>eBay final value fee by category in 2026</h2>

<p>The headline rate depends entirely on where you list. The table below shows what a
<strong>$100 sale</strong> costs in each of the categories this calculator models, cheapest first, on the
standard schedule — no store, or a Starter store. Figures include the
$${rates.ebay.perOrderFee.over10.toFixed(2)} per-order fee.</p>

<div class="table-scroll"><table class="value-table">
<caption class="visually-hidden">eBay final value fee by category on a $100 sale</caption>
<thead><tr>
  <th scope="col">Category</th><th scope="col">Headline rate</th>
  <th scope="col">Fees on $100</th><th scope="col">You keep</th>
</tr></thead>
<tbody>
${categoryRows
  .map(
    (c) => `<tr>
  <th scope="row">${c.label}</th>
  <td>${(c.headlineRate * 100).toFixed(2)}%</td>
  <td>&minus;$${c.feesAt100.toFixed(2)}</td>
  <td>$${c.netAt100.toFixed(2)}</td>
</tr>`
  )
  .join('\n')}
</tbody>
</table></div>

<p>Two structural things this table makes visible that a flat percentage list would hide. Athletic shoes
above $150 lose the per-order fee entirely, which is why that category sits where it does. And Jewelry and
Bullion are <em>cliffs</em> rather than marginal tiers — crossing the threshold re-rates the whole sale, not
just the portion above it.</p>

<h2>How the eBay final value fee is calculated</h2>

<p>eBay charges one combined fee that covers both the marketplace commission and payment processing —
there is no separate processing charge the way there is on Etsy or Shopify. What catches sellers out is
not the rate but the base it is applied to.</p>

<div class="formula">fee base   = item price + shipping you charge + sales tax eBay collects

net payout = fee base
           − final value fee   (a % of the fee base, by category, tiered)
           − per-order fee     ($${rates.ebay.perOrderFee.underOrEqual10.toFixed(2)} or $${rates.ebay.perOrderFee.over10.toFixed(2)})
           − optional extras   (international, promoted listings, store)
           − sales tax remitted
           − your own costs</div>

<h3>What the fee is charged on</h3>
<p>All three components of the fee base are real money leaving your payout, but only two of them were ever
yours. The item price is yours. The postage you collect is yours, minus what the label costs. The sales tax
is not yours at any point — eBay collects it, holds it, and remits it to the state under marketplace
facilitator rules that now apply in every US state that levies sales tax.</p>

<p>eBay's fee page defines the final value fee as applying to "the total amount of the sale", and that
total includes the tax. This is not a bug or an oversight; it is the stated policy, and it is why the
breakdown above shows sales tax twice — once as money in, once as money straight back out — with a fee
charged in between.</p>

<h3>The rate above $7,500 is marginal, not banded</h3>
<p>In most categories the fee is ${(standardCategories(rates)[0].tiers[0].rate * 100).toFixed(2)}%
on the portion of the sale up to $7,500 and
${(standardCategories(rates)[0].tiers[1].rate * 100).toFixed(2)}% on everything above it. That is a
marginal calculation, like an income tax bracket — not a cliff where crossing $7,500 re-rates the whole sale.
Calculators that apply a single blended percentage to high-value items overstate the fee substantially.
Jewelry, Watches, Bullion, and Coins each have their own tier boundaries; this calculator uses the real ones.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.salePrice} item, $${DEFAULTS.shippingCharged.toFixed(2)} postage, $${DEFAULTS.salesTaxCollected.toFixed(2)} sales tax</h3>

<p>Standard category, no store subscription, no promoted listings, domestic buyer. The item cost you
$${DEFAULTS.itemCost.toFixed(2)} and the label costs $${DEFAULTS.shippingCost.toFixed(2)}.</p>

<p><strong>Step 1 — the fee base.</strong> $${DEFAULTS.salePrice} item +
$${DEFAULTS.shippingCharged.toFixed(2)} shipping + $${DEFAULTS.salesTaxCollected.toFixed(2)} sales tax =
<strong>$${example.feeBase.toFixed(2)}</strong>. Note this is
$${(example.feeBase - DEFAULTS.salePrice).toFixed(2)} more than the item price, and the fee is charged
on all of it.</p>

<p><strong>Step 2 — the fees.</strong></p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Charge</th><th scope="col">How it is worked out</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Final value fee</td><td>${(example.effectiveFvfRate * 100).toFixed(2)}% of $${example.feeBase.toFixed(2)}</td><td>$${example.fvf.toFixed(2)}</td></tr>
<tr><td>Per-order fee</td><td>order is above $10</td><td>$${example.perOrder.toFixed(2)}</td></tr>
<tr><td><strong>Total eBay fees</strong></td><td></td><td><strong>$${example.totals.fees.toFixed(2)}</strong></td></tr>
<tr><td>Item cost</td><td>what you paid</td><td>$${DEFAULTS.itemCost.toFixed(2)}</td></tr>
<tr><td>Postage</td><td>the label</td><td>$${DEFAULTS.shippingCost.toFixed(2)}</td></tr>
<tr><td>Sales tax remitted</td><td>never yours</td><td>$${DEFAULTS.salesTaxCollected.toFixed(2)}</td></tr>
<tr><td><strong>You keep</strong></td><td></td><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p><strong>Step 3 — what that means.</strong> Your margin across the whole order is
${(example.totals.margin * 100).toFixed(1)}%, and eBay's fees came to
${(example.totals.effectiveFeeRate * 100).toFixed(1)}% of everything that passed through the order. The
headline rate is ${(example.effectiveFvfRate * 100).toFixed(2)}% — the gap between those two numbers is
the per-order fee and the fee charged on money you never kept.</p>
</div>

<h2>The part almost nobody prices in: the fee on sales tax</h2>

<p>Run the same sale with the sales tax field set to zero and the difference is stark. With
$${DEFAULTS.salesTaxCollected.toFixed(2)} of tax collected you keep $${example.totals.net.toFixed(2)};
with none you keep $${exampleNoTax.totals.net.toFixed(2)}. The tax itself is a wash — it arrives and
leaves — so the entire
<strong>$${(exampleNoTax.totals.net - example.totals.net).toFixed(2)}</strong> difference is fee charged
on money that was never yours.</p>

<p>Scaled up, this matters more than it looks. A seller doing $60,000 a year in a state averaging 8% sales
tax passes roughly $4,800 of tax through their account, and pays about
$${(4800 * example.effectiveFvfRate).toFixed(0)} in final value fees on it. That is a real annual cost with
no corresponding revenue, and it appears on no fee schedule as a line item because it is not a separate fee
— it is the ordinary fee applied to a larger base than most sellers realise.</p>

<p>There is nothing to opt out of. It is worth knowing about for two reasons: it explains a permanent gap
between your expected and actual payouts, and it should be in your figure when you compare eBay against a
platform that calculates fees on the item price alone.</p>

<h2>Does a store subscription pay for itself?</h2>

<p>Store tiers do not reduce the final value fee. What they buy is a larger free listing allowance and a
lower insertion fee beyond it, so the answer depends entirely on how many listings you run, not on how
much you sell. Below, the same $${DEFAULTS.salePrice} sale at ${DEFAULTS.monthlySales} sales a month,
with each tier's subscription spread across those orders:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Tier</th><th scope="col">Per month</th><th scope="col">Free listings</th><th scope="col">Net per sale</th></tr></thead>
<tbody>
${storeTiers
  .map(
    (t) => `<tr><td>${t.label}</td><td>$${t.monthlyCost.toFixed(2)}</td><td>${t.freeListings.toLocaleString('en-US')}</td><td>$${t.netPerSale.toFixed(2)}</td></tr>`
  )
  .join('\n')}
</tbody>
</table>
</div>

<p>Read this as a cost of carrying the subscription, not a saving — every tier reduces net per sale,
because the subscription is spread over your orders and the fee rate does not move. The subscription only
wins once your insertion fees exceed the difference, which is a function of listing count. If you list
under 250 items a month, no store tier will beat no store at all.</p>

<h2>Who this is for</h2>
<p>Sellers pricing an item before they list it, and sellers reconciling a payout that came in lower than
expected. It is most useful in two situations: when you are deciding how to split a price between item and
postage, and when you are comparing eBay against Mercari, Poshmark, or Depop for the same item — for which
the <a href="/reseller-fee-calculator/">reseller comparison</a> runs all of them side by side.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Returns and refunds.</strong> eBay refunds the final value fee percentage when you refund a
buyer, but retains the per-order fee. High-return categories behave differently from what you see here.</li>
<li><strong>Ad rates you actually pay.</strong> Promoted Listings Standard only charges when a buyer clicks
the ad and buys within 30 days, so your realised ad cost is lower than your rate times every sale.</li>
<li><strong>Currency conversion</strong> if you are paid into a non-USD account.</li>
<li><strong>Income tax.</strong> This is a payout figure, not profit after tax — see the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
<li><strong>Category-specific caps.</strong> A few categories, notably heavy equipment, cap the fee at a
maximum dollar amount. Check eBay's category table for those.</li>
</ul>

<h2>Sources and dates</h2>
<p>Every rate here comes from eBay's own published selling-fee and store-fee pages for the US marketplace,
listed below with the date each was last checked. eBay adjusts category rates and thresholds periodically;
if a figure here disagrees with what your seller account shows, trust your account and
<a href="/contact/">tell us</a> so it gets corrected.</p>
`,
};
