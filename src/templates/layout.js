/**
 * layout.js — the page shell.
 *
 * Structure follows section 7 of the build spec exactly:
 *   - main content early in the DOM
 *   - semantic landmarks so a parser can separate content from chrome
 *   - the answer block above any ad slot, hero, or marketing
 *   - CSS inlined in <head> (the whole design system is ~9KB, so an extra
 *     round trip costs more than it saves and LCP is the target)
 *   - JS deferred as a module; the page is complete without it
 */

import { header, breadcrumbs, footer, esc } from './components.js';
import { renderSchema } from './schema.js';
import { spriteSheet } from './icons.js';

export function layout({ site, page, trail, body, css, inlineData = null, hreflang = '', navTools = () => [] }) {
  const canonical = `${site.url}${page.path}`;
  const title = page.title;
  const ogImage = `${site.url}/og/${page.slug ?? 'default'}.png`;

  return `<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${canonical}">
${hreflang ? `${hreflang}\n` : ''}<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(page.ogTitle ?? title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<!-- No apple-touch-icon link. It pointed at /apple-touch-icon.png, which the
     build never writes — a 404 on every page of the site. iOS requires a real
     PNG here (it will not accept the SVG favicon), and this build has no image
     pipeline and no dependencies to add one with. A missing link makes iOS fall
     back to a screenshot; a broken link just costs a failed request. Add the
     link back the moment a real 180x180 PNG exists in the build output. -->
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0B0F17">

<style>${css}</style>
${
  /**
   * The AdSense loader. Deliberately the ONLY third-party request the site
   * makes, and it is `async` so it never blocks the first paint — the audit's
   * render-blocking check still passes and LCP is unaffected.
   *
   * Gated on adSlots.enabled because the same flag flips the Advertising and
   * Your-rights sections of /privacy/. Tying the script and the policy to one
   * switch is what stops the site from serving ads while the policy still says
   * it does not.
   */
  site.adSlots?.enabled && site.adSlots?.clientId
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(site.adSlots.clientId)}" crossorigin="anonymous"></script>\n`
    : ''
}${renderSchema(site, page, trail)}
</head>
<body class="${page.bodyClass ?? ''}">
${spriteSheet}
<a class="skip-link" href="#main">Skip to the calculator</a>

${header(site, page.path, { toolsFor: navTools })}
${breadcrumbs(trail)}

<main id="main">
${body}
</main>

${footer(site)}

${inlineData ? `<script type="application/json" id="page-data">${JSON.stringify(inlineData).replace(/</g, '\\u003c')}</script>` : ''}
<script type="module" src="/assets/client/app.js"></script>
</body>
</html>
`;
}

/**
 * A tool page. The order here is the spec's page structure, and it is not
 * arbitrary — the answer block sits above the ad slot, and the tool sits above
 * the fold with no scrolling required to reach the inputs.
 */
export function toolPage({
  site, page, trail, css, answerBlock, tool, content, rail = '', sidebar = '',
  inlineData, hreflang = '', navTools = () => [],
}) {
  /**
   * Three columns on a wide screen: the in-section sidebar, the tool and its
   * write-up, and the ad rail.
   *
   * The sidebar spans the whole article rather than sitting inside the prose
   * block, because it is navigation for the PAGE and not a note about the
   * text — a visitor who has scrolled to the FAQ should still be one click
   * from the next calculator. It is `position: sticky` against the article's
   * full height, which is only possible while it is a grid sibling of the
   * content rather than a child of it.
   *
   * The prose keeps its own 720px measure inside the middle column. A
   * comparison table can still break out of that measure; the tool itself
   * always does.
   *
   * Below 1080px the sidebar moves BELOW the content as a horizontal strip
   * rather than being hidden — on a phone it is the most useful thing on the
   * page after the calculator itself, and hiding navigation is how a deep
   * page becomes a dead end.
   */
  /**
   * The modifier matters. Without it the grid keeps declaring a sidebar column
   * on a page that has no sidebar, the auto-placement algorithm drops
   * .tool-main into that 224px slot, and the whole article renders in a narrow
   * strip down the left edge with the ad rail sitting where the content should
   * be. That is exactly what happened to /paycheck-calculator/, whose group
   * holds one TOOLS entry and so fell below toolSidebar's two-item floor.
   *
   * A layout should not depend on an optional element being present, so the
   * column count is now a function of whether the sidebar actually rendered.
   */
  const body = `<article class="tool-page">
  <div class="wrap tool-layout${sidebar ? '' : ' tool-layout--no-side'}">
    ${sidebar}

    <div class="tool-main">
      <div class="tool-intro">
        <h1>${esc(page.h1)}</h1>
        ${answerBlock}
      </div>

      ${tool}

      <div class="prose">
        ${content}
      </div>
    </div>

    ${rail ? `<aside class="ad-rail" aria-label="Advertisement">${rail}</aside>` : ''}
  </div>
</article>`;

  return layout({ site, page, trail, body, css, inlineData, hreflang, navTools });
}
