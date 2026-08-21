/**
 * result.js — the single result shape every calculator in this suite returns.
 *
 * Why a shared contract: the client runtime renders results generically. Add a
 * new calculator that returns this shape and the UI, the copy-to-clipboard, the
 * CSV export, and the print view all work with no extra front-end code.
 *
 * Line kinds:
 *   'revenue' — money coming in (positive)
 *   'fee'     — platform / processor fee (stored negative)
 *   'cost'    — your own cost: COGS, shipping, materials (stored negative)
 *   'tax'     — tax withheld or owed (stored negative)
 *   'info'    — not part of the sum; shown for context (e.g. "Fee rate applied")
 */

import { round2, toCents, toDollars } from './money.js';

export class ResultBuilder {
  constructor({ calculator, rates = null, currency = 'USD' } = {}) {
    this.calculator = calculator;
    this.currency = currency;
    this._lines = [];
    this._warnings = [];
    this._notes = [];
    this._inputs = {};
    this._extra = {};
    this._rates = rates;
  }

  inputs(obj) {
    this._inputs = { ...this._inputs, ...obj };
    return this;
  }

  /** Add a positive money-in line. */
  revenue(id, label, dollars, note) {
    return this._push({ id, label, kind: 'revenue', dollars: Math.abs(dollars), note });
  }

  /** Add a fee. Pass a positive number; it is stored negative. */
  fee(id, label, dollars, note) {
    return this._push({ id, label, kind: 'fee', dollars: -Math.abs(dollars), note });
  }

  /** Add a cost of goods / shipping / materials. Pass positive. */
  cost(id, label, dollars, note) {
    return this._push({ id, label, kind: 'cost', dollars: -Math.abs(dollars), note });
  }

  /** Add a tax line. Pass positive. */
  tax(id, label, dollars, note) {
    return this._push({ id, label, kind: 'tax', dollars: -Math.abs(dollars), note });
  }

  /** Add a non-summing contextual line. */
  info(id, label, value, note) {
    this._lines.push({ id, label, kind: 'info', amount: null, value, note });
    return this;
  }

  _push({ id, label, kind, dollars, note }) {
    // Drop true zeros so the breakdown stays scannable, but keep any line the
    // caller explicitly marked as always-visible via a note.
    const amount = round2(dollars);
    if (amount === 0 && !note) return this;
    this._lines.push({ id, label, kind, amount, note });
    return this;
  }

  warn(message) {
    if (message && !this._warnings.includes(message)) this._warnings.push(message);
    return this;
  }

  note(message) {
    if (message && !this._notes.includes(message)) this._notes.push(message);
    return this;
  }

  /** Attach calculator-specific fields that don't fit the line model. */
  extra(obj) {
    this._extra = { ...this._extra, ...obj };
    return this;
  }

  _sum(kinds) {
    const c = this._lines
      .filter((l) => kinds.includes(l.kind))
      .reduce((acc, l) => acc + toCents(l.amount), 0);
    return toDollars(c);
  }

  build() {
    const gross = this._sum(['revenue']);
    const fees = Math.abs(this._sum(['fee']));
    const costs = Math.abs(this._sum(['cost']));
    const taxes = Math.abs(this._sum(['tax']));
    const net = toDollars(
      this._lines
        .filter((l) => l.kind !== 'info')
        .reduce((acc, l) => acc + toCents(l.amount), 0)
    );

    // Payout = what the platform actually deposits (revenue minus fees only).
    // Distinct from net profit, which also subtracts your own costs.
    const payout = round2(gross - fees);

    return {
      ok: true,
      calculator: this.calculator,
      currency: this.currency,
      inputs: this._inputs,
      lines: this._lines,
      totals: {
        gross: round2(gross),
        fees: round2(fees),
        costs: round2(costs),
        taxes: round2(taxes),
        payout,
        net: round2(net),
        /** Net profit as a share of gross revenue. Null when gross is 0. */
        margin: gross > 0 ? net / gross : null,
        /** Return on the money you laid out. Null when you spent nothing. */
        roi: costs > 0 ? net / costs : null,
        /** Total deductions as a share of gross — the "what fees cost me" number. */
        effectiveFeeRate: gross > 0 ? fees / gross : null,
      },
      warnings: this._warnings,
      notes: this._notes,
      ...this._extra,
      meta: this._rates
        ? {
            rateVersion: this._rates.version,
            effective: this._rates.effective,
            verifiedOn: this._rates.verifiedOn,
            sources: this._rates.sources ?? [],
          }
        : null,
    };
  }
}

/** Convenience factory. */
export function result(opts) {
  return new ResultBuilder(opts);
}

/** A failed calculation, same shape so the UI never branches. */
export function invalid(calculator, message) {
  return {
    ok: false,
    calculator,
    error: message,
    lines: [],
    totals: {
      gross: 0, fees: 0, costs: 0, taxes: 0,
      payout: 0, net: 0, margin: null, roi: null, effectiveFeeRate: null,
    },
    warnings: [message],
    notes: [],
    meta: null,
  };
}

