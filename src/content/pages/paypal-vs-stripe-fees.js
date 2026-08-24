/**
 * paypal-vs-stripe-fees.js — page definition for /paypal-vs-stripe-fees/
 *
 * Content strategy notes:
 *
 *   - On standard checkout there is no crossover to find: Stripe pairs a lower
 *     percentage with a lower fixed fee, so it is cheaper at every amount and
 *     scheduleCrossover() correctly returns null. Saying so in one sentence is
 *     more useful than the "it depends on your business" answer this query
 *     usually gets, and it clears the ground for the part that does depend.
 *
 *   - The real content is that neither headline rate is the cheapest thing
 *     either company sells. PayPal micropayments beats Stripe's card rate
 *     below about $10, and Stripe ACH beats everything above it by an order of
 *     magnitude because it is capped in absolute dollars. Both crossovers are
 *     computed, and the micropayments one uses scheduleCrossover() from the
 *     processor engine rather than a bisection, because that function reports
 *     the tie band the cent-rounding creates instead of pretending the flip
 *     happens at a single exact price.
 *
 *   - The page therefore reframes the question. "PayPal or Stripe" is the
 *     wrong axis; "which of these four schedules fits the size of payment you
 *     actually take" is the right one, and it has a different answer at $5,
 *     $100 and $5,000.
 */

const DEFAULTS = {
  orderValue: 100,
  shippingCharged: 0,
  shippingCost: 0,
  itemCost: 0,
  monthlyOrders: 50,
  matchup: 'paypal-vs-stripe',
};

