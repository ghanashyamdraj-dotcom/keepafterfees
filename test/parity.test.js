/**
 * parity.test.js — the server-rendered HTML and the client runtime must agree.
 *
 * The build bakes a computed result into every tool page so that a crawler
 * with no JavaScript still sees a real worked example. The client then
 * recalculates from the same defaults the moment app.js loads. If those two
 * paths ever disagree, the visible number changes on load — which looks like a
 * bug to a user and destroys the credibility of a money tool instantly.
 *
 * This test runs the exact client-side registry the browser runs, then greps
 * the built HTML for the same figures. It requires `npm run build` to have run.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REGISTRY } from '../src/client/registry.js';
import { TOOLS } from '../src/content/tools.js';
import { formatMoney } from '../src/lib/money.js';
import * as rates from '../src/lib/rates.generated.js';

const { site } = rates;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const liveTools = TOOLS.filter((t) => t.status === 'live');

test('client registry covers every calculator referenced by a tool', () => {
  for (const tool of TOOLS) {
    assert.ok(
      REGISTRY[tool.calculator],
      `${tool.id} declares calculator "${tool.calculator}" but nothing is registered for it in src/client/registry.js`
    );
  }
});

test('client registry entries expose the full contract', () => {
  for (const [id, cfg] of Object.entries(REGISTRY)) {
    assert.equal(typeof cfg.run, 'function', `${id}.run must be a function`);
    assert.equal(typeof cfg.headline, 'function', `${id}.headline must be a function`);
    // A string for a tool with one fixed result shape, or a function of the
    // result for one that switches shape — the processor pages carry a
    // forward/reverse toggle and have to relabel the headline with it.
    assert.ok(
      typeof cfg.headlineLabel === 'string' || typeof cfg.headlineLabel === 'function',
      `${id}.headlineLabel must be a string or a function of the result`
    );
    if (cfg.stats) assert.equal(typeof cfg.stats, 'function', `${id}.stats must be a function`);
  }
});

test('every registered calculator runs on its page defaults without throwing', async () => {
  for (const tool of liveTools) {
    const def = (await import(`../src/content/pages/${tool.id}.js`)).default;
    const cfg = REGISTRY[tool.calculator];
    const res = cfg.run(def.defaults);
    assert.ok(res.ok, `${tool.id} failed on its own defaults: ${res.error ?? ''}`);
    assert.equal(typeof cfg.headline(res), 'string');
  }
});

test('built HTML shows exactly the figures the client computes', { skip: !existsSync(dist) && 'run `npm run build` first' }, async () => {
  for (const tool of liveTools) {
    const def = (await import(`../src/content/pages/${tool.id}.js`)).default;
    const cfg = REGISTRY[tool.calculator];
    const res = cfg.run(def.defaults);

    const html = await readFile(join(dist, tool.slug, 'index.html'), 'utf8');

    const headline = html.match(/<output class="result-value"[^>]*>([^<]+)<\/output>/)?.[1]?.trim();
    assert.equal(
      headline,
      cfg.headline(res),
      `${tool.path} headline: HTML says "${headline}", client computes "${cfg.headline(res)}"`
    );

    for (const stat of cfg.stats?.(res) ?? []) {
      assert.ok(
        html.includes(`<span class="stat-value">${stat.value}</span>`),
        `${tool.path} stat "${stat.label}": client computes ${stat.value}, not found in built HTML`
      );
    }

    // Every fee and cost line the engine produces must appear in the HTML too,
    // so a non-JS reader gets the same breakdown, not just the same total.
    // formatMoney(..., cfg.locale) rather than a hardcoded `$` — cfg.locale is
    // undefined for every US tool (formatMoney's own en-US default applies),
    // but a locale-variant registry entry (e.g. amazon-fba-uk) sets it, and a
    // hardcoded `$` would fail every line on a GBP page even though server
    // and client agree perfectly.
    for (const line of res.lines.filter((l) => l.kind !== 'info')) {
      const rendered = formatMoney(Math.abs(line.amount), cfg.locale);
      assert.ok(
        html.includes(rendered),
        `${tool.path} line "${line.label}" (${rendered}) is missing from the built HTML`
      );
    }
  }
});

/**
 * The total row, checked separately from the headline above it.
 *
 * `totals.net` is the wrong figure on any tool whose answer is not a net: a
 * reverse calculator's answer is what to CHARGE, a tax page's is what is OWED,
 * an hourly-rate page's is a RATE rather than the year's revenue. The client
 * registry has expressed that through `totalOverride`/`totalLabel` since those
 * pages were written, but the server template ignored both and rendered
 * `totals.net` regardless — so three shipped pages served one figure to
 * anything that does not run JavaScript and swapped it for another the moment
 * app.js loaded. /freelance-hourly-rate-calculator/ was serving
 * "Your hourly rate $85,000.55" to every AI crawler except Googlebot.
 *
 * The test above never caught it because it only reads the headline and the
 * stats. This one reads the tfoot, which is the row a reader's eye actually
 * lands on when they scroll the breakdown.
 */
