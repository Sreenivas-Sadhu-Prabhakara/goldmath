'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const E = require('../data/engine.js');
const { FACTS, CONSTANTS, purityGrades, factById } = require('../data/facts.js');

const R = 100; // paise per rupee

/* Small deterministic PRNG (mulberry32) for property tests. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randRange(rng, lo, hi) { return lo + rng() * (hi - lo); }

/* A worked-example forward quote: 10 g at 22K916, 24K rate ₹10,000/g fine. */
function workedInput(overrides) {
  return Object.assign({
    grossGrams: 10,
    fineness: 916,
    rateRupees: 10000,
    rateBasis: 'gram',
    rateQuotedFineness: 1000, // "24K rate" = pure-gold per-gram basis
    wastagePct: 0,
    makingMode: 'per_gram',
    makingVal: 0,
    makingAfterWastage: false,
    stonesRupees: 0,
    gstConvention: 'composite'
  }, overrides || {});
}

/* -------------------------------------------------------------- */
/* 1. Purity-table integrity (adversarial-review amended)          */
/* -------------------------------------------------------------- */
test('purity grades 14K-23K within 2 per-mille of karat/24; 24K asserted separately', () => {
  const grades = purityGrades(); // ascending fineness, read from corpus
  const byKarat = {};
  grades.forEach(g => { byKarat[g.karat] = g.fineness; });

  // 24K995 is deliberately below 1000; 995/1000 vs 24/24 = 5 per-mille apart.
  // A blanket 2-per-mille rule is mathematically false here, so assert it alone.
  assert.equal(byKarat[24], 995, '24K must be exactly 995 (BIS IS 1417)');
  const dev24 = Math.abs(995 / 1000 - 24 / 24);
  assert.ok(dev24 > 0.002, 'sanity: 24K IS more than 2 per-mille from karat/24');

  // Every other grade must be within 2 per-mille of karat/24.
  [14, 18, 20, 22, 23].forEach(k => {
    const fineness = byKarat[k];
    assert.ok(fineness !== undefined, `grade ${k}K present`);
    const dev = Math.abs(fineness / 1000 - k / 24);
    assert.ok(dev <= 0.002, `${k}K (${fineness}) within 2 per-mille of karat/24 (dev=${dev})`);
  });

  // Strictly increasing 585<750<833<916<958<995.
  const fins = grades.map(g => g.fineness);
  assert.deepEqual(fins, [585, 750, 833, 916, 958, 995]);
  for (let i = 1; i < fins.length; i++) assert.ok(fins[i] > fins[i - 1]);
});

/* -------------------------------------------------------------- */
/* 2. Metal value worked example                                   */
/* -------------------------------------------------------------- */
test('metal value: 10 g at 22K916, ₹10,000/g fine → ₹91,600 exactly', () => {
  const q = E.computeQuote(workedInput());
  assert.equal(q.metal, 91600 * R); // 91,600.00 in paise
});

test('metal value uses stamped fineness 0.916, not karat/24 (0.91667)', () => {
  const q = E.computeQuote(workedInput());
  const karat24 = Math.round(10 * (22 / 24) * 10000 * R);
  assert.notEqual(q.metal, karat24); // 916.67 would give ₹91,666.67
});

/* -------------------------------------------------------------- */
/* 3. Rate-basis conversions                                       */
/* -------------------------------------------------------------- */
test('rate per 10 g divides by 10; per tola divides by 11.6638', () => {
  const perGram = E.ratePerGramFinePaise(10000, 'gram', 1000);
  const per10 = E.ratePerGramFinePaise(100000, 'per10g', 1000); // ₹1,00,000 per 10 g
  assert.equal(per10, perGram);

  const perTola = E.ratePerGramFinePaise(10000 * CONSTANTS.TOLA_GRAMS, 'tola', 1000);
  // rate per tola of the same per-gram price → back to same per-gram
  assert.ok(Math.abs(perTola - perGram) <= 1, 'tola round-trip within 1 paisa');
});

test('22K-quoted rate converts to pure basis via ÷0.916, round-trips within 1 paisa', () => {
  // A "22K rate" of ₹9,160/g means pure-gold ₹10,000/g.
  const fine = E.ratePerGramFinePaise(9160, 'gram', 916);
  assert.ok(Math.abs(fine - 10000 * R) <= 1, `got ${fine}`);
});

/* -------------------------------------------------------------- */
/* 4. Wastage convention                                           */
/* -------------------------------------------------------------- */
test('wastage: 8% on the ₹91,600 example → 8% of metal value to the paisa', () => {
  const q = E.computeQuote(workedInput({ wastagePct: 8 }));
  assert.equal(q.wastage, Math.round(91600 * R * 0.08)); // ₹7,328.00
  // 10 g gross at 8% wastage prices as 10.8 g of metal:
  const metalOf108 = Math.round(10.8 * 0.916 * 10000 * R);
  assert.equal(q.metal + q.wastage, metalOf108);
});

