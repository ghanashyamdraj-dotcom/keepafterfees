/**
 * charge-to-receive.js — page definition for /charge-to-receive-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that the required gross-up is always LARGER than the
 * fee percentage, and that a capped fee flips the naive method's error sign.
 *
 * Adding 2.9% to a $500 target gives $514.80, which nets $499.57 — short.
 * The fee applies to the larger amount you now charge, so the correct answer is
 * (target + fixed) / (1 - rate) = $515.25, a gross-up of 3.05% rather than
 * 2.90%. Every "just add the fee" invoice comes up a few dollars light, and the
 * gap is systematic rather than rounding.
 *
 * The wrinkle worth the page: with a CAPPED fee (Stripe ACH at 0.8% capped at
 * $5) the naive method stops undercharging and starts OVERcharging, because it
 * adds a percentage where the real fee has gone flat. On a $5,000 target it
 * overshoots by $35 — the client is billed for a fee that was never charged.
 * Both directions are produced by the engine, not asserted.
 */

const DEFAULTS = {
  processorId: 'stripe',
  // Qualified "processor:product" so the single select above carries both.
  productId: 'stripe:online-domestic',
  targetNet: 500,
  international: false,
  currencyConversion: false,
};

export default {
  id: 'charge-to-receive',
  kind: 'tool',
  calculator: 'charge-to-receive',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Charge-to-Receive Calculator',

  presets: {
    field: 'targetNet',
    label: 'I need to receive exactly…',
    values: [100, 250, 500, 1000, 2500, 5000],
  },
  featureList: [
    'Solves the invoice amount that nets an exact target after fees',
    'PayPal, Stripe, Square, Wise and Payoneer fee schedules',
    'Shows what the naive "add the percentage" method would have left you short by',
    'Handles capped fees, where the closed form breaks and the naive method overshoots',
  ],

  groups: (rates) => [
    {
      legend: 'What you need to receive',
      fields: [
        {
          name: 'targetNet', label: 'Amount you must receive', prefix: '$', value: DEFAULTS.targetNet,
          help: 'The figure that has to land in your account, after fees.',
        },
        // ONE select carrying both processor and schedule, as "processor:product".
        // Two independent selects would let the form display a Stripe schedule
        // while the engine computed PayPal's, because readForm() in app.js
        // rebuilds the input from the DOM and nothing repopulates a dependent
        // select. getProduct() resolves the qualified form; see processors.js.
        {
          name: 'productId', label: 'Processor and fee schedule', type: 'select',
          value: DEFAULTS.productId,
          options: Object.entries(rates.processors)
            .filter(([, v]) => v && typeof v === 'object' && Array.isArray(v.products))
            .flatMap(([id, v]) => v.products.map((p) => ({
              value: `${id}:${p.id}`,
              label: `${v.label} — ${p.label}`,
            }))),
        },
      ],
    },
    {
      legend: 'Surcharges',
      fields: [
        { name: 'international', label: 'Payer is outside the US', type: 'checkbox', value: DEFAULTS.international, wide: true },
        { name: 'currencyConversion', label: 'Currency conversion required', type: 'checkbox', value: DEFAULTS.currencyConversion, wide: true },
      ],
    },
  ],

  answerBlock: ({ example, rates }) => `
<p class="answer-block"><strong>To receive exactly $${DEFAULTS.targetNet} you have to invoice
$${example.chargeAmount.toFixed(2)}, not $${example.naive.charge.toFixed(2)}.</strong> The fee is
charged on the larger amount you now bill, so adding the fee percentage to your target always leaves
you short — by $${example.naive.shortfall.toFixed(2)} here. The correct sum is
($${DEFAULTS.targetNet} + fixed fee) ÷ (1 − rate), which works out to a gross-up of
${(((example.chargeAmount - DEFAULTS.targetNet) / DEFAULTS.targetNet) * 100).toFixed(2)}% — always more
than the fee rate itself. Rates effective ${rates.processors.effective}.</p>`,

  faqs: ({ example, ladder, capped, forward }) => [
    {
      q: 'How do I work out what to charge to receive an exact amount?',
      a: `<p>Divide, do not add. The formula is:</p>
<div class="formula">charge = (target + fixed fee) ÷ (1 − rate)</div>
<p>For $${DEFAULTS.targetNet} at 2.9% + $0.30 that is ($${DEFAULTS.targetNet} + $0.30) ÷ 0.971 = <strong>$${example.chargeAmount.toFixed(2)}</strong>. Charging that leaves exactly $${example.actualNet.toFixed(2)} after the fee — verified by running the forward calculation back through the fee engine, which gives $${forward.totals.net.toFixed(2)}.</p>`,
    },
    {
      q: 'Why does adding the fee percentage leave me short?',
      a: `<p>Because the fee is charged on the amount you actually bill, which is now bigger than your target. Add 2.9% to $${DEFAULTS.targetNet} and you invoice $${example.naive.charge.toFixed(2)}; the processor then takes 2.9% <em>of that larger figure</em>, so you receive $${example.naive.net.toFixed(2)} — $${example.naive.shortfall.toFixed(2)} short.</p>
<p>The error compounds with the fee rate. It is small enough to ignore once and large enough to matter across a year of invoices: at this rate you lose roughly ${(((example.naive.shortfall) / DEFAULTS.targetNet) * 100).toFixed(2)}% of every invoice you gross up the wrong way.</p>`,
    },
    {
      q: 'Is the gross-up percentage the same as the fee percentage?',
      a: `<p>No, and it is always larger. A 2.9% fee needs a ${(((example.chargeAmount - DEFAULTS.targetNet) / DEFAULTS.targetNet) * 100).toFixed(2)}% gross-up because you are recovering a fee charged on the grossed-up total. The relationship is 1/(1−rate) − 1 rather than the rate itself, so the gap widens as fees rise: a 3% fee needs 3.09%, and a 10% fee needs 11.11%.</p>
<ul>
${ladder.map((l) => `<li>Receive $${l.targetNet.toLocaleString('en-US')} → invoice <strong>$${l.charge.toFixed(2)}</strong> (gross-up ${(l.grossUp * 100).toFixed(2)}%, naive method short by $${l.shortfall.toFixed(2)})</li>`).join('\n')}
</ul>`,
    },
    {
      q: 'What happens with a capped fee like Stripe ACH?',
      a: `<p>The closed form stops applying, and the naive method flips from undercharging to <em>overcharging</em>. Stripe's ACH is 0.8% capped at $5, so above $625 the fee is flat — there is no percentage left to gross up.</p>
<p>To receive $5,000 by ACH you invoice <strong>$${capped.chargeAmount.toLocaleString('en-US')}</strong>, which is simply the target plus the $5 cap. Add 0.8% instead and you would bill $${capped.naive.charge.toLocaleString('en-US')} and receive $${capped.naive.net.toLocaleString('en-US')} — <strong>$${Math.abs(capped.naive.shortfall).toFixed(2)} more than you asked for</strong>, billed to your client for a fee nobody charged. This calculator re-solves against the cap rather than trusting the formula.</p>`,
    },
    {
      q: 'Can I legally pass the fee to my client?',
      a: `<p>It depends on the processor's own agreement and on where you and the client are. PayPal's US user agreement does not permit surcharging specifically for using PayPal; card network rules on surcharging vary by state and country and carry disclosure requirements. Building the cost into your rate is uncontroversial everywhere; adding a visible "processing fee" line is worth checking first.</p>
<p>Regardless of which route you take, the arithmetic is the same — the only question is whether the client sees the gross-up as a separate line or as a slightly higher price.</p>`,
    },
    {
      q: 'Should I just round up instead?',
      a: `<p>For a single invoice, rounding to the next $5 is usually fine and is simpler to explain. The reason to do it properly is recurring billing: a subscription that nets $${example.naive.shortfall.toFixed(2)} less than intended, twelve times a year, across a few hundred customers, is a real revenue line that nobody ever notices because each individual shortfall looks like rounding.</p>`,
    },
  ],

  content: ({ example, ladder, capped, forward, rates }) => `
<h2>The formula</h2>

<p>The mistake is universal and it is always in the same direction: people add the fee percentage to
the amount they want, when the fee will be charged on the larger amount they end up billing.</p>

<div class="formula">wrong:  charge = target × (1 + rate) + fixed
right:  charge = (target + fixed) ÷ (1 − rate)</div>

<p>The right-hand form falls straight out of the requirement. If you charge <em>c</em> and the
processor takes <em>rate × c + fixed</em>, then what lands is <em>c − rate × c − fixed</em>. Set that
equal to your target and solve for <em>c</em>. Rounded up to the cent, because rounding down leaves
you a penny short and a penny short on an invoice is a support email.</p>

<h2>What the naive method actually costs</h2>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">You need</th>
  <th scope="col">Invoice this</th>
  <th scope="col">Gross-up</th>
  <th scope="col">"Just add the %" gives</th>
  <th scope="col">Short by</th>
</tr></thead>
<tbody>
${ladder.map((l) => `<tr>
  <td>$${l.targetNet.toLocaleString('en-US')}</td>
  <td><strong>$${l.charge.toFixed(2)}</strong></td>
  <td>${(l.grossUp * 100).toFixed(2)}%</td>
  <td>$${l.naiveCharge.toFixed(2)}</td>
  <td>$${l.shortfall.toFixed(2)}</td>
</tr>`).join('\n')}
</tbody>
</table>
</div>

<p>The gross-up column is the part worth internalising: recovering a 2.90% fee takes a
${(ladder[0].grossUp * 100).toFixed(2)}%–${(ladder.at(-1).grossUp * 100).toFixed(2)}% markup, never
2.90%. The two converge as the invoice grows because the fixed 30¢ matters less, but the percentage
gap never closes — it is 1/(1−rate) − 1, which is strictly greater than the rate for any positive
rate.</p>

<h2>Capped fees break the formula</h2>

<p>Everything above assumes the fee keeps scaling with the amount. Some do not. Stripe's ACH Direct
Debit is 0.8% <strong>capped at $5</strong>, so past $625 the fee stops growing and the closed form
starts producing nonsense — it keeps grossing up a percentage that is no longer being charged.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Receive $5,000 by ACH</th><th scope="col">Invoice</th><th scope="col">Fee</th><th scope="col">You receive</th></tr></thead>
<tbody>
<tr data-best><td>Solved against the cap</td><td><strong>$${capped.chargeAmount.toLocaleString('en-US')}</strong></td><td>$${capped.fee.toFixed(2)}</td><td>$${capped.actualNet.toLocaleString('en-US')}</td></tr>
<tr><td>"Just add 0.8%"</td><td>$${capped.naive.charge.toLocaleString('en-US')}</td><td>$${capped.fee.toFixed(2)}</td><td>$${capped.naive.net.toLocaleString('en-US')}</td></tr>
</tbody>
</table>
</div>

<p>Note the direction has reversed. With a capped fee the naive method does not leave you short — it
<strong>overcharges the client by $${Math.abs(capped.naive.shortfall).toFixed(2)}</strong> for a fee
that was never levied. The correct answer is simply the target plus the $5 cap. This calculator
detects the cap and re-solves rather than applying the formula blindly, which is the difference
between a calculator and a rearranged equation.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>Receiving exactly $${DEFAULTS.targetNet} through Stripe</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Step</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Target</td><td>what must land in your account</td><td>$${DEFAULTS.targetNet.toFixed(2)}</td></tr>
<tr><td>Add the fixed fee</td><td>$${DEFAULTS.targetNet.toFixed(2)} + $0.30</td><td>$${(DEFAULTS.targetNet + 0.3).toFixed(2)}</td></tr>
<tr><td>Divide by (1 − rate)</td><td>÷ 0.971</td><td>$${example.chargeAmount.toFixed(2)}</td></tr>
<tr data-best><td><strong>Invoice this</strong></td><td>rounded up to the cent</td><td><strong>$${example.chargeAmount.toFixed(2)}</strong></td></tr>
<tr><td>Processor takes</td><td>2.9% × $${example.chargeAmount.toFixed(2)} + $0.30</td><td>−$${example.fee.toFixed(2)}</td></tr>
<tr><td><strong>You receive</strong></td><td>checked against the fee engine</td><td><strong>$${forward.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>
<p>The last line is the verification rather than a restatement: the invoice amount is fed back through
the same forward fee calculation the <a href="/stripe-fee-calculator/">Stripe fee calculator</a> uses,
and it lands on $${forward.totals.net.toFixed(2)}. If the two ever disagreed, one of them would be
wrong — which is exactly the check most reverse-fee calculators never perform.</p>
</div>

<h2>Who this is for</h2>
<p>Freelancers and agencies who quote a number and need that number to arrive intact, and anyone
setting up recurring billing where a small systematic shortfall multiplies quietly. It is also the
right tool for the "can I pass the fee to the client" question, because it tells you the honest size
of the fee rather than the one that feels right.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Currency movement</strong> between invoicing and settlement, which can dwarf the fee.</li>
<li><strong>Withholding tax</strong> deducted at source by some overseas clients.</li>
<li><strong>Bank receiving fees</strong> at your end, which are separate from the processor's cut.</li>
<li><strong>Whether surcharging is permitted</strong> under your processor agreement and local law.</li>
<li><strong>Income tax.</strong> The amount that arrives is still pre-tax — see the
<a href="/invoice-take-home-calculator/">invoice take-home calculator</a>.</li>
</ul>

<h2>Sources and dates</h2>
<p>Every fee schedule comes from the processor's own published pricing, listed below with the date it
was checked. The gross-up figures are solved by this page's engine from those rates and verified by
feeding the result back through the forward fee calculation. If a figure disagrees with your
processor's dashboard, trust the dashboard and <a href="/contact/">let us know</a>.</p>
`,
};
