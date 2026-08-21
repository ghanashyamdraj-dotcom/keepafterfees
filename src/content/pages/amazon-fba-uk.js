/**
 * amazon-fba-uk.js — page definition for /uk/amazon-fba-calculator/
 *
 * This is NOT the US page with numbers swapped — Section "URL & page
 * strategy" of the locale spec is explicit that a doorway page like that
 * doesn't earn its place. Two things make Amazon UK genuinely different, not
 * just differently priced, and both are the non-commodity content here:
 *
 *   1. Amazon UK has THIRTEEN fulfilment size tiers where the US has seven —
 *      four separate envelope tiers alone, because UK/EU customers buy a lot
 *      of small, light, letterbox-shaped goods and Amazon prices that
 *      granularity finely. No competing UK FBA calculator explains why a
 *      product that would be "small standard" in the US gets sorted into one
 *      of four different UK tiers depending on millimetres of depth.
 *
 *   2. Dimensional weight is not just a BILLING multiplier in the UK the way
 *      it is in the US — for parcel and oversize tiers it is also a TIER
 *      ELIGIBILITY test in its own right. An item can physically fit inside
 *      a tier's box dimensions and still get bumped to the next tier up
 *      purely because its dimensional weight exceeds that tier's separate
 *      cap. This genuinely surprises sellers coming from the US model.
 *
 * Every rate is attributed to Amazon's own published UK rate card (PDF,
 * effective 1 July 2026) — see src/data/rates/amazon/en-GB.json for the full
 * source list and the specific gaps still open (partial category list,
 * unconfirmed overage rounding granularity).
 */

import { categoryOptions } from '../../lib/calc/amazon.js';

const DEFAULTS = {
  salePrice: 18.99,
  productCost: 5.2,
  shipToAmazon: 0.6,
  otherCosts: 0.3,
  categoryId: 'default',
  lengthIn: 25,
  widthIn: 18,
  heightIn: 8,
  weightOz: 300,
  storageMonths: 2,
  storageQuarter: 'janSep',
  monthlyUnits: 150,
  professionalPlan: true,
  isApparel: false,
  isDangerousGoods: false,
  units: 1,
};

