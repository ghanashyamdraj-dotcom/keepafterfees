/**
 * paycheck.js — US take-home pay from gross wages.
 *
 * Models the annualised method that payroll systems actually use: take the
 * gross for one pay period, annualise it, compute annual tax, then divide back
 * down. That is why a bonus paycheck can look like it was taxed at a punitive
 * rate — annualising a large single period pushes it into higher brackets.
 *
 * Order of operations matters and is easy to get wrong:
 *   1. Pre-tax deductions (traditional 401k, HSA, Section 125 health premiums)
 *      come off before federal and state income tax.
 *   2. Health premiums under a Section 125 plan also come off before FICA.
 *      A 401(k) contribution does NOT — you pay Social Security and Medicare
 *      on money you defer into a traditional 401(k).
 *   3. Roth 401(k) contributions come out after all tax.
 */

import { nonNeg, num, round2 } from '../money.js';
import { result, invalid } from '../result.js';
import { federalIncomeTax, ficaOnWages, stateIncomeTax, statePayrollTaxes } from './tax.js';

const CALC = 'paycheck';

/**
 * @param {object} input
 * @param {number} input.grossPay         Gross pay for one period.
 * @param {string} input.payFrequency     weekly | biweekly | semimonthly | monthly | annual
 * @param {string} input.filingStatus
 * @param {number} input.dependents
 * @param {number} input.retirement401kPct  Traditional 401(k), percent of gross.
 * @param {number} input.roth401kPct        Roth 401(k), percent of gross.
 * @param {number} input.healthPremium      Per-period Section 125 health premium.
 * @param {number} input.hsaContribution    Per-period HSA contribution.
 * @param {number} input.otherPreTax        Other pre-tax deductions per period.
 * @param {number} input.otherPostTax       Post-tax deductions per period.
 * @param {number} input.extraWithholding   Extra federal withholding per period (W-4 line 4c).
 * @param {number} input.otherIncome        Other annual income (W-4 line 4a).
 * @param {number} input.deductionsW4       Annual deductions claimed (W-4 line 4b).
 * @param {boolean} input.multipleJobs      W-4 step 2 checkbox.
 * @param {string} input.stateCode
 * @param {boolean} input.isLocal           Subject to a local income tax.
 */
