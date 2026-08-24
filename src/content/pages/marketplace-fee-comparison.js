/**
 * marketplace-fee-comparison.js — page definition for /marketplace-fee-comparison/
 *
 * Content strategy notes:
 *
 *   - This is the hub's reference table. Every other page answers "what does
 *     one platform take"; this one puts all sixteen on a single axis so the
 *     ranking itself is the artefact. That only works because the axis is a
 *     MONTHLY total: a marketplace charging 10% of every sale and a storefront
 *     charging $29 a month have no common unit until you fix a volume, and
 *     fixing a volume is exactly what every static comparison table refuses to
 *     do.
 *
 *   - It deliberately does not duplicate /reseller-fee-calculator/. That page
 *     compares resale platforms at one sale price, N = 1, for someone deciding
 *     where to list one item. This one asks a business question — where should
 *     the whole operation live — and the answer moves with volume.
 *
 *   - The two things here that exist nowhere else: the probed capability
 *     matrix (every cell computed by running the platform twice, not typed),
 *     and the fee-cliff scan (prices where one more cent of asking price costs
 *     more than a cent). Both fall out of the engine, so neither can go stale.
 *
 *   - Amazon carries the referral fee only, loudly. Including a guessed FBA
 *     fulfilment figure would make the table look more complete and be wrong
 *     for almost every product, which is the exact failure this site exists to
 *     avoid.
 */

const DEFAULTS = {
  orderValue: 45,
  shippingCharged: 0,
  shippingCost: 9,
  itemCost: 0,
  monthlyOrders: 30,
  matchup: 'all-channels',
  shopifyPlan: 'basic',
  ebayStoreTier: 'none',
  stockxLevel: 'level-1',
};