/* -------------------------------------------------------------- */
/* 5. Making — both modes + before/after wastage                   */
/* -------------------------------------------------------------- */
test('making ₹550/g on 10 g gross → ₹5,500', () => {
  const q = E.computeQuote(workedInput({ makingMode: 'per_gram', makingVal: 550 }));
  assert.equal(q.making, 5500 * R);
});

test('making 12% of ₹91,600 metal value → ₹10,992', () => {
  const q = E.computeQuote(workedInput({ makingMode: 'pct', makingVal: 12 }));
  assert.equal(q.making, 10992 * R);
});

test('making % before vs after wastage differs by exactly making% × wastage', () => {
  const before = E.computeQuote(workedInput({ makingMode: 'pct', makingVal: 12, wastagePct: 8 }));
  const after = E.computeQuote(workedInput({ makingMode: 'pct', makingVal: 12, wastagePct: 8, makingAfterWastage: true }));
  const delta = after.making - before.making;
  assert.equal(delta, Math.round(before.wastage * 0.12));
});

/* -------------------------------------------------------------- */
/* 6. GST conventions                                              */
/* -------------------------------------------------------------- */
test('GST convention A (composite) = 3% on (metal+wastage+making+stones)', () => {
  const q = E.computeQuote(workedInput({ makingMode: 'per_gram', makingVal: 550, wastagePct: 8 }));
  const base = q.metal + q.wastage + q.making + q.stones;
  assert.equal(q.gst, Math.round(base * 0.03));
  assert.equal(q.total, base + q.gst);
});

test('GST convention B (split) = 3% on goods + 5% on making; A ≠ B when making > 0', () => {
  const inp = workedInput({ makingMode: 'per_gram', makingVal: 550, wastagePct: 8 });
  const a = E.computeQuote(Object.assign({}, inp, { gstConvention: 'composite' }));
  const b = E.computeQuote(Object.assign({}, inp, { gstConvention: 'split' }));
  const goods = b.metal + b.wastage + b.stones;
  const expected = Math.round(goods * 0.03) + Math.round(b.making * 0.05);
  assert.equal(b.gst, expected);
  assert.notEqual(a.gst, b.gst);
});

/* -------------------------------------------------------------- */
/* 7. No float drift — 2,000 randomized quotes reconcile           */
/* -------------------------------------------------------------- */
test('no float drift: line items are integer paise summing exactly to total (2000 quotes)', () => {
  const rng = mulberry32(0xC0FFEE);
  for (let i = 0; i < 2000; i++) {
    const inp = {
      grossGrams: randRange(rng, 0.5, 500),
      fineness: [585, 750, 833, 916, 958, 995][Math.floor(rng() * 6)],
      rateRupees: randRange(rng, 3000, 20000),
      rateBasis: ['gram', 'per10g', 'tola'][Math.floor(rng() * 3)],
      rateQuotedFineness: rng() < 0.5 ? 1000 : 916,
      wastagePct: randRange(rng, 0, 25),
      makingMode: rng() < 0.5 ? 'per_gram' : 'pct',
      makingVal: randRange(rng, 0, 30),
      makingAfterWastage: rng() < 0.5,
      stonesRupees: randRange(rng, 0, 5000),
      gstConvention: rng() < 0.5 ? 'composite' : 'split'
    };
    const q = E.computeQuote(inp);
    [q.metal, q.wastage, q.making, q.stones, q.gst, q.total].forEach(v => {
      assert.ok(Number.isInteger(v), 'integer paise');
      assert.ok(!Number.isNaN(v), 'no NaN');
      assert.ok(v >= 0, 'no negative cell');
    });
    assert.equal(q.metal + q.wastage + q.making + q.stones + q.gst, q.total);
  }
});

/* -------------------------------------------------------------- */
/* 8. Back-solve (verify mode)                                     */
/* -------------------------------------------------------------- */
test('back-solve: recovered making% matches input within 0.01pp (1000 quotes, both GST modes)', () => {
  const rng = mulberry32(0x5EED);
  for (let i = 0; i < 1000; i++) {
    const makingPct = randRange(rng, 1, 30);
    const inp = {
      grossGrams: randRange(rng, 1, 200),
      fineness: [585, 750, 916, 995][Math.floor(rng() * 4)],
      rateRupees: randRange(rng, 3000, 15000),
      rateBasis: 'gram',
      rateQuotedFineness: 1000,
      wastagePct: randRange(rng, 0, 15),
      makingMode: 'pct',
      makingVal: makingPct,
      makingAfterWastage: false,
      stonesRupees: randRange(rng, 0, 2000),
      gstConvention: rng() < 0.5 ? 'composite' : 'split'
    };
    const q = E.computeQuote(inp);
    const solved = E.backSolveMakingPct(inp, q.total);
    assert.ok(Math.abs(solved.makingPct - makingPct) < 0.01,
      `solved ${solved.makingPct} vs ${makingPct}`);
  }
});

