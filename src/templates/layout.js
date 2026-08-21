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

export function layout({ site, page, trail, body, css, inlineData = null, hreflang = '' }) {
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
${renderSchema(site, page, trail)}
</head>
<body class="${page.bodyClass ?? ''}">
<a class="skip-link" href="#main">Skip to the calculator</a>

${header(site, page.path)}
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
export function toolPage({ site, page, trail, css, answerBlock, tool, content, rail = '', inlineData, hreflang = '' }) {
  // The article body and the side rail are siblings in a grid, not nested, so
  // the rail can be `position: sticky` against the article's full height. On
  // narrow screens .prose-layout collapses to a block and the rail is hidden
  // outright — see the ad-rail rules in base.css.
  const body = `<article class="tool-page">
  <div class="wrap wrap--narrow">
    <h1>${esc(page.h1)}</h1>
    ${answerBlock}
  </div>

  <div class="wrap">
    ${tool}
  </div>

  <div class="wrap prose-layout">
    <div class="prose">
      ${content}
    </div>
    ${rail ? `<aside class="ad-rail" aria-label="Advertisement">${rail}</aside>` : ''}
  </div>
</article>`;

  return layout({ site, page, trail, body, css, inlineData, hreflang });
}