export function calculatePaycheck(input, federal, state = null) {
  const grossPay = nonNeg(input.grossPay);
  if (grossPay <= 0) return invalid(CALC, 'Enter your gross pay to see your take-home.');

  const freq = federal.payFrequencies.find((f) => f.id === input.payFrequency)
    ?? federal.payFrequencies.find((f) => f.id === 'biweekly');
  const periods = freq.perYear;

  const filingStatus = federal.brackets[input.filingStatus] ? input.filingStatus : 'single';
  const annualGross = round2(grossPay * periods);

  // --- Pre-tax deductions, per period then annualised ---
  const pct401k = Math.max(0, num(input.retirement401kPct, 0)) / 100;
  const pctRoth = Math.max(0, num(input.roth401kPct, 0)) / 100;

  let trad401k = round2(grossPay * pct401k);
  let roth401k = round2(grossPay * pctRoth);
  const healthPremium = nonNeg(input.healthPremium);
  const hsa = nonNeg(input.hsaContribution);
  const otherPreTax = nonNeg(input.otherPreTax);
  const otherPostTax = nonNeg(input.otherPostTax);

  // Cap 401(k) at the annual elective limit.
  const annual401k = round2((trad401k + roth401k) * periods);
  const limit = federal.retirement.elective401kLimit;
  let cappedNote = null;
  if (annual401k > limit) {
    const scale = limit / annual401k;
    trad401k = round2(trad401k * scale);
    roth401k = round2(roth401k * scale);
    cappedNote = `Your contribution rate would exceed the $${limit.toLocaleString('en-US')} annual elective deferral limit. The figures below are capped at the limit.`;
  }

  // Section 125 health premiums and HSA reduce FICA wages; 401(k) does not.
  const ficaWagesPeriod = round2(grossPay - healthPremium - hsa);
  const incomeTaxWagesPeriod = round2(grossPay - trad401k - healthPremium - hsa - otherPreTax);

  const annualFicaWages = round2(ficaWagesPeriod * periods);
  const annualTaxableWages = round2(incomeTaxWagesPeriod * periods);

  // --- Federal income tax, annualised ---
  // W-4 line 4a adds other income; 4b subtracts deductions; step 2 roughly
  // doubles the effect of the standard deduction being split across two jobs.
  const w4OtherIncome = nonNeg(input.otherIncome);
  const w4Deductions = nonNeg(input.deductionsW4);

  let federalBase = round2(annualTaxableWages + w4OtherIncome);
  const fed = federalIncomeTax(federalBase, filingStatus, federal, {
    itemizedDeductions: w4Deductions,
    aboveLineDeductions: 0,
  });

  let annualFederalTax = fed.tax;
  if (input.multipleJobs) {
    // The W-4 step 2 checkbox halves the deduction and bracket widths in the
    // IRS tables. Approximated here by taxing without the standard deduction.
    const noDeduction = federalIncomeTax(federalBase, filingStatus, federal, {
      itemizedDeductions: 0, aboveLineDeductions: 0,
    });
    annualFederalTax = round2((fed.tax + noDeduction.tax) / 2);
  }

  const extraWithholding = nonNeg(input.extraWithholding);
  const federalPerPeriod = round2(annualFederalTax / periods + extraWithholding);

  // --- FICA ---
  const annualFica = ficaOnWages(annualFicaWages, filingStatus, federal);
  const ficaPerPeriod = {
    socialSecurity: round2(annualFica.socialSecurity / periods),
    medicare: round2(annualFica.medicare / periods),
    additionalMedicare: round2(annualFica.additionalMedicare / periods),
  };

  // --- State ---
  const st = stateIncomeTax(annualTaxableWages, filingStatus, state, {
    dependents: num(input.dependents, 0),
    isLocal: Boolean(input.isLocal),
    localId: input.localId ?? null,
  });
  const statePayroll = statePayrollTaxes(annualFicaWages, state);

  const statePerPeriod = round2(st.total / periods);
  const statePayrollPerPeriod = round2(statePayroll.total / periods);

  const r = result({ calculator: CALC, rates: federal })
    .inputs(input)
    .revenue('gross', `Gross pay (${freq.label.toLowerCase()})`, grossPay)
    .cost('trad-401k', `Traditional 401(k) (${(pct401k * 100).toFixed(1)}%)`, trad401k, 'Pre-tax for income tax, but still subject to Social Security and Medicare.')
    .cost('health', 'Health premium (pre-tax)', healthPremium, 'Section 125 premiums reduce both income tax and FICA wages.')
    .cost('hsa', 'HSA contribution', hsa)
    .cost('other-pretax', 'Other pre-tax deductions', otherPreTax)
    .tax('federal', 'Federal income tax', federalPerPeriod)
    .tax('social-security', `Social Security (${(federal.fica.socialSecurity.employeeRate * 100).toFixed(2)}%)`, ficaPerPeriod.socialSecurity)
    .tax('medicare', `Medicare (${(federal.fica.medicare.employeeRate * 100).toFixed(2)}%)`, ficaPerPeriod.medicare)
    .tax('addl-medicare', 'Additional Medicare (0.9%)', ficaPerPeriod.additionalMedicare)
    .tax('state', state && state.hasIncomeTax ? `${state.name} income tax` : 'State income tax', statePerPeriod)
    .cost('roth-401k', `Roth 401(k) (${(pctRoth * 100).toFixed(1)}%)`, roth401k, 'Post-tax — comes out after everything else.')
    .cost('other-posttax', 'Other post-tax deductions', otherPostTax);

  for (const item of statePayroll.items) {
    r.tax(item.id, item.label, round2(item.amount / periods), item.note);
  }

  const built = r.build();

  built.annual = {
    gross: annualGross,
    federal: annualFederalTax + extraWithholding * periods,
    socialSecurity: annualFica.socialSecurity,
    medicare: round2(annualFica.medicare + annualFica.additionalMedicare),
    state: st.total,
    statePayroll: statePayroll.total,
    trad401k: round2(trad401k * periods),
    roth401k: round2(roth401k * periods),
    takeHome: round2(built.totals.net * periods),
  };
  built.periodsPerYear = periods;
  built.payFrequencyLabel = freq.label;
  built.federalDetail = fed;
  built.stateDetail = st;
  built.ficaDetail = annualFica;
  built.effectiveTaxRate = annualGross > 0
    ? round2(built.annual.federal + built.annual.socialSecurity + built.annual.medicare + built.annual.state + built.annual.statePayroll) / annualGross
    : 0;
  built.stateName = state?.name ?? null;

  if (cappedNote) built.warnings.push(cappedNote);
  if (state && state.hasIncomeTax === false) {
    built.notes.push(`${state.name} has no state income tax, so the state line is $0. You still owe federal income tax and FICA.`);
  }
  if (annualFica.hitWageBase) {
    built.notes.push(`Your annual wages exceed the $${federal.fica.socialSecurity.wageBase.toLocaleString('en-US')} Social Security wage base. Once you pass it, your take-home per paycheck rises by 6.2% of the amount above it for the rest of the year.`);
  }
  if (state?.notes?.length) built.stateNotes = state.notes;

  return built;
}

/** Compare identical gross pay across every state we have data for. */
export function compareStates(input, federal, states) {
  return states.map((state) => {
    const r = calculatePaycheck({ ...input, stateCode: state.state }, federal, state);
    return {
      code: state.state,
      name: state.name,
      slug: state.slug,
      takeHomePerPeriod: r.ok ? r.totals.net : null,
      takeHomeAnnual: r.ok ? r.annual.takeHome : null,
      stateTaxAnnual: r.ok ? round2(r.annual.state + r.annual.statePayroll) : null,
      effectiveRate: r.ok ? r.effectiveTaxRate : null,
    };
  }).sort((a, b) => (b.takeHomeAnnual ?? 0) - (a.takeHomeAnnual ?? 0));
}