test('the total row agrees between server and client', { skip: !existsSync(dist) && 'run `npm run build` first' }, async () => {
  for (const tool of liveTools) {
    const def = (await import(`../src/content/pages/${tool.id}.js`)).default;
    const cfg = REGISTRY[tool.calculator];
    const res = cfg.run(def.defaults);

    const label = (v) => (typeof v === 'function' ? v(res) : v);
    const total = cfg.totalOverride ? cfg.totalOverride(res) : res.totals.net;
    const expectedLabel = label(cfg.totalLabel ?? cfg.headlineLabel);
    const expectedValue = `${total < 0 ? '&minus;' : ''}${formatMoney(Math.abs(total), cfg.locale)}`;

    const html = await readFile(join(dist, tool.slug, 'index.html'), 'utf8');
    const row = html.match(
      /<tfoot>[\s\S]*?<th scope="row">([^<]*)<\/th>[\s\S]*?<td class="line-value">([^<]*)<\/td>/
    );
    assert.ok(row, `${tool.path} has no total row`);

    assert.equal(row[1], expectedLabel,
      `${tool.path} total label: HTML says "${row[1]}", client renders "${expectedLabel}"`);
    assert.equal(row[2], expectedValue,
      `${tool.path} total value: HTML says "${row[2]}", client renders "${expectedValue}"`);
  }
});

/**
 * Three render helpers exist twice on purpose — once server-side so the markup
 * ships in the raw HTML, once client-side so the browser can re-render it. Each
 * copy carries a comment saying it must stay byte-identical to its twin, but a
 * comment cannot enforce anything: `renderQuarterly` had already drifted
 * (formatMoney vs usd — same output, so every other test passed) before this
 * test existed. Compares source text with whitespace normalised, so formatting
 * is free but any change in what gets rendered is not.
 */
test('server and client copies of the shared renderers have not drifted', async () => {
  const read = async (p) => readFile(join(root, p), 'utf8');

  const fnBody = (src, name) => {
    const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(src);
    assert.ok(m, `${name} not found`);
    const open = src.indexOf('{', m.index);
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1); }
    }
    throw new Error(`unbalanced braces in ${name}`);
  };
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  for (const [name, serverPath, clientPath] of [
    ['waterfall', 'src/templates/components.js', 'src/client/app.js'],
    ['renderComparison', 'src/templates/components.js', 'src/client/registry.js'],
    ['renderQuarterly', 'src/templates/components.js', 'src/client/registry.js'],
  ]) {
    assert.equal(
      norm(fnBody(await read(serverPath), name)),
      norm(fnBody(await read(clientPath), name)),
      `${name}() has drifted between ${serverPath} and ${clientPath} — they must render identical markup, so edit both or neither`
    );
  }
});

/**
 * State spokes are rendered by the build from a `spoke(state, rates)` factory
 * and are deliberately NOT entries in TOOLS, so the loop above never sees
 * them. Without this test a spoke could ship the hub's numbers — or every
 * spoke could ship California's — and nothing would fail.
 */
