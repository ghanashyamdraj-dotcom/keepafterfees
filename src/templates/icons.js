/**
 * icons.js — the site's entire iconography, hand-authored, shipped as one
 * inline SVG sprite.
 *
 * Why hand-authored rather than an icon package or the platforms' own logos:
 *
 *   1. No third-party requests. An icon CDN or webfont would break the
 *      "zero third-party requests" audit check and add a round trip to the
 *      critical path.
 *
 *   2. No counterfeit brand marks. The footer states plainly that this site
 *      has no affiliation with Amazon, Etsy, eBay, Shopify, PayPal or Stripe.
 *      Reproducing their trademarks on the cards would quietly contradict
 *      that. Platforms get a monogram tile; categories get a real drawn glyph.
 *
 * ── Why a sprite ───────────────────────────────────────────────────────────
 *
 * These used to be emitted as a complete <svg> per use site. That was fine
 * while a page carried five of them. With the header mega menu (one glyph per
 * tool, four panels) and the tool-page sidebar (one per row) a single page
 * reached THIRTY-NINE inline SVGs — 11 KB of duplicated path data, which
 * pushed the largest page over the 100 KB budget the audit enforces.
 *
 * So each glyph is defined ONCE per page inside a hidden <svg> emitted at the
 * top of <body>, and every use site is a ~60-byte <use> reference. Same
 * rendering, same currentColor inheritance, same CSS sizing hooks — the
 * outer element is still an <svg>, so every `.thing svg { width: … }` rule
 * keeps working untouched.
 *
 * The sprite has to be INLINE rather than an external file: `<use href="…">`
 * across documents is blocked in every modern browser, and an external sprite
 * would be exactly the extra request this site refuses to make.
 *
 * Everything is a 24x24 viewBox, stroke-based, and inherits currentColor, so
 * one icon works on every surface without a second variant.
 */

/* Stroke presentation attributes live on the <symbol> and inherit down to the
   paths, so they are stated once per glyph rather than once per use. */
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.75" '
  + 'stroke-linecap="round" stroke-linejoin="round"';

/* ------------------------------------------------------------ the glyphs -- */

const GLYPHS = {
  /* A storefront awning — marketplaces. */
  marketplace:
    '<path d="M3 9.5 4.6 5.2A1.6 1.6 0 0 1 6.1 4h11.8a1.6 1.6 0 0 1 1.5 1.2L21 9.5"/>'
    + '<path d="M3 9.5h18"/>'
    + '<path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>'
    + '<path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20"/>',

  /* A card with a stripe — payment processors. */
  processor:
    '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/>'
    + '<path d="M2.5 9.5h19"/>'
    + '<path d="M6 14.5h3.5"/>',

  /* A person and a clock hand — hourly and day rates. */
  freelance:
    '<circle cx="9" cy="8" r="3.2"/>'
    + '<path d="M3.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h1.6"/>'
    + '<circle cx="17" cy="16" r="4.5"/>'
    + '<path d="M17 14v2.2l1.4 1"/>',

  /* A payslip with a torn edge — paycheck. */
  paycheck:
    '<path d="M5 3.5h14a1 1 0 0 1 1 1v14.2l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4.5a1 1 0 0 1 1-1Z"/>'
    + '<path d="M8.5 8h7"/><path d="M8.5 11.5h4.5"/>',

  /* Reverse arrows — the gross-up / charge-to-receive tools. */
  reverse:
    '<path d="M4 8h13a3.5 3.5 0 0 1 0 7h-2"/>'
    + '<path d="M7 5 4 8l3 3"/>'
    + '<path d="M18 18l3-3-3-3" opacity="0.55"/>',

  /* ---------------------------------------------------------------- ui --- */

  calc:
    '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/>'
    + '<path d="M8 6.5h8"/><path d="M8.5 11h.01"/><path d="M12 11h.01"/><path d="M15.5 11h.01"/>'
    + '<path d="M8.5 14.5h.01"/><path d="M12 14.5h.01"/><path d="M15.5 14.5h.01"/><path d="M8.5 18h7"/>',

  arrow: '<path d="M5 12h13"/><path d="M13 6.5 18.5 12 13 17.5"/>',

  /* Down for the nav caret, right for the sidebar rows. Rotating one glyph in
     CSS would need a wrapper element at every use site; two paths is cheaper. */
  caret: '<path d="M6 9.5 12 15.5 18 9.5"/>',
  chevron: '<path d="M9.5 6 15.5 12 9.5 18"/>',
};

/**
 * The brand mark. Solid fill rather than stroke, because at 26px a stroked
 * mark turns to mush — so it carries its own presentation attributes and is
 * not part of the shared STROKE set.
 *
 * It draws the actual subject of the site — a gross amount with something
 * removed, and the remainder standing — instead of the dollar sign every money
 * tool defaults to.
 */
const BRAND_GLYPH =
  '<path d="M4 19V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v10" fill="currentColor" opacity="0.45"/>'
  + '<path d="M10.5 19V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15" fill="currentColor"/>'
  + '<path d="M17 19v-6a1 1 0 0 1 1-1h1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  + '<path d="M3 20.5h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

/* ------------------------------------------------------------- rendering -- */

/**
 * One `<use>` reference. Sized by CSS, coloured by currentColor.
 *
 * No `focusable="false"`. That attribute exists solely to stop IE11 putting
 * inline SVG in the tab order; this site ships ES modules, which IE11 cannot
 * parse at all, so it was 18 bytes of nothing repeated forty times a page.
 */
const ref = (name) => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/**
 * Every glyph, as `{ marketplace: '<svg…>', arrow: '<svg…>', … }`.
 *
 * Kept as an object of ready-to-interpolate strings rather than a function so
 * that every existing `${ICONS.arrow}` call site is unchanged by the move to a
 * sprite — the strings are just much shorter now.
 */
export const ICONS = Object.fromEntries(Object.keys(GLYPHS).map((k) => [k, ref(k)]));

export const brandMark = ref('brand');

/**
 * The sprite itself. Emitted once per page, immediately inside <body>.
 *
 * `aria-hidden` and the inline dimensions matter: without them the sprite is a
 * focusable, announced, 300x150 element at the top of every page.
 */
export const spriteSheet = `<svg class="icon-sprite" aria-hidden="true" width="0" height="0" style="position:absolute">
${Object.entries(GLYPHS)
    .map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24" ${STROKE}>${body}</symbol>`)
    .join('\n')}
<symbol id="i-brand" viewBox="0 0 24 24">${BRAND_GLYPH}</symbol>
</svg>`;

/** Look up a category glyph by tool group id, with a sane fallback. */
export function groupIcon(groupId) {
  return ICONS[groupId] ?? ICONS.calc;
}
