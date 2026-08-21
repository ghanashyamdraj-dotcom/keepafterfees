/**
 * amazon-fba.js — page definition for /amazon-fba-calculator/
 *
 * Content strategy notes, so the next person editing this understands the
 * constraints it was written under:
 *
 *   - The worked example uses ONE consistent product all the way through, with
 *     real dimensions and real arithmetic that matches what the engine outputs.
 *     Section 4.2 of the build spec: supply a number, a scenario, a date, a
 *     named authority, and a method. A made-up example that does not reconcile
 *     with the calculator is worse than no example.
 *   - The dimensional-weight section is the non-commodity part. Almost no
 *     competing FBA calculator explains why a light bulky item is billed as
 *     heavy, and it is the single most common reason a seller's real fee does
 *     not match their estimate.
 *   - Every rate is attributed to Amazon's own Seller Central page.
 */

import { categoryOptions } from '../../lib/calc/amazon.js';

const DEFAULTS = {
  salePrice: 29.99,
  productCost: 7.5,
  shipToAmazon: 0.85,
  otherCosts: 0.4,
  categoryId: 'home-kitchen',
  lengthIn: 9,
  widthIn: 6,
  heightIn: 3,
  weightOz: 12,
  storageMonths: 2,
  storageQuarter: 'janSep',
  monthlyUnits: 150,
  professionalPlan: true,
  isApparel: false,
  isDangerousGoods: false,
  units: 1,
};

