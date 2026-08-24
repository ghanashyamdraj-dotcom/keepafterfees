/**
 * app.js — the only client-side script on the site.
 *
 * Everything it does is an enhancement. The page already contains a rendered
 * worked example in HTML; this makes it interactive. If this file fails to
 * load the page still answers the user's question, which is the whole point of
 * server-rendering the default result.
 *
 * Responsibilities:
 *   - live recalculation on input
 *   - restore last-used inputs from localStorage
 *   - hydrate from ?query=params so a result is shareable
 *   - copy / CSV / print / share
 *   - mobile nav
 */

import { REGISTRY } from './registry.js';
import { usd, formatMoney } from '../lib/money.js';

const STORAGE_PREFIX = 'afterfees:';

/* ------------------------------------------------------------ mobile nav -- */

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.hasAttribute('data-open');
    if (open) nav.removeAttribute('data-open');
    else nav.setAttribute('data-open', '');
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
  });
}

/* ---------------------------------------------------------- locale banner -- */

/**
 * "Looking for the UK version?" — suggest, never redirect. The locale spec
 * this follows is explicit: auto-redirecting on navigator.language breaks
 * Googlebot crawling (it crawls from US IPs and would never discover the
 * other locale's pages if every US visit bounced away) and hijacks a visitor
 * who deliberately typed the URL they're on. navigator.language is fine to
 * use for deciding whether to SHOW a dismissible suggestion; it is never
 * used to navigate anyone anywhere on their behalf.
 *
 * `localeSiblings` (from the #page-data script tag — see localeBannerData()
 * in build/build.mjs) already excludes the current page, so a browser
 * language matching any entry inherently means "different from this page,
 * matches a specific sibling" — no separate "what locale is THIS page" field
 * is needed.
 */
function initLocaleBanner() {
  const dataEl = document.getElementById('page-data');
  if (!dataEl) return;

  let siblings;
  try {
    ({ localeSiblings: siblings } = JSON.parse(dataEl.textContent));
  } catch {
    return;
  }
  if (!Array.isArray(siblings) || !siblings.length) return;

  const dismissKey = `${STORAGE_PREFIX}locale-banner-dismissed:${location.pathname}`;
  try {
    if (localStorage.getItem(dismissKey)) return;
  } catch { /* private browsing — just show it, nothing persists either way */ }

  const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .filter(Boolean)
    .map((l) => l.toLowerCase());
  const match = siblings.find((s) => prefs.includes(s.code.toLowerCase()));
  if (!match) return;

  const bar = document.createElement('div');
  bar.className = 'locale-banner';
  bar.setAttribute('role', 'complementary');
  bar.innerHTML = `<p>Looking for the ${esc(match.label)} version? <a href="${esc(match.path)}">Switch to ${esc(match.label)}</a></p>
<button type="button" class="locale-banner-close" aria-label="Dismiss">&times;</button>`;

  bar.querySelector('.locale-banner-close').addEventListener('click', () => {
    bar.remove();
    try { localStorage.setItem(dismissKey, '1'); } catch { /* not worth surfacing */ }
  });

  document.body.insertBefore(bar, document.body.firstChild);
}

/* ------------------------------------------------------------ report modal -- */

/**
 * Progressive enhancement over the plain mailto: link reportBox() renders in
 * src/templates/components.js. With JS, the trigger opens a small form
 * instead of blindly launching the mail app; on submit it builds the same
 * mailto: URL with a subject and body filled in from what was typed. There is
 * no server on this site for a form to POST to, so a mail handoff is the only
 * mechanism that doesn't require standing up a backend or a third-party form
 * service — either of which would be a new account and a new dependency this
 * site doesn't otherwise have.
 */
