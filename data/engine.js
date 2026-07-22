/* ============================================================
   goldmath — the pricing engine.

   Pure functions, no DOM. Imported by app.js (browser global) and
   by test/*.test.js (require). All money is computed in INTEGER
   PAISE (1 rupee = 100 paise); rupees appear only for display.

   Constants come FROM data/facts.js — never re-typed here.
   ============================================================ */

(function (root) {
  'use strict';

  var CONSTANTS, purityGrades;
  if (typeof module !== 'undefined' && typeof require === 'function') {
    var facts = require('./facts.js');
    CONSTANTS = facts.CONSTANTS;
    purityGrades = facts.purityGrades;
  } else {
    CONSTANTS = root.GOLDMATH_FACTS.CONSTANTS;
    purityGrades = root.GOLDMATH_FACTS.purityGrades;
  }

  /* ---- rounding: banker-free, round-half-up on non-negative paise ---- */
  function roundPaise(x) {
    // x is a rupee-or-paise float; caller decides. We round to nearest integer.
    return Math.round(x);
  }

  /* Convert a board rate (in rupees, as a float) to paise-per-gram-of-pure-metal
     basis, honestly. Returns an integer: paise per gram at 24K-equivalent (fine) basis.
     - basis: 'gram' | 'per10g' | 'tola'  (the weight the rate is quoted against)
     - quotedKarat: 24 or 22 — the purity the board rate is quoted for.
       A "22K rate" is the price of 1 unit of 22K metal; to get the pure-gold
       (fine) rate we divide by 0.916. We normalise everything to a per-gram
       FINE (pure-gold) rate so metal value = weight * fineness_frac * pureRate. */
  function ratePerGramFinePaise(rateRupees, basis, quotedFineness) {
    var perGram = rateRupees;
    if (basis === 'per10g') perGram = rateRupees / CONSTANTS.BOARD_GRAMS;
    else if (basis === 'tola') perGram = rateRupees / CONSTANTS.TOLA_GRAMS;
    // rateRupees is the price of one gram of metal at `quotedFineness`/1000 purity.
    // Pure-gold (fine) rate = perGram / (quotedFineness/1000).
    var fineRupees = perGram / (quotedFineness / 1000);
    return roundPaise(fineRupees * 100); // integer paise per fine gram
  }

  /* Metal value in paise: weight(g) * fineness/1000 * fineRatePerGram(paise). */
  function metalValuePaise(grossGrams, fineness, fineRatePaise) {
    return roundPaise(grossGrams * (fineness / 1000) * fineRatePaise);
  }

  /* Wastage charge in paise: extra `wastagePct`% of weight, priced at metal rate.
     Equivalent to wastagePct% of the metal value. */
  function wastagePaise(metalValue, wastagePct) {
    return roundPaise(metalValue * (wastagePct / 100));
  }

  /* Making charge in paise. Two modes:
     - mode 'per_gram': makingVal is ₹/gram on GROSS weight.
     - mode 'pct': makingVal is % of a base. The base is the metal value, and
       if applyAfterWastage is true the base is (metalValue + wastage). */
  function makingPaise(mode, makingVal, grossGrams, metalValue, wastage, applyAfterWastage) {
    if (mode === 'per_gram') {
      return roundPaise(makingVal * grossGrams * 100); // ₹/g -> paise
    }
    var base = applyAfterWastage ? (metalValue + wastage) : metalValue;
    return roundPaise(base * (makingVal / 100));
  }

  /* GST in paise under the two real conventions.
     - 'composite': 3% on (metal + wastage + making + stones).
     - 'split':     3% on (metal + wastage + stones) + 5% on making.
     Stones are a flat pass-through (already in paise). */
  function gstPaise(convention, metal, wastage, making, stones) {
    if (convention === 'split') {
      var goodsBase = metal + wastage + stones;
      var g1 = roundPaise(goodsBase * (CONSTANTS.GST_GOLD_BPS / 10000));
      var g2 = roundPaise(making * (CONSTANTS.GST_MAKING_BPS / 10000));
      return g1 + g2;
    }
    // composite
    var base = metal + wastage + making + stones;
    return roundPaise(base * (CONSTANTS.GST_COMPOSITE_BPS / 10000));
  }

  /* ---- the full forward quote ----
     input: {
       grossGrams, fineness,
       rateRupees, rateBasis ('gram'|'per10g'|'tola'), rateQuotedFineness (e.g. 995 or 916),
       wastagePct,
       makingMode ('per_gram'|'pct'), makingVal, makingAfterWastage (bool),
       stonesRupees,
       gstConvention ('composite'|'split')
     }
     output: all integer paise, plus the negotiable/fixed split. */
  function computeQuote(input) {
    var fineRate = ratePerGramFinePaise(
      input.rateRupees, input.rateBasis, input.rateQuotedFineness
    );
    var metal = metalValuePaise(input.grossGrams, input.fineness, fineRate);
    var wastage = wastagePaise(metal, input.wastagePct || 0);
    var stones = roundPaise((input.stonesRupees || 0) * 100);
    var making = makingPaise(
      input.makingMode, input.makingVal || 0,
      input.grossGrams, metal, wastage, !!input.makingAfterWastage
    );
    var gst = gstPaise(input.gstConvention, metal, wastage, making, stones);

    var total = metal + wastage + making + stones + gst;

    // Negotiable = making + wastage ; Fixed = metal + stones + GST.
    var negotiable = making + wastage;
    var fixed = metal + stones + gst;

    return {
      fineRatePaise: fineRate,
      metal: metal,
      wastage: wastage,
      making: making,
      stones: stones,
      gst: gst,
      total: total,
      negotiable: negotiable,
      fixed: fixed,
      negotiablePct: total > 0 ? (negotiable / total) * 100 : 0
    };
  }

  /* ---- buy-back / melt value ----
     netWeight(g) * fineness/1000 * fineRate(paise) * (1 - deductionPct/100).
     Explicitly excludes making, wastage, and GST. */
  function buybackPaise(netGrams, fineness, fineRatePaise, deductionPct) {
    var melt = netGrams * (fineness / 1000) * fineRatePaise;
    return roundPaise(melt * (1 - (deductionPct || 0) / 100));
  }

  /* ---- verify mode: back-solve implied making % of metal value ----
     Given a shop's total (paise) and everything else known, recover the making
     amount, then express it as a % of metal value. Inverts computeQuote's GST. */
  function backSolveMakingPct(input, shopTotalPaise) {
    var fineRate = ratePerGramFinePaise(
      input.rateRupees, input.rateBasis, input.rateQuotedFineness
    );
    var metal = metalValuePaise(input.grossGrams, input.fineness, fineRate);
    var wastage = wastagePaise(metal, input.wastagePct || 0);
    var stones = roundPaise((input.stonesRupees || 0) * 100);

    // total = metal + wastage + making + stones + gst(making)
    // Solve for `making` under each convention.
    var making;
    if (input.gstConvention === 'split') {
      // total = (metal+wastage+stones)*(1.03) + making*(1.05)
      var goodsWithGst = (metal + wastage + stones) * (1 + CONSTANTS.GST_GOLD_BPS / 10000);
      making = (shopTotalPaise - goodsWithGst) / (1 + CONSTANTS.GST_MAKING_BPS / 10000);
    } else {
      // total = (metal+wastage+making+stones)*(1.03)
      var pre = shopTotalPaise / (1 + CONSTANTS.GST_COMPOSITE_BPS / 10000);
      making = pre - metal - wastage - stones;
    }
    var makingPct = metal > 0 ? (making / metal) * 100 : 0;
    return { makingPaise: making, makingPct: makingPct, metal: metal };
  }

  /* ---- compare two quotes (same ornament) ---- */
  function compareQuotes(qA, qB) {
    return {
      metal: qA.metal - qB.metal,
      wastage: qA.wastage - qB.wastage,
      making: qA.making - qB.making,
      gst: qA.gst - qB.gst,
      total: qA.total - qB.total,
      negotiable: qA.negotiable - qB.negotiable
    };
  }

  /* ---- display formatting (Indian grouping) ---- */
  function paiseToRupeesStr(paise, grouping) {
    var neg = paise < 0;
    var abs = Math.abs(paise);
    var rupees = Math.floor(abs / 100);
    var p = abs % 100;
    var intStr = grouping === 'plain'
      ? String(rupees).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : groupIndian(rupees);
    var out = intStr + '.' + (p < 10 ? '0' + p : String(p));
    return (neg ? '-' : '') + out;
  }

  function groupIndian(n) {
    var s = String(n);
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  var api = {
    roundPaise: roundPaise,
    ratePerGramFinePaise: ratePerGramFinePaise,
    metalValuePaise: metalValuePaise,
    wastagePaise: wastagePaise,
    makingPaise: makingPaise,
    gstPaise: gstPaise,
    computeQuote: computeQuote,
    buybackPaise: buybackPaise,
    backSolveMakingPct: backSolveMakingPct,
    compareQuotes: compareQuotes,
    paiseToRupeesStr: paiseToRupeesStr,
    groupIndian: groupIndian,
    purityGrades: purityGrades,
    CONSTANTS: CONSTANTS
  };

  if (typeof module !== 'undefined') module.exports = api;
  else root.GOLDMATH_ENGINE = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
