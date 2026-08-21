/**
 * freelance.js — hourly rate, day rate, and invoice-to-take-home.
 *
 * The mistake this exists to prevent: dividing a target salary by 2,080 hours.
 * That number assumes every working hour is billable and that you owe no
 * self-employment tax, no business expenses, and take no holiday. A freelancer
 * who bills 25 hours a week for 46 weeks has 1,150 billable hours, not 2,080 —
 * so the honest rate is roughly double what the naive division produces, before
 * tax is even considered.
 *
 * Worked through properly the chain is:
 *   target take-home -> add tax -> add expenses -> divide by BILLABLE hours
 */

import { nonNeg, num, round2 } from '../money.js';
import { result, invalid } from '../result.js';
import { federalIncomeTax, selfEmploymentTax, stateIncomeTax } from './tax.js';
// Payroll model, used only by salaryEquivalent() below to price a freelance
// take-home as a W-2 salary. tax.js is the shared base of both, so this adds
// no cycle.
import { calculatePaycheck } from './paycheck.js';

const HOURLY = 'freelance-hourly-rate';
const INVOICE = 'invoice-take-home';

/**
 * Required hourly rate to hit a target take-home.
 *
 * @param {object} input
 * @param {number} input.targetIncome     Take-home you want, after tax.
 * @param {boolean} input.targetIsPreTax  Treat targetIncome as pre-tax profit instead.
 * @param {number} input.billableHoursPerWeek
 * @param {number} input.weeksOff         Holiday + sick + admin weeks per year.
 * @param {number} input.businessExpenses Annual business expenses.
 * @param {number} input.healthInsurance  Annual premiums you pay yourself.
 * @param {number} input.retirementTarget Annual retirement contribution target.
 * @param {number} input.nonBillableRate  Share of working time that is unbillable (0-1).
 * @param {string} input.filingStatus
 * @param {string} input.stateCode
 */