function initReportModal() {
  const dialog = document.querySelector('[data-report-dialog]');
  const trigger = document.querySelector('[data-report-open]');
  if (!dialog || !trigger || typeof dialog.showModal !== 'function') return;

  const form = dialog.querySelector('[data-report-form]');
  const to = dialog.dataset.reportTo;

  trigger.addEventListener('click', (e) => {
    e.preventDefault(); // skip the bare mailto: fallback now that JS is here
    dialog.showModal();
    form.querySelector('textarea')?.focus();
  });

  dialog.querySelectorAll('[data-report-close]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close());
  });

  // A click that lands on the dialog element itself (not a child) means the
  // visitor clicked the ::backdrop — <dialog> has no separate backdrop node
  // to bind a listener to.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = form.querySelector('#report-type')?.value ?? 'other';
    const message = form.querySelector('#report-message')?.value.trim() ?? '';
    if (!message) return;

    const subjects = { 'wrong-number': 'Wrong number report', request: 'Calculator request', other: 'Message' };
    const subject = `${subjects[type] ?? subjects.other} — AfterFees`;
    const body = `${message}\n\nSent from: ${location.href}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    dialog.close();
  });
}

/* --------------------------------------------------------------- the tool -- */

function readForm(form) {
  const input = {};
  for (const el of form.querySelectorAll('[data-input]')) {
    if (el.type === 'checkbox') {
      input[el.name] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) input[el.name] = el.value;
    } else if (el.type === 'number') {
      input[el.name] = el.value === '' ? 0 : Number(el.value);
    } else {
      input[el.name] = el.value;
    }
  }
  return input;
}

function writeForm(form, values) {
  for (const el of form.querySelectorAll('[data-input]')) {
    const v = values[el.name];
    if (v === undefined || v === null) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else if (el.type === 'radio') el.checked = el.value === String(v);
    else el.value = v;
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Fee waterfall — one stacked bar showing what you keep against what each
 * deduction took out of gross, built from the same `res.lines` as the table.
 *
 * IMPORTANT: this is a byte-identical copy of `waterfall()` in
 * src/templates/components.js. The build renders one, the browser renders the
 * other, and test/parity.test.js asserts they agree. Edit both or neither.
 */
function waterfall(res, locale = undefined) {
  const gross = res.totals?.gross ?? 0;
  const net = res.totals?.net ?? 0;
  if (!(gross > 0) || !(net > 0)) return '';

  const taken = res.lines.filter(
    (l) => (l.kind === 'fee' || l.kind === 'cost' || l.kind === 'tax') && l.amount
  );
  const pct = (v) => Math.max(0, Math.min(100, (Math.abs(v) / gross) * 100));

  const segs = [
    `<span class="wf-seg wf-seg--keep" style="--pct:${pct(net).toFixed(2)}%"></span>`,
    ...taken.map(
      (l) => `<span class="wf-seg wf-seg--${l.kind}" style="--pct:${pct(l.amount).toFixed(2)}%"></span>`
    ),
  ].join('');

  const label = `Of ${formatMoney(gross, locale)} gross you keep ${formatMoney(net, locale)}, or ${pct(net).toFixed(0)} percent. The remainder is itemised in the table below.`;

  return `<div class="waterfall" role="img" aria-label="${esc(label)}">${segs}</div>`;
}

/**
 * Render a result. Deliberately produces the SAME markup the build produced,
 * so there is no flash of different layout between server HTML and first
 * client render.
 *
 * IMPORTANT: byte-identical to `resultBlock()` in src/templates/components.js
 * (same pairing convention as `waterfall()` above). Edit both or neither.
 */
function renderResult(res, config, locale = undefined) {
  if (!res.ok) {
    return `<div class="result-card result-card--empty"><p>${esc(res.error)}</p></div>`;
  }

  // A tool whose result shape changes with a mode toggle (the processor pages
  // have a forward/reverse switch) needs its labels to change too, so these
  // may be a function of the result rather than a fixed string.
  const label = (v) => (typeof v === 'function' ? v(res) : v);
  const headline = config.headline(res);
  const total = config.totalOverride ? config.totalOverride(res) : res.totals.net;
  const totalLabel = label(config.totalLabel ?? config.headlineLabel);
  const negative = total < 0;

  const stats = (config.stats?.(res) ?? [])
    .map((s) => `<div class="stat"><span class="stat-label">${esc(s.label)}</span><span class="stat-value">${esc(s.value)}</span></div>`)
    .join('');

  const lines = res.lines
    .map((l) => {
      if (l.kind === 'info') {
        return `<tr class="line line--info"><th scope="row">${esc(l.label)}${
          l.note ? `<span class="line-note">${esc(l.note)}</span>` : ''
        }</th><td class="line-value">${esc(l.value)}</td></tr>`;
      }
      return `<tr class="line line--${l.kind} line--${l.amount < 0 ? 'neg' : 'pos'}">
        <th scope="row">${esc(l.label)}${l.note ? `<span class="line-note">${esc(l.note)}</span>` : ''}</th>
        <td class="line-value">${l.amount < 0 ? '&minus;' : ''}${formatMoney(Math.abs(l.amount), locale)}</td></tr>`;
    })
    .join('');

  const warnings = res.warnings.length
    ? `<div class="callouts">${res.warnings.map((w) => `<p class="callout callout--warn">${esc(w)}</p>`).join('')}</div>`
    : '';
  const notes = res.notes.length
    ? `<div class="callouts">${res.notes.map((n) => `<p class="callout callout--note">${esc(n)}</p>`).join('')}</div>`
    : '';

  const extra = config.extraRender ? config.extraRender(res) : '';

  return `<div class="result-card">
  <div class="result-headline"${negative ? ' data-negative' : ''}>
    <span class="result-label">${esc(label(config.headlineLabel))}</span>
    <output class="result-value" id="result-headline">${esc(headline)}</output>
  </div>
  ${waterfall(res, locale)}
  ${stats ? `<div class="result-stats">${stats}</div>` : ''}
  <table class="breakdown">
    <caption class="visually-hidden">Full breakdown of fees, costs, and net result</caption>
    <tbody>${lines}</tbody>
    <tfoot><tr class="line line--total"><th scope="row">${esc(totalLabel)}</th>
      <td class="line-value">${total < 0 ? '&minus;' : ''}${formatMoney(Math.abs(total), locale)}</td></tr></tfoot>
  </table>
  ${warnings}${notes}${extra}
  <div class="result-actions">
    <button type="button" class="btn btn-small" data-action="copy">Copy breakdown</button>
    <button type="button" class="btn btn-small" data-action="csv">Download CSV</button>
    <button type="button" class="btn btn-small" data-action="print">Print / PDF</button>
    <button type="button" class="btn btn-small" data-action="share">Copy link to these numbers</button>
  </div>
