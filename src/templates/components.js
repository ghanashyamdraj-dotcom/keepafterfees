/**
 * components.js — HTML fragments shared by every page.
 *
 * Everything here returns a string. No client framework, no hydration, no
 * virtual DOM. The rendered HTML contains the complete content of the page,
 * which is requirement #1 in the build spec: every AI crawler except Googlebot
 * fetches HTML and does not execute JavaScript.
 *
 * The tool's INPUTS render server-side too, with their default values already
 * in the `value` attributes. That means a crawler with no JS sees a real form
 * and a real worked example, not an empty <div id="root">.
 */

// `usd` is only used by renderQuarterly, which must stay literally identical to
// its twin in src/client/registry.js — that copy calls usd(), so this one does
// too even though formatMoney() with no locale is the same function.
import { formatMoney, usd } from '../lib/money.js';
import { brandMark, ICONS, groupIcon } from './icons.js';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- chrome -- */

export function header(site, currentPath) {
  const links = site.nav
    .map((item) => {
      const active = currentPath.startsWith(item.href) && item.href !== '/';
      return `<li><a href="${item.href}"${active ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`;
    })
    .join('');

  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true">${brandMark}</span>
      <span class="brand-text"><strong>After</strong><em>Fees</em></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>${links}</ul>
    </nav>
  </div>
</header>`;
}

export function breadcrumbs(trail) {
  // A one-item trail is just the word "Home" floating above the page — it
  // orients nobody and it was the first thing the design critique flagged.
  // The BreadcrumbList schema is emitted separately in schema.js and is
  // unaffected, so structured data still describes the hierarchy.
  if (!trail || trail.length < 2) return '';

  const items = trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(c.label)}</li>`
        : `<li><a href="${c.href}">${esc(c.label)}</a></li>`
    )
    .join('');
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="wrap"><ol>${items}</ol></div></nav>`;
}

export function footer(site) {
  const links = site.footerNav.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`).join('');
  const year = new Date().getFullYear();

  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-about">
        <span class="footer-brand"><span class="brand-mark" aria-hidden="true">${brandMark}</span><span class="brand-text"><strong>After</strong><em>Fees</em></span></span>
        <p>${esc(site.description)}</p>
      </div>
      <nav aria-label="Footer">
        <h2>Site</h2>
        <ul>${links}</ul>
      </nav>
      <div class="footer-legal">
        <h2>Important</h2>
        <p>${esc(site.name)} is an independent, third-party site with no affiliation to Amazon, Etsy, eBay, Shopify, PayPal, Stripe, or any other platform named here. Every calculator produces an <strong>estimate</strong>, not advice, and we are not accountants, tax preparers, or financial advisers. Fee schedules and tax rules change — check figures against the platform's own page before you price anything.</p>
      </div>
    </div>
    <p class="copyright">&copy; ${year} ${esc(site.name)}. Rate data sources are cited on every page.</p>
  </div>
