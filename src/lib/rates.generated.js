/**
 * AUTO-GENERATED — do not edit.
 * Source: JSON files under src/data/
 * Regenerate with: npm run build  (or node build/gen-rates.mjs)
 *
 * Rate data version: 2026.1
 * Generated: 2026-08-23T06:20:32.828Z
 */

export const byLocale = {
  "amazon": {
    "en-GB": {
      "version": "2026.2",
      "locale": "en-GB",
      "platform": "Amazon",
      "marketplace": "amazon.co.uk (UK)",
      "currency": "GBP",
      "effective": "2026-07-01",
      "verifiedOn": "2026-08-03",
      "confidence": "partially-verified",
      "note": "Fulfilment fee size tiers, weight brackets, fee amounts, storage fees, dimensional-weight divisor, professional/individual plan cost, and the per-item referral minimum were transcribed directly from Amazon's own published UK rate card PDF ('260630-FBA-Rate-Card-EN1.pdf', linked from sell.amazon.co.uk/pricing), effective 1 July 2026 — retrieved and checked 2026-08-03. Left genuinely open: (1) the referral 'categories' list below is a verified SUBSET matching the US file's most common categories, not the full ~35-category UK table, which runs several more pages in the source PDF; categories not listed here fall back to 'default' and should be added before broad launch. (2) The overage per-kg rate on oversize brackets IS from the source (e.g. '+£0.25/kg' on Small oversize), but the PDF does not state the ROUNDING GRANULARITY for that per-kg charge — modelled here as whole-kg steps (ceiling-rounded), matching the US file's established per-pound-step pattern, not independently confirmed for the UK. (3) A '>31.5kg: +£0.09/kg' row appeared adjacent to Heavy oversize in the extracted text but is very likely unreachable in practice — Special oversize's own trigger ('unit weight > 31.5kg, longest side > 175cm, or girth > 360cm') fires at the exact same weight boundary, so it was NOT included. Confirm before relying on it for a >31.5kg item.",
      "sources": [
        {
          "label": "Amazon — Sell on Amazon UK pricing",
          "url": "https://sell.amazon.co.uk/pricing",
          "retrieved": "2026-08-03"
        },
        {
          "label": "Amazon UK — FBA Rate Card (PDF, effective 1 July 2026)",
          "url": "https://m.media-amazon.com/images/G/02/sell/images/260630-FBA-Rate-Card-EN1.pdf",
          "retrieved": "2026-08-03"
        },
        {
          "label": "Amazon — Sell on Amazon UK pricing (2026 European fee reductions)",
          "url": "https://sell.amazon.co.uk/pricing#referral-fees",
          "retrieved": "2026-08-21"
        }
      ],
      "accountFees": {
        "professionalMonthly": 25,
        "individualPerItem": 0.75,
        "note": "Both quoted excl. VAT on Amazon's own pricing page, consistent with how UK B2B software pricing is normally communicated."
      },
      "referral": {
        "minimumFee": 0.25,
        "note": "A £0.25 minimum referral fee applies per item in most categories (source PDF footnote 3, referral fee table). Heavy Oversize items (unit weight 23-31.5kg) carry a £20 minimum instead; Heavy Bulky items (>31.5kg, longest side >175cm, or girth >360cm) carry a £25 minimum — not yet modelled as a per-category override here.",
        "categories": [
          {
            "id": "default",
            "label": "Everything else",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "amazon-device-accessories",
            "label": "Amazon Device Accessories",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.45
              }
            ]
          },
          {
            "id": "automotive",
            "label": "Automotive & Powersports",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 45,
                "rate": 0.15
              },
              {
                "upTo": null,
                "rate": 0.09
              }
            ],
            "note": "Genuinely marginal in the UK — 15% on the first £45, 9% on the rest. The US equivalent is a flat 12% regardless of price; this is a real structural difference, not a currency swap."
          },
          {
            "id": "baby",
            "label": "Baby Products",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 10,
                "rate": 0.08
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "beauty-health",
            "label": "Beauty, Health & Personal Care",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 10,
                "rate": 0.08
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "backpacks-handbags-luggage",
            "label": "Rucksacks & Handbags",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "beer-wine-spirits",
            "label": "Beer, Wine & Spirits",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.1
              }
            ]
          },
          {
            "id": "books",
            "label": "Books",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "closingFee": 0.5,
            "note": "Closing fee is £0.50 in the UK, not a currency conversion of the US $1.80 — Amazon sets this independently per marketplace."
          },
          {
            "id": "business-industrial",
            "label": "Business, Industrial & Scientific Supplies",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "appliances-compact",
            "label": "Compact Appliances",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "clothing",
            "label": "Clothing & Accessories",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 15,
                "rate": 0.05
              },
              {
                "upTo": 20,
                "rate": 0.1
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "note": "Simplified. The source PDF adds a further FBA/Prime-specific rule for items above £40: 15% on the portion up to £40, 7% on the remainder — a hybrid flat-then-marginal structure the current tiered-fee engine (flat OR marginal, not both) can't express in one tier definition yet. Since every item in this FBA calculator is Prime-eligible by definition, that rule applies more often than not for higher-priced clothing and this simplification will overstate the fee above £40. Flagged rather than silently wrong; needs an engine change to model correctly."
          },
          {
            "id": "commercial-electrical",
            "label": "Commercial Electrical & Energy Supplies",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.12
              }
            ]
          }
        ]
      },
      "units": {
        "dimension": "cm",
        "weight": "g",
        "volume": "cu ft",
        "note": "Amazon UK's own rate card prices storage in £ per cubic FOOT per month despite every dimension and weight elsewhere being metric — confirmed on two independent Amazon-owned pages, not a transcription assumption. volumeDivisor below converts cm3 to cubic feet accordingly, not to cubic metres."
      },
      "sizeTierRules": {
        "note": "12 tiers, verified against the July 2026 UK rate card PDF. Ordered smallest to largest; the first tier an item fits wins. Envelopes and Special oversize bill on actual weight only (usesDimensionalWeight: false) per the source's own stated rule — every other tier bills on the greater of actual and dimensional weight. No tier here has a packagingWeight set (all default to 0): the source material described does not state a packaging-weight allowance the way the US rate card does (4 oz on large-standard, 16 oz on large-bulky and up). Either the UK card folds any such allowance into its brackets directly, or this is a genuine gap — not yet confirmed either way.",
        "dimensionalWeightDivisor": 5000,
        "dimensionalWeightUnitMultiplier": 1000,
        "volumeDivisor": 28316.846592,
        "tiers": [
          {
            "id": "light-envelope",
            "maxDimensions": [
              33,
              23,
              2.5
            ],
            "maxWeight": 100,
            "usesDimensionalWeight": false,
            "reason": "Fits within 33 x 23 x 2.5 cm and weighs 100 g or less."
          },
          {
            "id": "standard-envelope",
            "maxDimensions": [
              33,
              23,
              2.5
            ],
            "maxWeight": 460,
            "usesDimensionalWeight": false,
            "reason": "Fits within 33 x 23 x 2.5 cm and weighs 460 g or less."
          },
          {
            "id": "large-envelope",
            "maxDimensions": [
              33,
              23,
              4
            ],
            "maxWeight": 960,
            "usesDimensionalWeight": false,
            "reason": "Fits within 33 x 23 x 4 cm and weighs 960 g or less."
          },
          {
            "id": "extra-large-envelope",
            "maxDimensions": [
              33,
              23,
              6
            ],
            "maxWeight": 960,
            "usesDimensionalWeight": false,
            "reason": "Exceeds Large envelope's depth but still fits within 33 x 23 x 6 cm at 960 g or less."
          },
          {
            "id": "small-parcel",
            "maxDimensions": [
              35,
              25,
              12
            ],
            "maxWeight": 3900,
            "maxDimensionalWeight": 2100,
            "usesDimensionalWeight": true,
            "reason": "Fits within 35 x 25 x 12 cm, weighs 3.90 kg or less, and dimensional weight is 2.10 kg or less."
          },
          {
            "id": "standard-parcel",
            "maxDimensions": [
              45,
              34,
              26
            ],
            "maxWeight": 11900,
            "maxDimensionalWeight": 7960,
            "usesDimensionalWeight": true,
            "reason": "Fits within 45 x 34 x 26 cm, weighs 11.90 kg or less, and dimensional weight is 7.96 kg or less."
          },
          {
            "id": "small-oversize",
            "maxDimensions": [
              61,
              46,
              46
            ],
            "maxWeight": 1760,
            "maxDimensionalWeight": 25820,
            "usesDimensionalWeight": true,
            "reason": "Exceeds Standard parcel but fits within 61 x 46 x 46 cm at 1.76 kg or less."
          },
          {
            "id": "standard-oversize-light",
            "maxDimensions": [
              101,
              60,
              60
            ],
            "maxWeight": 15000,
            "maxDimensionalWeight": 72720,
            "usesDimensionalWeight": true,
            "reason": "Fits within 101 x 60 x 60 cm and weighs 15 kg or less."
          },
          {
            "id": "standard-oversize-heavy",
            "maxDimensions": [
              101,
              60,
              60
            ],
            "maxWeight": 23000,
            "maxDimensionalWeight": 72720,
            "usesDimensionalWeight": true,
            "reason": "Fits within 101 x 60 x 60 cm and weighs more than 15 kg, up to 23 kg."
          },
          {
            "id": "standard-oversize-large",
            "maxDimensions": [
              120,
              60,
              60
            ],
            "maxWeight": 23000,
            "maxDimensionalWeight": 86400,
            "usesDimensionalWeight": true,
            "reason": "Exceeds 101 x 60 x 60 cm but fits within 120 x 60 x 60 cm at 23 kg or less."
          },
          {
            "id": "bulky-oversize",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": 23000,
            "maxDimensionalWeight": 126000,
            "usesDimensionalWeight": true,
            "reason": "Exceeds 120 x 60 x 60 cm and weighs 23 kg or less."
          },
          {
            "id": "heavy-oversize",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": 31500,
            "maxDimensionalWeight": 126000,
            "usesDimensionalWeight": true,
            "reason": "Weighs more than 23 kg, up to 31.5 kg."
          },
          {
            "id": "special-oversize",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": null,
            "usesDimensionalWeight": false,
            "reason": "Weighs more than 31.5 kg, or the longest side exceeds 175 cm, or girth exceeds 360 cm. Billed on actual weight only."
          }
        ]
      },
      "sizeTiers": [
        {
          "id": "light-envelope",
          "label": "Light envelope"
        },
        {
          "id": "standard-envelope",
          "label": "Standard envelope"
        },
        {
          "id": "large-envelope",
          "label": "Large envelope"
        },
        {
          "id": "extra-large-envelope",
          "label": "Extra-large envelope"
        },
        {
          "id": "small-parcel",
          "label": "Small parcel"
        },
        {
          "id": "standard-parcel",
          "label": "Standard parcel"
        },
        {
          "id": "small-oversize",
          "label": "Small oversize"
        },
        {
          "id": "standard-oversize-light",
          "label": "Standard oversize (light)"
        },
        {
          "id": "standard-oversize-heavy",
          "label": "Standard oversize (heavy)"
        },
        {
          "id": "standard-oversize-large",
          "label": "Standard oversize (large)"
        },
        {
          "id": "bulky-oversize",
          "label": "Bulky oversize"
        },
        {
          "id": "heavy-oversize",
          "label": "Heavy oversize"
        },
        {
          "id": "special-oversize",
          "label": "Special oversize"
        }
      ],
      "fulfillment": {
        "unit": "g",
        "note": "Standard FBA local/Pan-European rate card, UK column, non-apparel/non-hazmat. Effective 1 July 2026 per the source PDF; a further 1.5% fuel and logistics surcharge applies across UK/EU fulfilment fees from 17 April 2026 per the same document and is NOT yet folded into these figures.",
        "apparelSurcharge": 0,
        "dangerousGoodsSurcharge": 0.1,
        "tiers": {
          "light-envelope": {
            "brackets": [
              {
                "upTo": 20,
                "value": 1.83
              },
              {
                "upTo": 40,
                "value": 1.87
              },
              {
                "upTo": 60,
                "value": 1.89
              },
              {
                "upTo": 80,
                "value": 2.07
              },
              {
                "upTo": 100,
                "value": 2.08
              }
            ],
            "overage": null
          },
          "standard-envelope": {
            "brackets": [
              {
                "upTo": 210,
                "value": 2.1
              },
              {
                "upTo": 460,
                "value": 2.16
              }
            ],
            "overage": null
          },
          "large-envelope": {
            "brackets": [
              {
                "upTo": 960,
                "value": 2.72
              }
            ],
            "overage": null
          },
          "extra-large-envelope": {
            "brackets": [
              {
                "upTo": 960,
                "value": 2.94
              }
            ],
            "overage": null
          },
          "small-parcel": {
            "brackets": [
              {
                "upTo": 150,
                "value": 2.91
              },
              {
                "upTo": 400,
                "value": 3
              },
              {
                "upTo": 900,
                "value": 3.04
              },
              {
                "upTo": 1400,
                "value": 3.05
              },
              {
                "upTo": 1900,
                "value": 3.25
              },
              {
                "upTo": 3900,
                "value": 3.27
              }
            ],
            "overage": null
          },
          "standard-parcel": {
            "brackets": [
              {
                "upTo": 150,
                "value": 2.94
              },
              {
                "upTo": 400,
                "value": 3.01
              },
              {
                "upTo": 900,
                "value": 3.06
              },
              {
                "upTo": 1400,
                "value": 3.26
              },
              {
                "upTo": 1900,
                "value": 3.48
              },
              {
                "upTo": 2900,
                "value": 3.49
              },
              {
                "upTo": 3900,
                "value": 3.54
              },
              {
                "upTo": 5900,
                "value": 3.56
              },
              {
                "upTo": 8900,
                "value": 3.57
              },
              {
                "upTo": 11900,
                "value": 3.58
              }
            ],
            "overage": null
          },
          "small-oversize": {
            "brackets": [
              {
                "upTo": 760,
                "value": 3.49
              }
            ],
            "overage": {
              "baseOz": 760,
              "baseFee": 3.49,
              "perStepFee": 0.25,
              "stepOz": 1000
            }
          },
          "standard-oversize-light": {
            "brackets": [
              {
                "upTo": 760,
                "value": 4.35
              }
            ],
            "overage": {
              "baseOz": 760,
              "baseFee": 4.35,
              "perStepFee": 0.15,
              "stepOz": 1000
            }
          },
          "standard-oversize-heavy": {
            "brackets": [
              {
                "upTo": 15760,
                "value": 6.58
              }
            ],
            "overage": {
              "baseOz": 15760,
              "baseFee": 6.58,
              "perStepFee": 0.08,
              "stepOz": 1000
            }
          },
          "standard-oversize-large": {
            "brackets": [
              {
                "upTo": 760,
                "value": 5.67
              }
            ],
            "overage": {
              "baseOz": 760,
              "baseFee": 5.67,
              "perStepFee": 0.07,
              "stepOz": 1000
            }
          },
          "bulky-oversize": {
            "brackets": [
              {
                "upTo": 760,
                "value": 10.2
              }
            ],
            "overage": {
              "baseOz": 760,
              "baseFee": 10.2,
              "perStepFee": 0.24,
              "stepOz": 1000
            }
          },
          "heavy-oversize": {
            "brackets": [
              {
                "upTo": 31500,
                "value": 13.04
              }
            ],
            "overage": null
          },
          "special-oversize": {
            "brackets": [
              {
                "upTo": 30000,
                "value": 16.22
              },
              {
                "upTo": 40000,
                "value": 17.24
              },
              {
                "upTo": 50000,
                "value": 34.38
              },
              {
                "upTo": 60000,
                "value": 42.04
              }
            ],
            "overage": {
              "baseOz": 60000,
              "baseFee": 42.04,
              "perStepFee": 0.35,
              "stepOz": 1000
            }
          }
        }
      },
      "storage": {
        "unit": "per cubic foot per month",
        "standard": {
          "janSep": 0.76,
          "octDec": 1.51
        },
        "oversize": {
          "janSep": 0.55,
          "octDec": 0.87
        },
        "note": "Non-dangerous-goods rate for standard-size products outside Clothing/Accessories/Eyewear/Footwear/Rucksacks/Handbags (those categories get a lower rate: £0.62/£0.82). Cross-checked against sell.amazon.co.uk/pricing independently of the rate-card PDF — both agree. A separate aged-inventory surcharge applies past 241 days."
      },
      "otherFees": {
        "hazmatOrLithiumPerUnit": 0.1,
        "hazmatOrLithiumNote": "Additional per-unit fee for products containing or sold with lithium batteries, and for other dangerous goods.",
        "lowInventoryLevelNote": "A low-inventory cost coverage fee applies when historical days of supply run below Amazon's threshold, same mechanism as the US.",
        "returnsProcessingNote": "Returns processing fees apply in high-return categories, same mechanism as the US; UK-specific amounts not yet sourced."
      },
      "recheckNote": "Re-checked 2026-08-21 against Amazon UK's public pricing page. CONFIRMED unchanged: the Professional plan at 25 GBP/month excl. VAT and the Individual plan at 0.75 GBP per unit sold, and the Clothing and Accessories tiers (5% at and up to 15 GBP, 10% from 15 to 20 GBP, 15% above) — these already reflect Amazon’s January 2026 reduction, so the July 2026 rate card this file was built from was current. NEWLY IDENTIFIED GAP: Amazon announced European fee reductions effective 15 December 2025 and 5 January 2026 that introduced or re-rated four categories this file does not carry at all — Home Products (new category, cut from 15% to 8% for items at and up to 20 GBP), Grocery and Gourmet (8% to 5% for items up to 10 GBP), Pet Clothing and Food (15% to 5% for items up to 10 GBP), and Vitamins, Minerals and Supplements (new category, 8% to 5% for items up to 10 GBP). Those four are deliberately NOT added here: Amazon’s announcement states only the reduced lower tier and not the rate that applies above each threshold, and guessing the upper tier would produce a confidently wrong number above it. Anyone with the current rate card should add all four with both tiers. Until then they fall back to the 15% default, which understates the seller’s payout on cheap items in those categories rather than overstating it. Also confirmed on the same page: most products priced at or below 20 GBP are now automatically eligible for Low-Price FBA rates, with no separate enrolment — not modelled here."
    },
    "en-US": {
      "version": "2026.2",
      "locale": "en-US",
      "platform": "Amazon",
      "marketplace": "amazon.com (US)",
      "currency": "USD",
      "effective": "2026-01-15",
      "verifiedOn": null,
      "confidence": "partially-verified",
      "verificationNote": "Checked 2026-08-21 against Amazon's public US pricing page. VERIFIED: the whole referral fee category table, the $0.30 minimum referral fee, the $1.80 per-item media closing fee, and both selling plans ($39.99/month Professional, $0.99/item Individual). One real error was found and fixed — Appliances (Compact) is a MARGINAL split, 15% on the portion up to $300 and 8% above, and was modelled here as a flat 15%. Amazon's table mixes the two shapes freely and the wording is the only tell: 'for the portion of the total sales price up to X' means marginal, while 'for products with a total sales price of X or less' means the whole sale re-rates. NOT VERIFIED, and the reason verifiedOn stays null: everything below the referral block — the size tiers, FBA fulfillment fee tables, storage fees and the other fees — lives on Seller Central help pages that redirect to an Amazon sign-in, so they cannot be reached without a seller account. Someone with a Seller Central login should confirm those directly. Two known simplifications retained: the $0.30 minimum is applied globally, though Amazon shows no minimum for Fine Art, Gift Cards, Grocery, Media, Video Games and Video Game Consoles; and Merchant Fulfilled Services (20%) is not modelled.",
      "sources": [
        {
          "label": "Amazon — Selling plans and referral fees (public pricing page)",
          "url": "https://sell.amazon.com/pricing",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Amazon Seller Central — Referral fees (login required)",
          "url": "https://sellercentral.amazon.com/help/hub/reference/GTG4BAWSY39Z98Z3",
          "retrieved": null
        },
        {
          "label": "Amazon Seller Central — FBA fulfillment fees, US (login required)",
          "url": "https://sellercentral.amazon.com/help/hub/reference/G201112670",
          "retrieved": null
        },
        {
          "label": "Amazon Seller Central — FBA inventory storage fees (login required)",
          "url": "https://sellercentral.amazon.com/help/hub/reference/G3EC7EYCU4MB39KP",
          "retrieved": null
        }
      ],
      "accountFees": {
        "professionalMonthly": 39.99,
        "individualPerItem": 0.99
      },
      "referral": {
        "minimumFee": 0.3,
        "note": "A $0.30 minimum referral fee applies per item in most categories. Media categories also carry a closing fee.",
        "categories": [
          {
            "id": "default",
            "label": "Everything else",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "amazon-device-accessories",
            "label": "Amazon Device Accessories",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.45
              }
            ]
          },
          {
            "id": "appliances-compact",
            "label": "Appliances — Compact",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 300,
                "rate": 0.15
              },
              {
                "upTo": null,
                "rate": 0.08
              }
            ],
            "note": "15% on the portion of the sales price up to $300 and 8% on any portion above it — a marginal split, not a cliff."
          },
          {
            "id": "appliances-full",
            "label": "Appliances — Full-size",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "automotive",
            "label": "Automotive & Powersports",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.12
              }
            ]
          },
          {
            "id": "baby",
            "label": "Baby Products",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 10,
                "rate": 0.08
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "backpacks-handbags-luggage",
            "label": "Backpacks, Handbags & Luggage",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "base-equipment-power-tools",
            "label": "Base Equipment Power Tools",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.12
              }
            ]
          },
          {
            "id": "beauty-health",
            "label": "Beauty, Health & Personal Care",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 10,
                "rate": 0.08
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "books",
            "label": "Books",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "closingFee": 1.8
          },
          {
            "id": "business-industrial",
            "label": "Business, Industrial & Scientific Supplies",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.12
              }
            ]
          },
          {
            "id": "clothing",
            "label": "Clothing & Accessories",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 15,
                "rate": 0.05
              },
              {
                "upTo": 20,
                "rate": 0.1
              },
              {
                "upTo": null,
                "rate": 0.17
              }
            ]
          },
          {
            "id": "computers",
            "label": "Computers",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "consumer-electronics",
            "label": "Consumer Electronics",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "electronics-accessories",
            "label": "Electronics Accessories",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 100,
                "rate": 0.15
              },
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "eyewear",
            "label": "Eyewear",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "fine-art",
            "label": "Fine Art",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 100,
                "rate": 0.2
              },
              {
                "upTo": 1000,
                "rate": 0.15
              },
              {
                "upTo": 5000,
                "rate": 0.1
              },
              {
                "upTo": null,
                "rate": 0.05
              }
            ]
          },
          {
            "id": "footwear",
            "label": "Footwear",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "furniture",
            "label": "Furniture",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 200,
                "rate": 0.15
              },
              {
                "upTo": null,
                "rate": 0.1
              }
            ]
          },
          {
            "id": "gift-cards",
            "label": "Gift Cards",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.2
              }
            ]
          },
          {
            "id": "grocery",
            "label": "Grocery & Gourmet Food",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 15,
                "rate": 0.08
              },
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "home-kitchen",
            "label": "Home & Kitchen",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "jewelry",
            "label": "Jewelry",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 250,
                "rate": 0.2
              },
              {
                "upTo": null,
                "rate": 0.05
              }
            ]
          },
          {
            "id": "lawn-garden",
            "label": "Lawn & Garden",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "lawn-mowers",
            "label": "Lawn Mowers & Snow Throwers",
            "mode": "flat",
            "tiers": [
              {
                "upTo": 500,
                "rate": 0.15
              },
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "mattresses",
            "label": "Mattresses",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "media-dvd",
            "label": "DVD & Blu-ray",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "closingFee": 1.8
          },
          {
            "id": "media-music",
            "label": "Music",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "closingFee": 1.8
          },
          {
            "id": "musical-instruments",
            "label": "Musical Instruments & AV Production",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "office-products",
            "label": "Office Products",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "pet-supplies",
            "label": "Pet Supplies",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ],
            "note": "15% in general. Veterinary diets are charged 22%, which is not modelled as a separate category here."
          },
          {
            "id": "software-games",
            "label": "Software & Computer/Video Games",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "sports-outdoors",
            "label": "Sports & Outdoors",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "tires",
            "label": "Tires",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.1
              }
            ]
          },
          {
            "id": "tools-home-improvement",
            "label": "Tools & Home Improvement",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "toys-games",
            "label": "Toys & Games",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.15
              }
            ]
          },
          {
            "id": "video-game-consoles",
            "label": "Video Game Consoles",
            "mode": "flat",
            "tiers": [
              {
                "upTo": null,
                "rate": 0.08
              }
            ]
          },
          {
            "id": "watches",
            "label": "Watches",
            "mode": "marginal",
            "tiers": [
              {
                "upTo": 1500,
                "rate": 0.16
              },
              {
                "upTo": null,
                "rate": 0.03
              }
            ]
          }
        ]
      },
      "units": {
        "dimension": "in",
        "weight": "oz",
        "volume": "cu ft"
      },
      "sizeTierRules": {
        "note": "Every threshold and packaging weight resolveSizeTier() in src/lib/calc/amazon.js reads — nothing about tier decisions is hardcoded in the engine. tiers is ORDERED smallest first; the first tier an item fits wins, and the last tier's every cap is null so it always matches. reason strings are literal (not templated) because the original US copy mixes oz and lb mid-sentence in a way no single unit template reproduces.",
        "dimensionalWeightDivisor": 139,
        "dimensionalWeightUnitMultiplier": 16,
        "volumeDivisor": 1728,
        "tiers": [
          {
            "id": "small-standard",
            "maxDimensions": [
              15,
              12,
              0.75
            ],
            "maxWeight": 16,
            "usesDimensionalWeight": false,
            "reason": "Fits within 15 x 12 x 0.75 in and weighs 16 oz or less."
          },
          {
            "id": "large-standard",
            "maxDimensions": [
              18,
              14,
              8
            ],
            "maxWeight": 320,
            "packagingWeight": 4,
            "usesDimensionalWeight": true,
            "reason": "Fits within 18 x 14 x 8 in and weighs 20 lb or less."
          },
          {
            "id": "large-bulky",
            "maxDimensions": [
              59,
              33,
              33
            ],
            "maxGirthPlusLength": 130,
            "maxWeight": 800,
            "packagingWeight": 16,
            "usesDimensionalWeight": true,
            "reason": "Exceeds large standard but fits within 59 x 33 x 33 in at 50 lb or less."
          },
          {
            "id": "extra-large-0-50",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": 800,
            "packagingWeight": 16,
            "usesDimensionalWeight": true,
            "reason": "Exceeds the large bulky envelope, so it falls into an extra-large tier."
          },
          {
            "id": "extra-large-50-70",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": 1120,
            "packagingWeight": 16,
            "usesDimensionalWeight": true,
            "reason": "Exceeds the large bulky envelope, so it falls into an extra-large tier."
          },
          {
            "id": "extra-large-70-150",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": 2400,
            "packagingWeight": 16,
            "usesDimensionalWeight": true,
            "reason": "Exceeds the large bulky envelope, so it falls into an extra-large tier."
          },
          {
            "id": "extra-large-150-plus",
            "maxDimensions": [
              null,
              null,
              null
            ],
            "maxWeight": null,
            "packagingWeight": 16,
            "usesDimensionalWeight": true,
            "reason": "Exceeds the large bulky envelope, so it falls into an extra-large tier."
          }
        ]
      },
      "sizeTiers": [
        {
          "id": "small-standard",
          "label": "Small standard"
        },
        {
          "id": "large-standard",
          "label": "Large standard"
        },
        {
          "id": "large-bulky",
          "label": "Large bulky"
        },
        {
          "id": "extra-large-0-50",
          "label": "Extra-large (0–50 lb)"
        },
        {
          "id": "extra-large-50-70",
          "label": "Extra-large (50–70 lb)"
        },
        {
          "id": "extra-large-70-150",
          "label": "Extra-large (70–150 lb)"
        },
        {
          "id": "extra-large-150-plus",
          "label": "Extra-large (150+ lb)"
        }
      ],
      "fulfillment": {
        "unit": "oz",
        "note": "Non-apparel, non-dangerous-goods US rate card. Apparel and dangerous goods carry surcharges applied separately.",
        "apparelSurcharge": 0.4,
        "dangerousGoodsSurcharge": 0.11,
        "tiers": {
          "small-standard": {
            "brackets": [
              {
                "upTo": 2,
                "value": 3.06
              },
              {
                "upTo": 4,
                "value": 3.15
              },
              {
                "upTo": 6,
                "value": 3.24
              },
              {
                "upTo": 8,
                "value": 3.33
              },
              {
                "upTo": 10,
                "value": 3.43
              },
              {
                "upTo": 12,
                "value": 3.53
              },
              {
                "upTo": 14,
                "value": 3.6
              },
              {
                "upTo": 16,
                "value": 3.65
              }
            ],
            "overage": null
          },
          "large-standard": {
            "brackets": [
              {
                "upTo": 4,
                "value": 3.68
              },
              {
                "upTo": 8,
                "value": 3.9
              },
              {
                "upTo": 12,
                "value": 4.15
              },
              {
                "upTo": 16,
                "value": 4.55
              },
              {
                "upTo": 20,
                "value": 4.99
              },
              {
                "upTo": 24,
                "value": 5.37
              },
              {
                "upTo": 28,
                "value": 5.52
              },
              {
                "upTo": 32,
                "value": 5.77
              },
              {
                "upTo": 36,
                "value": 5.87
              },
              {
                "upTo": 40,
                "value": 6.05
              },
              {
                "upTo": 44,
                "value": 6.21
              },
              {
                "upTo": 48,
                "value": 6.62
              }
            ],
            "overage": {
              "baseOz": 48,
              "baseFee": 6.92,
              "perStepFee": 0.08,
              "stepOz": 4
            }
          },
          "large-bulky": {
            "brackets": [
              {
                "upTo": 16,
                "value": 9.61
              }
            ],
            "overage": {
              "baseOz": 16,
              "baseFee": 9.61,
              "perStepFee": 0.38,
              "stepOz": 16
            }
          },
          "extra-large-0-50": {
            "brackets": [
              {
                "upTo": 16,
                "value": 26.33
              }
            ],
            "overage": {
              "baseOz": 16,
              "baseFee": 26.33,
              "perStepFee": 0.38,
              "stepOz": 16
            }
          },
          "extra-large-50-70": {
            "brackets": [
              {
                "upTo": 800,
                "value": 40.12
              }
            ],
            "overage": {
              "baseOz": 800,
              "baseFee": 40.12,
              "perStepFee": 0.75,
              "stepOz": 16
            }
          },
          "extra-large-70-150": {
            "brackets": [
              {
                "upTo": 1120,
                "value": 54.81
              }
            ],
            "overage": {
              "baseOz": 1120,
              "baseFee": 54.81,
              "perStepFee": 0.75,
              "stepOz": 16
            }
          },
          "extra-large-150-plus": {
            "brackets": [
              {
                "upTo": 2400,
                "value": 194.95
              }
            ],
            "overage": {
              "baseOz": 2400,
              "baseFee": 194.95,
              "perStepFee": 0.19,
              "stepOz": 16
            }
          }
        }
      },
      "storage": {
        "unit": "per cubic foot per month",
        "standard": {
          "janSep": 0.78,
          "octDec": 2.4
        },
        "oversize": {
          "janSep": 0.56,
          "octDec": 1.4
        },
        "note": "Monthly inventory storage. A separate aged-inventory surcharge applies to units held over 181 days."
      },
      "otherFees": {
        "inboundPlacementMin": 0.27,
        "inboundPlacementNote": "Inbound placement service fee, charged when you send inventory to a single receiving centre rather than splitting shipments. Varies by size tier and split.",
        "lowInventoryLevelNote": "A low-inventory-level fee applies when historical days of supply run below Amazon's threshold.",
        "removalPerUnit": 0.97,
        "returnsProcessingNote": "Returns processing fees apply in categories with high return rates (notably Apparel and Shoes)."
      }
    }
  },
  "ebay": {
    "en-US": {
      "version": "2026.2",
      "locale": "en-US",
      "platform": "eBay",
      "marketplace": "ebay.com (US)",
      "currency": "USD",
      "effective": "2026-08-21",
      "verifiedOn": "2026-08-21",
      "confidence": "verified",
      "sources": [
        {
          "label": "eBay — Selling fees (no store / Starter store)",
          "url": "https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822",
          "retrieved": "2026-08-21"
        },
        {
          "label": "eBay — Store selling fees (Starter through Enterprise)",
          "url": "https://www.ebay.com/help/selling/fees-credits-invoices/store-selling-fees?id=4809",
          "retrieved": "2026-08-21"
        }
      ],
      "verificationNote": "Transcribed from eBay's own US fee pages on 2026-08-21. Two things changed since the previous version of this file and are corrected here: the base rate for most categories is 13.6%, not 13.25%, and Basic/Premium/Anchor/Enterprise store subscribers are charged from an entirely separate and cheaper fee table with a $2,500 tier boundary rather than $7,500. Both were verified against the live pages. Left deliberately open: eBay's published tables run to roughly 60 category rows with sub-category exceptions; the 15 categories modelled here are the representative ones, and anything not listed falls back to 'default'. The Promoted Listings ad-rate range below was NOT re-verified on this pass and is still carried over from the original seeding.",
      "perOrderFee": {
        "underOrEqual10": 0.3,
        "over10": 0.4,
        "note": "Charged once per order, not per item. Based on the total order amount including shipping. An order is any number of items bought by the same buyer at checkout with the same shipping method."
      },
      "finalValueFee": {
        "appliesTo": "Total amount of the sale: item price, handling charges, shipping collected from the buyer, sales tax, and any other applicable fees.",
        "scheduleNote": "eBay publishes two different final value fee tables. Sellers with no store, or a Starter store, are charged from the standard table. Basic, Premium, Anchor and Enterprise subscribers are charged from a lower table that also moves the first tier boundary down from $7,500 to $2,500.",
        "schedules": [
          {
            "id": "standard",
            "label": "No store or Starter store",
            "storeTiers": [
              "none",
              "starter"
            ],
            "categories": [
              {
                "id": "default",
                "label": "Most categories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.136
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "books-movies-music",
                "label": "Books & Magazines, Movies & TV, Music (excl. Vinyl Records and NFTs)",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.153
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "clothing",
                "label": "Clothing, Shoes & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.136
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "womens-bags",
                "label": "Women's Bags & Handbags",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 2000,
                    "rate": 0.15
                  },
                  {
                    "upTo": null,
                    "rate": 0.09
                  }
                ]
              },
              {
                "id": "sneakers-over-150",
                "label": "Athletic Shoes",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 149.99,
                    "rate": 0.136
                  },
                  {
                    "upTo": null,
                    "rate": 0.08
                  }
                ],
                "noPerOrderFeeAbove": 150,
                "note": "8% with no per-order fee once the sale total reaches $150. Below $150 the ordinary rate and per-order fee apply."
              },
              {
                "id": "jewelry",
                "label": "Jewelry & Watches (excl. Watches, Parts & Accessories)",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 5000,
                    "rate": 0.15
                  },
                  {
                    "upTo": null,
                    "rate": 0.09
                  }
                ]
              },
              {
                "id": "watches",
                "label": "Watches, Parts & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 1000,
                    "rate": 0.15
                  },
                  {
                    "upTo": 7500,
                    "rate": 0.065
                  },
                  {
                    "upTo": null,
                    "rate": 0.03
                  }
                ]
              },
              {
                "id": "coins-bullion",
                "label": "Coins & Paper Money — Bullion",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.136
                  },
                  {
                    "upTo": null,
                    "rate": 0.07
                  }
                ]
              },
              {
                "id": "coins-paper-money",
                "label": "Coins & Paper Money (excl. Bullion)",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.1325
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "trading-cards",
                "label": "Trading Cards, Comic Books & Collectible Card Games",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.1325
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "musical-instruments",
                "label": "Musical Instruments — Guitars & Basses",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.067
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "heavy-equipment",
                "label": "Heavy Equipment, Commercial Printing Presses & Food Trucks",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 15000,
                    "rate": 0.03
                  },
                  {
                    "upTo": null,
                    "rate": 0.005
                  }
                ],
                "note": "These categories carry a $20 insertion fee rather than a free listing allowance."
              },
              {
                "id": "motors-parts",
                "label": "eBay Motors — Parts & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 7500,
                    "rate": 0.136
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "business-industrial",
                "label": "Business & Industrial — Heavy Machinery",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 15000,
                    "rate": 0.03
                  },
                  {
                    "upTo": null,
                    "rate": 0.005
                  }
                ]
              },
              {
                "id": "art-nfts",
                "label": "NFT categories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": null,
                    "rate": 0.05
                  }
                ]
              }
            ]
          },
          {
            "id": "store-plus",
            "label": "Basic, Premium, Anchor or Enterprise store",
            "storeTiers": [
              "basic",
              "premium",
              "anchor",
              "enterprise"
            ],
            "categories": [
              {
                "id": "default",
                "label": "Most categories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 2500,
                    "rate": 0.127
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "books-movies-music",
                "label": "Books & Magazines, Movies & TV, Music (excl. Vinyl Records and NFTs)",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 2500,
                    "rate": 0.153
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "clothing",
                "label": "Clothing, Shoes & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 2500,
                    "rate": 0.127
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "womens-bags",
                "label": "Women's Bags & Handbags",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 2000,
                    "rate": 0.13
                  },
                  {
                    "upTo": null,
                    "rate": 0.07
                  }
                ]
              },
              {
                "id": "sneakers-over-150",
                "label": "Athletic Shoes",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 149.99,
                    "rate": 0.127
                  },
                  {
                    "upTo": null,
                    "rate": 0.07
                  }
                ],
                "noPerOrderFeeAbove": 150,
                "note": "7% with no per-order fee once the sale total reaches $150. Below $150 the ordinary rate and per-order fee apply."
              },
              {
                "id": "jewelry",
                "label": "Jewelry & Watches (excl. Watches, Parts & Accessories)",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 5000,
                    "rate": 0.13
                  },
                  {
                    "upTo": null,
                    "rate": 0.07
                  }
                ]
              },
              {
                "id": "watches",
                "label": "Watches, Parts & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 1000,
                    "rate": 0.125
                  },
                  {
                    "upTo": 5000,
                    "rate": 0.04
                  },
                  {
                    "upTo": null,
                    "rate": 0.03
                  }
                ]
              },
              {
                "id": "coins-bullion",
                "label": "Coins & Paper Money — Bullion",
                "mode": "flat",
                "tiers": [
                  {
                    "upTo": 1500,
                    "rate": 0.075
                  },
                  {
                    "upTo": 10000,
                    "rate": 0.05
                  },
                  {
                    "upTo": null,
                    "rate": 0.045
                  }
                ]
              },
              {
                "id": "coins-paper-money",
                "label": "Coins & Paper Money (excl. Bullion)",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 4000,
                    "rate": 0.09
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "trading-cards",
                "label": "Trading Cards, Comic Books & Collectible Card Games",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 2500,
                    "rate": 0.1235
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "musical-instruments",
                "label": "Musical Instruments — Guitars & Basses",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 2500,
                    "rate": 0.067
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "heavy-equipment",
                "label": "Heavy Equipment, Commercial Printing Presses & Food Trucks",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 15000,
                    "rate": 0.025
                  },
                  {
                    "upTo": null,
                    "rate": 0.005
                  }
                ]
              },
              {
                "id": "motors-parts",
                "label": "eBay Motors — Parts & Accessories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 1000,
                    "rate": 0.115
                  },
                  {
                    "upTo": null,
                    "rate": 0.0235
                  }
                ]
              },
              {
                "id": "business-industrial",
                "label": "Business & Industrial — Heavy Machinery",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": 15000,
                    "rate": 0.025
                  },
                  {
                    "upTo": null,
                    "rate": 0.005
                  }
                ]
              },
              {
                "id": "art-nfts",
                "label": "NFT categories",
                "mode": "marginal",
                "tiers": [
                  {
                    "upTo": null,
                    "rate": 0.05
                  }
                ]
              }
            ]
          }
        ]
      },
      "storeSubscriptions": [
        {
          "id": "none",
          "label": "No store",
          "monthlyAnnual": 0,
          "monthlyMonthly": 0,
          "freeListings": 250,
          "insertionFee": 0.35
        },
        {
          "id": "starter",
          "label": "Starter",
          "monthlyAnnual": 4.95,
          "monthlyMonthly": 7.95,
          "freeListings": 250,
          "insertionFee": 0.3
        },
        {
          "id": "basic",
          "label": "Basic",
          "monthlyAnnual": 21.95,
          "monthlyMonthly": 27.95,
          "freeListings": 1000,
          "insertionFee": 0.25
        },
        {
          "id": "premium",
          "label": "Premium",
          "monthlyAnnual": 59.95,
          "monthlyMonthly": 74.95,
          "freeListings": 10000,
          "insertionFee": 0.1
        },
        {
          "id": "anchor",
          "label": "Anchor",
          "monthlyAnnual": 299.95,
          "monthlyMonthly": 349.95,
          "freeListings": 25000,
          "insertionFee": 0.05
        },
        {
          "id": "enterprise",
          "label": "Enterprise",
          "monthlyAnnual": 2999.95,
          "monthlyMonthly": null,
          "freeListings": 100000,
          "insertionFee": 0.05
        }
      ],
      "storeListingNote": "Free listing allowances shown are the fixed-price, all-categories figures. eBay publishes separate and larger allowances for auction-style listings and for select categories.",
      "internationalFee": {
        "rate": 0.0165,
        "note": "Charged when the delivery address or the buyer's registered address is outside the US. Waived on eligible listings shipped through eBay International Shipping."
      },
      "belowStandardSurcharge": {
        "rate": 0.06,
        "escalatedRate": 0.07,
        "escalatesAfterMonths": 4,
        "note": "Added to the final value fee percentage for sellers rated Below Standard on the 20th-of-month evaluation. Rises to 7% after four or more consecutive Below Standard months. Does not apply to Above Standard or Top-rated sellers."
      },
      "veryHighInadSurcharge": {
        "rate": 0.05,
        "escalatedRate": 0.06,
        "escalatesAfterMonths": 4,
        "note": "Charged instead on categories where your 'item not as described' return rate is evaluated Very High. If you are both Below Standard and Very High, only the Below Standard surcharge is charged."
      },
      "disputeFee": {
        "amount": 20,
        "note": "Charged per dispute when you are found responsible for a disputed amount, such as a chargeback. Excludes sales tax."
      },
      "currencyConversionCharge": {
        "rate": 0.03,
        "note": "Retained by eBay on top of the base exchange rate whenever it converts your funds, for sellers with a US registered address."
      },
      "promotedListings": {
        "standardMinRate": 0.02,
        "standardMaxRate": 1,
        "confidence": "needs-verification",
        "note": "Promoted Listings Standard charges your chosen ad rate on the total sale amount, but only when a buyer clicks your ad and purchases within 30 days. This range was not re-verified in the 2026-08-21 pass."
      },
      "insertionFee": {
        "amount": 0.35,
        "freeListingsNoStore": 250,
        "note": "Charged per listing beyond your monthly free allocation, in every category you list in."
      }
    }
  },
  "etsy": {
    "en-US": {
      "version": "2026.2",
      "locale": "en-US",
      "platform": "Etsy",
      "marketplace": "etsy.com (US seller, USD)",
      "currency": "USD",
      "effective": "2026-08-21",
      "verifiedOn": "2026-08-21",
      "confidence": "verified",
      "sources": [
        {
          "label": "Etsy — Fees & Payments Policy",
          "url": "https://www.etsy.com/legal/fees/",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Etsy — Etsy Payments Policy (processing fees by country)",
          "url": "https://www.etsy.com/legal/etsy-payments/",
          "retrieved": "2026-08-21"
        }
      ],
      "verificationNote": "Every figure below except the Regulatory Operating fee percentages was read off Etsy's own policy pages on 2026-08-21. The listing fee, 6.5% transaction fee, Offsite Ads 15%/12% split with its $10,000 threshold and $100 per-order cap, the 2.5% currency conversion fee, the $10 Etsy Plus subscription and the US 3% + $0.25 processing rate all matched the previous values. One correction was made: Australia is 3% domestic and 4% international, not a flat 4%.",
      "listingFee": {
        "amount": 0.2,
        "renewalMonths": 4,
        "note": "Charged when you publish a listing and again every 4 months, or automatically on each sale if auto-renew is on. Multi-quantity listings incur a renewal fee per additional item sold."
      },
      "transactionFee": {
        "rate": 0.065,
        "appliesTo": [
          "itemPrice",
          "shippingCharged",
          "giftWrap",
          "personalization"
        ],
        "note": "6.5% of the price you display plus what you charge for delivery, gift wrapping and personalisation. For sellers based in the US the transaction fee does NOT apply to sales tax — which is the opposite of how the payment processing fee below works, and the distinction is the single most common source of a mismatched Etsy fee estimate."
      },
      "paymentProcessing": {
        "appliesTo": "The total amount of the sale, including sales tax and postage.",
        "US": {
          "rate": 0.03,
          "fixed": 0.25
        },
        "GB": {
          "rate": 0.04,
          "fixed": 0.2,
          "currency": "GBP"
        },
        "CA": {
          "rate": 0.03,
          "fixed": 0.25,
          "currency": "CAD",
          "note": "3% on domestic orders and on orders from the US; 4% on other international orders."
        },
        "AU": {
          "rate": 0.03,
          "fixed": 0.25,
          "currency": "AUD",
          "internationalRate": 0.04,
          "note": "3% on domestic orders, 4% on international orders."
        },
        "note": "Etsy Payments processing. Rate and fixed component vary by the country your bank account is in, not the buyer's country. Unlike the transaction fee, this one IS assessed on the total sale including tax and postage."
      },
      "offsiteAds": {
        "standardRate": 0.15,
        "highVolumeRate": 0.12,
        "highVolumeThreshold": 10000,
        "capPerOrder": 100,
        "note": "Charged only when a buyer reaches your listing through an Etsy-purchased ad and orders from your shop within 30 days of that click. Sellers under $10,000 in trailing-365-day sales can opt out; at or above that threshold participation is mandatory at the lower 12% rate — and once you have crossed it, the 12% rate applies for the lifetime of the shop even if sales later fall back below $10,000."
      },
      "regulatoryOperatingFee": {
        "confidence": "needs-verification",
        "rates": {
          "GB": 0.0025,
          "FR": 0.004,
          "IT": 0.0025,
          "ES": 0.004,
          "TR": 0.0111
        },
        "note": "Applies to sellers in certain countries only. US sellers are not charged this fee, which is why it was not re-verified in the 2026-08-21 pass — Etsy publishes the per-country percentages in a separate help article rather than in the Fees & Payments Policy. Confirm before relying on these for any non-US locale."
      },
      "patternSubscription": {
        "monthly": 15,
        "freeTrialDays": 30,
        "note": "Etsy's standalone website builder. Listings already in your Etsy shop carry no extra listing fee on Pattern; Pattern-only listings incur no listing fee and do not expire."
      },
      "currencyConversion": {
        "rate": 0.025,
        "note": "Applied when your listing currency differs from your payment account currency."
      },
      "subscriptions": {
        "etsyPlusMonthly": 10
      },
      "squareFee": {
        "note": "In-person sales synced from Square are charged a $0.20 listing fee but no Etsy transaction fee."
      }
    }
  },
  "processors": {
    "en-US": {
      "version": "2026.2",
      "locale": "en-US",
      "platform": "Payment processors",
      "currency": "USD",
      "effective": "2026-08-21",
      "verifiedOn": null,
      "confidence": "partially-verified",
      "note": "PayPal verified 2026-08-02 against PayPal's own US merchant fee page (which stated it was last updated 15 July 2026): Checkout 3.49% + $0.49, international surcharge 1.50%, currency conversion 4.00%, micropayments 4.99% + $0.09, invoicing 3.49% + $0.49 — all matched. Stripe and Square verified 2026-08-21 (the earlier geo-redirect was worked around by switching region in-page rather than by URL). Square had two real errors, now corrected: the in-person fixed fee is 15¢, not 10¢, and the plain 'Online' rate on the free plan is 3.3% + 30¢, not 2.9% — the 2.9% figure is the separate 'Online API' rate. Stripe matched on every figure checked and gained two it was missing (the 0.5% manual-entry surcharge and the $2.00 cap on invoicing). STILL UNVERIFIED: Wise, Payoneer, Stripe's Instant Payouts and Link rates, and Square's zero-chargeback-fee claim — verifiedOn stays null until those are done.",
      "sources": [
        {
          "label": "PayPal — Merchant fees (US)",
          "url": "https://www.paypal.com/us/webapps/mpp/merchant-fees",
          "retrieved": "2026-08-02"
        },
        {
          "label": "Stripe — Pricing (US)",
          "url": "https://stripe.com/us/pricing",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Square — Understanding our fees",
          "url": "https://squareup.com/us/en/payments/our-fees",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Square — Pricing plans",
          "url": "https://squareup.com/us/en/pricing",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Wise — Pricing",
          "url": "https://wise.com/us/pricing/",
          "retrieved": null
        }
      ],
      "paypal": {
        "label": "PayPal",
        "products": [
          {
            "id": "checkout",
            "label": "PayPal Checkout (online)",
            "rate": 0.0349,
            "fixed": 0.49
          },
          {
            "id": "standard-card",
            "label": "Standard card / guest checkout",
            "rate": 0.0299,
            "fixed": 0.49
          },
          {
            "id": "invoicing",
            "label": "PayPal Invoicing",
            "rate": 0.0349,
            "fixed": 0.49
          },
          {
            "id": "invoicing-card",
            "label": "Invoicing paid by card",
            "rate": 0.0299,
            "fixed": 0.49
          },
          {
            "id": "qr-large",
            "label": "QR code, $10.01 and above",
            "rate": 0.0229,
            "fixed": 0.09
          },
          {
            "id": "qr-small",
            "label": "QR code, $10.00 and under",
            "rate": 0.0149,
            "fixed": 0.09
          },
          {
            "id": "micropayments",
            "label": "Micropayments (opt-in)",
            "rate": 0.0499,
            "fixed": 0.09
          },
          {
            "id": "friends-family-balance",
            "label": "Friends & Family — bank or balance",
            "rate": 0,
            "fixed": 0
          },
          {
            "id": "friends-family-card",
            "label": "Friends & Family — card funded",
            "rate": 0.0299,
            "fixed": 0,
            "paidBy": "sender"
          }
        ],
        "crossBorderFee": {
          "rate": 0.015,
          "note": "International commercial transaction fee, added when the buyer's PayPal account is registered outside the US."
        },
        "currencyConversion": {
          "rate": 0.04,
          "note": "PayPal's conversion spread over the wholesale rate. Applied when you accept or withdraw in a currency other than USD."
        },
        "chargebackFee": 20,
        "micropaymentsNote": "Micropayments pricing must be requested and applies account-wide. Setting the two schedules equal, 0.0349x + 0.49 = 0.0499x + 0.09, gives a crossover of $26.67: micropayments is cheaper below it and dearer above it. Derived from the two rate lines above, not quoted from PayPal — PayPal publishes both schedules but never the point where they cross."
      },
      "stripe": {
        "label": "Stripe",
        "products": [
          {
            "id": "online-domestic",
            "label": "Online card — US card",
            "rate": 0.029,
            "fixed": 0.3
          },
          {
            "id": "in-person",
            "label": "In-person (Stripe Terminal)",
            "rate": 0.027,
            "fixed": 0.05
          },
          {
            "id": "ach",
            "label": "ACH Direct Debit",
            "rate": 0.008,
            "fixed": 0,
            "cap": 5
          },
          {
            "id": "invoicing",
            "label": "Stripe Invoicing",
            "rate": 0.029,
            "fixed": 0.3,
            "extraRate": 0.004,
            "extraCap": 2,
            "extraNote": "Invoicing adds 0.4% of the transaction total on paid invoices on the standard plan, capped at $2.00 per invoice."
          },
          {
            "id": "link",
            "label": "Link",
            "rate": 0.029,
            "fixed": 0.3,
            "confidence": "needs-verification"
          }
        ],
        "manualEntrySurcharge": {
          "rate": 0.005,
          "note": "Added for manually entered card details, on top of the 2.9% + 30¢ base."
        },
        "internationalCardSurcharge": {
          "rate": 0.015,
          "note": "Added for cards issued outside the US."
        },
        "currencyConversion": {
          "rate": 0.01,
          "note": "Added when a currency conversion is required."
        },
        "instantPayout": {
          "rate": 0.01,
          "minimum": 0.5,
          "confidence": "needs-verification",
          "note": "Optional fee to receive funds in minutes rather than on the standard payout schedule. Not shown on stripe.com/pricing as of 2026-08-21 — the 50¢ minimum visible there belongs to Global Payouts debit card payouts, which is a different product. Confirm before relying on this."
        },
        "disputeFee": 15,
        "disputeFeeNote": "$15.00 for each dispute received, and $15.00 for each dispute you respond to manually — the second is refunded on disputes you win, but not on disputes you lose."
      },
      "square": {
        "label": "Square",
        "planNote": "Rates below are the Square Free plan ($0/month per location). Square Plus ($49/month per location) and Square Premium ($149/month per location) buy down the in-person rate to 2.5% and 2.4% and the Online rate to 2.9%.",
        "products": [
          {
            "id": "online",
            "label": "Square Online (website / checkout links)",
            "rate": 0.033,
            "fixed": 0.3
          },
          {
            "id": "online-api",
            "label": "Online via Square's payments API",
            "rate": 0.029,
            "fixed": 0.3,
            "note": "Charged at 2.9% + 30¢ on every plan, including Free — this is the one Square rate a free-plan seller can reach without paying 3.3%."
          },
          {
            "id": "in-person",
            "label": "In-person (tapped, dipped, swiped)",
            "rate": 0.026,
            "fixed": 0.15
          },
          {
            "id": "keyed",
            "label": "Manually keyed / card on file",
            "rate": 0.035,
            "fixed": 0.15
          },
          {
            "id": "invoices",
            "label": "Square Invoices (card)",
            "rate": 0.033,
            "fixed": 0.3
          },
          {
            "id": "ach-invoice",
            "label": "ACH bank transfer via invoice",
            "rate": 0.01,
            "fixed": 0,
            "minimum": 1,
            "note": "1% with a $1 minimum. Square Plus and Premium add a $10 cap; the Free plan has no cap."
          },
          {
            "id": "afterpay",
            "label": "Afterpay (buy now, pay later)",
            "rate": 0.06,
            "fixed": 0.3
          }
        ],
        "plans": [
          {
            "id": "free",
            "label": "Square Free",
            "monthlyPerLocation": 0
          },
          {
            "id": "plus",
            "label": "Square Plus",
            "monthlyPerLocation": 49
          },
          {
            "id": "premium",
            "label": "Square Premium",
            "monthlyPerLocation": 149
          }
        ],
        "chargebackFee": 0,
        "chargebackFeeConfidence": "needs-verification",
        "note": "Square does not charge a chargeback fee on disputes. That claim was NOT re-confirmed in the 2026-08-21 pass — it does not appear on either fee page checked."
      },
      "wise": {
        "label": "Wise Business",
        "products": [
          {
            "id": "usd-receive",
            "label": "Receive USD to Wise account",
            "rate": 0,
            "fixed": 0
          },
          {
            "id": "convert",
            "label": "Currency conversion",
            "rate": 0.0043,
            "fixed": 0.3,
            "note": "Variable by corridor — 0.43% is a mid-range USD/EUR figure. Check the live quote."
          }
        ]
      },
      "payoneer": {
        "label": "Payoneer",
        "products": [
          {
            "id": "marketplace-usd",
            "label": "Receive from marketplace (USD)",
            "rate": 0,
            "fixed": 0
          },
          {
            "id": "card-payment",
            "label": "Receive card payment from client",
            "rate": 0.0349,
            "fixed": 0
          },
          {
            "id": "convert",
            "label": "Currency conversion",
            "rate": 0.005,
            "fixed": 0
          }
        ]
      }
    }
  },
  "resellers": {
    "en-US": {
      "version": "2026.2",
      "locale": "en-US",
      "platform": "Resale marketplaces",
      "currency": "USD",
      "effective": "2026-08-21",
      "verifiedOn": "2026-08-22",
      "confidence": "verified",
      "note": "Resale platform fee structures changed more than any other category between 2024 and 2026, and this file proves the point. VERIFIED 2026-08-21 against each platform's own fee page: Poshmark, Mercari, Depop, eBay and Etsy. Two were wrong and are now fixed. Mercari was carried here as a zero-seller-fee platform, which was true only between March 2024 and 6 January 2025 — it reinstated a 10% selling fee on that date, charged on item price plus buyer-paid shipping. eBay's base rate was 13.25% and is now 13.6%, matching the correction made in the eBay rate file on the same day. Facebook Marketplace was corrected on 2026-08-22 and is now the third error found in this file: it was carried here at 5% with a $0.40 minimum, charged on the item price alone. Meta charges 10% with a $0.80 minimum, on the whole transaction including shipping and tax — double the rate on a base that is larger. Vinted, StockX and Grailed were checked on 2026-08-22, completing the file. Vinted was correct. StockX's five level rates and 3% processing were correct but it was missing the $5 US minimum seller fee. Grailed had changed structurally: since 20 May 2026 it charges 6% below $120 and 9% at or above, where this file carried a flat 9% — which overstated the fee on every item under $120, including this page's own $45 default example. That is four real errors found in one file, which is what a category that re-prices this often looks like.",
      "sources": [
        {
          "label": "Poshmark — Fee Policy",
          "url": "https://poshmark.com/terms#fee-policy",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Mercari — Fees on Mercari",
          "url": "https://www.mercari.com/us/help_center/article/169/",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Depop — Seller fees and charges",
          "url": "https://depophelp.zendesk.com/hc/en-gb/articles/360001791127-Seller-fees-and-charges",
          "retrieved": "2026-08-21"
        },
        {
          "label": "Vinted — Is selling on Vinted free?",
          "url": "https://www.vinted.com/help/373-is-selling-on-vinted-free",
          "retrieved": "2026-08-22"
        },
        {
          "label": "StockX — Seller fees",
          "url": "https://stockx.com/help/articles/what-are-stockxs-fees-for-sellers",
          "retrieved": "2026-08-22"
        },
        {
          "label": "Grailed — Selling fees",
          "url": "https://support.grailed.com/hc/en-us/articles/30282580172045-What-are-the-fees",
          "retrieved": "2026-08-22"
        },
        {
          "label": "Meta Business Help — About fees for sales using checkout",
          "url": "https://www.facebook.com/business/help/223030991929920",
          "retrieved": "2026-08-22"
        },
        {
          "label": "Grailed — Does Grailed charge a payment processing fee?",
          "url": "https://support.grailed.com/hc/en-us/articles/30299544492301-Does-Grailed-charge-a-payment-processing-fee",
          "retrieved": "2026-08-22"
        }
      ],
      "platforms": [
        {
          "id": "poshmark",
          "label": "Poshmark",
          "shippingModel": "buyer-pays-flat",
          "buyerShippingFlat": 7.97,
          "commission": {
            "mode": "hybrid-flat-under-threshold",
            "threshold": 15,
            "flatUnderThreshold": 2.95,
            "rateAtOrAbove": 0.2
          },
          "processingRate": 0,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "Poshmark's commission includes payment processing. Buyers pay a flat shipping fee for a prepaid label, so the seller's shipping cost is zero unless they discount the label."
        },
        {
          "id": "mercari",
          "label": "Mercari",
          "shippingModel": "seller-choice",
          "commissionIncludesShipping": true,
          "commission": {
            "mode": "flat-rate",
            "rate": 0.1
          },
          "processingRate": 0,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "Mercari reinstated a 10% selling fee on 6 January 2025, charged on the item price plus buyer-paid shipping. Sellers are no longer charged a separate payment processing fee. Buyers pay a 3.6% Buyer Protection fee on top, which does not come out of the seller's proceeds. The zero-seller-fee period ran from March 2024 to January 2025 only."
        },
        {
          "id": "depop",
          "label": "Depop",
          "shippingModel": "seller-choice",
          "commission": {
            "mode": "flat-rate",
            "rate": 0
          },
          "processingRate": 0.033,
          "processingFixed": 0.45,
          "listingFee": 0,
          "note": "Depop charges no selling fee to sellers based in the US, the UK or Australia — the charge moved to buyers, who pay a marketplace fee of up to 5% of the item price plus up to $1. Depop Payments processing (via Stripe) still comes out of the seller's proceeds and is charged on the item price plus shipping plus any applicable taxes. The US rate is 3.3% + $0.45; the UK is 2.9% + £0.30 and Australia 2.6% + A$0.30. Sellers outside those three countries still pay Depop's 10% selling fee. Boosted Listings cost a further 12% in the US and UK on new listings from 23 March 2026 — not modelled here, since boosting is opt-in per listing."
        },
        {
          "id": "vinted",
          "label": "Vinted",
          "shippingModel": "buyer-pays",
          "commission": {
            "mode": "flat-rate",
            "rate": 0
          },
          "processingRate": 0,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "Vinted charges sellers nothing — no listing fee, no commission, no processing fee, and the seller keeps 100% of the item price. Buyers pay for shipping and a Buyer Protection fee of 5% of the item price plus a fixed amount. Optional paid promotion (bumping) exists but is opt-in per listing and is not modelled."
        },
        {
          "id": "ebay",
          "label": "eBay",
          "shippingModel": "seller-choice",
          "commissionIncludesShipping": true,
          "commission": {
            "mode": "tiered",
            "tiers": [
              {
                "upTo": 7500,
                "rate": 0.136
              },
              {
                "upTo": null,
                "rate": 0.0235
              }
            ]
          },
          "perOrderFee": {
            "underOrEqual10": 0.3,
            "over10": 0.4
          },
          "processingRate": 0,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "eBay's final value fee includes payment processing and is charged on the total including shipping you collect."
        },
        {
          "id": "stockx",
          "label": "StockX",
          "shippingModel": "seller-pays",
          "commission": {
            "mode": "level-based",
            "levels": [
              {
                "id": "level-1",
                "label": "Level 1",
                "rate": 0.09
              },
              {
                "id": "level-2",
                "label": "Level 2",
                "rate": 0.085
              },
              {
                "id": "level-3",
                "label": "Level 3",
                "rate": 0.08
              },
              {
                "id": "level-4",
                "label": "Level 4",
                "rate": 0.075
              },
              {
                "id": "level-5",
                "label": "Level 5",
                "rate": 0.07
              }
            ],
            "minimumFee": 5
          },
          "processingRate": 0.03,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "Transaction fee falls as your seller level rises: 9% / 8.5% / 8% / 7.5% / 7% for Levels 1 to 5, on the final sale price, plus a 3% payment processing fee. A regional minimum seller fee applies — $5 in the US — which is what makes StockX poor for cheap items regardless of level. Levels 3 to 5 can earn a further 2% off through Quick Ship and Successful Ship bonuses; that discount is not modelled here because it depends on performance rather than level. Sellers always pay to ship to StockX for authentication. StockX was running a promotional 0% processing rate at the time of checking; the standing 3% is used here, since a promo rate would understate the ordinary cost."
        },
        {
          "id": "grailed",
          "label": "Grailed",
          "shippingModel": "seller-choice",
          "commission": {
            "mode": "tiered",
            "tierMode": "flat",
            "minimumFee": 1.99,
            "tiers": [
              {
                "upTo": 119.99,
                "rate": 0.06
              },
              {
                "upTo": null,
                "rate": 0.09
              }
            ]
          },
          "processingRate": 0.0349,
          "processingFixed": 0.49,
          "listingFee": 0,
          "note": "Two commission rates since 20 May 2026, not one: 6% with a $1.99 minimum below $120, and 9% at $120 and above. It is a cliff, not a marginal tier — a $130 sale pays 9% on the whole amount. Payment processing is separate at 3.49% + $0.49 for a US seller onboarded with Stripe; an eligible seller who has NOT onboarded pays 3.49% + $0.99, and a seller outside Stripe-eligible countries pays 4.99% + $0.49. Commission counts the shipping you charge the buyer unless you use a Grailed Label, in which case it is the listing price alone — this calculator assumes no Grailed Label, the more expensive case.",
          "commissionIncludesShipping": true
        },
        {
          "id": "etsy",
          "label": "Etsy",
          "shippingModel": "seller-choice",
          "commissionIncludesShipping": true,
          "commission": {
            "mode": "flat-rate",
            "rate": 0.065
          },
          "processingRate": 0.03,
          "processingFixed": 0.25,
          "listingFee": 0.2,
          "note": "Included here for comparison against resale platforms. Etsy's transaction fee applies to shipping you charge as well as the item price."
        },
        {
          "id": "facebook-marketplace",
          "label": "Facebook Marketplace (shipped)",
          "shippingModel": "seller-choice",
          "commission": {
            "mode": "flat-rate",
            "rate": 0.1,
            "minimumFee": 0.8
          },
          "processingRate": 0,
          "processingFixed": 0,
          "listingFee": 0,
          "note": "Selling fee is 10% of the whole transaction — item price plus shipping plus applicable taxes — with a $0.80 minimum per order, and it applies only to orders that go through Facebook checkout with shipping. Local pickup and any sale arranged off-platform carry no fee at all. The fee covers payment processing, purchase protection and support, so there is no separate processing charge. Sales tax is part of the fee base on Facebook but is not modelled by this calculator, so the figure here is slightly optimistic for taxed orders.",
          "commissionIncludesShipping": true
        }
      ]
    }
  },
  "shopify": {
    "en-US": {
      "version": "2026.1",
      "locale": "en-US",
      "platform": "Shopify",
      "marketplace": "Shopify (US merchant, USD)",
      "currency": "USD",
      "effective": "2026-01-01",
      "verifiedOn": null,
      "confidence": "partially-verified",
      "sources": [
        {
          "label": "Shopify — Pricing (US)",
          "url": "https://www.shopify.com/pricing",
          "retrieved": "2026-08-22"
        },
        {
          "label": "Shopify Help — Shopify Payments rates in the United States by card type",
          "url": "https://help.shopify.com/en/manual/payments/shopify-payments/transactions/credit-card-rates",
          "retrieved": "2026-08-21"
        }
      ],
      "verificationNote": "Re-checked 2026-08-22 from shopify.com/pricing via a US exit, which resolved the geolocation problem that blocked the 2026-08-21 attempt. CONFIRMED, all twelve figures matching what was already here: monthly-billed plan prices of $39 Basic, $105 Grow, $399 Advanced and $2,300 Plus, and the online card rates of 2.9% / 2.7% / 2.5% / 2.25%, each + $0.30. The third-party gateway fees (2% / 1% / 0.6% / 0.2%) were already confirmed on 2026-08-21. CORRECTION to the earlier note in this file: it said Shopify no longer publishes per-plan card rates publicly. That was wrong — they are listed on the pricing page beside each plan. The help-centre page that tells merchants to read their own rates from the admin is a different page, and reading only that one produced the wrong conclusion. STILL OPEN, which is why verifiedOn stays null: the annual-billing prices ($29 / $79 / $299), the in-person card rates, the international card surcharge, the currency conversion fee and the $15 chargeback fee. Also noted at the time of checking: a limited-time $1/month promotion on the first three plans. Promo pricing is deliberately NOT stored here — it expires, and a calculator that quietly uses a promo rate overstates what a real seller keeps once it lapses.",
      "plans": [
        {
          "id": "basic",
          "label": "Basic",
          "monthlyMonthly": 39,
          "monthlyAnnual": 29,
          "online": {
            "rate": 0.029,
            "fixed": 0.3
          },
          "inPerson": {
            "rate": 0.027,
            "fixed": 0
          },
          "thirdPartyGatewayRate": 0.02
        },
        {
          "id": "grow",
          "label": "Grow",
          "monthlyMonthly": 105,
          "monthlyAnnual": 79,
          "online": {
            "rate": 0.027,
            "fixed": 0.3
          },
          "inPerson": {
            "rate": 0.026,
            "fixed": 0
          },
          "thirdPartyGatewayRate": 0.01
        },
        {
          "id": "advanced",
          "label": "Advanced",
          "monthlyMonthly": 399,
          "monthlyAnnual": 299,
          "online": {
            "rate": 0.025,
            "fixed": 0.3
          },
          "inPerson": {
            "rate": 0.025,
            "fixed": 0
          },
          "thirdPartyGatewayRate": 0.006
        },
        {
          "id": "plus",
          "label": "Plus",
          "monthlyMonthly": 2300,
          "monthlyAnnual": 2300,
          "online": {
            "rate": 0.0225,
            "fixed": 0.3
          },
          "inPerson": {
            "rate": 0.0225,
            "fixed": 0
          },
          "thirdPartyGatewayRate": 0.002
        }
      ],
      "internationalCardSurcharge": {
        "rate": 0.015,
        "note": "Added when the customer's card was issued outside the United States."
      },
      "currencyConversionFee": {
        "rate": 0.015,
        "note": "Applied by Shopify Payments when the sale currency differs from your payout currency."
      },
      "thirdPartyGatewayNote": "Shopify charges an additional transaction fee when you use any payment gateway other than Shopify Payments. This is on top of whatever the third-party gateway itself charges you.",
      "chargebackFee": 15
    }
  }
};

