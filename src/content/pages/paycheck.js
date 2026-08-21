/**
 * paycheck.js — page definition for /paycheck-calculator/ and its five state
 * spokes at /paycheck-calculator/<state-slug>/.
 *
 * The non-commodity angle here (spec section 9.3 — "add one thing per tool
 * that only you have") is that two "pre-tax" deductions are not worth the same
 * thing, and every paycheck calculator treats them as if they were.
 *
 * A traditional 401(k) contribution is excluded from income tax but NOT from
 * the Social Security and Medicare wage base. A Section 125 health premium is
 * excluded from income tax AND from FICA — and from state payroll levies like
 * CA SDI, which are also assessed on wages. So the same $5,000 costs
 * measurably less take-home when it goes through the premium. Both figures are
 * produced by running the engine twice, not typed.
 *
 * This is the employee-side mirror of the finding on the freelance hourly rate
 * page: there, self-employment tax IS charged on health premiums. Same rule,
 * opposite conclusion, depending on how your income is characterised.
 *
 * `spoke(state, rates)` below returns the per-state overrides. The build calls
 * it once per code in PAYCHECK_STATES and renders a full tool page from the
 * result, so each state's HTML carries that state's real computed numbers.
 */

const DEFAULTS = {
  // Biweekly and annual are both round at this figure ($3,250 x 26 = $84,500),
  // so no worked example on this page has to quote an amount with stray cents.
  grossPay: 3250,
  payFrequency: 'biweekly',
  filingStatus: 'single',
  stateCode: 'CA',
  dependents: 0,
  retirement401kPct: 6,
  roth401kPct: 0,
  healthPremium: 120,
  hsaContribution: 0,
  otherPreTax: 0,
  otherPostTax: 0,
  extraWithholding: 0,
  otherIncome: 0,
  deductionsW4: 0,
  multipleJobs: false,
  isLocal: false,
};

const money0 = (v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const money2 = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Form definition, shared by the hub and every spoke. */
function groups(rates, { lockState = null } = {}) {
  return [
    {
      legend: 'Your pay',
      fields: [
        { name: 'grossPay', label: 'Gross pay per period', prefix: '$', value: DEFAULTS.grossPay, help: 'Before any deductions, for the frequency below.' },
        {
          name: 'payFrequency', label: 'Pay frequency', type: 'select', value: DEFAULTS.payFrequency,
          options: rates.federal.payFrequencies.map((f) => ({ value: f.id, label: f.label })),
        },
      ],
    },
    {
      legend: 'Pre-tax deductions',
      fields: [
        { name: 'retirement401kPct', label: 'Traditional 401(k)', suffix: '%', value: DEFAULTS.retirement401kPct, help: 'Percent of gross. Reduces income tax but NOT FICA.' },
        { name: 'roth401kPct', label: 'Roth 401(k)', suffix: '%', value: DEFAULTS.roth401kPct, help: 'Percent of gross. Taxed now, not later.' },
        { name: 'healthPremium', label: 'Health premium per period', prefix: '$', value: DEFAULTS.healthPremium, help: 'Section 125 — escapes income tax and FICA both.' },
        { name: 'hsaContribution', label: 'HSA per period', prefix: '$', value: DEFAULTS.hsaContribution },
        { name: 'otherPreTax', label: 'Other pre-tax per period', prefix: '$', value: DEFAULTS.otherPreTax },
      ],
    },
    {
      legend: 'Your W-4',
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
        lockState
          ? { name: 'stateCode', type: 'hidden', value: lockState }
          : {
              name: 'stateCode', label: 'State', type: 'select', value: DEFAULTS.stateCode,
              options: [
                ...Object.entries(rates.states).map(([code, s]) => ({ value: code, label: s.name })),
                { value: '', label: 'Other / not listed' },
              ],
            },
        { name: 'dependents', label: 'Dependents', value: DEFAULTS.dependents, step: '1', help: 'Applies state exemptions and credits only. The federal child tax credit is not modelled — see the notes below.' },
        { name: 'multipleJobs', label: 'Multiple jobs (W-4 step 2)', type: 'checkbox', value: DEFAULTS.multipleJobs, wide: true },
        { name: 'extraWithholding', label: 'Extra withholding (4c)', prefix: '$', value: DEFAULTS.extraWithholding },
        { name: 'otherPostTax', label: 'Post-tax deductions', prefix: '$', value: DEFAULTS.otherPostTax },
      ],
    },
  ];
}