</footer>`;
}

/* ------------------------------------------------------------ directory -- */

/**
 * One tool card for the directory grid.
 *
 * Replaces the old title+blurb+"live" card. Three things changed, all from the
 * design critique:
 *
 *   - A category glyph, so the grid has visual anchors and you can tell a
 *     marketplace tool from a paycheck tool without reading.
 *   - Real metadata chips ("2026 rates", "Includes shipping") instead of a
 *     `live` tag repeated on every card, which carried no information.
 *   - A footer stat showing the actual headline rate, plus a two-segment bar
 *     for the keep/take split.
 *
 * `stat` is computed from the rate JSON by the caller and passed in — this
 * function never knows a percentage. A card that has no meaningful headline
 * rate (the reverse calculators, margin) simply omits the footer rather than
 * inventing one.
 */
export function toolCard(tool, { chips = [], stat = null } = {}) {
  const planned = tool.status === 'planned';

  const chipHtml = [
    ...(planned ? [{ label: 'Coming soon', kind: 'soon' }] : []),
    ...chips.map((c) => (typeof c === 'string' ? { label: c } : c)),
  ]
    .map((c) => `<span class="chip${c.kind ? ` chip--${c.kind}` : ''}">${esc(c.label)}</span>`)
    .join('');

  const statHtml = stat
    ? `<div class="card-stat">
      <span class="card-stat-label">${esc(stat.label)}</span>
      <span class="card-stat-value">${esc(stat.value)}</span>
    </div>
    ${
      stat.keepPct != null
        ? `<div class="card-bar" role="img" aria-label="${esc(stat.barLabel ?? '')}">
      <span class="keep" style="width:${stat.keepPct.toFixed(1)}%"></span>
      <span class="take" style="width:${(100 - stat.keepPct).toFixed(1)}%"></span>
    </div>`
        : ''
    }`
    : '';

  return `<li class="tool-card" data-group="${esc(tool.group)}" data-name="${esc(`${tool.h1} ${tool.blurb}`.toLowerCase())}">
  <a href="${tool.path}">
    <div class="card-top">
      <span class="card-glyph" aria-hidden="true">${groupIcon(tool.group)}</span>
      <h3 class="card-title">${esc(tool.linkLabel ?? tool.h1)}</h3>
    </div>
    <p class="card-blurb">${esc(tool.blurb)}</p>
    ${chipHtml ? `<div class="card-chips">${chipHtml}</div>` : ''}
    ${statHtml}
  </a>
</li>`;
}

/**
 * Filter pills above the grid. Server-rendered with counts, and every card is
 * visible before any JavaScript runs — the pills are an enhancement, so a
 * crawler or a JS-off visitor still sees the whole directory.
 */
export function filterPills(groups, tools) {
  const total = tools.length;
  const pills = [
    `<button type="button" class="filter-pill" data-filter="all" aria-pressed="true">All<span class="count">${total}</span></button>`,
    ...Object.values(groups).map((g) => {
      const n = tools.filter((t) => t.group === g.id).length;
      if (!n) return '';
      return `<button type="button" class="filter-pill" data-filter="${esc(g.id)}" aria-pressed="false">${esc(g.label)}<span class="count">${n}</span></button>`;
    }),
  ].join('');

  return `<div class="filter-pills" role="group" aria-label="Filter calculators by category" data-tool-filter>${pills}</div>`;
}

/* ------------------------------------------------------------- ad slots -- */

/**
 * Reserved ad space. Renders an empty, correctly-sized container so that
 * turning ads on later shifts nothing. Section 9.4 of the spec: un-dimensioned
 * ad slots injected above content are the most common cause of CLS failure.
 */
export function adSlot(site, position) {
  const size = site.adSlots.sizes[position];
  if (!size) return '';
  const [mw, mh] = size.mobile;
  const [dw, dh] = size.desktop;

  return `<div class="ad-slot ad-slot--${position}" data-ad-slot="${position}"
  style="--ad-w-mobile:${mw}px;--ad-h-mobile:${mh}px;--ad-w-desktop:${dw}px;--ad-h-desktop:${dh}px"
  role="complementary" aria-label="Advertisement">${site.adSlots.enabled ? '' : '<!-- reserved -->'}</div>`;
}

/** Affiliate block. Renders nothing until slots have real URLs. */
export function affiliateSlot(site, toolId) {
  if (!site.affiliates.enabled) return '';
  const items = (site.affiliates.slots[toolId] ?? []).filter((i) => i.url);
  if (!items.length) return '';

  const cards = items
    .map(
      (i) => `<li><a href="${esc(i.url)}" rel="sponsored nofollow noopener" target="_blank">
      <strong>${esc(i.label)}</strong><span>${esc(i.note)}</span></a></li>`
    )
    .join('');

  return `<aside class="affiliate-block" aria-label="Related tools">
  <h2>Tools sellers use alongside this</h2>
  <ul class="affiliate-list">${cards}</ul>
  <p class="affiliate-disclosure">${esc(site.affiliates.disclosure)}</p>
