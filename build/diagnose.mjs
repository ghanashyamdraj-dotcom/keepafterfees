/**
 * diagnose.mjs — find the two defects that get a site flagged for thin or
 * duplicate content, and the broken internal links nobody notices.
 *
 * Written on 2026-09-12, after AdSense put keepafterfees.com into "Needs
 * attention" with a Low value content violation. The useful lesson from that
 * episode is that neither defect was visible by reading the site:
 *
 *   - The flagged pages were 2,100-2,300 words each. Word count said they were
 *     fine. They were 80-92% textually identical to each other.
 *   - Every page declared an og:image the build never wrote. A browser never
 *     requests it, so the site looked perfect while every link preview 404'd.
 *
 * Both are trivially measurable and neither is visible to inspection, which is
 * exactly the shape of defect a script should own. Run this against any built
 * static site, not just this one:
 *
 *     node build/diagnose.mjs                 # defaults to ./dist
 *     node build/diagnose.mjs path/to/dist
 *     node build/diagnose.mjs dist --host example.com
 *
 * The host is only needed to tell an absolute internal link from an external
 * one. If omitted it is read from the first canonical tag found, so the tool
 * works on an unfamiliar site with no configuration.
 *
 * Exits non-zero when there are broken internal links or pages below the
 * uniqueness floor, so it can gate a deploy.
 *
 * Zero dependencies, matching the rest of this build.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/* ----------------------------------------------------------------- config -- */

/**
 * Share of a page's text that must be unique to it. Below this a page is
 * mostly sitewide furniture — header, nav, footer, boilerplate — and reads as
 * thin however many words it contains.
 *
 * 20% is where the pages that got this site flagged sat (4-20%) against the
 * pages that were never a problem (66-82%). The gap between those two groups
 * was wide enough that the exact threshold does not matter much; anything in
 * the 15-25% range separates them.
 */
const UNIQUE_FLOOR = 0.20;

/**
 * Pairwise similarity at which two pages are reported as near-duplicates.
 *
 * Measured as the share of the smaller page's shingles that also appear on the
 * larger one, not Jaccard — Jaccard understates when one page is longer, and
 * the case that matters is "these two say the same thing".
 *
 * 0.70 is deliberately below the 0.80-0.92 the real duplicates measured, so a
 * cluster is caught while it is forming rather than after it ships.
 */
const DUPLICATE_AT = 0.70;

/**
 * Shingle length in words. Long enough that a match means genuinely repeated
 * prose rather than a common phrase; short enough to catch lightly reworded
 * boilerplate. 8 is the usual choice for near-duplicate detection and it
 * separated this site's real duplicates cleanly.
 */
const N = 8;

/** Pairwise comparison is O(n^2); warn rather than hang on a large site. */
const PAIRWISE_LIMIT = 400;

/* ------------------------------------------------------------------ utils -- */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shingles(text) {
  const w = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + N <= w.length; i++) out.add(w.slice(i, i + N).join(' '));
  return out;
}

const pct = (n) => (n * 100).toFixed(1) + '%';

/* ------------------------------------------------------------------- main -- */

const args = process.argv.slice(2);
const hostFlag = args.indexOf('--host');
const explicitHost = hostFlag !== -1 ? args[hostFlag + 1] : null;

// The index holding --host's VALUE, which must not be mistaken for the output
// directory. Guarded on hostFlag: when --host is absent indexOf returns -1, and
// an unguarded `hostFlag + 1` is 0 — which excludes argument 0, the position
// the directory normally occupies. That silently fell back to ./dist and
// reported PASS while scanning a directory the caller never asked about.
const hostValueIdx = hostFlag === -1 ? -1 : hostFlag + 1;
const DIST = args.find((a, i) => !a.startsWith('--') && i !== hostValueIdx) ?? 'dist';

if (!existsSync(DIST)) {
  console.error(`diagnose: no such directory "${DIST}" — run the build first, or pass the output directory as the first argument.`);
  process.exit(2);
}

