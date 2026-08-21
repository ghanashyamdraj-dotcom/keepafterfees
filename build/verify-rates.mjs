/**
 * verify-rates.mjs — refuse to ship rate data that has no provenance.
 *
 * Section 9.5 of the build spec: money tools carry a higher trust bar, which
 * means citing the source, dating it, and stating the limits. That is only
 * enforceable if the build actually checks. This script fails the build when a
 * rate file is missing a version, an effective date, or a source URL — and
 * emits VERIFY.md listing every figure a human still has to confirm against
 * the primary source before launch.
 */

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRates } from './gen-rates.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED = ['version', 'effective', 'sources'];

export async function verify({ strict = false } = {}) {
  const { byLocale, federal, states } = await loadRates();

  // Flatten byLocale so a future en-GB (or any) file gets the same
  // version/effective/sources check automatically — nothing here has to
  // change when a new locale file is added under an existing platform.
  const platformFiles = Object.entries(byLocale).flatMap(([platform, locales]) =>
    Object.entries(locales).map(([locale, data]) => ({ name: `rates/${platform}/${locale}.json`, data }))
  );

  const files = [
    ...platformFiles,
    { name: 'tax/tax-2026.json', data: federal },
    ...Object.entries(states).map(([k, v]) => ({ name: `tax/states/${k.toLowerCase()}.json`, data: v })),
  ];

  const errors = [];
  const unverified = [];

  for (const { name, data } of files) {
    for (const field of REQUIRED) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`${name}: missing required field "${field}"`);
      }
    }

    if (Array.isArray(data.sources)) {
      if (data.sources.length === 0) {
        errors.push(`${name}: "sources" is empty — every rate file needs at least one primary source`);
      }
      data.sources.forEach((s, i) => {
        if (!s.url) errors.push(`${name}: sources[${i}] has no url`);
        if (!s.label) errors.push(`${name}: sources[${i}] has no label`);
      });
    }

    // "partially-verified" stays on the list on purpose. A file where the fee
    // table was confirmed but the fulfilment tables were not is still a file
    // with an unchecked number in it, and dropping it here is how that gets
    // forgotten. Only a plain "verified" with a date clears the checklist.
    const stillOpen = data.confidence === 'needs-verification'
      || data.confidence === 'partially-verified'
      || !data.verifiedOn;

    if (stillOpen) {
      unverified.push({
        name,
        platform: data.platform ?? data.name ?? data.jurisdiction ?? name,
        effective: data.effective,
        sources: data.sources ?? [],
        confidence: data.confidence ?? null,
        note: data.verificationNote ?? data.recheckNote ?? data.note ?? null,
      });
    }
  }

  await writeVerifyDoc(unverified, errors);

  if (errors.length) {
    console.error('\nRate data validation FAILED:\n');
    for (const e of errors) console.error(`  x ${e}`);
    console.error('');
    if (strict) process.exitCode = 1;
    return { ok: false, errors, unverified };
  }

  console.log(`Rate data validation passed for ${files.length} files.`);
  if (unverified.length) {
    console.log(`  ${unverified.length} file(s) still marked needs-verification — see VERIFY.md`);
  }
  return { ok: true, errors: [], unverified };
}

async function writeVerifyDoc(unverified, errors) {
  const lines = [
    '# Rate verification checklist',
    '',
    `_Generated ${new Date().toISOString().slice(0, 10)} by \`npm run verify:rates\`. Do not edit by hand._`,
    '',
    'Every figure in `src/data/` was seeded from published rate cards but **has not been',
    'confirmed against the live source**. Confirm each file below, then set `verifiedOn`',
    'to the date you checked and `confidence` to `"verified"`. The site surfaces both',
    'fields on every tool page, so an unverified file is visible to users.',
    '',
    '**Do not launch with anything on this list unchecked.** A wrong fee rate on a money',
    'tool is the failure mode that costs trust permanently, and it is the one thing on',
    'this site that cannot be fixed by an algorithm.',
    '',
  ];

  if (errors.length) {
    lines.push('## Blocking errors', '');
    for (const e of errors) lines.push(`- [ ] **${e}**`);
    lines.push('');
  }

  lines.push('## Files awaiting verification', '');

  for (const item of unverified) {
    lines.push(`### \`src/data/${item.name}\``);
    lines.push('');
    lines.push(`- **Covers:** ${item.platform}`);
    lines.push(`- **Effective date claimed:** ${item.effective}`);
    if (item.confidence === 'partially-verified') {
      lines.push('- **Status:** partially verified — some figures confirmed against a primary source, others not. The note says which is which.');
    }
    if (item.note) lines.push(`- **Note:** ${item.note}`);
    lines.push('- **Check against:**');
    for (const s of item.sources) {
      lines.push(`  - [ ] [${s.label}](${s.url})`);
    }
    lines.push('');
  }

  lines.push('## Highest-risk figures', '');
  lines.push('These change most often and are the ones to check first:', '');
  lines.push('| Figure | File | Why it is risky |');
  lines.push('|---|---|---|');
  lines.push('| Amazon FBA fulfillment rate card | `rates/amazon/en-US.json` | Revised at least annually, usually in January, and again mid-year. Per-weight-bracket values move by cents that compound across a catalogue. |');
  lines.push('| Amazon referral category rates | `rates/amazon/en-US.json` | Category definitions and price-band thresholds shift. Apparel moved to a three-band structure in 2024. |');
  lines.push('| Mercari seller fee | `rates/resellers/en-US.json` | Changed model twice since 2024 (seller-paid to buyer-paid). Currently seeded as 0% seller fee — this is the single least certain number in the dataset. |');
  lines.push('| Depop seller fee | `rates/resellers/en-US.json` | US and UK differ. US seller fee was removed in 2024; verify it has not returned. |');
  lines.push('| eBay final value fee by category | `rates/ebay/en-US.json` | Category-level rates and the $7,500 threshold are adjusted periodically. |');
  lines.push('| PayPal / Stripe rates | `rates/processors/en-US.json` | Rate changes are announced with 30 days notice and are easy to miss. |');
  lines.push('| Federal brackets & standard deduction | `tax/tax-2026.json` | Published each autumn in an IRS revenue procedure for the following year. **Must be replaced every year.** |');
  lines.push('| Social Security wage base | `tax/tax-2026.json` | Announced by SSA each October. |');
  lines.push('| State brackets | `tax/states/*.json` | Several states index brackets to inflation annually. |');
  lines.push('| CA SDI rate and cap | `tax/states/ca.json` | The wage ceiling was removed in 2024; the rate itself still moves. |');
  lines.push('| NY PFL rate and cap | `tax/states/ny.json` | Reset every year. |');
  lines.push('');
  lines.push('## Annual maintenance');
  lines.push('');
  lines.push('The tax layer is the moat and it decays. Each year:');
  lines.push('');
  lines.push('1. Copy `src/data/tax/tax-2026.json` to the new year, update every figure from the IRS revenue procedure.');
  lines.push('2. Update each file in `src/data/tax/states/`.');
  lines.push('3. Update `taxYear` in `src/data/site.json` so page copy, titles, and schema follow.');
  lines.push('4. Re-run `npm run check`.');
  lines.push('5. Update the visible "last reviewed" date on every tax page — the build does this from `verifiedOn`.');
  lines.push('');

  await writeFile(join(root, 'VERIFY.md'), lines.join('\n'), 'utf8');
}

if (process.argv[1]?.endsWith('verify-rates.mjs')) {
  verify({ strict: true });
}
