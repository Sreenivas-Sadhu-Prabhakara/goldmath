/* ============================================================
   goldmath — corpus of hand-verified constants.

   14 facts. Every number the engine uses is READ FROM HERE
   (never re-typed in app.js). Every fact carries provenance:
   source_name, source_url, verified_how, as_of (ISO date).

   Verified 2026-07-22 against:
   - BIS IS 1417:2016 six caratage grades (BIS Hallmarking FAQ, bis.gov.in)
   - CBIC GST rate schedule (gold jewellery HSN 7113 @ 3%; making
     charges as job-work SAC 9988 @ 5% when billed separately)
   - Standard Indian bullion unit references (1 tola = 11.6638 g)
   ============================================================ */

const AS_OF = '2026-07-22';

const FACTS = [
  /* ---- (1..6) BIS IS 1417:2016 purity grades ---- */
  {
    id: 'purity-14k',
    category: 'purity',
    label: '14K585',
    statement: '14-carat gold is hallmarked at 585 fineness (58.5% pure gold) under IS 1417.',
    values: { karat: 14, fineness: 585 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'Authoring-time read of the BIS FAQ "IS 1417:2016 permits hallmarking of six caratage (fineness in ppt): 14K(585), 18K(750), 20K(833), 22K(916), 23K(958), 24KS(995)"; plus a Node self-test asserting fineness/1000 within 2‰ of karat/24.',
    as_of: AS_OF
  },
  {
    id: 'purity-18k',
    category: 'purity',
    label: '18K750',
    statement: '18-carat gold is hallmarked at 750 fineness (75.0% pure gold) under IS 1417.',
    values: { karat: 18, fineness: 750 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'BIS FAQ six-grade list; Node self-test fineness/1000 within 2‰ of karat/24.',
    as_of: AS_OF
  },
  {
    id: 'purity-20k',
    category: 'purity',
    label: '20K833',
    statement: '20-carat gold is hallmarked at 833 fineness (83.3% pure gold) under IS 1417.',
    values: { karat: 20, fineness: 833 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'BIS FAQ six-grade list; Node self-test fineness/1000 within 2‰ of karat/24.',
    as_of: AS_OF
  },
  {
    id: 'purity-22k',
    category: 'purity',
    label: '22K916',
    statement: '22-carat gold is hallmarked at 916 fineness (91.6% pure gold) under IS 1417 — the most common Indian jewellery grade.',
    values: { karat: 22, fineness: 916 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'BIS FAQ six-grade list; Node self-test fineness/1000 within 2‰ of karat/24.',
    as_of: AS_OF
  },
  {
    id: 'purity-23k',
    category: 'purity',
    label: '23K958',
    statement: '23-carat gold is hallmarked at 958 fineness (95.8% pure gold) under IS 1417.',
    values: { karat: 23, fineness: 958 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'BIS FAQ six-grade list; Node self-test fineness/1000 within 2‰ of karat/24.',
    as_of: AS_OF
  },
  {
    id: 'purity-24k',
    category: 'purity',
    label: '24K995',
    statement: 'The highest hallmarked grade (24KS) is 995 fineness (99.5% pure gold) under IS 1417 — a certified minimum deliberately below 24/24, so metal value uses the stamped 995, not the karat/24 figure.',
    values: { karat: 24, fineness: 995 },
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking FAQ (IS 1417:2016)',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'BIS FAQ lists 24KS(995). Asserted SEPARATELY in the Node self-test: 995 is 5‰ from 24/24, so the blanket 2‰ karat/24 rule does NOT apply to this grade (adversarial-review blocker fix).',
    as_of: AS_OF
  },

  /* ---- (7..9) GST treatments ---- */
  {
    id: 'gst-gold',
    category: 'tax',
    label: 'GST 3% on gold jewellery',
    statement: 'Gold jewellery (HSN 7113) attracts 3% GST (1.5% CGST + 1.5% SGST) on the metal value.',
    values: { rate_gold_bps: 300 }, // basis points: 3.00%
    source_name: 'CBIC — GST rate schedule for goods (gold & articles of jewellery, HSN 7113)',
    source_url: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
    verified_how: 'Authoring-time check of the CBIC GST goods rate schedule: gold @ 1.5% CGST + 1.5% SGST = 3%. Surfaced in-app with as_of; verify against your own invoice.',
    as_of: AS_OF
  },
  {
    id: 'gst-making',
    category: 'tax',
    label: 'GST 5% on making (job-work)',
    statement: 'When making charges are billed separately as job-work/service (SAC 9988), they attract 5% GST.',
    values: { rate_making_bps: 500 }, // basis points: 5.00%
    source_name: 'CBIC — GST rate for job-work services (SAC 9988), making charges billed separately',
    source_url: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
    verified_how: 'Authoring-time check: making/job-work charges billed separately are taxed at 5% (SAC 9988). Only used in the "split" GST convention; the "composite" convention taxes the whole invoice at 3%.',
    as_of: AS_OF
  },
  {
    id: 'gst-composite',
    category: 'tax',
    label: 'Composite supply 3% on full value',
    statement: 'For a composite supply of finished jewellery, 3% GST applies to the full invoice value (gold + making + wastage), treating making as part of the jewellery supply.',
    values: { rate_composite_bps: 300 },
    source_name: 'CBIC — GST composite-supply treatment for finished jewellery (HSN 7113)',
    source_url: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
    verified_how: 'Authoring-time check: retail sale of finished jewellery as a composite supply is taxed at 3% on the total transaction value. The app lets you pick composite vs split because real bills use both.',
    as_of: AS_OF
  },

  /* ---- (10..11) unit facts ---- */
  {
    id: 'unit-tola',
    category: 'unit',
    label: '1 tola = 11.6638 g',
    statement: 'One tola equals 11.6638 grams — the traditional Indian bullion unit still used on many board rates.',
    values: { tola_grams: 11.6638 },
    source_name: 'Standard Indian bullion-market reference (tola = 11.6638 g)',
    source_url: 'https://en.wikipedia.org/wiki/Tola_(unit)',
    verified_how: 'Standard bullion unit; re-used by a self-test round-trip (rate per tola ÷ 11.6638 back to per gram within 1 paisa).',
    as_of: AS_OF
  },
  {
    id: 'unit-per10g',
    category: 'unit',
    label: 'Board rates often per 10 g',
    statement: 'Indian board rates are commonly quoted per 10 grams; divide by 10 to get the per-gram rate.',
    values: { board_grams: 10 },
    source_name: 'Standard Indian bullion-market convention (rate per 10 g)',
    source_url: 'https://en.wikipedia.org/wiki/Gold_as_an_investment',
    verified_how: 'Market convention; exercised by the rate-basis conversion self-test (per-10g rate ÷ 10).',
    as_of: AS_OF
  },

  /* ---- (12..14) billing conventions ---- */
  {
    id: 'conv-wastage',
    category: 'convention',
    label: 'Wastage (VA) = extra weight % at metal rate',
    statement: 'Wastage / value-addition (VA) is charged as an extra percentage of weight, priced at the metal rate — so 8% wastage on 10 g prices 10.8 g of metal.',
    values: {},
    source_name: 'BIS / Dept of Consumer Affairs — buying hallmarked jewellery guidance',
    source_url: 'https://consumeraffairs.nic.in/',
    verified_how: 'Authoring-time check of consumer jewellery-buying guidance on wastage/VA and making charges; exercised by the wastage-convention self-test.',
    as_of: AS_OF
  },
  {
    id: 'conv-making',
    category: 'convention',
    label: 'Making = ₹/g on gross OR % of metal value',
    statement: 'Making charges are quoted either as rupees per gram on gross weight or as a percentage of the metal value; both are common, so the app supports both modes.',
    values: {},
    source_name: 'BIS / Dept of Consumer Affairs — buying hallmarked jewellery guidance',
    source_url: 'https://consumeraffairs.nic.in/',
    verified_how: 'Authoring-time check of consumer guidance on making-charge quoting; both modes exercised by the making-charge self-tests.',
    as_of: AS_OF
  },
  {
    id: 'conv-stamped-fineness',
    category: 'convention',
    label: 'Use stamped fineness, not karat/24',
    statement: 'Hallmarked fineness is a certified minimum, so metal value uses the stamped fineness (e.g. 916/1000), never karat/24 arithmetic (916.67/1000).',
    values: {},
    source_name: 'BIS — Bureau of Indian Standards, Hallmarking consumer FAQ',
    source_url: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/',
    verified_how: 'Authoring-time read of BIS grade definitions; the metal-value self-test uses fineness/1000 = 0.916, not 22/24 = 0.91667.',
    as_of: AS_OF
  }
];

/* Convenience accessors the engine reads from (single source of truth). */
function factById(id) {
  return FACTS.find(function (f) { return f.id === id; });
}

/* The six purity grades, in ascending fineness order, for the picker + engine. */
function purityGrades() {
  return FACTS
    .filter(function (f) { return f.category === 'purity'; })
    .map(function (f) { return { id: f.id, karat: f.values.karat, fineness: f.values.fineness, label: f.label }; })
    .sort(function (a, b) { return a.fineness - b.fineness; });
}

/* Numeric constants the engine imports (never re-typed elsewhere). */
const CONSTANTS = {
  TOLA_GRAMS: factById('unit-tola').values.tola_grams,       // 11.6638
  BOARD_GRAMS: factById('unit-per10g').values.board_grams,   // 10
  GST_GOLD_BPS: factById('gst-gold').values.rate_gold_bps,   // 300
  GST_MAKING_BPS: factById('gst-making').values.rate_making_bps,     // 500
  GST_COMPOSITE_BPS: factById('gst-composite').values.rate_composite_bps // 300
};

if (typeof module !== 'undefined') {
  module.exports = { FACTS, CONSTANTS, factById, purityGrades, AS_OF };
} else {
  (typeof globalThis !== 'undefined' ? globalThis : this).GOLDMATH_FACTS =
    { FACTS: FACTS, CONSTANTS: CONSTANTS, factById: factById, purityGrades: purityGrades, AS_OF: AS_OF };
}