export default {
  id: 'marketplace-fee-comparison',
  kind: 'tool',
  calculator: 'channel-versus',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'Marketplace Fee Comparison',
  traitsAt: 100,

  presets: {
    field: 'orderValue',
    label: 'Compare every channel on an order of…',
    values: [15, 25, 45, 75, 150, 500],
  },
  featureList: [
    'Net monthly take-home across sixteen selling channels at one order value and volume',
    'Puts subscription storefronts and commission marketplaces on a single comparable axis',
    'Computes which platforms charge their fee on the postage you collect, by running each one twice rather than asserting it',
    'Finds the exact prices at which one more cent of asking price costs more than a cent',
  ],

  groups: (rates) => [
    {
      legend: 'The order',
      fields: [
        { name: 'orderValue', label: 'Item price', prefix: '$', value: DEFAULTS.orderValue, help: 'The same asking price on every channel.' },
        { name: 'shippingCharged', label: 'Postage charged', prefix: '$', value: DEFAULTS.shippingCharged, help: 'What you collect from the buyer for delivery. Several channels charge their fee on this too.' },
        { name: 'shippingCost', label: 'Postage it costs you', prefix: '$', value: DEFAULTS.shippingCost, help: 'Ignored on the channels where the buyer pays for a prepaid label.' },
        { name: 'itemCost', label: 'What the goods cost you', prefix: '$', value: DEFAULTS.itemCost, help: 'Subtracted from every channel equally. Leave at 0 to compare fees alone.' },
      ],
    },
    {
      legend: 'Your volume',
      note: 'The number that decides whether a subscription is worth carrying. A monthly plan has no meaning per sale — only per month.',
      fields: [
        { name: 'monthlyOrders', label: 'Orders a month', value: DEFAULTS.monthlyOrders, step: '1', help: 'Subscriptions are divided across this many orders.' },
        { name: 'salesTaxCollected', label: 'Sales tax collected', prefix: '$', value: 0, help: 'Only eBay and Etsy are modelled as charging anything on tax. See the note below the table.' },
      ],
    },
    {
      legend: 'Plan and tier',
      fields: [
        {
          name: 'shopifyPlan', label: 'Shopify plan', type: 'select', value: DEFAULTS.shopifyPlan,
          options: rates.shopify.plans.map((p) => ({ value: p.id, label: `${p.label} — $${p.monthlyAnnual}/mo` })),
          help: 'Annual billing. A dearer plan buys a lower card rate.',
        },
        {
          name: 'ebayStoreTier', label: 'eBay store', type: 'select', value: DEFAULTS.ebayStoreTier,
          options: rates.ebay.storeSubscriptions.map((s) => ({
            value: s.id,
            label: s.monthlyAnnual > 0 ? `${s.label} — $${s.monthlyAnnual}/mo` : s.label,
          })),
          help: 'Basic and above move you onto eBay’s cheaper fee table.',
        },
        {
          name: 'stockxLevel', label: 'StockX seller level', type: 'select', value: DEFAULTS.stockxLevel,
          options: rates.resellers.platforms
            .find((p) => p.id === 'stockx')
            .commission.levels.map((l) => ({ value: l.id, label: `${l.label} — ${(l.rate * 100).toFixed(1)}%` })),
        },
        { name: 'matchup', type: 'hidden', value: DEFAULTS.matchup },
      ],
    },
  ],

  answerBlock: ({ example }) => `
<p class="answer-block"><strong>On a $${DEFAULTS.orderValue.toFixed(2)} order at
${DEFAULTS.monthlyOrders} orders a month, the sixteen selling channels here are
$${example.spread.toFixed(2)} a month apart — the difference between
${example.best.label} at $${example.best.monthlyNet.toFixed(2)} and
${example.worst.label} at $${example.worst.monthlyNet.toFixed(2)}.</strong> That gap is not mostly
about headline commission. It is about who pays for postage, what the fee is charged on, and whether the
channel bills you a subscription in months when you sell nothing. Change the price or the volume above and
the order genuinely reshuffles.</p>`,

  faqs: ({ example, cliffs, traits }) => {
    const postage = traits.filter((t) => t.feeOnPostage).map((t) => t.label);
    const noPostage = traits.filter((t) => !t.feeOnPostage).map((t) => t.label);
    const grailed = cliffs.find((c) => c.id === 'grailed')?.cliffs[0];
    return [
      {
        q: 'Which marketplace has the lowest fees?',
        a: `<p>At the settings this page loads with — a $${DEFAULTS.orderValue.toFixed(2)} item, $${DEFAULTS.shippingCost.toFixed(2)} of postage, ${DEFAULTS.monthlyOrders} orders a month — the answer is <strong>${example.best.label}</strong>, keeping $${example.best.monthlyNet.toFixed(2)} a month against $${example.worst.monthlyNet.toFixed(2)} on ${example.worst.label}.</p>
<p>But "lowest fees" is the wrong question, and it is the reason so many of these comparisons disagree with each other. A channel that takes nothing from you but makes the buyer pay postage and a protection fee is showing that buyer a higher total than your asking price, which affects whether the item sells at all. Another that charges 15% might sell it in a day. This page measures your payout precisely; it cannot measure your sell-through, and no calculator can.</p>`,
      },
      {
        q: 'Why does a platform with a lower percentage sometimes pay me less?',
        a: `<p>Because the percentage is applied to different things. Three of the sixteen channels here charge their fee on the postage you collect and the rest do not, which this page establishes by running each one at $100 with no postage and again with $10 of postage and comparing the fee:</p>
<ul>
<li><strong>Charge a fee on the postage you collect:</strong> ${postage.join(', ')}.</li>
<li><strong>Do not:</strong> ${noPostage.join(', ')}.</li>
</ul>
<p>If you list at $30 with $8 of postage, the first group is charging its percentage on $38 and the second on $30. Eight dollars of base difference beats a two-point difference in rate at every price in that range.</p>`,
      },
      {
        q: 'Is Shopify cheaper than a marketplace?',
        a: `<p>Above a certain monthly revenue, yes, and the threshold is far lower than most people expect — a few hundred dollars a month, not a few thousand. Shopify's cost is a fixed plan plus a card rate of about 3%; a marketplace's is roughly 10% to 15% of everything with no floor. Those two lines cross once.</p>
<p>The catch is the part no fee calculator can price: a marketplace's percentage buys you an audience that is already there, and a storefront's subscription buys you an empty shop. The arithmetic on this page tells you what the marketplace's audience is costing you per month. Whether you can replace it for less than that is a marketing question. The <a href="/etsy-vs-shopify-fees/">Etsy vs Shopify page</a> works the crossover out precisely.</p>`,
      },
      {
        q: 'Are there prices I should never list at?',
        a: `<p>Yes, and they are computed rather than guessed. This page scans each channel's fee schedule a cent at a time looking for points where one more cent of asking price costs you more than a cent — a genuine cliff, as opposed to a tier boundary where you still keep more by charging more.</p>
${cliffs.length
  ? `<ul>${cliffs.map((c) => c.cliffs.map((x) => `<li><strong>${c.label} at $${x.price.toFixed(2)}</strong> — the fee jumps $${x.jump.toFixed(2)} for one cent of extra price${x.recoversAt ? `, and you do not get back to what you kept at $${(x.price - 0.01).toFixed(2)} until you charge $${x.recoversAt.toFixed(2)}` : ''}.</li>`).join('')).join('')}</ul>`
  : '<p>None were found in the range scanned at the current settings.</p>'}
<p>${grailed ? `Grailed's is the expensive one: a $${(grailed.price - 0.01).toFixed(2)} listing nets $${grailed.netBelow.toFixed(2)}, and you have to reach $${grailed.recoversAt.toFixed(2)} before you match it. Everything in that $${grailed.deadZone.toFixed(2)} band is money given away for nothing.` : 'A minimum fee is not a cliff — it makes cheap items expensive but never makes charging more leave you with less.'}</p>`,
      },
      {
        q: 'Why is Amazon showing only a referral fee?',
        a: `<p>Because a single honest number for "Amazon's fee on a $${DEFAULTS.orderValue} sale" does not exist. The referral fee is a clean percentage of the sale price and is included here. FBA fulfilment is charged by the packed size and billable weight of the specific product, and two items at the same price can differ by more than $30 in fulfilment cost. A light, bulky item is billed as though it were heavy.</p>
<p>Putting a plausible-looking average in this table would make Amazon look comparable to the others and be wrong for nearly every product. The <a href="/amazon-fba-calculator/">FBA calculator</a> asks for the box dimensions because the box is what decides the answer.</p>`,
      },
      {
        q: 'How often do these fees change?',
        a: `<p>More often than any other category on this site. Between 2024 and 2026 several resale platforms moved their seller commission onto buyers and at least one moved it back; Mercari ran a zero-seller-fee period from March 2024 to January 2025 that a great deal of still-circulating advice was written during. Grailed introduced a second commission rate in May 2026.</p>
<p>Every figure here is dated, and the sources are listed at the foot of the page with the day each was last checked. Treat the structure — who charges on postage, who bills a subscription, where the cliffs are — as the durable part, and re-check the rate before you make a pricing decision on it. If you find one that has moved, <a href="/contact/">tell us</a>.</p>`,
      },
    ];
  },

  content: ({ example, traits, cliffs, rates }) => {
    const bySpread = example.rows;
    const withPlans = bySpread.filter((r) => r.monthlyFixed > 0);
    const postageFree = traits.filter((t) => !t.sellerPaysPostage).map((t) => t.label);

    return `
<h2>How to read this comparison</h2>

<p>Every table that tries to rank selling platforms runs into the same wall: they do not charge the same
kind of money. Etsy takes a percentage of each sale and nothing else. Shopify takes a much smaller
percentage but bills a subscription whether you sell anything or not. Poshmark takes a fifth of the sale
but hands the buyer a prepaid label, so postage never touches your side of the ledger at all. Those are not
three versions of one number, and lining up their headline rates produces a ranking that is wrong for most
sellers.</p>

<p>The only common unit is <strong>money kept per month at a stated volume</strong>, which is what this
page computes:</p>

<div class="formula">monthly take-home = (item price
                  + postage collected      only where the channel lets you set it
                  &minus; channel fees            commission, processing, per-order, listing
                  &minus; postage you pay         zero where the buyer pays for the label
                  &minus; cost of goods) x orders per month
                  &minus; subscription            plan fees, charged even in a month with no sales</div>

<p>Fix a price and a volume and every channel collapses to one figure you can rank. Change the volume and
the ranking changes — which is the honest answer to "which platform is cheapest", and the reason this is a
calculator rather than a table.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.orderValue.toFixed(2)} item, $${DEFAULTS.shippingCost.toFixed(2)} of postage, ${DEFAULTS.monthlyOrders} sales a month</h3>

<p>The full ranking is in the result panel above. The ends of it are what matter:
<strong>${example.best.label}</strong> keeps $${example.best.monthlyNet.toFixed(2)} a month and
<strong>${example.worst.label}</strong> keeps $${example.worst.monthlyNet.toFixed(2)} — a gap of
$${example.spread.toFixed(2)} every month, or
$${(example.spread * 12).toFixed(0)} a year, on identical sales.</p>

<p>Follow one $${DEFAULTS.orderValue.toFixed(2)} order through the three channels at the top and the
three at the bottom:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Channel</th><th scope="col">Fee</th><th scope="col">Postage you pay</th><th scope="col">You keep on one sale</th><th scope="col">Over ${DEFAULTS.monthlyOrders} sales</th></tr></thead>
<tbody>
${[...bySpread.slice(0, 3), ...bySpread.slice(-3)]
  .map(
    (r) => `<tr><td>${r.label}</td><td>&minus;$${r.perOrderFees.toFixed(2)}</td><td>${r.sellerShipping > 0 ? `&minus;$${r.sellerShipping.toFixed(2)}` : '—'}</td><td>$${r.netPerOrder.toFixed(2)}</td><td>$${r.monthlyNet.toFixed(2)}</td></tr>`
  )
  .join('\n')}
</tbody>
</table>
</div>

<p>Notice that the fee column alone does not produce this order. ${postageFree.length
      ? `${postageFree.join(' and ')} charge you nothing for postage because the buyer pays for a prepaid label, and at $${DEFAULTS.shippingCost.toFixed(2)} a parcel that is worth more than several percentage points of commission.`
      : 'Postage is on you across every channel at these settings, so the fee column and the ranking agree.'}
The channel that takes the largest percentage is not the channel that leaves you with the least.</p>
</div>

<h2>What each channel actually charges its fee on</h2>

<p>This is the table that resolves most of the disagreement between fee comparisons written elsewhere. It
is not typed. Each row is produced by running that channel's own calculator at $100 with no postage, then
again with $10 of postage, then again with $10 of sales tax, and reporting the difference — so a platform
that changes what it charges on changes this table on the next build with no edit anywhere.</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Channel</th><th scope="col">Fee on $100</th><th scope="col">Rate</th>
  <th scope="col">On $10 of postage</th><th scope="col">On $10 of sales tax</th>
  <th scope="col">Fixed fee per order</th><th scope="col">Subscription</th>
</tr></thead>
<tbody>
${traits
  .map(
    (t) => `<tr>
  <td><a href="${t.path}">${t.label}</a></td>
  <td>$${t.feeAt.toFixed(2)}</td>
  <td>${(t.rateAt * 100).toFixed(2)}%</td>
  <td>${t.feeOnPostage ? `$${t.postageFee.toFixed(2)}` : 'nothing'}</td>
  <td>${t.salesTaxFee === null ? '<span title="This site does not model a sales tax component for this channel">not modelled</span>' : t.salesTaxFee > 0 ? `$${t.salesTaxFee.toFixed(2)}` : 'nothing'}</td>
  <td>${t.hasFixedComponent ? 'yes' : 'no'}</td>
  <td>${t.monthlyFixed > 0 ? `$${t.monthlyFixed.toFixed(2)}/mo` : '—'}</td>
</tr>`
  )
  .join('\n')}
</tbody>
</table>
</div>

<p><strong>Reading the sales tax column.</strong> "Not modelled" is not the same as "nothing". eBay and
Etsy are the two channels whose rate data records how they treat the tax they collect on your behalf, so
those are the only two this site is willing to put a number against. eBay charges its full final value fee
on sales tax it collects and remits — money that was never yours — which is why $10 of tax costs
$${traits.find((t) => t.id === 'ebay')?.salesTaxFee?.toFixed(2) ?? '1.36'} there. Facebook Marketplace's own
fee page says tax is part of its fee base too, but this site has no structured figure for it, so it is
shown as unmodelled rather than as zero. Where a cell says nothing, it is because the channel's fee ran
identically with and without the tax.</p>

<p><strong>Reading the fixed-fee column.</strong> A channel has a fixed component when doubling the price
does not double the fee. That is what makes a cheap sale disproportionately expensive: a $0.45 floor is
nothing on a $200 item and is 4.5% of a $10 one. It is also why the ranking at $15 is not the ranking at
$500 — try the presets above.</p>

<h2>Prices where charging more leaves you with less</h2>

<p>A tiered fee is harmless. Crossing a tier boundary changes the rate on the next dollar, and you still
keep more by charging more. A <em>cliff</em> is different: crossing it re-rates the whole sale, so there is
a band of prices just above it where raising your asking price leaves you strictly worse off. Platforms
publish the rate change. None of them publish the band.</p>

<p>These are found by scanning each channel's fee a cent at a time and flagging every point where one more
cent of asking price costs more than one cent of fee:</p>

${cliffs.length
      ? `<div class="table-scroll">
<table>
<thead><tr><th scope="col">Channel</th><th scope="col">Cliff at</th><th scope="col">Fee below</th><th scope="col">Fee at</th><th scope="col">You net below</th><th scope="col">Break even again at</th><th scope="col">Dead band</th></tr></thead>
<tbody>
${cliffs
        .map((c) => c.cliffs
          .map((x) => `<tr><td>${c.label}</td><td>$${x.price.toFixed(2)}</td><td>$${x.feeBelow.toFixed(2)}</td><td>$${x.feeAt.toFixed(2)}</td><td>$${x.netBelow.toFixed(2)}</td><td>${x.recoversAt ? `$${x.recoversAt.toFixed(2)}` : 'not within $60'}</td><td>${x.deadZone ? `$${x.deadZone.toFixed(2)}` : '—'}</td></tr>`)
          .join('\n'))
        .join('\n')}
</tbody>
</table>
</div>

<p>The dead band is the actionable number. Anything priced inside it nets you less than the same item
priced one cent below the cliff, so there is never a reason to list there. Note what is <em>not</em> in
this table: minimum fees. Facebook's $${rates.resellers.platforms.find((p) => p.id === 'facebook-marketplace').commission.minimumFee.toFixed(2)} floor
and StockX's $${rates.resellers.platforms.find((p) => p.id === 'stockx').commission.minimumFee.toFixed(2)} floor
make cheap items expensive, but they never make charging more leave you with less, so they are not
cliffs.</p>`
      : '<p>No cliffs were found across the channels compared at the current settings.</p>'}

<h2>Subscriptions, and the volume that justifies them</h2>

${withPlans.length
      ? `<p>At the current settings, ${withPlans.length === 1 ? 'one channel bills' : `${withPlans.length} channels bill`} a
subscription: ${withPlans.map((r) => `<strong>${r.label}</strong> at $${r.monthlyFixed.toFixed(2)} a month`).join(', ')}.
A subscription is the one cost on this page that does not scale with what you sell, which cuts both ways.
Spread across ${DEFAULTS.monthlyOrders} orders it is
${withPlans.map((r) => `$${(r.monthlyFixed / DEFAULTS.monthlyOrders).toFixed(2)} an order on ${r.label}`).join(' and ')} —
but in a month where you sell nothing it is the whole bill.</p>

<p>That is why the volume field above matters more than any of the rate fields. Drop the order count to a
handful and every subscription channel falls to the bottom of the ranking; raise it and they climb past
platforms charging four times the percentage. There is a single crossing point in each case, and it is
solvable rather than a matter of judgement — <a href="/etsy-vs-shopify-fees/">the Etsy vs Shopify page</a>
solves the one people ask about most.</p>`
      : '<p>None of the channels currently compared bills a subscription, so every cost here scales with what you sell.</p>'}

<h2>What this does not account for</h2>
<ul>
<li><strong>Sell-through.</strong> The highest-paying channel is not always the fastest-selling one, and an
item that sits unsold for six months earns nothing at any fee rate. This is the single largest omission and
no fee calculator can fix it.</li>
<li><strong>What the buyer sees.</strong> Several of the zero-seller-fee platforms charge the buyer instead
— a protection fee on top of your asking price. Your payout is higher and the buyer's total is higher too,
which competes against the same item listed elsewhere.</li>
<li><strong>Promoted listings and ads.</strong> Most of these channels sell visibility on top of the fees
modelled here, and Etsy's Offsite Ads fires on ad-attributed orders whether or not you opted in above
$10,000 of trailing sales.</li>
<li><strong>Amazon fulfilment.</strong> Referral fee only, as explained above.</li>
<li><strong>Returns, disputes and chargebacks.</strong> The policies differ sharply and the costs land
unevenly.</li>
<li><strong>Income tax.</strong> These are payout figures. If this is a business rather than clearing out a
cupboard, see the <a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Who this is for</h2>
<p>Anyone deciding where to sell rather than what to charge — someone choosing a first channel, someone
whose volume has grown enough to wonder whether a storefront is now cheaper, or someone who has been on one
platform long enough to stop noticing what it costs. It is most useful before the decision. Once you have
built an audience on a channel, the fee difference this page measures is only one side of the ledger, and
usually the smaller one.</p>
`;
  },
};
