/* ============================================================
   goldmath — UI glue. No DOM logic touches the maths directly;
   all pricing goes through GOLDMATH_ENGINE. No inline handlers
   (CSP forbids them) — every listener is wired here.
   ============================================================ */
(function () {
  'use strict';

  var E = window.GOLDMATH_ENGINE;
  var F = window.GOLDMATH_FACTS;
  var LS_QUOTES = 'goldmath.quotes.v1';
  var LS_CMP = 'goldmath.compare.v1';

  var $ = function (id) { return document.getElementById(id); };
  var grouping = 'indian';

  /* ---- read the form into an engine input object ---- */
  function readInput() {
    var num = function (id) { var v = parseFloat($(id).value); return Number.isFinite(v) ? v : 0; };
    var radio = function (name) {
      var el = document.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : null;
    };
    return {
      grossGrams: num('grossGrams'),
      fineness: parseInt($('purity').value, 10),
      rateRupees: num('rateRupees'),
      rateBasis: $('rateBasis').value,
      rateQuotedFineness: parseInt($('rateQuoted').value, 10),
      wastagePct: num('wastagePct'),
      makingMode: radio('makingMode'),
      makingVal: num('makingVal'),
      makingAfterWastage: $('afterWastageToggle').querySelector('input').checked,
      stonesRupees: num('stonesRupees'),
      gstConvention: radio('gstConvention')
    };
  }

  function rupees(paise) { return '₹' + E.paiseToRupeesStr(paise, grouping); }

  /* ---- render the breakdown ---- */
  function render() {
    var inp = readInput();
    var q = E.computeQuote(inp);

    $('negotiableBig').textContent = rupees(q.negotiable);
    $('negotiablePct').textContent =
      q.negotiablePct.toFixed(1) + '% of this quote';
    $('fixedTotal').textContent = rupees(q.fixed);
    $('negTotal').textContent = rupees(q.negotiable);
    $('grandTotal').textContent = rupees(q.total);

    // split bar widths (guard div-by-zero)
    var fixPct = q.total > 0 ? (q.fixed / q.total) * 100 : 50;
    $('segFix').style.width = fixPct.toFixed(3) + '%';
    $('segNeg').style.width = (100 - fixPct).toFixed(3) + '%';

    // GST assumption text (never silent)
    var gstText = inp.gstConvention === 'split'
      ? 'GST assumption: SPLIT — 3% on metal + wastage + stones, plus 5% on making (job-work).'
      : 'GST assumption: COMPOSITE — 3% on the full value (metal + wastage + making + stones).';
    $('gstAssumption').textContent = gstText;

    // line items, each a stamped chip marked FIXED or NEGOTIABLE
    var lines = [
      { key: 'Metal value', paise: q.metal, kind: 'fix' },
      { key: 'Wastage (VA)', paise: q.wastage, kind: 'neg' },
      { key: 'Making charges', paise: q.making, kind: 'neg' },
      { key: 'Stones / other', paise: q.stones, kind: 'fix' },
      { key: 'GST', paise: q.gst, kind: 'fix' }
    ];
    var ul = $('lines');
    ul.textContent = '';
    lines.forEach(function (ln) {
      var li = document.createElement('li');
      li.className = 'line line--' + ln.kind;
      var name = document.createElement('span');
      name.className = 'line__name';
      name.textContent = ln.key;
      var chip = document.createElement('span');
      chip.className = 'chip chip--' + ln.kind;
      chip.textContent = ln.kind === 'neg' ? 'NEGOTIABLE' : 'FIXED';
      var val = document.createElement('span');
      val.className = 'line__val';
      val.textContent = rupees(ln.paise);
      li.appendChild(name);
      li.appendChild(chip);
      li.appendChild(val);
      ul.appendChild(li);
    });

    renderBuyback(inp);
    return q;
  }

  function renderBuyback(inp) {
    var netGrams = parseFloat($('netGrams').value) || 0;
    var deduction = parseFloat($('deductionPct').value) || 0;
    var fineRate = E.ratePerGramFinePaise(inp.rateRupees, inp.rateBasis, inp.rateQuotedFineness);
    var bb = E.buybackPaise(netGrams, inp.fineness, fineRate, deduction);
    $('buybackNum').textContent = rupees(bb);
  }

  /* ---- purity picker (from corpus) ---- */
  function fillPurity() {
    var sel = $('purity');
    E.purityGrades().forEach(function (g) {
      var opt = document.createElement('option');
      opt.value = String(g.fineness);
      opt.textContent = g.label + '  (' + g.karat + 'K, ' + (g.fineness / 10).toFixed(1) + '% pure)';
      if (g.fineness === 916) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /* ---- reference card (cited corpus) ---- */
  function fillReference() {
    var grid = $('referenceGrid');
    F.FACTS.forEach(function (f) {
      var card = document.createElement('article');
      card.className = 'ref ref--' + f.category;
      var h = document.createElement('h3');
      h.className = 'ref__label';
      h.textContent = f.label;
      var cat = document.createElement('span');
      cat.className = 'ref__cat';
      cat.textContent = f.category;
      h.appendChild(cat);
      var p = document.createElement('p');
      p.className = 'ref__statement';
      p.textContent = f.statement;
      var src = document.createElement('p');
      src.className = 'ref__src';
      var a = document.createElement('a');
      a.href = f.source_url;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      a.textContent = f.source_name;
      src.appendChild(document.createTextNode('Source: '));
      src.appendChild(a);
      src.appendChild(document.createTextNode(' · verified ' + f.as_of));
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(src);
      grid.appendChild(card);
    });
    $('asOfLine').textContent = 'GST and unit constants are as of ' + F.AS_OF + ' — verify on your own bill.';
  }

  /* ---- verify mode ---- */
  function onVerify(e) {
    e.preventDefault();
    var inp = readInput();
    var total = parseFloat($('shopTotal').value);
    if (!Number.isFinite(total) || total <= 0) {
      $('verifyOut').textContent = 'Enter the shop’s bill total to back-solve.';
      return;
    }
    var res = E.backSolveMakingPct(inp, Math.round(total * 100));
    if (res.makingPaise < 0) {
      $('verifyOut').textContent =
        'The bill total is lower than the metal + wastage + GST alone — check the rate, purity or weight you entered.';
      return;
    }
    $('verifyOut').textContent =
      'Implied making charge: ' + rupees(Math.round(res.makingPaise)) +
      '  (≈ ' + res.makingPct.toFixed(2) + '% of metal value). Open your haggle there.';
  }

  /* ---- saved quotes ---- */
  function loadQuotes() {
    try { return JSON.parse(localStorage.getItem(LS_QUOTES) || '[]'); }
    catch (err) { return []; }
  }
  function storeQuotes(arr) {
    try { localStorage.setItem(LS_QUOTES, JSON.stringify(arr)); } catch (err) { /* quota */ }
  }
  function saveQuote() {
    var inp = readInput();
    var q = E.computeQuote(inp);
    var name = window.prompt('Name this quote (e.g. "Shop A — 22K bangle"):', 'Quote ' + new Date().toISOString().slice(0, 10));
    if (name === null) return;
    var arr = loadQuotes();
    arr.unshift({ name: name || 'Untitled', at: new Date().toISOString(), input: inp, total: q.total, negotiable: q.negotiable });
    storeQuotes(arr);
    renderSaved();
  }
  function renderSaved() {
    var arr = loadQuotes();
    var list = $('savedList');
    list.textContent = '';
    $('savedEmpty').hidden = arr.length > 0;
    arr.forEach(function (item, idx) {
      var li = document.createElement('li');
      li.className = 'saved__item';
      var meta = document.createElement('div');
      meta.className = 'saved__meta';
      var nm = document.createElement('span');
      nm.className = 'saved__name';
      nm.textContent = item.name;
      var fig = document.createElement('span');
      fig.className = 'saved__fig';
      fig.textContent = rupees(item.total) + '  ·  negotiable ' + rupees(item.negotiable);
      meta.appendChild(nm);
      meta.appendChild(fig);
      var acts = document.createElement('div');
      acts.className = 'saved__acts';
      var loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'btn btn--tiny';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', function () { applyInput(item.input); });
      var dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 'btn btn--tiny';
      dupBtn.textContent = 'Duplicate';
      dupBtn.addEventListener('click', function () {
        var copy = loadQuotes();
        copy.unshift(Object.assign({}, item, { name: item.name + ' (copy)', at: new Date().toISOString() }));
        storeQuotes(copy); renderSaved();
      });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn--tiny btn--danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function () {
        var cur = loadQuotes(); cur.splice(idx, 1); storeQuotes(cur); renderSaved();
      });
      acts.appendChild(loadBtn); acts.appendChild(dupBtn); acts.appendChild(delBtn);
      li.appendChild(meta); li.appendChild(acts);
      list.appendChild(li);
    });
  }

  function applyInput(inp) {
    $('grossGrams').value = inp.grossGrams;
    $('purity').value = String(inp.fineness);
    $('rateRupees').value = inp.rateRupees;
    $('rateBasis').value = inp.rateBasis;
    $('rateQuoted').value = String(inp.rateQuotedFineness);
    $('wastagePct').value = inp.wastagePct;
    document.querySelector('input[name="makingMode"][value="' + inp.makingMode + '"]').checked = true;
    $('makingVal').value = inp.makingVal;
    $('afterWastageToggle').querySelector('input').checked = !!inp.makingAfterWastage;
    $('stonesRupees').value = inp.stonesRupees;
    document.querySelector('input[name="gstConvention"][value="' + inp.gstConvention + '"]').checked = true;
    syncMakingToggle();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- copy summary ---- */
  function copySummary() {
    var inp = readInput();
    var q = E.computeQuote(inp);
    var g = E.purityGrades().find(function (x) { return x.fineness === inp.fineness; });
    var lines = [
      'goldmath quote',
      inp.grossGrams + ' g at ' + (g ? g.label : inp.fineness),
      'Metal value : ' + rupees(q.metal) + '  [FIXED]',
      'Wastage     : ' + rupees(q.wastage) + '  [NEGOTIABLE]',
      'Making      : ' + rupees(q.making) + '  [NEGOTIABLE]',
      'Stones      : ' + rupees(q.stones) + '  [FIXED]',
      'GST         : ' + rupees(q.gst) + '  [FIXED]  (' + inp.gstConvention + ')',
      'TOTAL       : ' + rupees(q.total),
      'NEGOTIABLE  : ' + rupees(q.negotiable) + '  (' + q.negotiablePct.toFixed(1) + '%)'
    ].join('\n');
    var done = function () { flash('copyNote', 'Copied to clipboard.'); };
    var fail = function () { flash('copyNote', 'Copy blocked — select the text manually.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines).then(done, fail);
    } else { fail(); }
  }
  function flash(id, msg) {
    var el = $(id); el.textContent = msg;
    setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 2500);
  }

  /* ---- compare ---- */
  function loadCmp() {
    try { return JSON.parse(localStorage.getItem(LS_CMP) || '{}'); }
    catch (err) { return {}; }
  }
  function storeCmp(o) { try { localStorage.setItem(LS_CMP, JSON.stringify(o)); } catch (err) {} }
  function setSlot(slot) {
    var inp = readInput();
    var q = E.computeQuote(inp);
    var o = loadCmp();
    o[slot] = { input: inp, q: q };
    storeCmp(o); renderCompare();
  }
  function renderCompare() {
    var o = loadCmp();
    var out = $('compareOut');
    out.textContent = '';
    if (!o.A || !o.B) {
      var p = document.createElement('p');
      p.className = 'section__lede';
      p.textContent = (o.A ? 'Quote A set. ' : '') + (o.B ? 'Quote B set. ' : '') +
        'Set both A and B to see the delta.';
      out.appendChild(p);
      return;
    }
    var d = E.compareQuotes(o.A.q, o.B.q);
    var rows = [
      ['Metal', d.metal], ['Wastage', d.wastage], ['Making', d.making],
      ['GST', d.gst], ['Total', d.total], ['Negotiable (making+wastage)', d.negotiable]
    ];
    var table = document.createElement('table');
    table.className = 'cmp';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Line</th><th>Quote A</th><th>Quote B</th><th>A − B</th></tr>';
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    var pick = { 'Metal': 'metal', 'Wastage': 'wastage', 'Making': 'making', 'GST': 'gst', 'Total': 'total', 'Negotiable (making+wastage)': 'negotiable' };
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var k = pick[r[0]];
      tr.innerHTML = '<td>' + r[0] + '</td><td>' + rupees(o.A.q[k]) + '</td><td>' + rupees(o.B.q[k]) + '</td><td>' + (r[1] >= 0 ? '+' : '') + rupees(r[1]) + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    out.appendChild(table);

    var verdict = document.createElement('p');
    verdict.className = 'cmp__verdict';
    if (d.negotiable === 0) {
      verdict.textContent = 'Both shops charge the same negotiable amount (making + wastage).';
    } else {
      var higher = d.negotiable > 0 ? 'A' : 'B';
      verdict.textContent = 'Quote ' + higher + '’s making + wastage is higher by ' +
        rupees(Math.abs(d.negotiable)) + ' — that gap is where the haggle lives.';
    }
    out.appendChild(verdict);
  }

  /* ---- making-mode toggle (show after-wastage only for %) ---- */
  function syncMakingToggle() {
    var mode = document.querySelector('input[name="makingMode"]:checked').value;
    $('afterWastageToggle').hidden = mode !== 'pct';
  }

  /* ---- boot ---- */
  function boot() {
    fillPurity();
    fillReference();

    // live recompute on any form input
    $('quoteForm').addEventListener('input', function () { syncMakingToggle(); render(); });
    $('quoteForm').addEventListener('change', function () { syncMakingToggle(); render(); });
    $('buybackForm').addEventListener('input', function () { render(); });

    // grouping toggle
    document.querySelectorAll('input[name="grouping"]').forEach(function (r) {
      r.addEventListener('change', function () { grouping = r.value; render(); });
    });

    $('verifyForm').addEventListener('submit', onVerify);
    $('saveBtn').addEventListener('click', saveQuote);
    $('copyBtn').addEventListener('click', copySummary);
    $('printBtn').addEventListener('click', function () { window.print(); });
    $('setABtn').addEventListener('click', function () { setSlot('A'); });
    $('setBBtn').addEventListener('click', function () { setSlot('B'); });
    $('clearCmpBtn').addEventListener('click', function () { storeCmp({}); renderCompare(); });

    syncMakingToggle();
    render();
    renderSaved();
    renderCompare();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
