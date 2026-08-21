/**
 * day-rate.js — page definition for /day-rate-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that a day rate is a meaningless number on its own,
 * and the variable that decides a contractor's year is one nobody quotes:
 * how many days a week are actually booked.
 *
 * A £/$800 day rate at five days a week and at two days a week are different
 * jobs by a factor of two and a half, and the second one is far more common
 * than contractors admit when comparing rates with each other. The utilisation
 * table on this page runs the same rate across 2–5 booked days and shows what
 * each actually earns after tax — computed, not asserted.
 *
 * The engine's fromDayRate branch had to be extended to return dayRate /
 * hourlyRate / weekRate, because it previously returned a bare invoice result
 * and the result card showed annual take-home under the label "Your day rate".
 */

const DEFAULTS = {
  mode: 'fromDayRate',
  dayRate: 800,
  billableDaysPerWeek: 3,
  weeksOff: 6,
  businessExpenses: 6000,
  filingStatus: 'single',
  stateCode: 'CA',
  dependents: 0,
  // Used only when mode is 'fromTarget', where the engine solves a rate.
  targetIncome: 85000,
  billableHoursPerWeek: 24,
  healthInsurance: 9000,
  retirementTarget: 6000,
};

export default {
  id: 'day-rate',
  kind: 'tool',
  calculator: 'day-rate',
  published: '2026-08-04',
  updated: '2026-08-04',
  defaults: DEFAULTS,

  appName: 'Day Rate Calculator',

  presets: {
    field: 'dayRate',
    label: 'At a day rate of…',
    values: [400, 600, 800, 1000, 1500],
  },
  featureList: [
    'What a day rate earns across a year at your real booked days',
    'Solves the day rate needed to hit a target income, in the other direction',
    'Self-employment tax, federal and state income tax on the result',
    'Hourly and weekly equivalents of the same rate',
  ],

  groups: (rates) => [
    {
      legend: 'Your rate',
      fields: [
        {
          name: 'mode', label: 'Work from', type: 'radio', value: DEFAULTS.mode,
          options: [
            { value: 'fromDayRate', label: 'A day rate I charge' },
            { value: 'fromTarget', label: 'The income I need' },
          ],
        },
        { name: 'dayRate', label: 'Day rate', prefix: '$', value: DEFAULTS.dayRate, help: 'Used when working from a rate.' },
        { name: 'targetIncome', label: 'Target take-home', prefix: '$', value: DEFAULTS.targetIncome, help: 'Used when working from an income.' },
      ],
    },
    {
      legend: 'How much you actually work',
      fields: [
        {
          name: 'billableDaysPerWeek', label: 'Booked days per week', value: DEFAULTS.billableDaysPerWeek, step: '0.5',
          help: 'Days a client pays for. This is the number that decides your year.',
        },
        { name: 'weeksOff', label: 'Weeks off per year', value: DEFAULTS.weeksOff, help: 'Holiday, sickness, and unbooked weeks.' },
        { name: 'businessExpenses', label: 'Business expenses', prefix: '$', value: DEFAULTS.businessExpenses, help: 'Per year.' },
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

  answerBlock: ({ example }) => `
<p class="answer-block"><strong>A $${DEFAULTS.dayRate} day rate booked
${DEFAULTS.billableDaysPerWeek} days a week for ${example.workingWeeks} weeks bills
$${example.annualRevenue.toLocaleString('en-US')} a year and leaves you about
$${example.takeHome.toLocaleString('en-US', { maximumFractionDigits: 0 })} after tax and expenses.</strong>
That is ${example.billableDays} booked days — the number that matters far more than the rate itself.
The same $${DEFAULTS.dayRate} at five days a week would bill
$${(DEFAULTS.dayRate * 5 * example.workingWeeks).toLocaleString('en-US')}. A day rate quoted without a
utilisation figure describes almost nothing.</p>`,

  faqs: ({ example, utilisation, state }) => [
    {
      q: 'What does a $800 day rate actually earn in a year?',
      a: `<p>It depends almost entirely on how many days a week you are booked, which is why the rate alone tells you so little:</p>
<ul>
${utilisation.map((u) => `<li><strong>${u.daysPerWeek} days a week</strong> — ${u.billableDays} days, $${u.revenue.toLocaleString('en-US')} billed, <strong>$${u.takeHome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> after tax</li>`).join('\n')}
</ul>
<p>The gap between two and five days is a factor of ${(utilisation.at(-1).revenue / utilisation[0].revenue).toFixed(1)} on revenue. Two contractors quoting the identical rate can be earning wildly different livings, and the one who is fully booked rarely mentions that this is the actual difference.</p>`,
    },
    {
      q: 'How do I convert an hourly rate to a day rate?',
      a: `<p>Multiply by the hours in a billable day — usually 8, sometimes 7.5. On this example, $${DEFAULTS.dayRate} a day is $${example.hourlyRate.toFixed(2)} an hour and $${example.weekRate.toFixed(2)} for a ${DEFAULTS.billableDaysPerWeek}-day week.</p>
<p>Do not discount the day rate below the hourly equivalent as a "bulk" gesture. A booked day removes your ability to sell that day to anyone else, which is the opposite of a bulk discount — you are selling exclusivity, not volume.</p>`,
    },
    {
      q: 'Should I charge a day rate or an hourly rate?',
      a: `<p>Day rates suit work that occupies whole days and clients who want a predictable number. They remove the incentive for a client to audit your hours, and they protect you from the half-day that consumes a full day anyway once you account for context switching.</p>
<p>Hourly suits support, maintenance, and anything genuinely interruptible. The practical test: if a client asking for "just two hours" would in fact cost you the day, quote a day rate. See the <a href="/freelance-hourly-rate-calculator/">freelance hourly rate calculator</a> for the rate itself.</p>`,
    },
    {
      q: 'How much should I raise my rate versus finding more days?',
      a: `<p>Arithmetically they are equivalent — a 25% rate rise and a move from ${DEFAULTS.billableDaysPerWeek} to ${(DEFAULTS.billableDaysPerWeek * 1.25).toFixed(2)} booked days produce the same revenue. In practice they are not equivalent at all, because the extra days cost you time and the rate rise does not.</p>
<p>Going from ${utilisation[0].daysPerWeek} to ${utilisation.at(-1).daysPerWeek} days here adds $${(utilisation.at(-1).takeHome - utilisation[0].takeHome).toLocaleString('en-US', { maximumFractionDigits: 0 })} of take-home and consumes ${utilisation.at(-1).billableDays - utilisation[0].billableDays} more working days a year. Raising the rate to reach the same place costs you nothing but the conversation. Almost every contractor under-invests in the second option.</p>`,
    },
    {
      q: 'Is a day rate contract better than a salary?',
      a: `<p>Compare the whole package rather than the headline. On this example the day rate bills $${example.annualRevenue.toLocaleString('en-US')} but leaves $${example.takeHome.toLocaleString('en-US', { maximumFractionDigits: 0 })} after expenses and tax — and out of that you still fund your own holiday, sickness, pension, and health cover, none of which a salaried equivalent would ask you to pay.</p>
<p>The <a href="/freelance-hourly-rate-calculator/">freelance hourly rate calculator</a> solves the equivalent salary directly, which is the honest form of this comparison.</p>`,
    },
    {
      q: 'What counts as a booked day?',
      a: `<p>A day a client pays for. Not a day you worked — proposals, invoicing, admin, and the call that turned into an afternoon are all real work and none of them are booked. Contractors consistently overestimate this figure when planning and discover the truth only when the year's invoices are added up.</p>
<p>The reliable method is to look backwards: count the days you actually invoiced last quarter and divide by 13 weeks. Whatever that number is, use it here rather than the number you intend to hit.</p>`,
    },
  ],

  content: ({ example, utilisation, state, rates }) => {
    const n0 = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

    return `
<h2>How a day rate becomes a year</h2>

<p>Three multiplications and a tax calculation. The arithmetic is trivial; the reason people get the
answer wrong is that they guess the middle term.</p>

<div class="formula">working weeks = 52 − weeks off
booked days   = booked days per week × working weeks
revenue       = day rate × booked days
take-home     = revenue − expenses − SE tax − income tax</div>

<p>On this example: ${example.workingWeeks} working weeks × ${DEFAULTS.billableDaysPerWeek} days =
${example.billableDays} booked days, × $${DEFAULTS.dayRate} =
$${n0(example.annualRevenue)} billed, leaving <strong>$${n0(example.takeHome)}</strong> after
expenses and tax${state && state.hasIncomeTax ? ` including ${state.name} income tax` : ''}.</p>

<h2>The number nobody quotes</h2>

<p>Contractors compare day rates constantly and almost never compare utilisation, which is the term
that actually decides the year. Here is the identical $${DEFAULTS.dayRate} rate across a realistic
range of booked days:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">Booked days/week</th>
  <th scope="col">Days a year</th>
  <th scope="col">Billed</th>
  <th scope="col">Take-home</th>
  <th scope="col">vs 2 days</th>
</tr></thead>
<tbody>
${utilisation.map((u) => `<tr${u.daysPerWeek === DEFAULTS.billableDaysPerWeek ? ' data-best' : ''}>
  <td>${u.daysPerWeek}${u.daysPerWeek === DEFAULTS.billableDaysPerWeek ? ' <em>(yours)</em>' : ''}</td>
  <td>${u.billableDays}</td>
  <td>$${n0(u.revenue)}</td>
  <td><strong>$${n0(u.takeHome)}</strong></td>
  <td>${u.daysPerWeek === utilisation[0].daysPerWeek ? '—' : `+$${n0(u.takeHome - utilisation[0].takeHome)}`}</td>
</tr>`).join('\n')}
</tbody>
</table>
</div>

<p>Two days a week and five days a week at the same rate are a factor of
${(utilisation.at(-1).revenue / utilisation[0].revenue).toFixed(1)} apart on revenue and
$${n0(utilisation.at(-1).takeHome - utilisation[0].takeHome)} apart on take-home. When another
contractor tells you their day rate, they have told you roughly nothing about what they earn — and
the ones quoting the highest rates are frequently the ones with the most unbooked days, because a
high rate is part of what keeps the calendar empty.</p>

<p>Note also that take-home does not scale linearly with the days. Going from
${utilisation[0].daysPerWeek} to ${utilisation.at(-1).daysPerWeek} days multiplies revenue by
${(utilisation.at(-1).revenue / utilisation[0].revenue).toFixed(1)} but take-home by only
${(utilisation.at(-1).takeHome / utilisation[0].takeHome).toFixed(1)}, because the extra income lands
in higher brackets. The last day of the week is worth materially less after tax than the first.</p>

<h2>Raise the rate or fill the calendar?</h2>

<p>The two are arithmetically interchangeable and practically not. A 25% rate rise and a 25% increase
in booked days produce identical revenue — but the extra days cost you ${Math.round(example.billableDays * 0.25)}
working days a year and the rate rise costs you one uncomfortable conversation.</p>

<p>The asymmetry is stark enough to be worth stating plainly: filling the calendar is bounded (there
are only five days in a week and you will want some of them) while the rate is not. Contractors
default to chasing days because a booking feels like progress and a rate rise feels like a risk. The
table above prices that instinct.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>$${DEFAULTS.dayRate} a day, ${DEFAULTS.billableDaysPerWeek} days a week, ${DEFAULTS.weeksOff} weeks off${state ? `, ${state.name}` : ''}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>Booked days</td><td>${DEFAULTS.billableDaysPerWeek} × ${example.workingWeeks} weeks</td><td>${example.billableDays} days</td></tr>
<tr><td>Revenue billed</td><td>$${DEFAULTS.dayRate} × ${example.billableDays}</td><td>$${n0(example.annualRevenue)}</td></tr>
${example.lines.filter((l) => l.kind !== 'info' && l.amount !== 0 && l.id !== 'invoice').map((l) => `<tr><td>${l.label}</td><td>${l.detail ?? ''}</td><td>${l.amount < 0 ? '−' : ''}$${n0(Math.abs(l.amount))}</td></tr>`).join('\n')}
<tr><td><strong>Take-home</strong></td><td>after expenses and tax</td><td><strong>$${n0(example.takeHome)}</strong></td></tr>
<tr><td>Hourly equivalent</td><td>$${DEFAULTS.dayRate} ÷ 8</td><td>$${example.hourlyRate.toFixed(2)}</td></tr>
<tr><td>Weekly equivalent</td><td>$${DEFAULTS.dayRate} × ${DEFAULTS.billableDaysPerWeek}</td><td>$${example.weekRate.toFixed(2)}</td></tr>
</tbody>
</table>
</div>
<p>Out of the $${n0(example.takeHome)} that survives, you still fund your own holiday, sick days,
pension, and health cover — costs a salaried contract would carry for you. That is the comparison
worth making before concluding a day rate is generous.</p>
</div>

<h2>Who this is for</h2>
<p>Contractors and consultants pricing a day, and anyone deciding between a day-rate contract and a
salary. Use it with the booked-days figure from last quarter's invoices rather than the one you hope
for — the difference between those two numbers is the difference between a plan and a wish.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>Late payment.</strong> Booked and billed is not the same as banked; 60-day terms on a
day-rate contract are a working capital problem.</li>
<li><strong>Agency or umbrella margins</strong>, which come off the top before you see the rate.</li>
<li><strong>Health insurance and retirement</strong>, which are not modelled in this mode — see the
<a href="/freelance-hourly-rate-calculator/">freelance hourly rate calculator</a>, which does.</li>
<li><strong>Expenses reimbursed separately</strong>, such as travel billed on top of the rate.</li>
<li><strong>Federal tax credits.</strong> The child tax credit and other federal credits are not modelled — the dependents field feeds state exemptions only, so a filer with dependents will owe less federally than shown.</li>
<li><strong>Entity structure.</strong> This models a sole proprietor filing Schedule C.</li>
<li><strong>${Object.keys(rates.states).length} states are modelled</strong>
(${Object.values(rates.states).map((s) => s.name).join(', ')}).</li>
</ul>

<h2>Sources and dates</h2>
<p>Tax parameters come from the IRS and state revenue departments for tax year
${rates.federal.effective.slice(0, 4)}, listed below with the date each was checked. The utilisation
table is produced by running this page's engine once per booked-days figure rather than scaled from a
single result, so the bracket effects in it are real. If a figure disagrees with your accountant,
trust your accountant and <a href="/contact/">let us know</a>.</p>
`;
  },
};
