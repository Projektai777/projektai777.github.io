/* © 2026 Lojalumas — DEMO svetainė „Miesto Spauda".
   Viskas veikia naršyklėje: skaičiuoklė, krepšelis, užsakymas, sekimas.
   Jokio backend, jokių duomenų į serverį — būsena tik localStorage (ms_demo_*). */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS_CART = 'ms_demo_cart', LS_ORD = 'ms_demo_orders';

  /* ═══════════════════════════════════════════════════════════════════════
     1) PRODUKTAI. Kainodara PAVYZDINĖ (demonstracinė):
        kaina = paruošimas + bazinė × dydis × medžiaga × spauda × apdaila × kiekis × kiekio nuolaida
        Realiam klientui čia sudedami jo tikri įkainiai — struktūra ta pati.
     ═══════════════════════════════════════════════════════════════════════ */
  var VAT = 1.21;

  var PRODUCTS = [
    {
      id: 'viz', name: 'Vizitinės kortelės', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 5, base: 0.085, days: 2, defQty: 500, qtys: [100, 250, 500, 1000, 2500],
      sizes: [
        { n: '90 × 50 mm (standartinė)', k: 1 },
        { n: '85 × 55 mm', k: 1.06 },
        { n: '50 × 90 mm (vertikali)', k: 1.06 },
        { n: '90 × 50 mm, suapvalinti kampai', k: 1.24 }
      ],
      mats: [
        { n: 'Kreidinis 300 g', k: 1 },
        { n: 'Kreidinis 350 g', k: 1.12 },
        { n: 'Perdirbtas 300 g (eko)', k: 1.3 },
        { n: 'Dizainerinis popierius 300 g', k: 1.6 }
      ],
      sides: true,
      fins: [
        { n: 'Be apdailos', k: 1 },
        { n: 'Matinis laminavimas', k: 1.25 },
        { n: 'Blizgus laminavimas', k: 1.2 },
        { n: 'Soft-touch laminavimas', k: 1.5, d: 1 },
        { n: 'Folijavimas (auksas / sidabras)', k: 1.95, d: 1 }
      ]
    },
    {
      id: 'skraj', name: 'Skrajutės', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 6, base: 0.055, days: 2, defQty: 1000, qtys: [100, 250, 500, 1000, 2500, 5000],
      sizes: [
        { n: 'A6 (105 × 148 mm)', k: 0.62 },
        { n: 'A5 (148 × 210 mm)', k: 1 },
        { n: 'DL (99 × 210 mm)', k: 0.9 },
        { n: 'A4 (210 × 297 mm)', k: 1.85 }
      ],
      mats: [
        { n: 'Kreidinis 130 g', k: 1 },
        { n: 'Kreidinis 170 g', k: 1.15 },
        { n: 'Ofsetinis 120 g', k: 0.95 },
        { n: 'Perdirbtas 140 g (eko)', k: 1.25 }
      ],
      sides: true,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Matinis laminavimas', k: 1.35 }, { n: 'Lankstymas per pusę', k: 1.15 }]
    },
    {
      id: 'lankst', name: 'Lankstinukai', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 12, base: 0.14, days: 3, defQty: 500, qtys: [100, 250, 500, 1000, 2500],
      sizes: [
        { n: 'A4 → DL (2 lankstymai)', k: 1 },
        { n: 'A4 → A5 (1 lankstymas)', k: 0.88 },
        { n: 'A3 → A4 (1 lankstymas)', k: 1.7 }
      ],
      mats: [{ n: 'Kreidinis 150 g', k: 1 }, { n: 'Kreidinis 200 g', k: 1.2 }, { n: 'Kreidinis 250 g', k: 1.4 }],
      sides: true,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Matinis laminavimas', k: 1.3 }, { n: 'Dalinis UV lakas', k: 1.6, d: 1 }]
    },
    {
      id: 'plak', name: 'Plakatai', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'low',
      setup: 0, base: 3.4, days: 1, defQty: 10, qtys: [1, 5, 10, 25, 50, 100],
      sizes: [
        { n: 'A3 (297 × 420 mm)', k: 0.55 },
        { n: 'A2 (420 × 594 mm)', k: 1 },
        { n: 'A1 (594 × 841 mm)', k: 1.9 },
        { n: 'B1 (700 × 1000 mm)', k: 2.6 }
      ],
      mats: [
        { n: 'Plakatinis popierius 150 g', k: 1 },
        { n: 'Blizgus fotopopierius 200 g', k: 1.45 },
        { n: 'Sintetinis (atsparus drėgmei)', k: 1.8 }
      ],
      sides: false,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Laminavimas', k: 1.4 }, { n: 'Su akutėmis kampuose', k: 1.25 }]
    },
    {
      id: 'lipd', name: 'Lipdukai ir etiketės', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'high',
      setup: 8, base: 0.22, days: 2, defQty: 250, qtys: [50, 100, 250, 500, 1000, 2500],
      sizes: [
        { n: 'iki 50 × 50 mm', k: 0.6 },
        { n: 'iki 100 × 100 mm', k: 1 },
        { n: 'iki 150 × 150 mm', k: 1.7 },
        { n: 'A5 dydžio', k: 2.4 }
      ],
      mats: [
        { n: 'Lipni plėvelė (vidaus)', k: 1 },
        { n: 'Lipni plėvelė (lauko, 3–5 m.)', k: 1.4 },
        { n: 'Skaidri plėvelė', k: 1.35 },
        { n: 'Popierinė etiketė', k: 0.85 }
      ],
      sides: false,
      fins: [{ n: 'Stačiakampiai', k: 1 }, { n: 'Pjauti pagal kontūrą', k: 1.45, d: 1 }, { n: 'Laminuoti (matiniai)', k: 1.3 }]
    },
    {
      id: 'drobe', name: 'Spauda ant drobės', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'low',
      setup: 0, base: 24, days: 3, defQty: 1, qtys: [1, 2, 3, 5, 10],
      sizes: [
        { n: '30 × 40 cm', k: 0.7 },
        { n: '40 × 60 cm', k: 1 },
        { n: '60 × 90 cm', k: 1.75 },
        { n: '80 × 120 cm', k: 2.6 }
      ],
      mats: [{ n: 'Drobė ant porėmio', k: 1 }, { n: 'Drobė be porėmio', k: 0.72 }, { n: 'Drobė + apsauginis lakas', k: 1.2 }],
      sides: false,
      fins: [{ n: 'Be rėmo', k: 1 }, { n: 'Medinis rėmas', k: 1.45, d: 1 }]
    },
    {
      id: 'kviet', name: 'Vestuviniai kvietimai', cat: 'Šventinė atributika', unit: 'vnt.', vol: 'high',
      setup: 15, base: 0.7, days: 4, defQty: 100, qtys: [30, 50, 100, 150, 250],
      sizes: [{ n: 'Vienlapis 100 × 200 mm', k: 1 }, { n: 'Atverčiamas 145 × 145 mm', k: 1.35 }, { n: 'Su įdėklu ir vokeliu', k: 1.75 }],
      mats: [{ n: 'Dizainerinis popierius 300 g', k: 1 }, { n: 'Perlamutrinis 300 g', k: 1.25 }, { n: 'Faktūrinis (linen) 300 g', k: 1.3 }],
      sides: true,
      fins: [
        { n: 'Be apdailos', k: 1 },
        { n: 'Su atlasiniu kaspinu', k: 1.4, d: 1 },
        { n: 'Folijavimas', k: 1.8, d: 2 },
        { n: 'Reljefinė spauda', k: 1.9, d: 2 }
      ]
    },
    {
      id: 'kalend', name: 'Kalendoriai', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 20, base: 2.6, days: 4, defQty: 100, qtys: [25, 50, 100, 250, 500],
      sizes: [{ n: 'Stalo, trišonis', k: 1 }, { n: 'Sieninis A3, 12 lapų', k: 1.55 }, { n: 'Sieninis vienlapis A2', k: 0.75 }],
      mats: [{ n: 'Kreidinis 200 g', k: 1 }, { n: 'Kreidinis 250 g', k: 1.15 }],
      sides: false,
      fins: [{ n: 'Su spirale', k: 1 }, { n: 'Su spirale ir pakabinimu', k: 1.1 }, { n: 'Laminuotas viršelis', k: 1.25 }]
    },
    {
      id: 'puod', name: 'Puodeliai su spauda', cat: 'Verslo dovanos', unit: 'vnt.', vol: 'low',
      setup: 0, base: 6.4, days: 3, defQty: 25, qtys: [1, 5, 10, 25, 50, 100],
      sizes: [{ n: 'Baltas 330 ml', k: 1 }, { n: 'Spalvotas viduje 330 ml', k: 1.2 }, { n: 'Keičiantis spalvą (magic)', k: 1.75 }],
      mats: null,
      sides: false,
      fins: [{ n: 'Spauda iš vienos pusės', k: 1 }, { n: 'Spauda aplink', k: 1.3 }, { n: 'Su dovanų dėžute', k: 1.35 }]
    },
    {
      id: 'auto', name: 'Automobilio apklijavimas', cat: 'Išorinė reklama', unit: 'm²', vol: 'low',
      setup: 45, base: 27, days: 4, defQty: 5, qtys: [1, 3, 5, 10, 20],
      sizes: [{ n: 'Lygus paviršius (durys, šonas)', k: 1 }, { n: 'Su iškilimais / apvadais', k: 1.25 }, { n: 'Visas kėbulas', k: 1.4 }],
      mats: [
        { n: 'Lipni plėvelė (3 m. garantija)', k: 1 },
        { n: 'Litavimo plėvelė (5–7 m.)', k: 1.35 },
        { n: 'Perforuota plėvelė langams', k: 1.5 }
      ],
      sides: false,
      fins: [{ n: 'Be laminato', k: 1 }, { n: 'Su apsauginiu laminatu', k: 1.3, d: 1 }, { n: 'Su montavimu vietoje', k: 1.45, d: 1 }]
    }
  ];

  var VOL = {
    high: [[100, 1], [250, .86], [500, .72], [1000, .6], [2500, .5], [Infinity, .44]],
    low: [[1, 1], [5, .95], [10, .9], [25, .84], [50, .78], [Infinity, .72]]
  };
  function volFactor(p, qty) {
    var t = VOL[p.vol], i;
    for (i = 0; i < t.length; i++) if (qty <= t[i][0]) return t[i][1];
    return t[t.length - 1][1];
  }

  function eur(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function eur4(n) { return (n < 1 ? n.toFixed(3) : n.toFixed(2)).replace('.', ',') + ' €'; }
  function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return PRODUCTS[0]; }

  /* Kaina pagal pasirinkimą. sel = {qty,size,mat,sides,fin,rush} (indeksai). */
  function price(p, sel) {
    var qty = Math.max(1, sel.qty || 1);
    var k = 1;
    if (p.sizes) k *= p.sizes[sel.size || 0].k;
    if (p.mats) k *= p.mats[sel.mat || 0].k;
    if (p.sides) k *= (sel.sides === 1 ? 1 : 1.35);
    if (p.fins) k *= p.fins[sel.fin || 0].k;
    var net = p.setup + p.base * k * qty * volFactor(p, qty);
    if (sel.rush) net *= 1.4;
    return { net: net, gross: net * VAT, unit: net * VAT / qty, qty: qty };
  }

  /* Gamybos terminas darbo dienomis. */
  function workDays(n) {
    var d = new Date(), added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
    return d;
  }
  var MEN = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  var DAY = ['sekmadienį', 'pirmadienį', 'antradienį', 'trečiadienį', 'ketvirtadienį', 'penktadienį', 'šeštadienį'];
  function dateLt(d) { return d.getDate() + ' ' + MEN[d.getMonth()] + ', ' + DAY[d.getDay()]; }

  /* ═══════════════════════════════════════════════════════════════════════
     2) SKAIČIUOKLĖ
     ═══════════════════════════════════════════════════════════════════════ */
  var sel = { prod: 'viz', qty: 500, size: 0, mat: 0, sides: 2, fin: 0, rush: 0 };

  var elProd = $('#cProd'), elQty = $('#cQty'), elQtyIn = $('#cQtyIn'),
      elSize = $('#cSize'), elMat = $('#cMat'), elFin = $('#cFin');

  // Grupuojame pagal kategoriją — trumpesnis tekstas telpa ir telefone.
  (function () {
    var groups = {};
    PRODUCTS.forEach(function (p) {
      if (!groups[p.cat]) {
        groups[p.cat] = document.createElement('optgroup');
        groups[p.cat].label = p.cat;
        elProd.appendChild(groups[p.cat]);
      }
      var o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      groups[p.cat].appendChild(o);
    });
  })();

  function fillSelect(el, arr) {
    el.innerHTML = '';
    arr.forEach(function (x, i) {
      var o = document.createElement('option'); o.value = i; o.textContent = x.n; el.appendChild(o);
    });
  }

  function buildProduct(id, keep) {
    var p = byId(id);
    sel.prod = id;
    if (!keep) { sel.size = 0; sel.mat = 0; sel.fin = 0; sel.qty = p.defQty; sel.sides = p.sides ? 2 : 1; }
    elProd.value = id;

    // kiekio mygtukai
    elQty.innerHTML = '';
    p.qtys.forEach(function (q) {
      var b = document.createElement('button');
      b.className = 'chip' + (q === sel.qty ? ' on' : '');
      b.textContent = q + ' ' + p.unit;
      b.onclick = function () { sel.qty = q; elQtyIn.value = q; markQty(); calc(); };
      elQty.appendChild(b);
    });
    elQtyIn.value = sel.qty;

    // dydis / medžiaga / apdaila
    $('#fSize').hidden = !p.sizes;
    if (p.sizes) { fillSelect(elSize, p.sizes); elSize.value = sel.size; }
    $('#fMat').hidden = !p.mats;
    if (p.mats) { fillSelect(elMat, p.mats); elMat.value = sel.mat; }
    $('#fSides').hidden = !p.sides;
    $$('#fSides .chip').forEach(function (c) { c.classList.toggle('on', +c.dataset.sides === sel.sides); });

    $('#fFin').hidden = !p.fins;
    elFin.innerHTML = '';
    if (p.fins) p.fins.forEach(function (f, i) {
      var b = document.createElement('button');
      b.className = 'chip' + (i === sel.fin ? ' on' : '');
      b.textContent = f.n;
      b.onclick = function () { sel.fin = i; $$('#cFin .chip').forEach(function (c, j) { c.classList.toggle('on', j === i); }); calc(); };
      elFin.appendChild(b);
    });
    calc();
  }

  function markQty() {
    var p = byId(sel.prod);
    $$('#cQty .chip').forEach(function (c, i) { c.classList.toggle('on', p.qtys[i] === sel.qty); });
  }

  function calc() {
    var p = byId(sel.prod), r = price(p, sel);
    $('#cTotal').textContent = eur(r.gross);
    $('#cUnit').textContent = eur4(r.unit) + ' / ' + p.unit;
    $('#cNet').textContent = eur(r.net);

    var days = p.days + (p.fins && p.fins[sel.fin] && p.fins[sel.fin].d ? p.fins[sel.fin].d : 0);
    if (sel.rush) days = Math.max(1, Math.ceil(days / 2));
    $('#cDate').textContent = dateLt(workDays(days));

    // kiek pigiau vienetas nei perkant mažiausią kiekį
    var small = {}, key;
    for (key in sel) small[key] = sel[key];
    small.qty = p.qtys[0];
    var base = price(p, small).unit, save = Math.round((1 - r.unit / base) * 100);
    var el = $('#cSave');
    if (save >= 5 && sel.qty > p.qtys[0]) {
      el.hidden = false;
      el.textContent = '✓ Vienetas ' + save + ' % pigiau nei užsakant ' + p.qtys[0] + ' ' + p.unit;
    } else el.hidden = true;
  }

  elProd.onchange = function () { buildProduct(this.value); };
  elSize.onchange = function () { sel.size = +this.value; calc(); };
  elMat.onchange = function () { sel.mat = +this.value; calc(); };
  elQtyIn.oninput = function () { sel.qty = Math.max(1, parseInt(this.value, 10) || 1); markQty(); calc(); };
  $$('#fSides .chip').forEach(function (c) {
    c.onclick = function () { sel.sides = +c.dataset.sides; $$('#fSides .chip').forEach(function (x) { x.classList.toggle('on', x === c); }); calc(); };
  });
  $$('[data-rush]').forEach(function (c) {
    c.onclick = function () { sel.rush = +c.dataset.rush; $$('[data-rush]').forEach(function (x) { x.classList.toggle('on', x === c); }); calc(); };
  });

  function selLabel(p, s) {
    var bits = [];
    bits.push(s.qty + ' ' + p.unit);
    if (p.sizes) bits.push(p.sizes[s.size].n);
    if (p.mats) bits.push(p.mats[s.mat].n);
    if (p.sides) bits.push(s.sides === 2 ? 'dvipusė' : 'vienpusė');
    if (p.fins && s.fin) bits.push(p.fins[s.fin].n.toLowerCase());
    if (s.rush) bits.push('skubus');
    return bits.join(' · ');
  }

  $('#cAdd').onclick = function () {
    var p = byId(sel.prod), s = {}, key;
    for (key in sel) s[key] = sel[key];
    addToCart({ id: p.id, name: p.name, spec: selLabel(p, s), gross: price(p, s).gross });
    toast('✓ „' + p.name + '" įdėta į krepšelį');
  };
  $('#cAsk').onclick = function () {
    document.getElementById('kontaktai').scrollIntoView({ behavior: 'smooth' });
    var p = byId(sel.prod), t = $('#cform textarea[name=msg]');
    t.value = p.name + ': ' + selLabel(p, sel);
    setTimeout(function () { t.focus({ preventScroll: true }); }, 700);
  };

  /* ═══════════════════════════════════════════════════════════════════════
     3) TOP PREKĖS
     ═══════════════════════════════════════════════════════════════════════ */
  var TOP = ['viz', 'skraj', 'lipd', 'plak', 'lankst', 'puod', 'kviet', 'drobe'];
  var rail = $('#topRail');
  TOP.forEach(function (id) {
    var p = byId(id);
    var s = { qty: p.defQty, size: 0, mat: 0, sides: p.sides ? 2 : 1, fin: 0, rush: 0 };
    var r = price(p, s);
    var el = document.createElement('article');
    el.className = 'prod';
    el.innerHTML =
      '<span class="tag">' + p.cat + '</span>' +
      '<h3>' + p.name + '</h3>' +
      '<p class="spec">' + (p.sizes ? p.sizes[0].n + ' · ' : '') + p.defQty + ' ' + p.unit +
        (p.sides ? ' · dvipusė spauda' : '') + '</p>' +
      '<div class="pr">' + eur(r.gross) + '<small>' + eur4(r.unit) + ' / ' + p.unit + ' · su PVM</small></div>' +
      '<button class="btn btn-sm">Skaičiuoti</button>';
    el.querySelector('button').onclick = function () {
      buildProduct(id);
      document.getElementById('skaiciuokle').scrollIntoView({ behavior: 'smooth' });
    };
    rail.appendChild(el);
  });

  $$('.arrows').forEach(function (a) {
    var r = document.getElementById(a.dataset.rail);
    $$('.arr', a).forEach(function (b) {
      b.onclick = function () { r.scrollBy({ left: +b.dataset.dir * (r.clientWidth * .8), behavior: 'smooth' }); };
    });
  });

  $$('.cat[data-go]').forEach(function (c) {
    c.onclick = function () {
      buildProduct(c.dataset.go);
      document.getElementById('skaiciuokle').scrollIntoView({ behavior: 'smooth' });
    };
  });

  /* ═══════════════════════════════════════════════════════════════════════
     4) DARBŲ GALERIJA (kliento paties nuotraukos iš miestospauda.lt)
     ═══════════════════════════════════════════════════════════════════════ */
  var WORKS = [
    { img: 'p1.jpg', cap: 'Vidaus iškaba — raidės iš plastiko', f: 'reklama', wide: true },
    { img: 'auto.jpg', cap: 'Automobilio apklijavimas', f: 'reklama' },
    { img: 'w1.jpg', cap: 'Vestuviniai kvietimai su kaspinu', f: 'sventes' },
    { img: 'stendas.jpg', cap: 'Lauko reklaminis stendas', f: 'reklama' },
    { img: 'lazer.jpg', cap: 'Lazerio darbai ir graviravimas', f: 'lazer' },
    { img: 'kalend.jpg', cap: 'Stalo ir sieniniai kalendoriai', f: 'spauda' },
    { img: 'skaitm.jpg', cap: 'Skaitmeninė spauda mažais tiražais', f: 'spauda' },
    { img: 'p2.jpg', cap: 'Sienos dekoras iš akrilo', f: 'lazer', wide: true },
    { img: 'w2.jpg', cap: 'Plačiaformatė spauda iki 1,6 m', f: 'spauda' }
  ];
  var wGrid = $('#wGrid');
  function renderWorks(f) {
    wGrid.innerHTML = '';
    WORKS.filter(function (w) { return f === 'all' || w.f === f; }).forEach(function (w) {
      var el = document.createElement('figure');
      el.className = 'work' + (w.wide ? ' wide' : '');
      el.innerHTML = '<img src="./img/' + w.img + '" alt="' + w.cap + '" loading="lazy"><figcaption>' + w.cap + '</figcaption>';
      el.onclick = function () { openLb('./img/' + w.img, w.cap); };
      wGrid.appendChild(el);
    });
  }
  renderWorks('all');
  $$('#wFilters .chip').forEach(function (b) {
    b.onclick = function () {
      $$('#wFilters .chip').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderWorks(b.dataset.f);
    };
  });

  function openLb(src, cap) {
    $('#lbImg').src = src; $('#lbImg').alt = cap; $('#lbCap').textContent = cap; $('#lb').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeLb() { $('#lb').hidden = true; $('#lbImg').src = ''; document.body.style.overflow = ''; }
  $('#lbX').onclick = closeLb;
  $('#lb').onclick = function (e) { if (e.target === this) closeLb(); };

  /* ═══════════════════════════════════════════════════════════════════════
     5) KREPŠELIS
     ═══════════════════════════════════════════════════════════════════════ */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(LS_CART) || '[]'); } catch (e) { cart = []; }

  function saveCart() { try { localStorage.setItem(LS_CART, JSON.stringify(cart)); } catch (e) {} }
  function cartTotal() { return cart.reduce(function (s, i) { return s + i.gross; }, 0); }

  function renderCart() {
    var list = $('#cartList');
    $('#cartCount').textContent = cart.length;
    $('#cartCount').hidden = !cart.length;
    $('#cartTotal').textContent = eur(cartTotal());
    if (!cart.length) { list.innerHTML = '<p class="empty">Krepšelis tuščias.<br>Pasirinkite produktą skaičiuoklėje.</p>'; return; }
    list.innerHTML = '';
    cart.forEach(function (it, i) {
      var el = document.createElement('div');
      el.className = 'citem';
      el.innerHTML = '<h4>' + it.name + '</h4><b class="cpr">' + eur(it.gross) + '</b>' +
        '<p class="cspec">' + it.spec + '</p><button class="rm">Šalinti</button>';
      el.querySelector('.rm').onclick = function () { cart.splice(i, 1); saveCart(); renderCart(); };
      list.appendChild(el);
    });
  }
  function addToCart(it) { cart.push(it); saveCart(); renderCart(); openDrawer(); }
  renderCart();

  var scrim = $('#scrim'), drawer = $('#drawer');
  function openDrawer() { drawer.hidden = false; scrim.hidden = false; }
  function closeDrawer() { drawer.hidden = true; if ($('#orderModal').hidden && $('#trackModal').hidden && $('#doneModal').hidden) scrim.hidden = true; }
  $('#cartBtn').onclick = function () { drawer.hidden ? openDrawer() : closeDrawer(); };
  $('#drawerX').onclick = closeDrawer;
  scrim.onclick = function () { closeDrawer(); closeModals(); };

  /* ═══════════════════════════════════════════════════════════════════════
     6) UŽSAKYMAS IR SEKIMAS
     ═══════════════════════════════════════════════════════════════════════ */
  function openModal(id) { $(id).hidden = false; scrim.hidden = false; }
  function closeModals() {
    ['#orderModal', '#doneModal', '#trackModal'].forEach(function (id) { $(id).hidden = true; });
    if (drawer.hidden) scrim.hidden = true;
  }
  $$('[data-close]').forEach(function (b) { b.onclick = closeModals; });
  $$('.modal').forEach(function (m) { m.onclick = function (e) { if (e.target === m) closeModals(); }; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModals(); closeDrawer(); closeLb(); } });

  $('#toOrder').onclick = function () {
    if (!cart.length) { toast('Krepšelis tuščias — pirmiausia pasirinkite produktą'); return; }
    closeDrawer(); openModal('#orderModal');
  };

  var deliv = 'pickup';
  $$('[data-deliv]').forEach(function (b) {
    b.onclick = function () { deliv = b.dataset.deliv; $$('[data-deliv]').forEach(function (x) { x.classList.toggle('on', x === b); }); };
  });

  function orders() { try { return JSON.parse(localStorage.getItem(LS_ORD) || '{}'); } catch (e) { return {}; } }
  function saveOrders(o) { try { localStorage.setItem(LS_ORD, JSON.stringify(o)); } catch (e) {} }

  $('#orderForm').onsubmit = function (e) {
    e.preventDefault();
    var f = e.target, code = 'MS-' + (1000 + Math.floor(Math.random() * 8999));
    var all = orders();
    all[code] = {
      ts: Date.now(),
      name: f.name.value,
      items: cart.map(function (i) { return { name: i.name, spec: i.spec, gross: i.gross }; }),
      total: cartTotal() + (deliv === 'courier' ? 4.9 : 0),
      deliv: deliv
    };
    saveOrders(all);
    cart = []; saveCart(); renderCart();
    f.reset(); $('#oFileList').textContent = '';
    closeModals();
    $('#doneCode').textContent = code;
    openModal('#doneModal');
  };

  var STAGES = [
    { t: 'Užsakymas priimtas', s: 'Gavome užsakymą ir maketą' },
    { t: 'Maketas patikrintas', s: 'Spauda paruošta, laukiame patvirtinimo' },
    { t: 'Spausdinama', s: 'Užsakymas gamyboje' },
    { t: 'Paruošta atsiėmimui', s: 'Danės g. 6, 102 kab., I–V 8:00–17:00' }
  ];
  function stageOf(ts) {
    var min = (Date.now() - ts) / 60000;
    if (min < 1) return 0;
    if (min < 3) return 1;
    if (min < 6) return 2;
    return 3;
  }

  $('#trackBtn').onclick = function () { openModal('#trackModal'); setTimeout(function () { $('#trackIn').focus(); }, 60); };
  $('#trackGo').onclick = doTrack;
  $('#trackIn').onkeydown = function (e) { if (e.key === 'Enter') doTrack(); };

  function doTrack() {
    var code = ($('#trackIn').value || '').trim().toUpperCase();
    var all = orders(), out = $('#trackOut');
    if (code && code.indexOf('MS-') !== 0 && /^\d+$/.test(code)) code = 'MS-' + code;
    var o = all[code];
    if (!o) {
      out.innerHTML = '<p class="track miss">Užsakymo <b>' + (code || '—') + '</b> nerasta. ' +
        'Demonstracijoje sekti galima tik ką tik šioje naršyklėje sukurtą užsakymą — ' +
        'pateikite jį per krepšelį ir gausite numerį.</p>';
      return;
    }
    var st = stageOf(o.ts), html = '<div class="track"><ol>';
    STAGES.forEach(function (s, i) {
      html += '<li class="' + (i < st ? 'done' : i === st ? 'now' : '') + '"><span class="d">' + (i < st ? '✓' : '') + '</span>' +
        '<b>' + s.t + '</b><span>' + s.s + '</span></li>';
    });
    html += '</ol><p class="miss">Užsakymas ' + code + ' · ' + o.items.length + ' pozicij' + (o.items.length === 1 ? 'a' : 'os') +
      ' · ' + eur(o.total) + ' · ' + (o.deliv === 'courier' ? 'pristatymas kurjeriu' : 'atsiėmimas Danės g. 6') +
      '.<br>Demonstracijoje būsena pajuda kas kelias minutes — realioje sistemoje ją keičia Jūsų vadybininkas.</p></div>';
    out.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     7) SMULKMENOS: failai, forma, meniu, animacijos
     ═══════════════════════════════════════════════════════════════════════ */
  function wireFiles(input, label) {
    $(input).onchange = function () {
      var n = this.files.length;
      $(label).textContent = n ? '✓ Pasirinkta failų: ' + n + ' (' + this.files[0].name + (n > 1 ? ' ir kt.' : '') + ')' : '';
    };
  }
  wireFiles('#cFile', '#cFileList');
  wireFiles('#oFile', '#oFileList');

  $('#cform').onsubmit = function (e) {
    e.preventDefault();
    e.target.reset(); $('#cFileList').textContent = '';
    toast('✓ Ačiū! Demonstracinė forma — realioje svetainėje užklausa keliautų į vadyba.miestospauda@gmail.com');
  };

  var burger = $('#burger'), menu = $('#menu');
  burger.onclick = function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  $$('#menu a').forEach(function (a) {
    a.onclick = function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  });

  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toastT;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 4200);
  }

  // Atsiskleidimas slenkant — klasė dedama TIK per JS, tad be JS viskas matoma.
  var targets = $$('.sec-head, .cat, .calc-box, .stepgrid li, .work, .revgrid blockquote, .acc details, .cgrid > *');
  if ('IntersectionObserver' in window && targets.length) {
    targets.forEach(function (el, i) { el.classList.add('reveal'); el.style.transitionDelay = (i % 4) * 60 + 'ms'; });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Skaičių animacija
  var nums = $$('[data-num]');
  if (nums.length && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        io2.unobserve(en.target);
        var el = en.target, to = +el.dataset.num, suf = el.dataset.suf || '', t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 900);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    nums.forEach(function (n) { io2.observe(n); });
  } else {
    nums.forEach(function (n) { n.textContent = n.dataset.num + (n.dataset.suf || ''); });
  }

  $('#yr').textContent = new Date().getFullYear();

  // Mobilus meniu turi prasidėti po DEMO juostos
  var demobar = document.querySelector('.demobar');
  if (demobar) document.documentElement.style.setProperty('--demoh', demobar.offsetHeight + 'px');

  buildProduct('viz');
})();