export const amazon = byLocale.amazon['en-US'];

export const ebay = byLocale.ebay['en-US'];

export const etsy = byLocale.etsy['en-US'];

export const processors = byLocale.processors['en-US'];

export const resellers = byLocale.resellers['en-US'];

export const shopify = byLocale.shopify['en-US'];

export const locales = {
  "en-GB": {
    "locale": "en-GB",
    "country": "United Kingdom",
    "countryCode": "GB",
    "language": "en",
    "currency": {
      "code": "GBP",
      "symbol": "£",
      "symbolPosition": "before",
      "minorUnitDigits": 2
    },
    "formatting": {
      "numberLocale": "en-GB",
      "dateFormat": "DD/MM/YYYY"
    }
  },
  "en-US": {
    "locale": "en-US",
    "country": "United States",
    "countryCode": "US",
    "language": "en",
    "currency": {
      "code": "USD",
      "symbol": "$",
      "symbolPosition": "before",
      "minorUnitDigits": 2
    },
    "formatting": {
      "numberLocale": "en-US",
      "dateFormat": "MM/DD/YYYY"
    }
  }
};

export const federal = {
  "version": "2026.1",
  "taxYear": 2026,
  "jurisdiction": "US Federal",
  "currency": "USD",
  "effective": "2026-01-01",
  "verifiedOn": "2026-08-02",
  "confidence": "verified",
  "note": "Inflation-adjusted figures for tax year 2026, filed in early 2027. Brackets, standard deduction, QBI thresholds, HSA limits and retirement limits were checked line by line against the IRS primary sources listed below on 2 August 2026. The FICA wage base and rates were confirmed against IRS Topic 751. One figure remains unconfirmed: the business standard mileage rate, which the IRS announces each December — see the note on that field. This file is the single source of truth for every tax figure on the site and must be replaced each year.",
  "sources": [
    {
      "label": "IRS Rev. Proc. 2025-32 — inflation adjustments for tax year 2026",
      "url": "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf",
      "retrieved": "2026-08-02"
    },
    {
      "label": "IRS Topic 751 — Social Security and Medicare withholding rates",
      "url": "https://www.irs.gov/taxtopics/tc751",
      "retrieved": "2026-08-02"
    },
    {
      "label": "IRS — COLA increases for dollar limitations on benefits and contributions",
      "url": "https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions",
      "retrieved": "2026-08-02"
    },
    {
      "label": "IRS Rev. Proc. 2025-19 — 2026 HSA and HDHP inflation adjustments",
      "url": "https://www.irs.gov/pub/irs-drop/rp-25-19.pdf",
      "retrieved": "2026-08-02"
    },
    {
      "label": "IRS Publication 15-T — Federal income tax withholding methods",
      "url": "https://www.irs.gov/pub/irs-pdf/p15t.pdf",
      "retrieved": null
    },
    {
      "label": "IRS Form 1040-ES — Estimated tax for individuals",
      "url": "https://www.irs.gov/pub/irs-pdf/f1040es.pdf",
      "retrieved": null
    }
  ],
  "filingStatuses": [
    {
      "id": "single",
      "label": "Single"
    },
    {
      "id": "married_joint",
      "label": "Married filing jointly"
    },
    {
      "id": "married_separate",
      "label": "Married filing separately"
    },
    {
      "id": "head_of_household",
      "label": "Head of household"
    }
  ],
  "standardDeduction": {
    "single": 16100,
    "married_joint": 32200,
    "married_separate": 16100,
    "head_of_household": 24150,
    "additionalAge65OrBlind": {
      "single": 2050,
      "head_of_household": 2050,
      "married_joint": 1650,
      "married_separate": 1650
    },
    "note": "The additional amount is per qualifying condition per person — someone who is both 65+ and blind gets it twice."
  },
  "brackets": {
    "single": [
      {
        "upTo": 12400,
        "rate": 0.1
      },
      {
        "upTo": 50400,
        "rate": 0.12
      },
      {
        "upTo": 105700,
        "rate": 0.22
      },
      {
        "upTo": 201775,
        "rate": 0.24
      },
      {
        "upTo": 256225,
        "rate": 0.32
      },
      {
        "upTo": 640600,
        "rate": 0.35
      },
      {
        "upTo": null,
        "rate": 0.37
      }
    ],
    "married_joint": [
      {
        "upTo": 24800,
        "rate": 0.1
      },
      {
        "upTo": 100800,
        "rate": 0.12
      },
      {
        "upTo": 211400,
        "rate": 0.22
      },
      {
        "upTo": 403550,
        "rate": 0.24
      },
      {
        "upTo": 512450,
        "rate": 0.32
      },
      {
        "upTo": 768700,
        "rate": 0.35
      },
      {
        "upTo": null,
        "rate": 0.37
      }
    ],
    "married_separate": [
      {
        "upTo": 12400,
        "rate": 0.1
      },
      {
        "upTo": 50400,
        "rate": 0.12
      },
      {
        "upTo": 105700,
        "rate": 0.22
      },
      {
        "upTo": 201775,
        "rate": 0.24
      },
      {
        "upTo": 256225,
        "rate": 0.32
      },
      {
        "upTo": 384350,
        "rate": 0.35
      },
      {
        "upTo": null,
        "rate": 0.37
      }
    ],
    "head_of_household": [
      {
        "upTo": 17700,
        "rate": 0.1
      },
      {
        "upTo": 67450,
        "rate": 0.12
      },
      {
        "upTo": 105700,
        "rate": 0.22
      },
      {
        "upTo": 201750,
        "rate": 0.24
      },
      {
        "upTo": 256200,
        "rate": 0.32
      },
      {
        "upTo": 640600,
        "rate": 0.35
      },
      {
        "upTo": null,
        "rate": 0.37
      }
    ]
  },
  "fica": {
    "socialSecurity": {
      "employeeRate": 0.062,
      "employerRate": 0.062,
      "wageBase": 184500
    },
    "medicare": {
      "employeeRate": 0.0145,
      "employerRate": 0.0145,
      "additionalRate": 0.009,
      "additionalThreshold": {
        "single": 200000,
        "married_joint": 250000,
        "married_separate": 125000,
        "head_of_household": 200000
      },
      "additionalNote": "The 0.9% Additional Medicare Tax is employee-only — employers do not match it."
    }
  },
  "selfEmployment": {
    "netEarningsFactor": 0.9235,
    "socialSecurityRate": 0.124,
    "medicareRate": 0.029,
    "additionalMedicareRate": 0.009,
    "deductibleShare": 0.5,
    "filingThreshold": 400,
    "churchEmployeeThreshold": 108.28,
    "note": "SE tax is calculated on 92.35% of net self-employment earnings — the 7.65% adjustment mirrors the employer-side FICA that a W-2 worker's employer pays. Half of the resulting SE tax is deductible from AGI as an above-the-line deduction."
  },
  "qbi": {
    "rate": 0.2,
    "thresholds": {
      "single": 201750,
      "married_joint": 403500,
      "married_separate": 201775,
      "head_of_household": 201750
    },
    "phaseInRange": {
      "single": 75000,
      "married_joint": 150000,
      "married_separate": 75000,
      "head_of_household": 75000
    },
    "note": "Section 199A qualified business income deduction. Above the threshold the deduction is limited by W-2 wages and property basis, and specified service businesses phase out entirely. This site applies the simple 20% case and warns above the threshold. TRAP FOR MAINTAINERS: the §199A threshold amounts ($201,750 single / $403,500 joint, per Rev. Proc. 2025-32 §4.26) are NOT the same as the 24%/32% income tax bracket boundaries ($201,775 / $403,550, per §4.01) — they differ by $25 and $50 and are easy to transpose. This file had exactly that error before 2 August 2026."
  },
  "estimatedTax": {
    "safeHarborPriorYear": 1,
    "safeHarborPriorYearHighIncome": 1.1,
    "highIncomeThreshold": 150000,
    "safeHarborCurrentYear": 0.9,
    "underpaymentThreshold": 1000,
    "dueDates": [
      {
        "quarter": 1,
        "period": "1 Jan – 31 Mar",
        "due": "2026-04-15"
      },
      {
        "quarter": 2,
        "period": "1 Apr – 31 May",
        "due": "2026-06-15"
      },
      {
        "quarter": 3,
        "period": "1 Jun – 31 Aug",
        "due": "2026-09-15"
      },
      {
        "quarter": 4,
        "period": "1 Sep – 31 Dec",
        "due": "2027-01-15"
      }
    ],
    "note": "Quarterly periods are not equal calendar quarters — Q2 covers two months and Q3 covers three. Safe harbour: pay 100% of last year's total tax (110% if prior-year AGI exceeded $150,000) or 90% of this year's, and no underpayment penalty applies."
  },
  "payFrequencies": [
    {
      "id": "weekly",
      "label": "Weekly",
      "perYear": 52
    },
    {
      "id": "biweekly",
      "label": "Every 2 weeks",
      "perYear": 26
    },
    {
      "id": "semimonthly",
      "label": "Twice a month",
      "perYear": 24
    },
    {
      "id": "monthly",
      "label": "Monthly",
      "perYear": 12
    },
    {
      "id": "quarterly",
      "label": "Quarterly",
      "perYear": 4
    },
    {
      "id": "annual",
      "label": "Annually",
      "perYear": 1
    }
  ],
  "retirement": {
    "elective401kLimit": 24500,
    "catchUp50Plus": 8000,
    "catchUp60to63": 11250,
    "totalContributionLimit": 72000,
    "iraLimit": 7500,
    "iraCatchUp": 1100,
    "sepIraRate": 0.25,
    "soloK401kNote": "A solo 401(k) allows both the employee elective deferral and an employer profit-sharing contribution of up to 25% of net self-employment earnings.",
    "hsaSelfOnly": 4400,
    "hsaFamily": 8750,
    "hsaCatchUp55": 1000
  },
  "mileageRate": {
    "business": 0.7,
    "note": "IRS standard mileage rate for business use. Confirm the 2026 figure — the rate is announced each December for the following year."
  }
};