</aside>`;
}

/* ----------------------------------------------------------- tool shell -- */

/** One labelled input. Renders with its default value already set. */
export function field(f) {
  const id = `f-${f.name}`;
  const help = f.help ? `<span class="field-help" id="${id}-help">${esc(f.help)}</span>` : '';
  const describedBy = f.help ? ` aria-describedby="${id}-help"` : '';
  const prefix = f.prefix ? `<span class="affix affix-pre" aria-hidden="true">${esc(f.prefix)}</span>` : '';
  const suffix = f.suffix ? `<span class="affix affix-post" aria-hidden="true">${esc(f.suffix)}</span>` : '';

  let control;
  switch (f.type) {
    // A value the engine needs on every recalculation but the user never sets
    // — e.g. which processor a single-processor page is pinned to. readForm()
    // in app.js builds its input object purely from [data-input] elements and
    // does NOT merge the page defaults back in, so an engine argument that has
    // no field here silently arrives as undefined in the browser. Emitted with
    // no id and no label, which is correct for a hidden input and keeps it out
    // of the audit's label check.
    case 'hidden':
      return `<input type="hidden" name="${f.name}" value="${esc(f.value ?? '')}" data-input>`;
    case 'select':
      control = `<select id="${id}" name="${f.name}" data-input${describedBy}>${f.options
        .map(
          (o) =>
            `<option value="${esc(o.value)}"${o.value === f.value ? ' selected' : ''}>${esc(o.label)}</option>`
        )
        .join('')}</select>`;
      break;
    case 'checkbox':
      return `<div class="field field-check">
  <input type="checkbox" id="${id}" name="${f.name}" data-input${f.value ? ' checked' : ''}${describedBy}>
  <label for="${id}">${esc(f.label)}</label>
  ${help}
</div>`;
    case 'radio':
      return `<fieldset class="field field-radio">
  <legend>${esc(f.label)}</legend>
  ${f.options
    .map(
      (o, i) => `<div class="radio-item">
    <input type="radio" id="${id}-${i}" name="${f.name}" value="${esc(o.value)}" data-input${o.value === f.value ? ' checked' : ''}>
    <label for="${id}-${i}">${esc(o.label)}</label>
  </div>`
    )
    .join('')}
  ${help}
</fieldset>`;
    default:
      control = `<input type="${f.type ?? 'number'}" id="${id}" name="${f.name}"
        value="${esc(f.value ?? '')}" data-input
        ${f.step ? `step="${f.step}"` : 'step="0.01"'}
        ${f.min !== undefined ? `min="${f.min}"` : 'min="0"'}
        ${f.max !== undefined ? `max="${f.max}"` : ''}
        ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}
        inputmode="${f.inputmode ?? 'decimal'}"${describedBy}>`;
  }

  return `<div class="field${f.wide ? ' field-wide' : ''}">
  <label for="${id}">${esc(f.label)}</label>
  <div class="control${prefix ? ' has-prefix' : ''}${suffix ? ' has-suffix' : ''}">${prefix}${control}${suffix}</div>
  ${help}
</div>`;
}

export function fieldGroup(group) {
  return `<fieldset class="field-group">
  <legend>${esc(group.legend)}</legend>
  ${group.note ? `<p class="group-note">${esc(group.note)}</p>` : ''}
  <div class="field-grid">${group.fields.map(field).join('')}</div>
</fieldset>`;
}

/**
 * The tool itself. Above the fold, inputs on the left, results on the right.
 *
 * `initialResult` is the server-rendered result for the default inputs, so the
 * page ships a complete worked example in HTML even with JavaScript disabled.
 */
export function toolShell({ page, groups, initialResult, site }) {
  return `<section class="tool" id="tool" data-calculator="${esc(page.calculator)}">
  <form class="tool-inputs" id="tool-form" novalidate>
    ${groups.map(fieldGroup).join('')}
    ${presetButtons(page.presets)}
    <div class="tool-actions">
      <button type="submit" class="btn btn-primary">Calculate</button>
      <button type="reset" class="btn btn-ghost">Reset</button>
    </div>
  </form>

  <div class="tool-results" id="tool-results" aria-live="polite" aria-atomic="false">
    ${initialResult}
  </div>
