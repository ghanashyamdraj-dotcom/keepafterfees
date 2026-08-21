/**
 * setax.js — 1099 self-employment tax estimator with a quarterly schedule.
 *
 * What makes this different from a generic tax calculator: it produces the
 * four payment dates and amounts you actually need, and it checks them against
 * the IRS safe harbour. Most people who get hit with an underpayment penalty
 * did not underpay their total tax — they paid the right total on the wrong
 * schedule, or they did not realise the quarters are unequal.
 *
 * The quarters are not equal calendar quarters. Q2 covers two months
 * (April-May) and Q3 covers three (June-August). Anyone dividing their annual
 * estimate by four and paying on those dates is fine; anyone estimating
 * quarter by quarter from actual income needs the real period boundaries.
 */

import { nonNeg, num, round2 } from '../money.js';
import { result, invalid } from '../result.js';
import { federalIncomeTax, qbiDeduction, selfEmploymentTax, stateIncomeTax } from './tax.js';

const CALC = 'self-employment-tax';

/**
 * @param {object} input
 * @param {number} input.grossRevenue       Total 1099 / business income.
 * @param {number} input.businessExpenses   Deductible business expenses.
 * @param {string} input.filingStatus
 * @param {number} input.w2Wages            Wages from a job, if any.
 * @param {number} input.w2Withheld         Federal tax already withheld from that job.
 * @param {number} input.spouseIncome       Spouse's income when filing jointly.
 * @param {number} input.itemizedDeductions
 * @param {number} input.retirementContrib  Solo 401(k) / SEP contributions.
 * @param {number} input.healthInsurance    Self-employed health insurance premiums.
 * @param {number} input.paymentsMade       Estimated tax already paid this year.
 * @param {number} input.priorYearTax       Last year's total tax, for safe harbour.
 * @param {number} input.priorYearAgi       Last year's AGI, for the 110% rule.
 * @param {string} input.stateCode          Two-letter state code, or null.
 * @param {boolean} input.claimQbi
 */
export function calculateSelfEmploymentTax(input, federal, state = null) {
  const grossRevenue = nonNeg(input.grossRevenue);
  if (grossRevenue <= 0) return invalid(CALC, 'Enter your total 1099 or business income to estimate your tax.');

  const filingStatus = federal.brackets[input.filingStatus] ? input.filingStatus : 'single';
  const expenses = nonNeg(input.businessExpenses);
  const w2Wages = nonNeg(input.w2Wages);
  const spouseIncome = filingStatus === 'married_joint' ? nonNeg(input.spouseIncome) : 0;
  const retirement = nonNeg(input.retirementContrib);
  const healthInsurance = nonNeg(input.healthInsurance);

  const netBusinessIncome = round2(Math.max(0, grossRevenue - expenses));

  // 1. Self-employment tax comes first — it is not affected by deductions
  //    other than business expenses.
  const se = selfEmploymentTax(netBusinessIncome, filingStatus, federal, { w2Wages });

  // 2. Above-the-line deductions that reduce AGI.
  const aboveLine = round2(se.deductibleHalf + retirement + healthInsurance);

  // 3. Federal income tax on everything.
  const totalIncome = round2(netBusinessIncome + w2Wages + spouseIncome);
  const fed = federalIncomeTax(totalIncome, filingStatus, federal, {
    itemizedDeductions: nonNeg(input.itemizedDeductions),
    aboveLineDeductions: aboveLine,
  });

  // 4. QBI deduction, applied after the standard/itemized deduction.
  let qbi = { amount: 0, status: 'none', note: null };
  let taxableAfterQbi = fed.taxableIncome;
  let incomeTax = fed.tax;

  if (input.claimQbi !== false && netBusinessIncome > 0) {
    const qualified = round2(Math.max(0, netBusinessIncome - se.deductibleHalf - retirement - healthInsurance));
    qbi = qbiDeduction(qualified, fed.taxableIncome, filingStatus, federal);
    taxableAfterQbi = round2(Math.max(0, fed.taxableIncome - qbi.amount));
    const recomputed = federalIncomeTax(
      totalIncome, filingStatus, federal,
      { itemizedDeductions: nonNeg(input.itemizedDeductions), aboveLineDeductions: round2(aboveLine + qbi.amount) }
    );
    incomeTax = recomputed.tax;
  }

  // 5. State tax. Most states do not conform to QBI, so it uses pre-QBI income.
  const st = state
    ? stateIncomeTax(round2(totalIncome - aboveLine), filingStatus, state, {
        dependents: num(input.dependents, 0),
        isLocal: Boolean(input.isLocal),
        localId: input.localId ?? null,
      })
    : { total: 0, hasIncomeTax: false, taxableIncome: 0, marginalRate: 0 };

  const totalTax = round2(se.total + incomeTax + st.total);
  const alreadyPaid = round2(nonNeg(input.paymentsMade) + nonNeg(input.w2Withheld));
  const stillOwed = round2(totalTax - alreadyPaid);

  const r = result({ calculator: CALC, rates: federal })
    .inputs(input)
    .revenue('gross', '1099 / business income', grossRevenue)
    .revenue('w2', 'W-2 wages', w2Wages)
    .revenue('spouse', 'Spouse income', spouseIncome)
    .cost('expenses', 'Business expenses', expenses)
    .tax('se-ss', `Self-employment tax — Social Security (${(federal.selfEmployment.socialSecurityRate * 100).toFixed(1)}%)`, se.socialSecurity)
    .tax('se-medicare', `Self-employment tax — Medicare (${(federal.selfEmployment.medicareRate * 100).toFixed(1)}%)`, se.medicare)
    .tax('se-addl-medicare', 'Additional Medicare tax (0.9%)', se.additionalMedicare)
    .tax('federal-income', 'Federal income tax', incomeTax)
    .tax('state-income', state ? `${state.name} income tax` : 'State income tax', st.total)
    .info('net-business', 'Net business income', `$${netBusinessIncome.toFixed(2)}`, 'Gross revenue minus deductible business expenses. This is what SE tax is calculated on.')
    .info('se-base', 'SE tax base (92.35%)', `$${se.taxableBase.toFixed(2)}`, federal.selfEmployment.note)
    .info('half-se-deduction', 'Deductible half of SE tax', `$${se.deductibleHalf.toFixed(2)}`, 'Reduces your income tax, not your SE tax.')
    .info('qbi', 'QBI deduction', `$${qbi.amount.toFixed(2)}`, qbi.note ?? 'Section 199A deduction of 20% of qualified business income.')
    .info('marginal', 'Federal marginal rate', `${(fed.marginalRate * 100).toFixed(0)}%`)
    .info('total-tax', 'Total tax owed', `$${totalTax.toFixed(2)}`)
    .extra({
      se, state: st, qbi,
      // `federal` is the pre-QBI detail (AGI, deduction, marginal rate).
      // `incomeTax` is what is actually owed, after the QBI deduction — the
      // two differ whenever QBI applies, so both are exposed by name rather
      // than leaving a caller to guess which one reconciles with totalTax.
      federal: fed,
      incomeTax,
      netBusinessIncome, totalTax, alreadyPaid, stillOwed,
      quarterly: quarterlySchedule({ totalTax, alreadyPaid, input, federal }),
      effectiveTaxRate: grossRevenue > 0 ? totalTax / grossRevenue : 0,
      trueTakeHome: round2(grossRevenue - expenses - totalTax),
    });

  if (se.hitWageBase) {
    r.note(`Your earnings passed the $${federal.fica.socialSecurity.wageBase.toLocaleString('en-US')} Social Security wage base. Income above that point is charged 2.9% Medicare instead of the full 15.3%.`);
  }
  if (qbi.status === 'phase-in' || qbi.status === 'above-threshold') {
    r.warn(qbi.note);
  }
  if (expenses === 0 && grossRevenue > 5000) {
    r.warn('You have entered no business expenses. Home office, mileage, software, and equipment are all deductible and directly reduce both your income tax and your self-employment tax.');
  }
  if (retirement === 0 && netBusinessIncome > 30000) {
    const room = Math.min(federal.retirement.elective401kLimit, round2(netBusinessIncome * 0.2));
    r.note(`A solo 401(k) would let you contribute roughly $${room.toLocaleString('en-US', { maximumFractionDigits: 0 })} at this income level, cutting your federal income tax by about $${round2(room * fed.marginalRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}.`);
  }

  return r.build();
}

