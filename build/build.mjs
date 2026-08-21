/**
 * build.mjs — the static site generator.
 *
 * Zero dependencies by design. The whole point of this hub is that a page is
 * plain HTML containing its complete content, loads in well under the CWV
 * budget, and works offline. A build toolchain with 400 packages is a liability
 * against that goal, not an asset.
 *
 * Output: dist/ — deploy as-is to Cloudflare Pages.
 */

import { mkdir, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate as generateRates } from './gen-rates.mjs';
import { verify } from './verify-rates.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const log = (...a) => console.log(...a);
const warnings = [];

/* --------------------------------------------------------------- helpers -- */

async function writePage(path, html) {
  const dir = join(dist, path.replace(/^\//, '').replace(/\/$/, ''));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
}

/**
 * CSS bundles, one per page type.
 *
 * The whole design system is inlined into every page — that is deliberate, an
 * extra round trip costs more than the bytes and LCP is the target. But it
 * only pays if the bytes are ones the page actually uses. Shipping the
 * homepage's hero and directory rules to 24 pages that render neither added
 * ~11 KB each for nothing.
 *
 *   tool  — the calculators: tokens + base + tool
 *   hub   — home, /tools/, group indexes: tokens + base + home
 *   plain — about, privacy, terms and the rest: tokens + base
 */
async function loadCss() {
  const read = async (f) => readFile(join(root, 'src', 'styles', f), 'utf8');
  const [tokens, base, tool, home] = await Promise.all(
    ['tokens.css', 'base.css', 'tool.css', 'home.css'].map(read)
  );
  const bundle = (...parts) => minifyCss(parts.join('\n'));

  return {
    tool: bundle(tokens, base, tool),
    hub: bundle(tokens, base, home),
    plain: bundle(tokens, base),
  };
}

/** Conservative CSS minification — safe transforms only, no parsing. */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/* ----------------------------------------------------------------- build -- */

export async function build() {
  log('AfterFees build\n');

  // 1. Rate data: validate provenance, then compile to an ES module.
  const v = await verify();
  if (!v.ok) {
    console.error('Build aborted: rate data failed validation.\n');
    process.exitCode = 1;
    return;
  }
  await generateRates();

  // Import AFTER generation so we get the fresh module.
  const rates = await import(`../src/lib/rates.generated.js?t=${Date.now()}`);
  const site = rates.site;

  checkSiteConfig(site);

  // 2. Clean and prepare dist.
  if (existsSync(dist)) await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const css = await loadCss();
  log(`  CSS inlined: tool ${(css.tool.length/1024).toFixed(1)} KB · hub ${(css.hub.length/1024).toFixed(1)} KB · plain ${(css.plain.length/1024).toFixed(1)} KB`);

  // 3. Copy the JS that runs in the browser, preserving import paths.
  await cp(join(root, 'src', 'lib'), join(dist, 'assets', 'lib'), { recursive: true });
  await cp(join(root, 'src', 'client'), join(dist, 'assets', 'client'), { recursive: true });

  // 4. Render pages.
  const { TOOLS, GROUPS, PAYCHECK_STATES } = await import('../src/content/tools.js');
  const urls = [];

  const ctx = { site, rates, css, TOOLS, GROUPS, urls };

  const toolPages = await renderToolPages(ctx);
  const staticPages = await renderStaticPages(ctx);
  const hubPages = await renderHubPages(ctx);

  // 5. Site files.
  await writeRobots(site);
  await writeSitemap(site, urls);
  await writeAssets(site);

  // 6. Report.
  log(`\n  ${toolPages} tool page(s)`);
  log(`  ${hubPages} hub / index page(s)`);
  log(`  ${staticPages} boilerplate page(s)`);
  log(`  ${urls.length} URLs in sitemap.xml`);

  const planned = TOOLS.filter((t) => t.status === 'planned').length;
  if (planned) {
    log(`\n  ${planned} tool(s) registered but not yet written:`);
    for (const t of TOOLS.filter((x) => x.status === 'planned').sort((a, b) => a.order - b.order)) {
      log(`      ${String(t.order).padStart(2)}. ${t.path.padEnd(38)} ${t.id}`);
    }
    log('\n  Each needs a definition in src/content/pages/<id>.js, then status: "live".');
  }

  if (warnings.length) {
    log('\n  Warnings:');
    for (const w of warnings) log(`      ! ${w}`);
  }

  log(`\n  Output: dist/`);
  log(`  Deploy: wrangler pages deploy dist\n`);
}

function checkSiteConfig(site) {
  const walk = (obj, path = '') => {
    for (const [k, val] of Object.entries(obj)) {
      if (typeof val === 'string' && val.includes('REPLACE')) {
        warnings.push(`src/data/site.json: ${path}${k} still contains a placeholder`);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        walk(val, `${path}${k}.`);
      }
    }
  };
  walk(site);

  if (!site.author?.sameAs?.length) {
    warnings.push('site.author.sameAs is empty — entity identity (spec 5.1) needs at least one profile that resolves');
  }
}

/* ------------------------------------------------------------ tool pages -- */

async function renderToolPages({ site, rates, css, TOOLS, urls }) {
  css = css.tool;
  const { toolPage } = await import('../src/templates/layout.js');
  const comps = await import('../src/templates/components.js');
  const { siblingsFor } = await import('../src/content/tools.js');

  let count = 0;

  for (const tool of TOOLS.filter((t) => t.status === 'live')) {
    const modulePath = `../src/content/pages/${tool.id}.js`;
    let def;
    try {
      def = (await import(modulePath)).default;
    } catch (err) {
      warnings.push(`${tool.id} is marked live but src/content/pages/${tool.id}.js failed to load: ${err.message}`);
      continue;
    }

    count += await renderOneToolPage({ tool, def, site, rates, css, TOOLS, urls, toolPage, comps, siblingsFor });

    /**
     * State spokes. A tool declares `hasStateSpokes` in tools.js and exports a
     * `spoke(state, rates)` factory from its page module; each spoke is a full
     * tool page with its own defaults, so buildEngineContext runs the engine
     * per state and the served HTML carries that state's real numbers.
     *
     * Spokes are deliberately NOT entries in TOOLS: siblingsFor() slices that
     * array to build every page's related-links block, so five extra entries
     * would silently rewrite the related links on already-shipped pages (the
     * same trap documented on the amazon-fba-uk entry).
     */
    if (tool.hasStateSpokes && typeof def.spoke === 'function') {
      const { PAYCHECK_STATES } = await import('../src/content/tools.js');
      for (const code of PAYCHECK_STATES) {
        const state = rates.states[code];
        if (!state) {
          warnings.push(`${tool.id}: no rate data for spoke state "${code}" — skipped`);
          continue;
        }
        count += await renderOneToolPage({
          tool, def, site, rates, css, TOOLS, urls, toolPage, comps, siblingsFor,
          overrides: def.spoke(state, rates),
          parent: tool,
        });
      }
    }
  }

  return count;
}

/** Render one tool page (a hub tool, or one of its state spokes). */
async function renderOneToolPage({
  tool, def, site, rates, css, TOOLS, urls, toolPage, comps, siblingsFor,
  overrides = null, parent = null,
}) {
  // `faqs` is resolved in place below, so each call builds a FRESH page object
  // rather than mutating `def` — otherwise the hub's already-resolved FAQ
  // array would leak into every spoke and each state would render the hub's
  // answers with the wrong state's numbers in them.
  const page = { ...tool, ...def, ...(overrides ?? {}), kind: 'tool' };
  const trail = [
    { label: 'Home', href: '/' },
    { label: 'Tools', href: '/tools/' },
    ...(parent ? [{ label: parent.linkLabel ?? parent.h1, href: parent.path }] : []),
    { label: page.linkLabel ?? page.h1, href: page.path },
  ];

  // Run the engine at the page defaults so the HTML ships a real result.
  const engineCtx = await buildEngineContext(tool, page, rates);

  // A page may declare `faqs` as a plain array or as a function of the engine
  // context, so an answer can quote a figure the calculator actually produced
  // instead of a hand-typed one. Resolve it once, before anything reads it:
  // the rendered section and the FAQPage JSON-LD must see the same array.
  if (typeof page.faqs === 'function') page.faqs = page.faqs(engineCtx);

  const groups = typeof page.groups === 'function' ? page.groups(rates) : page.groups;
  const initialResult = comps.resultBlock(engineCtx.example, {
    headlineLabel: engineCtx.headlineLabel,
    headline: engineCtx.headline,
    secondary: engineCtx.stats,
    // Calculators whose registry entry defines an extraRender (the ranked
    // comparison tables) must ship that table in the server HTML too.
    extra: engineCtx.extra ?? '',
    // undefined for every existing (en-US) tool — formatMoney's own
    // default. Only a locale-variant page's engineCtx sets this.
    locale: engineCtx.locale,
  });

  const feeRates = engineCtx.rateSource;

  const body = [
    comps.adSlot(site, 'leaderboard'),
    comps.toolShell({ page, groups, initialResult, site }),
    comps.adSlot(site, 'result'),
  ].join('\n');

  const content = [
    page.content(engineCtx),
    comps.adSlot(site, 'midContent'),
    comps.affiliateSlot(site, tool.id),
    comps.faqSection(page.faqs),
    comps.sourcesBlock(feeRates?.sources, {
      effective: feeRates?.effective,
      verifiedOn: feeRates?.verifiedOn,
      version: feeRates?.version,
      // Only the margin/markup page sets this — see sourcesBlock().
      derivation: engineCtx.derivation,
    }),
    `<footer class="page-footer">${comps.authorLine(site)}${comps.lastUpdated(page)}</footer>`,
    // Spokes link back to their hub tool first, then the hub's siblings —
    // otherwise a state page's only route upward is the breadcrumb.
    comps.relatedTools(
      parent ? [parent, ...siblingsFor(tool.id, 4)] : siblingsFor(tool.id, 5),
      page.path
    ),
    comps.adSlot(site, 'endContent'),
  ].join('\n');

  const html = toolPage({
    site, page, trail, css,
    answerBlock: page.answerBlock(engineCtx),
    tool: body,
    content,
    rail: comps.adSlot(site, 'rail'),
    inlineData: {
      calculator: page.calculator,
      defaults: page.defaults,
      // undefined (omitted from the JSON) for every page with no locale
      // sibling — initLocaleBanner() in app.js no-ops when this is absent.
      localeSiblings: localeBannerData(page, TOOLS),
    },
    hreflang: hreflangCluster(page, TOOLS, site),
  });

  await writePage(page.path, html);
  // Spokes sit one level below their hub in the sitemap's priority ordering.
  urls.push({ loc: page.path, lastmod: page.updated, priority: parent ? '0.7' : '0.9', changefreq: 'monthly' });
  log(`  + ${page.path}`);
  return 1;
}

/**
 * TOOLS entries sharing a `localeFamily` with `page` — the same tool in
 * different locales. The sibling with no explicit `locale` field is treated
 * as the en-US default. Empty array for any page with no family or with no
 * sibling yet, so every consumer of this is a no-op until a locale variant
 * actually exists.
 */
function localeSiblingsFor(page, TOOLS) {
  if (!page.localeFamily) return [];
  const siblings = TOOLS.filter((t) => t.localeFamily === page.localeFamily);
  return siblings.length < 2 ? [] : siblings;
}

/**
 * hreflang cluster for a page that has a locale sibling — required per the
 * locale architecture spec on every variant, including a self-reference and
 * an x-default pointing at the primary.
 */
function hreflangCluster(page, TOOLS, site) {
  const siblings = localeSiblingsFor(page, TOOLS);
  if (!siblings.length) return '';

  const defaultSibling = siblings.find((t) => !t.locale) ?? siblings[0];
  const tags = siblings.map(
    (t) => `<link rel="alternate" hreflang="${(t.locale ?? 'en-US').toLowerCase()}" href="${site.url}${t.path}">`
  );
  tags.push(`<link rel="alternate" hreflang="x-default" href="${site.url}${defaultSibling.path}">`);
  return tags.join('\n');
}

/**
 * Compact sibling data for the client-side locale-suggestion banner —
 * see initLocaleBanner() in src/client/app.js. Deliberately excludes the
 * CURRENT page (a page never suggests itself) and carries only what the
 * banner needs: the locale code to compare against navigator.language,
 * the path to link to, and a short label for the banner text.
 */
function localeBannerData(page, TOOLS) {
  const siblings = localeSiblingsFor(page, TOOLS).filter((t) => t.path !== page.path);
  if (!siblings.length) return undefined;
  return siblings.map((t) => ({
    code: t.locale ?? 'en-US',
    path: t.path,
    label: t.locale === 'en-GB' ? 'UK' : t.locale ?? 'US',
  }));
}

/**
 * Run each tool's engine at its default inputs so the built HTML contains a
 * genuine worked example, and so the prose can quote figures that match the
 * calculator exactly. Section 3.1 of the spec: the explanatory text, the
 * formula, the assumptions, and the worked example must be in the HTML.
 */
/**
 * Run a calculator across a list of values and shape the results for the
 * server-rendered value sections.
 *
 * The point of this helper is that "how much does Etsy take from a $50 sale"
 * is answered on the page by the actual engine, at build time, rather than by
 * a number somebody typed into prose once and never revisited. When a fee
 * schedule changes, these sections change with it or the parity test fails.
 *
 * `fees` counts fee-kind lines only — not the seller's own product or postage
 * costs, which are not the platform's cut and would make the headline rate
 * meaningless.
 */
function buildValueRows({ values, run, field, defaults }) {
  const rows = [];
  for (const value of values) {
    const res = run({ ...defaults, [field]: value });
    if (!res?.ok) continue;
    const lines = res.lines.filter((l) => l.kind === 'fee' && l.amount);
    const fees = lines.reduce((sum, l) => sum + Math.abs(l.amount), 0);
    rows.push({
      value,
      lines,
      fees: Number(fees.toFixed(2)),
      net: Number((value - fees).toFixed(2)),
      ratePct: value > 0 ? (fees / value) * 100 : 0,
    });
  }
  return rows;
}

async function buildEngineContext(tool, page, rates) {
  // Same helpers src/client/registry.js already uses (usd/pctLabel from
  // money.js), rather than a second hand-rolled `$…toFixed(2)` closure here.
  // Without this the server and client headline/stat formatting would
  // silently diverge the moment formatMoney becomes locale-aware.
  const { usd, pctLabel } = await import('../src/lib/money.js');
  const money = (v) => (v === null || v === undefined ? '—' : usd(v));
  const pct = (v) => (v === null || v === undefined ? '—' : pctLabel(v, 1));

  switch (tool.calculator) {
    case 'amazon-fba': {
      const { calculateAmazonFBA, resolveSizeTier } = await import('../src/lib/calc/amazon.js');
      const example = calculateAmazonFBA(page.defaults, rates.amazon);
      const tier = resolveSizeTier(page.defaults, rates.amazon);
      return {
        example, tier, rates, rateSource: rates.amazon,
        headlineLabel: 'Net profit per unit',
        headline: money(example.netPerUnit),
        stats: [
          { label: 'Margin', value: pct(example.totals.margin) },
          { label: 'ROI', value: pct(example.totals.roi) },
          { label: 'Break-even', value: money(example.breakEvenPrice) },
        ],
      };
    }

    case 'amazon-fba-uk': {
      // Distinct calculator id from 'amazon-fba' rather than a locale flag on
      // the same id — the client REGISTRY entry that runs this page's live
      // recalculation is looked up by this id, and a registry entry closes
      // over one fixed rates object at module load. Reusing 'amazon-fba'
      // would mean a UK visitor's every input change gets computed against
      // US rates. See registry.js for the matching entry.
      const { calculateAmazonFBA, resolveSizeTier } = await import('../src/lib/calc/amazon.js');
      const { formatMoney } = await import('../src/lib/money.js');
      const gbRates = rates.byLocale.amazon['en-GB'];
      const locale = rates.locales['en-GB'];
      const gbp = (v) => (v === null || v === undefined ? '—' : formatMoney(v, locale));
      const example = calculateAmazonFBA(page.defaults, gbRates, { formatMoney: gbp });
      const tier = resolveSizeTier(page.defaults, gbRates);
      return {
        // `rates` here is the GB platform slice, not the full generated
        // module — a deliberate difference from the 'amazon-fba' case above.
        // Each case's `rates` field is a private contract with its own page
        // file's content()/faqs()/answerBlock(), and amazon-fba-uk.js's prose
        // reads rates.referral/rates.storage/rates.effective directly, the
        // same way amazon-fba.js reads rates.amazon.* from the full module.
        example, tier, rates: gbRates, rateSource: gbRates, locale,
        headlineLabel: 'Net profit per unit',
        headline: gbp(example.netPerUnit),
        stats: [
          { label: 'Margin', value: pct(example.totals.margin) },
          { label: 'ROI', value: pct(example.totals.roi) },
          { label: 'Break-even', value: gbp(example.breakEvenPrice) },
        ],
      };
    }

    case 'etsy-fees': {
      const { calculateEtsy } = await import('../src/lib/calc/etsy.js');
      const d = page.defaults;
      const example = calculateEtsy(d, rates.etsy);

      // Same buyer total, split two ways — powers the free-shipping table.
      const separate = calculateEtsy(
        { ...d, itemPrice: d.itemPrice - d.shippingCost, shippingCharged: d.shippingCost },
        rates.etsy
      );
      const bundled = calculateEtsy({ ...d, shippingCharged: 0 }, rates.etsy);

      // Clean baseline for the "fees on $X" sections: item price only, no
      // shipping, gift wrap or sales tax. Anyone typing "etsy fees on $50"
      // means a $50 item, and folding extras in would answer a different
      // question than the one the heading asks.
      const bare = {
        quantity: 1, shippingCharged: 0, shippingCost: 0, materialsCost: 0,
        giftWrap: 0, salesTaxCollected: 0, autoRenew: true, offsiteAds: false,
      };
      const valueRows = buildValueRows({
        values: [10, 20, 25, 50, 100, 200, 500, 1000],
        field: 'itemPrice',
        defaults: bare,
        run: (input) => calculateEtsy(input, rates.etsy),
      });
      // The spec's headline LLM prompt is the offsite-ads case specifically.
      const withAds = calculateEtsy({ ...bare, itemPrice: 50, offsiteAds: true }, rates.etsy);

      const { valueSections } = await import('../src/templates/components.js');

      return {
        example, rates, rateSource: rates.etsy,
        valueRows,
        valueSections: valueSections({
          anchor: 50,
          rows: valueRows,
          headingFor: (v) => `How much does Etsy take from a $${v} sale?`,
          answerFor: (r) =>
            `Etsy takes $${r.fees.toFixed(2)} from a $${r.value} sale — ${r.ratePct.toFixed(1)}% — leaving you $${r.net.toFixed(2)} before your own materials and postage costs.`,
          tableCaption: 'Etsy fees at every common sale price',
        }),
        offsiteAdsAt50: {
          fees: withAds.totals.fees,
          net: withAds.totals.net,
          ratePct: (withAds.totals.fees / 50) * 100,
        },
        freeShippingComparison: {
          separate: { fees: separate.totals.fees, net: separate.totals.net },
          bundled: { fees: bundled.totals.fees, net: bundled.totals.net },
          delta: Number((bundled.totals.net - separate.totals.net).toFixed(2)),
        },
        headlineLabel: 'Your profit',
        headline: money(example.totals.net),
        stats: [
          { label: 'Etsy takes', value: money(example.totals.fees) },
          { label: 'Fee rate', value: pct(example.totals.effectiveFeeRate) },
          { label: 'Margin', value: pct(example.totals.margin) },
        ],
      };
    }

    case 'ebay-fees': {
      const { calculateEbay, compareStoreTiers } = await import('../src/lib/calc/ebay.js');
      const d = page.defaults;
      const example = calculateEbay(d, rates.ebay);

      // The same order with no sales tax collected. Isolates the final value
      // fee eBay charges on tax that only ever passes through the account —
      // the page's non-commodity section is built on the difference.
      const exampleNoTax = calculateEbay({ ...d, salesTaxCollected: 0 }, rates.ebay);

      const lineAmount = (id) => Math.abs(example.lines.find((l) => l.id === id)?.amount ?? 0);
      example.fvf = lineAmount('fvf');
      example.perOrder = lineAmount('per-order');

      // Bare item sale: no shipping charged, no sales tax. "ebay fees on $100"
      // means a $100 item, and folding the extras in would answer a different
      // question than the heading asks.
      const bare = {
        shippingCharged: 0, shippingCost: 0, itemCost: 0, salesTaxCollected: 0,
        categoryId: 'default', storeTier: 'none', promotedRate: 0,
        international: false, belowStandard: false, insertionFees: 0,
        amortiseStore: false,
      };
      const valueRows = buildValueRows({
        values: [10, 25, 50, 100, 200, 500, 1000],
        field: 'salePrice',
        defaults: bare,
        run: (input) => calculateEbay(input, rates.ebay),
      });

      // Fee by category at a fixed $100 sale — the "ebay fees for electronics /
      // trading cards / jewelry" query family, as one sortable table rather
      // than eight thin sections.
      const standardSchedule = rates.ebay.finalValueFee.schedules.find((s) => s.id === 'standard');
      const categoryRows = standardSchedule.categories.map((c) => {
        const r = calculateEbay({ ...bare, salePrice: 100, categoryId: c.id }, rates.ebay);
        const fees = r.ok
          ? r.lines.filter((l) => l.kind === 'fee').reduce((s, l) => s + Math.abs(l.amount), 0)
          : 0;
        return {
          id: c.id,
          label: c.label,
          headlineRate: c.tiers[0].rate,
          feesAt100: Number(fees.toFixed(2)),
          netAt100: Number((100 - fees).toFixed(2)),
        };
      }).sort((a, b) => a.feesAt100 - b.feesAt100);

      const { valueSections } = await import('../src/templates/components.js');

      return {
        example, exampleNoTax, rates, rateSource: rates.ebay,
        storeTiers: compareStoreTiers(d, rates.ebay),
        valueRows,
        categoryRows,
        valueSections: valueSections({
          anchor: 100,
          rows: valueRows,
          headingFor: (v) => `How much are eBay fees on a $${v} sale?`,
          answerFor: (r) =>
            `eBay takes $${r.fees.toFixed(2)} from a $${r.value} sale in a standard category — ${r.ratePct.toFixed(1)}% — leaving you $${r.net.toFixed(2)} before postage and what the item cost you.`,
          tableCaption: 'eBay fees at every common sale price',
        }),
        // Must mirror the 'ebay-fees' entry in src/client/registry.js exactly —
        // labels included. The registry is the contract; parity.test.js compares
        // what the build wrote against what the browser recomputes.
        headlineLabel: 'Your profit',
        headline: money(example.totals.net),
        stats: [
          { label: 'eBay payout', value: money(example.totals.payout) },
          { label: 'Total fees', value: money(example.totals.fees) },
          { label: 'Fee rate', value: pct(example.effectiveFvfRate) },
        ],
      };
    }

    case 'reseller-comparison': {
      const { compareResellers, breakEvenByPlatform } = await import('../src/lib/calc/resellers.js');
      const { renderComparison } = await import('../src/templates/components.js');
      const d = page.defaults;
      const example = compareResellers(d, rates.resellers);
      const pctL = (v) => (v === null || v === undefined ? '—' : pctLabel(v, 1));

      // Poshmark's commission switches from a flat fee to 20% at $15, so an
      // item priced just under the threshold can net MORE in absolute dollars
      // than the same item priced just over it. Run both sides of the cliff so
      // the page can state the gap rather than assert that one exists.
      const posh = rates.resellers.platforms.find((p) => p.id === 'poshmark');
      const cliff = posh?.commission?.threshold ?? 15;
      const poshAt = (price) =>
        compareResellers({ ...d, salePrice: price, platforms: ['poshmark'] }, rates.resellers)
          .rows[0];

      return {
        example, rates, rateSource: rates.resellers,
        breakEven: breakEvenByPlatform(d, rates.resellers),
        cliff: {
          threshold: cliff,
          under: poshAt(cliff - 0.01),
          over: poshAt(cliff + 0.49),
        },
        // Mirrors the 'reseller-comparison' entry in src/client/registry.js.
        // usd()/pctLabel() rather than local helpers so the strings the build
        // writes are byte-identical to the ones the browser recomputes.
        headlineLabel: 'Best payout',
        headline: example.best ? `${example.best.label} — ${usd(example.best.netProfit)}` : '—',
        stats: [
          {
            label: 'Spread',
            value: example.best && example.worst ? usd(example.best.netProfit - example.worst.netProfit) : '—',
          },
          { label: 'Platforms', value: String(example.rows?.length ?? 0) },
        ],
        extra: renderComparison(example.rows, {
          columns: [
            { key: 'label', label: 'Platform' },
            { key: 'fees', label: 'Fees', format: (row) => usd(row.fees.totalFees) },
            { key: 'effectiveFeeRate', label: 'Fee rate', format: (row) => pctL(row.effectiveFeeRate) },
            { key: 'payout', label: 'Payout', format: (row) => usd(row.payout) },
            { key: 'netProfit', label: 'Net profit', format: (row) => usd(row.netProfit) },
          ],
          bestKey: 'netProfit',
        }),
      };
    }

    case 'processor-fees': {
      const { calculateProcessorFee, calculateChargeToReceive, compareProcessors, micropaymentsCrossover } =
        await import('../src/lib/calc/processors.js');
      const d = page.defaults;
      const example = calculateProcessorFee(d, rates.processors);

      // Small-payment figures the prose quotes to make the fixed-fee point.
      // Computed rather than typed: the fee is rounded to the cent before the
      // effective rate is taken, so the honest figure is 5.95% on $20, not the
      // 5.94% you get from the un-rounded 3.49% + $0.49.
      const small = calculateProcessorFee({ ...d, amount: 20 }, rates.processors);
      const tiny = calculateProcessorFee({ ...d, amount: 10 }, rates.processors);
      // The "can I pass the fee to my client" answer, solved by the same
      // engine the charge-to-receive page uses rather than restated here.
      const grossUp = calculateChargeToReceive(
        { ...d, targetNet: d.amount, processorId: 'paypal', productId: 'checkout' }, rates.processors);

      // Surcharge stacking applies to any processor that publishes the
      // surcharges; effectiveRate() simply ignores the ones a processor lacks.
      const intl = calculateProcessorFee({ ...d, international: true }, rates.processors);
      const intlFx = calculateProcessorFee({ ...d, international: true, currencyConversion: true }, rates.processors);

      // "How much does PayPal take from $100" / "stripe fees on $1000" — the
      // specific-amount query family, answered in HTML at build time.
      const processorLabel = rates.processors[d.processorId]?.label ?? 'This processor';
      const valueRowsProc = buildValueRows({
        values: [10, 25, 50, 100, 250, 500, 1000, 5000],
        field: 'amount',
        defaults: { ...d, transactions: 1, international: false, currencyConversion: false },
        run: (input) => calculateProcessorFee(input, rates.processors),
      });
      const { valueSections: renderValueSections } = await import('../src/templates/components.js');

      // --- PayPal-only: the micropayments crossover -------------------------
      // Guarded rather than computed unconditionally, because
      // `productId: 'micropayments'` on a processor that has no such product
      // silently falls back to products[0] in getProduct() and would hand the
      // Stripe page a table of plausible-looking nonsense.
      const isPaypal = d.processorId === 'paypal';
      const crossover = isPaypal ? micropaymentsCrossover(rates.processors) : null;
      const asMicropayments = isPaypal
        ? calculateProcessorFee({ ...d, productId: 'micropayments' }, rates.processors) : null;
      const ladder = isPaypal
        ? [5, 10, 15, 20, 25, 26.67, 30, 50, 100].map((amount) => {
            const std = calculateProcessorFee({ ...d, amount, productId: 'checkout' }, rates.processors);
            const micro = calculateProcessorFee({ ...d, amount, productId: 'micropayments' }, rates.processors);
            return {
              amount,
              standard: std.totals.fees,
              micro: micro.totals.fees,
              delta: Number((std.totals.fees - micro.totals.fees).toFixed(2)),
            };
          })
        : null;

      // --- Stripe-only: the ACH cap ----------------------------------------
      // ACH is a percentage capped in absolute dollars, so above the cap point
      // it becomes a flat fee and the effective rate collapses towards zero.
      // Card has no cap, so the gap widens without bound.
      const stripeAch = rates.processors.stripe.products.find((p) => p.id === 'ach');
      const achLadder = d.processorId === 'stripe' && stripeAch?.cap
        ? [100, 500, stripeAch.cap / stripeAch.rate, 1000, 5000, 25000].map((amount) => {
            const card = calculateProcessorFee({ ...d, amount, productId: 'online-domestic' }, rates.processors);
            const ach = calculateProcessorFee({ ...d, amount, productId: 'ach' }, rates.processors);
            return {
              amount,
              card: card.totals.fees,
              ach: ach.totals.fees,
              ratio: ach.totals.fees > 0 ? card.totals.fees / ach.totals.fees : null,
              achEffective: ach.totals.fees / amount,
            };
          })
        : null;
      const achCapBindsAt = stripeAch?.cap ? Number((stripeAch.cap / stripeAch.rate).toFixed(2)) : null;

      return {
        example, rates, rateSource: rates.processors,
        valueRows: valueRowsProc,
        valueSections: renderValueSections({
          anchor: 100,
          rows: valueRowsProc,
          headingFor: (v) => `How much does ${processorLabel} take from a $${v} payment?`,
          answerFor: (r) =>
            `${processorLabel} takes $${r.fees.toFixed(2)} from a $${r.value} payment — ${r.ratePct.toFixed(2)}% — leaving $${r.net.toFixed(2)} in your balance.`,
          tableCaption: `${processorLabel} fees at every common payment amount`,
        }),
        asMicropayments, intl, intlFx, crossover, ladder, small, tiny, grossUp,
        achLadder, achCapBindsAt,
        compare: compareProcessors(d.amount, rates.processors),
        // Mirrors the 'processor-fees' entry in src/client/registry.js exactly.
        headlineLabel: 'You receive',
        headline: money(example.totals.net),
        stats: [
          { label: 'Fee', value: money(example.totals.fees) },
          { label: 'Effective rate', value: pct(example.totals.effectiveFeeRate) },
        ],
      };
    }

    case 'freelance-hourly-rate': {
      const { calculateHourlyRate, salaryEquivalent } = await import('../src/lib/calc/freelance.js');
      const { selfEmploymentTax } = await import('../src/lib/calc/tax.js');
      const d = page.defaults;
      const state = rates.states[(d.stateCode ?? '').toUpperCase()] ?? null;
      const example = calculateHourlyRate(d, rates.federal, state);

      // The W-2 comparison the page is built around. Two salaries: one where
      // the employee buys the same cover the freelancer budgeted, one where an
      // employer carries the premium.
      const opts = {
        filingStatus: d.filingStatus, stateCode: d.stateCode,
        healthInsurance: d.healthInsurance, retirement: d.retirementTarget,
      };
      const salaryOwnCover = salaryEquivalent(d.targetIncome, opts, rates.federal, state);
      const salaryEmployerCover = salaryEquivalent(
        d.targetIncome, { ...opts, healthInsurance: 0 }, rates.federal, state);

      // Self-employment tax charged on the money that buys health insurance.
      // The SE health-insurance deduction is an income tax deduction only — it
      // does not reduce net earnings for SE tax — whereas an employee's
      // Section 125 premium escapes FICA entirely. The gap is the page's point.
      const netBusiness = example.requiredRevenue - d.businessExpenses;
      const seFull = selfEmploymentTax(netBusiness, d.filingStatus, rates.federal);
      const seLessPremium = selfEmploymentTax(netBusiness - d.healthInsurance, d.filingStatus, rates.federal);
      const premiumSeTax = Number((seFull.total - seLessPremium.total).toFixed(2));

      // What each extra week off costs, solved rather than asserted.
      const rateAtWeeksOff = (weeksOff) =>
        calculateHourlyRate({ ...d, weeksOff }, rates.federal, state).hourlyRate;
      const holidayLadder = [0, 2, 4, 6, 8, 10].map((weeksOff) => ({
        weeksOff, hourlyRate: rateAtWeeksOff(weeksOff),
      }));

      return {
        example, rates, rateSource: rates.federal, state,
        salaryOwnCover, salaryEmployerCover,
        premiumSeTax,
        premiumSeRate: premiumSeTax / d.healthInsurance,
        holidayLadder,
        // Mirrors the 'freelance-hourly-rate' entry in src/client/registry.js.
        headlineLabel: 'Your hourly rate',
        headline: `${money(example.hourlyRate)}/hr`,
        stats: [
          { label: 'Day rate', value: money(example.dayRate) },
          { label: 'Week', value: money(example.weekRate) },
          { label: 'Billable hrs', value: example.billableHours ? String(Math.round(example.billableHours)) : '—' },
        ],
      };
    }

    case 'self-employment-tax': {
      const { calculateSelfEmploymentTax } = await import('../src/lib/calc/setax.js');
      const { renderQuarterly } = await import('../src/templates/components.js');
      const d = page.defaults;
      const state = rates.states[(d.stateCode ?? '').toUpperCase()] ?? null;
      const example = calculateSelfEmploymentTax(d, rates.federal, state);

      // The QBI clawback on retirement contributions. A solo 401(k) dollar
      // reduces taxable income by a dollar, but it also reduces qualified
      // business income by a dollar — which shrinks the 20% QBI deduction by
      // 20 cents. So the federal benefit is marginal x 0.8, not marginal.
      // Solved by running the engine both ways rather than asserted.
      const CONTRIB = 10000;
      const fedOnly = (extra) => calculateSelfEmploymentTax({ ...d, ...extra }, rates.federal, null);
      const noContrib = fedOnly({ retirementContrib: 0 });
      const withContrib = fedOnly({ retirementContrib: CONTRIB });
      const noQbiA = fedOnly({ retirementContrib: 0, claimQbi: false });
      const noQbiB = fedOnly({ retirementContrib: CONTRIB, claimQbi: false });

      const retirement = {
        contribution: CONTRIB,
        saved: Number((noContrib.totalTax - withContrib.totalTax).toFixed(2)),
        qbiLost: Number((noContrib.qbi.amount - withContrib.qbi.amount).toFixed(2)),
        marginalRate: noContrib.federal.marginalRate,
        naiveSaving: Number((noContrib.federal.marginalRate * CONTRIB).toFixed(2)),
        savedWithoutQbi: Number((noQbiA.totalTax - noQbiB.totalTax).toFixed(2)),
      };
      retirement.effectiveRate = retirement.saved / CONTRIB;

      // Same contribution including state, where most states do not conform to
      // QBI — so the state side gives the full deduction back.
      const withState = calculateSelfEmploymentTax({ ...d, retirementContrib: CONTRIB }, rates.federal, state);
      retirement.savedWithState = Number((example.totalTax - withState.totalTax).toFixed(2));

      return {
        example, rates, rateSource: rates.federal, state, retirement,
        quarters: rates.federal.estimatedTax.dueDates,
        extra: renderQuarterly(example.quarterly),
        // Mirrors the 'self-employment-tax' entry in src/client/registry.js.
        headlineLabel: 'Total tax owed',
        headline: money(example.totalTax),
        stats: [
          { label: 'SE tax', value: money(example.se?.total) },
          { label: 'Per quarter', value: money(example.quarterly?.perQuarter) },
          { label: 'Effective rate', value: pct(example.effectiveTaxRate) },
        ],
      };
    }

    case 'paycheck': {
      const { calculatePaycheck, compareStates } = await import('../src/lib/calc/paycheck.js');
      const d = page.defaults;
      const state = rates.states[(d.stateCode ?? '').toUpperCase()] ?? null;
      const example = calculatePaycheck(d, rates.federal, state);

      // Two pre-tax dollars that are not worth the same. A traditional 401(k)
      // reduces income tax only; a Section 125 health premium is excluded from
      // income tax AND from the FICA (and state payroll) wage base. Run the
      // same amount both ways rather than asserting the difference.
      const AMOUNT = 5000;
      const perPeriod = AMOUNT / (example.periodsPerYear || 1);
      const plain = calculatePaycheck({ ...d, otherPreTax: 0, healthPremium: 0 }, rates.federal, state);
      const viaRetirement = calculatePaycheck({ ...d, otherPreTax: perPeriod, healthPremium: 0 }, rates.federal, state);
      const viaPremium = calculatePaycheck({ ...d, otherPreTax: 0, healthPremium: perPeriod }, rates.federal, state);
      const fica = (r) => r.annual.socialSecurity + r.annual.medicare;

      const preTax = {
        amount: AMOUNT,
        retirementCost: Number(((plain.annual.takeHome - viaRetirement.annual.takeHome)).toFixed(2)),
        premiumCost: Number(((plain.annual.takeHome - viaPremium.annual.takeHome)).toFixed(2)),
        ficaSavedByRetirement: Number((fica(plain) - fica(viaRetirement)).toFixed(2)),
        ficaSavedByPremium: Number((fica(plain) - fica(viaPremium)).toFixed(2)),
        payrollSavedByPremium: Number((plain.annual.statePayroll - viaPremium.annual.statePayroll).toFixed(2)),
      };
      preTax.advantage = Number((preTax.retirementCost - preTax.premiumCost).toFixed(2));

      return {
        example, rates, rateSource: rates.federal, state, preTax,
        stateComparison: compareStates(d, rates.federal, Object.values(rates.states)),
        // Mirrors the 'paycheck' entry in src/client/registry.js.
        headlineLabel: 'Take-home pay',
        headline: money(example.totals.net),
        stats: [
          { label: 'Per year', value: money(example.annual?.takeHome) },
          { label: 'Tax rate', value: pct(example.effectiveTaxRate) },
          { label: 'Frequency', value: example.payFrequencyLabel ?? '—' },
        ],
      };
    }

    case 'shopify-fees': {
      const { calculateShopify, comparePlans, planCrossovers } = await import('../src/lib/calc/shopify.js');
      const { renderComparison } = await import('../src/templates/components.js');
      const d = page.defaults;
      const example = calculateShopify(d, rates.shopify);
      // renderComparison marks the row with the HIGHEST bestKey. Plan choice
      // is won by the LOWEST monthly cost, so rank on the negation rather than
      // leaving the shared renderer to highlight the dearest plan.
      const plans = comparePlans(d, rates.shopify).map((p) => ({ ...p, cheapness: -p.monthlyTotal }));
      const crossovers = planCrossovers(rates.shopify, {
        channel: d.channel, annualBilling: d.annualBilling,
      });

      // The same order paid through a third-party gateway, so the page can
      // state what Shopify's penalty costs instead of describing it.
      const viaGateway = calculateShopify({ ...d, thirdPartyGateway: true }, rates.shopify);

      return {
        example, rates, rateSource: rates.shopify, plans, crossovers, viaGateway,
        // Mirrors the 'shopify-fees' entry in src/client/registry.js.
        headlineLabel: 'Net per order',
        headline: money(example.totals.net),
        stats: [
          { label: 'Processing', value: money(example.processingFee) },
          { label: 'Platform cost', value: money(example.totalPlatformCost) },
          { label: 'Margin', value: pct(example.totals.margin) },
        ],
        extra: renderComparison(plans, {
          columns: [
            { key: 'label', label: 'Plan' },
            { key: 'planMonthly', label: 'Plan/mo', format: (r) => usd(r.planMonthly) },
            { key: 'perOrderFees', label: 'Fees/order', format: (r) => usd(r.perOrderFees) },
            { key: 'monthlyTotal', label: 'Total/mo', format: (r) => usd(r.monthlyTotal) },
          ],
          bestKey: 'cheapness',
        }),
      };
    }

    case 'charge-to-receive': {
      const { calculateChargeToReceive, calculateProcessorFee } = await import('../src/lib/calc/processors.js');
      const d = page.defaults;
      const example = calculateChargeToReceive(d, rates.processors);

      // Gross-up across a spread of targets and schedules. The point the page
      // makes is that the required markup is always LARGER than the fee rate,
      // and that a capped fee (ACH) flips the naive method from undercharging
      // to overcharging — both shown rather than asserted.
      const ladder = [100, 500, 1000, 5000].map((targetNet) => {
        const r = calculateChargeToReceive({ ...d, targetNet }, rates.processors);
        return {
          targetNet,
          charge: r.chargeAmount,
          fee: r.fee,
          grossUp: (r.chargeAmount - targetNet) / targetNet,
          naiveCharge: r.naive.charge,
          shortfall: r.naive.shortfall,
        };
      });
      const capped = calculateChargeToReceive(
        { ...d, targetNet: 5000, processorId: 'stripe', productId: 'ach' }, rates.processors);
      const forward = calculateProcessorFee(
        { ...d, amount: example.chargeAmount }, rates.processors);

      return {
        example, rates, rateSource: rates.processors, ladder, capped, forward,
        // Mirrors the 'charge-to-receive' entry in src/client/registry.js.
        headlineLabel: 'Charge this amount',
        headline: money(example.chargeAmount),
        stats: [
          { label: 'Fee', value: money(example.fee) },
          { label: 'You receive', value: money(example.actualNet) },
        ],
      };
    }

    case 'day-rate': {
      const { calculateDayRate } = await import('../src/lib/calc/freelance.js');
      const d = page.defaults;
      const state = rates.states[(d.stateCode ?? '').toUpperCase()] ?? null;
      const example = calculateDayRate(d, rates.federal, state);

      // What the same day rate earns across a range of booked days a week —
      // the variable that actually decides a contractor's year, and the one a
      // headline day rate hides completely.
      const utilisation = [2, 3, 4, 5].map((billableDaysPerWeek) => {
        const r = calculateDayRate({ ...d, billableDaysPerWeek }, rates.federal, state);
        return {
          daysPerWeek: billableDaysPerWeek,
          billableDays: r.billableDays,
          revenue: r.annualRevenue,
          takeHome: r.takeHome,
        };
      });

      return {
        example, rates, rateSource: rates.federal, state, utilisation,
        // Mirrors the 'day-rate' entry in src/client/registry.js.
        headlineLabel: 'Your day rate',
        headline: money(example.dayRate ?? example.totals.net),
        stats: [
          { label: 'Hourly', value: money(example.hourlyRate) },
          { label: 'Week', value: money(example.weekRate) },
        ],
      };
    }

    case 'invoice-take-home': {
      const { calculateInvoiceTakeHome } = await import('../src/lib/calc/freelance.js');
      const d = page.defaults;
      const state = rates.states[(d.stateCode ?? '').toUpperCase()] ?? null;
      const example = calculateInvoiceTakeHome(d, rates.federal, state, rates.processors);

      // The whole-year view of the same income, so the page can contrast the
      // AVERAGE rate (what a year costs) with the MARGINAL rate (what the next
      // invoice costs). Setting aside at the average is the common mistake and
      // it is the one that leaves people short in April.
      const annual = calculateInvoiceTakeHome(
        { ...d, invoiceAmount: d.invoiceAmount + d.otherIncome, otherIncome: 0, annual: true },
        rates.federal, state, rates.processors
      );
      const averageRate = annual.totals.revenue > 0 ? annual.totalTax / annual.totals.revenue : 0;
      const setAsideAtAverage = Number((example.received * averageRate).toFixed(2));

      return {
        example, rates, rateSource: rates.federal, state, annual, averageRate,
        setAsideAtAverage,
        shortfall: Number((example.invoiceTax - setAsideAtAverage).toFixed(2)),
        // Mirrors the 'invoice-take-home' entry in src/client/registry.js.
        headlineLabel: 'You keep',
        headline: money(example.takeHome),
        stats: [
          { label: 'Set aside', value: money(example.invoiceTax) },
          { label: 'Marginal rate', value: pct(example.marginalRate) },
        ],
      };
    }

    case 'margin-markup': {
      const { calculateMargin, marginTable } = await import('../src/lib/calc/margin.js');
      const d = page.defaults;
      const example = calculateMargin(d);

      // Pricing by adding a markup equal to the margin you wanted is the
      // single most common pricing error. Both prices are solved so the page
      // can state the profit lost per unit instead of describing the mistake.
      const confusion = [20, 30, 40, 50, 60].map((target) => {
        const asMarkup = calculateMargin({ ...d, mode: 'fromMarkup', targetMarkup: target });
        const asMargin = calculateMargin({ ...d, mode: 'fromMargin', targetMargin: target });
        return {
          target,
          markupPrice: asMarkup.price,
          actualMargin: asMarkup.margin,
          correctPrice: asMargin.price,
          profitLost: Number((asMargin.profit - asMarkup.profit).toFixed(2)),
        };
      });

      return {
        example, rates, rateSource: null, confusion,
        // This tool has no rate card: margin and markup are definitions, not
        // published figures. Stating that plainly is the honest provenance
        // block; inventing citations for arithmetic would be worse than none.
        derivation: {
          note: 'This tool has no external rate data. Margin and markup are definitions rather than published figures, so every number on this page is arithmetic on the cost and price you enter. The identities used are stated in full:',
          identities: [
            'profit = price − cost',
            'markup = profit ÷ cost',
            'margin = profit ÷ price',
            'margin = markup ÷ (1 + markup)',
            'markup = margin ÷ (1 − margin)',
            'break-even units = fixed costs ÷ profit per unit',
          ],
        },
        table: marginTable(d.cost, [d.cost * 1.25, d.cost * 1.5, d.cost * 2, d.cost * 2.5, d.cost * 3]),
        // Mirrors the 'margin-markup' entry in src/client/registry.js.
        headlineLabel: 'Profit per unit',
        headline: money(example.profit),
        stats: [
          { label: 'Margin', value: pct(example.margin) },
          { label: 'Markup', value: pct(example.markup) },
          { label: 'Price', value: money(example.price) },
        ],
      };
    }

    default:
      throw new Error(`buildEngineContext has no case for calculator "${tool.calculator}"`);
  }
}

/* -------------------------------------------------------- hub / index ----- */

/**
 * The hero's live fee slicer.
 *
 * Every row is computed by the same engine that powers that platform's own
 * page — nothing here is a hand-typed percentage, so the hero can never
 * disagree with the calculator it links to.
 *
 * Only platforms whose fee is fully determined by the sale price are included.
 * Amazon FBA is deliberately absent: its fulfilment fee depends on size tier
 * and weight, and inventing a parcel just to fill a hero row would produce a
 * confident number that is wrong for most items. The footnote links to it.
 */
async function slicerRows(amount, rates) {
  const { calculateEtsy } = await import('../src/lib/calc/etsy.js');
  const { calculateEbay } = await import('../src/lib/calc/ebay.js');
  const { calculateShopify } = await import('../src/lib/calc/shopify.js');
  const { calculateProcessorFee } = await import('../src/lib/calc/processors.js');

  const defs = [
    { id: 'etsy', name: 'Etsy', letter: 'E', path: '/etsy-fee-calculator/',
      run: () => calculateEtsy({ itemPrice: amount, autoRenew: true }, rates.etsy) },
    { id: 'ebay', name: 'eBay', letter: 'b', path: '/ebay-fee-calculator/',
      run: () => calculateEbay({ salePrice: amount }, rates.ebay) },
    // Shopify's per-sale cut is only the card rate; the plan is a fixed monthly
    // cost that no per-sale comparison can express. Without saying so, Shopify
    // ties Stripe at the top of this list and looks like the cheapest way to
    // sell, which is exactly the misreading this site exists to prevent.
    { id: 'shopify', name: 'Shopify', letter: 'S', path: '/shopify-fee-calculator/',
      note: `plus $${rates.shopify.plans[0].monthlyMonthly}/mo plan`,
      run: () => calculateShopify({ orderValue: amount, plan: 'basic' }, rates.shopify) },
    { id: 'paypal', name: 'PayPal', letter: 'P', path: '/paypal-fee-calculator/',
      run: () => calculateProcessorFee({ amount, processorId: 'paypal', productId: 'checkout' }, rates.processors) },
    { id: 'stripe', name: 'Stripe', letter: 'st', path: '/stripe-fee-calculator/',
      run: () => calculateProcessorFee({ amount, processorId: 'stripe', productId: 'online-domestic' }, rates.processors) },
  ];

  const rows = [];
  for (const d of defs) {
    const r = d.run();
    if (!r.ok) continue;
    // Fees only — not the seller's own product cost, which is not the
    // platform's cut and would make the comparison meaningless.
    const fees = r.lines
      .filter((l) => l.kind === 'fee')
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    const net = Math.max(0, amount - fees);
    rows.push({ ...d, fee: fees, net, keepPct: amount > 0 ? (net / amount) * 100 : 0, note: d.note ?? null });
  }

  // Highest payout first. On a tie, a platform carrying a fixed monthly cost
  // ranks below one that does not — otherwise Shopify takes the top slot from
  // Stripe on identical card rates while quietly also costing a subscription.
  rows.sort((a, b) => b.net - a.net || (a.note ? 1 : 0) - (b.note ? 1 : 0));
  return rows;
}

function renderSlicer(rows, amount, esc, ICONS) {
  const money = (n) => `$${n.toFixed(2)}`;
  const presets = [25, 50, 100, 250, 500, 1000];

  const rowHtml = rows
    .map((r, i) => `<a class="slicer-row" href="${r.path}"${i === 0 ? ' data-best' : ''} data-slicer-row="${esc(r.id)}">
      <span class="slicer-glyph" aria-hidden="true"><span class="mono-letter">${esc(r.letter)}</span></span>
      <span class="slicer-meta">
        <span class="slicer-name">${esc(r.name)} <span class="slicer-fee" data-slicer-fee>&minus;${money(r.fee)}</span>${r.note ? `<span class="slicer-note">${esc(r.note)}</span>` : ''}</span>
        <span class="slicer-bar" aria-hidden="true">
          <span class="keep" data-slicer-keep style="width:${r.keepPct.toFixed(1)}%"></span>
          <span class="take" data-slicer-take style="width:${(100 - r.keepPct).toFixed(1)}%"></span>
        </span>
      </span>
      <span class="slicer-net" data-slicer-net>${money(r.net)}</span>
    </a>`)
    .join('');

  return `<div class="slicer" data-slicer data-slicer-amount="${amount}">
  <div class="slicer-head">
    <h2 class="slicer-title">${ICONS.slice} Live fee slicer</h2>
    <span class="slicer-live">Live</span>
  </div>

  <div class="slicer-input">
    <label for="slicer-amount">Sale amount</label>
    <div class="slicer-amount">
      <span class="cur" aria-hidden="true">$</span>
      <input id="slicer-amount" type="number" min="1" step="1" value="${amount}"
        inputmode="decimal" data-slicer-input aria-describedby="slicer-note">
    </div>
    <div class="slicer-presets" role="group" aria-label="Common sale amounts">
      ${presets.map((p) => `<button type="button" class="slicer-preset" data-slicer-preset="${p}" aria-pressed="${p === amount}">$${p}</button>`).join('')}
    </div>
  </div>

  <div class="slicer-rows" data-slicer-rows>${rowHtml}</div>

  <p class="slicer-foot" id="slicer-note">Platform fees only — your own product and postage costs are not included.
  Amazon FBA depends on size and weight, so it has <a href="/amazon-fba-calculator/">its own calculator</a>.</p>
</div>`;
}

async function renderHubPages({ site, rates, css, TOOLS, GROUPS, urls }) {
  css = css.hub;
  const { layout } = await import('../src/templates/layout.js');
  const { esc, adSlot, toolCard, filterPills } = await import('../src/templates/components.js');
  const { ICONS } = await import('../src/templates/icons.js');
  const { CARD_CHIPS } = await import('../src/content/tools.js');
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;

  /**
   * The card footer figure. Computed by running the tool's own engine on a
   * $100 sale, so it is the same arithmetic the page itself performs. Tools
   * whose output is not a share of a sale (rates, tax, paycheck) get no
   * footer rather than a forced one.
   */
  const slicerByPlatform = Object.fromEntries((await slicerRows(100, rates)).map((r) => [r.id, r]));
  const statFor = (t) => {
    const map = {
      'etsy-fees': 'etsy', 'ebay-fees': 'ebay', 'shopify-fees': 'shopify',
      'paypal-fees': 'paypal', 'stripe-fees': 'stripe',
    };
    const row = slicerByPlatform[map[t.id]];
    if (!row) return null;
    return {
      label: 'Keeps of $100',
      value: `$${row.net.toFixed(2)}`,
      keepPct: row.keepPct,
      barLabel: `Keeps ${row.keepPct.toFixed(0)} percent of a $100 sale`,
    };
  };

  const card = (t) => toolCard(t, { chips: CARD_CHIPS[t.id] ?? [], stat: statFor(t) });
  const sorted = (list) => list.slice().sort((a, b) => a.order - b.order);

  // --- home ---
  const rows = await slicerRows(100, rates);

  const homeBody = `<section class="hero-section">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="hero-eyebrow">${ICONS.bolt} Every fee, cited to its source</span>
      <h1>What do you <span class="grad">actually keep?</span></h1>
      <p class="hero-lede">${esc(site.description)}</p>
      <ul class="hero-points">
        <li>${ICONS.check}<span><strong>Every rate cited and dated</strong>Not a blog post's guess at what Etsy charges.</span></li>
        <li>${ICONS.check}<span><strong>The arithmetic is shown</strong>Every line item, so you can check it against your own payout.</span></li>
        <li>${ICONS.check}<span><strong>Runs in your browser</strong>No signup, no account, nothing you type is sent anywhere.</span></li>
      </ul>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/tools/">Browse all calculators ${ICONS.arrow}</a>
        <a class="btn btn-ghost" href="/about/">How these numbers are made</a>
      </div>
    </div>
    ${renderSlicer(rows, 100, esc, ICONS)}
  </div>
</section>

<section class="trust-strip">
  <div class="wrap">
    <ul class="trust-list">
      <li>${ICONS.source}<span><strong>Primary sources only</strong><span>Rates read off each platform's own fee page, with the date we checked.</span></span></li>
      <li>${ICONS.calc}<span><strong>Shown, not asserted</strong><span>Every result breaks down line by line, with the formula written out.</span></span></li>
      <li>${ICONS.shield}<span><strong>Nothing leaves your device</strong><span>The maths runs client-side. No accounts, no tracking, no uploads.</span></span></li>
    </ul>
  </div>
</section>

<div class="wrap directory">
  <div class="directory-head">
    <h2>Pick a calculator</h2>
    <p>${esc(site.tagline)} Filter by what you're working out.</p>
  </div>
  ${filterPills(GROUPS, TOOLS)}
  <ul class="tool-grid" data-tool-grid>${sorted(TOOLS).map(card).join('')}</ul>
  <p class="directory-empty" hidden data-filter-empty>No calculators in that category yet.</p>
  ${adSlot(site, 'leaderboard')}
</div>`;

  await writePage('/', layout({
    site,
    page: {
      path: '/', slug: 'home',
      title: `${site.name} — ${site.tagline}`,
      description: site.description,
      h1: 'What do you actually keep?',
      updated: today, published: '2026-08-01',
    },
    trail: [{ label: 'Home', href: '/' }],
    body: homeBody, css,
  }));
  urls.push({ loc: '/', lastmod: today, priority: '1.0', changefreq: 'weekly' });
  count += 1;

  // --- /tools/ and one index per group ---
  const allBody = `<div class="wrap directory">
  <div class="directory-head">
    <h1>All calculators</h1>
    <p>Every tool on ${esc(site.name)}. All free, no signup, and they run entirely in your browser — nothing you type is sent anywhere.</p>
  </div>
  ${filterPills(GROUPS, TOOLS)}
  <ul class="tool-grid" data-tool-grid>${sorted(TOOLS).map(card).join('')}</ul>
  <p class="directory-empty" hidden data-filter-empty>No calculators in that category yet.</p>
  ${adSlot(site, 'leaderboard')}
</div>`;

  await writePage('/tools/', layout({
    site,
    page: {
      path: '/tools/', slug: 'tools',
      title: `All Calculators | ${site.name}`,
      description: 'Every AfterFees calculator: marketplace seller fees, payment processing, freelance rates, self-employment tax, and take-home pay.',
      h1: 'All calculators', updated: today, published: '2026-08-01',
    },
    trail: [{ label: 'Home', href: '/' }, { label: 'Tools', href: '/tools/' }],
    body: allBody, css,
  }));
  urls.push({ loc: '/tools/', lastmod: today, priority: '0.8', changefreq: 'weekly' });
  count += 1;

  for (const g of Object.values(GROUPS)) {
    // The paycheck group's path is a tool page, not a hub — skip it here.
    if (TOOLS.some((t) => t.path === g.path)) continue;

    const items = sorted(TOOLS.filter((t) => t.group === g.id));
    const body = `<div class="wrap directory">
  <div class="directory-head">
    <h1>${esc(g.label)}</h1>
    <p>${esc(g.blurb)}</p>
  </div>
  <ul class="tool-grid">${items.map(card).join('')}</ul>
  ${adSlot(site, 'leaderboard')}
</div>`;

    await writePage(g.path, layout({
      site,
      page: {
        path: g.path, slug: g.id,
        title: `${g.label} Calculators | ${site.name}`,
        description: g.blurb,
        h1: g.label, updated: today, published: '2026-08-01',
      },
      trail: [{ label: 'Home', href: '/' }, { label: g.label, href: g.path }],
      body, css,
    }));
    urls.push({ loc: g.path, lastmod: today, priority: '0.7', changefreq: 'monthly' });
    count += 1;
  }

  return count;
}

/* -------------------------------------------------------- boilerplate ----- */

async function renderStaticPages({ site, css, urls }) {
  css = css.plain;
  const { layout } = await import('../src/templates/layout.js');
  const { pages } = await import('../src/content/legal.js');
  let count = 0;

  for (const page of pages(site)) {
    const body = `<article class="wrap wrap--narrow prose" style="padding-top:2rem">
  <h1>${page.h1}</h1>
  ${page.body}
  <p class="last-updated">Last updated <time datetime="${page.updated}">${new Date(`${page.updated}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time></p>
</article>`;

    await writePage(page.path, layout({
      site, page,
      trail: [{ label: 'Home', href: '/' }, { label: page.h1, href: page.path }],
      body, css,
    }));
    urls.push({ loc: page.path, lastmod: page.updated, priority: '0.3', changefreq: 'yearly' });
    count += 1;
  }

  return count;
}

/* ------------------------------------------------------------ site files -- */

/**
 * robots.txt — search/citation bots explicitly allowed.
 *
 * Section 3.2 of the build spec: blocking OAI-SearchBot, PerplexityBot, or
 * Claude-SearchBot removes you from those engines' answers entirely, and most
 * sites block them by accident. Training bots are allowed here deliberately —
 * for a small ad-monetized site trying to become known, brand familiarity in
 * future models beats withholding the text.
 *
 * IMPORTANT: this file is not the whole story. Cloudflare has shipped defaults
 * that block AI crawlers on new domains. After deploying, verify from outside
 * your network:
 *   curl -A "OAI-SearchBot" https://keepafterfees.com/amazon-fba-calculator/ | grep "dimensional weight"
 */
async function writeRobots(site) {
  const txt = `# ── SEARCH / CITATION BOTS ──
# Allow these or the site does not exist inside AI answers.
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

# ── TRAINING BOTS ──
# Deliberately allowed. There is no ad revenue in a training set, so the trade
# is "brand familiarity in future models" vs "giving away the text". For a new
# site trying to become known, familiarity wins.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Applebot-Extended
Allow: /

# ── Known bad actor ──
User-agent: Bytespider
Disallow: /

User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
  await writeFile(join(dist, 'robots.txt'), txt, 'utf8');
}

async function writeSitemap(site, urls) {
  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${site.url}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`,
    'utf8'
  );
}

async function writeAssets(site) {
  /**
   * Search-engine ownership verification.
   *
   * Written by the build rather than dropped into dist/ by hand, because the
   * build wipes dist/ on every run — a hand-placed file would survive exactly
   * until the next deploy and then silently un-verify the site, at which point
   * Bing quietly stops reporting and nobody notices for weeks.
   */
  if (site.verification?.bing) {
    await writeFile(
      join(dist, 'BingSiteAuth.xml'),
      `<?xml version="1.0"?>\n<users>\n\t<user>${site.verification.bing}</user>\n</users>\n`,
      'utf8'
    );
  }

  // Favicon: the brand mark on the obsidian ground, inline SVG so it costs one
  // request and stays sharp at any size. Same mark as the header — a full bar
  // with a wedge taken out of it, which is the subject of the site.
  await writeFile(
    join(dist, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="${site.name}">
  <rect width="32" height="32" rx="7" fill="#0B0F17"/>
  <g fill="#00E599">
    <rect x="6"    y="17" width="4.5" height="8"  rx="1.2" opacity="0.45"/>
    <rect x="13.7" y="7"  width="4.5" height="18" rx="1.2"/>
    <rect x="21.5" y="13" width="4.5" height="12" rx="1.2" opacity="0.7"/>
    <rect x="4"    y="26.5" width="24" height="2.2" rx="1.1"/>
  </g>
</svg>
`,
    'utf8'
  );

  await writeFile(
    join(dist, 'site.webmanifest'),
    JSON.stringify(
      {
        name: site.name,
        short_name: site.name,
        description: site.description,
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0F17',
        theme_color: '#0B0F17',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      null,
      2
    ),
    'utf8'
  );

  // Cloudflare Pages headers: long cache on hashed-free assets is unsafe, so
  // assets get a short cache and HTML gets revalidation.
  await writeFile(
    join(dist, '_headers'),
    `/assets/*
  Cache-Control: public, max-age=3600, must-revalidate
  X-Content-Type-Options: nosniff

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
`,
    'utf8'
  );

  await writeFile(
    join(dist, '404.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page not found | ${site.name}</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:2rem;color:#0f1c2e}a{color:#0b3d5c}</style>
</head><body><div>
<h1>Page not found</h1>
<p>That calculator does not exist — or has not been built yet.</p>
<p><a href="/tools/">See every calculator</a> &middot; <a href="/">Home</a></p>
</div></body></html>
`,
    'utf8'
  );
}

/* Run only when invoked directly (`node build/build.mjs`), so that dev.mjs can
   import and call build() repeatedly without triggering it on import. Same
   guard pattern as verify-rates.mjs. */
if (process.argv[1]?.endsWith('build.mjs')) {
  build().catch((err) => {
    console.error('\nBuild failed:\n', err);
    process.exitCode = 1;
  });
}
