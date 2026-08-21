/**
 * gen-rates.mjs — compile every JSON rate file into one ES module.
 *
 * Why generate rather than import JSON directly: the same rate data has to be
 * readable by the Node test suite AND by the browser, with no fetch and no
 * import assertions. A generated ES module is the only form both consume
 * identically, which means a test that passes in Node is testing exactly the
 * numbers the browser will use.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * Rate files live at src/data/rates/{platform}/{locale}.json — one directory
 * per marketplace platform, one file per locale that platform is priced in.
 * `byLocale.amazon['en-US']` is the full picture; the flat `fees.amazon`
 * export below is a REFERENCE into that same object (not a second read), so
 * every calculator written against `rates.amazon` keeps working unchanged
 * while a future en-GB file only has to be added, never wired in by hand.
 */
async function loadPlatformRates() {
  const ratesDir = join(dataDir, 'rates');
  const platforms = (await readdir(ratesDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const byLocale = {};
  for (const platform of platforms) {
    const platformDir = join(ratesDir, platform);
    const localeFiles = (await readdir(platformDir)).filter((f) => f.endsWith('.json'));
    byLocale[platform] = {};
    for (const file of localeFiles) {
      byLocale[platform][file.replace('.json', '')] = await readJson(join(platformDir, file));
    }
  }

  // Backward-compatible flat map: fees.amazon === byLocale.amazon['en-US'].
  const fees = {};
  for (const platform of platforms) {
    fees[platform] = byLocale[platform]['en-US'];
  }

  return { byLocale, fees };
}

async function loadLocales() {
  const localeDir = join(dataDir, 'locales');
  const files = (await readdir(localeDir)).filter((f) => f.endsWith('.json'));
  const locales = {};
  for (const file of files) {
    const data = await readJson(join(localeDir, file));
    locales[data.locale ?? file.replace('.json', '')] = data;
  }
  return locales;
}

export async function loadRates() {
  const { byLocale, fees } = await loadPlatformRates();
  const locales = await loadLocales();

  const federal = await readJson(join(dataDir, 'tax', 'tax-2026.json'));

  const stateDir = join(dataDir, 'tax', 'states');
  const stateFiles = (await readdir(stateDir)).filter((f) => f.endsWith('.json'));
  const states = {};
  for (const file of stateFiles) {
    const state = await readJson(join(stateDir, file));
    states[state.state] = state;
  }

  const site = await readJson(join(dataDir, 'site.json'));

  return { fees, byLocale, locales, federal, states, site };
}

export async function generate() {
  const { fees, byLocale, locales, federal, states, site } = await loadRates();
  const platformKeys = Object.keys(fees);

  const banner = `/**
 * AUTO-GENERATED — do not edit.
 * Source: JSON files under src/data/
 * Regenerate with: npm run build  (or node build/gen-rates.mjs)
 *
 * Rate data version: ${federal.version}
 * Generated: ${new Date().toISOString()}
 */\n\n`;

  const body = [
    `export const byLocale = ${JSON.stringify(byLocale, null, 2)};`,
    // Flat exports are references into byLocale, not a second JSON.stringify —
    // rates.amazon === rates.byLocale.amazon['en-US'] structurally, so nothing
    // reading the flat shape (every existing calc-engine call site, and the
    // "every file carries version, effective date, and sources" test) can drift
    // from the nested shape a future locale will read.
    ...platformKeys.map((key) => `export const ${key} = byLocale.${key}['en-US'];`),
    `export const locales = ${JSON.stringify(locales, null, 2)};`,
    `export const federal = ${JSON.stringify(federal, null, 2)};`,
    `export const states = ${JSON.stringify(states, null, 2)};`,
    `export const site = ${JSON.stringify(site, null, 2)};`,
    '',
    `export const RATES = { ${platformKeys.join(', ')}, byLocale, locales, federal, states, site };`,
    'export default RATES;',
  ].join('\n\n');

  const out = join(root, 'src', 'lib', 'rates.generated.js');
  await writeFile(out, banner + body + '\n', 'utf8');
  return { out, fees: platformKeys, states: Object.keys(states), version: federal.version };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('gen-rates.mjs')) {
  generate().then((r) => {
    console.log(`Generated ${r.out}`);
    console.log(`  fee schedules: ${r.fees.join(', ')}`);
    console.log(`  states: ${r.states.join(', ')}`);
    console.log(`  version: ${r.version}`);
  });
}