/** Four dated payments plus the safe-harbour check. */
export function quarterlySchedule({ totalTax, alreadyPaid, input, federal }) {
  const est = federal.estimatedTax;
  const priorYearTax = nonNeg(input.priorYearTax);
  const priorYearAgi = nonNeg(input.priorYearAgi);

  const multiplier = priorYearAgi > est.highIncomeThreshold
    ? est.safeHarborPriorYearHighIncome
    : est.safeHarborPriorYear;

  const safeHarborPrior = priorYearTax > 0 ? round2(priorYearTax * multiplier) : null;
  const safeHarborCurrent = round2(totalTax * est.safeHarborCurrentYear);

  const required = safeHarborPrior !== null
    ? Math.min(safeHarborPrior, safeHarborCurrent)
    : safeHarborCurrent;

  const remaining = round2(Math.max(0, required - alreadyPaid));
  const perQuarter = round2(remaining / 4);

  const payments = est.dueDates.map((d, i) => ({
    quarter: d.quarter,
    period: d.period,
    due: d.due,
    amount: i === 3 ? round2(remaining - perQuarter * 3) : perQuarter,
  }));

  return {
    required,
    remaining,
    perQuarter,
    payments,
    safeHarborPrior,
    safeHarborCurrent,
    safeHarborMultiplier: multiplier,
    usingPriorYear: safeHarborPrior !== null && safeHarborPrior < safeHarborCurrent,
    underpaymentThreshold: est.underpaymentThreshold,
    note: est.note,
    explanation: safeHarborPrior !== null && safeHarborPrior < safeHarborCurrent
      ? `Paying ${(multiplier * 100).toFixed(0)}% of last year's $${priorYearTax.toLocaleString('en-US')} tax bill is the cheaper safe harbour. Pay $${required.toLocaleString('en-US')} across the year and no underpayment penalty applies, even if you end up owing more.`
      : `With no prior-year figure to work from, the target is 90% of this year's estimated $${totalTax.toLocaleString('en-US')} tax.`,
  };
}