export default {
  id: 'amazon-fba-uk',
  kind: 'tool',
  calculator: 'amazon-fba-uk',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Amazon FBA UK Profit Calculator',
  featureList: [
    'Referral fee by category on the UK rate card',
    'FBA fulfilment fee from all 13 of Amazon.co.uk’s size tiers, with the UK’s own dimensional-weight eligibility test applied',
    'Monthly storage cost including the October–December peak rate, priced in £ per cubic foot',
    'Net profit, margin, ROI, and break-even sale price in GBP',
  ],

  groups: (rates) => {
    const gb = rates.byLocale.amazon['en-GB'];
    return [
      {
        legend: 'The sale',
        fields: [
          { name: 'salePrice', label: 'Sale price', prefix: '£', value: DEFAULTS.salePrice, help: 'What the buyer pays, before VAT.' },
          {
            name: 'categoryId', label: 'Category', type: 'select', value: DEFAULTS.categoryId,
            options: categoryOptions(gb), wide: true,
            help: 'Referral fee varies from 8% to 45% by category on the UK rate card.',
          },
        ],
      },
      {
        legend: 'Your costs',
        fields: [
          { name: 'productCost', label: 'Product cost', prefix: '£', value: DEFAULTS.productCost, help: 'Unit cost from your supplier.' },
          { name: 'shipToAmazon', label: 'Ship to Amazon', prefix: '£', value: DEFAULTS.shipToAmazon, help: 'Inbound freight per unit.' },
          { name: 'otherCosts', label: 'Prep & other', prefix: '£', value: DEFAULTS.otherCosts, help: 'Labels, polybags, inserts.' },
        ],
      },
      {
        legend: 'Packed size & weight',
        note: 'Measure the packed unit, not the bare product, in centimetres and grams. Amazon UK bills on what it ships.',
        fields: [
          { name: 'lengthIn', label: 'Length', suffix: 'cm', value: DEFAULTS.lengthIn },
          { name: 'widthIn', label: 'Width', suffix: 'cm', value: DEFAULTS.widthIn },
          { name: 'heightIn', label: 'Height', suffix: 'cm', value: DEFAULTS.heightIn },
          { name: 'weightOz', label: 'Weight', suffix: 'g', value: DEFAULTS.weightOz },
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
            help: 'Peak storage costs roughly double the off-season rate.',
          },
          { name: 'monthlyUnits', label: 'Units sold / month', value: DEFAULTS.monthlyUnits, step: '1', help: 'Used to spread the £25 plan fee.' },
          { name: 'professionalPlan', label: 'Professional selling plan (£25/mo, excl. VAT)', type: 'checkbox', value: DEFAULTS.professionalPlan, wide: true },
          { name: 'isApparel', label: 'Apparel (adds a surcharge)', type: 'checkbox', value: false, wide: true },
          { name: 'isDangerousGoods', label: 'Dangerous goods / hazmat / lithium battery', type: 'checkbox', value: false, wide: true },
        ],
      },
    ];
  },

  answerBlock: ({ example, rates }) => `
<p class="answer-block"><strong>Amazon UK takes three separate cuts from an FBA sale: a referral fee of
8–45% by category, a fulfilment fee set by which of Amazon's 13 size tiers the packed item falls into, and
monthly storage.</strong> On a £${DEFAULTS.salePrice.toFixed(2)} item measuring
${DEFAULTS.lengthIn}×${DEFAULTS.widthIn}×${DEFAULTS.heightIn}&nbsp;cm and weighing ${DEFAULTS.weightOz}&nbsp;g,
that is £${example.perUnit.referral.toFixed(2)} referral, £${example.perUnit.fulfillment.toFixed(2)} fulfilment
and £${example.perUnit.storage.toFixed(2)} storage — leaving
<strong>£${example.netPerUnit.toFixed(2)} profit</strong> after a £${DEFAULTS.productCost.toFixed(2)} product
cost. Rates below follow Amazon's published UK rate card effective ${rates.effective}.</p>`,

  faqs: ({ example, rates }) => [
    {
      q: 'Why does the UK have 13 size tiers when the US calculator only has 7?',
      a: `<p>Because Amazon prices small, light, letterbox-shaped items much more finely in the UK and EU than in the US. Where the US has one "small standard" tier for anything under 15×12×0.75&nbsp;in and 16&nbsp;oz, the UK splits that same space into four separate envelope tiers — Light, Standard, Large, and Extra-large envelope — each with its own weight ladder up to 20g, 460g, and 960g. A greetings card, a phone case, and a folded T-shirt can all be "envelope-sized" and still land in three different fee tiers depending on thickness and weight alone.</p>
<p>Below that sit two parcel tiers and six oversize tiers, thirteen in total. This calculator resolves the real tier from your dimensions and weight rather than assuming the US shape maps across.</p>`,
    },
    {
      q: "Can an item fit inside a tier's box and still not qualify for it?",
      a: `<p>Yes, and this is the part that catches out sellers used to the US model. In the US, dimensional weight only affects how much you're <em>billed</em> once a tier is decided by physical size and actual weight. In the UK, Small parcel and Standard parcel each carry their own separate dimensional-weight ceiling as part of qualifying for the tier at all — Small parcel requires unit weight ≤3.90&nbsp;kg <strong>and</strong> dimensional weight ≤2.10&nbsp;kg. A large, light box can be physically small enough for Small parcel and still get bumped to Standard parcel purely because its volume divided by 5,000 pushes the dimensional weight over that second ceiling.</p>
<p>The worked example below is deliberately chosen to show this: the item weighs ${DEFAULTS.weightOz}&nbsp;g on the scale but is billed at a heavier figure because of its dimensional weight.</p>`,
    },
    {
      q: 'What is the minimum referral fee, and is it different for heavy items?',
      a: `<p>£${rates.referral.minimumFee.toFixed(2)} per item in most categories. Two categories carry a higher minimum specifically because of weight and size rather than price: Heavy Oversize items (unit weight over 23&nbsp;kg, up to 31.5&nbsp;kg) carry a £20 minimum referral fee, and Heavy Bulky items — over 31.5&nbsp;kg, or with a longest side over 175&nbsp;cm, or girth over 360&nbsp;cm — carry a £25 minimum. Both are well above the standard £${rates.referral.minimumFee.toFixed(2)} floor and are easy to miss when pricing a large item.</p>`,
    },
    {
      q: 'Is the Professional plan worth £25 a month?',
      a: `<p>It pays for itself sooner than in the US. The Individual plan charges £0.75 per item sold with no monthly fee, so the two cost the same at £25 ÷ £0.75 ≈ 33 units a month — versus roughly 40 units for the US Professional plan at $39.99 against a $0.99 per-item Individual fee. Below about 33 units a month, Individual is cheaper in the UK; above it, Professional is, and it's also required for advertising and Buy Box eligibility.</p>`,
    },
    {
      q: 'Does the calculator include VAT?',
      a: `<p>No, deliberately. Amazon states its own Professional plan and fulfilment fees exclusive of VAT, and what a seller actually owes depends on VAT registration status, where the seller and the goods are established, and whether Amazon or the seller is the deemed supplier under UK marketplace facilitator rules — none of which a generic fee calculator can know. Every price in this tool is the same pre-VAT figure Amazon itself quotes. If you are VAT-registered, the VAT on Amazon's own fees is normally reclaimable; if you are not, budget for it as a real cost on top of what this calculator shows.</p>`,
    },
    {
      q: 'Why is my actual Amazon UK fee higher than this calculator says?',
      a: `<p>Beyond VAT, three things sit outside this estimate:</p>
<ul>
<li><strong>The fuel and logistics surcharge.</strong> Amazon has announced a 1.5% surcharge across UK and EU fulfilment fees from 17 April 2026. It is not yet folded into the rate data below — check your seller account for whether it has taken effect.</li>
<li><strong>The lithium battery / dangerous goods fee.</strong> A flat £0.10 per unit, ticked separately in the calculator above.</li>
<li><strong>Low-inventory-level and aged-inventory surcharges,</strong> the same mechanism as the US version of this tool.</li>
</ul>
<p>If none of those apply and the gap is still there, the usual culprit is the same as in the US: dimensional weight pushing the item into a heavier billing weight than the number on the scale.</p>`,
    },
  ],

  content: ({ example, rates, tier }) => `
<h2>How the Amazon UK FBA fee calculation works</h2>

<p>The shape of the calculation is the same three charges as any Amazon marketplace — referral fee, fulfilment
fee, storage — but the fulfilment side works from a genuinely different rate card than the US, not a currency
conversion of it.</p>

<div class="formula">net profit = sale price
            − referral fee        (a % of sale price, set by category)
            − fulfilment fee      (a £ amount, set by size tier and billable weight)
            − storage cost        (a £ amount, set by cubic feet × months × season)
            − product cost
            − inbound shipping
            − prep and other costs</div>

<h3>The referral fee</h3>
<p>A percentage of the sale price, set by category, most commonly 15%. Amazon Device Accessories is 45% flat.
Automotive & Powersports is genuinely marginal — 15% on the first £45 of the price and 9% on the rest, unlike
the US equivalent category, which is a flat 12% regardless of price. A minimum referral fee of
£${rates.referral.minimumFee.toFixed(2)} applies per item in most categories, rising to £20 or £25 for
Heavy Oversize and Heavy Bulky items respectively — see the FAQ below.</p>

<h3>The fulfilment fee: 13 tiers, and dimensional weight can gate more than billing</h3>
<p>Amazon UK sorts every FBA item into one of thirteen size tiers — four envelope tiers, two parcel tiers, and
seven oversize tiers — each with its own dimension limit, weight limit, and fee table. The tier decides the
fee table; the <strong>billable weight</strong> decides which row of that table applies.</p>

<div class="formula">dimensional weight (kg) = (length × width × height cm) ÷ 5,000
billable weight        = max(actual weight, dimensional weight) — envelopes and Special oversize use actual weight only</div>

<p>For parcel and most oversize tiers, dimensional weight does a second job the US system doesn't have: it is
also part of deciding <em>which tier an item qualifies for in the first place</em>. Small parcel requires both
unit weight ≤3.90&nbsp;kg <strong>and</strong> dimensional weight ≤2.10&nbsp;kg — an item can be small and light
on the scale and still fail Small parcel on dimensional weight alone, landing in Standard parcel instead at a
higher fee. Envelopes are the exception: Light, Standard, Large, and Extra-large envelope are all billed on
actual weight only, regardless of shape, per Amazon's own stated rule.</p>

<h3>Storage</h3>
<p>Charged monthly per cubic foot — Amazon prices UK storage in £ per cubic foot even though every dimension
and weight elsewhere on the UK rate card is metric. Standard-size inventory costs
£${rates.storage.standard.janSep.toFixed(2)} per cubic foot per month from January to September and
£${rates.storage.standard.octDec.toFixed(2)} from October to December. Oversize is
£${rates.storage.oversize.janSep.toFixed(2)} and £${rates.storage.oversize.octDec.toFixed(2)}.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A ${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn} cm item, ${DEFAULTS.weightOz} g, sold at £${DEFAULTS.salePrice.toFixed(2)}</h3>

<p>Cost from the supplier is £${DEFAULTS.productCost.toFixed(2)}, inbound freight is £${DEFAULTS.shipToAmazon.toFixed(2)} a unit,
and prep is £${DEFAULTS.otherCosts.toFixed(2)}. It sells in a standard 15% category and sits in the warehouse about
${DEFAULTS.storageMonths} months before selling.</p>

<p><strong>Step 1 — size tier.</strong> The packed dimensions are
${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn} cm, too deep for any of the four envelope
tiers, so it lands in <strong>${tier.label}</strong>. Dimensional weight is
(${DEFAULTS.lengthIn} × ${DEFAULTS.widthIn} × ${DEFAULTS.heightIn}) ÷ 5,000 =
${(((DEFAULTS.lengthIn * DEFAULTS.widthIn * DEFAULTS.heightIn) / 5000)).toFixed(3)} kg =
${tier.dimensionalWeightOz.toFixed(0)} g. Actual weight is ${DEFAULTS.weightOz} g, so billable weight is
${tier.dimensionalApplied ? 'the <strong>dimensional</strong> figure' : 'the <strong>actual</strong> figure'} =
<strong>${tier.billableWeightOz.toFixed(0)} g</strong> — more than double what the item weighs on the scale.</p>

<p><strong>Step 2 — the three fees.</strong></p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Charge</th><th scope="col">How it is worked out</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Referral fee</td><td>15% of £${DEFAULTS.salePrice.toFixed(2)}</td><td>£${example.perUnit.referral.toFixed(2)}</td></tr>
<tr><td>FBA fulfilment</td><td>${tier.label} table at ${tier.billableWeightOz.toFixed(0)} g</td><td>£${example.perUnit.fulfillment.toFixed(2)}</td></tr>
<tr><td>Storage</td><td>${tier.cubicFeet.toFixed(4)} cu ft × £${rates.storage.standard.janSep.toFixed(2)} × ${DEFAULTS.storageMonths} months</td><td>£${example.perUnit.storage.toFixed(2)}</td></tr>
<tr><td>Professional plan</td><td>£25.00 ÷ ${DEFAULTS.monthlyUnits} units</td><td>£${(25 / DEFAULTS.monthlyUnits).toFixed(2)}</td></tr>
<tr><td><strong>Total Amazon fees</strong></td><td></td><td><strong>£${example.perUnit.totalFees.toFixed(2)}</strong></td></tr>
<tr><td>Product cost</td><td>from supplier</td><td>£${DEFAULTS.productCost.toFixed(2)}</td></tr>
<tr><td>Inbound + prep</td><td>freight and labels</td><td>£${(DEFAULTS.shipToAmazon + DEFAULTS.otherCosts).toFixed(2)}</td></tr>
<tr><td><strong>Net profit</strong></td><td></td><td><strong>£${example.netPerUnit.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p><strong>Step 3 — what that means.</strong> Net margin is
${(example.totals.margin * 100).toFixed(1)}% and ROI on the
£${example.perUnit.totalCosts.toFixed(2)} you laid out is
${(example.totals.roi * 100).toFixed(0)}%. The break-even sale price is
<strong>£${example.breakEvenPrice.toFixed(2)}</strong> — below that the product loses money on every unit.
None of this includes VAT; see the FAQ below for why.</p>
</div>

<h2>Who this is for</h2>
<p>UK-based FBA sellers, and US sellers weighing up whether to expand onto Amazon.co.uk, deciding whether a
product that works in the US rate card still works once it's priced against a genuinely different UK fee
structure — not the same numbers in a different currency symbol. It's most useful at the same two moments as
the US version: before placing a first order with a supplier, and when deciding how much room there is to
match a competitor's price.</p>

<p>It is also the fastest way to see whether your packaging is quietly moving you into a more expensive tier.
Enter your current box dimensions, then try dimensions a centimetre smaller in each direction — if the tier
changes, you've found a fee reduction that costs nothing but a conversation with your supplier.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>VAT.</strong> Every figure here, including Amazon's own fees, is pre-VAT. See the FAQ above for
what that means for a VAT-registered versus non-registered seller.</li>
<li><strong>The 1.5% fuel and logistics surcharge</strong> announced for UK/EU fulfilment fees from 17 April
2026, not yet reflected in the rate data below.</li>
<li><strong>Advertising.</strong> Not modelled here at all, same as the US version — a healthy margin before
PPC can look very different after it.</li>
<li><strong>Returns and refunds,</strong> inbound placement, and low-inventory-level fees — situational, real,
and the same mechanism as the US version of this tool.</li>
<li><strong>Currency conversion</strong> if you are paid into a non-GBP account, or if you sell cross-border
into the EU under Pan-European FBA, which carries its own surcharge structure not modelled here.</li>
</ul>

<h2>Sources and dates</h2>
<p>Fulfilment fee tiers, weight brackets, storage rates, and account fees come from Amazon's own published UK
rate card, listed in full below with the date it was checked. The referral fee category list here is a
verified subset of the full UK rate card, not yet the complete ~35-category table — categories not listed fall
back to the 15% default. If a figure here disagrees with what Seller Central shows you, trust Seller Central
and <a href="/contact/">tell us</a> so it gets fixed.</p>
`,
};
