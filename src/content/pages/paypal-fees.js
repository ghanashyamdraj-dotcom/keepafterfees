/**
 * paypal-fees.js — page definition for /paypal-fee-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is the micropayments crossover, derived rather than
 * repeated. PayPal publishes both fee schedules — standard at 3.49% + $0.49,
 * micropayments at 4.99% + $0.09 — but never the amount at which they cross.
 * Every other PayPal calculator either ignores micropayments entirely or
 * repeats a folk figure. Setting the two lines equal gives $26.67 exactly, and
 * because micropayments is an account-wide setting rather than a per-payment
 * choice, that number is the whole decision.
 *
 * Second angle: surcharge stacking. The international fee and the currency
 * conversion spread are quoted separately by PayPal and are additive on the
 * rate, so a cross-border payment taken in the buyer's currency runs at
 * 8.99% + $0.49 — two and a half times the domestic fee. The page states that
 * with the arithmetic rather than as a warning.
 */

const DEFAULTS = {
  processorId: 'paypal',
  productId: 'checkout',
  amount: 500,
  transactions: 1,
  international: false,
  currencyConversion: false,
  direction: 'forward',
};

export default {
  id: 'paypal-fees',
  kind: 'tool',
  calculator: 'processor-fees',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'PayPal Fee Calculator',

  presets: {
    field: 'amount',
    label: 'How much does PayPal take from a…',
    values: [50, 100, 250, 500, 1000, 5000],
  },
  featureList: [
    'Every published PayPal fee schedule: checkout, invoicing, QR code, micropayments, friends and family',
    'International and currency conversion surcharges, applied the way PayPal stacks them',
    'The exact micropayments crossover, derived from the two rate lines',
    'Effective fee rate and what actually lands in your balance',
  ],

  groups: (rates) => [
    {
      legend: 'The payment',
      fields: [
        // Pinned, not chosen: this page is the PayPal page. Present as a real
        // field because the client rebuilds its engine input from the form
        // alone — without it, effectiveRate() would fall back to its 'stripe'
        // default on the first keystroke.
        { name: 'processorId', type: 'hidden', value: 'paypal' },
        /**
         * Forward / reverse. "What do I invoice to receive exactly $500?" is a
         * distinct, high-intent question with almost no competition, and it is
         * the one freelancers actually ask — so it lives in this tool rather
         * than only on its own page. Switching this swaps which engine runs.
         */
        {
          name: 'direction', label: 'What do you want to work out?', type: 'radio',
          value: DEFAULTS.direction, wide: true,
          options: [
            { value: 'forward', label: 'What PayPal takes from a payment' },
            { value: 'reverse', label: 'What to charge to receive an exact amount' },
          ],
        },
        {
          name: 'amount', label: 'Payment amount', prefix: '$', value: DEFAULTS.amount,
          help: 'In reverse mode this is the amount you want to land in your balance.',
        },
        {
          name: 'productId', label: 'Fee schedule', type: 'select', value: DEFAULTS.productId,
          options: rates.processors.paypal.products.map((p) => ({ value: p.id, label: p.label })),
          help: 'Goods and services default to PayPal Checkout.',
        },
        {
          name: 'transactions', label: 'Number of payments', value: DEFAULTS.transactions, step: '1',
          help: 'Model a month of identical payments at once.',
        },
      ],
    },
    {
      legend: 'Surcharges',
      fields: [
        {
          name: 'international', label: 'Buyer is outside the US', type: 'checkbox',
          value: DEFAULTS.international, wide: true,
          help: `Adds ${(rates.processors.paypal.crossBorderFee.rate * 100).toFixed(2)}% — it follows the buyer's account country, not their card.`,
        },
        {
          name: 'currencyConversion', label: 'Payment needs a currency conversion', type: 'checkbox',
          value: DEFAULTS.currencyConversion, wide: true,
          help: `Adds ${(rates.processors.paypal.currencyConversion.rate * 100).toFixed(2)}% on top of the international fee.`,
        },
      ],
    },
  ],

  answerBlock: ({ example, rates, crossover }) => {
    const p = rates.processors.paypal;
    const std = p.products.find((x) => x.id === 'checkout');
    return `
<p class="answer-block"><strong>PayPal's standard US rate for goods and services is
${(std.rate * 100).toFixed(2)}% + $${std.fixed.toFixed(2)} per payment.</strong> On a
$${DEFAULTS.amount} payment that is $${example.totals.fees.toFixed(2)}, leaving you
<strong>$${example.totals.net.toFixed(2)}</strong> — an effective rate of
${(example.totals.effectiveFeeRate * 100).toFixed(2)}%, because the fixed
$${std.fixed.toFixed(2)} matters less the larger the payment gets. A buyer outside the US adds
${(p.crossBorderFee.rate * 100).toFixed(2)}%, and a currency conversion adds
${(p.currencyConversion.rate * 100).toFixed(2)}% on top of that. Micropayments pricing is cheaper
below $${crossover.amount.toFixed(2)} and more expensive above it. Rates effective
${rates.processors.effective}.</p>`;
  },

  faqs: ({ crossover, example, intlFx, rates, tiny, grossUp }) => [
    {
      q: 'What percentage does PayPal take?',
      a: `<p>For US goods-and-services payments through PayPal Checkout, ${(rates.processors.paypal.products.find((p) => p.id === 'checkout').rate * 100).toFixed(2)}% plus a fixed $0.49 per payment. The fixed component is what makes the headline percentage misleading in both directions: on a $10 payment the effective rate is ${(tiny.totals.effectiveFeeRate * 100).toFixed(2)}%, on a $${DEFAULTS.amount} payment it is ${(example.totals.effectiveFeeRate * 100).toFixed(2)}%, and on a $5,000 payment it approaches the 3.49% floor. Any answer that gives you a single percentage without asking the amount is wrong.</p>`,
    },
    {
      q: 'At what amount does PayPal micropayments pricing become worse than standard?',
      a: `<p><strong>$${crossover.amount.toFixed(2)}.</strong> Standard pricing is 3.49% + $0.49; micropayments is 4.99% + $0.09. Setting them equal — 0.0349x + 0.49 = 0.0499x + 0.09 — gives x = 0.40 ÷ 0.015 = $${crossover.amount.toFixed(2)}. Below that, the 40¢ you save on the fixed fee outweighs the extra 1.5% on the percentage; above it, the percentage wins and keeps winning.</p>
<p>Because each side is rounded to the cent independently, real fees are identical for a few cents either side of the crossover: micropayments is strictly cheaper up to $${crossover.strictBelow.toFixed(2)} and standard is strictly cheaper from $${crossover.strictAbove.toFixed(2)}. PayPal publishes both schedules but not the crossover, which is why the figure you usually see quoted — around $12 — is folklore rather than arithmetic.</p>`,
    },
    {
      q: 'Should I switch to micropayments pricing?',
      a: `<p>Only if most of your payments are below $${crossover.amount.toFixed(2)}, because micropayments applies to your entire account rather than per transaction. You cannot route small payments through it and large ones around it. The test is not your average payment — one $2,000 invoice drags an average upward while contributing a single transaction — it is the <em>median</em>, and more precisely the share of your payment count that falls below the crossover.</p>
<p>A useful rule: work out your total fee both ways across a representative month. If you take 400 payments averaging $8 and two invoices of $1,500, micropayments saves roughly $100 on the small ones and costs about $45 on the two large ones, so it wins. Flip the mix and it loses badly. You must request micropayments pricing from PayPal; it is not a setting you can toggle yourself.</p>`,
    },
    {
      q: 'How much does PayPal charge for international payments?',
      a: `<p>Two separate surcharges that add to the rate rather than replacing it. The international commercial transaction fee is ${(rates.processors.paypal.crossBorderFee.rate * 100).toFixed(2)}% and applies when the buyer's PayPal account is registered outside the US. Currency conversion is a further ${(rates.processors.paypal.currencyConversion.rate * 100).toFixed(2)}% spread over the wholesale exchange rate, charged whenever money moves between currencies.</p>
<p>Stacked on the standard 3.49%, a cross-border payment taken in the buyer's currency runs at <strong>8.99% + $0.49</strong>. On the $${DEFAULTS.amount} payment above, that is $${intlFx.totals.fees.toFixed(2)} against $${example.totals.fees.toFixed(2)} domestically — you keep $${(example.totals.net - intlFx.totals.net).toFixed(2)} less for doing the same work. The 4% conversion spread is the larger of the two and the one sellers most often miss, because it is not itemised as a fee; it is buried in the exchange rate you are given.</p>`,
    },
    {
      q: 'Can I ask my client to pay the PayPal fee?',
      a: `<p>You can add it to the invoice, but adding the fee percentage to your total does not recover it — the fee is charged on the larger amount you now invoice, not on your original target. To receive exactly $${DEFAULTS.amount} at 3.49% + $0.49 you must invoice ($${DEFAULTS.amount} + $0.49) ÷ (1 − 0.0349) = <strong>$${grossUp.chargeAmount.toFixed(2)}</strong>, not the $${grossUp.naive.charge.toFixed(2)} that adding 3.49% gives you — which would land you $${grossUp.naive.shortfall.toFixed(2)} short. See the <a href="/charge-to-receive-calculator/">charge-to-receive calculator</a>, which does this correctly.</p>
<p>Note also that PayPal's US user agreement does not permit surcharging a buyer specifically for using PayPal in the way card network rules are sometimes read to allow. Building the cost into your rate is uncontroversial; adding a visible "PayPal fee" line to a consumer invoice is worth checking against your current agreement.</p>`,
    },
    {
      q: 'Is Friends and Family really free, and can I use it for business?',
      a: `<p>It is free when funded by a PayPal balance or a linked bank account, and 2.99% when funded by a card — in which case the <em>sender</em> pays, not you. But using it for a genuine sale is a bad trade even when the fee is zero: Friends and Family payments carry no Purchase Protection and no Seller Protection, so a disputed payment has no structure behind it. PayPal treats systematic commercial use of Friends and Family as an account-level violation, and the remedy is a limitation on the account holding your money.</p>
<p>The 3.49% is, in substance, the price of dispute infrastructure. That is a real product and sometimes worth it, but it is worth being clear about what you are paying for rather than treating it as a toll.</p>`,
    },
    {
      q: 'Why did PayPal take more than this calculator shows?',
      a: `<p>Usually one of four things. A currency conversion you did not realise happened, which is the ${(rates.processors.paypal.currencyConversion.rate * 100).toFixed(2)}% above and is invisible because it is priced into the exchange rate. A chargeback, which costs $${rates.processors.paypal.chargebackFee.toFixed(2)} on top of the reversed amount. An instant transfer to your bank rather than the free standard transfer. Or a payment that was cross-border without looking it was — the surcharge follows the buyer's <em>account country</em>, so a client who lives in New York but registered their PayPal account in Canada triggers it.</p>`,
    },
  ],

  content: ({ example, rates, crossover, ladder, intl, intlFx, asMicropayments, small, valueSections }) => {
    const p = rates.processors.paypal;
    const std = p.products.find((x) => x.id === 'checkout');
    const micro = p.products.find((x) => x.id === 'micropayments');

    const ladderRows = ladder
      .map((row) => {
        const winner = row.delta > 0 ? 'Micropayments' : row.delta < 0 ? 'Standard' : 'Tie';
        return `<tr${row.delta === 0 ? ' data-best' : ''}>
  <td>$${row.amount.toFixed(2)}</td>
  <td>$${row.standard.toFixed(2)}</td>
  <td>$${row.micro.toFixed(2)}</td>
  <td>${row.delta === 0 ? '—' : `${row.delta > 0 ? '+' : '−'}$${Math.abs(row.delta).toFixed(2)}`}</td>
  <td>${winner}</td>
</tr>`;
      })
      .join('\n');

    return `
${valueSections}

<h2>How PayPal's fee is calculated</h2>

<p>One percentage and one fixed fee, applied to the full amount the buyer pays — including any shipping
or tax you charged them. There is no tiering and no volume discount on standard pricing, which makes
PayPal one of the simpler processors to model and one of the easier ones to underestimate.</p>

<div class="formula">fee = ${(std.rate * 100).toFixed(2)}% × amount + $${std.fixed.toFixed(2)}
      + ${(p.crossBorderFee.rate * 100).toFixed(2)}% × amount   (buyer outside the US)
      + ${(p.currencyConversion.rate * 100).toFixed(2)}% × amount   (currency conversion)</div>

<p>The surcharges add to the <em>rate</em>, not to the fee. That is the detail that makes cross-border
payments cost so much more than sellers expect, and it is covered further down.</p>

<h2>The micropayments crossover, derived</h2>

<p>PayPal offers a second fee schedule called micropayments: ${(micro.rate * 100).toFixed(2)}% +
$${micro.fixed.toFixed(2)} instead of ${(std.rate * 100).toFixed(2)}% + $${std.fixed.toFixed(2)}. A higher
percentage bought with a much lower fixed fee. PayPal publishes both schedules and never publishes the
amount at which they cross, so most advice quotes a remembered figure — usually "around $12" — that is
simply wrong. It is a two-line equation:</p>

<div class="formula">${std.rate} x + ${std.fixed.toFixed(2)}  =  ${micro.rate} x + ${micro.fixed.toFixed(2)}
${(std.fixed - micro.fixed).toFixed(2)}  =  ${(micro.rate - std.rate).toFixed(4)} x
x  =  ${(std.fixed - micro.fixed).toFixed(2)} ÷ ${(micro.rate - std.rate).toFixed(4)}  =  $${crossover.amount.toFixed(2)}</div>

<p>Below $${crossover.amount.toFixed(2)} the 40¢ saved on the fixed fee is worth more than the extra
${((micro.rate - std.rate) * 100).toFixed(2)}% on the percentage. Above it, the percentage dominates.
Here is every figure computed at the live rates rather than typed:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Payment</th>
  <th scope="col">Standard fee</th>
  <th scope="col">Micropayments fee</th>
  <th scope="col">Difference</th>
  <th scope="col">Cheaper</th>
</tr></thead>
<tbody>
${ladderRows}
</tbody>
</table>
</div>

<p>Because each fee is rounded to the cent on its own, the two schedules tie for a few cents around the
crossover: micropayments is strictly cheaper up to <strong>$${crossover.strictBelow.toFixed(2)}</strong>
and standard is strictly cheaper from <strong>$${crossover.strictAbove.toFixed(2)}</strong>. Nothing
turns on that gap in practice, but a calculator that claims a hard flip at a single cent is overstating
its own precision.</p>

<p>The decision this drives is account-wide, which is what makes it consequential. Micropayments is not a
per-payment option — you request it from PayPal and it then applies to everything. So the question is not
"is this payment below $${crossover.amount.toFixed(2)}" but "what share of my payment <em>count</em> is
below $${crossover.amount.toFixed(2)}". Sellers reason about this with their average payment size, which
is the wrong statistic: a single large invoice moves the average a long way while contributing one
transaction. On the $${DEFAULTS.amount} payment this page opens with, micropayments would cost
$${asMicropayments.totals.fees.toFixed(2)} against $${example.totals.fees.toFixed(2)} — a
$${(asMicropayments.totals.fees - example.totals.fees).toFixed(2)} penalty for being on the wrong schedule.</p>

<h2>What stacking the surcharges actually costs</h2>

<p>PayPal quotes the international fee and the currency conversion separately, and both are expressed as
percentages of the payment. They add to the rate. The result is a fee most sellers have never worked out:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Same $${DEFAULTS.amount} payment</th>
  <th scope="col">Rate</th>
  <th scope="col">Fee</th>
  <th scope="col">You receive</th>
</tr></thead>
<tbody>
<tr>
  <td>US buyer, USD</td>
  <td>${(std.rate * 100).toFixed(2)}% + $${std.fixed.toFixed(2)}</td>
  <td>$${example.totals.fees.toFixed(2)}</td>
  <td>$${example.totals.net.toFixed(2)}</td>
</tr>
<tr>
  <td>Overseas buyer, USD</td>
  <td>${((std.rate + p.crossBorderFee.rate) * 100).toFixed(2)}% + $${std.fixed.toFixed(2)}</td>
  <td>$${intl.totals.fees.toFixed(2)}</td>
  <td>$${intl.totals.net.toFixed(2)}</td>
</tr>
<tr>
  <td>Overseas buyer, their currency</td>
  <td>${((std.rate + p.crossBorderFee.rate + p.currencyConversion.rate) * 100).toFixed(2)}% + $${std.fixed.toFixed(2)}</td>
  <td>$${intlFx.totals.fees.toFixed(2)}</td>
  <td>$${intlFx.totals.net.toFixed(2)}</td>
</tr>
</tbody>
</table>
</div>

<p>The bottom row costs <strong>${(intlFx.totals.fees / example.totals.fees).toFixed(1)}×</strong> the top
row for identical work. The ${(p.currencyConversion.rate * 100).toFixed(2)}% conversion spread is the
larger of the two surcharges and the one that goes unnoticed, because it is not itemised anywhere — it is
applied inside the exchange rate you are quoted, so the transaction detail shows a plausible-looking rate
and no separate line. If you invoice overseas clients regularly, billing them in USD removes that
${(p.currencyConversion.rate * 100).toFixed(2)}% entirely and leaves only the
${(p.crossBorderFee.rate * 100).toFixed(2)}% cross-border fee.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${DEFAULTS.amount} invoice paid through PayPal by a US client</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Invoice paid</td><td>what the client sends</td><td>$${DEFAULTS.amount.toFixed(2)}</td></tr>
<tr><td>Percentage fee</td><td>${(std.rate * 100).toFixed(2)}% × $${DEFAULTS.amount.toFixed(2)}</td><td>−$${(DEFAULTS.amount * std.rate).toFixed(2)}</td></tr>
<tr><td>Fixed fee</td><td>per payment, flat</td><td>−$${std.fixed.toFixed(2)}</td></tr>
<tr><td><strong>PayPal takes</strong></td><td>${(example.totals.effectiveFeeRate * 100).toFixed(2)}% effective</td><td><strong>−$${example.totals.fees.toFixed(2)}</strong></td></tr>
<tr><td><strong>Lands in your balance</strong></td><td></td><td><strong>$${example.totals.net.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Note the effective rate: ${(example.totals.effectiveFeeRate * 100).toFixed(2)}%, not 3.49%. The fixed
$${std.fixed.toFixed(2)} is only ${((std.fixed / DEFAULTS.amount) * 100).toFixed(2)} percentage points here,
but on a $20 payment the same $${std.fixed.toFixed(2)} is ${((std.fixed / 20) * 100).toFixed(2)} points and the
effective rate is ${(small.totals.effectiveFeeRate * 100).toFixed(2)}% — worse than the headline by a margin
that decides whether small orders are worth taking at all.</p>
</div>

<h2>Who this is for</h2>
<p>Freelancers and small sellers invoicing through PayPal, and anyone deciding whether to request
micropayments pricing. It is most useful run twice: once at your typical payment size and once at your
smallest, because the fixed fee means those two are different businesses. If your small payments are
below $${crossover.amount.toFixed(2)} and there are a lot of them, the micropayments table above is the
single most valuable thing on this page.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Chargebacks</strong>, at $${p.chargebackFee.toFixed(2)} each on top of the reversed payment.
Disputes resolved through PayPal's own resolution centre do not carry the fee; card-network chargebacks do.</li>
<li><strong>Instant transfer to your bank</strong>, which carries its own percentage. Standard transfers
remain free.</li>
<li><strong>PayPal's monthly products</strong> — Payments Pro, Advanced Checkout, and similar plans change
the rate schedule entirely.</li>
<li><strong>Income tax.</strong> PayPal issues a 1099-K and everything above is pre-tax. See the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
<li><strong>Non-US accounts.</strong> Every rate here is the US schedule; PayPal's fees differ materially
by country.</li>
</ul>

<h2>Sources and dates</h2>
<p>Rates come from PayPal's own US merchant fees page, listed below with the date it was checked. The
crossover figure and every number in the comparison tables are computed from those published rates by the
calculator on this page, not quoted from a third party — if PayPal changes either schedule, the arithmetic
here changes with it. If a figure disagrees with your PayPal account, trust PayPal and
<a href="/contact/">let us know</a>.</p>
`;
  },
};
