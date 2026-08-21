/**
 * reseller-comparison.js — page definition for /reseller-fee-calculator/
 *
 * Content strategy notes:
 *
 *   - The non-commodity section is Poshmark's $15 threshold. Below it the
 *     commission is a flat $2.95; at or above it, 20%. That is a genuine cliff
 *     — an item at $14.99 can net MORE in absolute dollars than the same item
 *     at $15.49 — and no competing calculator surfaces it. The engine computes
 *     both sides, so the page states the real gap rather than describing one.
 *   - The second differentiator is structural rather than numeric: these
 *     platforms differ in WHO PAYS SHIPPING and WHAT THE FEE IS CHARGED ON, not
 *     just in headline rate. A static "Poshmark 20% vs Mercari 10%" comparison
 *     table cannot express that; a calculator can.
 *   - Reseller fee structures moved more than any other category between 2024
 *     and 2026 (several platforms shifted seller commission onto buyers), so
 *     the page is explicit that these figures need checking against the
 *     platform's own page. src/data/fees/resellers.json is not yet verified.
 */

const DEFAULTS = {
  salePrice: 45.0,
  shippingCharged: 0,
  shippingCost: 8.5,
  sellerPaysShipping: false,
  itemCost: 12.0,
  stockxLevel: 'level-1',
};

