/**
 * self-employment-tax.js — page definition for
 * /self-employment-tax-calculator/
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is the QBI clawback on retirement contributions.
 *
 * Every 1099 tax calculator will tell you a solo 401(k) contribution is
 * deductible at your marginal rate. That is wrong whenever you also claim the
 * Section 199A QBI deduction, because QBI is computed on business income NET
 * of the retirement contribution. So a dollar in reduces taxable income by a
 * dollar and reduces your QBI deduction by twenty cents — the federal benefit
 * is marginal x 0.8, not marginal. On the defaults here that is 17.60% rather
 * than the 22% you would expect, proved by running the engine with QBI on and
 * off. The state side usually does not conform to QBI, which gives the full
 * deduction back at state rates — so the total is genuinely two different
 * calculations stacked, and this page shows both.
 *
 * Second angle: the quarters are not quarters. Q2 covers two months and Q4
 * covers four, and Q4 is due in January of the FOLLOWING year. The schedule is
 * rendered from the rate data, so those dates cannot drift out of sync.
 */

const DEFAULTS = {
  grossRevenue: 120000,
  businessExpenses: 15000,
  filingStatus: 'single',
  stateCode: 'CA',
  w2Wages: 0,
  w2Withheld: 0,
  spouseIncome: 0,
  itemizedDeductions: 0,
  retirementContrib: 0,
  healthInsurance: 0,
  paymentsMade: 0,
  priorYearTax: 18000,
  priorYearAgi: 95000,
  claimQbi: true,
  dependents: 0,
};

