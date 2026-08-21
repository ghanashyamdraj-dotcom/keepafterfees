/**
 * freelance-hourly-rate.js — page definition for
 * /freelance-hourly-rate-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is the W-2 salary equivalence, and specifically the
 * health-insurance asymmetry inside it.
 *
 * Every freelance rate calculator tells you the 2,080-hour division is wrong.
 * Almost none will tell you what salary your rate is actually worth, because
 * that needs a payroll model as well as a self-employment one — this site has
 * both, so salaryEquivalent() solves it directly.
 *
 * Inside that comparison sits a fact that is correct, checkable, and almost
 * never stated: the self-employed health insurance deduction reduces income
 * tax but does NOT reduce net earnings for self-employment tax. An employee's
 * Section 125 premium escapes income tax and FICA. So a freelancer pays about
 * 14.13% self-employment tax on the money that buys their health cover and an
 * employee pays nothing on theirs. Both figures on this page are computed from
 * the engine, not typed.
 */

const DEFAULTS = {
  targetIncome: 85000,
  targetIsPreTax: false,
  billableHoursPerWeek: 25,
  weeksOff: 6,
  businessExpenses: 6000,
  healthInsurance: 9000,
  retirementTarget: 6000,
  filingStatus: 'single',
  stateCode: 'CA',
  dependents: 0,
};

