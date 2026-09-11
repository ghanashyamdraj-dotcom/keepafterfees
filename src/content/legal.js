/**
 * legal.js — the five boilerplate pages every hub needs.
 *
 * These are not filler. Section 5.2 of the build spec lists them as part of the
 * trust surface a money-adjacent site needs, and AdSense reviews them directly.
 * The disclaimer in particular has to be specific about what the tools do and
 * do not do — a generic "consult a professional" line does neither job.
 *
 * Placeholders marked TODO must be completed before launch.
 */

import { reportBox } from '../templates/components.js';

const UPDATED = '2026-08-02';

export function pages(site) {
  const contactEmail = site.organization?.contactEmail ?? 'hello@keepafterfees.com';
  // Attribution is to the site, not to a person — see authorLine() in
  // components.js for the decision and what it costs. `named` stays here
  // because the config still SUPPORTS a named author; it is simply empty, and
  // an empty name must render the org paragraph rather than a launch warning.
  const named = Boolean(site.author?.name) && !site.author.name.startsWith('REPLACE');

  return [
    {
      path: '/about/',
      slug: 'about',
      pageType: 'AboutPage',
      h1: `About ${site.name}`,
      title: `About ${site.name} — Who Builds These Calculators`,
      description: `Who runs ${site.name}, how the fee and tax data is sourced and maintained, and how the calculators are funded.`,
      updated: UPDATED,
      published: UPDATED,
      body: `
<p><strong>${site.name} answers one question: you charged X — what do you actually keep?</strong>
Every calculator here takes a sale price or an invoice amount and works out what lands in your bank account
after platform fees, payment processing, and tax.</p>

<h2>Who runs this</h2>
${named ? `
<p>${site.name} is built and maintained by ${site.author.name}${site.author.jobTitle ? `, ${site.author.jobTitle}` : ''}.</p>
<p>${site.author.bio}</p>` : `
<p>${site.name} is an independent project, not a company and not a team — one maintainer, working on it
directly, with no investors, no clients among the platforms measured here, and nobody to please by making a
particular platform look good.</p>
<p>${site.author.bio}</p>
<p>The maintainer is not named on the site, and that is a deliberate choice rather than an oversight. It
also means you have no reputation to take on trust, so nothing here asks you to. Every figure is traceable
instead: each rate carries the URL it came from, the date it took effect, and the date a human last checked
it against that source, and every calculator shows its full arithmetic line by line so you can verify the
result against your own payout rather than believe it. Where a figure has not been re-checked recently, the
page says so. Where something is not modelled, the page says that too.</p>
<p>If you find a number that is wrong, <a href="/contact/">tell us</a> — corrections are the fastest route
to making this more accurate, and they get made.</p>`}

<h2>Where the numbers come from</h2>
<p>Every fee rate and tax figure on this site is stored in a versioned data file with a source URL, an
effective date, and the date a human last checked it against that source. Those three facts are printed at
the bottom of every calculator page. If a figure has not been verified since the platform last changed its
rates, the page says so rather than quietly showing a stale number.</p>

<p>Fee schedules come from the platforms' own published pages — Amazon Seller Central, Etsy's fees and
payments policy, eBay's selling fees page, Shopify's pricing page, and the processors' public rate cards.
Tax figures come from the IRS revenue procedure for the relevant tax year, the Social Security
Administration's wage base announcement, and each state's revenue department.</p>

<h2>How this site is maintained</h2>
<p>Fee schedules change without much warning, and tax tables change every year. The build refuses to publish
a rate file that has no source URL or effective date, which is a small guardrail against the most common way
calculator sites rot. Tax data is replaced annually — the tables for a given year are published the previous
autumn, and this site is updated when they are.</p>

<h2>How it makes money</h2>
<p>Display advertising, and affiliate commissions on software that sellers and freelancers use. Affiliate
links are marked as such wherever they appear. They have no effect on the numbers any calculator produces,
and no advertiser has any input into the fee or tax data.</p>

<h2>What this site will not do</h2>
<p>No signup, no email wall, no "unlock the full result" gate. Every calculator runs entirely in your
browser: the figures you type never leave your device and are never sent to a server, because there is no
server. That is also why the tools keep working if you lose your connection after the page has loaded.</p>

<h2>Corrections</h2>
<p>If a number here disagrees with what a platform actually charged you, the platform is right and this site
is wrong. Use the report button on the <a href="/contact/">contact page</a> with the discrepancy and it
will be fixed and re-dated. The full process — what gets checked, what changes, and what happens to the
date on the page — is set out in the <a href="/methodology/">methodology</a>.</p>
`,
    },

    {
      path: '/methodology/',
      slug: 'methodology',
      pageType: 'WebPage',
      h1: 'How these numbers are made',
      title: `Methodology — How ${site.name} Sources and Verifies Every Rate`,
      // No quotation marks in here: they escape to &quot; and the audit counts
      // the escaped form, which put an otherwise fine description one char over.
      description: `Where each fee and tax rate comes from, what the build refuses to publish, what verification means here, and what happens when a number is wrong.`,
      updated: '2026-09-12',
      published: '2026-09-12',
      body: `
<p><strong>Every rate on this site is read from the organisation that charges it, stored with the URL it came
from and the date it was read, and checked by the build before it can ship.</strong> This page sets out that
process in full, including the parts of it that are weaker than you might assume.</p>

<h2>Where does each rate come from?</h2>

<p>Primary sources only. A marketplace fee comes from that marketplace's own published fee page or rate card;
a tax figure comes from the revenue authority that sets it. Nothing here is copied from another calculator,
a summary article, or a competitor's page — not because those are always wrong, but because a figure with no
traceable origin cannot be re-checked when it changes, and rates change constantly.</p>

<p>Each rate file records, for every source it draws on, a label, the exact URL, and the date that URL was
read. That third field is the one most sites omit. A fee schedule without a retrieval date is a claim about
the present tense that nobody can date, which makes it impossible to tell a current figure from a stale one.</p>

<h2>What the build refuses to publish</h2>

<p>The provenance rules are enforced by the build rather than by intention. Before the site is generated,
every rate file is checked for three things:</p>

<ul>
<li>a <strong>version</strong>, so a change to a schedule is a distinct thing that can be pointed at;</li>
<li>an <strong>effective date</strong> — the date the schedule itself came into force, which is not the same
as the date it was read;</li>
<li>at least one <strong>source</strong>, each carrying both a label and a working URL.</li>
</ul>

<p>A file missing any of these does not produce a warning. It fails the build, and the site does not
generate. This is deliberate: a check that can be ignored under time pressure is a check that will be, and
the failure mode it guards against — a plausible-looking number with no origin — is invisible once shipped.</p>

<h2>What "verified" means here, and what it does not</h2>

<p>Passing the provenance check is not the same as being confirmed correct. Those are tracked separately, and
each rate file carries one of three states:</p>

<ul>
<li><strong>Needs verification</strong> — the figures are entered and sourced, but no one has yet sat down
with the primary source and confirmed them line by line.</li>
<li><strong>Partially verified</strong> — some tables in the file were confirmed against the source and
others were not.</li>
<li><strong>Verified</strong>, carrying the date it was confirmed.</li>
</ul>

<p>Partially verified counts as unverified. A file where the commission table was checked but the fulfilment
tables were not still contains an unchecked number, and treating it as done is precisely how that number
survives to be wrong later. Only a full confirmation with a date clears a file from the internal checklist.</p>

<p>This distinction is the honest limit of the site. "Sourced" means the number can be traced. "Verified"
means it was read back against the source on a stated day. The two are not interchangeable, and anywhere a
figure is still pending confirmation the page carrying it says so rather than presenting it as settled.</p>

<h2>Why a correct rate can still go stale</h2>

<p>Platforms change their fees, sometimes with little notice and sometimes without updating every page that
documents them. A retrieval date is therefore not a guarantee that a figure is current — it is a statement of
the last moment anyone could show that it was. The gap between that date and today is a real source of error,
and it is published on every page for exactly that reason.</p>

<p>This is also why the calculators state the fee base and the arithmetic rather than only the result. If a
rate has moved since it was last read, a visitor who can see the formula can substitute the new number and
still get a correct answer. A page that shows only its output leaves them with nothing.</p>

<h2>What to do when a number here is wrong</h2>

<p><strong>If a figure on this site disagrees with what a platform actually charged you, the platform is
right and this site is wrong.</strong> That is not a disclaimer — it is the operating assumption, and reports
are handled on that basis.</p>

<p>Use the report button on the <a href="/contact/">contact page</a>. The single most useful thing to include
is the discrepancy itself: what the calculator said, what you were actually charged, and the sale price or
invoice amount that produced it. A screenshot of the platform's own fee breakdown settles almost every case
immediately.</p>

<p>What happens next:</p>

<ul>
<li>The figure is checked against the primary source, not against the report. A report is what prompts the
check; the source is what decides it.</li>
<li>If the source has changed, the rate file is updated, its version incremented, its effective date moved to
the date the new schedule took force, and its verification state reset — a corrected file is not automatically
a confirmed one.</li>
<li>If the source has not changed, the error is in the arithmetic rather than the data, which is a code fix
and gets a test that reproduces the wrong answer first.</li>
<li>Either way the page's last-updated date moves, so the change is visible rather than silent.</li>
<li>If a figure cannot be confirmed either way — a source behind a login, a regional page that will not load,
a schedule that contradicts itself — it is marked as unconfirmed rather than guessed at.</li>
</ul>

<p>There is no support desk and no guaranteed response time here. What there is instead is a commitment that
a reported discrepancy is checked against the primary source rather than dismissed, and that when this site
is wrong the correction is dated in public rather than edited away quietly.</p>

<h2>What these calculators deliberately do not do</h2>

<p>They estimate. They are not a quote, not a bill, and not a substitute for the figures a platform or a
revenue authority gives you directly. Every calculator carries its own list of what it does not model —
those lists are specific on purpose, so you can tell whether your situation is one of the cases where the
answer will be wrong. The <a href="/disclaimer/">disclaimer</a> sets out the limits in full.</p>
`,
    },

    {
      path: '/contact/',
      slug: 'contact',
      pageType: 'ContactPage',
      h1: 'Contact',
      title: `Contact ${site.name}`,
      description: `Get in touch about a fee rate that looks wrong, a calculator you would like built, or anything else.`,
      updated: UPDATED,
      published: UPDATED,
      body: `
<p>Found a wrong number, or want a calculator that doesn't exist yet? That's the most useful thing you can
send, and it's read by a person — replies usually go out within a few days.</p>

${reportBox(site)}

<p>Wrong-number reports go fastest with: which calculator, what you entered, what it showed you, and what
the platform actually charged. A screenshot of the platform's own fee breakdown settles it quickest.
Calculator requests are most useful when they describe a decision — "I need to know whether to list on
Poshmark or Mercari" — rather than just a platform name, because the decision determines what the tool
actually has to output. Corrections are applied and the page's "last updated" date changes to reflect the
real edit.</p>

<h2>Press and partnerships</h2>
<p>Email <a href="mailto:${contactEmail}">${contactEmail}</a>. Affiliate and advertising enquiries are
welcome, but placement is never sold in a way that changes a recommendation or a calculated figure.</p>
`,
    },

    {
      path: '/privacy/',
      slug: 'privacy',
      h1: 'Privacy policy',
      title: `Privacy Policy | ${site.name}`,
      description: `What ${site.name} collects, what it does not, and why the calculators never send your figures anywhere.`,
      updated: UPDATED,
      published: UPDATED,
      body: `
<p><strong>The short version: the numbers you type into a calculator never leave your browser.</strong>
There is no server to send them to. This site is static files, and every calculation runs in JavaScript on
your own device.</p>

<h2>What is stored on your device</h2>
<p>Each calculator saves your most recent inputs in your browser's <code>localStorage</code> so the page
remembers them next time. That data stays on your device, is readable only by this site, and is deleted when
you clear your browser data or press Reset on the calculator. It is never transmitted.</p>

<h2>What we collect</h2>
<p>${site.analytics.provider === 'none'
  ? 'No analytics are currently running on this site.'
  : 'Aggregate, cookieless page-view analytics. No cookies are set, no cross-site identifiers are used, and individual visitors are not tracked between sessions.'}
Standard server logs at our hosting provider record IP addresses and user agents for security and abuse
prevention, as they do for every website.</p>

<h2>Advertising</h2>
<p>${site.adSlots.enabled
  ? 'This site displays ads through Google AdSense. Google and its partners may use cookies to serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" rel="noopener nofollow">Google Ads Settings</a>, and control third-party vendor cookies at <a href="https://www.aboutads.info/choices/" rel="noopener nofollow">aboutads.info</a>.'
  : 'This site does not currently display ads. When it does, this section will be updated to name the ad network and explain your opt-out options before any ad code is loaded.'}</p>

<h2>Affiliate links</h2>
<p>${site.affiliates.enabled
  ? 'Some outbound links are affiliate links. Clicking one may set a cookie on the destination site so the merchant can attribute a signup. That cookie is set by the merchant, not by us, and is governed by their privacy policy.'
  : 'This site does not currently use affiliate links.'}</p>

<h2>Your rights</h2>
<p>${site.adSlots.enabled
  ? `We hold no personal data about you ourselves — there is no account, no server, and no database on this
site. Our advertising partner does process data about your visit, and rights over that data are exercised
through Google rather than through us: see <a href="https://policies.google.com/privacy" rel="noopener nofollow">Google's privacy policy</a>
and <a href="https://myadcenter.google.com/" rel="noopener nofollow">My Ad Center</a> to see, change, or turn off
personalised advertising. If you are in the EU, UK, or California and want to reach us directly, use the
<a href="/contact/">contact page</a> and we will respond within 30 days.`
  : `Because no personal data is collected or stored by this site, there is generally nothing to access,
correct, or delete. If you are in the EU, UK, or California and believe we hold data about you, use the
<a href="/contact/">contact page</a> and we will respond within 30 days.`}</p>

<h2>Children</h2>
<p>This site is aimed at people running businesses and is not directed at children under 13. We do not
knowingly collect information from children.</p>

<h2>Changes</h2>
<p>Material changes to this policy will be reflected in the "last updated" date below and, where the change
affects what is collected, announced on the site.</p>
`,
    },

    {
      path: '/terms/',
      slug: 'terms',
      h1: 'Terms of use',
      title: `Terms of Use | ${site.name}`,
      description: `The terms under which ${site.name} is provided, including the limits of what the calculators guarantee.`,
      updated: UPDATED,
      published: UPDATED,
      body: `
<p>By using ${site.name} you agree to these terms. They are short and deliberately plain.</p>

<h2>The service</h2>
<p>${site.name} provides free calculators that estimate fees, taxes, and net amounts. Use of the site
requires no account and costs nothing. We may change, add, or remove calculators at any time.</p>

<h2>No warranty</h2>
<p>The calculators are provided "as is". We work hard to keep fee schedules and tax tables accurate and we
cite our sources with dates, but we do not warrant that any figure is correct, current, or applicable to
your circumstances. Fee schedules change without notice and tax rules vary by situation in ways no
calculator can capture.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, ${site.name} is not liable for any loss arising from your use of
this site or reliance on any figure it produces — including lost profit, underpriced inventory, an
underpayment penalty, or a tax assessment. You are responsible for verifying any figure before you act on
it. Where liability cannot be excluded, it is limited to the amount you paid to use this site, which is
zero.</p>

<h2>Acceptable use</h2>
<p>Do not scrape the site at a rate that degrades it for others, attempt to interfere with its operation, or
republish its content as your own. You are welcome to link to any page, quote figures with attribution, and
use the calculators for commercial purposes.</p>

<h2>Intellectual property</h2>
<p>The text, design, and code of this site are ours. Fee rates and tax figures are facts and are not owned by
anyone; the way they are compiled, explained, and presented here is.</p>

<h2>Governing law</h2>
<p>${site.name} is operated from India. These terms are governed by the laws of India, and the courts of
Bengaluru, Karnataka have exclusive jurisdiction over any dispute arising from them or from your use of this
site.</p>
<p>This does not take away rights you have under the mandatory consumer law of the country you live in. If
you are a consumer in a jurisdiction whose law gives you protections that cannot be contracted away, those
protections still apply to you.</p>

<h2>Contact</h2>
<p>Questions about these terms: use the <a href="/contact/">contact page</a>.</p>
`,
    },

    {
      path: '/disclaimer/',
      slug: 'disclaimer',
      h1: 'Disclaimer',
      title: `Disclaimer — These Are Estimates | ${site.name}`,
      description: `Every calculator on ${site.name} produces an estimate, not advice. What that means in practice and where each tool's limits are.`,
      updated: UPDATED,
      published: UPDATED,
      body: `
<p><strong>${site.name} is an independent, third-party site. It is not affiliated with, endorsed by, or
operated by Amazon, Etsy, eBay, Shopify, PayPal, Stripe, Poshmark, Mercari, Depop, Vinted, StockX, Grailed,
the IRS, the Social Security Administration, or any other platform, brand, or agency a calculator on this
site models.</strong> All trademarks and company names belong to their respective owners and are used only
to identify which platform a figure applies to.</p>

<p><strong>Every figure on this site is an estimate, produced by an independent operator who is not a
licensed accountant, tax preparer, financial adviser, or attorney.</strong> Nothing here is financial, tax,
accounting, legal, or investment advice, and no relationship of professional advice is created by using
these tools.</p>

<h2>What that means in practice</h2>
<p>These calculators model the common case. They apply published fee schedules and tax tables to the inputs
you provide, using the assumptions each page states explicitly. They do not know your full financial
position, your filing history, your state's edge cases, your platform's account-specific pricing, or the
promotional rate you negotiated. Real outcomes differ, sometimes materially.</p>

<h2>Fee calculators</h2>
<p>Marketplace and payment-processor fees change without much notice, and some sellers have negotiated or
grandfathered rates that differ from the public schedule. Each fee page lists the rate schedule version, the
date it took effect, and the date it was last checked against the platform's own page. <strong>If our figure
and your actual settlement statement disagree, the platform is right.</strong> Before you price inventory or
accept a contract, check the platform's live fee page.</p>

<h2>Tax calculators</h2>
<p>The tax tools are the ones to be most careful with. They estimate federal self-employment tax, federal
income tax, and state income tax for straightforward situations. They do not account for tax credits beyond
those named, the alternative minimum tax, capital gains treatment, multi-state apportionment, non-resident
filing, state-level additions and subtractions, or anything specific to your prior-year position.</p>

<p>The quarterly payment schedule is a planning aid, not a filing. Making the payments it suggests does not
guarantee you avoid an underpayment penalty. <strong>Consult a CPA or enrolled agent before you rely on any
tax figure from this site</strong> — particularly if your income is irregular, you operate in more than one
state, or you have equity compensation.</p>

<h2>Rate calculators</h2>
<p>The hourly rate and day rate tools produce a number that satisfies the assumptions you enter. They cannot
tell you what your market will pay. A rate that is mathematically necessary is not automatically a rate a
client will agree to, and the gap between those two is a business problem rather than an arithmetic one.</p>

<h2>Unverified rates</h2>
<p>Where a rate has not yet been confirmed against its primary source, the page says so directly in the
sources section. Treat those pages as structurally correct but numerically provisional.</p>

<h2>Your responsibility</h2>
<p>You are responsible for verifying any figure before acting on it. ${site.name} accepts no liability for
decisions made on the basis of these estimates. If a number matters — and on this site it usually does —
check it against the primary source, which is linked at the bottom of every page.</p>
`,
    },
  ];
}