/* ------------------------------------------------------- shared sections -- */

function preTaxSection({ preTax, example, state }) {
  return `
<h2>Not all pre-tax dollars are worth the same</h2>

<p>Every paycheck calculator lumps "pre-tax deductions" into one bucket. They are not one bucket. A
traditional 401(k) contribution is excluded from income tax but is still fully subject to Social
Security and Medicare. A health premium taken under a Section 125 plan is excluded from income tax
<em>and</em> from the FICA wage base${state && state.payrollTaxes?.length ? `, and from ${state.name}'s wage-based payroll levy as well` : ''}.</p>

<p>Same ${money0(preTax.amount)} routed two ways, on the pay in this example:</p>

<div class="table-scroll">
<table>
<thead><tr>
  <th scope="col">${money0(preTax.amount)} a year through…</th>
  <th scope="col">Take-home falls by</th>
  <th scope="col">FICA saved</th>
  <th scope="col">Cost per $1</th>
</tr></thead>
<tbody>
<tr><td>Traditional 401(k)</td><td>${money2(preTax.retirementCost)}</td><td>${money2(preTax.ficaSavedByRetirement)}</td><td>${(preTax.retirementCost / preTax.amount).toFixed(4)}</td></tr>
<tr data-best><td>Section 125 health premium</td><td><strong>${money2(preTax.premiumCost)}</strong></td><td><strong>${money2(preTax.ficaSavedByPremium)}</strong></td><td><strong>${(preTax.premiumCost / preTax.amount).toFixed(4)}</strong></td></tr>
</tbody>
</table>
</div>

<p>The premium route keeps <strong>${money2(preTax.advantage)}</strong> more in your pocket for the
same money moved. ${money2(preTax.ficaSavedByPremium)} of that is FICA the 401(k) cannot avoid${preTax.payrollSavedByPremium > 0.005 ? `, and ${money2(preTax.payrollSavedByPremium)} is ${state.name} payroll tax assessed on wages` : ''}.
The 401(k) saves exactly ${money2(preTax.ficaSavedByRetirement)} of FICA — nothing, because deferral
does not change what you earned for Social Security purposes.</p>

<p>This is not an argument against the 401(k), which is doing something else entirely: deferring
income to a year when your rate may be lower, and buying decades of untaxed growth. It is an argument
against reading one "pre-tax" label and assuming two deductions are equivalent. If you have a choice
about how benefits are structured — an HSA, a premium conversion plan, a dependent care FSA — the
ones that dodge FICA are worth more per dollar than the ones that do not.</p>

<p>Worth noting the mirror image: for a self-employed person the same health premium is charged
self-employment tax in full, because the deduction is written against income tax only. The
<a href="/self-employment-tax-calculator/">self-employment tax calculator</a> quantifies that side.</p>`;
}

function withholdingSection() {
  return `
<h2>Why your refund is not a bonus</h2>

<p>Withholding is an estimate your employer makes on the IRS's behalf, using the W-4 you filled in
once and probably have not looked at since. It is not your tax. A large refund means you lent the
government money at 0% for up to sixteen months; a large bill means the opposite.</p>

<p>The W-4 has not had "allowances" since 2020. It now asks for dollar amounts directly: step 3 for
dependent credits, 4a for other income, 4b for deductions beyond the standard, and 4c for extra
withholding per period. The most common cause of an unexpected bill is step 2 — two jobs, or a
working spouse, each withholding as though its salary were the household's only income, so both
under-withhold against a jointly progressive rate.</p>`;
}

function notAccountedFor(rates, state) {
  return `
<h2>What this does not account for</h2>
<ul>
<li><strong>Local and city income taxes</strong> beyond the state level${state && state.localTaxes?.length ? `, though ${state.name}'s are modelled` : ''}.</li>
<li><strong>Federal tax credits.</strong> The child tax credit and other federal credits are not modelled — the dependents field feeds state exemptions only, so a filer with dependents will owe less federally than shown.</li>
<li><strong>Wage garnishments, union dues, and employer-specific deductions.</strong></li>
<li><strong>Bonuses and supplemental wages</strong>, which are withheld at a flat supplemental rate
rather than through the bracket table.</li>
<li><strong>Employer contributions</strong> — a 401(k) match and the employer's half of your premium
are real compensation that never appears on the gross line.</li>
<li><strong>Year-to-date effects.</strong> Each period is computed as if it were typical, so the
Social Security wage base cut-off part-way through a year is not modelled per period.</li>
<li><strong>${Object.keys(rates.states).length} states are modelled</strong> (${Object.values(rates.states).map((s) => s.name).join(', ')}).</li>
</ul>`;
}

function sourcesNote(rates) {
  return `
<h2>Sources and dates</h2>
<p>Federal brackets, the standard deduction, FICA rates and wage base, and each state's schedule come
from the IRS and state revenue departments for tax year ${rates.federal.effective.slice(0, 4)},
listed below with the date each was checked. The pre-tax comparison figures are computed by running
this page's own engine both ways rather than quoted. If a figure disagrees with your payslip, trust
your payslip and <a href="/contact/">let us know</a>.</p>`;
}

/* ------------------------------------------------------------- hub page -- */

export default {
  id: 'paycheck',
  kind: 'tool',
  calculator: 'paycheck',
  published: '2026-08-03',
  updated: '2026-08-03',
  defaults: DEFAULTS,

  appName: 'Paycheck Calculator',

  /**
   * Salary presets, not per-paycheck ones. "What is my take-home on $100,000
   * in California" is the query people actually type, so the button is labelled
   * by annual salary — but the field it fills is per-period gross, so it has to
   * set the pay frequency at the same time or the label would be a lie.
   */
  presets: {
    label: 'On an annual salary of…',
    values: [50000, 75000, 100000, 120000, 150000].map((annual) => ({
      label: `$${annual / 1000}k`,
      set: { grossPay: Number((annual / 26).toFixed(2)), payFrequency: 'biweekly' },
    })),
  },
  featureList: [
    'Federal income tax withholding from the post-2020 W-4',
    'Social Security and Medicare, including the additional Medicare surtax',
    'State income tax and state payroll levies for five states',
    'Traditional and Roth 401(k), Section 125 premiums, and HSA handled separately',
  ],

  groups: (rates) => groups(rates),

  answerBlock: ({ example, state }) => `
<p class="answer-block"><strong>On ${money0(DEFAULTS.grossPay)} ${example.payFrequencyLabel.toLowerCase()}
gross${state ? ` in ${state.name}` : ''}, your take-home is about
${money2(example.totals.net)} per paycheck</strong> — ${money0(example.annual.takeHome)} a year on
${money0(example.annual.gross)} of salary, an effective tax rate of
${(example.effectiveTaxRate * 100).toFixed(1)}%. That is after federal income tax, Social Security at
6.2%, Medicare at 1.45%${state && state.hasIncomeTax ? `, ${state.name} income tax` : ''}, a
${DEFAULTS.retirement401kPct}% traditional 401(k) contribution, and a ${money0(DEFAULTS.healthPremium)}
health premium.</p>`,

  faqs: ({ example, preTax, stateComparison, state }) => [
    {
      q: 'How much of my paycheck goes to taxes?',
      a: `<p>On this example, ${(example.effectiveTaxRate * 100).toFixed(1)}% — ${money0(example.annual.gross - example.annual.takeHome - example.annual.trad401k)} of tax on ${money0(example.annual.gross)} of gross, before the ${money0(example.annual.trad401k)} that goes to your own 401(k) rather than to anyone else.</p>
<p>Keeping those separate matters. Money into a traditional 401(k) is still yours; it is deferred, not spent. Calculators that report a single "take-home" number without splitting deferral from tax make your effective rate look considerably worse than it is.</p>`,
    },
    {
      q: 'Does my 401(k) contribution reduce Social Security and Medicare tax?',
      a: `<p>No — and this is the most common misconception about pre-tax deductions. A traditional 401(k) is excluded from <em>income</em> tax only. Social Security and Medicare are assessed on your full gross wage, so on this example the ${money0(preTax.amount)} contribution saves ${money2(preTax.ficaSavedByRetirement)} of FICA.</p>
<p>A Section 125 health premium is different: it is excluded from income tax and from the FICA wage base, saving ${money2(preTax.ficaSavedByPremium)} on the same amount. Routing ${money0(preTax.amount)} through the premium rather than the 401(k) leaves <strong>${money2(preTax.advantage)}</strong> more take-home. They are doing different jobs, but they are not interchangeable "pre-tax" dollars.</p>`,
    },
    {
      q: 'Why is my take-home lower than a salary calculator said?',
      a: `<p>Usually because the other calculator applied only federal tax and FICA. State income tax${state && state.hasIncomeTax ? `, which in ${state.name} takes ${money0(example.annual.state)} a year here,` : ''} and state payroll levies${example.annual.statePayroll > 0 ? ` — another ${money0(example.annual.statePayroll)}` : ''} are frequently omitted. Your own pre-tax deductions then come off on top of that.</p>`,
    },
    {
      q: 'Which of these five states pays the most take-home on the same salary?',
      a: `<p>On ${money0(example.annual.gross)} of gross with identical deductions:</p>
<ul>
${stateComparison.map((s) => `<li><strong>${s.name}</strong> — ${money0(s.takeHomeAnnual)} a year${s.stateTaxAnnual > 0 ? ` (${money0(s.stateTaxAnnual)} of state tax)` : ' (no state income tax)'}</li>`).join('\n')}
</ul>
<p>The spread between best and worst is ${money0(stateComparison[0].takeHomeAnnual - stateComparison.at(-1).takeHomeAnnual)} a year. That is a real number, but it is the smaller half of the question — housing costs typically move by multiples of it, and a state with no income tax funds itself through property and sales taxes instead.</p>`,
    },
    {
      q: 'Should I contribute to a traditional or Roth 401(k)?',
      a: `<p>The arithmetic reduces to one question: is your marginal rate higher now or in retirement? Traditional deducts now and taxes withdrawals; Roth taxes now and never again. Neither escapes FICA, so the choice does not change your Social Security and Medicare at all.</p>
<p>Two things that are not in the arithmetic and often decide it: Roth has no required minimum distributions, and a traditional contribution lowers your AGI, which can qualify you for credits and deductions that phase out. Enter both in the calculator to see the per-paycheck difference before deciding.</p>`,
    },
    {
      q: 'Why did my refund change when nothing about my job changed?',
      a: `<p>Withholding tables are re-issued each year as brackets and the standard deduction are inflation-adjusted, so the same salary and the same W-4 produce different withholding year to year. A refund is the gap between what was withheld and what you owed — it moves whenever either side moves, including when you had no say in it.</p>`,
    },
  ],

  content: (ctx) => {
    const { example, rates, state, stateComparison } = ctx;
    return `
<h2>How your paycheck is calculated</h2>

<p>Deductions come off in a specific order, and each tax has a different base. That is the whole
reason two people with the same salary can take home noticeably different amounts.</p>

<div class="formula">FICA wage base   = gross − Section 125 premiums − HSA        (NOT − 401k)
taxable wages    = gross − all pre-tax deductions incl. 401k
Social Security  = 6.20% × FICA wage base, up to the annual wage cap
Medicare         = 1.45% × FICA wage base, no cap
federal income   = W-4 method applied to annualised taxable wages
state income     = state schedule, on its own definition of taxable wages</div>

<p>Read the first two lines together. The 401(k) appears in one base and not the other, which is the
single most consequential asymmetry on a US payslip and the subject of the next section.</p>

${preTaxSection(ctx)}

<h2>A worked example</h2>

<div class="worked-example">
<h3>${money0(DEFAULTS.grossPay)} ${example.payFrequencyLabel.toLowerCase()}${state ? ` in ${state.name}` : ''}, ${DEFAULTS.retirement401kPct}% 401(k), ${money0(DEFAULTS.healthPremium)} health premium</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Per period</th><th scope="col">Per year</th></tr></thead>
<tbody>
${example.lines.filter((l) => l.amount !== 0 || l.id === 'gross').map((l) => `<tr><td>${l.label}</td><td>${money2(l.amount)}</td><td>${money2(l.amount * example.periodsPerYear)}</td></tr>`).join('\n')}
<tr><td><strong>Take-home</strong></td><td><strong>${money2(example.totals.net)}</strong></td><td><strong>${money2(example.annual.takeHome)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Effective tax rate: ${(example.effectiveTaxRate * 100).toFixed(1)}%. Note that the
${money2(example.annual.trad401k)} of 401(k) is inside the gap between gross and take-home but is not
tax — it is still your money, sitting in your account. Tax alone is
${money2(example.annual.gross - example.annual.takeHome - example.annual.trad401k)}.</p>
</div>

<h2>The same salary in five states</h2>

<p>Identical gross, identical deductions, different states:</p>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">State</th><th scope="col">State tax + payroll</th><th scope="col">Take-home per year</th><th scope="col">Effective rate</th></tr></thead>
<tbody>
${stateComparison.map((s, i) => `<tr${i === 0 ? ' data-best' : ''}><td><a href="/paycheck-calculator/${s.slug}/">${s.name}</a></td><td>${money0(s.stateTaxAnnual)}</td><td>${money0(s.takeHomeAnnual)}</td><td>${(s.effectiveRate * 100).toFixed(1)}%</td></tr>`).join('\n')}
</tbody>
</table>
</div>

<p>A ${money0(stateComparison[0].takeHomeAnnual - stateComparison.at(-1).takeHomeAnnual)} annual spread
across these five. Worth putting next to the fact that states without an income tax raise revenue
through property and sales taxes instead, which fall on different people in different proportions —
the take-home column is a real comparison, not a complete one.</p>

${withholdingSection()}

<h2>Who this is for</h2>
<p>Anyone checking a payslip against what it should be, weighing a job offer against a current
salary, or deciding how much to put into a 401(k). It is most useful run twice — once as you are paid
now, once with the change you are considering — because the per-paycheck difference is usually much
smaller than people expect and the annual difference much larger.</p>

${notAccountedFor(rates, state)}
${sourcesNote(rates)}
`;
  },

  /* --------------------------------------------------------- state spokes -- */

  /**
   * Per-state overrides. Called once per PAYCHECK_STATES entry by the build,
   * which then renders a complete tool page from the merged object — so each
   * state's page runs the engine on its own defaults and ships its own numbers.
   *
   * The state select is replaced by a hidden field on a spoke: the page exists
   * to answer one state's question, and readForm() in app.js rebuilds the
   * engine input from the DOM alone, so the field has to be present in some
   * form or every recalculation would fall back to the hub's default state.
   */
  spoke(state, rates) {
    const defaults = { ...DEFAULTS, stateCode: state.state };
    const noTax = !state.hasIncomeTax;

    return {
      id: `paycheck-${state.slug}`,
      path: `/paycheck-calculator/${state.slug}/`,
      slug: `paycheck-calculator/${state.slug}`,
      defaults,
      // The bare "paycheck calculator" head term belongs to SmartAsset and ADP,
      // so every state spoke carries the state name in the H1 and the title and
      // competes only for "[state] paycheck calculator", which is winnable.
      h1: `${state.name} Paycheck Calculator — Take-Home Pay After Taxes (${rates.federal.effective.slice(0, 4)})`,
      linkLabel: `${state.name} paycheck calculator`,
      title: `${state.name} Paycheck Calculator ${rates.federal.effective.slice(0, 4)} — Take-Home Pay After Taxes`,
      description: noTax
        ? `Calculate ${state.name} take-home pay. ${state.name} has no state income tax, so your paycheck is federal tax and FICA only — see exactly what that leaves you.`
        : `Calculate ${state.name} take-home pay after federal tax, FICA, and ${state.name} income tax, including 401(k) and pre-tax health deductions.`,
      blurb: `Take-home pay in ${state.name}, after federal, FICA${noTax ? '' : ', and state tax'}.`,
      keyword: `${state.name.toLowerCase()} paycheck calculator`,

      groups: (r) => groups(r, { lockState: state.state }),

      answerBlock: ({ example }) => `
<p class="answer-block"><strong>On ${money0(DEFAULTS.grossPay)} ${example.payFrequencyLabel.toLowerCase()}
gross in ${state.name}, your take-home is about ${money2(example.totals.net)} per paycheck</strong> —
${money0(example.annual.takeHome)} a year on ${money0(example.annual.gross)} of salary, an effective
rate of ${(example.effectiveTaxRate * 100).toFixed(1)}%. ${noTax
        ? `${state.name} levies no state income tax, so the only deductions are federal income tax, Social Security, and Medicare.`
        : `${state.name} income tax takes ${money0(example.annual.state)} a year${example.annual.statePayroll > 0 ? `, plus ${money0(example.annual.statePayroll)} of state payroll tax` : ''}.`}</p>`,

      faqs: ({ example, preTax, stateComparison }) => {
        const rank = stateComparison.findIndex((s) => s.code === state.state) + 1;
        return [
          {
            q: `How much is take-home pay on ${money0(example.annual.gross)} in ${state.name}?`,
            a: `<p>About <strong>${money0(example.annual.takeHome)} a year</strong>, or ${money2(example.totals.net)} per ${example.payFrequencyLabel.toLowerCase().replace(/ly$/, '')} paycheck, with a ${DEFAULTS.retirement401kPct}% 401(k) contribution and a ${money0(DEFAULTS.healthPremium)} health premium. That is an effective tax rate of ${(example.effectiveTaxRate * 100).toFixed(1)}%.</p>
<p>Federal income tax accounts for ${money0(example.annual.federal)}, Social Security and Medicare for ${money0(example.annual.socialSecurity + example.annual.medicare)}${noTax ? '' : `, and ${state.name} income tax for ${money0(example.annual.state)}`}.</p>`,
          },
          {
            q: `Does ${state.name} have a state income tax?`,
            a: noTax
              ? `<p>No. ${state.name} levies no personal income tax on wages, so your paycheck is reduced only by federal income tax and FICA${example.annual.statePayroll > 0 ? `, plus a state payroll levy of ${money0(example.annual.statePayroll)} a year` : ''}. That is worth roughly ${money0((stateComparison.find((s) => s.code === 'CA')?.stateTaxAnnual ?? 0))} a year compared with California at this salary.</p>
<p>It does not mean the state raises no revenue from you. ${state.name} leans on property and sales taxes instead, which are not withheld from your paycheck and therefore never show up in a take-home comparison.</p>`
              : `<p>Yes — ${state.name} uses a ${state.method === 'flat' ? 'flat-rate' : 'progressive bracket'} system. On this example it takes <strong>${money0(example.annual.state)}</strong> a year${example.annual.statePayroll > 0 ? `, and a further ${money0(example.annual.statePayroll)} in state payroll tax assessed on wages` : ''}.</p>
<p>Among the five states this site models, ${state.name} ranks ${rank} of ${stateComparison.length} for take-home on identical pay.</p>`,
          },
          {
            q: 'Does my 401(k) contribution reduce Social Security and Medicare tax?',
            a: `<p>No. A traditional 401(k) is excluded from income tax only — FICA is charged on your full gross wage. On this example, ${money0(preTax.amount)} through the 401(k) saves ${money2(preTax.ficaSavedByRetirement)} of FICA, while the same amount through a Section 125 health premium saves ${money2(preTax.ficaSavedByPremium)}${preTax.payrollSavedByPremium > 0.005 ? ` and a further ${money2(preTax.payrollSavedByPremium)} of ${state.name} payroll tax` : ''} — leaving <strong>${money2(preTax.advantage)}</strong> more take-home for the same money moved.</p>`,
          },
          {
            q: `Where does ${state.name} rank against the other states here?`,
            a: `<p>On ${money0(example.annual.gross)} of gross with identical deductions:</p>
<ul>
${stateComparison.map((s) => `<li>${s.code === state.state ? '<strong>' : ''}${s.name} — ${money0(s.takeHomeAnnual)} a year${s.code === state.state ? '</strong> (this page)' : ''}</li>`).join('\n')}
</ul>
<p>${state.name} is ${rank} of ${stateComparison.length}, ${rank === 1 ? 'the highest take-home of the group' : `${money0(stateComparison[0].takeHomeAnnual - stateComparison[rank - 1].takeHomeAnnual)} a year behind ${stateComparison[0].name}`}.</p>`,
          },
          {
            q: 'Why is my actual paycheck different from this?',
            a: `<p>Most often a W-4 that no longer matches your situation, a benefit deduction this page does not ask about, or a bonus period withheld at the flat supplemental rate. Year-to-date effects matter too: once you pass the Social Security wage base, that 6.2% stops and your later paychecks get larger.</p>`,
          },
        ];
      },

      content: (ctx) => {
        const { example, stateComparison } = ctx;
        const rank = stateComparison.findIndex((s) => s.code === state.state) + 1;
        return `
<h2>Take-home pay in ${state.name}</h2>

<p>${noTax
          ? `${state.name} is one of a handful of states with no personal income tax on wages. Your paycheck is reduced by federal income tax and FICA${example.annual.statePayroll > 0 ? `, plus a state payroll levy` : ''} — and nothing else at the state level.`
          : `${state.name} levies a ${state.method === 'flat' ? 'flat-rate' : 'progressive'} income tax on top of federal tax and FICA${example.annual.statePayroll > 0 ? `, and a separate payroll levy assessed on wages` : ''}.`}
Everything below is computed for ${state.name} specifically, at ${rates.federal.effective.slice(0, 4)} rates.</p>

<div class="formula">FICA wage base   = gross − Section 125 premiums − HSA        (NOT − 401k)
taxable wages    = gross − all pre-tax deductions incl. 401k
Social Security  = 6.20% × FICA wage base, up to the annual wage cap
Medicare         = 1.45% × FICA wage base, no cap
${noTax ? `${state.name} income  = none` : `${state.name} income  = ${state.method === 'flat' ? 'flat rate' : 'state brackets'} on state taxable wages`}</div>

<h2>A worked example</h2>

<div class="worked-example">
<h3>${money0(DEFAULTS.grossPay)} ${example.payFrequencyLabel.toLowerCase()} in ${state.name}</h3>
<div class="table-scroll">
<table>
<thead><tr><th scope="col">Line</th><th scope="col">Per period</th><th scope="col">Per year</th></tr></thead>
<tbody>
${example.lines.filter((l) => l.amount !== 0 || l.id === 'gross').map((l) => `<tr><td>${l.label}</td><td>${money2(l.amount)}</td><td>${money2(l.amount * example.periodsPerYear)}</td></tr>`).join('\n')}
<tr><td><strong>Take-home</strong></td><td><strong>${money2(example.totals.net)}</strong></td><td><strong>${money2(example.annual.takeHome)}</strong></td></tr>
</tbody>
</table>
</div>
<p>Effective tax rate ${(example.effectiveTaxRate * 100).toFixed(1)}%. The
${money2(example.annual.trad401k)} of 401(k) sits between gross and take-home but is not tax — it is
deferred, not spent. Tax alone is
${money2(example.annual.gross - example.annual.takeHome - example.annual.trad401k)}.</p>
</div>

<h2>${state.name} against the other states</h2>

<div class="table-scroll">
<table>
<thead><tr><th scope="col">State</th><th scope="col">State tax + payroll</th><th scope="col">Take-home per year</th></tr></thead>
<tbody>
${stateComparison.map((s) => `<tr${s.code === state.state ? ' data-best' : ''}><td>${s.code === state.state ? `<strong>${s.name}</strong>` : `<a href="/paycheck-calculator/${s.slug}/">${s.name}</a>`}</td><td>${money0(s.stateTaxAnnual)}</td><td>${money0(s.takeHomeAnnual)}</td></tr>`).join('\n')}
</tbody>
</table>
</div>

<p>${state.name} ranks ${rank} of ${stateComparison.length} for take-home on identical pay${rank === 1 ? '' : `, ${money0(stateComparison[0].takeHomeAnnual - stateComparison[rank - 1].takeHomeAnnual)} a year behind ${stateComparison[0].name}`}.
Take-home is only one side of a relocation decision — housing usually moves by a multiple of this gap,
and states without an income tax raise the money through property and sales taxes instead.</p>

${preTaxSection(ctx)}
${withholdingSection()}

<h2>Who this is for</h2>
<p>Anyone paid in ${state.name} checking a payslip, comparing an offer, or deciding what to put into a
401(k). The general <a href="/paycheck-calculator/">paycheck calculator</a> covers the same ground for
any of the five states this site models.</p>

${notAccountedFor(rates, state)}
${sourcesNote(rates)}
`;
      },
    };
  },
};