</div>`;
}

/* ------------------------------------------------------------- exporting -- */

function toPlainText(res, config, calculatorId) {
  const lines = [
    `${document.title.split('|')[0].trim()}`,
    `Calculated on keepafterfees.com — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
  ];

  for (const l of res.lines) {
    if (l.kind === 'info') lines.push(`${l.label}: ${l.value}`);
    else lines.push(`${l.label}: ${l.amount < 0 ? '-' : ''}${usd(Math.abs(l.amount))}`);
  }

  const total = config.totalOverride ? config.totalOverride(res) : res.totals.net;
  const lbl = (v) => (typeof v === 'function' ? v(res) : v);
  lines.push('', `${lbl(config.totalLabel ?? config.headlineLabel)}: ${usd(total)}`);

  if (res.meta) {
    lines.push('', `Rate data version ${res.meta.rateVersion}, effective ${res.meta.effective}.`);
    lines.push('Estimate only — not financial, tax, or accounting advice.');
  }
  return lines.join('\n');
}

function toCsv(res, config) {
  const rows = [['Item', 'Type', 'Amount']];
  for (const l of res.lines) {
    if (l.kind === 'info') rows.push([l.label, 'info', l.value]);
    else rows.push([l.label, l.kind, l.amount.toFixed(2)]);
  }
  const total = config.totalOverride ? config.totalOverride(res) : res.totals.net;
  const lbl2 = (v) => (typeof v === 'function' ? v(res) : v);
  rows.push([lbl2(config.totalLabel ?? config.headlineLabel), 'total', total.toFixed(2)]);

  if (res.meta) {
    rows.push([]);
    rows.push([`Rate version ${res.meta.rateVersion}`, `effective ${res.meta.effective}`, '']);
    rows.push(['Estimate only. Not financial, tax, or accounting advice.', '', '']);
  }

  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
    .join('\n');
}

