/**
 * icons.js — the site's entire iconography, hand-authored.
 *
 * Why hand-authored rather than an icon package or the platforms' own logos:
 *
 *   1. No third-party requests. An icon CDN or webfont would break the
 *      "zero third-party requests" audit check and add a round trip to the
 *      critical path. These are inline SVG, so they cost one gzip'd string.
 *
 *   2. No counterfeit brand marks. The footer states plainly that this site
 *      has no affiliation with Amazon, Etsy, eBay, Shopify, PayPal or Stripe.
 *      Reproducing their trademarks on the cards would quietly contradict
 *      that. Platforms get a monogram tile in a hue that reads as theirs;
 *      categories get a real drawn glyph.
 *
 * Everything is a 24x24 viewBox, stroke-based, and inherits currentColor, so
 * one icon works on every surface without a second variant.
 */

const svg = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

/* ------------------------------------------------------------- brand ----- */

/**
 * The brand mark: a full bar with a wedge taken out of it, and the remainder
 * standing. It draws the actual subject of the site — a gross amount with
 * something removed — instead of the dollar sign every money tool defaults to.
 * Solid fill rather than stroke, because at 18px a stroked mark turns to mush.
 */
export const brandMark = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
  <path d="M4 19V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v10" fill="currentColor" opacity="0.45"/>
  <path d="M10.5 19V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15" fill="currentColor"/>
  <path d="M17 19v-6a1 1 0 0 1 1-1h1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M3 20.5h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/* --------------------------------------------------------- categories ---- */

export const ICONS = {
  /* A storefront awning — marketplaces. */
  marketplace: svg(
    '<path d="M3 9.5 4.6 5.2A1.6 1.6 0 0 1 6.1 4h11.8a1.6 1.6 0 0 1 1.5 1.2L21 9.5"/>' +
    '<path d="M3 9.5h18"/>' +
    '<path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>' +
    '<path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20"/>'
  ),

  /* A card with a stripe — payment processors. */
  processor: svg(
    '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/>' +
    '<path d="M2.5 9.5h19"/>' +
    '<path d="M6 14.5h3.5"/>'
  ),

  /* A person and a clock hand — hourly and day rates. */
  freelance: svg(
    '<circle cx="9" cy="8" r="3.2"/>' +
    '<path d="M3.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h1.6"/>' +
    '<circle cx="17" cy="16" r="4.5"/>' +
    '<path d="M17 14v2.2l1.4 1"/>'
  ),

  /* A payslip with a torn edge — paycheck. */
  paycheck: svg(
    '<path d="M5 3.5h14a1 1 0 0 1 1 1v14.2l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4.5a1 1 0 0 1 1-1Z"/>' +
    '<path d="M8.5 8h7"/><path d="M8.5 11.5h4.5"/>'
  ),

  /* Reverse arrows — the gross-up / charge-to-receive tools. */
  reverse: svg(
    '<path d="M4 8h13a3.5 3.5 0 0 1 0 7h-2"/>' +
    '<path d="M7 5 4 8l3 3"/>' +
    '<path d="M18 18l3-3-3-3" opacity="0.55"/>'
  ),

  /* ------------------------------------------------------------ ui ------ */

  bolt: svg('<path d="M12.5 2.5 5 13.5h5.5L11 21.5 19 10h-5.5l-1-7.5Z" fill="currentColor" fill-opacity="0.18"/>'),

  check: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>'),

  /* A bar with a slice removed — the fee slicer's own mark. */
  slice: svg(
    '<rect x="3" y="9" width="18" height="6" rx="2"/>' +
    '<path d="M13.5 9v6" stroke-dasharray="2 2"/>' +
    '<path d="M3 9v6" opacity="0"/>'
  ),

  source: svg(
    '<path d="M13 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V9L13 3.5Z"/>' +
    '<path d="M13 3.5V9h5.5"/><path d="M8.5 13.5h7"/><path d="M8.5 16.5h4"/>'
  ),

  shield: svg(
    '<path d="M12 3l7 2.8v5.4c0 4.3-2.9 8.2-7 9.3-4.1-1.1-7-5-7-9.3V5.8L12 3Z"/>' +
    '<path d="M9 12.2l2 2 4-4.2"/>'
  ),

  calc: svg(
    '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/>' +
    '<path d="M8 6.5h8"/><path d="M8.5 11h.01"/><path d="M12 11h.01"/><path d="M15.5 11h.01"/>' +
    '<path d="M8.5 14.5h.01"/><path d="M12 14.5h.01"/><path d="M15.5 14.5h.01"/><path d="M8.5 18h7"/>'
  ),

  arrow: svg('<path d="M5 12h13"/><path d="M13 6.5 18.5 12 13 17.5"/>'),
};

/** Look up a category glyph by tool group id, with a sane fallback. */
export function groupIcon(groupId) {
  return ICONS[groupId] ?? ICONS.calc;
}

/**
 * Platform monogram tile. A letter, not a logo — see the header comment.
 * The hue is passed by the caller so the slicer can tint each row without
 * this module knowing anything about the palette.
 */
export function monogram(letter) {
  return `<span class="mono-letter" aria-hidden="true">${letter}</span>`;
}