export function calculateHourlyRate(input, federal, state = null) {
  const targetIncome = nonNeg(input.targetIncome);
  if (targetIncome <= 0) return invalid(HOURLY, 'Enter the take-home income you are aiming for.');

  const billableHoursPerWeek = Math.max(1, num(input.billableHoursPerWeek, 25));
  const weeksOff = Math.min(51, Math.max(0, num(input.weeksOff, 6)));
  const workingWeeks = 52 - weeksOff;
  const billableHours = round2(billableHoursPerWeek * workingWeeks);

  const expenses = nonNeg(input.businessExpenses);
  const healthInsurance = nonNeg(input.healthInsurance);
  const retirement = nonNeg(input.retirementTarget);
  const filingStatus = federal.brackets[input.filingStatus] ? input.filingStatus : 'single';

  // Solve for the gross revenue that leaves `targetIncome` after tax, expenses,
  // health insurance, and retirement. Bisection, because the tax function has
  // brackets, a wage base cliff, and a QBI interaction.
  const requiredRevenue = input.targetIsPreTax
    ? round2(targetIncome + expenses + healthInsurance + retirement)
    : solveRevenueForTakeHome({
        targetIncome, expenses, healthInsurance, retirement, filingStatus, federal, state,
      });

  if (requiredRevenue === null) {
    return invalid(HOURLY, 'That target is not reachable with the inputs given. Try lowering the target or raising billable hours.');
  }

  const hourlyRate = round2(requiredRevenue / billableHours);
  const dayRate = round2(hourlyRate * 8);
  const weekRate = round2(hourlyRate * billableHoursPerWeek);

  const netBusiness = round2(requiredRevenue - expenses);
  const se = selfEmploymentTax(netBusiness, filingStatus, federal);
  const fed = federalIncomeTax(netBusiness, filingStatus, federal, {
    aboveLineDeductions: round2(se.deductibleHalf + healthInsurance + retirement),
  });
  const st = state
    ? stateIncomeTax(round2(netBusiness - se.deductibleHalf), filingStatus, state, { dependents: num(input.dependents, 0) })
    : { total: 0, hasIncomeTax: false };

  const naiveRate = round2(targetIncome / 2080);

  const r = result({ calculator: HOURLY, rates: federal })
    .inputs(input)
    .revenue('required-revenue', 'Revenue you need to bill', requiredRevenue)
    .cost('expenses', 'Business expenses', expenses)
    .cost('health', 'Health insurance', healthInsurance)
    .cost('retirement', 'Retirement contributions', retirement)
    .tax('se-tax', 'Self-employment tax', se.total)
    .tax('federal', 'Federal income tax', fed.tax)
    .tax('state', state && state.hasIncomeTax ? `${state.name} income tax` : 'State income tax', st.total)
    .info('hourly', 'Hourly rate', `$${hourlyRate.toFixed(2)}`)
    .info('day', 'Day rate (8h)', `$${dayRate.toFixed(2)}`)
    .info('week', 'Weekly rate', `$${weekRate.toFixed(2)}`)
    .info('billable-hours', 'Billable hours per year', `${billableHours.toFixed(0)}`,
      `${billableHoursPerWeek} billable hours x ${workingWeeks} working weeks.`)
    .extra({
      hourlyRate, dayRate, weekRate,
      billableHours, workingWeeks, requiredRevenue,
      naiveRate,
      naiveShortfall: round2(hourlyRate - naiveRate),
      se, federal: fed, state: st,
      utilisation: round2(billableHours / (workingWeeks * 40)),
      projectMinimums: {
        halfDay: round2(dayRate / 2),
        day: dayRate,
        week: weekRate,
        month: round2(weekRate * 4),
      },
    });

  r.note(`Dividing $${targetIncome.toLocaleString('en-US')} by the usual 2,080 hours gives $${naiveRate.toFixed(2)}/hour. That figure is short by $${round2(hourlyRate - naiveRate).toFixed(2)} because it counts hours you cannot bill and ignores self-employment tax entirely.`);

  const utilisation = billableHours / (workingWeeks * 40);
  if (utilisation > 0.8) {
    r.warn(`You are assuming ${(utilisation * 100).toFixed(0)}% billable utilisation. Sustained rates above 70% are rare — sales, admin, invoicing, and unpaid revisions all consume working hours. Consider modelling fewer billable hours.`);
  }
  if (healthInsurance === 0) {
    r.warn('You have not budgeted for health insurance. A self-employed person buying their own cover in the US typically pays $6,000-$12,000 a year, which has to come out of your rate.');
  }

  return r.build();
}

/**
 * The W-2 salary that leaves the same money in your pocket as a given
 * freelance take-home.
 *
 * This is the comparison every freelancer actually wants and almost no rate
 * calculator makes, because it needs a payroll model as well as a
 * self-employment one. The two differ in ways that do not cancel out:
 *
 *   - FICA. An employee pays 7.65%; the self-employed pay both halves at
 *     15.3% on 92.35% of net earnings. Half is deductible, which recovers
 *     some but not all of the gap.
 *   - Benefits. Employer health premiums and any match are compensation that
 *     never appears in the salary figure.
 *   - State payroll levies. CA SDI is withheld from wages and is not charged
 *     on self-employment income unless you elect into coverage.
 *
 * Solved by bisection on gross salary rather than algebraically, for the same
 * reason solveRevenueForTakeHome is: brackets, the wage base, and the
 * pre-tax deductions interact.
 *
 * @param {number} targetTakeHome  Money in your pocket after tax and benefits.
 * @param {object} opts
 * @param {number} opts.healthInsurance  Annual premium the EMPLOYEE pays. Pass 0
 *   to model an employer that covers the whole premium.
 * @param {number} opts.retirement       Annual pre-tax retirement contribution.
 * @returns {number|null} Required annual gross salary, or null if unreachable.
 */
