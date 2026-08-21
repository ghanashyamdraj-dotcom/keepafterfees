/**
 * invoice-take-home.js — page definition for /invoice-take-home-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that the set-aside percentage for ONE invoice is the
 * MARGINAL rate, not the average — and almost every "what should I save for
 * tax" answer quotes the average.
 *
 * The distinction is not pedantic. On $70,000 of existing income, a further
 * $8,000 invoice is taxed at roughly 44% at the margin while the year as a
 * whole averages about 27%. Set aside at the average and you are ~$1,400 short
 * on that one invoice — and the shortfall recurs on every invoice, so it
 * compounds into exactly the April surprise the tool exists to prevent.
 *
 * Both rates are computed by running the engine twice: once for the marginal
 * invoice, once for the whole year.
 */

const DEFAULTS = {
  invoiceAmount: 8000,
  otherIncome: 70000,
  businessExpenses: 0,
  annual: false,
  processorId: 'none',
  productId: 'online-domestic',
  filingStatus: 'single',
  stateCode: 'CA',
  dependents: 0,
};

export default {
  id: 'invoice-take-home',
  kind: 'tool',
  calculator: 'invoice-take-home',
  published: '2026-08-04',
  updated: '2026-08-04',
  defaults: DEFAULTS,

  appName: 'Invoice Take-Home Calculator',

  presets: {
    field: 'invoiceAmount',
    label: 'On an invoice of…',
    values: [1000, 2500, 5000, 8000, 15000],
  },
  featureList: [
    'What one invoice leaves you after processing fees and tax',
    'Sets aside at your marginal rate, not the misleading average',
    'Self-employment tax, federal and state income tax combined',
    'Optional payment processor fee taken off the top',
  ],

  groups: (rates) => [
    {
      legend: 'The invoice',
      fields: [
        { name: 'invoiceAmount', label: 'Invoice amount', prefix: '$', value: DEFAULTS.invoiceAmount },
        {
          name: 'otherIncome', label: 'Income already earned this year', prefix: '$', value: DEFAULTS.otherIncome,
          help: 'Sets which bracket this invoice lands in. This is what makes the answer right.',
        },
        {
          name: 'annual', label: 'Treat the amount as a full year of income', type: 'checkbox',
          value: DEFAULTS.annual, wide: true,
          help: 'Switches from marginal to whole-year tax.',
        },
        { name: 'businessExpenses', label: 'Annual business expenses', prefix: '$', value: DEFAULTS.businessExpenses },
      ],
    },
    {
      legend: 'How you are paid',
      fields: [
        // Qualified "processor:product" so one select carries both — see the
        // note in charge-to-receive.js and getProduct() in processors.js.
        {
          name: 'processorId', label: 'Payment method', type: 'select', value: DEFAULTS.processorId,
          options: [
            { value: 'none', label: 'Bank transfer / no processor fee' },
            ...Object.entries(rates.processors)
              .filter(([, v]) => v && typeof v === 'object' && Array.isArray(v.products))
              .map(([id, v]) => ({ value: id, label: v.label })),
          ],
          help: 'Processing comes off before tax is calculated.',
        },
      ],
    },
    {
      legend: 'Your tax situation',
      fields: [
        {
          name: 'filingStatus', label: 'Filing status', type: 'select', value: DEFAULTS.filingStatus,
          options: [
            { value: 'single', label: 'Single' },
            { value: 'married_joint', label: 'Married filing jointly' },
            { value: 'married_separate', label: 'Married filing separately' },
            { value: 'head_of_household', label: 'Head of household' },
          ],
        },
        {
          name: 'stateCode', label: 'State', type: 'select', value: DEFAULTS.stateCode,
          options: [
            ...Object.entries(rates.states).map(([code, s]) => ({ value: code, label: s.name })),
            { value: '', label: 'Other / not listed' },
          ],
        },
        { name: 'dependents', label: 'Dependents', value: DEFAULTS.dependents, step: '1', help: 'Applies state exemptions and credits only. The federal child tax credit is not modelled — see the notes below.' },
      ],
    },
  ],

  answerBlock: ({ example, state }) => `
<p class="answer-block"><strong>A $${DEFAULTS.invoiceAmount.toLocaleString('en-US')} invoice on top of
$${DEFAULTS.otherIncome.toLocaleString('en-US')} of income already earned leaves you about
$${example.takeHome.toLocaleString('en-US', { maximumFractionDigits: 2 })}.</strong> Set aside
$${example.invoiceTax.toLocaleString('en-US', { maximumFractionDigits: 2 })} — that is your
<em>marginal</em> rate of ${(example.marginalRate * 100).toFixed(1)}%${state && state.hasIncomeTax ? ` including ${state.name} tax` : ''},
which is what the next dollar costs, not the lower average rate your whole year works out at. Move it
to a separate account the day the invoice clears.</p>`,

  faqs: ({ example, annual, averageRate, setAsideAtAverage, shortfall, state }) => [
    {
      q: 'How much of an invoice should I set aside for tax?',
      a: `<p>On this example, <strong>$${example.invoiceTax.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong> of a $${DEFAULTS.invoiceAmount.toLocaleString('en-US')} invoice — ${(example.marginalRate * 100).toFixed(1)}%. That figure is your combined marginal rate: self-employment tax plus your federal and state marginal income tax rates.</p>
<p>The reason it is higher than the "set aside 25–30%" advice you have seen is that 25–30% is roughly an <em>average</em> rate across a whole year's income. One more invoice is not taxed at your average; it is taxed on top of everything you have already earned.</p>`,
    },
    {
      q: 'Why marginal rather than average?',
      a: `<p>Because the invoice arrives on top of income that already used up your lower brackets. Across the full $${(DEFAULTS.invoiceAmount + DEFAULTS.otherIncome).toLocaleString('en-US')} year, tax averages <strong>${(averageRate * 100).toFixed(1)}%</strong>. But the last $${DEFAULTS.invoiceAmount.toLocaleString('en-US')} of it is taxed at <strong>${(example.marginalRate * 100).toFixed(1)}%</strong>, because that money sits entirely in the top bracket you reach.</p>
<p>Set aside at the average and you would put away $${setAsideAtAverage.toLocaleString('en-US', { maximumFractionDigits: 2 })} instead of $${example.invoiceTax.toLocaleString('en-US', { maximumFractionDigits: 2 })} — <strong>$${shortfall.toLocaleString('en-US', { maximumFractionDigits: 2 })} short on this invoice alone</strong>. Repeat that across a year of invoices and the gap is the April surprise, arriving as a bill for money that was spent months ago.</p>`,
    },
    {
      q: 'Is the 30% rule of thumb wrong?',
      a: `<p>It is right for some people and dangerously low for others, and it never tells you which you are. At low income with the standard deduction absorbing most of it, 30% is generous. At the income in this example the true marginal figure is ${(example.marginalRate * 100).toFixed(1)}%${state && state.hasIncomeTax ? `, because ${state.name} income tax stacks on top of federal and self-employment tax` : ''}.</p>
<p>The rule of thumb also fails in the other direction in a first low-income year, where saving 30% means lending the government money you needed for rent. Both errors come from using one number where the answer depends on where you already are.</p>`,
    },
    {
      q: 'Why is my marginal rate so much higher than my tax bracket?',
      a: `<p>Because your bracket is only the income tax part. Self-employment tax adds 15.3% on 92.35% of net earnings — about 14.13 points — on top of your federal bracket${state && state.hasIncomeTax ? `, and ${state.name} adds its own rate on top of that` : ''}. A "22% bracket" freelancer is frequently facing a combined marginal rate in the forties.</p>
<p>This is also why the deduction hunt matters more for the self-employed than for employees: a deductible dollar saves you the whole combined rate, not just the income tax bracket.</p>`,
    },
    {
      q: 'Does the payment processor fee come off before or after tax?',
      a: `<p>Before. Processing fees are a deductible business expense, so tax is calculated on what actually reached you, not on the invoice face value. This calculator takes the fee off first and then applies tax to the remainder, which is the correct order and the one that produces a slightly better answer than doing it the other way round.</p>`,
    },
    {
      q: 'What if this invoice pushes me past the Social Security wage base?',
      a: `<p>Then the part above the base is charged 2.9% Medicare instead of the full 15.3%, and your marginal rate drops noticeably part-way through the invoice. The calculator handles the crossing and flags it in the result. It is one of the few places where earning more genuinely lowers your marginal rate, and it is worth knowing about if you are deciding whether to take on extra work late in the year.</p>`,
    },
  ],

  content: ({ example, annual, averageRate, setAsideAtAverage, shortfall, state, rates }) => {
    const n2 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const n0 = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

    return `
<h2>How much of this invoice is actually yours</h2>

<p>Three deductions, in this order. The order matters, because each one changes the base of the next.</p>

<div class="formula">received   = invoice − payment processing fee
set aside  = received × combined MARGINAL rate
yours      = received − set aside

marginal rate = SE tax + federal marginal + state marginal</div>

<p>That last line is the whole point of this page, and it is where nearly every other answer to "how
much should I save for tax" goes wrong.</p>

<h2>Marginal, not average</h2>

<p>The standard advice is to set aside a flat 25–30%. That figure is roughly what a full year of
self-employment income averages out to. But an invoice does not arrive at the average — it arrives on
top of everything you have already earned, in whatever bracket that leaves you in.</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Rate</th>
  <th scope="col">What it describes</th>
  <th scope="col">Value</th>
  <th scope="col">Set aside on $${n0(DEFAULTS.invoiceAmount)}</th>
</tr></thead>
<tbody>
<tr><td>Average</td><td>tax across the whole $${n0(DEFAULTS.invoiceAmount + DEFAULTS.otherIncome)} year</td><td>${(averageRate * 100).toFixed(1)}%</td><td>$${n2(setAsideAtAverage)}</td></tr>
<tr data-best><td><strong>Marginal</strong></td><td><strong>tax on the NEXT dollar you earn</strong></td><td><strong>${(example.marginalRate * 100).toFixed(1)}%</strong></td><td><strong>$${n2(example.invoiceTax)}</strong></td></tr>
</tbody>
</table>
</div>

<p>A gap of <strong>$${n2(shortfall)}</strong> on a single invoice — and it is not a one-off. Every
invoice you set aside for at the average rate is short by roughly the same proportion, so the
shortfall accumulates all year and presents itself in one piece at filing. The money was never extra;
it was always the government's, and it was spent because a percentage looked reassuring.</p>

<p>The reason the two diverge so far is that a self-employed marginal rate is a stack, not a bracket.
Self-employment tax contributes about 14.13 points regardless of bracket; your federal marginal rate
sits on top of that${state && state.hasIncomeTax ? `; and ${state.name}'s marginal rate sits on top of both` : ''}.
Someone who thinks of themselves as "in the 22% bracket" is looking at
${(example.marginalRate * 100).toFixed(1)}% on the next dollar.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>A $${n0(DEFAULTS.invoiceAmount)} invoice on top of $${n0(DEFAULTS.otherIncome)} already earned${state ? `, ${state.name}` : ''}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Invoice</td><td>face value</td><td>$${n2(DEFAULTS.invoiceAmount)}</td></tr>
<tr><td>Payment processing</td><td>${DEFAULTS.processorId === 'none' ? 'bank transfer, no fee' : 'taken off the top'}</td><td>−$${n2(DEFAULTS.invoiceAmount - example.received)}</td></tr>
<tr><td><strong>Received</strong></td><td>what reaches your account</td><td><strong>$${n2(example.received)}</strong></td></tr>
<tr><td>Set aside for tax</td><td>${(example.marginalRate * 100).toFixed(1)}% marginal × $${n2(example.received)}</td><td>−$${n2(example.invoiceTax)}</td></tr>
<tr><td><strong>Yours to spend</strong></td><td></td><td><strong>$${n2(example.takeHome)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Just over ${((example.takeHome / DEFAULTS.invoiceAmount) * 100).toFixed(0)}% of the invoice is
genuinely yours. The practical habit that follows: move the set-aside to a separate account the day
the money clears, not at quarter end. The tax is not a bill that arrives later — it was never your
money, and the only thing that changes is whether it is still there when the
<a href="/self-employment-tax-calculator/">quarterly payment</a> is due.</p>
</div>

<h2>The whole-year view</h2>

<p>Tick "treat the amount as a full year" and the calculator switches from marginal to total: on
$${n0(DEFAULTS.invoiceAmount + DEFAULTS.otherIncome)} of annual income the full tax is
$${n2(annual.totalTax)}, an average of ${(averageRate * 100).toFixed(1)}%. Both numbers are correct
and they answer different questions.</p>

<ul>
<li><strong>Average</strong> answers "what does a year of this cost me?" — use it for pricing,
planning, and deciding whether the work is worth doing at all.</li>
<li><strong>Marginal</strong> answers "what does this next invoice cost me?" — use it for setting
money aside, and for judging whether one more project is worth taking.</li>
</ul>

<p>Using the average for the second question is the mistake this page exists to catch.</p>

<h2>Who this is for</h2>
<p>Freelancers and contractors who want to know what an invoice actually leaves them, and anyone who
has been setting aside a flat percentage without checking it against their real position. Enter the
income you have already earned this year — that single field is what turns a generic percentage into
an answer that is right for you.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Deductions you have not entered.</strong> Every deductible dollar saves you the full
marginal rate, so expenses matter roughly ${(example.marginalRate * 100).toFixed(0)}¢ on the dollar here.</li>
<li><strong>The QBI deduction</strong>, which can reduce the federal portion — see the
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a>, which models it.</li>
<li><strong>Retirement contributions</strong>, which reduce taxable income but interact with QBI.</li>
<li><strong>Federal tax credits.</strong> The child tax credit and other federal credits are not modelled — the dependents field feeds state exemptions only, so a filer with dependents will owe less federally than shown.</li>
<li><strong>Quarterly payment timing.</strong> This tells you how much; it does not tell you when.</li>
<li><strong>${Object.keys(rates.states).length} states are modelled</strong>
(${Object.values(rates.states).map((s) => s.name).join(', ')}). Others run federal only.</li>
<li><strong>This is an estimate, not advice.</strong></li>
</ul>

<h2>Sources and dates</h2>
<p>Tax parameters come from the IRS and state revenue departments for tax year
${rates.federal.effective.slice(0, 4)}, and processor fees from each processor's published pricing —
all listed below with the date each was checked. The marginal and average rates are both computed by
running this page's engine, once on the invoice and once on the full year. If a figure disagrees with
your accountant, trust your accountant and <a href="/contact/">let us know</a>.</p>
`;
  },
};