export default {
  id: 'paypal-vs-stripe-fees',
  kind: 'tool',
  calculator: 'channel-versus',
  published: '2026-08-24',
  updated: '2026-08-24',
  defaults: DEFAULTS,

  appName: 'PayPal vs Stripe Fee Comparison',
  traitsAt: 100,
  // Chosen to straddle both crossovers: $5 and $10 sit either side of the
  // micropayments boundary, and $625 is where the ACH cap starts to bind.
  ladderValues: [5, 10, 25, 50, 100, 500, 625, 1000, 5000],

  presets: {
    field: 'orderValue',
    label: 'On a payment of…',
    values: [5, 10, 25, 100, 625, 2500],
  },
  featureList: [
    'PayPal and Stripe fees on the same payment, side by side, with the effective rate on each',
    'Includes the two pricing tiers that beat both headline rates: PayPal micropayments and Stripe ACH',
    'Computes the amount below which micropayments is cheaper, and the tie band around it',
    'Computes the amount at which the ACH cap binds and the effective rate starts collapsing',
  ],

  groups: () => [
    {
      legend: 'The payment',
      fields: [
        { name: 'orderValue', label: 'Amount charged', prefix: '$', value: DEFAULTS.orderValue, help: 'What the customer pays. Every schedule below is applied to the same figure.' },
        { name: 'monthlyOrders', label: 'Payments a month', value: DEFAULTS.monthlyOrders, step: '1', help: 'Turns the per-payment gap into a monthly one. Neither processor charges a subscription on these plans.' },
      ],
    },
    {
      legend: 'Surcharges',
      note: 'Both processors add a cross-border surcharge, and a further currency conversion fee where the payment is converted. They stack.',
      fields: [
        { name: 'international', label: 'The card was issued outside the US', type: 'checkbox', value: false, wide: true },
        { name: 'currencyConversion', label: 'The payment is converted to another currency', type: 'checkbox', value: false, wide: true },
        { name: 'matchup', type: 'hidden', value: DEFAULTS.matchup },
      ],
    },
  ],

  answerBlock: ({ example }) => {
    const paypal = example.rows.find((r) => r.id === 'paypal');
    const stripe = example.rows.find((r) => r.id === 'stripe');
    const gap = Math.abs(paypal.perOrderFees - stripe.perOrderFees);
    return `
<p class="answer-block"><strong>On a $${DEFAULTS.orderValue.toFixed(2)} card payment, PayPal takes
$${paypal.perOrderFees.toFixed(2)} and Stripe takes $${stripe.perOrderFees.toFixed(2)} — Stripe is
$${gap.toFixed(2)} cheaper, and on standard checkout pricing it is cheaper at every amount, because it
pairs the lower percentage with the lower fixed fee.</strong> That is the whole answer to the headline
question. The more useful one is that neither of those is the cheapest thing either company sells:
${example.best.label} is, at $${example.best.perOrderFees.toFixed(2)} on this payment.</p>`;
  },

  faqs: ({ example, rates }) => {
    const paypal = example.rows.find((r) => r.id === 'paypal');
    const stripe = example.rows.find((r) => r.id === 'stripe');
    const micro = example.rows.find((r) => r.id === 'paypal-micropayments');
    const ach = example.rows.find((r) => r.id === 'stripe-ach');
    const gap = Math.abs(paypal.perOrderFees - stripe.perOrderFees);
    const pp = rates.processors.paypal.products.find((p) => p.id === 'checkout');
    const st = rates.processors.stripe.products.find((p) => p.id === 'online-domestic');
    const mp = rates.processors.paypal.products.find((p) => p.id === 'micropayments');
    const ac = rates.processors.stripe.products.find((p) => p.id === 'ach');
    const capBinds = ac.cap && ac.rate ? ac.cap / ac.rate : null;
    return [
      {
        q: 'Is PayPal or Stripe cheaper?',
        a: `<p>Stripe, on standard online card payments, at every amount. PayPal charges ${(pp.rate * 100).toFixed(2)}% + $${pp.fixed.toFixed(2)} and Stripe charges ${(st.rate * 100).toFixed(2)}% + $${st.fixed.toFixed(2)} — a lower percentage <em>and</em> a lower fixed fee.</p>
<p>That combination matters: when one schedule beats another on both terms there is no crossover, so no amount exists at which PayPal's standard rate wins. On a $${DEFAULTS.orderValue.toFixed(2)} payment the difference is $${gap.toFixed(2)}, which is $${(gap * DEFAULTS.monthlyOrders * 12).toFixed(0)} a year at ${DEFAULTS.monthlyOrders} payments a month.</p>`,
      },
      {
        q: 'When is PayPal actually cheaper than Stripe?',
        a: `<p>On small payments, using a pricing tier PayPal does not put on its main rate page. Micropayments pricing is ${(mp.rate * 100).toFixed(2)}% + $${mp.fixed.toFixed(2)} — a much higher percentage bought with a much lower fixed fee, which wins on anything small enough that the fixed fee dominates.</p>
<p>On a $5 payment micropayments costs $${(Math.round((5 * mp.rate + mp.fixed) * 100) / 100).toFixed(2)} against Stripe's $${(Math.round((5 * st.rate + st.fixed) * 100) / 100).toFixed(2)}. The exact crossover is worked out in the section above.</p>
<p>The catch is that micropayments is an <strong>account-wide</strong> setting you have to request, not a per-transaction option. If most of your payments sit above the crossover it costs you money on every one of them.</p>`,
      },
      {
        q: 'What is the cheapest way to take a large payment?',
        a: `<p>Neither card rate. Stripe's ACH bank transfer is ${(ac.rate * 100).toFixed(1)}% capped at $${ac.cap.toFixed(2)}${capBinds ? `, so it stops growing at $${capBinds.toFixed(2)}` : ''} — above that it is a flat $${ac.cap.toFixed(2)} however large the payment gets.</p>
<p>On a $5,000 invoice that is $${ac.cap.toFixed(2)} against roughly $${(Math.round((5000 * st.rate + st.fixed) * 100) / 100).toFixed(2)} on a card. On this page's current amount it is $${ach.perOrderFees.toFixed(2)} against $${stripe.perOrderFees.toFixed(2)}.</p>
<p>ACH is slower to settle and only works for US bank accounts, so it is not a drop-in replacement for card checkout. For invoicing business clients it is very often the single largest fee saving available, and it is the reason the <a href="/charge-to-receive-calculator/">charge-to-receive calculator</a> treats capped schedules separately.</p>`,
      },
      {
        q: 'What about international cards?',
        a: `<p>Both add a cross-border surcharge, and both add a further fee when the payment is converted into another currency. The two stack, so an international card paid in a foreign currency carries both on top of the base rate.</p>
<p>Tick the two boxes above to see it applied to all four schedules at once. The surcharges are percentages, so they widen the absolute gap between the processors as the payment grows rather than shifting the ranking.</p>`,
      },
      {
        q: 'Does PayPal have any advantage at all?',
        a: `<p>Yes, and it is not a fee. A PayPal button at checkout converts better for a meaningful share of buyers — people who will not type a card number into a site they do not recognise will click a wallet they already trust. If offering PayPal wins you even a small percentage of additional completed checkouts, that outweighs a $${gap.toFixed(2)} difference on the ones you were getting anyway.</p>
<p>Buyer protection cuts the same way: it is a reason customers choose PayPal, and it is also a dispute process weighted towards the buyer. Most established shops end up offering both and paying the higher fee only on the orders that chose it, which is a perfectly rational outcome that a fee table alone would never recommend.</p>`,
      },
      {
        q: 'Are these rates the ones I will actually pay?',
        a: `<p>They are the published US rates for the standard products, which is what almost everyone pays. Both processors negotiate on volume, both have separate in-person and platform pricing, and PayPal in particular publishes several different card rates depending on which product you are using — this page compares the standard checkout one.</p>
<p>The dates each figure was checked are at the foot of the page. If a rate has moved, <a href="/contact/">tell us</a> and it gets fixed. For a single processor in full detail, see the <a href="/paypal-fee-calculator/">PayPal fee calculator</a> and the <a href="/stripe-fee-calculator/">Stripe fee calculator</a>.</p>`,
      },
    ];
  },

  content: ({ example, feeLadder, processorCrossovers, achLadder, rates }) => {
    const paypal = example.rows.find((r) => r.id === 'paypal');
    const stripe = example.rows.find((r) => r.id === 'stripe');
    const micro = example.rows.find((r) => r.id === 'paypal-micropayments');
    const ach = example.rows.find((r) => r.id === 'stripe-ach');
    const gap = Math.abs(paypal.perOrderFees - stripe.perOrderFees);

    const pp = rates.processors.paypal.products.find((p) => p.id === 'checkout');
    const st = rates.processors.stripe.products.find((p) => p.id === 'online-domestic');
    const mp = rates.processors.paypal.products.find((p) => p.id === 'micropayments');
    const ac = rates.processors.stripe.products.find((p) => p.id === 'ach');

    // Both solved by the processor engine at build time and handed in — see
    // the processorCrossovers block in build/build.mjs. The micropayments
    // crossover arrives with the tie band the cent-rounding creates, so the
    // page can state the boundary without claiming a precision it lacks.
    const cross = processorCrossovers?.pairs.find(
      (p) => (p.a.id === 'stripe' && p.b.id === 'paypal-micropayments')
        || (p.a.id === 'paypal-micropayments' && p.b.id === 'stripe')
    ) ?? null;
    const capBinds = processorCrossovers?.caps.find((c) => c.id === 'stripe-ach')?.bindsAt ?? null;
    const feeOf = (row, id) => row.cells.find((c) => c.id === id)?.fee ?? 0;
    // Cheapest of the three CARD schedules. ACH is excluded on purpose: it
    // wins at every amount, so including it would make the column constant
    // and hide the one crossover the table exists to show.
    const CARD_IDS = ['paypal', 'paypal-micropayments', 'stripe'];
    const bestCard = (row) => row.cells
      .filter((c) => CARD_IDS.includes(c.id))
      .reduce((a, b) => (b.fee < a.fee ? b : a));

    return `
<h2>The headline answer, and why it is boring</h2>

<p>PayPal charges ${(pp.rate * 100).toFixed(2)}% + $${pp.fixed.toFixed(2)} on a standard goods-and-services
payment. Stripe charges ${(st.rate * 100).toFixed(2)}% + $${st.fixed.toFixed(2)} on a standard online card
payment. Stripe is lower on the percentage and lower on the fixed fee.</p>

<div class="formula">PayPal   fee = ${(pp.rate * 100).toFixed(2)}% x amount + $${pp.fixed.toFixed(2)}
Stripe   fee = ${(st.rate * 100).toFixed(2)}% x amount + $${st.fixed.toFixed(2)}</div>

<p>Two schedules of that shape cross at most once, where the amount equals the difference in fixed fees
divided by the difference in rates. Here both differences point the same way, so there is no positive
solution: Stripe is cheaper at one dollar and cheaper at fifty thousand. There is no volume, no
transaction size and no business model that reverses it on these two products.</p>

<p>That is the whole of the question people usually ask, and it is answerable in a sentence. The
interesting question is the one underneath it: <strong>neither of those is the cheapest thing either
company sells</strong>, and which schedule you should be on depends entirely on the size of payment you
actually take.</p>

<h2>A worked example with real numbers</h2>

<div class="worked-example">
<h3>The same $${DEFAULTS.orderValue.toFixed(2)} payment through all four schedules</h3>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Schedule</th><th scope="col">Published rate</th><th scope="col">Fee</th><th scope="col">Effective rate</th><th scope="col">You receive</th></tr></thead>
<tbody>
<tr><td>PayPal checkout</td><td>${(pp.rate * 100).toFixed(2)}% + $${pp.fixed.toFixed(2)}</td><td>&minus;$${paypal.perOrderFees.toFixed(2)}</td><td>${(paypal.effectiveRate * 100).toFixed(2)}%</td><td>$${paypal.netPerOrder.toFixed(2)}</td></tr>
<tr><td>PayPal micropayments</td><td>${(mp.rate * 100).toFixed(2)}% + $${mp.fixed.toFixed(2)}</td><td>&minus;$${micro.perOrderFees.toFixed(2)}</td><td>${(micro.effectiveRate * 100).toFixed(2)}%</td><td>$${micro.netPerOrder.toFixed(2)}</td></tr>
<tr><td>Stripe card</td><td>${(st.rate * 100).toFixed(2)}% + $${st.fixed.toFixed(2)}</td><td>&minus;$${stripe.perOrderFees.toFixed(2)}</td><td>${(stripe.effectiveRate * 100).toFixed(2)}%</td><td>$${stripe.netPerOrder.toFixed(2)}</td></tr>
<tr data-best><td>Stripe ACH</td><td>${(ac.rate * 100).toFixed(1)}%, capped at $${ac.cap.toFixed(2)}</td><td>&minus;$${ach.perOrderFees.toFixed(2)}</td><td>${(ach.effectiveRate * 100).toFixed(2)}%</td><td>$${ach.netPerOrder.toFixed(2)}</td></tr>
</tbody>
</table>
</div>

<p>Stripe's card rate beats PayPal's by $${gap.toFixed(2)} here — real money at volume,
$${(gap * DEFAULTS.monthlyOrders * 12).toFixed(0)} a year at ${DEFAULTS.monthlyOrders} payments a month,
but a rounding error next to the
$${(paypal.perOrderFees - ach.perOrderFees).toFixed(2)} between the dearest and cheapest rows.</p>
</div>

<h2>Every schedule at every amount</h2>

<p>This is the table that makes the point. Read down a column and you are watching one fee structure; read
across a row and you are choosing between them at one payment size.</p>

<p>The last column deliberately excludes ACH. Bank transfer is cheaper than every card rate from the first
dollar upward, so a plain "cheapest" column would read <em>Stripe ACH</em> on every row and tell you
nothing — and ACH is not a substitute for card checkout anyway. Among the three card schedules the winner
does change, exactly once, and the ACH column is there so you can see what all three are costing you
against the alternative.</p>

<div class="table-scroll">
<table class="value-table">
<thead><tr>
  <th scope="col">Amount</th><th scope="col">PayPal</th><th scope="col">PayPal micro</th>
  <th scope="col">Stripe card</th><th scope="col">Stripe ACH</th><th scope="col">Cheapest card</th>
</tr></thead>
<tbody>
${feeLadder
      .map(
        (row) => `<tr${row.amount === DEFAULTS.orderValue ? ' data-best' : ''}>
    <th scope="row">$${row.amount.toLocaleString('en-US')}</th>
    <td>$${feeOf(row, 'paypal').toFixed(2)}</td>
    <td>$${feeOf(row, 'paypal-micropayments').toFixed(2)}</td>
    <td>$${feeOf(row, 'stripe').toFixed(2)}</td>
    <td>$${feeOf(row, 'stripe-ach').toFixed(2)}</td>
    <td><strong>${bestCard(row).label}</strong></td>
  </tr>`
      )
      .join('\n')}
</tbody>
</table>
</div>

<h2>Crossover one: micropayments, at about $${cross ? cross.amount.toFixed(2) : '10'}</h2>

<p>PayPal micropayments trades a much higher percentage for a much lower fixed fee. Below a certain amount
the fixed fee is most of the bill and micropayments wins; above it the percentage takes over and it loses
badly. Setting the two schedules equal and solving:</p>

<div class="formula">${(st.rate * 100).toFixed(2)}% x A + $${st.fixed.toFixed(2)}  =  ${(mp.rate * 100).toFixed(2)}% x A + $${mp.fixed.toFixed(2)}

A = ($${st.fixed.toFixed(2)} &minus; $${mp.fixed.toFixed(2)}) / (${(mp.rate * 100).toFixed(2)}% &minus; ${(st.rate * 100).toFixed(2)}%) = $${cross ? cross.amount.toFixed(2) : '—'}</div>

${cross
      ? `<p>Because each side is rounded to the cent independently, the two do not flip at one exact price —
they tie for a few cents either side of it. Micropayments is strictly cheaper up to
<strong>$${cross.strictBelow.toFixed(2)}</strong> and Stripe is strictly cheaper from
<strong>$${cross.strictAbove.toFixed(2)}</strong>, with a tie in between. Quoting a single threshold to the
cent would claim a precision the arithmetic does not have.</p>`
      : ''}

<p>The important caveat is that micropayments is not a per-payment choice. It is an account-wide setting
you have to request from PayPal, and once it is on it applies to everything. It pays off only if the bulk
of your payments sit below the crossover — selling $3 downloads, taking small tips, running a per-item
digital shop. If your average is $40, it is costing you money on nearly every transaction. The
<a href="/paypal-fee-calculator/">PayPal fee calculator</a> flags this in both directions.</p>

<h2>Crossover two: the ACH cap, at $${capBinds ? capBinds.toFixed(2) : '—'}</h2>

<p>Stripe's ACH is ${(ac.rate * 100).toFixed(1)}% <em>capped at $${ac.cap.toFixed(2)}</em>, and the cap is
what makes it a different kind of thing rather than a cheaper version of the same thing. A percentage grows
without limit. A capped percentage stops.</p>

${capBinds
      ? `<p>The cap binds at <strong>$${capBinds.toFixed(2)}</strong> — that is the payment size where
${(ac.rate * 100).toFixed(1)}% first reaches $${ac.cap.toFixed(2)}. Below it ACH behaves like a very cheap
percentage; above it, it is a flat fee, and the effective rate falls towards zero as the payment grows.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Invoice</th><th scope="col">Stripe card</th><th scope="col">Stripe ACH</th><th scope="col">ACH effective rate</th><th scope="col">Saved</th></tr></thead>
<tbody>
${(achLadder ?? [])
        .map(
          (row) => `<tr><td>$${row.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td><td>$${row.card.toFixed(2)}</td><td>$${row.ach.toFixed(2)}</td><td>${(row.achRate * 100).toFixed(3)}%</td><td>$${row.saved.toFixed(2)}</td></tr>`
        )
        .join('\n')}
</tbody>
</table>
</div>

${achLadder?.length
        ? `<p>On a $${achLadder.at(-1).amount.toLocaleString('en-US')} invoice the choice of payment method is
worth $${achLadder.at(-1).saved.toFixed(2)}. There is no negotiation, no volume discount and no alternative
processor that gets close to that; it is simply a different rail. Anyone invoicing business clients for four
figures and taking payment by card is paying a large, entirely avoidable fee.</p>`
        : ''}`
      : ''}

<p>ACH settles in days rather than instantly and only works from US bank accounts, so it cannot replace
card checkout for retail. For B2B invoicing, where the client is a company with a bank account and a net-30
expectation anyway, the slower settlement usually costs nothing at all.</p>

<h2>So which should you use?</h2>

<p>Framed as "PayPal or Stripe" the answer is Stripe, and it is not close. Framed as "which schedule fits
my payments" — which is the question that actually saves money — the answer is:</p>

<ul>
<li><strong>Under $${cross ? cross.strictBelow.toFixed(2) : '10'} a payment:</strong> PayPal micropayments,
if enough of your volume sits there to justify an account-wide switch.</li>
<li><strong>Ordinary card payments:</strong> Stripe, by $${gap.toFixed(2)} on a
$${DEFAULTS.orderValue.toFixed(2)} sale.</li>
<li><strong>Invoices above a few hundred dollars, US clients:</strong> Stripe ACH, by a margin that makes
the card-rate comparison irrelevant.</li>
<li><strong>Any checkout where a buyer might abandon:</strong> offer PayPal as well and pay the higher fee
on the orders that choose it. A completed sale at ${(paypal.effectiveRate * 100).toFixed(2)}% beats an
abandoned one at ${(stripe.effectiveRate * 100).toFixed(2)}%.</li>
</ul>

<h2>What this does not account for</h2>
<ul>
<li><strong>Conversion rate.</strong> The largest factor and the one no fee table can measure. Offering a
wallet buyers already trust wins checkouts.</li>
<li><strong>Chargebacks and disputes.</strong> Both charge a dispute fee and the processes differ
substantially. Not modelled here.</li>
<li><strong>Payout timing.</strong> Instant payout carries its own surcharge on both platforms.</li>
<li><strong>Negotiated pricing.</strong> Both discount at volume. These are the published rates.</li>
<li><strong>Everything that is not the fee</strong> — developer effort, subscription billing, fraud tooling,
reporting. Stripe and PayPal are not the same product and this page only prices one dimension of them.</li>
</ul>

<h2>Who this is for</h2>
<p>Anyone taking payments on their own site and choosing a processor, and freelancers deciding how to
invoice. If you need to know what to charge so that a specific amount lands in your account after the fee,
the <a href="/charge-to-receive-calculator/">charge-to-receive calculator</a> solves that directly — the
markup is always larger than the fee rate, which catches people out.</p>
`;
  },
};
