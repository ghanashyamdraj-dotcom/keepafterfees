/**
 * margin-markup.js — page definition for /profit-margin-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that "margin and markup are different" is a fact
 * everyone repeats and nobody prices. This page puts a dollar figure on the
 * mistake.
 *
 * The specific error: you decide you want a 50% margin, so you add 50% to your
 * cost. That gives a 33.3% margin, not 50% — and on a $40 cost it leaves $20 of
 * profit per unit on the table, because the correct price was $80 rather than
 * $60. The gap grows non-linearly with the target: at 20% it costs $2 a unit,
 * at 60% it costs $36. Both prices are solved by the engine.
 */

const DEFAULTS = {
  mode: 'fromPrice',
  cost: 40,
  price: 60,
  targetMargin: 50,
  targetMarkup: 50,
  fixedCosts: 2000,
};

export default {
  id: 'margin-markup',
  kind: 'tool',
  calculator: 'margin-markup',
  published: '2026-08-04',
  updated: '2026-08-04',
  defaults: DEFAULTS,

  appName: 'Profit Margin & Markup Calculator',
  featureList: [
    'Converts between margin and markup in both directions',
    'Prices from a target margin or a target markup',
    'Break-even volume against monthly fixed costs',
    'Quantifies the profit lost by confusing the two',
  ],

  groups: () => [
    {
      legend: 'What you are pricing',
      fields: [
        { name: 'cost', label: 'Unit cost', prefix: '$', value: DEFAULTS.cost, help: 'What one unit costs you, all in.' },
        {
          name: 'mode', label: 'Work from', type: 'radio', value: DEFAULTS.mode,
          options: [
            { value: 'fromPrice', label: 'A price I already charge' },
            { value: 'fromMargin', label: 'A target margin' },
            { value: 'fromMarkup', label: 'A target markup' },
          ],
        },
        { name: 'price', label: 'Selling price', prefix: '$', value: DEFAULTS.price, help: 'Used when working from a price.' },
        { name: 'targetMargin', label: 'Target margin', suffix: '%', value: DEFAULTS.targetMargin, help: 'Share of the sale price you want to keep.' },
        { name: 'targetMarkup', label: 'Target markup', suffix: '%', value: DEFAULTS.targetMarkup, help: 'Percentage added on top of cost.' },
      ],
    },
    {
      legend: 'Break-even',
      fields: [
        {
          name: 'fixedCosts', label: 'Monthly fixed costs', prefix: '$', value: DEFAULTS.fixedCosts,
          help: 'Rent, software, subscriptions — anything you pay whether or not you sell.',
        },
      ],
    },
  ],

  answerBlock: ({ example }) => `
<p class="answer-block"><strong>Margin is a share of the price; markup is a share of the cost. They are
never the same number.</strong> Selling a $${DEFAULTS.cost} item for $${DEFAULTS.price} is a
${(example.markup * 100).toFixed(0)}% markup but only a
${(example.margin * 100).toFixed(1)}% margin — $${example.profit.toFixed(2)} of profit per unit. To
convert: margin = markup ÷ (1 + markup). A 50% markup is a 33.3% margin, and pricing as though they
were interchangeable is the most expensive arithmetic mistake in retail.</p>`,

  faqs: ({ example, confusion }) => [
    {
      q: 'What is the difference between margin and markup?',
      a: `<p>The denominator. Markup is profit as a share of what the item <em>cost</em> you; margin is profit as a share of what you <em>sold</em> it for. Same profit, different base, so margin is always the smaller number.</p>
<div class="formula">markup = profit ÷ cost
margin = profit ÷ price</div>
<p>On this example: $${example.profit.toFixed(2)} of profit on a $${DEFAULTS.cost} cost is a ${(example.markup * 100).toFixed(0)}% markup, and that same $${example.profit.toFixed(2)} on a $${DEFAULTS.price} price is a ${(example.margin * 100).toFixed(1)}% margin.</p>`,
    },
    {
      q: 'I want a 50% margin — what markup do I add?',
      a: `<p>100%. To convert a target margin into the markup that achieves it, use markup = margin ÷ (1 − margin). A 50% margin needs a 100% markup; a 40% margin needs 66.7%; a 33.3% margin needs 50%.</p>
<p>Adding 50% because you wanted a 50% margin gives you a ${(confusion.find((c) => c.target === 50).actualMargin * 100).toFixed(1)}% margin instead, and costs <strong>$${confusion.find((c) => c.target === 50).profitLost.toFixed(2)} of profit on every unit</strong> at a $${DEFAULTS.cost} cost. The correct price is $${confusion.find((c) => c.target === 50).correctPrice.toFixed(2)}, not $${confusion.find((c) => c.target === 50).markupPrice.toFixed(2)}.</p>`,
    },
    {
      q: 'How much does confusing them actually cost?',
      a: `<p>More the higher your target, because the error compounds. On a $${DEFAULTS.cost} unit cost:</p>
<ul>
${confusion.map((c) => `<li>Want ${c.target}% margin → adding ${c.target}% markup prices at $${c.markupPrice.toFixed(2)} and delivers ${(c.actualMargin * 100).toFixed(1)}%. Correct price $${c.correctPrice.toFixed(2)}. <strong>Lost: $${c.profitLost.toFixed(2)}/unit</strong></li>`).join('\n')}
</ul>
<p>At 1,000 units a month, the 50% row is $${(confusion.find((c) => c.target === 50).profitLost * 1000).toLocaleString('en-US')} a month of profit that was available and not taken.</p>`,
    },
    {
      q: 'Can I have a margin over 100%?',
      a: `<p>No. Margin is a share of the sale price, so 100% would mean the item cost you nothing and anything above it is arithmetically impossible — the calculator rejects it rather than returning a nonsense figure. Markup has no ceiling: a $1 item sold for $101 is a 10,000% markup and a 99% margin.</p>
<p>This asymmetry is why markup is the friendlier number for conversation and margin is the honest one for planning. A supplier quoting "300% markup" sounds outrageous and means a 75% margin.</p>`,
    },
    {
      q: 'How many units do I need to sell to break even?',
      a: `<p>Fixed costs divided by profit per unit. At $${example.profit.toFixed(2)} of profit and $${DEFAULTS.fixedCosts.toLocaleString('en-US')} of monthly fixed costs, that is <strong>${example.breakEvenUnits} units a month</strong> before you have made anything at all.</p>
<p>The useful thing about this number is how violently it moves with price. Raising the price 10% here — to $${(DEFAULTS.price * 1.1).toFixed(2)} — takes profit per unit to $${(DEFAULTS.price * 1.1 - DEFAULTS.cost).toFixed(2)} and drops break-even to ${Math.ceil(DEFAULTS.fixedCosts / (DEFAULTS.price * 1.1 - DEFAULTS.cost))} units. A 10% price rise cut the volume you need by ${(100 - (Math.ceil(DEFAULTS.fixedCosts / (DEFAULTS.price * 1.1 - DEFAULTS.cost)) / example.breakEvenUnits) * 100).toFixed(0)}%.</p>`,
    },
    {
      q: 'Should I price on margin or markup?',
      a: `<p>Price on markup, plan on margin. Markup is easier to apply consistently across a catalogue where costs vary, which is why distributors and wholesalers work in it. Margin is what your P&L is denominated in and what tells you whether the business works, which is why finance works in it.</p>
<p>The failure happens at the boundary — someone in planning says "we need 40 points" and someone in pricing adds 40%. Agreeing which word means which is worth more than any single pricing decision.</p>`,
    },
  ],

  content: ({ example, confusion, table }) => `
<h2>The two formulas</h2>

<p>Same profit, different denominator. That is the entire difference, and it is worth writing out
because almost every pricing mistake traces back to using one where the other was meant.</p>

<div class="formula">profit = price − cost

markup = profit ÷ cost     ("percentage added to my cost")
margin = profit ÷ price    ("percentage of the sale I keep")

margin = markup ÷ (1 + markup)
markup = margin ÷ (1 − margin)</div>

<p>Because price is always larger than cost for a profitable item, margin is always the smaller
number. A 50% markup is a 33.3% margin. A 100% markup is a 50% margin. A 300% markup — which sounds
predatory — is a 75% margin, which is an ordinary software gross margin.</p>

<h2>What confusing them costs, in dollars</h2>

<p>"Margin and markup are different" is repeated everywhere and priced nowhere. Here is the actual
cost of the specific mistake people make: deciding on a target margin, then adding that percentage to
cost as a markup. On a $${DEFAULTS.cost} unit cost:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Margin you wanted</th>
  <th scope="col">Price if you add it as markup</th>
  <th scope="col">Margin you actually get</th>
  <th scope="col">Price you needed</th>
  <th scope="col">Profit lost per unit</th>
</tr></thead>
<tbody>
${confusion.map((c) => `<tr>
  <td>${c.target}%</td>
  <td>$${c.markupPrice.toFixed(2)}</td>
  <td>${(c.actualMargin * 100).toFixed(1)}%</td>
  <td>$${c.correctPrice.toFixed(2)}</td>
  <td><strong>$${c.profitLost.toFixed(2)}</strong></td>
</tr>`).join('\n')}
</tbody>
</table>
</div>

<p>Read the last column downward. The error is not constant — it accelerates. At a 20% target it costs
$${confusion[0].profitLost.toFixed(2)} a unit, which most people would never notice. At a 60% target it
costs $${confusion.at(-1).profitLost.toFixed(2)} a unit, which is
${(confusion.at(-1).profitLost / confusion[0].profitLost).toFixed(0)} times as much and more than the
entire profit the wrong price produces. High-margin businesses are punished hardest by this mistake,
which is exactly backwards from where people expect the risk to be.</p>

<h2>Margin at different prices</h2>

<p>The same $${DEFAULTS.cost} cost across a range of prices, so you can see how quickly margin moves:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Price</th><th scope="col">Profit</th><th scope="col">Margin</th><th scope="col">Markup</th></tr></thead>
<tbody>
${table.map((row) => `<tr><td>$${row.price.toFixed(2)}</td><td>$${row.profit.toFixed(2)}</td><td>${(row.margin * 100).toFixed(1)}%</td><td>${(row.markup * 100).toFixed(0)}%</td></tr>`).join('\n')}
</tbody>
</table>
</div>

<p>Notice the shape: doubling the price from $${table[0].price.toFixed(2)} to
$${table[2].price.toFixed(2)} does not double the margin, it moves it from
${(table[0].margin * 100).toFixed(1)}% to ${(table[2].margin * 100).toFixed(1)}%. Margin has a ceiling
at 100% and approaches it asymptotically, which is why chasing the last few margin points costs
disproportionately more price than the first few.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.cost} unit sold for $${DEFAULTS.price}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Selling price</td><td>what the customer pays</td><td>$${DEFAULTS.price.toFixed(2)}</td></tr>
<tr><td>Unit cost</td><td>what it costs you</td><td>−$${DEFAULTS.cost.toFixed(2)}</td></tr>
<tr><td><strong>Profit per unit</strong></td><td>price − cost</td><td><strong>$${example.profit.toFixed(2)}</strong></td></tr>
<tr><td>Markup</td><td>$${example.profit.toFixed(2)} ÷ $${DEFAULTS.cost.toFixed(2)}</td><td>${(example.markup * 100).toFixed(1)}%</td></tr>
<tr><td>Margin</td><td>$${example.profit.toFixed(2)} ÷ $${DEFAULTS.price.toFixed(2)}</td><td>${(example.margin * 100).toFixed(1)}%</td></tr>
<tr><td><strong>Break-even</strong></td><td>$${DEFAULTS.fixedCosts.toLocaleString('en-US')} ÷ $${example.profit.toFixed(2)}</td><td><strong>${example.breakEvenUnits} units/month</strong></td></tr>
</tbody>
</table>
</div>
<p>If you had wanted a ${(example.markup * 100).toFixed(0)}% <em>margin</em> rather than a
${(example.markup * 100).toFixed(0)}% markup, the price would have had to be
$${(DEFAULTS.cost / (1 - example.markup)).toFixed(2)} — nearly
$${((DEFAULTS.cost / (1 - example.markup)) - DEFAULTS.price).toFixed(2)} higher per unit. That single
substitution is the difference between a business that clears its fixed costs and one that does not.</p>
</div>

<h2>Who this is for</h2>
<p>Anyone setting prices, and anyone reconciling a supplier's markup language with their own margin
targets. It is most useful run in "target margin" mode: enter what you need to keep and let it produce
the price, rather than picking a price and discovering the margin afterwards. If you sell on a
marketplace, run the resulting price through the relevant fee calculator too — platform fees come out
of the margin this page computes, not out of thin air.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Platform and payment fees</strong>, which reduce the price side of the margin. See the
<a href="/etsy-fee-calculator/">Etsy</a>, <a href="/ebay-fee-calculator/">eBay</a>, and
<a href="/amazon-fba-calculator/">Amazon FBA</a> calculators.</li>
<li><strong>Returns and shrinkage</strong>, which raise effective unit cost across a catalogue.</li>
<li><strong>Discounting.</strong> A 20% promotional discount on a 33% margin removes roughly 60% of
the profit, not 20%.</li>
<li><strong>Blended margin.</strong> This is per-unit; a catalogue's overall margin is weighted by
what actually sells, which is rarely what you expect.</li>
<li><strong>Your time</strong>, which is the largest uncosted input for anyone making the product
themselves.</li>
</ul>

<h2>Sources and dates</h2>
<p>There are no rate sources on this page — margin and markup are definitions rather than published
figures, and every number above is arithmetic on the cost and price you enter. The conversion
identities are standard: margin = markup ÷ (1 + markup), and its inverse. If a figure here disagrees
with your accounting system, the likely cause is that the two are using different denominators, which
is the whole subject of this page — <a href="/contact/">let us know</a> either way.</p>
`,
};