export function salaryEquivalent(targetTakeHome, opts, federal, state = null) {
  const target = nonNeg(targetTakeHome);
  if (target <= 0) return null;
  const filingStatus = federal.brackets[opts.filingStatus] ? opts.filingStatus : 'single';
  const healthPremium = nonNeg(opts.healthInsurance);
  const otherPreTax = nonNeg(opts.retirement);

  const takeHomeAt = (grossPay) => {
    const r = calculatePaycheck(
      { grossPay, payFrequency: 'annual', filingStatus, stateCode: opts.stateCode,
        dependents: num(opts.dependents, 0), healthPremium, otherPreTax },
      federal, state
    );
    return r.ok ? r.totals.net : -Infinity;
  };

  let lo = 0;
  let hi = Math.max(10000, (target + healthPremium + otherPreTax) * 4);
  if (takeHomeAt(hi) < target) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    if (takeHomeAt(mid) < target) lo = mid;
    else hi = mid;
  }
  return round2(Math.ceil(hi));
}

function solveRevenueForTakeHome({ targetIncome, expenses, healthInsurance, retirement, filingStatus, federal, state }) {
  const takeHomeAt = (revenue) => {
    const netBusiness = Math.max(0, revenue - expenses);
    const se = selfEmploymentTax(netBusiness, filingStatus, federal);
    const fed = federalIncomeTax(netBusiness, filingStatus, federal, {
      aboveLineDeductions: round2(se.deductibleHalf + healthInsurance + retirement),
    });
    const st = state
      ? stateIncomeTax(Math.max(0, netBusiness - se.deductibleHalf), filingStatus, state, {})
      : { total: 0 };
    return netBusiness - se.total - fed.tax - st.total - healthInsurance - retirement;
  };

  let lo = 0;
  let hi = Math.max(1000, (targetIncome + expenses + healthInsurance + retirement) * 4);
  if (takeHomeAt(hi) < targetIncome) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    if (takeHomeAt(mid) < targetIncome) lo = mid;
    else hi = mid;
  }
  return round2(Math.ceil(hi));
}

/**
 * Day rate from an hourly rate, or the reverse, with project minimums.
 * Kept separate because /day-rate-calculator/ targets a different query.
 */
export function calculateDayRate(input, federal, state = null) {
  const mode = input.mode === 'fromDayRate' ? 'fromDayRate' : 'fromTarget';

  if (mode === 'fromDayRate') {
    const dayRate = nonNeg(input.dayRate);
    if (dayRate <= 0) return invalid('day-rate', 'Enter a day rate to see what it earns you across a year.');

    const daysPerWeek = Math.max(0.5, num(input.billableDaysPerWeek, 3));
    const weeksOff = Math.min(51, Math.max(0, num(input.weeksOff, 6)));
    const workingWeeks = 52 - weeksOff;
    const billableDays = round2(daysPerWeek * workingWeeks);
    const revenue = round2(dayRate * billableDays);

    const r = calculateInvoiceTakeHome(
      { invoiceAmount: revenue, businessExpenses: input.businessExpenses, filingStatus: input.filingStatus, annual: true },
      federal, state
    );

    // The rate fields the 'day-rate' registry entry reads for its headline and
    // stats. Without them this branch returned a bare invoice result, so the
    // page showed ANNUAL TAKE-HOME under the label "Your day rate" and two
    // empty stats — the day rate is an input here, not something to solve for,
    // but it still has to come back out for the result card to make sense.
    if (r.ok) {
      r.dayRate = dayRate;
      r.hourlyRate = round2(dayRate / 8);
      r.weekRate = round2(dayRate * daysPerWeek);
      r.billableDays = billableDays;
      r.workingWeeks = workingWeeks;
      r.annualRevenue = revenue;
    }
    return r;
  }

  const hourly = calculateHourlyRate(input, federal, state);
  return hourly;
}

/**
 * Invoice-to-take-home: what a single invoice, or a year of them, leaves you.
 *
 * @param {object} input
 * @param {number} input.invoiceAmount    Amount on the invoice.
 * @param {boolean} input.annual          Treat the amount as annual income.
 * @param {number} input.businessExpenses Annual deductible expenses.
 * @param {number} input.otherIncome      Other annual income already earned.
 * @param {string} input.processorId      Payment processor taking a cut, if any.
 * @param {string} input.productId
 * @param {string} input.filingStatus
 */