</section>`;
}

/**
 * Fee waterfall — one stacked bar showing what you keep against what each
 * deduction took out of gross. It is built from the same `res.lines` the
 * breakdown table below it uses, so the two can never disagree.
 *
 * Pure CSS: each segment carries its width as an inline `--pct`. No chart
 * library, no canvas, no third-party request, nothing to hydrate.
 *
 * Returns '' whenever a bar would mislead rather than inform — no gross to
 * divide by, or a negative net, which the headline already signals in red.
 *
 * IMPORTANT: `renderResult()` in src/client/app.js contains a byte-identical
 * copy of this function. The two must be edited together or the parity test
 * in test/parity.test.js fails.
 */
export function waterfall(res, locale = undefined) {
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
 * Ranked comparison table — resellers, Shopify plans, paycheck by state.
 *
 * IMPORTANT: byte-identical to `renderComparison()` in src/client/registry.js.
 * Without a server copy the ranked table would be missing from the initial
 * HTML and only appear after the first client render, which fails requirement
 * #1 of the build spec — the main content has to be in the raw response,
 * because every AI crawler except Googlebot runs no JavaScript. Edit both.
 */
export function renderComparison(rows, { columns, bestKey }) {
  if (!rows?.length) return '';
  const best = rows.reduce((a, b) => (b[bestKey] > a[bestKey] ? b : a));

  const head = columns.map((c) => `<th scope="col">${c.label}</th>`).join('');
  const body = rows
    .map((row, i) => {
      const cells = columns
        .map((c) => {
          const v = c.format ? c.format(row) : row[c.key];
          return `<td>${v}</td>`;
        })
        .join('');
      return `<tr${row === best ? ' data-best' : ''}><td class="rank">${i + 1}</td>${cells}</tr>`;
    })
    .join('');

  return `<div class="table-scroll"><table class="compare-table">
  <caption class="visually-hidden">Net payout by platform, best first</caption>
  <thead><tr><th scope="col"><span class="visually-hidden">Rank</span></th>${head}</tr></thead>
  <tbody>${body}</tbody>
</table></div>`;
}

/**
 * IMPORTANT: byte-identical to `renderQuarterly()` in src/client/registry.js,
 * for the same reason renderComparison() is duplicated above — the schedule is
 * the main content of the self-employment tax page, so it has to be in the raw
 * HTML rather than appearing only after the first client render. Edit both.
 */
export function renderQuarterly(q) {
  if (!q?.payments?.length) return '';
  const rows = q.payments
    .map(
      (p) => `<tr>
    <td>Q${p.quarter}</td><td>${p.period}</td>
    <td>${new Date(`${p.due}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</td>
    <td>${usd(p.amount)}</td>
  </tr>`
    )
    .join('');

  return `<div class="quarterly">
  <h3>Your quarterly payment schedule</h3>
  <p class="callout callout--note">${q.explanation}</p>
  <div class="table-scroll"><table class="compare-table">
    <thead><tr><th scope="col">Quarter</th><th scope="col">Income period</th><th scope="col">Payment due</th><th scope="col">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3"><strong>Total for the year</strong></td><td><strong>${usd(q.remaining)}</strong></td></tr></tfoot>
  </table></div>
</div>`;
}

/**
 * Server-rendered result block. The client re-renders this same markup.
 *
 * `locale` follows the shape in src/data/locales/*.json; defaults to en-US
 * (formatMoney's own default) so every existing call site is unaffected.
 */