/* -------------------------------------------------------------- */
/* 9. Negotiable / fixed split                                     */
/* -------------------------------------------------------------- */
test('negotiable = making+wastage, fixed = metal+stones+gst, sum = total (2000 quotes)', () => {
  const rng = mulberry32(0xABCD);
  for (let i = 0; i < 2000; i++) {
    const inp = {
      grossGrams: randRange(rng, 0.5, 300),
      fineness: [585, 750, 833, 916, 958, 995][Math.floor(rng() * 6)],
      rateRupees: randRange(rng, 3000, 20000),
      rateBasis: ['gram', 'per10g', 'tola'][Math.floor(rng() * 3)],
      rateQuotedFineness: rng() < 0.5 ? 1000 : 916,
      wastagePct: randRange(rng, 0, 25),
      makingMode: rng() < 0.5 ? 'per_gram' : 'pct',
      makingVal: randRange(rng, 0, 30),
      makingAfterWastage: rng() < 0.5,
      stonesRupees: randRange(rng, 0, 5000),
      gstConvention: rng() < 0.5 ? 'composite' : 'split'
    };
    const q = E.computeQuote(inp);
    assert.equal(q.negotiable, q.making + q.wastage);
    assert.equal(q.fixed, q.metal + q.stones + q.gst);
    assert.equal(q.negotiable + q.fixed, q.total);
  }
});

/* -------------------------------------------------------------- */
/* 10. Buy-back                                                    */
/* -------------------------------------------------------------- */
test('buy-back: ₹91,600 ornament (10 g 22K916 @ ₹10,000/g fine) at 5% deduction → ₹87,020', () => {
  const fineRate = E.ratePerGramFinePaise(10000, 'gram', 1000);
  const bb = E.buybackPaise(10, 916, fineRate, 5);
  assert.equal(bb, 87020 * R);
});

test('buy-back never includes making, wastage, or GST', () => {
  const fineRate = E.ratePerGramFinePaise(10000, 'gram', 1000);
  const bb = E.buybackPaise(10, 916, fineRate, 0);
  assert.equal(bb, 91600 * R); // pure melt = metal value, nothing added
});

/* -------------------------------------------------------------- */
/* 11. Compare delta                                               */
/* -------------------------------------------------------------- */
test('compare: negotiable delta = (makingA+wastageA)-(makingB+wastageB); flips on swap', () => {
  const a = E.computeQuote(workedInput({ makingMode: 'per_gram', makingVal: 700, wastagePct: 10 }));
  const b = E.computeQuote(workedInput({ makingMode: 'per_gram', makingVal: 400, wastagePct: 5 }));
  const d = E.compareQuotes(a, b);
  assert.equal(d.negotiable, (a.making + a.wastage) - (b.making + b.wastage));
  const dSwap = E.compareQuotes(b, a);
  assert.equal(dSwap.negotiable, -d.negotiable);
});

/* -------------------------------------------------------------- */
/* Corpus provenance invariants                                    */
/* -------------------------------------------------------------- */
test('corpus: 14 facts, unique ids, every fact has provenance + parseable as_of', () => {
  assert.equal(FACTS.length, 14);
  const ids = new Set(FACTS.map(f => f.id));
  assert.equal(ids.size, 14, 'ids unique');
  const buildDate = new Date('2026-07-22');
  FACTS.forEach(f => {
    assert.ok(f.source_name && f.source_name.length > 0, `${f.id} source_name`);
    assert.ok(/^https?:\/\//.test(f.source_url), `${f.id} source_url`);
    assert.ok(f.verified_how && f.verified_how.length > 0, `${f.id} verified_how`);
    const d = new Date(f.as_of);
    assert.ok(!Number.isNaN(d.getTime()), `${f.id} as_of parses`);
    assert.ok(d.getTime() <= buildDate.getTime(), `${f.id} as_of ≤ build date`);
    assert.ok(['purity', 'tax', 'unit', 'convention'].includes(f.category), `${f.id} category`);
  });
});

test('corpus: engine constants equal the corpus values (single source of truth)', () => {
  assert.equal(CONSTANTS.TOLA_GRAMS, factById('unit-tola').values.tola_grams);
  assert.equal(CONSTANTS.BOARD_GRAMS, factById('unit-per10g').values.board_grams);
  assert.equal(CONSTANTS.GST_GOLD_BPS, factById('gst-gold').values.rate_gold_bps);
  assert.equal(CONSTANTS.GST_MAKING_BPS, factById('gst-making').values.rate_making_bps);
  assert.equal(CONSTANTS.GST_COMPOSITE_BPS, factById('gst-composite').values.rate_composite_bps);
  // The engine must reference these, not hard-coded numbers.
  assert.equal(E.CONSTANTS.TOLA_GRAMS, 11.6638);
});

/* -------------------------------------------------------------- */
/* Indian number grouping (display only)                          */
/* -------------------------------------------------------------- */
test('Indian grouping: 91600 → 91,600 ; 1234567 → 12,34,567', () => {
  assert.equal(E.groupIndian(91600), '91,600');
  assert.equal(E.groupIndian(1234567), '12,34,567');
  assert.equal(E.groupIndian(100), '100');
  assert.equal(E.paiseToRupeesStr(91600 * R, 'indian'), '91,600.00');
  assert.equal(E.paiseToRupeesStr(123456789, 'plain'), '1,234,567.89');
});
