/**
 * tax.js — shared US tax primitives.
 *
 * Federal income tax, FICA, and state income tax all reduce to the same
 * operation: apply a marginal bracket schedule to a taxable base. This module
 * holds that operation once, so /paycheck-calculator/, /self-employment-tax-
 * calculator/, and /invoice-take-home-calculator/ cannot disagree with each
 * other about what a given income owes.
 *
 * Everything here is an ESTIMATE. It models the common case — standard
 * deduction, one income source, no credits beyond the ones named. It is not a
 * tax return and the pages that use it say so.
 */

import { nonNeg, num, round2, tieredCents, toCents, toDollars } from '../money.js';

/** Progressive income tax on a taxable amount. Returns dollars. */
export function bracketTax(taxableIncome, brackets) {
  const base = Math.max(0, taxableIncome);
  return toDollars(tieredCents(toCents(base), brackets, 'marginal'));
}

/** The marginal rate that applies to the next dollar of income. */
export function marginalRate(taxableIncome, brackets) {
  const base = Math.max(0, taxableIncome);
  for (const tier of brackets) {
    if (tier.upTo === null || base <= tier.upTo) return tier.rate;
  }
  return brackets.at(-1).rate;
}

/** Federal income tax from gross income, applying the standard deduction. */
export function federalIncomeTax(grossIncome, filingStatus, federal, {
  itemizedDeductions = 0,
  aboveLineDeductions = 0,
  age65OrOlder = false,
  blind = false,
} = {}) {
  const status = federal.brackets[filingStatus] ? filingStatus : 'single';

  let standard = federal.standardDeduction[status];
  const extra = federal.standardDeduction.additionalAge65OrBlind[status] ?? 0;
  if (age65OrOlder) standard += extra;
  if (blind) standard += extra;

  const deduction = Math.max(standard, nonNeg(itemizedDeductions));
  const agi = Math.max(0, grossIncome - nonNeg(aboveLineDeductions));
  const taxableIncome = Math.max(0, agi - deduction);
  const tax = bracketTax(taxableIncome, federal.brackets[status]);

  return {
    agi: round2(agi),
    deduction: round2(deduction),
    deductionType: nonNeg(itemizedDeductions) > standard ? 'itemized' : 'standard',
    taxableIncome: round2(taxableIncome),
    tax: round2(tax),
    marginalRate: marginalRate(taxableIncome, federal.brackets[status]),
    effectiveRate: grossIncome > 0 ? tax / grossIncome : 0,
  };
}

/** Employee-side FICA on W-2 wages. */
export function ficaOnWages(wages, filingStatus, federal, { ytdWages = 0 } = {}) {
  const w = Math.max(0, wages);
  const { socialSecurity, medicare } = federal.fica;

  // Social Security stops at the wage base, counting wages already paid this year.
  const ssRemaining = Math.max(0, socialSecurity.wageBase - Math.max(0, ytdWages));
  const ssTaxable = Math.min(w, ssRemaining);
  const ss = toDollars(toCents(ssTaxable * socialSecurity.employeeRate));

  const med = toDollars(toCents(w * medicare.employeeRate));

  const threshold = medicare.additionalThreshold[filingStatus] ?? medicare.additionalThreshold.single;
  const totalWages = w + Math.max(0, ytdWages);
  const overThreshold = Math.max(0, Math.min(w, totalWages - threshold));
  const additionalMedicare = toDollars(toCents(overThreshold * medicare.additionalRate));

  return {
    socialSecurity: round2(ss),
    socialSecurityTaxableWages: round2(ssTaxable),
    medicare: round2(med),
    additionalMedicare: round2(additionalMedicare),
    total: round2(ss + med + additionalMedicare),
    hitWageBase: w > ssRemaining,
  };
}

/**
 * Self-employment tax on net business earnings.
 *
 * The 92.35% factor is not arbitrary: it removes the employer half of FICA
 * from the base, mirroring the fact that a W-2 worker's employer pays 7.65%
 * that never appears in the worker's gross pay.
 */
export function selfEmploymentTax(netEarnings, filingStatus, federal, { w2Wages = 0 } = {}) {
  const se = federal.selfEmployment;
  const net = Math.max(0, netEarnings);

  const taxableBase = round2(net * se.netEarningsFactor);

  if (taxableBase < se.filingThreshold) {
    return {
      netEarnings: round2(net),
      taxableBase,
      socialSecurity: 0,
      medicare: 0,
      additionalMedicare: 0,
      total: 0,
      deductibleHalf: 0,
      belowThreshold: true,
      thresholdNote: `Net earnings under $${se.filingThreshold} do not trigger self-employment tax.`,
    };
  }

  // W-2 wages consume the Social Security wage base first.
  const wageBase = federal.fica.socialSecurity.wageBase;
  const ssRemaining = Math.max(0, wageBase - Math.max(0, w2Wages));
  const ssTaxable = Math.min(taxableBase, ssRemaining);
  const ss = toDollars(toCents(ssTaxable * se.socialSecurityRate));

  const med = toDollars(toCents(taxableBase * se.medicareRate));

  const threshold = federal.fica.medicare.additionalThreshold[filingStatus]
    ?? federal.fica.medicare.additionalThreshold.single;
  const combined = taxableBase + Math.max(0, w2Wages);
  const overThreshold = Math.max(0, Math.min(taxableBase, combined - threshold));
  const additionalMedicare = toDollars(toCents(overThreshold * se.additionalMedicareRate));

  const total = round2(ss + med + additionalMedicare);

  return {
    netEarnings: round2(net),
    taxableBase,
    socialSecurity: round2(ss),
    socialSecurityTaxableBase: round2(ssTaxable),
    medicare: round2(med),
    additionalMedicare: round2(additionalMedicare),
    total,
    // The additional Medicare tax is not deductible; only the regular SE tax is.
    deductibleHalf: round2((ss + med) * se.deductibleShare),
    belowThreshold: false,
    hitWageBase: taxableBase > ssRemaining,
  };
}

