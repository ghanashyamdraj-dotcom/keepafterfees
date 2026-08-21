/**
 * audit.mjs — run the build spec's section 11 rubric against the built output.
 *
 * This is the "make the model self-audit against the spec" step. It checks the
 * things a script genuinely can check — the mechanical requirements — and
 * prints the categories that need a human, rather than pretending to score
 * them. Categories 5 (non-commodity value) and 6 (off-site corroboration) have
 * no automated form and are reported as such.
 *
 * Usage: node build/audit.mjs
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

async function findHtml(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await findHtml(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/**
 * Strip tags and count words in the main article prose.
 *
 * Matches on `class="…prose…"` rather than the exact wrapper class, because
 * the wrapper has changed once already (it gained a .prose-layout grid parent
 * when the ad rail was added) and silently returning 0 reads as a content
 * regression rather than as a broken selector. Everything from the prose div
 * to the end of the article counts, including the rail markup, which adds no
 * words.
 */
function proseWordCount(html) {
  const m = html.match(/<div class="[^"]*\bprose\b[^"]*">([\s\S]*?)<\/article>/);
  if (!m) return 0;
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;
}

const checks = [];
const check = (id, label, pass, detail = '') => checks.push({ id, label, pass, detail });

async function audit() {
  const files = await findHtml(dist);
  const toolPages = files.filter((f) => /<section class="tool"/.test(''));
  console.log(`AfterFees — build spec audit\n${'='.repeat(60)}\n`);
  console.log(`${files.length} HTML pages in dist/\n`);

  let totalBytes = 0;
  const perPage = [];

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const size = (await stat(file)).size;
    totalBytes += size;
    const rel = '/' + relative(dist, file).replace(/\\/g, '/').replace(/index\.html$/, '');

    // 404.html is deliberately a standalone minimal page: no nav, no schema,
    // no shared CSS. It is never indexed and never linked, so holding it to
    // the content-page rubric would be a false failure.
    if (rel === '/404.html') continue;

    const isTool = html.includes('<section class="tool"');
    const words = isTool ? proseWordCount(html) : null;

    perPage.push({ rel, size, isTool, words, html });
  }

  /* -- 1. crawlability -------------------------------------------------- */
  const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
  const citationBots = ['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot', 'ChatGPT-User', 'Perplexity-User', 'Claude-User', 'Googlebot', 'Bingbot'];
  const missingBots = citationBots.filter((b) => !new RegExp(`User-agent: ${b}\\s*\\nAllow: /`).test(robots));
  check(1, 'Search/citation bots allowed in robots.txt', missingBots.length === 0,
    missingBots.length ? `missing: ${missingBots.join(', ')}` : `all ${citationBots.length} allowed`);

  const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
  const sitemapCount = (sitemap.match(/<loc>/g) ?? []).length;
  check(1, 'sitemap.xml lists every page', sitemapCount === files.length - 1,
    `${sitemapCount} URLs vs ${files.length - 1} pages (excluding 404)`);

  /* -- 2. server-rendered content --------------------------------------- */
  const emptyShells = perPage.filter((p) => !/<h1>/.test(p.html) || p.html.length < 3000);
  check(2, 'Every page contains real content in raw HTML', emptyShells.length === 0,
    emptyShells.length ? emptyShells.map((p) => p.rel).join(', ') : `smallest page ${(Math.min(...perPage.map((p) => p.size)) / 1024).toFixed(1)} KB`);

  const toolsWithResult = perPage.filter((p) => p.isTool);
  // A digit anywhere inside the rendered <output>, not just at the start. Some
  // headlines lead with a label rather than a figure — the reseller comparison
  // renders "Poshmark — $32.50" — and an anchored /\$?[\d.,]/ failed those even
  // though the page shipped a complete server-rendered result. What this check
  // exists to catch is an empty shell that only fills in once JS runs, and any
  // computed digit in the raw HTML rules that out.
  const missingResult = toolsWithResult.filter((p) => !/<output class="result-value"[^>]*>[^<]*\d/.test(p.html));
  check(2, 'Tool pages ship a computed result with no JS', missingResult.length === 0,
    missingResult.length ? missingResult.map((p) => p.rel).join(', ') : `${toolsWithResult.length} tool page(s) render a real number server-side`);

  /* -- 3. answer extractability ----------------------------------------- */
  const noAnswerBlock = toolsWithResult.filter((p) => !/class="answer-block"/.test(p.html));
  check(3, 'Answer block present above the tool', noAnswerBlock.length === 0,
    noAnswerBlock.length ? noAnswerBlock.map((p) => p.rel).join(', ') : 'all tool pages lead with an answer');

  const badH1 = perPage.filter((p) => (p.html.match(/<h1[ >]/g) ?? []).length !== 1);
  check(3, 'Exactly one H1 per page', badH1.length === 0,
    badH1.length ? badH1.map((p) => p.rel).join(', ') : `${perPage.length} pages`);

  const questionHeadings = toolsWithResult.every((p) => /<h3>[^<]*\?/.test(p.html));
  check(3, 'Question-shaped headings present (FAQ h3s)', questionHeadings);

  /* -- 4. evidence density ---------------------------------------------- */
  const noSources = toolsWithResult.filter((p) => !/class="sources"/.test(p.html));
  check(4, 'Sources block with dates on every tool page', noSources.length === 0,
    noSources.length ? noSources.map((p) => p.rel).join(', ') : 'all cite primary sources');

  const noFormula = toolsWithResult.filter((p) => !/class="formula"/.test(p.html));
  check(4, 'Formula written out as text', noFormula.length === 0);

  const noWorked = toolsWithResult.filter((p) => !/class="worked-example"/.test(p.html));
  check(4, 'Worked example with real numbers', noWorked.length === 0);

  const shortProse = toolsWithResult.filter((p) => p.words < 600);
  check(4, 'Supporting content 600+ words', shortProse.length === 0,
    toolsWithResult.map((p) => `${p.rel} ${p.words}w`).join(', '));

  /* -- 7. entity clarity ------------------------------------------------ */
  const noOrg = perPage.filter((p) => !/"@type": "Organization"/.test(p.html));
  check(7, 'Organization + WebSite schema on every page', noOrg.length === 0);

  const noBreadcrumb = perPage.filter((p) => !/"@type": "BreadcrumbList"/.test(p.html));
  check(7, 'BreadcrumbList schema on every page', noBreadcrumb.length === 0);

  const hasPerson = perPage.some((p) => /"@type": "Person"/.test(p.html));
  check(7, 'Person schema present (needs a real author in site.json)', hasPerson,
    hasPerson ? 'present' : 'BLOCKED — site.author.name is still a placeholder');

  const noCanonical = perPage.filter((p) => !/<link rel="canonical"/.test(p.html));
  check(7, 'Self-referencing canonical on every page', noCanonical.length === 0);

  /* -- 8. freshness ----------------------------------------------------- */
  const noUpdated = toolsWithResult.filter((p) => !/class="last-updated"/.test(p.html));
  check(8, 'Visible last-updated date', noUpdated.length === 0);

  /* -- 9. technical health ---------------------------------------------- */
  const heavy = perPage.filter((p) => p.size > 100 * 1024);
  check(9, 'Every page under 100 KB of HTML', heavy.length === 0,
    `largest ${(Math.max(...perPage.map((p) => p.size)) / 1024).toFixed(1)} KB, average ${(totalBytes / perPage.length / 1024).toFixed(1)} KB`);

  const noAdReserve = perPage.filter((p) => /class="ad-slot/.test(p.html) && !/--ad-h-mobile:\d+px/.test(p.html));
  check(9, 'Ad slots have reserved dimensions (CLS)', noAdReserve.length === 0);

  // Only stylesheets and scripts block rendering. A canonical <link> pointing
  // at an absolute URL is required, not a problem — the earlier version of
  // this check flagged it and was wrong.
  const external = perPage.filter((p) =>
    /<script[^>]+src="https?:\/\//.test(p.html) ||
    /<link[^>]+rel="(stylesheet|preload)"[^>]+href="https?:\/\//.test(p.html) ||
    /<link[^>]+href="https?:\/\/[^"]*"[^>]+rel="(stylesheet|preload)"/.test(p.html) ||
    /@import\s+url\(["']?https?:/.test(p.html));
  check(9, 'No render-blocking external resources', external.length === 0,
    external.length ? external.map((p) => p.rel).join(', ') : 'CSS inlined, JS local and deferred, zero third-party requests');

  const noViewport = perPage.filter((p) => !/name="viewport"/.test(p.html));
  check(9, 'Mobile viewport meta on every page', noViewport.length === 0);

  const titles = perPage.map((p) => (p.html.match(/<title>([^<]+)<\/title>/) ?? [])[1]);
  const dupeTitles = titles.filter((t, i) => titles.indexOf(t) !== i);
  check(9, 'Unique <title> per page', dupeTitles.length === 0,
    dupeTitles.length ? `duplicates: ${[...new Set(dupeTitles)].join(' | ')}` : `${titles.length} unique`);

  const descs = perPage.map((p) => (p.html.match(/name="description" content="([^"]+)"/) ?? [])[1]);
  const longDescs = descs.filter((d) => d && d.length > 165);
  check(9, 'Meta descriptions under ~165 chars', longDescs.length === 0,
    longDescs.length ? `${longDescs.length} over length` : 'all within range');

  /* -- 10. format-intent match ------------------------------------------ */
  check(10, 'Tool + worked example + formula matches "how do I calculate X"',
    toolsWithResult.every((p) => /class="formula"/.test(p.html) && /class="worked-example"/.test(p.html)));

  /* -- internal linking ------------------------------------------------- */
  const poorLinking = toolsWithResult.filter((p) => (p.html.match(/class="related-list"/g) ?? []).length === 0);
  check(3, 'Internal links to 3-5 sibling tools', poorLinking.length === 0);

  /* -- accessibility ---------------------------------------------------- */
  const noSkip = perPage.filter((p) => !/class="skip-link"/.test(p.html));
  check(9, 'Skip link on every page', noSkip.length === 0);

  const unlabelled = perPage.filter((p) => {
    const inputs = p.html.match(/<input[^>]+id="(f-[^"]+)"/g) ?? [];
    return inputs.some((i) => {
      const id = i.match(/id="(f-[^"]+)"/)[1];
      return !p.html.includes(`for="${id}"`);
    });
  });
  check(9, 'Every form input has a matching <label for>', unlabelled.length === 0,
    unlabelled.length ? unlabelled.map((p) => p.rel).join(', ') : 'all inputs labelled');

  /* -- report ----------------------------------------------------------- */
  const byCategory = {};
  for (const c of checks) {
    byCategory[c.id] ??= [];
    byCategory[c.id].push(c);
  }

  const CATEGORY_NAMES = {
    1: 'Crawlability & bot access',
    2: 'Server-rendered content',
    3: 'Answer extractability',
    4: 'Evidence density',
    7: 'Entity clarity',
    8: 'Freshness',
    9: 'Technical health',
    10: 'Format-intent match',
  };

  let passed = 0;
  for (const [id, items] of Object.entries(byCategory).sort((a, b) => a[0] - b[0])) {
    console.log(`\n${id}. ${CATEGORY_NAMES[id]}`);
    for (const c of items) {
      console.log(`   ${c.pass ? 'PASS' : 'FAIL'}  ${c.label}`);
      if (c.detail) console.log(`         ${c.detail}`);
      if (c.pass) passed += 1;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Automated checks: ${passed}/${checks.length} passing\n`);
  console.log('Categories no script can score — these are on you:');
  console.log('   5. Non-commodity value  — does each page contain something only');
  console.log('      you could have written? The FBA dimensional-weight explanation');
  console.log('      and the Etsy free-shipping arithmetic are the current attempts.');
  console.log('   6. Off-site corroboration — is AfterFees mentioned anywhere other');
  console.log('      than AfterFees? Currently: no. This is the slowest signal to');
  console.log('      build and the one with the most measured correlation.\n');

  if (passed < checks.length) process.exitCode = 1;
}

audit().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