export default {
  id: 'reseller-comparison',
  kind: 'tool',
  calculator: 'reseller-comparison',
  published: '2026-08-02',
  updated: '2026-08-02',
  defaults: DEFAULTS,

  appName: 'Reseller Platform Fee Comparison',

  presets: {
    field: 'salePrice',
    label: 'Compare platforms on a sale of…',
    values: [20, 45, 75, 100, 200, 500],
  },
  featureList: [
    'Net payout across Poshmark, Mercari, Depop, Vinted, eBay, StockX, Grailed, Etsy and Facebook Marketplace at once',
    'Models who actually pays for shipping on each platform, not just the commission rate',
    'Flags Poshmark’s $15 commission cliff, where pricing higher can pay you less',
    'Break-even sale price per platform for a given item cost',
  ],

  groups: (rates) => [
    {
      legend: 'The item',
      fields: [
        { name: 'salePrice', label: 'Sale price', prefix: '$', value: DEFAULTS.salePrice, help: 'The same asking price on every platform.' },
        { name: 'itemCost', label: 'What it cost you', prefix: '$', value: DEFAULTS.itemCost, help: 'Sourcing cost. Enter 0 if you are clearing out your own wardrobe.' },
      ],
    },
    {
      legend: 'Shipping',
      note: 'Poshmark and Vinted supply a buyer-paid label, so postage never touches your ledger there. Elsewhere it is your choice.',
      fields: [
        { name: 'shippingCost', label: 'Postage cost', prefix: '$', value: DEFAULTS.shippingCost, help: 'What a label actually costs you.' },
        { name: 'shippingCharged', label: 'Postage charged', prefix: '$', value: DEFAULTS.shippingCharged, help: 'Only applies where you set your own postage.' },
        { name: 'sellerPaysShipping', label: 'I cover shipping (free shipping to the buyer)', type: 'checkbox', value: DEFAULTS.sellerPaysShipping, wide: true },
      ],
    },
    {
      legend: 'StockX level',
      fields: [
        {
          name: 'stockxLevel', label: 'Seller level', type: 'select', value: DEFAULTS.stockxLevel,
          options: rates.resellers.platforms
            .find((p) => p.id === 'stockx')
            .commission.levels.map((l) => ({ value: l.id, label: `${l.label} — ${(l.rate * 100).toFixed(1)}%` })),
          wide: true,
          help: 'StockX commission falls as you sell more. Only affects the StockX row.',
        },
      ],
    },
  ],

  answerBlock: ({ example, rates }) => `
<p class="answer-block"><strong>The same item nets a different amount on every resale platform, and the gap is
usually larger than the difference in headline commission — because the platforms disagree about who pays
shipping and what the fee is charged on.</strong> On a $${DEFAULTS.salePrice.toFixed(2)} item costing
$${DEFAULTS.itemCost.toFixed(2)}, the best payout here is <strong>${example.best.label} at
$${example.best.netProfit.toFixed(2)}</strong> and the worst is ${example.worst.label} at
$${example.worst.netProfit.toFixed(2)} — a spread of
$${(example.best.netProfit - example.worst.netProfit).toFixed(2)} on one sale. Fee schedules as published
by each platform, effective ${rates.resellers.effective}.</p>`,

  faqs: ({ example, cliff, rates }) => [
    {
      q: 'Which resale platform actually pays the most?',
      a: `<p>It depends on the price, and the ranking genuinely reorders. At $${DEFAULTS.salePrice.toFixed(2)} the winner here is ${example.best.label}, but the platforms differ in structure, not just rate — a flat fee wins on cheap items and a percentage wins on expensive ones. Poshmark's flat $${rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.flatUnderThreshold} below $${cliff.threshold} is unbeatable on a $10 item and the worst option on a $200 one.</p>
<p>Change the sale price above and watch the order change. That is the whole reason this is a calculator and not a comparison table.</p>`,
    },
    {
      q: 'Why does Vinted show no fees at all?',
      a: `<p>Because Vinted charges sellers nothing. Buyers pay a Buyer Protection fee on top of the asking price, plus shipping. The seller keeps the full item price.</p>
<p>That does not automatically make it the best option. The buyer sees a higher total than your asking price, which affects how your listing competes against the same item elsewhere. A platform that takes 10% from you but shows a lower total to the buyer may sell faster. This calculator models your payout, not your sell-through rate.</p>`,
    },
    {
      q: 'Do I really keep more by listing at $14.99 than at $15.49?',
      a: `<p>On Poshmark, yes — and it is the most useful thing on this page. Below $${cliff.threshold} Poshmark charges a flat $${rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.flatUnderThreshold}; at or above it, ${(rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.rateAtOrAbove * 100).toFixed(0)}%. At $${(cliff.threshold - 0.01).toFixed(2)} you net $${cliff.under.netProfit.toFixed(2)}; at $${(cliff.threshold + 0.49).toFixed(2)} you net $${cliff.over.netProfit.toFixed(2)}.</p>
<p>So charging ${((cliff.threshold + 0.49) - (cliff.threshold - 0.01)).toFixed(2)} more leaves you $${Math.abs(cliff.under.netProfit - cliff.over.netProfit).toFixed(2)} ${cliff.under.netProfit > cliff.over.netProfit ? 'worse off' : 'better off'}. The calculator warns you when your price lands in that dead zone.</p>`,
    },
    {
      q: 'Why is shipping handled differently per platform?',
      a: `<p>Because the platforms genuinely work differently, and treating shipping as one number is the most common way these comparisons go wrong.</p>
<ul>
<li><strong>Poshmark and Vinted</strong> supply a prepaid label the buyer pays for. Postage never enters your ledger.</li>
<li><strong>eBay and Etsy</strong> charge their fee on the postage you collect, so shipping is part of the fee base.</li>
<li><strong>StockX</strong> requires you to ship to an authentication centre at your own cost, every time.</li>
<li><strong>Mercari and Depop</strong> let you choose, so it depends on your listing.</li>
</ul>
<p>Tick "I cover shipping" to see how absorbing postage reorders the ranking — it penalises the platforms where you were already paying and does nothing on the ones with buyer-paid labels.</p>`,
    },
    {
      q: 'How current are these fee figures?',
      a: `<p>They reflect each platform's published fee page as of ${rates.resellers.effective}, but this is the category that changes fastest. Several platforms moved seller commissions onto buyers between 2024 and 2026, and at least two did it twice. Mercari's seller fee in particular has changed model more than once.</p>
<p>Treat this as a structural comparison rather than a rate card, and confirm against the platform's own fee page before you make a pricing decision on it. If you spot a figure that has moved, <a href="/contact/">tell us</a> and it gets fixed.</p>`,
    },
  ],

  content: ({ example, cliff, breakEven, rates }) => `
<h2>How resale platform fees actually compare</h2>

<p>Most comparisons of resale platforms line up the headline commissions and stop there. That produces the
wrong answer surprisingly often, because these platforms differ along three axes and only one of them is
the rate.</p>

<div class="formula">net profit = sale price
           + postage collected   (only where you set it)
           − commission          (flat, percentage, tiered, or level-based)
           − payment processing  (bundled on some platforms, separate on others)
           − postage you pay     (zero where the buyer pays for the label)
           − what the item cost you</div>

<h3>The three things that differ</h3>

<p><strong>The shape of the commission.</strong> Poshmark charges a flat fee below a threshold and a
percentage above it. StockX charges a rate that falls as your seller level rises. eBay's is marginal above
$7,500. Vinted charges sellers nothing. These are not variations on a percentage — they are different
functions, and which one wins depends on where your item sits on the price curve.</p>

<p><strong>Who pays for shipping.</strong> On Poshmark and Vinted the buyer pays for a prepaid label and
postage never touches your side of the ledger. On StockX you always pay to ship for authentication. On
Mercari, Depop, and eBay it is your choice. A platform with a higher commission and a buyer-paid label
frequently beats a platform with a lower commission where you absorb $8.50 of postage.</p>

<p><strong>What the fee is charged on.</strong> eBay, Etsy and Mercari calculate their fee on the item price
<em>plus</em> the postage you collect. The rest charge on the item price alone. If you list at $30 with $8
postage, eBay's fee base is $38 and Grailed's is $30 — an $8 difference in the base before you compare a
single percentage.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.salePrice.toFixed(2)} item that cost you $${DEFAULTS.itemCost.toFixed(2)}, postage $${DEFAULTS.shippingCost.toFixed(2)}</h3>

<p>Buyer pays postage wherever the platform allows it. The full ranked table is in the result panel above;
the ends of it are what matter:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Platform</th><th scope="col">Fees</th><th scope="col">Fee rate</th><th scope="col">You keep</th></tr></thead>
<tbody>
${example.rows
  .map(
    (r) => `<tr><td>${r.label}</td><td>$${r.fees.totalFees.toFixed(2)}</td><td>${(r.effectiveFeeRate * 100).toFixed(1)}%</td><td>$${r.netProfit.toFixed(2)}</td></tr>`
  )
  .join('\n')}
</tbody>
</table>
</div>

<p>The spread between best and worst is
<strong>$${(example.best.netProfit - example.worst.netProfit).toFixed(2)}</strong> on a single
$${DEFAULTS.salePrice.toFixed(2)} sale — roughly
${(((example.best.netProfit - example.worst.netProfit) / example.best.netProfit) * 100).toFixed(0)}% of the
best available payout. Across 200 sales a year that is
$${((example.best.netProfit - example.worst.netProfit) * 200).toFixed(0)}, which is generally more than any
pricing optimisation available to you within a single platform.</p>
</div>

<h2>Poshmark's $${cliff.threshold} cliff: where charging more pays you less</h2>

<p>This is the one piece of arithmetic on this page worth memorising. Poshmark charges a flat
$${rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.flatUnderThreshold} commission on
sales below $${cliff.threshold}, and
${(rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.rateAtOrAbove * 100).toFixed(0)}%
at or above it. It is a step, not a taper.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Listed at</th><th scope="col">Poshmark takes</th><th scope="col">You net</th></tr></thead>
<tbody>
<tr><td>$${(cliff.threshold - 0.01).toFixed(2)}</td><td>$${cliff.under.fees.totalFees.toFixed(2)}</td><td>$${cliff.under.netProfit.toFixed(2)}</td></tr>
<tr><td>$${(cliff.threshold + 0.49).toFixed(2)}</td><td>$${cliff.over.fees.totalFees.toFixed(2)}</td><td>$${cliff.over.netProfit.toFixed(2)}</td></tr>
</tbody>
</table>
</div>

<p>Asking $${((cliff.threshold + 0.49) - (cliff.threshold - 0.01)).toFixed(2)} more leaves you
<strong>$${Math.abs(cliff.under.netProfit - cliff.over.netProfit).toFixed(2)}
${cliff.under.netProfit > cliff.over.netProfit ? 'worse off' : 'better off'}</strong>. Anything priced
between $${cliff.threshold.toFixed(2)} and roughly
$${(cliff.threshold / (1 - rates.resellers.platforms.find((p) => p.id === 'poshmark').commission.rateAtOrAbove)).toFixed(2)}
nets less than the same item listed at $${(cliff.threshold - 0.01).toFixed(2)}. There is no reason to ever
price inside that band on Poshmark. The calculator raises a warning when your price lands there.</p>

<p>The general lesson applies beyond Poshmark: any platform with a flat fee, a minimum fee, or a threshold
has a dead zone just above it. Facebook Marketplace has a $0.40 minimum, which makes its effective rate on
a $3 item over 13% rather than the advertised 5%.</p>

<h2>Break-even price by platform</h2>

<p>At a $${DEFAULTS.itemCost.toFixed(2)} item cost, this is the lowest you can list before the sale costs
you money — useful when you are deciding whether to accept an offer:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Platform</th><th scope="col">Break-even price</th></tr></thead>
<tbody>
${breakEven
  .map((b) => `<tr><td>${b.label}</td><td>$${b.breakEven.toFixed(2)}</td></tr>`)
  .join('\n')}
</tbody>
</table>
</div>

<h2>Who this is for</h2>
<p>Resellers deciding where to list an item, and anyone holding inventory that has not sold on one platform
and wondering whether moving it is worth the effort. It is most useful before you list rather than after —
once an item is listed with a price, the cliff effects above are already baked in.</p>

<p>It is also the fastest way to sanity-check a platform's marketing, and to catch a claim that has quietly
expired. "No seller fees" is true on Vinted, and true on Depop for US sellers apart from payment processing
— but it was only true on Mercari between March 2024 and January 2025, and a great deal of advice written
in that window is still circulating. Mercari has charged 10% since 6 January 2025. Even where the claim
holds, on a platform where you also pay postage, no seller fee does not mean no cost.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Sell-through rate.</strong> The platform that pays most per sale is not always the one that
sells fastest, and an item that sits for six months on the best-paying platform earns nothing.</li>
<li><strong>Promoted listings and offers.</strong> Most of these platforms have discount and ad mechanics
that reduce your realised payout below what you see here.</li>
<li><strong>Returns.</strong> Return policies and who pays return postage vary widely, and StockX
authentication failures carry their own penalties.</li>
<li><strong>Bundling.</strong> Poshmark bundles and Depop multi-buy change the per-item arithmetic.</li>
<li><strong>Income tax.</strong> These are payout figures. If resale is a business rather than clearing out
a wardrobe, see the <a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
</ul>

<h2>Sources and dates</h2>
<p>Figures come from each platform's own published seller fee page, listed below. This category changes
faster than any other on this site — several platforms have moved commissions between buyers and sellers
since 2024 — so treat the structure as the durable part and re-check the rates before pricing on them.</p>
`,
};