export function calculateInvoiceTakeHome(input, federal, state = null, processorRates = null) {
  const invoiceAmount = nonNeg(input.invoiceAmount);
  if (invoiceAmount <= 0) return invalid(INVOICE, 'Enter an invoice amount to see what you keep.');

  const filingStatus = federal.brackets[input.filingStatus] ? input.filingStatus : 'single';
  const expenses = nonNeg(input.businessExpenses);
  const otherIncome = nonNeg(input.otherIncome);

  // Payment processing comes off before anything else.
  let processingFee = 0;
  let processorLabel = null;
  if (processorRates && input.processorId && input.processorId !== 'none') {
    const proc = processorRates[input.processorId];
    const product = proc?.products.find((p) => p.id === input.productId) ?? proc?.products[0];
    if (product) {
      processingFee = round2(invoiceAmount * product.rate + product.fixed);
      processorLabel = `${proc.label} — ${product.label}`;
    }
  }

  const received = round2(invoiceAmount - processingFee);

  // Annualise a single invoice so the marginal rate is realistic.
  const annualIncome = input.annual ? received + otherIncome : received + otherIncome;
  const netBusiness = round2(Math.max(0, annualIncome - expenses));

  const se = selfEmploymentTax(netBusiness, filingStatus, federal);
  const fed = federalIncomeTax(netBusiness, filingStatus, federal, {
    aboveLineDeductions: se.deductibleHalf,
  });
  const st = state
    ? stateIncomeTax(round2(netBusiness - se.deductibleHalf), filingStatus, state, { dependents: num(input.dependents, 0) })
    : { total: 0, hasIncomeTax: false };

  const totalTax = round2(se.total + fed.tax + st.total);

  // For a single invoice, apportion tax at the marginal rate rather than the
  // average — the next dollar earned is taxed at the margin, not the average.
  const marginalTotal = round2(fed.marginalRate + (st.marginalRate ?? 0)
    + (se.hitWageBase ? federal.selfEmployment.medicareRate : federal.selfEmployment.socialSecurityRate + federal.selfEmployment.medicareRate)
      * federal.selfEmployment.netEarningsFactor);

  const invoiceTax = input.annual ? totalTax : round2(received * marginalTotal);
  const takeHome = round2(received - invoiceTax);

  const r = result({ calculator: INVOICE, rates: federal })
    .inputs(input)
    .revenue('invoice', input.annual ? 'Annual invoiced revenue' : 'Invoice amount', invoiceAmount)
    .fee('processing', processorLabel ?? 'Payment processing', processingFee)
    .cost('expenses', 'Business expenses', input.annual ? expenses : 0)
    .tax('taxes', input.annual ? 'Total tax (SE + federal + state)' : `Tax set aside at your ${(marginalTotal * 100).toFixed(1)}% marginal rate`, invoiceTax)
    .info('set-aside', 'Set aside for tax', `$${invoiceTax.toFixed(2)}`, 'Move this to a separate account the day the invoice clears.')
    .info('marginal', 'Combined marginal rate', `${(marginalTotal * 100).toFixed(1)}%`,
      'Self-employment tax plus your federal and state marginal income tax rates. This is what the next dollar costs you.')
    .extra({
      received, takeHome, totalTax, invoiceTax,
      marginalRate: marginalTotal,
      se, federal: fed, state: st,
      setAsidePercent: received > 0 ? invoiceTax / received : 0,
    });

  if (!input.annual) {
    r.note(`This apportions tax at your marginal rate, which is the right way to think about one invoice on top of income you already have. Tick "annual" to see the full-year picture instead.`);
  }
  if (se.hitWageBase) {
    r.note('You have passed the Social Security wage base for the year, so this invoice is charged 2.9% Medicare instead of the full 15.3% self-employment rate.');
  }

  return r.build();
}
