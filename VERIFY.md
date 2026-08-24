# Rate verification checklist

_Generated 2026-08-24 by `npm run verify:rates`. Do not edit by hand._

Every figure in `src/data/` was seeded from published rate cards but **has not been
confirmed against the live source**. Confirm each file below, then set `verifiedOn`
to the date you checked and `confidence` to `"verified"`. The site surfaces both
fields on every tool page, so an unverified file is visible to users.

**Do not launch with anything on this list unchecked.** A wrong fee rate on a money
tool is the failure mode that costs trust permanently, and it is the one thing on
this site that cannot be fixed by an algorithm.

## Files awaiting verification

### `src/data/rates/amazon/en-GB.json`

- **Covers:** Amazon
- **Effective date claimed:** 2026-07-01
- **Status:** partially verified — some figures confirmed against a primary source, others not. The note says which is which.
- **Note:** Re-checked 2026-08-21 against Amazon UK's public pricing page. CONFIRMED unchanged: the Professional plan at 25 GBP/month excl. VAT and the Individual plan at 0.75 GBP per unit sold, and the Clothing and Accessories tiers (5% at and up to 15 GBP, 10% from 15 to 20 GBP, 15% above) — these already reflect Amazon’s January 2026 reduction, so the July 2026 rate card this file was built from was current. NEWLY IDENTIFIED GAP: Amazon announced European fee reductions effective 15 December 2025 and 5 January 2026 that introduced or re-rated four categories this file does not carry at all — Home Products (new category, cut from 15% to 8% for items at and up to 20 GBP), Grocery and Gourmet (8% to 5% for items up to 10 GBP), Pet Clothing and Food (15% to 5% for items up to 10 GBP), and Vitamins, Minerals and Supplements (new category, 8% to 5% for items up to 10 GBP). Those four are deliberately NOT added here: Amazon’s announcement states only the reduced lower tier and not the rate that applies above each threshold, and guessing the upper tier would produce a confidently wrong number above it. Anyone with the current rate card should add all four with both tiers. Until then they fall back to the 15% default, which understates the seller’s payout on cheap items in those categories rather than overstating it. Also confirmed on the same page: most products priced at or below 20 GBP are now automatically eligible for Low-Price FBA rates, with no separate enrolment — not modelled here.
- **Check against:**
  - [ ] [Amazon — Sell on Amazon UK pricing](https://sell.amazon.co.uk/pricing)
  - [ ] [Amazon UK — FBA Rate Card (PDF, effective 1 July 2026)](https://m.media-amazon.com/images/G/02/sell/images/260630-FBA-Rate-Card-EN1.pdf)
  - [ ] [Amazon — Sell on Amazon UK pricing (2026 European fee reductions)](https://sell.amazon.co.uk/pricing#referral-fees)

### `src/data/rates/amazon/en-US.json`

- **Covers:** Amazon
- **Effective date claimed:** 2026-01-15
- **Status:** partially verified — some figures confirmed against a primary source, others not. The note says which is which.
- **Note:** Checked 2026-08-21 against Amazon's public US pricing page. VERIFIED: the whole referral fee category table, the $0.30 minimum referral fee, the $1.80 per-item media closing fee, and both selling plans ($39.99/month Professional, $0.99/item Individual). One real error was found and fixed — Appliances (Compact) is a MARGINAL split, 15% on the portion up to $300 and 8% above, and was modelled here as a flat 15%. Amazon's table mixes the two shapes freely and the wording is the only tell: 'for the portion of the total sales price up to X' means marginal, while 'for products with a total sales price of X or less' means the whole sale re-rates. NOT VERIFIED, and the reason verifiedOn stays null: everything below the referral block — the size tiers, FBA fulfillment fee tables, storage fees and the other fees — lives on Seller Central help pages that redirect to an Amazon sign-in, so they cannot be reached without a seller account. Someone with a Seller Central login should confirm those directly. Two known simplifications retained: the $0.30 minimum is applied globally, though Amazon shows no minimum for Fine Art, Gift Cards, Grocery, Media, Video Games and Video Game Consoles; and Merchant Fulfilled Services (20%) is not modelled.
- **Check against:**
  - [ ] [Amazon — Selling plans and referral fees (public pricing page)](https://sell.amazon.com/pricing)
  - [ ] [Amazon Seller Central — Referral fees (login required)](https://sellercentral.amazon.com/help/hub/reference/GTG4BAWSY39Z98Z3)
  - [ ] [Amazon Seller Central — FBA fulfillment fees, US (login required)](https://sellercentral.amazon.com/help/hub/reference/G201112670)
  - [ ] [Amazon Seller Central — FBA inventory storage fees (login required)](https://sellercentral.amazon.com/help/hub/reference/G3EC7EYCU4MB39KP)

### `src/data/rates/processors/en-US.json`

- **Covers:** Payment processors
- **Effective date claimed:** 2026-08-21
- **Status:** partially verified — some figures confirmed against a primary source, others not. The note says which is which.
- **Note:** PayPal verified 2026-08-02 against PayPal's own US merchant fee page (which stated it was last updated 15 July 2026): Checkout 3.49% + $0.49, international surcharge 1.50%, currency conversion 4.00%, micropayments 4.99% + $0.09, invoicing 3.49% + $0.49 — all matched. Stripe and Square verified 2026-08-21 (the earlier geo-redirect was worked around by switching region in-page rather than by URL). Square had two real errors, now corrected: the in-person fixed fee is 15¢, not 10¢, and the plain 'Online' rate on the free plan is 3.3% + 30¢, not 2.9% — the 2.9% figure is the separate 'Online API' rate. Stripe matched on every figure checked and gained two it was missing (the 0.5% manual-entry surcharge and the $2.00 cap on invoicing). STILL UNVERIFIED: Wise, Payoneer, Stripe's Instant Payouts and Link rates, and Square's zero-chargeback-fee claim — verifiedOn stays null until those are done.
- **Check against:**
  - [ ] [PayPal — Merchant fees (US)](https://www.paypal.com/us/webapps/mpp/merchant-fees)
  - [ ] [Stripe — Pricing (US)](https://stripe.com/us/pricing)
  - [ ] [Square — Understanding our fees](https://squareup.com/us/en/payments/our-fees)
  - [ ] [Square — Pricing plans](https://squareup.com/us/en/pricing)
  - [ ] [Wise — Pricing](https://wise.com/us/pricing/)

### `src/data/rates/shopify/en-US.json`

- **Covers:** Shopify
- **Effective date claimed:** 2026-01-01
- **Status:** partially verified — some figures confirmed against a primary source, others not. The note says which is which.
- **Note:** Re-checked 2026-08-22 from shopify.com/pricing via a US exit, which resolved the geolocation problem that blocked the 2026-08-21 attempt. CONFIRMED, all twelve figures matching what was already here: monthly-billed plan prices of $39 Basic, $105 Grow, $399 Advanced and $2,300 Plus, and the online card rates of 2.9% / 2.7% / 2.5% / 2.25%, each + $0.30. The third-party gateway fees (2% / 1% / 0.6% / 0.2%) were already confirmed on 2026-08-21. CORRECTION to the earlier note in this file: it said Shopify no longer publishes per-plan card rates publicly. That was wrong — they are listed on the pricing page beside each plan. The help-centre page that tells merchants to read their own rates from the admin is a different page, and reading only that one produced the wrong conclusion. STILL OPEN, which is why verifiedOn stays null: the annual-billing prices ($29 / $79 / $299), the in-person card rates, the international card surcharge, the currency conversion fee and the $15 chargeback fee. Also noted at the time of checking: a limited-time $1/month promotion on the first three plans. Promo pricing is deliberately NOT stored here — it expires, and a calculator that quietly uses a promo rate overstates what a real seller keeps once it lapses.
- **Check against:**
  - [ ] [Shopify — Pricing (US)](https://www.shopify.com/pricing)
  - [ ] [Shopify Help — Shopify Payments rates in the United States by card type](https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates)

## Highest-risk figures

These change most often and are the ones to check first:

| Figure | File | Why it is risky |
|---|---|---|
| Amazon FBA fulfillment rate card | `rates/amazon/en-US.json` | Revised at least annually, usually in January, and again mid-year. Per-weight-bracket values move by cents that compound across a catalogue. |
| Amazon referral category rates | `rates/amazon/en-US.json` | Category definitions and price-band thresholds shift. Apparel moved to a three-band structure in 2024. |
| Mercari seller fee | `rates/resellers/en-US.json` | Changed model twice since 2024 (seller-paid to buyer-paid). Currently seeded as 0% seller fee — this is the single least certain number in the dataset. |
| Depop seller fee | `rates/resellers/en-US.json` | US and UK differ. US seller fee was removed in 2024; verify it has not returned. |
| eBay final value fee by category | `rates/ebay/en-US.json` | Category-level rates and the $7,500 threshold are adjusted periodically. |
| PayPal / Stripe rates | `rates/processors/en-US.json` | Rate changes are announced with 30 days notice and are easy to miss. |
| Federal brackets & standard deduction | `tax/tax-2026.json` | Published each autumn in an IRS revenue procedure for the following year. **Must be replaced every year.** |
| Social Security wage base | `tax/tax-2026.json` | Announced by SSA each October. |
| State brackets | `tax/states/*.json` | Several states index brackets to inflation annually. |
| CA SDI rate and cap | `tax/states/ca.json` | The wage ceiling was removed in 2024; the rate itself still moves. |
| NY PFL rate and cap | `tax/states/ny.json` | Reset every year. |

## Annual maintenance

The tax layer is the moat and it decays. Each year:

1. Copy `src/data/tax/tax-2026.json` to the new year, update every figure from the IRS revenue procedure.
2. Update each file in `src/data/tax/states/`.
3. Update `taxYear` in `src/data/site.json` so page copy, titles, and schema follow.
4. Re-run `npm run check`.
5. Update the visible "last reviewed" date on every tax page — the build does this from `verifiedOn`.