const allFiles = walk(DIST);
// 404.html is excluded: it is never indexed, and a 24-word error page scores
// 100% unique, which puts meaningless noise at the top of the ranking.
const htmlFiles = allFiles
  .filter((f) => f.endsWith('.html') && !/(^|[\\/])404\.html$/.test(f))
  .sort();

if (htmlFiles.length === 0) {
  console.error(`diagnose: no .html files under "${DIST}".`);
  process.exit(2);
}

/**
 * The site's own host. Needed only to classify absolute links. Read from the
 * first canonical tag rather than configured, so this runs unmodified against
 * a site it has never seen.
 */
let HOST = explicitHost;
if (!HOST) {
  for (const f of htmlFiles) {
    const m = readFileSync(f, 'utf8').match(/<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/([^/"']+)/i);
    if (m) { HOST = m[1]; break; }
  }
}

const pages = htmlFiles.map((f) => {
  const rel = '/' + relative(DIST, f).split(sep).join('/');
  const name = rel.replace(/\/index\.html$/, '') || '/';
  const html = readFileSync(f, 'utf8');
  const text = visibleText(html);
  return { name, html, text, sh: shingles(text), words: text ? text.split(/\s+/).length : 0 };
});

console.log(`diagnose — ${pages.length} HTML pages in ${DIST}` + (HOST ? `  (host: ${HOST})` : ''));
console.log('='.repeat(78));

/* ------------------------------------------------- 1. broken internal links -- */

/**
 * Mirrors static-host routing: a path resolves if it names a file, or names a
 * directory holding index.html. That covers plain static servers and the
 * trailing-slash handling used by Workers Static Assets, Netlify and Pages.
 */
function resolves(p) {
  const clean = p.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return existsSync(join(DIST, 'index.html'));
  const rel = clean.replace(/^\//, '').replace(/\/$/, '');
  return [join(DIST, rel), join(DIST, rel, 'index.html')]
    .some((c) => existsSync(c) && statSync(c).isFile());
}

const broken = new Map();
let linkCount = 0;
const noteBroken = (k, page) => {
  if (!broken.has(k)) broken.set(k, new Set());
  broken.get(k).add(page);
};

for (const p of pages) {
  const attrs = [...p.html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  // og:image and friends live in content=, and are the ones a browser never
  // requests — so they rot silently. They are the reason this check exists.
  const metas = [...p.html.matchAll(/content\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]);

  for (const raw of [...attrs, ...metas]) {
    const u = raw.trim();
    if (!u || /^(data:|mailto:|tel:|javascript:|#)/i.test(u)) continue;

    if (/^https?:\/\//i.test(u)) {
      if (!HOST || !u.toLowerCase().includes(HOST.toLowerCase())) continue;
      const path = u.replace(/^https?:\/\/[^/]+/, '') || '/';
      linkCount++;
      if (!resolves(path)) noteBroken(path, p.name);
      continue;
    }
    if (u.startsWith('//')) continue;
    if (!u.startsWith('/')) { noteBroken('RELATIVE -> ' + u, p.name); continue; }
    linkCount++;
    if (!resolves(u)) noteBroken(u, p.name);
  }
}

console.log(`\n1. INTERNAL LINKS — ${linkCount} checked, ${broken.size} broken\n`);
if (broken.size === 0) {
  console.log('   none broken.');
} else {
  for (const [path, from] of [...broken.entries()].sort()) {
    const l = [...from];
    console.log(`   ${path}`);
    console.log(`      from ${l.length} page(s)${l.length <= 3 ? ': ' + l.join(', ') : ''}`);
  }
}

/* ------------------------------------------------------- 2. per-page unique -- */

const docFreq = new Map();
for (const p of pages) for (const s of p.sh) docFreq.set(s, (docFreq.get(s) || 0) + 1);

const scored = pages.map((p) => {
  let uniq = 0;
  for (const s of p.sh) if (docFreq.get(s) === 1) uniq++;
  return { ...p, uniq, total: p.sh.size, ratio: p.sh.size ? uniq / p.sh.size : 0 };
}).sort((a, b) => a.ratio - b.ratio);

const thin = scored.filter((r) => r.ratio < UNIQUE_FLOOR);

console.log(`\n2. UNIQUE TEXT PER PAGE — share found on no other page (floor ${pct(UNIQUE_FLOOR)})\n`);
console.log('   unique   words   page');
console.log('   ' + '-'.repeat(70));
for (const r of scored) {
  const flag = r.ratio < UNIQUE_FLOOR ? ' <-- THIN' : '';
  console.log('   ' + pct(r.ratio).padStart(6) + '   ' + String(r.words).padStart(5) + '   ' + r.name + flag);
}

const boiler = [...docFreq.values()].filter((n) => n >= pages.length - 2).length;
const avg = scored.reduce((s, r) => s + r.total, 0) / scored.length;
console.log(`\n   Sitewide boilerplate is roughly ${pct(boiler / avg)} of an average page.`);
console.log('   Word count is not the measure here. Pages of 2,000+ words routinely');
console.log('   fall below the floor when most of the text is header, nav and footer.');

/* ---------------------------------------------------- 3. near-duplicate pairs -- */

console.log(`\n3. NEAR-DUPLICATE PAGES — pairs sharing over ${pct(DUPLICATE_AT)} of their text\n`);

const dupes = [];
if (pages.length > PAIRWISE_LIMIT) {
  console.log(`   skipped: ${pages.length} pages exceeds the ${PAIRWISE_LIMIT}-page pairwise limit.`);
  console.log('   Raise PAIRWISE_LIMIT if you are willing to wait for O(n^2).');
} else {
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const a = scored[i], b = scored[j];
      if (!a.sh.size || !b.sh.size) continue;
      const [small, large] = a.sh.size <= b.sh.size ? [a, b] : [b, a];
      let inter = 0;
      for (const s of small.sh) if (large.sh.has(s)) inter++;
      const share = inter / small.sh.size;
      if (share >= DUPLICATE_AT) dupes.push({ a: a.name, b: b.name, share });
    }
  }
  if (dupes.length === 0) {
    console.log('   none.');
  } else {
    for (const d of dupes.sort((x, y) => y.share - x.share)) {
      console.log(`   ${pct(d.share).padStart(6)} identical   ${d.a}  <->  ${d.b}`);
    }
    console.log('\n   These need judgement, not obedience. Pages differing only by a swapped');
    console.log('   variable are doorway pages and should be merged. But a homepage that');
    console.log('   previews the same card grid as the directory it links to will also');
    console.log('   appear here, and that one is legitimate. Ask what each page is FOR:');
    console.log('   two pages serving one purpose is the defect, not shared markup.');
  }
}

/* ---------------------------------------------------------------- verdict -- */

/**
 * Only the objective defects set a failing exit code.
 *
 * A broken link is wrong with no argument to be had, and a page below the
 * uniqueness floor is thin whatever it is for. A near-duplicate pair is
 * neither — it can be a doorway cluster or a homepage previewing its own
 * directory, and this script cannot tell those apart. Failing a deploy on it
 * would mean a legitimate pair blocks every build until someone disables the
 * check, which is how a useful check gets deleted.
 */
console.log('\n' + '='.repeat(78));
const failures = [];
if (broken.size) failures.push(`${broken.size} broken internal link${broken.size === 1 ? '' : 's'}`);
if (thin.length) failures.push(`${thin.length} page${thin.length === 1 ? '' : 's'} below ${pct(UNIQUE_FLOOR)} unique`);

if (dupes.length) {
  console.log(`REVIEW: ${dupes.length} near-duplicate pair${dupes.length === 1 ? '' : 's'} — see section 3. Not a failure on its own.`);
}
if (failures.length === 0) {
  console.log('PASS — no broken links, no thin pages.');
  process.exit(0);
}
console.log('FAIL: ' + failures.join(', ') + '.');
process.exit(1);