export default {
  id: 'self-employment-tax',
  kind: 'tool',
  calculator: 'self-employment-tax',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Self-Employment Tax Calculator',

  presets: {
    field: 'grossRevenue',
    label: 'Net earnings of…',
    values: [30000, 50000, 80000, 100000, 150000],
    format: (v) => `${v / 1000}k`,
  },
  featureList: [
    'Self-employment tax, federal income tax, and state income tax in one pass',
    'Section 199A QBI deduction, including its interaction with retirement contributions',
    'Four dated quarterly payments with the real, unequal IRS income periods',
    'Safe-harbour check against both the 90% and prior-year tests',
  ],

  groups: (rates) => [
    {
      legend: 'Your business income',
      fields: [
        { name: 'grossRevenue', label: '1099 / business income', prefix: '$', value: DEFAULTS.grossRevenue },
        { name: 'businessExpenses', label: 'Deductible business expenses', prefix: '$', value: DEFAULTS.businessExpenses, help: 'Home office, mileage, software, equipment, insurance.' },
      ],
    },
    {
      legend: 'Other income',
      fields: [
        { name: 'w2Wages', label: 'W-2 wages', prefix: '$', value: DEFAULTS.w2Wages, help: 'From a job, if you also have one.' },
        { name: 'w2Withheld', label: 'Federal tax already withheld', prefix: '$', value: DEFAULTS.w2Withheld, help: 'From that job. Counts towards your safe harbour.' },
        { name: 'spouseIncome', label: 'Spouse income', prefix: '$', value: DEFAULTS.spouseIncome, help: 'Only used when filing jointly.' },
      ],
    },
    {
      legend: 'Deductions',
      fields: [
        { name: 'retirementContrib', label: 'Solo 401(k) / SEP contribution', prefix: '$', value: DEFAULTS.retirementContrib },
        { name: 'healthInsurance', label: 'Health insurance premiums', prefix: '$', value: DEFAULTS.healthInsurance, help: 'Reduces income tax but not self-employment tax.' },
        { name: 'itemizedDeductions', label: 'Itemized deductions', prefix: '$', value: DEFAULTS.itemizedDeductions, help: 'Leave at $0 to take the standard deduction.' },
        { name: 'claimQbi', label: 'Claim the QBI deduction', type: 'checkbox', value: DEFAULTS.claimQbi, wide: true, help: 'Section 199A, up to 20% of qualified business income.' },
      ],
    },
    {
      legend: 'Payments and safe harbour',
      fields: [
        { name: 'paymentsMade', label: 'Estimated tax already paid', prefix: '$', value: DEFAULTS.paymentsMade },
        { name: 'priorYearTax', label: "Last year's total tax", prefix: '$', value: DEFAULTS.priorYearTax, help: 'Enables the prior-year safe harbour, which is often the cheaper target.' },
        { name: 'priorYearAgi', label: "Last year's AGI", prefix: '$', value: DEFAULTS.priorYearAgi, help: 'Above the high-income threshold the safe harbour rises to 110%.' },
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
<p class="answer-block"><strong>On $${DEFAULTS.grossRevenue.toLocaleString('en-US')} of 1099 income with
$${DEFAULTS.businessExpenses.toLocaleString('en-US')} of expenses, you owe about
$${example.totalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })} in total tax</strong> —
$${example.se.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} of self-employment tax plus
federal and state income tax, an effective rate of
${(example.effectiveTaxRate * 100).toFixed(1)}% on gross revenue. Self-employment tax is
${((example.rates?.selfEmployment?.socialSecurityRate ?? 0.124) * 100 + (example.rates?.selfEmployment?.medicareRate ?? 0.029) * 100).toFixed(1)}%
charged on 92.35% of net business income, and it applies before any income tax deduction.
Paid quarterly, that is about $${example.quarterly.perQuarter.toLocaleString('en-US', { maximumFractionDigits: 0 })}
per payment on the four dates below.</p>`,

  faqs: ({ example, retirement, quarters, state }) => [
    {
      q: 'How much self-employment tax will I owe on 1099 income?',
      a: `<p>15.3% of 92.35% of your net business income — an effective 14.13% — split as 12.4% Social Security and 2.9% Medicare. On $${DEFAULTS.grossRevenue.toLocaleString('en-US')} of revenue less $${DEFAULTS.businessExpenses.toLocaleString('en-US')} of expenses, that is <strong>$${example.se.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>.</p>
<p>That is before any income tax. The 92.35% adjustment exists because an employee's employer pays half of FICA out of pre-tax money, and this mirrors it. Half of the resulting SE tax is then deductible from your AGI — which reduces income tax, not the SE tax itself.</p>`,
    },
    {
      q: 'Is a solo 401(k) contribution really deductible at my marginal rate?',
      a: `<p>Not federally, if you also claim the QBI deduction — and this is the most expensive misconception in 1099 tax planning. Qualified business income is computed <em>after</em> your retirement contribution, so every dollar you contribute also shrinks the 20% QBI deduction by twenty cents. The federal benefit is your marginal rate times 0.8.</p>
<p>Proved on this page's inputs: a $${retirement.contribution.toLocaleString('en-US')} contribution saves <strong>$${retirement.saved.toLocaleString('en-US')}</strong> in federal tax, not the $${retirement.naiveSaving.toLocaleString('en-US')} that ${(retirement.marginalRate * 100).toFixed(0)}% of $${retirement.contribution.toLocaleString('en-US')} implies. The QBI deduction falls by $${retirement.qbiLost.toLocaleString('en-US')} — exactly 20% of the contribution. Turn QBI off in the calculator and the same contribution saves $${retirement.savedWithoutQbi.toLocaleString('en-US')}, the full marginal rate, which confirms the clawback is what causes the gap.</p>
<p>It is still worth contributing. It is just worth knowing the real rate is ${(retirement.effectiveRate * 100).toFixed(2)}% federally rather than ${(retirement.marginalRate * 100).toFixed(0)}%, because that changes where the contribution ranks against paying down debt or simply taking the money.</p>`,
    },
    {
      q: 'Do the quarterly deadlines cover equal quarters?',
      a: `<p>No, and this catches people every year. The four periods are:</p>
<ul>
${quarters.map((q) => `<li><strong>Q${q.quarter}</strong> — income from ${q.period}, due ${new Date(`${q.due}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</li>`).join('\n')}
</ul>
<p>Q2 covers two months and Q4 covers four. Q4's payment is due in January of the <em>following</em> year, which is the one people miss most often — the year has ended, the invoice work has stopped, and the deadline arrives anyway.</p>
<p>If you pay equal quarters against an annual estimate, the uneven periods do not matter. They matter if your income is lumpy and you are annualising, because the IRS looks at what you earned in each period, not the calendar quarter.</p>`,
    },
    {
      q: 'What is the safe harbour, and can I legally pay less during the year?',
      a: `<p>Often yes, and this is the most useful thing on this page after the QBI point. You avoid an underpayment penalty if you pay the <em>lesser</em> of 90% of this year's tax or ${(example.quarterly.safeHarborMultiplier * 100).toFixed(0)}% of last year's total tax. You still owe the full amount — but the balance is not due until you file.</p>
<p>On these inputs, 90% of this year's tax is $${example.quarterly.safeHarborCurrent.toLocaleString('en-US', { maximumFractionDigits: 0 })}, while ${(example.quarterly.safeHarborMultiplier * 100).toFixed(0)}% of last year's is $${(example.quarterly.safeHarborPrior ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}. The target is therefore <strong>$${example.quarterly.required.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> — you can hold on to the difference until the filing deadline, penalty-free, as long as you have it when the bill arrives.</p>
<p>The multiplier rises to 110% if last year's AGI was above the high-income threshold. This is a cash-flow tool, not a way to pay less tax, and it only helps if you are disciplined enough not to spend the money.</p>`,
    },
    {
      q: 'Does my health insurance premium reduce self-employment tax?',
      a: `<p>No. The self-employed health insurance deduction is an above-the-line deduction against income tax only — it does not reduce net earnings from self-employment, so self-employment tax is charged on that money at the full 14.13%. An employee's premium under a Section 125 plan escapes income tax and FICA both. The <a href="/freelance-hourly-rate-calculator/">freelance hourly rate calculator</a> quantifies what that asymmetry costs over a year.</p>`,
    },
    {
      q: 'What happens if I just do not pay quarterly?',
      a: `<p>You owe an underpayment penalty, calculated as interest on each missed instalment from its due date until you pay. It is not a flat fine — it accrues, so a Q1 shortfall costs more than the same shortfall in Q4. There is a de minimis exception if you owe less than $${(example.quarterly.underpaymentThreshold ?? 1000).toLocaleString('en-US')} at filing.</p>
<p>The practical failure mode is not deliberate. It is a first profitable year: no prior-year tax to safe-harbour against, no withholding, and a bill that arrives in April for money that was spent in July.</p>`,
    },
    {
      q: 'Should I elect S-corp status to reduce this?',
      a: `<p>Possibly, above a certain profit. An S-corp lets you split earnings into a reasonable salary (subject to payroll tax) and distributions (not subject to self-employment tax), which is where the saving comes from. Against that: payroll filings, a separate return, state franchise fees, and the fact that "reasonable salary" is a real standard the IRS enforces.</p>
<p>This calculator models a sole proprietor filing Schedule C, which is what most 1099 workers are. The S-corp comparison depends on facts this tool does not ask for, and it is a genuine accountant conversation rather than a calculator one.</p>`,
    },
  ],

  content: ({ example, rates, state, retirement, quarters }) => {
    const se = rates.federal.selfEmployment;
    const line = (id) => Math.abs(example.lines.find((l) => l.id === id)?.amount ?? 0);
    const n0 = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const n2 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
<h2>How the tax is worked out</h2>

<p>Three separate taxes on the same income, calculated in an order that matters, because each one's
base is different from the last.</p>

<div class="formula">net business income = gross revenue − business expenses
SE tax              = ${((se.socialSecurityRate + se.medicareRate) * 100).toFixed(1)}% × ${(se.netEarningsFactor * 100).toFixed(2)}% of net business income
AGI                 = net business income − ½ SE tax − retirement − health insurance
taxable income      = AGI − standard/itemized deduction − QBI deduction
income tax          = brackets applied to taxable income</div>

<p>Self-employment tax comes first and is barely reducible: only business expenses shrink its base.
Retirement contributions, health insurance, and the standard deduction all reduce income tax and
leave self-employment tax untouched. That is why a high earner's marginal rate on the next 1099
dollar is so much higher than the bracket table suggests.</p>

<h2>The retirement contribution trap</h2>

<p>Here is a claim you will find on every other 1099 tax page: a solo 401(k) contribution is
deductible at your marginal rate, so at ${(retirement.marginalRate * 100).toFixed(0)}% a
$${n0(retirement.contribution)} contribution saves you $${n0(retirement.naiveSaving)}. It does not,
if you also claim the QBI deduction — and almost every sole proprietor does.</p>

<p>Qualified business income under Section 199A is computed <em>after</em> subtracting your
retirement contribution. So the contribution does two things at once: it removes
$${n0(retirement.contribution)} from taxable income, and it removes $${n0(retirement.contribution)}
from the base of a deduction worth 20% of that base. You give back
$${n0(retirement.qbiLost)} of QBI deduction to get $${n0(retirement.contribution)} of deduction.</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">$${n0(retirement.contribution)} into a solo 401(k)</th>
  <th scope="col">Federal tax saved</th>
  <th scope="col">Effective rate</th>
</tr></thead>
<tbody>
<tr><td>What ${(retirement.marginalRate * 100).toFixed(0)}% marginal implies</td><td>$${n0(retirement.naiveSaving)}</td><td>${(retirement.marginalRate * 100).toFixed(2)}%</td></tr>
<tr data-best><td>What you actually save, claiming QBI</td><td><strong>$${n0(retirement.saved)}</strong></td><td><strong>${(retirement.effectiveRate * 100).toFixed(2)}%</strong></td></tr>
<tr><td>Same contribution, QBI not claimed</td><td>$${n0(retirement.savedWithoutQbi)}</td><td>${((retirement.savedWithoutQbi / retirement.contribution) * 100).toFixed(2)}%</td></tr>
</tbody>
</table>
</div>

<p>The third row is the proof rather than a footnote: switch the QBI deduction off and the same
contribution saves the full marginal rate again. The gap is the clawback, and it is exactly
${(retirement.marginalRate * 100).toFixed(0)}% × 0.8 = ${(retirement.effectiveRate * 100).toFixed(2)}%.</p>

${state && state.hasIncomeTax ? `<p>State tax pulls in the opposite direction. Most states, ${state.name} included, do not conform to
Section 199A — there is no QBI deduction to claw back, so the contribution deducts in full at state
rates. Including ${state.name}, the same $${n0(retirement.contribution)} saves
$${n0(retirement.savedWithState)} rather than $${n0(retirement.saved)}. The total is genuinely two
different calculations stacked, which is why a single "marginal rate" figure cannot answer this.</p>` : ''}

<h2>The quarters are not quarters</h2>

<p>Estimated tax is due four times a year on periods that are not three months long and do not line
up with calendar quarters:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Quarter</th><th scope="col">Income period</th><th scope="col">Months</th><th scope="col">Payment due</th></tr></thead>
<tbody>
${quarters.map((q) => {
      const months = { 1: 3, 2: 2, 3: 3, 4: 4 }[q.quarter] ?? 3;
      return `<tr><td>Q${q.quarter}</td><td>${q.period}</td><td>${months}</td><td>${new Date(`${q.due}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</td></tr>`;
    }).join('\n')}
</tbody>
</table>
</div>

<p>Q2 is two months. Q4 is four, and its payment falls in January of the following year — after the
tax year has closed. If you pay equal instalments against an annual estimate none of this matters. It
matters a great deal if your income is lumpy and you annualise each period, because the IRS assesses
what you earned inside each period rather than what a calendar quarter would suggest.</p>

<h2>A worked example</h2>

<div class="worked-example">
<h3>$${n0(DEFAULTS.grossRevenue)} of 1099 income, $${n0(DEFAULTS.businessExpenses)} of expenses${state ? `, ${state.name}` : ''}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Working</th><th scope="col">Amount</th></tr></thead>
<tbody>
<tr><td>1099 income</td><td>gross</td><td>$${n0(DEFAULTS.grossRevenue)}</td></tr>
<tr><td>Business expenses</td><td>deductible</td><td>−$${n0(DEFAULTS.businessExpenses)}</td></tr>
<tr><td><strong>Net business income</strong></td><td>SE tax is charged on this</td><td><strong>$${n0(example.netBusinessIncome)}</strong></td></tr>
<tr><td>Self-employment tax</td><td>${((se.socialSecurityRate + se.medicareRate) * 100).toFixed(1)}% × ${(se.netEarningsFactor * 100).toFixed(2)}%</td><td>−$${n2(example.se.total)}</td></tr>
<tr><td>QBI deduction</td><td>Section 199A</td><td>$${n0(example.qbi.amount)} off taxable income</td></tr>
<tr><td>Federal income tax</td><td>after ½ SE tax and QBI</td><td>−$${n2(line('federal-income'))}</td></tr>
<tr><td>${state && state.hasIncomeTax ? `${state.name} income tax` : 'State income tax'}</td><td>${state && state.hasIncomeTax ? 'no QBI conformity' : 'no state income tax'}</td><td>−$${n2(line('state-income'))}</td></tr>
<tr><td><strong>Total tax</strong></td><td>${(example.effectiveTaxRate * 100).toFixed(1)}% of gross revenue</td><td><strong>−$${n2(example.totalTax)}</strong></td></tr>
<tr><td><strong>Yours to keep</strong></td><td>after expenses and tax</td><td><strong>$${n2(example.trueTakeHome)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Self-employment tax alone is $${n2(example.se.total)} — more than the federal income tax bill of
$${n2(line('federal-income'))} at this income level. That inversion surprises people who budget by
thinking about their tax bracket, and it is why the first profitable 1099 year so often ends with a
bill nobody set money aside for.</p>
</div>

<h2>Who this is for</h2>
<p>Anyone with 1099 income who has to send the IRS money four times a year, and anyone in their first
profitable year of self-employment trying to work out how much to hold back. Enter last year's tax
and AGI if you have them — the prior-year safe harbour is frequently a much lower target than 90% of
this year's bill, and knowing that is worth real cash flow.</p>

<h2>What this does not account for</h2>
<ul>
<li><strong>S-corp election.</strong> Everything here models a sole proprietor filing Schedule C.</li>
<li><strong>Annualised income instalments</strong> (Form 2210 Schedule AI), which can reduce penalties
when income genuinely arrived late in the year.</li>
<li><strong>Credits</strong> beyond the standard/itemized deduction and QBI — child tax credit,
education credits, and the premium tax credit all change the final number.</li>
<li><strong>Local income tax</strong> in cities that levy one.</li>
<li><strong>${Object.keys(rates.states).length} states are modelled</strong> (${Object.values(rates.states).map((s) => s.name).join(', ')}).
Others run federal only.</li>
<li><strong>This is an estimate, not advice.</strong> It is arithmetic on published IRS parameters. A
CPA is worth their fee at this income level.</li>
</ul>

<h2>Sources and dates</h2>
<p>Federal brackets, the FICA wage base, self-employment tax rates, QBI thresholds, estimated-tax due
dates, and state schedules come from the IRS and state revenue departments for tax year
${rates.federal.effective.slice(0, 4)}, listed below with the date each was checked. The QBI clawback
figures are computed by running this page's own engine with the deduction on and off — not quoted
from anywhere. If a figure disagrees with your accountant, trust your accountant and
<a href="/contact/">let us know</a>.</p>
`;
  },
};