test('state spokes each compute their own state, and the HTML agrees', { skip: !existsSync(dist) && 'run `npm run build` first' }, async (t) => {
  const { PAYCHECK_STATES } = await import('../src/content/tools.js');

  /**
   * PAYCHECK_STATES was emptied on 2026-09-11 — the five spokes were retired as
   * near-duplicates (see the comment on that array). With no spokes there is
   * nothing here to verify, so this skips rather than fails.
   *
   * Everything below is kept rather than deleted. The array is designed to be
   * refilled with genuinely differentiated state pages, and these assertions
   * are exactly what should run when it is.
   *
   * Note the last assertion in this test: it required Texas and Florida to
   * render IDENTICALLY. The duplication that triggered the AdSense violation
   * was not an accident the tests missed — it was a property the tests
   * enforced. Anyone refilling the array should treat that line as the
   * warning it turned out to be.
   */
  if (PAYCHECK_STATES.length === 0) {
    t.skip('PAYCHECK_STATES is empty — no state spokes are generated');
    return;
  }

  const seen = new Map();

  for (const tool of TOOLS.filter((t) => t.status === 'live' && t.hasStateSpokes)) {
    const def = (await import(`../src/content/pages/${tool.id}.js`)).default;
    assert.equal(typeof def.spoke, 'function',
      `${tool.id} declares hasStateSpokes but exports no spoke() factory`);

    const cfg = REGISTRY[tool.calculator];
    for (const code of PAYCHECK_STATES) {
      const state = rates.states[code];
      assert.ok(state, `no rate data for spoke state ${code}`);

      const spoke = def.spoke(state, rates);
      const res = cfg.run(spoke.defaults);
      assert.ok(res.ok, `${spoke.path} failed on its own defaults`);
      assert.equal(spoke.defaults.stateCode, code,
        `${spoke.path} must default to its own state, not the hub's`);

      const html = await readFile(join(dist, spoke.slug, 'index.html'), 'utf8');
      const headline = html.match(/<output class="result-value"[^>]*>([^<]+)<\/output>/)?.[1]?.trim();
      assert.equal(headline, cfg.headline(res),
        `${spoke.path} headline: HTML says "${headline}", client computes "${cfg.headline(res)}"`);

      // The state has to be pinned in the served markup. readForm() rebuilds
      // the engine input from the DOM alone, so a spoke with no stateCode
      // field would silently recalculate against the hub's default state the
      // moment the visitor touches any input.
      assert.match(html, new RegExp(`name="stateCode"[^>]*value="${code}"`),
        `${spoke.path} does not pin stateCode="${code}" in its markup`);

      assert.ok(html.includes(`<link rel="canonical" href="${site.url.replace(/\/$/, '')}${spoke.path}"`),
        `${spoke.path} is missing a self-referencing canonical`);

      seen.set(code, cfg.headline(res));
    }
  }

  // States with genuinely different tax treatment must not render identically.
  assert.notEqual(seen.get('CA'), seen.get('TX'),
    'California and Texas cannot have the same take-home — one has an income tax and the other does not');
  assert.equal(seen.get('TX'), seen.get('FL'),
    'Texas and Florida both levy no income tax, so identical pay must produce identical take-home');
});

test('prose quotes figures that match the engine, not hand-typed numbers', { skip: !existsSync(dist) && 'run `npm run build` first' }, async () => {
  // The Amazon page's worked-example table is generated from the same engine
  // call that feeds the calculator. This guards against the table drifting out
  // of sync with the tool if someone edits one and not the other.
  const { calculateAmazonFBA } = await import('../src/lib/calc/amazon.js');
  const rates = await import('../src/lib/rates.generated.js');
  const def = (await import('../src/content/pages/amazon-fba.js')).default;

  const res = calculateAmazonFBA(def.defaults, rates.amazon);
  const html = await readFile(join(dist, 'amazon-fba-calculator', 'index.html'), 'utf8');

  const example = html.match(/<div class="worked-example">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.ok(example.length > 500, 'worked example section should be substantial');

  for (const [label, value] of [
    ['referral fee', res.perUnit.referral],
    ['fulfillment fee', res.perUnit.fulfillment],
    ['net profit', res.netPerUnit],
    ['break-even price', res.breakEvenPrice],
  ]) {
    assert.ok(
      example.includes(`$${value.toFixed(2)}`) || html.includes(`$${value.toFixed(2)}`),
      `worked example is missing the engine's ${label} of $${value.toFixed(2)}`
    );
  }
});
