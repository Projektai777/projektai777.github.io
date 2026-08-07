/* © 2026 Lojalumas — DEMO svetainė „Miesto Spauda".
   Viskas veikia naršyklėje: skaičiuoklė, krepšelis, užsakymas, sekimas.
   Jokio backend, jokių duomenų į serverį — būsena tik localStorage (ms_demo_*). */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MS = window.MS;
  var LS_CART = MS.LS.cart, LS_ORD = MS.LS.orders;

  /* ═══════════════════════════════════════════════════════════════════════
     1) PRODUKTAI IR KAINODARA — imami iš bendro katalogo products.js.
        Tą patį failą naudoja atskiri produktų puslapiai (p/*.html) ir
        valdymo sistema (admin.html), todėl kaina trijose vietose niekada
        negali išsiskirti. Savininko pakeistos kainos pritaikomos čia.
     ═══════════════════════════════════════════════════════════════════════ */
  function loadPrices() {
    try { return JSON.parse(localStorage.getItem(MS.LS.prices) || 'null'); } catch (e) { return null; }
  }
  MS.applyOverrides(loadPrices());

  var VAT = MS.VAT, PRODUCTS = MS.PRODUCTS;
  var volFactor = MS.volFactor, byId = MS.byId, price = MS.price;
  var eur = MS.eur, eur4 = MS.eur4;

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
