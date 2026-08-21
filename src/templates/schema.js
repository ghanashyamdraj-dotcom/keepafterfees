/**
 * schema.js — JSON-LD generation.
 *
 * Deliberate choices, per section 5.3 of the build spec:
 *
 *   - Organization + WebSite + Person are wired together through @id so a
 *     parser can traverse Article -> Person -> Organization. The @id graph is
 *     the part that carries value, not the individual types.
 *   - SoftwareApplication (not WebApplication alone) for the tools themselves.
 *   - BreadcrumbList on every page.
 *   - FAQPage is emitted, with eyes open: Google retired FAQ rich results on
 *     7 May 2026, so this earns ZERO SERP benefit. It stays because the
 *     machine-readable question/answer pairing is still useful to non-Google
 *     retrieval pipelines that parse structured data. Do not build strategy on
 *     it and do not let anyone tell you it lifts rankings.
 *   - No HowTo. Deprecated 2023, dead everywhere.
 */

/** Escape a string for safe embedding inside a <script> block. */
function safeJson(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function organizationGraph(site) {
  const nodes = [
    {
      '@type': 'Organization',
      '@id': `${site.url}/#org`,
      name: site.legalName || site.name,
      alternateName: site.name,
      url: site.url,
      description: site.description,
      ...(site.organization?.sameAs?.length ? { sameAs: site.organization.sameAs } : {}),
      ...(site.organization?.foundingDate ? { foundingDate: site.organization.foundingDate } : {}),
      ...(site.organization?.contactEmail
        ? {
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: site.organization.contactEmail,
              url: `${site.url}/contact/`,
            },
          }
        : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: site.url,
      name: site.name,
      description: site.description,
      inLanguage: site.language,
      publisher: { '@id': `${site.url}/#org` },
    },
  ];

  if (site.author?.name && !site.author.name.startsWith('REPLACE')) {
    nodes.push({
      '@type': 'Person',
      '@id': `${site.url}/about/#person`,
      name: site.author.name,
      url: `${site.url}/about/`,
      ...(site.author.jobTitle ? { jobTitle: site.author.jobTitle } : {}),
      ...(site.author.bio ? { description: site.author.bio } : {}),
      ...(site.author.credentials?.length ? { hasCredential: site.author.credentials } : {}),
      ...(site.author.sameAs?.length ? { sameAs: site.author.sameAs } : {}),
      knowsAbout: [
        'Marketplace seller fees',
        'Payment processing fees',
        'Self-employment tax',
        'Freelance pricing',
      ],
      worksFor: { '@id': `${site.url}/#org` },
    });
  }

  return nodes;
}

export function breadcrumbNode(site, trail) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${site.url}${trail.at(-1).href}#breadcrumb`,
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: `${site.url}${crumb.href}`,
    })),
  };
}

export function softwareApplicationNode(site, page) {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${site.url}${page.path}#app`,
    name: page.appName ?? page.h1,
    url: `${site.url}${page.path}`,
    description: page.description,
    applicationCategory: 'FinanceApplication',
    applicationSubCategory: page.appSubCategory ?? 'Calculator',
    operatingSystem: 'Any — runs in a web browser',
    browserRequirements: 'Requires JavaScript. Works offline after first load.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: site.currency ?? 'USD' },
    ...(page.featureList?.length ? { featureList: page.featureList } : {}),
    ...(page.updated ? { dateModified: page.updated } : {}),
    publisher: { '@id': `${site.url}/#org` },
    ...(site.author?.name && !site.author.name.startsWith('REPLACE')
      ? { author: { '@id': `${site.url}/about/#person` } }
      : {}),
  };
}

export function faqNode(site, page) {
  if (!page.faqs?.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${site.url}${page.path}#faq`,
    mainEntity: page.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) },
    })),
  };
}

export function webPageNode(site, page) {
  return {
    '@type': page.pageType ?? 'WebPage',
    '@id': `${site.url}${page.path}#webpage`,
    url: `${site.url}${page.path}`,
    name: page.title,
    description: page.description,
    inLanguage: site.language,
    isPartOf: { '@id': `${site.url}/#website` },
    ...(page.published ? { datePublished: page.published } : {}),
    ...(page.updated ? { dateModified: page.updated } : {}),
    ...(site.author?.name && !site.author.name.startsWith('REPLACE')
      ? { author: { '@id': `${site.url}/about/#person` } }
      : {}),
    breadcrumb: { '@id': `${site.url}${page.path}#breadcrumb` },
  };
}

/** Build the whole @graph for a page and return a ready <script> tag. */
export function renderSchema(site, page, trail) {
  const graph = [
    ...organizationGraph(site),
    webPageNode(site, page),
    breadcrumbNode(site, trail),
  ];

  if (page.kind === 'tool') graph.push(softwareApplicationNode(site, page));

  const faq = faqNode(site, page);
  if (faq) graph.push(faq);

  if (page.dataset) {
    graph.push({
      '@type': 'Dataset',
      '@id': `${site.url}${page.path}#dataset`,
      name: page.dataset.name,
      description: page.dataset.description,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: { '@id': `${site.url}/#org` },
      ...(page.dataset.temporalCoverage ? { temporalCoverage: page.dataset.temporalCoverage } : {}),
    });
  }

  return `<script type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function stripTags(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