export default {
  id: 'amazon-fba',
  kind: 'tool',
  calculator: 'amazon-fba',
  published: '2026-08-01',
  updated: '2026-08-01',
  defaults: DEFAULTS,

  appName: 'Amazon FBA Profit Calculator',

  presets: {
    field: 'salePrice',
    label: 'How much does Amazon take from a…',
    values: [15, 25, 35, 50, 100, 200],
  },
  featureList: [
    'Referral fee by category, including tiered and price-banded categories',
    'FBA fulfillment fee from dimensions and weight, with dimensional weight applied',
    'Monthly storage cost including the October–December peak rate',
    'Net profit, margin, ROI, and break-even sale price',
  ],

  /** Field groups rendered server-side with defaults already filled in. */
  groups: (rates) => [
    {
      legend: 'The sale',
      fields: [
        { name: 'salePrice', label: 'Sale price', prefix: '$', value: DEFAULTS.salePrice, help: 'What the buyer pays, before tax.' },
        {
          name: 'categoryId', label: 'Category', type: 'select', value: DEFAULTS.categoryId,
          options: categoryOptions(rates.amazon), wide: true,
          help: 'Referral fee varies from 8% to 45% by category.',
        },
      ],
    },
    {
      legend: 'Your costs',
      fields: [
        { name: 'productCost', label: 'Product cost', prefix: '$', value: DEFAULTS.productCost, help: 'Unit cost from your supplier.' },
        { name: 'shipToAmazon', label: 'Ship to Amazon', prefix: '$', value: DEFAULTS.shipToAmazon, help: 'Inbound freight per unit.' },
        { name: 'otherCosts', label: 'Prep & other', prefix: '$', value: DEFAULTS.otherCosts, help: 'Labels, polybags, inserts.' },
      ],
    },
    {
      legend: 'Packed size & weight',
      note: 'Measure the packed unit, not the bare product. Amazon bills on what it ships.',
      fields: [
        { name: 'lengthIn', label: 'Length', suffix: 'in', value: DEFAULTS.lengthIn },
        { name: 'widthIn', label: 'Width', suffix: 'in', value: DEFAULTS.widthIn },
        { name: 'heightIn', label: 'Height', suffix: 'in', value: DEFAULTS.heightIn },
        { name: 'weightOz', label: 'Weight', suffix: 'oz', value: DEFAULTS.weightOz },
      ],
    },
    {
      legend: 'Storage & account',
      fields: [
        { name: 'storageMonths', label: 'Months in FBA', value: DEFAULTS.storageMonths, step: '0.5', help: 'Average time a unit sits before selling.' },
        {
          name: 'storageQuarter', label: 'Season', type: 'select', value: DEFAULTS.storageQuarter,
          options: [
            { value: 'janSep', label: 'January–September' },
            { value: 'octDec', label: 'October–December (peak)' },
          ],
          help: 'Peak storage costs roughly 3x the off-season rate.',
        },
        { name: 'monthlyUnits', label: 'Units sold / month', value: DEFAULTS.monthlyUnits, step: '1', help: 'Used to spread the $39.99 plan fee.' },
        { name: 'professionalPlan', label: 'Professional selling plan ($39.99/mo)', type: 'checkbox', value: DEFAULTS.professionalPlan, wide: true },
        { name: 'isApparel', label: 'Apparel (adds a surcharge)', type: 'checkbox', value: false, wide: true },
        { name: 'isDangerousGoods', label: 'Dangerous goods / hazmat', type: 'checkbox', value: false, wide: true },
      ],
    },
  ],

  /**
   * The answer block. 40–75 words, leads with the number, names the authority,
   * carries a date. This is the passage retrieval systems will lift.
   */
  answerBlock: ({ example, rates }) => `
<p class="answer-block"><strong>Amazon takes three separate cuts from an FBA sale: a referral fee of
8–45% by category, a fulfillment fee set by the packed size and weight, and monthly storage.</strong>
On a $${DEFAULTS.salePrice} Home &amp; Kitchen item weighing 12&nbsp;oz, that is
$${example.perUnit.referral.toFixed(2)} referral, $${example.perUnit.fulfillment.toFixed(2)} fulfillment
and $${example.perUnit.storage.toFixed(2)} storage — leaving
<strong>$${example.netPerUnit.toFixed(2)} profit</strong> after a $${DEFAULTS.productCost} product cost.
Rates below follow Amazon's published US rate card effective
${rates.amazon.effective}.</p>`,

  faqs: [
    {
      q: 'Why is my actual Amazon fee higher than this calculator says?',
      a: `<p>Four charges sit outside this estimate and catch sellers out in roughly this order of frequency:</p>
<ul>
<li><strong>Inbound placement service fee</strong> — charged since 2024 when you send inventory to a single receiving centre instead of splitting the shipment across several. Splitting shipments reduces or removes it.</li>
<li><strong>Low-inventory-level fee</strong> — applies when your historical days of supply falls below Amazon's threshold for a size tier.</li>
<li><strong>Aged inventory surcharge</strong> — kicks in past 181 days in a fulfilment centre and rises steeply after 271 days.</li>
<li><strong>Returns processing fee</strong> — charged in high-return categories, notably Apparel and Shoes, on returns above the category threshold.</li>
</ul>
<p>If your real fee is higher and none of those apply, the usual culprit is dimensional weight — see the size tier section above.</p>`,
    },
    {
      q: 'Does the referral fee apply to the shipping the buyer pays?',
      a: `<p>Yes, when you are a seller-fulfilled merchant setting your own shipping price. Amazon calculates the referral fee on the total sales price, which includes the item price plus any shipping or gift-wrap charges you collect. For FBA orders on Prime this rarely bites, because shipping is bundled into the item price and there is no separate shipping charge to be taxed twice.</p>`,
    },
    {
      q: 'What is the minimum referral fee?',
      a: `<p>$0.30 per item in most categories. On anything under about $2 the minimum is what you actually pay rather than the percentage. On a $1.50 item in a 15% category the percentage would be $0.23, so Amazon charges $0.30 — an effective rate of 20%. The calculator flags this when it happens.</p>`,
    },
    {
      q: 'Is the Professional plan worth $39.99 a month?',
      a: `<p>It pays for itself at about 40 units a month. The Individual plan charges $0.99 per item sold with no monthly fee, so the two cost the same at 40 units ($39.99 ÷ $0.99 ≈ 40). Below that, Individual is cheaper. Above it, Professional is — and Professional is also required for advertising, Buy Box eligibility, and bulk listing, which most sellers need well before they hit 40 units.</p>`,
    },
    {
      q: 'What margin should I be aiming for on FBA?',
      a: `<p>There is no universal answer, but the constraint most sellers work to is that net margin after all Amazon fees and landed cost needs to clear roughly 15–20% before advertising, because advertising then consumes a large share of what is left. A product showing 8% margin in this calculator before you have spent a cent on PPC is usually not viable. Use the break-even price figure to see how much room you have before a price war makes the product a loss.</p>`,
    },
    {
      q: 'Does this handle FBM (merchant fulfilled) instead of FBA?',
      a: `<p>Partly. Set the fulfillment inputs so the FBA fee is not applied — leave the dimensions at zero and put your own pick, pack, and postage cost into the "Prep &amp; other" field. The referral fee is identical between FBA and FBM, so that part of the calculation holds either way.</p>`,
    },
  ],

  /** 600–1,000 words in the order the spec requires. */
  content: ({ example, rates, tier }) => `
<h2>How the Amazon FBA fee calculation works</h2>

<p>Three Amazon charges apply to every FBA sale, and they are calculated from three different things.
Getting a profit estimate right means getting all three right, because they do not move together.</p>

<div class="formula">net profit = sale price
            − referral fee        (a % of sale price, set by category)
            − fulfillment fee     (a $ amount, set by size tier and billable weight)
            − storage cost        (a $ amount, set by cubic feet × months × season)
            − product cost
            − inbound shipping
            − prep and other costs</div>

<h3>The referral fee</h3>
<p>A percentage of the total sales price, set by category. Most categories are 15%. The outliers matter:
Amazon Device Accessories is 45%, Consumer Electronics and Computers are 8%, and several categories are
banded by price. Clothing &amp; Accessories charges 5% below $15, 10% from $15 to $20, and 17% above $20 —
so a $20.99 shirt pays $3.57 while a $19.99 shirt pays $2.00. A minimum referral fee of
$${rates.amazon.referral.minimumFee.toFixed(2)} applies per item in most categories.</p>

<p>Two categories work differently again. Jewelry charges 20% on the first $250 and 5% on the portion above
it — a genuinely marginal calculation, not a banded one. Applying 20% to the whole price of a $600 piece
overstates the fee by $105. This calculator applies the marginal method where Amazon does and the banded
method where Amazon does, which is the main reason its numbers differ from simpler tools.</p>

<h3>The fulfillment fee, and why dimensional weight decides it</h3>
<p>The fulfillment fee is not a percentage. It is a lookup: Amazon determines a size tier from the packed
dimensions, then reads a fee from a weight table for that tier. The weight it uses is <strong>billable
weight</strong>, and above the small-standard tier that is the greater of the actual weight and the
<em>dimensional</em> weight, plus packaging.</p>

<div class="formula">dimensional weight (lb) = (length × width × height) ÷ 139
billable weight        = max(actual weight, dimensional weight) + packaging weight</div>

<p>This is where estimates fall apart. A pillow weighing 14&nbsp;oz in a 16 × 12 × 6 inch box has a
dimensional weight of 1,152 ÷ 139 = 8.29&nbsp;lb. Amazon bills it as an 8.29&nbsp;lb item, not a 14&nbsp;oz
one — a fulfillment fee difference of several dollars per unit. For light, bulky products, reducing the box
by an inch in each direction is worth far more than shaving weight off the product.</p>

<h3>Storage</h3>
<p>Charged monthly per cubic foot, and it roughly triples in the fourth quarter. Standard-size inventory
costs $${rates.amazon.storage.standard.janSep.toFixed(2)} per cubic foot per month from January to September
and $${rates.amazon.storage.standard.octDec.toFixed(2)} from October to December. Oversize is
$${rates.amazon.storage.oversize.janSep.toFixed(2)} and $${rates.amazon.storage.oversize.octDec.toFixed(2)}.
Slow-moving stock sitting through Q4 is the version of this that surprises people.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A ${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn} inch kitchen product, ${DEFAULTS.weightOz} oz, sold at $${DEFAULTS.salePrice}</h3>

<p>Cost from the supplier is $${DEFAULTS.productCost}, inbound freight is $${DEFAULTS.shipToAmazon} a unit,
and prep is $${DEFAULTS.otherCosts}. It sells in Home &amp; Kitchen and sits in the warehouse about
${DEFAULTS.storageMonths} months before selling.</p>

<p><strong>Step 1 — size tier.</strong> The packed dimensions are
${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn} in, which exceeds the small-standard
envelope of 15 × 12 × 0.75 in on the height, so it lands in <strong>${tier.label}</strong>.
Dimensional weight is (${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn}) ÷ 139 =
${((DEFAULTS.lengthIn * DEFAULTS.widthIn * DEFAULTS.heightIn) / 139).toFixed(2)} lb =
${tier.dimensionalWeightOz.toFixed(2)} oz. Actual weight is ${DEFAULTS.weightOz} oz, so billable weight is
${tier.dimensionalApplied ? 'the <strong>dimensional</strong> figure' : 'the <strong>actual</strong> figure'}
plus 4 oz of packaging = <strong>${tier.billableWeightOz.toFixed(2)} oz</strong>.</p>

<p><strong>Step 2 — the three fees.</strong></p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Charge</th><th scope="col">How it is worked out</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Referral fee</td><td>15% of $${DEFAULTS.salePrice}</td><td>$${example.perUnit.referral.toFixed(2)}</td></tr>
<tr><td>FBA fulfillment</td><td>${tier.label} table at ${tier.billableWeightOz.toFixed(2)} oz</td><td>$${example.perUnit.fulfillment.toFixed(2)}</td></tr>
<tr><td>Storage</td><td>${tier.cubicFeet.toFixed(4)} cu ft × $${rates.amazon.storage.standard.janSep.toFixed(2)} × ${DEFAULTS.storageMonths} months</td><td>$${example.perUnit.storage.toFixed(2)}</td></tr>
<tr><td>Professional plan</td><td>$39.99 ÷ ${DEFAULTS.monthlyUnits} units</td><td>$${(39.99 / DEFAULTS.monthlyUnits).toFixed(2)}</td></tr>
<tr><td><strong>Total Amazon fees</strong></td><td></td><td><strong>$${example.perUnit.totalFees.toFixed(2)}</strong></td></tr>
<tr><td>Product cost</td><td>from supplier</td><td>$${DEFAULTS.productCost.toFixed(2)}</td></tr>
<tr><td>Inbound + prep</td><td>freight and labels</td><td>$${(DEFAULTS.shipToAmazon + DEFAULTS.otherCosts).toFixed(2)}</td></tr>
<tr><td><strong>Net profit</strong></td><td></td><td><strong>$${example.netPerUnit.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p><strong>Step 3 — what that means.</strong> Net margin is
${(example.totals.margin * 100).toFixed(1)}% and ROI on the
$${example.perUnit.totalCosts.toFixed(2)} you laid out is
${(example.totals.roi * 100).toFixed(0)}%. The break-even sale price is
<strong>$${example.breakEvenPrice.toFixed(2)}</strong> — below that the product loses money on every unit,
which is the number to keep in mind before matching a competitor's price cut.</p>
</div>

<h2>Who this is for</h2>
<p>Anyone deciding whether a product is worth sourcing, and anyone auditing why a product that looked
profitable in a spreadsheet is not. It is most useful at two moments: before you place a first order with a
supplier, and when a competitor drops their price and you need to know how far you can follow them.</p>

<p>It is also the fastest way to see whether packaging is your problem. Enter your current box dimensions,
then enter dimensions an inch smaller in each direction. If the fulfillment fee drops, you have found money
that costs nothing but a conversation with your supplier.</p>

<h2>What this does not account for</h2>
<p>Stated plainly, because a profit estimate that quietly omits costs is worse than no estimate:</p>
<ul>
<li><strong>Advertising.</strong> PPC is usually the largest single cost after Amazon's own fees, and it is
not modelled here at all. A product at 20% margin in this calculator may be at 5% after ACoS.</li>
<li><strong>Returns and refunds.</strong> Amazon refunds the referral fee but keeps a portion, and the
fulfillment fee is generally not returned. Categories with 15–30% return rates behave very differently.</li>
<li><strong>Inbound placement, low-inventory-level, and aged-inventory fees.</strong> All are situational and
all are real. See the first FAQ.</li>
<li><strong>Sales tax and income tax.</strong> Marketplace facilitator rules mean Amazon collects and remits
sales tax in every US state, so it does not touch your margin — but income tax on the profit does. Use the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a> for that layer.</li>
<li><strong>Currency conversion</strong> if you are paid into a non-USD account.</li>
</ul>

<h2>Sources and dates</h2>
<p>Every rate in this calculator comes from Amazon Seller Central's own published fee pages for the US
marketplace, listed in full below with the date they were last checked. Amazon revises the FBA rate card at
least annually and has made mid-year changes; if a figure here disagrees with what Seller Central shows you
today, trust Seller Central and <a href="/contact/">tell us</a> so it gets fixed.</p>
`,
};