export function resultBlock(res, { headline, headlineLabel, secondary = [], extra = '', locale = undefined }) {
  if (!res.ok) {
    return `<div class="result-card result-card--empty"><p>${esc(res.error)}</p></div>`;
  }

  const lines = res.lines
    .map((l) => {
      if (l.kind === 'info') {
        return `<tr class="line line--info">
  <th scope="row">${esc(l.label)}${l.note ? `<span class="line-note">${esc(l.note)}</span>` : ''}</th>
  <td class="line-value">${esc(l.value)}</td>
</tr>`;
      }
      const sign = l.amount < 0 ? 'neg' : 'pos';
      return `<tr class="line line--${l.kind} line--${sign}">
  <th scope="row">${esc(l.label)}${l.note ? `<span class="line-note">${esc(l.note)}</span>` : ''}</th>
  <td class="line-value">${l.amount < 0 ? '&minus;' : ''}${formatMoney(Math.abs(l.amount), locale)}</td>
</tr>`;
    })
    .join('');

  const secondaryHtml = secondary
    .map((s) => `<div class="stat"><span class="stat-label">${esc(s.label)}</span><span class="stat-value">${esc(s.value)}</span></div>`)
    .join('');

  const warnings = res.warnings.length
    ? `<div class="callouts">${res.warnings.map((w) => `<p class="callout callout--warn">${esc(w)}</p>`).join('')}</div>`
    : '';

  const notes = res.notes.length
    ? `<div class="callouts">${res.notes.map((n) => `<p class="callout callout--note">${esc(n)}</p>`).join('')}</div>`
    : '';

  return `<div class="result-card">
  <div class="result-headline">
    <span class="result-label">${esc(headlineLabel)}</span>
    <output class="result-value" id="result-headline">${esc(headline)}</output>
  </div>
  ${waterfall(res, locale)}

  ${secondaryHtml ? `<div class="result-stats">${secondaryHtml}</div>` : ''}

  <table class="breakdown">
    <caption class="visually-hidden">Full breakdown of fees, costs, and net result</caption>
    <tbody>${lines}</tbody>
    <tfoot>
      <tr class="line line--total">
        <th scope="row">${esc(headlineLabel)}</th>
        <td class="line-value">${res.totals.net < 0 ? '&minus;' : ''}${formatMoney(Math.abs(res.totals.net), locale)}</td>
      </tr>
    </tfoot>
  </table>

  ${warnings}
  ${notes}
  ${extra}

  <div class="result-actions">
    <button type="button" class="btn btn-small" data-action="copy">Copy breakdown</button>
    <button type="button" class="btn btn-small" data-action="csv">Download CSV</button>
    <button type="button" class="btn btn-small" data-action="print">Print / PDF</button>
    <button type="button" class="btn btn-small" data-action="share">Copy link to these numbers</button>
  </div>
</div>`;
}

/**
 * Report button + modal. Section 1 of the build spec rules out a backend, a
 * server, and any runtime API call — so there is nowhere for a contact form to
 * POST to. The mechanism is a <dialog> that builds a mailto: link at submit
 * time and hands off to the visitor's own mail app.
 *
 * The trigger is a real mailto: <a>, not a <button>, so it still does
 * something useful with JavaScript disabled — app.js intercepts the click to
 * open the nicer form instead, but never removes the working fallback.
 *
 * The address lives in a data attribute rather than in visible link text, so
 * it isn't printed as prose the way the affiliate contact address is.
 */
export function reportBox(site) {
  const email = site.organization?.contactEmail ?? site.author?.email ?? '';
  if (!email) return '';

  return `<div class="report-box">
  <a href="mailto:${esc(email)}" class="btn btn-primary" data-report-open>Report a problem or request a calculator</a>

  <dialog class="report-dialog" data-report-dialog data-report-to="${esc(email)}" aria-labelledby="report-title">
    <form class="report-form" data-report-form novalidate>
      <div class="report-header">
        <h2 id="report-title">Tell us what's wrong</h2>
        <button type="button" class="report-close" data-report-close aria-label="Close">&times;</button>
      </div>

      <div class="report-field">
        <label for="report-type">What is this about?</label>
        <select id="report-type" name="type">
          <option value="wrong-number">A calculator gave the wrong number</option>
          <option value="request">Request a new calculator</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div class="report-field">
        <label for="report-message">Details</label>
        <textarea id="report-message" name="message" rows="6" required
          placeholder="Wrong number: which calculator, what you entered, what it showed, and what the platform actually charged.&#10;Calculator request: which platform or question, and how you'd use it."></textarea>
      </div>

      <p class="report-note">This opens your email app with the message ready to send — there is no server on this site to receive it directly.</p>

      <div class="report-actions">
        <button type="button" class="btn btn-ghost" data-report-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Open email to send</button>
      </div>
    </form>
  </dialog>
</div>`;
}