export const states = {
  "CA": {
    "version": "2026.2",
    "taxYear": 2026,
    "incomeTaxScheduleYear": 2025,
    "state": "CA",
    "name": "California",
    "slug": "california",
    "hasIncomeTax": true,
    "effective": "2026-01-01",
    "verifiedOn": "2026-08-21",
    "confidence": "verified",
    "sources": [
      {
        "label": "California FTB — 2025 California Tax Rate Schedules (Form 540)",
        "url": "https://www.ftb.ca.gov/forms/2025/2025-540-tax-rate-schedules.pdf",
        "retrieved": "2026-08-21"
      },
      {
        "label": "California FTB — Standard deduction",
        "url": "https://www.ftb.ca.gov/file/personal/deductions/index.html",
        "retrieved": "2026-08-21"
      },
      {
        "label": "California FTB — 2025 Form 540 (exemption credit amounts)",
        "url": "https://www.ftb.ca.gov/forms/2025/2025-540.pdf",
        "retrieved": "2026-08-21"
      },
      {
        "label": "California FTB — 2026 Instructions for Form 540-ES",
        "url": "https://www.ftb.ca.gov/forms/2026/2026-540-es-instructions.html",
        "retrieved": "2026-08-21"
      },
      {
        "label": "California EDD — Payroll tax rates and withholding (SDI)",
        "url": "https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/",
        "retrieved": "2026-08-21"
      }
    ],
    "verificationNote": "Corrected 2026-08-21. The previous version of this file carried California's 2024 brackets and 2024 exemption credits under a 2026 label, with a standard deduction that matched no published year at all. Every figure below now comes from an FTB primary document. Note the deliberate mixed vintage: California had not published indexed 2026 income tax schedules as of 21 August 2026 — FTB's own 2026 Form 540-ES instructions direct filers to the 2025 Form 540 amounts — so the brackets, standard deduction and exemption credits below are the official 2025 schedules, flagged by incomeTaxScheduleYear. The SDI rate is different: EDD has published a 2026 figure, and it is used. Re-check the brackets once FTB posts the 2026 rate schedules, normally late in the year.",
    "method": "progressive",
    "standardDeduction": {
      "single": 5706,
      "married_joint": 11412,
      "married_separate": 5706,
      "head_of_household": 11412
    },
    "personalExemptionCredit": {
      "single": 153,
      "married_joint": 306,
      "married_separate": 153,
      "head_of_household": 153,
      "perDependent": 475,
      "note": "California uses an exemption credit that reduces tax owed directly, not a deduction that reduces taxable income. 2025 amounts: $153 per personal exemption (so $306 for a joint return claiming two) and $475 per dependent. An extra $153 applies for each taxpayer who is 65 or older, and again for each who is blind — neither is modelled here."
    },
    "brackets": {
      "single": [
        {
          "upTo": 11079,
          "rate": 0.01
        },
        {
          "upTo": 26264,
          "rate": 0.02
        },
        {
          "upTo": 41452,
          "rate": 0.04
        },
        {
          "upTo": 57542,
          "rate": 0.06
        },
        {
          "upTo": 72724,
          "rate": 0.08
        },
        {
          "upTo": 371479,
          "rate": 0.093
        },
        {
          "upTo": 445771,
          "rate": 0.103
        },
        {
          "upTo": 742953,
          "rate": 0.113
        },
        {
          "upTo": null,
          "rate": 0.123
        }
      ],
      "married_joint": [
        {
          "upTo": 22158,
          "rate": 0.01
        },
        {
          "upTo": 52528,
          "rate": 0.02
        },
        {
          "upTo": 82904,
          "rate": 0.04
        },
        {
          "upTo": 115084,
          "rate": 0.06
        },
        {
          "upTo": 145448,
          "rate": 0.08
        },
        {
          "upTo": 742958,
          "rate": 0.093
        },
        {
          "upTo": 891542,
          "rate": 0.103
        },
        {
          "upTo": 1485906,
          "rate": 0.113
        },
        {
          "upTo": null,
          "rate": 0.123
        }
      ],
      "married_separate": [
        {
          "upTo": 11079,
          "rate": 0.01
        },
        {
          "upTo": 26264,
          "rate": 0.02
        },
        {
          "upTo": 41452,
          "rate": 0.04
        },
        {
          "upTo": 57542,
          "rate": 0.06
        },
        {
          "upTo": 72724,
          "rate": 0.08
        },
        {
          "upTo": 371479,
          "rate": 0.093
        },
        {
          "upTo": 445771,
          "rate": 0.103
        },
        {
          "upTo": 742953,
          "rate": 0.113
        },
        {
          "upTo": null,
          "rate": 0.123
        }
      ],
      "head_of_household": [
        {
          "upTo": 22173,
          "rate": 0.01
        },
        {
          "upTo": 52530,
          "rate": 0.02
        },
        {
          "upTo": 67716,
          "rate": 0.04
        },
        {
          "upTo": 83805,
          "rate": 0.06
        },
        {
          "upTo": 98990,
          "rate": 0.08
        },
        {
          "upTo": 505208,
          "rate": 0.093
        },
        {
          "upTo": 606251,
          "rate": 0.103
        },
        {
          "upTo": 1010417,
          "rate": 0.113
        },
        {
          "upTo": null,
          "rate": 0.123
        }
      ]
    },
    "surtaxes": [
      {
        "id": "mental-health",
        "label": "Mental Health Services Tax",
        "rate": 0.01,
        "thresholdTaxableIncome": 1000000,
        "note": "An extra 1% applies to taxable income above $1 million, funding the Mental Health Services Act."
      }
    ],
    "payrollTaxes": [
      {
        "id": "sdi",
        "label": "CA State Disability Insurance (SDI)",
        "rate": 0.013,
        "wageCap": null,
        "appliesTo": "wages",
        "note": "The 2026 SDI withholding rate is 1.3%, up from 1.2% in 2025. Senate Bill 951 removed the taxable wage ceiling effective 1 January 2024, so this applies to every dollar of wages with no cap. It does not apply to self-employment income unless you elect into Disability Insurance Elective Coverage."
      }
    ],
    "localTaxes": [],
    "notes": [
      "California does not conform to the federal Qualified Business Income deduction — self-employed Californians pay state tax on the full amount.",
      "California taxes capital gains as ordinary income at the same rates shown above."
    ]
  },
  "FL": {
    "version": "2026.1",
    "taxYear": 2026,
    "state": "FL",
    "name": "Florida",
    "slug": "florida",
    "hasIncomeTax": false,
    "effective": "2026-01-01",
    "verifiedOn": "2026-08-21",
    "confidence": "verified",
    "sources": [
      {
        "label": "Florida Constitution — Article VII, Section 5 (estate, inheritance and income taxes)",
        "url": "https://www.flsenate.gov/Laws/Constitution#A7S05",
        "retrieved": "2026-08-21"
      },
      {
        "label": "Florida Department of Revenue — Taxes and fees",
        "url": "https://floridarevenue.com/taxes/taxesfees/Pages/default.aspx",
        "retrieved": "2026-08-21"
      },
      {
        "label": "Florida Department of Revenue — Corporate income tax",
        "url": "https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx",
        "retrieved": "2026-08-21"
      }
    ],
    "method": "none",
    "flatRate": 0,
    "standardDeduction": {
      "single": 0,
      "married_joint": 0,
      "married_separate": 0,
      "head_of_household": 0
    },
    "brackets": {
      "single": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "married_joint": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "married_separate": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "head_of_household": [
        {
          "upTo": null,
          "rate": 0
        }
      ]
    },
    "surtaxes": [],
    "payrollTaxes": [],
    "localTaxes": [],
    "notes": [
      "Florida levies no individual income tax. Article VII, Section 5 of the state constitution caps any tax on the income of natural persons at the amount creditable against a similar federal tax — and because no such federal credit exists, that cap is zero.",
      "Self-employed Floridians still owe federal self-employment tax and federal income tax. Only the state layer is zero.",
      "Florida corporations pay a 5.5% corporate income tax on taxable years beginning on or after 1 January 2022, but income passed through an LLC or sole proprietorship to an individual is not taxed at the state level."
    ]
  },
  "IL": {
    "version": "2026.1",
    "taxYear": 2026,
    "state": "IL",
    "name": "Illinois",
    "slug": "illinois",
    "hasIncomeTax": true,
    "effective": "2026-01-01",
    "verifiedOn": "2026-08-21",
    "confidence": "verified",
    "sources": [
      {
        "label": "Illinois Department of Revenue — 2026 Booklet IL-700-T withholding tax tables",
        "url": "https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/withholding/documents/currentyear/il-700-t.pdf",
        "retrieved": "2026-08-21"
      },
      {
        "label": "Illinois Department of Revenue — Bulletin FY 2026-15, What's New for Illinois Income Taxes",
        "url": "https://tax.illinois.gov/research/publications/bulletins/fy-2026-15.html",
        "retrieved": "2026-08-21"
      },
      {
        "label": "Illinois Department of Revenue — What is the Illinois personal exemption allowance?",
        "url": "https://tax.illinois.gov/questionsandanswers/answer.851.html",
        "retrieved": "2026-08-21"
      }
    ],
    "method": "flat",
    "flatRate": 0.0495,
    "standardDeduction": {
      "single": 0,
      "married_joint": 0,
      "married_separate": 0,
      "head_of_household": 0
    },
    "personalExemptionCredit": {
      "mode": "deduction",
      "single": 2925,
      "married_joint": 5850,
      "married_separate": 2925,
      "head_of_household": 2925,
      "perDependent": 2925,
      "incomeLimitSingle": 250000,
      "incomeLimitJoint": 500000,
      "note": "Illinois allows a personal exemption as a deduction from base income: $2,925 per allowance for tax year 2026 (up from $2,850 in 2025). Booklet IL-700-T works the joint figure as 2 x $2,925 = $5,850. The exemption is unavailable above $250,000 of adjusted gross income ($500,000 filing jointly)."
    },
    "brackets": {
      "single": [
        {
          "upTo": null,
          "rate": 0.0495
        }
      ],
      "married_joint": [
        {
          "upTo": null,
          "rate": 0.0495
        }
      ],
      "married_separate": [
        {
          "upTo": null,
          "rate": 0.0495
        }
      ],
      "head_of_household": [
        {
          "upTo": null,
          "rate": 0.0495
        }
      ]
    },
    "surtaxes": [],
    "payrollTaxes": [],
    "localTaxes": [],
    "notes": [
      "Illinois has a flat 4.95% income tax written into its constitution — a 2020 ballot measure to allow graduated rates failed.",
      "Illinois does not tax retirement income, including distributions from 401(k) plans, IRAs, and Social Security.",
      "Illinois does not conform to the federal Qualified Business Income deduction."
    ]
  },
  "NY": {
    "version": "2026.2",
    "taxYear": 2026,
    "incomeTaxScheduleYear": 2025,
    "state": "NY",
    "name": "New York",
    "slug": "new-york",
    "hasIncomeTax": true,
    "effective": "2026-01-01",
    "verifiedOn": "2026-08-21",
    "confidence": "verified",
    "sources": [
      {
        "label": "New York State — 2025 Instructions for Form IT-201 (state, NYC rate schedules and standard deduction table)",
        "url": "https://www.tax.ny.gov/forms/html-instructions/2025/it/it201i-2025.htm#nys-tax-rate-schedule",
        "retrieved": "2026-08-21"
      },
      {
        "label": "New York State Department of Taxation and Finance — Income tax rates and tables",
        "url": "https://www.tax.ny.gov/pit/file/tax-tables/",
        "retrieved": "2026-08-21"
      },
      {
        "label": "NY Paid Family Leave — 2026 updates",
        "url": "https://paidfamilyleave.ny.gov/2026",
        "retrieved": "2026-08-21"
      }
    ],
    "verificationNote": "Checked line by line against the 2025 Form IT-201 instructions on 2026-08-21. The state brackets (all four filing statuses), the standard deduction table and the New York City resident rate schedule all matched exactly and were left untouched — New York's brackets are statutory rather than inflation-indexed, which is why they had not drifted. One real correction: Paid Family Leave is 0.432% for 2026, not the 0.388% carried here from 2025, and the annual cap moved from $354.53 to $411.91. As with California, New York had not published 2026 income tax schedules as of 21 August 2026 (the department's own index lists 2025 as the latest), so the income tax figures are the 2025 ones, flagged by incomeTaxScheduleYear. The old source URL in this file, tax_tables.htm, now only serves a redirect notice and has been replaced.",
    "method": "progressive",
    "standardDeduction": {
      "single": 8000,
      "married_joint": 16050,
      "married_separate": 8000,
      "head_of_household": 11200
    },
    "personalExemptionCredit": {
      "single": 0,
      "married_joint": 0,
      "married_separate": 0,
      "head_of_household": 0,
      "perDependent": 1000,
      "mode": "deduction",
      "note": "New York allows a $1,000 dependent exemption as a deduction. There is no personal exemption for the filer."
    },
    "brackets": {
      "single": [
        {
          "upTo": 8500,
          "rate": 0.04
        },
        {
          "upTo": 11700,
          "rate": 0.045
        },
        {
          "upTo": 13900,
          "rate": 0.0525
        },
        {
          "upTo": 80650,
          "rate": 0.055
        },
        {
          "upTo": 215400,
          "rate": 0.06
        },
        {
          "upTo": 1077550,
          "rate": 0.0685
        },
        {
          "upTo": 5000000,
          "rate": 0.0965
        },
        {
          "upTo": 25000000,
          "rate": 0.103
        },
        {
          "upTo": null,
          "rate": 0.109
        }
      ],
      "married_joint": [
        {
          "upTo": 17150,
          "rate": 0.04
        },
        {
          "upTo": 23600,
          "rate": 0.045
        },
        {
          "upTo": 27900,
          "rate": 0.0525
        },
        {
          "upTo": 161550,
          "rate": 0.055
        },
        {
          "upTo": 323200,
          "rate": 0.06
        },
        {
          "upTo": 2155350,
          "rate": 0.0685
        },
        {
          "upTo": 5000000,
          "rate": 0.0965
        },
        {
          "upTo": 25000000,
          "rate": 0.103
        },
        {
          "upTo": null,
          "rate": 0.109
        }
      ],
      "married_separate": [
        {
          "upTo": 8500,
          "rate": 0.04
        },
        {
          "upTo": 11700,
          "rate": 0.045
        },
        {
          "upTo": 13900,
          "rate": 0.0525
        },
        {
          "upTo": 80650,
          "rate": 0.055
        },
        {
          "upTo": 215400,
          "rate": 0.06
        },
        {
          "upTo": 1077550,
          "rate": 0.0685
        },
        {
          "upTo": 5000000,
          "rate": 0.0965
        },
        {
          "upTo": 25000000,
          "rate": 0.103
        },
        {
          "upTo": null,
          "rate": 0.109
        }
      ],
      "head_of_household": [
        {
          "upTo": 12800,
          "rate": 0.04
        },
        {
          "upTo": 17650,
          "rate": 0.045
        },
        {
          "upTo": 20900,
          "rate": 0.0525
        },
        {
          "upTo": 107650,
          "rate": 0.055
        },
        {
          "upTo": 269300,
          "rate": 0.06
        },
        {
          "upTo": 1616450,
          "rate": 0.0685
        },
        {
          "upTo": 5000000,
          "rate": 0.0965
        },
        {
          "upTo": 25000000,
          "rate": 0.103
        },
        {
          "upTo": null,
          "rate": 0.109
        }
      ]
    },
    "surtaxes": [],
    "payrollTaxes": [
      {
        "id": "sdi",
        "label": "NY State Disability Insurance",
        "rate": 0.005,
        "weeklyCap": 0.6,
        "appliesTo": "wages",
        "note": "0.5% of wages, capped at $0.60 per week — a maximum of $31.20 per year."
      },
      {
        "id": "pfl",
        "label": "NY Paid Family Leave",
        "rate": 0.00432,
        "wageCap": 95348.76,
        "annualCap": 411.91,
        "appliesTo": "wages",
        "note": "0.432% of wages for 2026, up from 0.388% in 2025, capped at $411.91 a year. The cap is the New York State Average Weekly Wage of $1,833.63 annualised over 52 weeks. Both the rate and the wage are reset every year — re-check each January."
      }
    ],
    "localTaxes": [
      {
        "id": "nyc",
        "label": "New York City resident income tax",
        "method": "progressive",
        "optional": true,
        "brackets": {
          "single": [
            {
              "upTo": 12000,
              "rate": 0.03078
            },
            {
              "upTo": 25000,
              "rate": 0.03762
            },
            {
              "upTo": 50000,
              "rate": 0.03819
            },
            {
              "upTo": null,
              "rate": 0.03876
            }
          ],
          "married_joint": [
            {
              "upTo": 21600,
              "rate": 0.03078
            },
            {
              "upTo": 45000,
              "rate": 0.03762
            },
            {
              "upTo": 90000,
              "rate": 0.03819
            },
            {
              "upTo": null,
              "rate": 0.03876
            }
          ],
          "married_separate": [
            {
              "upTo": 12000,
              "rate": 0.03078
            },
            {
              "upTo": 25000,
              "rate": 0.03762
            },
            {
              "upTo": 50000,
              "rate": 0.03819
            },
            {
              "upTo": null,
              "rate": 0.03876
            }
          ],
          "head_of_household": [
            {
              "upTo": 14400,
              "rate": 0.03078
            },
            {
              "upTo": 30000,
              "rate": 0.03762
            },
            {
              "upTo": 60000,
              "rate": 0.03819
            },
            {
              "upTo": null,
              "rate": 0.03876
            }
          ]
        },
        "note": "Charged on New York City residents only. Yonkers residents pay a separate surcharge of 16.75% of net state tax."
      }
    ],
    "notes": [
      "New York applies a supplemental tax recapture that claws back the benefit of lower brackets for high earners. This site does not model the recapture and will understate tax above roughly $107,650 of New York adjusted gross income.",
      "New York does not conform to the federal Qualified Business Income deduction."
    ]
  },
  "TX": {
    "version": "2026.1",
    "taxYear": 2026,
    "state": "TX",
    "name": "Texas",
    "slug": "texas",
    "hasIncomeTax": false,
    "effective": "2026-01-01",
    "verifiedOn": "2026-08-21",
    "confidence": "verified",
    "sources": [
      {
        "label": "Texas Constitution — Article VIII, Section 24-a (added by Proposition 4, November 2019)",
        "url": "https://statutes.capitol.texas.gov/Docs/CN/htm/CN.8.htm",
        "retrieved": "2026-08-21"
      },
      {
        "label": "Texas Comptroller — Texas taxes",
        "url": "https://comptroller.texas.gov/taxes/",
        "retrieved": "2026-08-21"
      }
    ],
    "method": "none",
    "flatRate": 0,
    "standardDeduction": {
      "single": 0,
      "married_joint": 0,
      "married_separate": 0,
      "head_of_household": 0
    },
    "brackets": {
      "single": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "married_joint": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "married_separate": [
        {
          "upTo": null,
          "rate": 0
        }
      ],
      "head_of_household": [
        {
          "upTo": null,
          "rate": 0
        }
      ]
    },
    "surtaxes": [],
    "payrollTaxes": [],
    "localTaxes": [],
    "notes": [
      "Texas levies no individual income tax. Proposition 4, approved by 74.7% of voters in November 2019, added Article VIII, Section 24-a to the state constitution: the legislature \"may not impose a tax on the net incomes of individuals, including an individual's share of partnership and unincorporated association income.\"",
      "Texas funds itself largely through sales tax and property tax instead — property tax rates in Texas are among the highest in the country, which offsets much of the income tax saving for homeowners.",
      "Self-employed Texans still owe federal self-employment tax and federal income tax. Only the state layer is zero.",
      "Businesses structured as LLCs or corporations may owe the Texas franchise tax, which is separate from individual income tax and applies above a revenue threshold."
    ]
  }
};