function download(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function flashCopy(button, text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const original = button.textContent;
  button.textContent = 'Copied';
  button.setAttribute('data-copied', '');
  setTimeout(() => {
    button.textContent = original;
    button.removeAttribute('data-copied');
  }, 1600);
}

/* ------------------------------------------------------------------ init -- */

function initTool() {
  const toolEl = document.querySelector('[data-calculator]');
  const form = document.getElementById('tool-form');
  const out = document.getElementById('tool-results');
  if (!toolEl || !form || !out) return;

  const calculatorId = toolEl.dataset.calculator;
  const config = REGISTRY[calculatorId];
  if (!config) {
    console.warn(`No calculator registered for "${calculatorId}"`);
    return;
  }

  /**
   * Keyed on the PATH as well as the calculator id.
   *
   * Several pages share one calculator: /paypal-fee-calculator/ and
   * /stripe-fee-calculator/ are both `processor-fees`, and the four
   * head-to-head pages are all `channel-versus`. Keyed on the id alone they
   * shared one saved form, so visiting one and then its sibling restored the
   * first page's inputs over the second's — a Stripe page silently showing
   * PayPal's rates, or an Etsy vs Shopify page showing the sixteen-channel
   * comparison, because the hidden field naming the comparison is a persisted
   * input like any other.
   *
   * The locale-banner key above already does this, for the same reason.
   */
  const storageKey = `${STORAGE_PREFIX}${calculatorId}:${location.pathname}`;
  let lastResult = null;

  // 1. URL params win (a shared link), then localStorage, then the HTML defaults.
  const params = new URLSearchParams(location.search);
  if ([...params.keys()].length) {
    writeForm(form, Object.fromEntries(params));
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved) writeForm(form, saved);
    } catch { /* corrupt entry — ignore and use defaults */ }
  }

  const recalc = () => {
    const input = readForm(form);
    try {
      lastResult = config.run(input);
    } catch (err) {
      console.error(err);
      out.innerHTML = `<div class="result-card result-card--empty"><p>Something went wrong with that combination of inputs. If it keeps happening, please <a href="/contact/">tell us</a> what you entered.</p></div>`;
      return;
    }
    out.innerHTML = renderResult(lastResult, config, config.locale);

    try {
      localStorage.setItem(storageKey, JSON.stringify(input));
    } catch { /* private browsing / quota — not worth surfacing */ }
  };

  // Debounce so typing a four-digit number does not recalculate four times.
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(recalc, 90);
  };

  form.addEventListener('input', schedule);
  form.addEventListener('change', recalc);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    recalc();
    out.querySelector('.result-value')?.focus?.();
  });
  form.addEventListener('reset', () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setTimeout(recalc, 0);
  });

  out.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !lastResult) return;

    switch (btn.dataset.action) {
      case 'copy':
        flashCopy(btn, toPlainText(lastResult, config, calculatorId));
        break;
      case 'csv':
        download(`afterfees-${calculatorId}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(lastResult, config));
        break;
      case 'print':
        window.print();
        break;
      case 'share': {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(readForm(form))) {
          if (v !== '' && v !== 0 && v !== false) qs.set(k, String(v));
        }
        flashCopy(btn, `${location.origin}${location.pathname}?${qs}`);
        break;
      }
      default:
        break;
    }
  });

  /**
   * Preset buttons. Set one field, recalculate, scroll the result into view.
   *
   * Uses form.querySelector('[name="..."]') rather than form.elements[name]
   * deliberately: HTMLFormControlsCollection has its own `length`, `item` and
   * `namedItem` properties, so a field named "length" — which several of these
   * calculators have — silently returns a number instead of the input.
   */
  const presetRow = document.querySelector('.preset-row');
  if (presetRow) {
    presetRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset');
      if (!btn) return;

      // Either one field, or a whole set — see presetButtons() for why the
      // paycheck pages need to set an amount and a pay frequency together.
      const set = btn.dataset.presetSet
        ? JSON.parse(btn.dataset.presetSet)
        : { [btn.dataset.presetField]: btn.dataset.presetValue };

      for (const [name, value] of Object.entries(set)) {
        const input = form.querySelector(`[name="${name}"]`);
        if (!input) continue;
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      recalc();

      for (const b of presetRow.querySelectorAll('.preset')) {
        b.setAttribute('aria-pressed', String(b === btn));
      }
    });
  }

  // Recalculate once on load so restored values are reflected immediately.
  recalc();
}

/* ---------------------------------------------------------- fee slicer -- */

/**
 * The homepage hero calculator.
 *
 * The rows are already rendered server-side for a $100 sale, so the hero is
 * complete and correct with JavaScript disabled. This only makes it respond to
 * a new amount. It reuses the same engines the individual pages use, imported
 * lazily so the cost lands on the homepage and nowhere else.
 */
async function initSlicer() {
  const root = document.querySelector('[data-slicer]');
  if (!root) return;

  const input = root.querySelector('[data-slicer-input]');
  const rowsEl = root.querySelector('[data-slicer-rows]');
  const presets = [...root.querySelectorAll('[data-slicer-preset]')];
  if (!input || !rowsEl) return;

  const [{ calculateEtsy }, { calculateEbay }, { calculateShopify }, { calculateProcessorFee }, rates] =
    await Promise.all([
      import('../lib/calc/etsy.js'),
      import('../lib/calc/ebay.js'),
      import('../lib/calc/shopify.js'),
      import('../lib/calc/processors.js'),
      import('../lib/rates.generated.js'),
    ]);

  const runners = {
    etsy: (a) => calculateEtsy({ itemPrice: a, autoRenew: true }, rates.etsy),
    ebay: (a) => calculateEbay({ salePrice: a }, rates.ebay),
    shopify: (a) => calculateShopify({ orderValue: a, plan: 'basic' }, rates.shopify),
    paypal: (a) => calculateProcessorFee({ amount: a, processorId: 'paypal', productId: 'checkout' }, rates.processors),
    stripe: (a) => calculateProcessorFee({ amount: a, processorId: 'stripe', productId: 'online-domestic' }, rates.processors),
  };

  const money = (n) => `$${n.toFixed(2)}`;

  function update(amount) {
    if (!(amount > 0)) return;

    const rows = [...rowsEl.querySelectorAll('[data-slicer-row]')].map((el) => {
      const id = el.dataset.slicerRow;
      const res = runners[id]?.(amount);
      if (!res?.ok) return { el, net: -1 };
      const fees = res.lines
        .filter((l) => l.kind === 'fee')
        .reduce((sum, l) => sum + Math.abs(l.amount), 0);
      const net = Math.max(0, amount - fees);
      // Mirrors the server tiebreak: a row carrying a fixed monthly cost
      // (currently only Shopify's plan) ranks below an equal one without.
      const hasFixedCost = !!el.querySelector('.slicer-note');
      return { el, fees, net, keepPct: (net / amount) * 100, hasFixedCost };
    });

    for (const r of rows) {
      if (r.net < 0) continue;
      r.el.querySelector('[data-slicer-fee]').innerHTML = `&minus;${money(r.fees)}`;
      r.el.querySelector('[data-slicer-net]').textContent = money(r.net);
      r.el.removeAttribute('data-best');
    }

    // Re-rank so the best-paying platform stays at the top and keeps the one
    // mint figure on the widget, the same way the server rendered it.
    const ranked = rows
      .filter((r) => r.net >= 0)
      .sort((a, b) => b.net - a.net || (a.hasFixedCost ? 1 : 0) - (b.hasFixedCost ? 1 : 0));
    if (ranked.length) ranked[0].el.setAttribute('data-best', '');
    for (const r of ranked) rowsEl.appendChild(r.el);

    // The verdict names the winner in words. The ranking is already carried by
    // the row order and one mint figure, and a sentence is the one form of it
    // that needs no colour vision and no comparison of two numbers.
    const winner = root.querySelector('[data-slicer-winner]');
    if (winner && ranked.length) {
      winner.textContent = ranked[0].el.querySelector('.slicer-name')?.textContent ?? '';
    }

    for (const p of presets) {
      p.setAttribute('aria-pressed', String(Number(p.dataset.slicerPreset) === amount));
    }
    root.dataset.slicerAmount = String(amount);
  }

  input.addEventListener('input', () => update(Number(input.value)));

  for (const p of presets) {
    p.addEventListener('click', () => {
      const v = Number(p.dataset.slicerPreset);
      input.value = String(v);
      update(v);
    });
  }
}

/* ------------------------------------------------------ directory filter -- */

/**
 * Category pills over the tool grid. Progressive enhancement: every card is
 * rendered visible, so a crawler or a JS-off visitor sees the full directory
 * and the pills simply never activate.
 */
function initToolFilter() {
  const bar = document.querySelector('[data-tool-filter]');
  const grid = document.querySelector('[data-tool-grid]');
  if (!bar || !grid) return;

  const pills = [...bar.querySelectorAll('[data-filter]')];
  const cards = [...grid.querySelectorAll('.tool-card')];
  const empty = document.querySelector('[data-filter-empty]');

  bar.addEventListener('click', (e) => {
    const pill = e.target.closest('[data-filter]');
    if (!pill) return;

    const filter = pill.dataset.filter;
    for (const p of pills) p.setAttribute('aria-pressed', String(p === pill));

    let shown = 0;
    for (const c of cards) {
      const match = filter === 'all' || c.dataset.group === filter;
      c.hidden = !match;
      if (match) shown += 1;
    }
    if (empty) empty.hidden = shown > 0;
  });
}

initNav();
initTool();
initReportModal();
initLocaleBanner();
initToolFilter();
initSlicer();