/* --------------------------------------------------- presets & values --- */

/**
 * One-tap common values for the tool.
 *
 * These exist for a keyword reason: "etsy fees on $50" style queries are
 * individually thin but collectively large, and the keyword spec's own rule is
 * that they belong in the tool as presets rather than as separate pages, which
 * would be doorway-thin.
 *
 * They are <button>s, not links. A link to `?itemPrice=50` would navigate to a
 * statically built page still showing the DEFAULT result until JavaScript
 * applied the parameter — a visitor with JS off would see a URL promising $50
 * and a table showing something else. Buttons simply do nothing without JS,
 * and the server-rendered value sections below carry the same numbers.
 */
export function presetButtons(presets) {
  if (!presets?.values?.length) return '';

  const items = presets.values
    .map((v) => {
      // A preset is either a bare number for `presets.field`, or an object
      // carrying a whole set of fields. The paycheck pages need the second
      // form: "$100,000" is only meaningful alongside a pay frequency, and
      // setting the amount without the frequency would silently answer a
      // different question than the button's label promises.
      if (typeof v === 'object') {
        return `<button type="button" class="preset" data-preset-set="${esc(JSON.stringify(v.set))}">${esc(v.label)}</button>`;
      }
      return `<button type="button" class="preset" data-preset-field="${esc(presets.field)}" data-preset-value="${v}">${
        presets.format ? esc(presets.format(v)) : `$${v}`
      }</button>`;
    })
    .join('');

  return `<div class="presets">
  <span class="presets-label" id="presets-label">${esc(presets.label ?? 'Try a common amount')}</span>
  <div class="preset-row" role="group" aria-labelledby="presets-label">${items}</div>
</div>`;
}

/**
 * Server-rendered answers at specific values.
 *
 * `rows` is precomputed by the build from real engine runs — see
 * buildValueRows() in build/build.mjs. Nothing here is hand-typed, so these
 * sections cannot drift from the calculator above them.
 *
 * Shape follows the GEO rules in the keyword spec: the question is the H2
 * phrased exactly as a person types it, a bolded one-sentence numeric answer
 * sits immediately under it, and the detail is a table rather than prose.
 */
export function valueSections({ anchor, rows, headingFor, answerFor, tableCaption, locale = undefined }) {
  if (!rows?.length) return '';

  const fmt = (n) => formatMoney(n, locale);

  // The anchor value gets the full line-item treatment the spec asks for.
  const a = rows.find((r) => r.value === anchor) ?? rows[0];
  const anchorLines = a.lines
    .map((l) => `<tr><th scope="row">${esc(l.label)}</th><td>&minus;${fmt(Math.abs(l.amount))}</td></tr>`)
    .join('');

  const anchorBlock = `<h2 id="value-anchor">${esc(headingFor(a.value))}</h2>
<p class="answer-inline"><strong>${esc(answerFor(a))}</strong></p>
<div class="table-scroll"><table>
  <caption class="visually-hidden">Fee breakdown on a ${fmt(a.value)} sale</caption>
  <tbody>${anchorLines}</tbody>
  <tfoot>
    <tr><th scope="row">Total fees</th><td>&minus;${fmt(a.fees)}</td></tr>
    <tr><th scope="row">You keep</th><td>${fmt(a.net)}</td></tr>
  </tfoot>
</table></div>`;

  // Every other value is a row in one table rather than its own near-identical
  // section. The spec's own GEO guidance is that a table beats repeated prose,
  // and eight sections differing only in a number is the on-page equivalent of
  // the doorway pages it warns against.
  const allRows = rows
    .map(
      (r) => `<tr${r.value === a.value ? ' data-best' : ''}>
    <th scope="row">${fmt(r.value)}</th>
    <td>&minus;${fmt(r.fees)}</td>
    <td>${r.ratePct.toFixed(1)}%</td>
    <td>${fmt(r.net)}</td>
  </tr>`
    )
    .join('');

  return `${anchorBlock}

<h2>${esc(tableCaption)}</h2>
<div class="table-scroll"><table class="value-table">
  <caption class="visually-hidden">${esc(tableCaption)}</caption>
  <thead><tr>
    <th scope="col">Sale price</th><th scope="col">Fees</th>
    <th scope="col">Fee rate</th><th scope="col">You keep</th>
  </tr></thead>
  <tbody>${allRows}</tbody>
</table></div>`;
}