/** Section 199A qualified business income deduction, simple case. */
export function qbiDeduction(qualifiedIncome, taxableIncomeBeforeQbi, filingStatus, federal) {
  const qbi = federal.qbi;
  const threshold = qbi.thresholds[filingStatus] ?? qbi.thresholds.single;
  const phaseIn = qbi.phaseInRange[filingStatus] ?? qbi.phaseInRange.single;

  const income = Math.max(0, qualifiedIncome);
  const uncapped = round2(income * qbi.rate);
  // Also limited to 20% of taxable income excluding capital gains.
  const capped = Math.min(uncapped, round2(Math.max(0, taxableIncomeBeforeQbi) * qbi.rate));

  const over = taxableIncomeBeforeQbi - threshold;
  let status = 'full';
  if (over > phaseIn) status = 'above-threshold';
  else if (over > 0) status = 'phase-in';

  return {
    amount: capped,
    status,
    threshold,
    note: status === 'full'
      ? null
      : 'Above the income threshold the deduction is limited by W-2 wages and property basis, and specified service businesses phase out entirely. Treat this figure as an upper bound and confirm with a preparer.',
  };
}

/** State income tax. Handles flat, progressive, and no-tax states uniformly. */
export function stateIncomeTax(grossIncome, filingStatus, state, { dependents = 0, isLocal = false, localId = null } = {}) {
  if (!state || state.hasIncomeTax === false) {
    return {
      tax: 0, taxableIncome: 0, deduction: 0, marginalRate: 0, localTax: 0,
      surtax: 0, total: 0, hasIncomeTax: false,
    };
  }

  const status = state.brackets[filingStatus] ? filingStatus : 'single';
  const standard = state.standardDeduction?.[status] ?? 0;

  const exemption = state.personalExemptionCredit ?? {};

  // Some states cut the exemption off entirely above an income limit rather than
  // tapering it — Illinois disallows it above $250k AGI ($500k joint). Applied as a
  // cliff because that is how the statute reads. grossIncome is the closest thing to
  // AGI any caller has at this point; it is the same basis the brackets run on.
  const exemptionLimit = status === 'married_joint'
    ? exemption.incomeLimitJoint
    : exemption.incomeLimitSingle;
  const exemptionAllowed = exemptionLimit == null || grossIncome <= exemptionLimit;

  const exemptionTotal = exemptionAllowed
    ? (exemption[status] ?? 0) + (exemption.perDependent ?? 0) * Math.max(0, dependents)
    : 0;

  const exemptionDeduction = exemption.mode === 'deduction' ? exemptionTotal : 0;

  const taxableIncome = Math.max(0, grossIncome - standard - exemptionDeduction);
  let tax = bracketTax(taxableIncome, state.brackets[status]);

  // Credit-style exemptions reduce tax owed rather than taxable income.
  if (exemption.mode !== 'deduction' && exemptionTotal > 0) {
    tax = Math.max(0, tax - exemptionTotal);
  }

  let surtax = 0;
  for (const s of state.surtaxes ?? []) {
    if (taxableIncome > s.thresholdTaxableIncome) {
      surtax += round2((taxableIncome - s.thresholdTaxableIncome) * s.rate);
    }
  }

  let localTax = 0;
  if (isLocal) {
    const local = (state.localTaxes ?? []).find((l) => l.id === localId) ?? (state.localTaxes ?? [])[0];
    if (local && local.brackets) {
      localTax = bracketTax(taxableIncome, local.brackets[status] ?? local.brackets.single);
    }
  }

  return {
    tax: round2(tax),
    surtax: round2(surtax),
    localTax: round2(localTax),
    total: round2(tax + surtax + localTax),
    taxableIncome: round2(taxableIncome),
    deduction: round2(standard + exemptionDeduction),
    marginalRate: marginalRate(taxableIncome, state.brackets[status]),
    effectiveRate: grossIncome > 0 ? (tax + surtax + localTax) / grossIncome : 0,
    hasIncomeTax: true,
  };
}

/** State-level payroll taxes: CA SDI, NY PFL, and similar. */
export function statePayrollTaxes(wages, state) {
  const w = Math.max(0, wages);
  const items = [];
  let total = 0;

  for (const t of state?.payrollTaxes ?? []) {
    let amount;
    if (t.annualCap != null) {
      amount = Math.min(round2(Math.min(w, t.wageCap ?? w) * t.rate), t.annualCap);
    } else if (t.wageCap != null) {
      amount = round2(Math.min(w, t.wageCap) * t.rate);
    } else if (t.weeklyCap != null) {
      amount = Math.min(round2(w * t.rate), round2(t.weeklyCap * 52));
    } else {
      amount = round2(w * t.rate);
    }
    items.push({ id: t.id, label: t.label, amount, note: t.note });
    total += amount;
  }

  return { items, total: round2(total) };
}