export const site = {
  "name": "AfterFees",
  "legalName": "AfterFees",
  "domain": "keepafterfees.com",
  "url": "https://keepafterfees.com",
  "tagline": "What you actually keep, after fees.",
  "description": "Free calculators that show online sellers, freelancers, and creators exactly what lands in their bank account after platform fees, payment processing, and tax.",
  "locale": "en-US",
  "language": "en",
  "currency": "USD",
  "taxYear": 2026,
  "author": {
    "name": "Ghanashyam D Raj",
    "jobTitle": "Founder and maintainer, AfterFees",
    "bio": "Calculators that show what a sale, invoice, or paycheck actually nets after fees and tax. Independent of every platform they measure — every rate cited to its source and dated, every calculation shown in full. See the disclaimer for what this site is and isn't.",
    "credentials": [],
    "sameAs": [
      "https://github.com/ghanashyamdraj-dotcom"
    ],
    "email": "hello@keepafterfees.com"
  },
  "organization": {
    "sameAs": [
      "https://github.com/ghanashyamdraj-dotcom/keepafterfees"
    ],
    "contactEmail": "hello@keepafterfees.com",
    "foundingDate": "2026"
  },
  "_setupWarning": "Author identity filled 2026-08-02. Still outstanding before launch: (1) sameAs URLs for both author and organization — an empty array is correct until profiles exist, a broken link is worse than an omission; (2) DONE 2026-08-22 — /terms/ governed by the laws of India, courts of Bengaluru, Karnataka; (3) DONE 2026-08-22 — contact moved to hello@keepafterfees.com via Cloudflare Email Routing.",
  "nav": [
    {
      "label": "Marketplace fees",
      "href": "/marketplace-fees/"
    },
    {
      "label": "Payment processors",
      "href": "/payment-processor-fees/"
    },
    {
      "label": "Freelance",
      "href": "/freelance-tools/"
    },
    {
      "label": "Paycheck",
      "href": "/paycheck-calculator/"
    },
    {
      "label": "About",
      "href": "/about/"
    }
  ],
  "footerNav": [
    {
      "label": "About",
      "href": "/about/"
    },
    {
      "label": "Contact",
      "href": "/contact/"
    },
    {
      "label": "Privacy",
      "href": "/privacy/"
    },
    {
      "label": "Terms",
      "href": "/terms/"
    },
    {
      "label": "Disclaimer",
      "href": "/disclaimer/"
    }
  ],
  "adSlots": {
    "enabled": true,
    "clientId": "ca-pub-9546036902768059",
    "note": "enabled:true loads the AdSense loader script sitewide, which is what Google needs in order to review the site and what lets Auto Ads serve. It also flips the Advertising and Your-rights sections of /privacy/ to their ad-serving wording — those are conditional on this flag, so the policy cannot silently disagree with what the site actually does.",
    "sizes": {
      "leaderboard": {
        "mobile": [
          320,
          100
        ],
        "desktop": [
          728,
          90
        ]
      },
      "result": {
        "mobile": [
          300,
          250
        ],
        "desktop": [
          336,
          280
        ]
      },
      "midContent": {
        "mobile": [
          300,
          250
        ],
        "desktop": [
          336,
          280
        ]
      },
      "rail": {
        "mobile": [
          300,
          250
        ],
        "desktop": [
          300,
          600
        ]
      },
      "endContent": {
        "mobile": [
          300,
          250
        ],
        "desktop": [
          336,
          280
        ]
      }
    },
    "sizeNote": "midContent and endContent sit inside the 720px prose column, so they declare 336x280 rather than a 728x90 leaderboard — a 728-wide unit cannot fit there and would be clamped to 720, leaving the declared size a lie. Only the leaderboard, which sits in the full-width wrap, is 728x90.",
    "railNote": "The rail renders only at 1100px and up, in the gutter beside the 720px prose column that was previously empty. It is hidden — not merely empty — below that width, so it costs mobile nothing.",
    "slotIds": {
      "leaderboard": "",
      "result": "",
      "midContent": "",
      "rail": "",
      "endContent": ""
    },
    "slotIdNote": "Populate each of these with the ad unit ID from AdSense once the account is approved and you have created the units. A position with an empty id renders the reserved, correctly-sized container and nothing else — so the layout is already holding the space, and filling these in causes no layout shift."
  },
  "affiliates": {
    "enabled": false,
    "disclosure": "Some links on this page are affiliate links. If you sign up through one we may earn a commission at no extra cost to you. It does not affect the numbers this calculator produces or which tools we recommend.",
    "slots": {
      "amazon-fba": [
        {
          "label": "Helium 10",
          "note": "Product research and keyword tools for FBA sellers",
          "url": ""
        },
        {
          "label": "Jungle Scout",
          "note": "Product database and sales estimates",
          "url": ""
        }
      ],
      "self-employment-tax": [
        {
          "label": "LLC formation",
          "note": "Register an LLC and get an EIN",
          "url": ""
        },
        {
          "label": "Bookkeeping software",
          "note": "Track deductible expenses through the year",
          "url": ""
        }
      ],
      "freelance-hourly-rate": [
        {
          "label": "Invoicing software",
          "note": "Send invoices and chase payment automatically",
          "url": ""
        },
        {
          "label": "Business banking",
          "note": "Separate business account with no monthly fee",
          "url": ""
        }
      ]
    }
  },
  "verification": {
    "bing": "E3A5B5631070A0E3EBE612993E815B82",
    "note": "Search-engine ownership tokens. The build writes /BingSiteAuth.xml from the value above — do NOT hand-place that file in dist/, because the build wipes dist/ on every run and the next deploy would silently un-verify the site. Google Search Console is verified by DNS TXT record instead, which lives in Cloudflare and needs nothing here; that is the better method anyway, since a Domain property covers http, https, www and bare in one go."
  },
  "analytics": {
    "provider": "none",
    "note": "Cloudflare Web Analytics is free, cookieless, needs no consent banner, and adds one script tag. Set provider to 'cloudflare' and add the token when ready."
  }
};



export const RATES = { amazon, ebay, etsy, processors, resellers, shopify, byLocale, locales, federal, states, site };

export default RATES;