/* ------------------------------------------------------- content blocks -- */

export function faqSection(faqs) {
  if (!faqs?.length) return '';
  const items = faqs
    .map(
      (f) => `<div class="faq-item">
  <h3>${esc(f.q)}</h3>
  ${f.a}
</div>`
    )
    .join('');
  return `<section class="faqs" aria-labelledby="faq-heading">
  <h2 id="faq-heading">Questions people actually ask about this</h2>
  ${items}
</section>`;
}

export function relatedTools(tools, currentPath) {
  const items = tools
    .filter((t) => t.path !== currentPath)
    .map(
      (t) => `<li><a href="${t.path}">
    <strong>${esc(t.linkLabel ?? t.h1)}</strong>
    <span>${esc(t.blurb)}</span>
  </a></li>`
    )
    .join('');
  return `<nav class="related" aria-labelledby="related-heading">
  <h2 id="related-heading">Related calculators</h2>
  <ul class="related-list">${items}</ul>
</nav>`;
}

/** Source citations with dates. Required on every page that uses a rate. */
/**
 * `derivation` is for the one kind of tool that has no rate card behind it:
 * a page whose maths is a definition rather than a published figure (margin
 * and markup). Such a page still owes the reader a provenance block — the
 * honest one says there is no external source and states the identity used,
 * rather than either omitting the section or dressing up a definition as a
 * citation. Every other page passes real `sources` and never reaches this.
 */
export function sourcesBlock(sources, { effective, verifiedOn, version, derivation = null }) {
  if (!sources?.length && derivation) {
    return `<section class="sources" aria-labelledby="sources-heading">
  <h2 id="sources-heading">Where these numbers come from</h2>
  <p class="source-status source-status--ok">${esc(derivation.note)}</p>
  <ul class="source-list">${derivation.identities.map((i) => `<li><code>${esc(i)}</code></li>`).join('')}</ul>
</section>`;
  }
  if (!sources?.length) return '';
  const items = sources
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" rel="noopener nofollow" target="_blank">${esc(s.label)}</a>${
          s.retrieved ? ` <span class="retrieved">retrieved ${esc(s.retrieved)}</span>` : ''
        }</li>`
    )
    .join('');

  const status = verifiedOn
    ? `<p class="source-status source-status--ok">Rates last checked against the sources below on <time datetime="${esc(verifiedOn)}">${formatDate(verifiedOn)}</time>.</p>`
    : `<p class="source-status source-status--pending"><strong>These rates have not yet been verified against the live source.</strong> They were seeded from published rate cards and are shown here for structure. Check the platform's own fee page before pricing anything.</p>`;

  return `<section class="sources" aria-labelledby="sources-heading">
  <h2 id="sources-heading">Where these numbers come from</h2>
  ${status}
  <p>Rate schedule version <code>${esc(version)}</code>, effective <time datetime="${esc(effective)}">${formatDate(effective)}</time>.</p>
  <ul class="source-list">${items}</ul>
</section>`;
}

export function lastUpdated(page) {
  return `<p class="last-updated">Last updated <time datetime="${esc(page.updated)}">${formatDate(page.updated)}</time></p>`;
}

export function authorLine(site) {
  if (!site.author?.name || site.author.name.startsWith('REPLACE')) {
    return `<p class="byline byline--missing">No author set. Add one in <code>src/data/site.json</code> before launch — a money tool with no named human behind it is screened out of exactly the surfaces you are trying to reach.</p>`;
  }
  return `<p class="byline">Written and maintained by <a href="/about/" rel="author">${esc(site.author.name)}</a>${
    site.author.jobTitle ? `, ${esc(site.author.jobTitle)}` : ''
  }.</p>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