export default {
  id: 'freelance-hourly-rate',
  kind: 'tool',
  calculator: 'freelance-hourly-rate',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Freelance Hourly Rate Calculator',

  presets: {
    field: 'targetIncome',
    label: 'To take home…',
    values: [50000, 75000, 85000, 100000, 150000],
    format: (v) => `${v / 1000}k`,
  },
  featureList: [
    'Solves backwards from target take-home to the rate you must charge',
    'Self-employment tax, federal and state income tax, and the QBI interaction',
    'Billable hours rather than the 2,080-hour full-time year',
    'The W-2 salary your freelance rate is actually equivalent to',
  ],

  groups: (rates) => [
    {
      legend: 'What you want to earn',
      fields: [
        {
          name: 'targetIncome', label: 'Target take-home', prefix: '$', value: DEFAULTS.targetIncome,
          help: 'Money in your pocket, after tax and after paying for your own benefits.',
        },
        {
          name: 'targetIsPreTax', label: 'Treat that as pre-tax profit instead', type: 'checkbox',
          value: DEFAULTS.targetIsPreTax, wide: true,
          help: 'Skips the tax solve and treats your target as business profit.',
        },
      ],
    },
    {
      legend: 'The hours you can actually bill',
      fields: [
        {
          name: 'billableHoursPerWeek', label: 'Billable hours per week', value: DEFAULTS.billableHoursPerWeek,
          help: 'Hours a client pays for — not hours worked.',
        },
        {
          name: 'weeksOff', label: 'Weeks off per year', value: DEFAULTS.weeksOff,
          help: 'Holiday, sickness, and weeks with no work booked.',
        },
      ],
    },
    {
      legend: 'What you have to cover yourself',
      fields: [
        { name: 'businessExpenses', label: 'Business expenses', prefix: '$', value: DEFAULTS.businessExpenses, help: 'Per year. Software, hardware, insurance, accountant.' },
        { name: 'healthInsurance', label: 'Health insurance', prefix: '$', value: DEFAULTS.healthInsurance, help: 'Annual premiums you pay yourself.' },
        { name: 'retirementTarget', label: 'Retirement contributions', prefix: '$', value: DEFAULTS.retirementTarget, help: 'Per year. Nobody is matching this for you.' },
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
          help: 'Five states modelled so far. "Other" runs federal tax only.',
        },
        { name: 'dependents', label: 'Dependents', value: DEFAULTS.dependents, step: '1', help: 'Applies state exemptions and credits only. The federal child tax credit is not modelled — see the notes below.' },
      ],
    },
  ],

  answerBlock: ({ example, salaryOwnCover }) => `
<p class="answer-block"><strong>To take home $${DEFAULTS.targetIncome.toLocaleString('en-US')} as a
freelancer you need to charge about $${example.hourlyRate.toFixed(2)} an hour.</strong> That is
$${example.requiredRevenue.toLocaleString('en-US')} of billings across
${Math.round(example.billableHours).toLocaleString('en-US')} billable hours —
${DEFAULTS.billableHoursPerWeek} hours a week for ${example.workingWeeks} weeks — once
self-employment tax, income tax, business expenses, health insurance, and retirement are paid
out of it. Dividing your target by 2,080 hours gives $${example.naiveRate.toFixed(2)}, which is
short by $${example.naiveShortfall.toFixed(2)} an hour. The same take-home as an employee would
need a salary of about $${salaryOwnCover.toLocaleString('en-US')}.</p>`,

  faqs: ({ example, salaryOwnCover, salaryEmployerCover, premiumSeTax, premiumSeRate, holidayLadder, state }) => [
    {
      q: 'How do I calculate my freelance hourly rate?',
      a: `<p>Work backwards, in this order: start from the take-home you want, add the tax you will owe on it, add your business expenses, add the benefits nobody is providing — then divide by the hours you can actually <em>bill</em>, not the hours you work. On the figures above that chain runs $${DEFAULTS.targetIncome.toLocaleString('en-US')} take-home → $${example.requiredRevenue.toLocaleString('en-US')} of billings → ÷ ${Math.round(example.billableHours).toLocaleString('en-US')} billable hours → <strong>$${example.hourlyRate.toFixed(2)}/hour</strong>.</p>
<p>The order matters. Dividing first and adding tax afterwards understates the rate, because the tax is owed on the larger grossed-up figure rather than on your target.</p>`,
    },
    {
      q: 'Why is dividing my target salary by 2,080 hours wrong?',
      a: `<p>Because it makes three assumptions that are all false for a freelancer. It assumes every working hour is billable — yours are not; sales, admin, invoicing, and unpaid revisions take a large share. It assumes you never take time off, whereas 2,080 is 52 weeks of 40 hours with no holiday and no sick leave. And it ignores self-employment tax entirely, which is 15.3% on 92.35% of net earnings on top of income tax.</p>
<p>On this page's inputs, 2,080 gives $${example.naiveRate.toFixed(2)}/hour. The honest figure is $${example.hourlyRate.toFixed(2)} — <strong>${(example.hourlyRate / example.naiveRate).toFixed(1)} times higher</strong>. That ratio is why so many people leave a salaried job, charge what feels like a generous rate, and end the year worse off.</p>`,
    },
    {
      q: 'What salary is my freelance rate equivalent to?',
      a: `<p>Taking home $${DEFAULTS.targetIncome.toLocaleString('en-US')} as a freelancer is worth a salary of about <strong>$${salaryOwnCover.toLocaleString('en-US')}</strong> if you would be buying your own health cover in that job too, or about <strong>$${salaryEmployerCover.toLocaleString('en-US')}</strong> if an employer carried the premium. Both are solved by running the same money through this site's payroll model rather than estimated with a rule of thumb.</p>
<p>Note the direction people usually get wrong: you must <em>bill</em> $${example.requiredRevenue.toLocaleString('en-US')} to match a $${salaryOwnCover.toLocaleString('en-US')} salary — about $${(example.requiredRevenue - salaryOwnCover).toLocaleString('en-US')} more — because employer-side payroll tax, expenses, and benefits all come out of your billings and none of them come out of a salary.</p>`,
    },
    {
      q: 'Do I pay self-employment tax on my health insurance premiums?',
      a: `<p>Yes, and this is the single most expensive detail freelancers miss. The self-employed health insurance deduction is an above-the-line <em>income tax</em> deduction — it does not reduce net earnings from self-employment, so it does not reduce self-employment tax. An employee's premium under a Section 125 plan is excluded from income tax <em>and</em> from FICA.</p>
<p>On the $${DEFAULTS.healthInsurance.toLocaleString('en-US')} premium in this example, that asymmetry costs <strong>$${premiumSeTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a year</strong> in self-employment tax — an effective ${(premiumSeRate * 100).toFixed(2)}% on money that an employee moves entirely tax-free. It is not a loophole you are missing; it is how the deduction is written. The only structural fix is an entity election that changes how your earnings are characterised, which is a conversation for an accountant and only worth having above a certain income.</p>`,
    },
    {
      q: 'How many billable hours a week is realistic?',
      a: `<p>Below what you would guess. This example assumes ${DEFAULTS.billableHoursPerWeek} billable hours a week, which is ${(example.utilisation * 100).toFixed(0)}% utilisation against a 40-hour week. Sustained utilisation above roughly 70% is rare for independents, because finding the next piece of work is itself unpaid and never stops.</p>
<p>The practical test is to look back at a real month of invoices and divide the hours you charged for by the hours you were at your desk. Most people find the answer is between 50% and 65%. If you build your rate on 80% and deliver 55%, you are roughly a third short of your target income and the shortfall will not be visible until the year is over.</p>`,
    },
    {
      q: 'How much does taking holiday cost me?',
      a: `<p>Every week off has to be paid for by the weeks you do work, so it raises the rate you must charge. Solved across this example's inputs:</p>
<ul>
${holidayLadder.map((h) => `<li>${h.weeksOff === 0 ? 'No time off at all' : `${h.weeksOff} weeks off`} → <strong>$${h.hourlyRate.toFixed(2)}/hour</strong></li>`).join('\n')}
</ul>
<p>Going from ${holidayLadder[0].weeksOff} to ${holidayLadder.at(-1).weeksOff} weeks off costs $${(holidayLadder.at(-1).hourlyRate - holidayLadder[0].hourlyRate).toFixed(2)} an hour — about ${(((holidayLadder.at(-1).hourlyRate / holidayLadder[0].hourlyRate) - 1) * 100).toFixed(0)}% on your rate. This is not an argument against taking holiday. It is an argument for pricing it in deliberately, because the alternative is taking it anyway and quietly missing your income target.</p>`,
    },
    {
      q: 'Should I quote a day rate instead?',
      a: `<p>Often yes. An 8-hour day at $${example.hourlyRate.toFixed(2)} is $${example.dayRate.toFixed(2)}, and a day rate removes the incentive for a client to audit your hours while protecting you from the half-day that consumes a whole day anyway. It also makes a week — $${example.weekRate.toFixed(2)} here at ${DEFAULTS.billableHoursPerWeek} billable hours — a natural unit to sell. See the <a href="/day-rate-calculator/">day rate calculator</a>.</p>`,
    },
  ],

  content: ({ example, rates, state, salaryOwnCover, salaryEmployerCover, premiumSeTax, premiumSeRate }) => {
    const se = rates.federal.selfEmployment;
    const seRate = (se.socialSecurityRate + se.medicareRate) * se.netEarningsFactor;
    const line = (id) => Math.abs(example.lines.find((l) => l.id === id)?.amount ?? 0);
    // Thousands separator AND cents — toFixed(2) alone renders $1271.66 next to
    // $153,456 elsewhere on the page, which reads like a different unit.
    const cents = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
<h2>How the rate is worked out</h2>

<p>Backwards, from the money you want to keep to the number you put on a proposal. Every step adds
something a salary quietly absorbed on your behalf.</p>

<div class="formula">required billings = solve( take-home + tax + expenses + benefits )
billable hours    = billable hours per week × (52 − weeks off)
hourly rate       = required billings ÷ billable hours</div>

<p>The first line is a solve rather than a sum because tax is progressive: you cannot add a
percentage to your target, since the tax is owed on the larger grossed-up figure, which pushes part
of the income into a higher bracket, which raises the tax again. The calculator bisects until the
money left after tax lands exactly on your target.</p>

<h2>The 2,080-hour mistake</h2>

<p>The standard advice is to divide your target salary by 2,080 — 52 weeks of 40 hours. That number
describes a salaried employee's year, and it is wrong for a freelancer in three separate ways at once:
it counts hours nobody will pay you for, it assumes you never stop working, and it ignores
self-employment tax completely.</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Method</th><th scope="col">Hours used</th><th scope="col">Rate</th></tr></thead>
<tbody>
<tr><td>Target ÷ 2,080</td><td>2,080</td><td>$${example.naiveRate.toFixed(2)}</td></tr>
<tr data-best><td>Solved properly</td><td>${Math.round(example.billableHours).toLocaleString('en-US')} billable</td><td><strong>$${example.hourlyRate.toFixed(2)}</strong></td></tr>
</tbody>
</table>
</div>

<p>A gap of $${example.naiveShortfall.toFixed(2)} an hour — the naive figure is
${(example.hourlyRate / example.naiveRate).toFixed(1)}× too low. Charge $${example.naiveRate.toFixed(2)}
and bill every one of your ${Math.round(example.billableHours).toLocaleString('en-US')} hours and you
finish the year with roughly $${Math.round(example.naiveRate * example.billableHours).toLocaleString('en-US')}
of billings against the $${example.requiredRevenue.toLocaleString('en-US')} you needed.</p>

<h2>What salary this rate is actually worth</h2>

<p>This is the comparison that decides whether freelancing is working, and it is the one rate
calculators skip, because answering it needs a payroll model as well as a self-employment one. Both
figures below are solved by running the same target take-home through this site's paycheck engine:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">To take home $${DEFAULTS.targetIncome.toLocaleString('en-US')}</th>
  <th scope="col">You need</th>
</tr></thead>
<tbody>
<tr><td>Freelance — billings at $${example.hourlyRate.toFixed(2)}/hr</td><td><strong>$${example.requiredRevenue.toLocaleString('en-US')}</strong></td></tr>
<tr><td>Salaried, you buy your own health cover</td><td>$${salaryOwnCover.toLocaleString('en-US')}</td></tr>
<tr data-best><td>Salaried, employer carries the premium</td><td>$${salaryEmployerCover.toLocaleString('en-US')}</td></tr>
</tbody>
</table>
</div>

<p>You have to bill <strong>$${(example.requiredRevenue - salaryEmployerCover).toLocaleString('en-US')} more</strong>
than the salary of an equivalent job with benefits to end up in the same place. That gap is not
markup and it is not profit — it is the employer's half of payroll tax, your expenses, your benefits,
and your unpaid weeks, all of which someone else was paying before.</p>

<h2>The health insurance asymmetry</h2>

<p>Inside that gap is a detail worth isolating, because it is genuinely obscure and it costs real
money every year. The self-employed health insurance deduction is an above-the-line
<em>income tax</em> deduction. It does not reduce net earnings from self-employment, so it does not
reduce self-employment tax. An employee's premium under a Section 125 plan is excluded from income
tax <em>and</em> from FICA.</p>

<div class="formula">employee, Section 125 premium : income tax  0%   FICA  0%
self-employed premium         : income tax  0%   SE tax  ${(seRate * 100).toFixed(2)}%

on $${DEFAULTS.healthInsurance.toLocaleString('en-US')} of cover -> $${cents(premiumSeTax)} a year, or ${(premiumSeRate * 100).toFixed(2)}% of the premium</div>

<p>So two people buying the identical policy pay different amounts for it purely because of how their
income is characterised. It is not an oversight you can plan around with better bookkeeping — it is
how the deduction is written. Above a certain income an entity election changes the calculation, but
that is an accountant's conversation and it carries costs of its own.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>$${DEFAULTS.targetIncome.toLocaleString('en-US')} take-home, ${DEFAULTS.billableHoursPerWeek} billable hours a week, ${DEFAULTS.weeksOff} weeks off${state ? `, ${state.name}` : ''}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Revenue you must bill</td><td>solved</td><td>$${example.requiredRevenue.toLocaleString('en-US')}</td></tr>
<tr><td>Business expenses</td><td>your cost</td><td>−$${line('expenses').toLocaleString('en-US')}</td></tr>
<tr><td>Self-employment tax</td><td>${((se.socialSecurityRate + se.medicareRate) * 100).toFixed(1)}% × ${(se.netEarningsFactor * 100).toFixed(2)}% of net earnings</td><td>−$${line('se-tax').toLocaleString('en-US')}</td></tr>
<tr><td>Federal income tax</td><td>${DEFAULTS.filingStatus === 'single' ? 'single' : DEFAULTS.filingStatus} brackets</td><td>−$${line('federal').toLocaleString('en-US')}</td></tr>
<tr><td>${state && state.hasIncomeTax ? `${state.name} income tax` : 'State income tax'}</td><td>${state && state.hasIncomeTax ? 'state brackets' : 'no state income tax'}</td><td>−$${line('state').toLocaleString('en-US')}</td></tr>
<tr><td>Health insurance</td><td>you buy it</td><td>−$${line('health').toLocaleString('en-US')}</td></tr>
<tr><td>Retirement</td><td>nobody matches it</td><td>−$${line('retirement').toLocaleString('en-US')}</td></tr>
<tr><td><strong>Take-home</strong></td><td>your target</td><td><strong>$${DEFAULTS.targetIncome.toLocaleString('en-US')}</strong></td></tr>
<tr><td><strong>Rate required</strong></td><td>÷ ${Math.round(example.billableHours).toLocaleString('en-US')} billable hours</td><td><strong>$${example.hourlyRate.toFixed(2)}/hr</strong></td></tr>
</tbody>
</table>
</div>
<p>Read the tax lines together rather than separately: $${(line('se-tax') + line('federal') + line('state')).toLocaleString('en-US')}
of tax on $${example.requiredRevenue.toLocaleString('en-US')} of billings. Self-employment tax alone is
$${line('se-tax').toLocaleString('en-US')}, and roughly half of that is the employer's contribution that
a payroll department used to pay without it ever appearing on your payslip.</p>
</div>

<h2>Who this is for</h2>
<p>Anyone setting a rate for the first time, and anyone who has been freelancing for a year and cannot
work out where the money went. It is most useful run twice: once with the billable hours you hope for,
once with the hours you actually invoiced last quarter. The distance between those two rates is the
single largest source of freelance income shortfall, and it is invisible until you put both numbers
side by side.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Late and unpaid invoices.</strong> The calculation assumes you collect everything you bill.
Build a buffer if your clients are slow, and remember that chasing payment is unbillable time.</li>
<li><strong>Irregular income across the year</strong>, which can push you into higher brackets in a
strong year and waste deductions in a weak one.</li>
<li><strong>Entity structure.</strong> Everything here models a sole proprietor filing Schedule C. An
S-corp election changes the self-employment tax calculation materially, and carries payroll and
filing costs that only make sense above a certain profit.</li>
<li><strong>Federal tax credits.</strong> The child tax credit and other federal credits are not modelled — the dependents field feeds state exemptions only, so a filer with dependents will owe less federally than shown.</li>
<li><strong>Payment processing fees</strong>, if clients pay by card or PayPal. See the
<a href="/paypal-fee-calculator/">PayPal fee calculator</a>.</li>
<li><strong>Quarterly estimated payments.</strong> This gives an annual figure; the money is due four
times a year. See the <a href="/self-employment-tax-calculator/">self-employment tax calculator</a>.</li>
<li><strong>${Object.keys(rates.states).length} states are modelled</strong> (${Object.values(rates.states).map((s) => s.name).join(', ')}).
Others run federal tax only, so the rate will be understated where state income tax applies.</li>
</ul>

<h2>Sources and dates</h2>
<p>Tax parameters come from the IRS and state revenue departments for tax year
${rates.federal.effective.slice(0, 4)}, listed below with the date each was checked. The rate, the
salary equivalences, and the self-employment tax on health premiums are all computed by the engines
on this site from those published figures — not quoted from anywhere. If a number here disagrees with
your accountant, trust your accountant and <a href="/contact/">let us know</a>.</p>
`;
  },
};
