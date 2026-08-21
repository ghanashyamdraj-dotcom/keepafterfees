/**
 * money.js — precision-safe currency math.
 *
 * Every fee calculation in this codebase runs through integer cents. Floating
 * point dollars accumulate error fast when you chain percentage fees, and a
 * calculator that shows $12.340000000000002 destroys trust instantly.
 *
 * Convention used everywhere downstream:
 *   - Public function arguments and return values are DOLLARS (Number).
 *   - Internal arithmetic is CENTS (integer).
 *   - Fees and costs are expressed as NEGATIVE amounts in `lines[]`.
 *
 * This module is isomorphic: it is imported by the Node test suite and served
 * verbatim to the browser as an ES module. It must never import Node builtins.
 */

/**
 * Convert a dollar amount to integer cents. Tolerates strings and junk.
 *
 * The `toPrecision(15)` step is not decoration. In float64, 1.005 is stored as
 * 1.00499999999999989, so `Math.round(1.005 * 100)` gives 100 — a silently
 * lost cent on every half-cent boundary. Re-rounding to 15 significant digits
 * first snaps the product back to 100.5, which then rounds up to 101 as an
 * accountant expects. The same fix covers 1.045, 2.675, and every other value
 * where the decimal literal is not exactly representable.
 */
export function toCents(dollars) {
  const n = typeof dollars === 'string' ? Number(dollars.replace(/[$,\s]/g, '')) : Number(dollars);
  if (!Number.isFinite(n)) return 0;
  const scaled = Number((Math.abs(n) * 100).toPrecision(15));
  // Round half away from zero, matching how invoices round.
  return Math.round(scaled) * Math.sign(n);
}

/** Convert integer cents back to a dollar Number. */
export function toDollars(c) {
  return (Number(c) || 0) / 100;
}

/** Round a dollar amount to 2dp without float drift. */
export function round2(dollars) {
  return toDollars(toCents(dollars));
}

/** Round to `places` decimals. Used for percentages and rates. */
export function roundTo(n, places = 2) {
  const f = 10 ** places;
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(Math.abs(x) * f) / f * Math.sign(x);
}

/**
 * Percentage fee on a cents amount, returned in cents.
 * `rate` is a decimal fraction (0.065 for 6.5%), not a whole percent.
 */
export function pctOfCents(amountCents, rate) {
  const r = Number(rate);
  if (!Number.isFinite(r)) return 0;
  return Math.round(amountCents * r);
}

/** Coerce user input to a non-negative finite number. Blank -> fallback. */
export function num(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = typeof value === 'string' ? Number(value.replace(/[$,\s]/g, '')) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a non-negative number (fees and prices are never negative). */
export function nonNeg(value, fallback = 0) {
  return Math.max(0, num(value, fallback));
}

/**
 * Parse a percent that a user may type either way: 15 or 0.15 both mean 15%.
 * Values > 1 are treated as whole percents. Explicitly opt out with `asDecimal`.
 */
export function toRate(value, { assumeWholePercent = true } = {}) {
  const n = num(value, 0);
  if (n === 0) return 0;
  if (assumeWholePercent && Math.abs(n) > 1) return n / 100;
  return n;
}

/**
 * The site's original locale. `usd()` below is a fixed shorthand for this —
 * every existing call site and all pre-existing tests depend on `usd()`
 * staying exactly what it always was.
 */
const DEFAULT_LOCALE = {
  locale: 'en-US',
  currency: { code: 'USD', minorUnitDigits: 2 },
  formatting: { numberLocale: 'en-US' },
};

const formatterCache = new Map();

/**
 * Format an amount as currency for a given locale. `locale` is the shape
 * defined in src/data/locales/*.json: `{ currency: { code, minorUnitDigits },
 * formatting: { numberLocale } }`. Defaults to the site's original US/USD
 * formatting so every caller that doesn't pass a locale is unaffected.
 *
 * Formatters are cached per locale code — Intl.NumberFormat construction is
 * not free, and this runs on every recalculation as the user types.
 */
export function formatMoney(amount, locale = DEFAULT_LOCALE) {
  const code = locale?.currency?.code ?? 'USD';
  const digits = locale?.currency?.minorUnitDigits ?? 2;
  const numberLocale = locale?.formatting?.numberLocale ?? 'en-US';
  const cacheKey = `${numberLocale}|${code}|${digits}`;

  let fmt = formatterCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatterCache.set(cacheKey, fmt);
  }

  const n = Number(amount);
  return fmt.format(Number.isFinite(n) ? n : 0);
}

/** Format dollars as $1,234.56. Negative values render as -$1,234.56. */
export function usd(dollars) {
  return formatMoney(dollars, DEFAULT_LOCALE);
}

/** Format a decimal fraction as a percent string: 0.1532 -> "15.3%". */
export function pctLabel(rate, places = 1) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '0%';
  return `${roundTo(n * 100, places).toFixed(places)}%`;
}

/**
 * Apply a tiered rate schedule to an amount.
 *
 * Two modes, because fee schedules in the wild use both and conflating them is
 * the single most common bug in third-party fee calculators:
 *
 *   'marginal' — each tier's rate applies only to the portion of the amount
 *                inside that tier. Used by eBay final value fees and income tax.
 *   'flat'     — the whole amount is charged at the rate of the tier it lands
 *                in. Used by Amazon referral fees and Poshmark.
 *
 * tiers: [{ upTo: number|null, rate: number }] ordered ascending, last upTo null.
 * Returns cents.
 */
export function tieredCents(amountCents, tiers, mode = 'marginal') {
  if (!Array.isArray(tiers) || tiers.length === 0) return 0;

  if (mode === 'flat') {
    const tier = tiers.find((t) => t.upTo === null || amountCents <= toCents(t.upTo)) ?? tiers.at(-1);
    return pctOfCents(amountCents, tier.rate);
  }

  let remaining = amountCents;
  let floor = 0;
  let total = 0;
  for (const tier of tiers) {
    if (remaining <= 0) break;
    const ceiling = tier.upTo === null ? Infinity : toCents(tier.upTo);
    const band = Math.min(remaining, ceiling - floor);
    if (band > 0) {
      total += pctOfCents(band, tier.rate);
      remaining -= band;
    }
    floor = ceiling;
  }
  return total;
}

/**
 * Look up a value in a weight/size bracket table.
 * brackets: [{ upTo: number|null, value: any }] ascending. Returns the matching
 * entry, or the last entry when the value exceeds every bracket.
 */
export function bracket(value, brackets) {
  if (!Array.isArray(brackets) || brackets.length === 0) return null;
  return brackets.find((b) => b.upTo === null || value <= b.upTo) ?? brackets.at(-1);
}
