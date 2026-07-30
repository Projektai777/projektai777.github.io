/* © 2026 Lojalumas — DEMO svetainė „V1P Diamond Clean".
   Viskas veikia naršyklėje: skaičiuoklė, užsakymas, laiko pasirinkimas, sekimas.
   Jokio backend, jokių duomenų į serverį — būsena tik localStorage (v1p_demo_*).

   ĮKAINIAI (be PVM) paimti iš kliento kainoraščio v1p.lt.
   Koeficientai (dažnumas, skuba, aukštas) ir trukmės normos — PAVYZDINIAI:
   tikrame projekte čia surašomi kliento sutarti skaičiai, logika lieka ta pati. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS_CART = 'v1p_demo_cart', LS_ORD = 'v1p_demo_orders';
  var VAT = 0.21, MIN_NET = 45;

  /* ═══════════════════════════════════════════════════════════════════
     1) DUOMENYS
     ═══════════════════════════════════════════════════════════════════ */

  /* patalpų valymas: €/m² be PVM + norma min./m² (dirba 2 žmonės) */
  var SVC = {
    period: { n: 'Periodinis valymas',      m2: 1.00, min: 0.55 },
    gen:    { n: 'Generalinis valymas',     m2: 2.20, min: 1.15 },
    spec:   { n: 'Specialūs valymo darbai', m2: 3.50, min: 1.60 },
    post:   { n: 'Postatybinis valymas',    m2: 4.50, min: 2.20 },
    vask:   { n: 'Grindų vaškavimas',       m2: 1.20, min: 0.90 }
  };
  var OBJ = { butas: 'Butas', namas: 'Namas', biuras: 'Biuras', komerc: 'Komercinės patalpos' };
  var FREQ = { '1': 'Vienkartinis', '0.95': 'Kas mėnesį', '0.9': 'Kas 2 sav.', '0.85': 'Kas savaitę', '0.8': '2× per savaitę' };

  /* minkšti baldai, čiužiniai, kilimai — kainos iš v1p.lt kainoraščio */
  var BALDAI = [
    { id: 'kede',    n: 'Kėdė',                    p: 7,   img: 'f-kede',    min: 12 },
    { id: 'vadovo',  n: 'Vadovo / ofiso kėdė',     p: 15,  img: 'f-vadovo',  min: 18 },
    { id: 'pufas',   n: 'Pufas',                   p: 10,  img: null, gl: '🪑', min: 15 },
    { id: 'pagalve', n: 'Pagalvė',                 p: 5,   img: 'f-pagalve', min: 8 },
    { id: 'mini',    n: 'Mažas fotelis / krėslas', p: 20,  img: 'f-mini',    min: 25 },
    { id: 'fotelis', n: 'Fotelis',                 p: 30,  img: 'f-fotelis', min: 30 },
    { id: 'sofa2',   n: '2 vietų sofa',            p: 50,  img: 'f-sofa2',   min: 45 },
    { id: 'sofa3',   n: '3 vietų sofa',            p: 70,  img: 'f-sofa2',   min: 55 },
    { id: 'sofa4',   n: '4 vietų sofa',            p: 80,  img: 'f-didele',  min: 65 },
    { id: 'sofalova',n: 'Sofa-lova',               p: 60,  img: 'f-sofalova',min: 55 },
    { id: 'kampine', n: 'Didelė kampinė sofa',     p: 100, img: 'f-didele',  min: 80 },
    { id: 'ciuz1',   n: 'Vienvietis čiužinys',     p: 30,  img: null, gl: '🛏️', min: 30 },
    { id: 'ciuz2',   n: 'Dvivietis čiužinys',      p: 60,  img: null, gl: '🛏️', min: 50 },
    { id: 'galvug',  n: 'Lovos galvūgalis',        p: 30,  img: null, gl: '🛏️', min: 25 },
    { id: 'kilimas', n: 'Buitinis kilimas',        p: 9,   img: 'f-kilimas', min: 6, unit: 'm²' },
    { id: 'demes',   n: 'Dėmių valymas iš kilimo', p: 30,  img: 'f-kilimas', min: 20 }
  ];

  /* buitinė technika: po vieną — 20 €, visas komplektas — 50 € (kaip kainoraštyje) */
  var TECH = [
    { id: 'orkaite',  n: 'Orkaitė',   gl: '🔥', p: 20, min: 45 },
    { id: 'saldyt',   n: 'Šaldytuvas',gl: '🧊', p: 20, min: 40 },
    { id: 'gartrauk', n: 'Gartraukis',gl: '💨', p: 20, min: 35 },
    { id: 'indaplove',n: 'Indaplovė', gl: '🍽️', p: 20, min: 30 }
  ];
  var TECH_SET = 50;

  var WIN = { dust: { n: 'Langų valymas nuo dulkių', p: 9, min: 12 }, post: { n: 'Postatybinis langų valymas', p: 20, min: 25 } };
  var FLOOR = { '1': '1–2 aukštas', '1.15': '3–5 aukštas', '1.35': 'Aukščiau nei 5 aukštas' };

  var eur = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ═══════════════════════════════════════════════════════════════════
     2) UŽSAKYMO KREPŠELIS
     ═══════════════════════════════════════════════════════════════════ */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(LS_CART) || '[]'); } catch (e) { cart = []; }
  if (!Array.isArray(cart)) cart = [];

  function saveCart() { try { localStorage.setItem(LS_CART, JSON.stringify(cart)); } catch (e) {} }
  function find(id) { for (var i = 0; i < cart.length; i++) if (cart[i].id === id) return cart[i]; return null; }
  function put(item) {                                   /* prideda arba pakeičia eilutę */
    var ex = find(item.id);
    if (ex) { cart[cart.indexOf(ex)] = item; } else { cart.push(item); }
    render();
  }
  function drop(id) { cart = cart.filter(function (i) { return i.id !== id; }); render(); }

  function totals() {
    var net = 0, mins = 0;
    cart.forEach(function (i) { net += i.p; mins += i.min || 0; });
    var applied = cart.length ? Math.max(net, MIN_NET) : 0;
    return { raw: net, net: applied, vat: applied * VAT, tot: applied * (1 + VAT), mins: mins, bumped: cart.length > 0 && net < MIN_NET };
  }

  /* trukmė: normos suskaičiuotos vienam žmogui, dirba 2 → dalinam pusiau */
  function durText(mins) {
    var w = Math.max(60, Math.round(mins / 2 / 15) * 15);
    var h = Math.floor(w / 60), m = w % 60;
    return (h ? h + ' val.' : '') + (m ? (h ? ' ' : '') + m + ' min.' : '');
  }

  /* artimiausias laisvas laikas: šiandien, jei liko >= 3 val. iki 20:00 */
  function nextSlot() {
    var d = new Date(), h = d.getHours() + 3;
    if (h <= 20) return { day: 0, h: Math.max(8, Math.ceil(h / 2) * 2), txt: 'šiandien' };
    return { day: 1, h: 8, txt: 'rytoj' };
  }

  function render() {
    saveCart();
    var t = totals();

    /* eilučių sąrašas */
    var html = '';
    if (!cart.length) html = '<p class="sum-empty">Kol kas tuščia — pasirinkite paslaugą kairėje.</p>';
    cart.forEach(function (i) {
      html += '<div class="sl"><div class="sl-t"><b>' + i.t + '</b><span>' + i.s + '</span></div>' +
              '<div class="sl-p">' + eur(i.p) + '</div>' +
              '<button class="sl-x" data-drop="' + i.id + '" aria-label="Pašalinti">×</button></div>';
    });
    $('#sumList').innerHTML = html;

    $('#sumNet').textContent = eur(t.net);
    $('#sumVat').textContent = eur(t.vat);
    $('#sumTot').textContent = eur(t.tot);

    var meta = $('#sumMeta');
    if (cart.length) {
      var ns = nextSlot();
      meta.innerHTML = '⏱ Preliminari trukmė <b>' + durText(t.mins) + '</b> (dirba 2 specialistai)<br>' +
        '📅 Artimiausias laisvas laikas <b>' + ns.txt + ' ' + pad(ns.h) + ':00</b>' +
        (t.bumped ? '<br>ℹ️ Taikomas minimalus užsakymas <b>' + eur(MIN_NET) + '</b> be PVM' : '');
      meta.hidden = false;
    } else { meta.hidden = true; }

    $('#toOrder').disabled = !cart.length;

    /* mobili juosta */
    var mb = $('#mbar');
    mb.hidden = !cart.length;
    document.body.classList.toggle('has-order', !!cart.length);
    if (cart.length) {
      $('#mbarTot').textContent = eur(t.tot);
      $('#mbarCnt').textContent = cart.length + (cart.length === 1 ? ' paslauga' : (cart.length < 10 ? ' paslaugos' : ' paslaugų')) + ' · su PVM';
    }
    if (!$('#sheet').hidden) $('#sheetBody').innerHTML = '<div class="sum-in">' + $('.sum-in').innerHTML + '</div>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-drop]');
    if (b) { drop(b.getAttribute('data-drop')); }
  });

  /* ═══════════════════════════════════════════════════════════════════
     3) NAVIGACIJA
     ═══════════════════════════════════════════════════════════════════ */
  var burger = $('#burger'), menu = $('#menu');
  burger.onclick = function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });
  /* mobilus meniu turi prasidėti po demo juostos — jos aukštis kinta pagal tekstą */
  function dbh() { document.documentElement.style.setProperty('--dbh', $('.demobar').offsetHeight + 'px'); }
  dbh(); window.addEventListener('resize', dbh);

  /* ═══════════════════════════════════════════════════════════════════
     4) SKAIČIUOKLĖ — kortelės ↔ skirtukai
     ═══════════════════════════════════════════════════════════════════ */
  function showTab(name) {
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.pane').forEach(function (p) { p.hidden = p.id !== 'pane-' + name; });
  }
  $$('.tab').forEach(function (t) { t.onclick = function () { showTab(t.getAttribute('data-tab')); }; });

  $$('.sv').forEach(function (card) {
    card.onclick = function () {
      showTab(card.getAttribute('data-tab'));
      var svc = card.getAttribute('data-svc');
      if (svc) { var r = $('input[name=svc][value=' + svc + ']'); if (r) { r.checked = true; calcPatalpos(); } }
      $('#skaiciuokle').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  /* ── PATALPOS ─────────────────────────────────────────────────────── */
  var area = $('#area'), areaNum = $('#areaNum'), obj = 'butas', freq = '1';

  function setArea(v) {
    v = Math.max(15, Math.min(3000, parseInt(v, 10) || 15));
    areaNum.value = v; area.value = Math.min(600, v);
    $('#areaOut').textContent = v + ' m²';
    calcPatalpos();
  }
  area.oninput = function () { setArea(area.value); };
  areaNum.oninput = function () { setArea(areaNum.value); };
  $$('#areaChips button').forEach(function (b) { b.onclick = function () { setArea(b.getAttribute('data-a')); }; });

  $$('#objSeg .sg').forEach(function (b) {
    b.onclick = function () { $$('#objSeg .sg').forEach(function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on'); obj = b.getAttribute('data-obj'); calcPatalpos(); };
  });
  $$('#freqSeg .sg').forEach(function (b) {
    b.onclick = function () { $$('#freqSeg .sg').forEach(function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on'); freq = b.getAttribute('data-f'); calcPatalpos(); };
  });
  $$('input[name=svc]').forEach(function (r) { r.onchange = calcPatalpos; });
  ['#addUrgent', '#addNight', '#addEco'].forEach(function (id) { $(id).onchange = calcPatalpos; });

  var lastPat = null;
  function calcPatalpos() {
    var key = $('input[name=svc]:checked').value, s = SVC[key];
    var m2 = parseInt(areaNum.value, 10) || 15;
    var k = parseFloat(freq);
    var extras = [], mult = 1;
    /* vaškavimui dažnumo nuolaida netaikoma — tai vienkartinis darbas */
    if (key === 'vask') k = 1;
    if ($('#addUrgent').checked) { mult *= 1.25; extras.push('skubu +25 %'); }
    if ($('#addNight').checked) { mult *= 1.20; extras.push('naktį / savaitgalį +20 %'); }
    if ($('#addEco').checked) { mult *= 1.08; extras.push('ekologiškos priemonės +8 %'); }

    var p = s.m2 * m2 * k * mult;
    var sub = s.m2.toFixed(2).replace('.', ',') + ' €/m² · ' + OBJ[obj] + ' ' + m2 + ' m²';
    if (k !== 1) sub += ' · ' + FREQ[freq] + ' (−' + Math.round((1 - k) * 100) + ' %)';
    if (extras.length) sub += ' · ' + extras.join(', ');

    lastPat = { id: 'p', t: s.n, s: sub, p: Math.round(p * 100) / 100, min: s.min * m2 * (1 + (mult - 1) * 0.3) };
    $('#freqSet').style.opacity = key === 'vask' ? '.45' : '';
    $('#addPatalpos').textContent = 'Pridėti į užsakymą · ' + eur(lastPat.p * (1 + VAT)) + ' su PVM';
  }
  $('#addPatalpos').onclick = function () { if (lastPat) { put(lastPat); toast('Pridėta: ' + lastPat.t); } };

  /* ── BALDAI IR KILIMAI ────────────────────────────────────────────── */
  var qty = {};
  function itemTile(o, kind) {
    var art = o.img ? '<img src="./img/' + o.img + '.webp" alt="" loading="lazy">' : '<span class="gl">' + o.gl + '</span>';
    return '<div class="it" id="it-' + kind + '-' + o.id + '">' +
      '<div class="it-img">' + art + '</div>' +
      '<h4>' + o.n + '</h4>' +
      '<div class="pr"><b>' + eur(o.p) + '</b>' + (o.unit ? ' / ' + o.unit : '') + '</div>' +
      '<div class="it-q"><button data-q="' + kind + ':' + o.id + ':-1" aria-label="Mažiau">−</button>' +
      '<input type="number" min="0" max="99" value="0" data-qi="' + kind + ':' + o.id + '" aria-label="' + o.n + ' kiekis">' +
      '<button data-q="' + kind + ':' + o.id + ':1" aria-label="Daugiau">+</button></div></div>';
  }
  $('#itemsBaldai').innerHTML = BALDAI.map(function (o) { return itemTile(o, 'b'); }).join('');

  function setQty(kind, id, v) {
    var list = kind === 'b' ? BALDAI : TECH, o = null;
    list.forEach(function (x) { if (x.id === id) o = x; });
    if (!o) return;
    v = Math.max(0, Math.min(99, v));
    qty[kind + ':' + id] = v;
    var tile = $('#it-' + kind + '-' + id);
    tile.classList.toggle('on', v > 0);
    $('input[data-qi="' + kind + ':' + id + '"]').value = v;

    if (kind === 'b') {
      if (v > 0) put({ id: 'b:' + id, t: o.n, s: v + ' ' + (o.unit || 'vnt.') + ' × ' + eur(o.p), p: Math.round(o.p * v * 100) / 100, min: o.min * v });
      else drop('b:' + id);
    } else { techSum(); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    var a = b.getAttribute('data-q').split(':');
    setQty(a[0], a[1], (qty[a[0] + ':' + a[1]] || 0) + parseInt(a[2], 10));
  });
  document.addEventListener('input', function (e) {
    var i = e.target.closest('[data-qi]');
    if (!i) return;
    var a = i.getAttribute('data-qi').split(':');
    setQty(a[0], a[1], parseInt(i.value, 10) || 0);
  });

  /* ── BUITINĖ TECHNIKA ─────────────────────────────────────────────── */
  $('#itemsTechnika').innerHTML = TECH.map(function (o) { return itemTile(o, 't'); }).join('');
  var lastTech = null;
  function techSum() {
    var picked = TECH.filter(function (o) { return (qty['t:' + o.id] || 0) > 0; });
    var box = $('#techSum');
    if (!picked.length) { box.hidden = true; lastTech = null; $('#addTechnika').disabled = true; return; }
    var units = 0, mins = 0;
    picked.forEach(function (o) { units += qty['t:' + o.id]; mins += o.min * qty['t:' + o.id]; });
    var full = picked.length === TECH.length;
    var price = full ? TECH_SET * Math.min.apply(null, TECH.map(function (o) { return qty['t:' + o.id]; })) : 0;
    if (full) {
      /* pilni komplektai kainuoja 50 €, likutis — po 20 € */
      var sets = Math.min.apply(null, TECH.map(function (o) { return qty['t:' + o.id]; }));
      price = TECH_SET * sets;
      TECH.forEach(function (o) { price += (qty['t:' + o.id] - sets) * o.p; });
      box.innerHTML = '✓ Pasirinktas visas komplektas — taikoma <b>' + eur(TECH_SET) + '</b> vietoj ' + eur(80) + ' (sutaupote ' + eur(30 * sets) + ')';
    } else {
      picked.forEach(function (o) { price += o.p * qty['t:' + o.id]; });
      box.innerHTML = 'Pridėkite likusius prietaisus ir visas komplektas kainuos <b>' + eur(TECH_SET) + '</b> vietoj ' + eur(80) + '.';
    }
    box.hidden = false;
    $('#addTechnika').disabled = false;
    lastTech = {
      id: 't', t: 'Buitinės technikos valymas',
      s: picked.map(function (o) { return o.n + (qty['t:' + o.id] > 1 ? ' ×' + qty['t:' + o.id] : ''); }).join(', '),
      p: Math.round(price * 100) / 100, min: mins
    };
    $('#addTechnika').textContent = 'Pridėti į užsakymą · ' + eur(price * (1 + VAT)) + ' su PVM';
  }
  $('#addTechnika').onclick = function () { if (lastTech) { put(lastTech); toast('Pridėta: buitinės technikos valymas'); } };
  techSum();

  /* ── LANGAI ───────────────────────────────────────────────────────── */
  var winFloor = '1';
  $$('#winFloor .sg').forEach(function (b) {
    b.onclick = function () { $$('#winFloor .sg').forEach(function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on'); winFloor = b.getAttribute('data-k'); calcLangai(); };
  });
  $$('[data-win]').forEach(function (b) {
    b.onclick = function () { $('#winQty').value = Math.max(1, Math.min(200, (parseInt($('#winQty').value, 10) || 1) + parseInt(b.getAttribute('data-win'), 10))); calcLangai(); };
  });
  $('#winQty').oninput = calcLangai;
  $$('input[name=win]').forEach(function (r) { r.onchange = calcLangai; });

  var lastWin = null;
  function calcLangai() {
    var key = $('input[name=win]:checked').value, w = WIN[key];
    var n = Math.max(1, Math.min(200, parseInt($('#winQty').value, 10) || 1));
    var k = parseFloat(winFloor);
    var p = w.p * n * k;
    lastWin = {
      id: 'w', t: w.n,
      s: n + ' vnt. × ' + eur(w.p) + ' · ' + FLOOR[winFloor] + (k !== 1 ? ' (+' + Math.round((k - 1) * 100) + ' %)' : ''),
      p: Math.round(p * 100) / 100, min: w.min * n
    };
    $('#addLangai').textContent = 'Pridėti į užsakymą · ' + eur(p * (1 + VAT)) + ' su PVM';
  }
  $('#addLangai').onclick = function () { if (lastWin) { put(lastWin); toast('Pridėta: ' + lastWin.t); } };

  /* pradinės reikšmės */
  calcPatalpos(); calcLangai();
  cart.forEach(function (i) { if (i.id.indexOf('b:') === 0) { var id = i.id.slice(2); var o = null; BALDAI.forEach(function (x) { if (x.id === id) o = x; }); if (o) { qty[i.id] = Math.round(i.p / o.p); var el = $('input[data-qi="b:' + id + '"]'); if (el) { el.value = qty[i.id]; $('#it-b-' + id).classList.add('on'); } } } });
  render();

  /* ═══════════════════════════════════════════════════════════════════
     5) MODALAI
     ═══════════════════════════════════════════════════════════════════ */
  var scrim = $('#scrim');
  function anyOpen() { return ['#orderModal', '#doneModal', '#trackModal', '#sheet'].some(function (id) { return !$(id).hidden; }); }
  function openM(id) { $(id).hidden = false; scrim.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeAll() {
    ['#orderModal', '#doneModal', '#trackModal', '#sheet'].forEach(function (id) { $(id).hidden = true; });
    scrim.hidden = true; document.body.style.overflow = '';
  }
  scrim.onclick = closeAll;
  ['#orderX', '#doneX', '#trackX', '#sheetX', '#doneOk'].forEach(function (id) { $(id).onclick = closeAll; });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#lb').hidden) { $('#lb').hidden = true; if (!anyOpen()) document.body.style.overflow = ''; return; }
    if (anyOpen()) closeAll();
  });

  /* suvestinė telefone */
  $('#mbarBtn').onclick = function () {
    $('#sheetBody').innerHTML = '<div class="sum-in">' + $('.sum-in').innerHTML + '</div>';
    openM('#sheet');
    var b = $('#sheetBody #toOrder'); if (b) b.onclick = openOrder;
  };

  /* ── laikas + kontaktai ───────────────────────────────────────────── */
  var DAYS = ['Sekm', 'Pirm', 'Antr', 'Treč', 'Ketv', 'Penkt', 'Šešt'];
  var MON = ['sau', 'vas', 'kov', 'bal', 'geg', 'bir', 'lie', 'rugp', 'rugs', 'spa', 'lap', 'gruo'];
  var SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  var pickDay = 0, pickSlot = null;

  /* užimtumas turi būti pastovus (o ne kaskart naujas), todėl — paprastas hash'as */
  function busy(dayIdx, slot) {
    var h = (dayIdx * 7 + SLOTS.indexOf(slot) * 13 + new Date().getDate()) % 10;
    return h < 3;
  }
  function buildDays() {
    var out = '';
    for (var i = 0; i < 10; i++) {
      var d = new Date(); d.setDate(d.getDate() + i);
      var lbl = i === 0 ? 'Šiandien' : i === 1 ? 'Rytoj' : DAYS[d.getDay()];
      out += '<button type="button" class="day' + (i === pickDay ? ' is-on' : '') + '" data-day="' + i + '">' +
             '<span>' + lbl + '</span><b>' + d.getDate() + '</b><span>' + MON[d.getMonth()] + '</span></button>';
    }
    $('#days').innerHTML = out;
    $$('#days .day').forEach(function (b) {
      b.onclick = function () { pickDay = parseInt(b.getAttribute('data-day'), 10); pickSlot = null; buildDays(); buildSlots(); };
    });
  }
  function buildSlots() {
    var now = new Date(), out = '';
    SLOTS.forEach(function (s) {
      var past = pickDay === 0 && parseInt(s, 10) <= now.getHours() + 2;
      var off = past || busy(pickDay, s);
      out += '<button type="button" class="slot' + (pickSlot === s ? ' is-on' : '') + '"' + (off ? ' disabled' : '') + ' data-slot="' + s + '">' + s + '</button>';
    });
    $('#slots').innerHTML = out;
    $$('#slots .slot').forEach(function (b) {
      b.onclick = function () { pickSlot = b.getAttribute('data-slot'); buildSlots(); };
    });
  }
  function openOrder() {
    if (!cart.length) return;
    var t = totals();
    var rows = cart.map(function (i) { return '<div class="r"><span>' + i.t + '</span><b>' + eur(i.p) + '</b></div>'; }).join('');
    $('#moSum').innerHTML = rows +
      (t.bumped ? '<div class="r"><span>Minimalus užsakymas</span><b>' + eur(MIN_NET) + '</b></div>' : '') +
      '<div class="r"><span>PVM 21 %</span><b>' + eur(t.vat) + '</b></div>' +
      '<div class="r big"><span>Iš viso su PVM</span><b>' + eur(t.tot) + '</b></div>' +
      '<div class="r"><span>Preliminari trukmė</span><b>' + durText(t.mins) + '</b></div>';
    pickSlot = null; buildDays(); buildSlots();
    closeAll(); openM('#orderModal');
  }
  $('#toOrder').onclick = openOrder;

  function orders() { try { return JSON.parse(localStorage.getItem(LS_ORD) || '{}'); } catch (e) { return {}; } }
  function saveOrders(o) { try { localStorage.setItem(LS_ORD, JSON.stringify(o)); } catch (e) {} }

  $('#orderForm').onsubmit = function (e) {
    e.preventDefault();
    var f = e.target, ok = true;
    $$('input,select,textarea', f).forEach(function (el) { el.classList.remove('err'); });
    ['name', 'phone', 'addr'].forEach(function (k) {
      if (!f[k].value.trim()) { f[k].classList.add('err'); ok = false; }
    });
    if (!pickSlot) { toast('Pasirinkite laiką'); return; }
    if (!f.gdpr.checked) { toast('Pažymėkite sutikimą'); return; }
    if (!ok) { toast('Užpildykite pažymėtus laukus'); return; }

    var code = 'V1P-' + (1000 + Math.floor(Math.random() * 8999));
    var d = new Date(); d.setDate(d.getDate() + pickDay);
    var when = pad(d.getDate()) + ' ' + MON[d.getMonth()] + '. ' + pickSlot;
    var t = totals();
    var all = orders();
    all[code] = {
      ts: Date.now(), when: when, day: pickDay, slot: pickSlot, tot: t.tot, mins: t.mins,
      name: f.name.value.trim(), city: f.city.value, addr: f.addr.value.trim(),
      items: cart.map(function (i) { return i.t; })
    };
    saveOrders(all);

    $('#doneCode').textContent = code;
    $('#doneWhen').textContent = 'Atvykstame ' + when + ' · ' + f.city.value + ', ' + f.addr.value.trim() + ' · ' + eur(t.tot) + ' su PVM';
    cart = []; qty = {};
    $$('.it').forEach(function (x) { x.classList.remove('on'); });
    $$('[data-qi]').forEach(function (x) { x.value = 0; });
    techSum(); render();
    f.reset();
    closeAll(); openM('#doneModal');
  };

  /* ── sekimas ──────────────────────────────────────────────────────── */
  var STAGES = [
    { at: 0,   t: 'Užsakymas priimtas',              s: 'Gavome užsakymą, ieškome laisvos brigados' },
    { at: 1.5, t: 'Patvirtinta, priskirta brigada',  s: 'Vadybininkas patvirtino laiką ir apimtį' },
    { at: 3,   t: 'Brigada pakeliui',                s: 'Specialistai išvyko pas Jus' },
    { at: 5,   t: 'Valome',                          s: 'Darbai vyksta objekte' },
    { at: 8,   t: 'Atlikta',                         s: 'Darbai priduoti, laukiame Jūsų įvertinimo' }
  ];
  $('#trackBtn').onclick = function () { openM('#trackModal'); setTimeout(function () { $('#trackIn').focus(); }, 60); };
  $('#trackGo').onclick = doTrack;
  $('#trackIn').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); doTrack(); } };

  function doTrack() {
    var code = ($('#trackIn').value || '').trim().toUpperCase();
    if (code && /^\d+$/.test(code)) code = 'V1P-' + code;
    var all = orders(), o = all[code], out = $('#trackOut');
    if (!o) {
      out.innerHTML = '<p class="track miss">Užsakymo <b>' + (code || '—') + '</b> nerasta. Demonstracijoje matomi tik šioje naršyklėje sukurti užsakymai — ' +
        'suskaičiuokite kainą ir užsakykite, tada grįžkite su gautu numeriu.</p>';
      return;
    }
    var mins = (Date.now() - o.ts) / 60000, html = '';
    html += '<div class="track-head"><b>' + code + ' · ' + eur(o.tot) + ' su PVM</b>' +
            '<span>' + o.items.join(', ') + '<br>' + o.when + ' · ' + o.city + ', ' + o.addr + '</span></div>';
    html += '<div class="track"><ol>';
    var cur = 0;
    STAGES.forEach(function (s, i) { if (mins >= s.at) cur = i; });
    STAGES.forEach(function (s, i) {
      var cls = i < cur ? 'done' : i === cur ? 'now' : '';
      var tm = new Date(o.ts + s.at * 60000);
      html += '<li class="' + cls + '"><b>' + s.t + '</b><span>' + s.s + (i <= cur ? ' · ' + pad(tm.getHours()) + ':' + pad(tm.getMinutes()) : '') + '</span></li>';
    });
    html += '</ol><p class="mini">Demonstracijai būsena keičiasi kas kelias minutes. Tikroje sistemoje ją keičia brigada telefone, o klientas gauna SMS.</p></div>';
    out.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════
     6) DARBAI — filtras, lightbox, prieš/po
     ═══════════════════════════════════════════════════════════════════ */
  $$('#wfilter button').forEach(function (b) {
    b.onclick = function () {
      $$('#wfilter button').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      var f = b.getAttribute('data-f');
      $$('#gal figure').forEach(function (fig) { fig.hidden = f !== 'all' && fig.getAttribute('data-f') !== f; });
    };
  });
  $$('#gal figure').forEach(function (fig) {
    fig.onclick = function () {
      var img = $('img', fig);
      $('#lbImg').src = img.src; $('#lbImg').alt = img.alt;
      $('#lb').hidden = false; document.body.style.overflow = 'hidden';
    };
  });
  $('#lbX').onclick = function () { $('#lb').hidden = true; if (!anyOpen()) document.body.style.overflow = ''; };
  $('#lb').onclick = function (e) { if (e.target.id === 'lb') $('#lbX').onclick(); };

  var ba = $('#ba'), baImg = $('.ba-img', ba), baBefore = $('#baBefore'), baHandle = $('#baHandle'), baDrag = false;
  function setBa(pct) {
    pct = Math.max(0, Math.min(100, pct));
    baBefore.style.width = pct + '%';
    baHandle.style.left = pct + '%';
    baHandle.setAttribute('aria-valuenow', Math.round(pct));
  }
  function baFromX(x) { var r = baImg.getBoundingClientRect(); setBa(((x - r.left) / r.width) * 100); }
  baImg.addEventListener('pointerdown', function (e) { baDrag = true; baImg.setPointerCapture(e.pointerId); baFromX(e.clientX); });
  baImg.addEventListener('pointermove', function (e) { if (baDrag) baFromX(e.clientX); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { baImg.addEventListener(ev, function () { baDrag = false; }); });
  baHandle.addEventListener('keydown', function (e) {
    var n = parseFloat(baHandle.getAttribute('aria-valuenow'));
    if (e.key === 'ArrowLeft') { setBa(n - 4); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setBa(n + 4); e.preventDefault(); }
  });

  /* ═══════════════════════════════════════════════════════════════════
     7) FORMOS + smulkmenos
     ═══════════════════════════════════════════════════════════════════ */
  var tt;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function wireForm(sel, req, msg) {
    $(sel).onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, ok = true;
      req.forEach(function (k) {
        f[k].classList.remove('err');
        if (!f[k].value.trim()) { f[k].classList.add('err'); ok = false; }
      });
      if (!ok) { toast('Užpildykite pažymėtus laukus'); return; }
      f.reset(); toast(msg);
    };
  }
  wireForm('#askForm', ['name', 'phone'], 'Ačiū! Demonstracijoje užklausa nesiunčiama.');
  wireForm('#jobForm', ['jname', 'jphone'], 'Ačiū! Anketa priimta (demonstracija).');

  /* hero kortelė — artimiausias laikas realiu laiku */
  var ns = nextSlot();
  $('#hcSlot').textContent = ns.txt + ' ' + pad(ns.h) + ':00';
  $('#hcPrice').textContent = Math.round(SVC.gen.m2 * 62 * (1 + VAT));

})();
