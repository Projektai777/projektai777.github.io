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

  /* Turinys, pakeistas valdymo sistemoje. TIKRAS tekstas gyvena pačiame HTML —
     čia tik UŽDEDAMI pakeitimai. Todėl išjungus valdymo sistemą svetainė
     rodoma pilnai ir lieka matoma paieškos sistemoms. Ištrynus lauką
     redaktoriuje grįžta originalus tekstas. */
  (function applyContent() {
    var c;
    try { c = JSON.parse(localStorage.getItem(MS.LS.content) || '{}'); } catch (e) { return; }
    $$('[data-cms]').forEach(function (el) {
      var v = c[el.getAttribute('data-cms')];
      if (typeof v === 'string' && v.trim()) el.textContent = v;
    });
    // telefonas ir el. paštas turi ne tik tekstą, bet ir nuorodą
    var tel = $('[data-cms="kont.tel"]'), mail = $('[data-cms="kont.email"]');
    if (tel && c['kont.tel']) tel.href = 'tel:' + c['kont.tel'].replace(/\s/g, '');
    if (mail && c['kont.email']) mail.href = 'mailto:' + c['kont.email'].trim();
  })();

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
      '<button class="btn btn-sm">Skaičiuoti</button>' +
      // Tikra nuoroda į atskirą produkto puslapį — ją mato ir naršyklė, ir Google.
      // Tekstas be produkto pavadinimo TYČIA: lietuviškai „apie" reikalauja galininko
      // („apie vizitines korteles", ne „apie vizitinės kortelės"), o linksniuoti
      // pavadinimus automatiškai patikimai neįmanoma.
      '<a class="prod-more" href="./p/' + id + '.html">Plačiau apie šį produktą →</a>';
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

  // Kategorijų kortelėse dabar yra tikros nuorodos į produktų puslapius, todėl
  // visos kortelės paspaudimas į skaičiuoklę BUVO PANAIKINTAS — jis nustelbdavo
  // nuorodas ir klientas niekaip nepatekdavo į produkto puslapį.

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
    closeDrawer(); gotoStep(1); openModal('#orderModal');
  };

  var deliv = 'pickup';
  $$('[data-deliv]').forEach(function (b) {
    b.onclick = function () {
      deliv = b.dataset.deliv;
      $$('[data-deliv]').forEach(function (x) { x.classList.toggle('on', x === b); });
      paintSums();
    };
  });

  function orders() { try { return JSON.parse(localStorage.getItem(LS_ORD) || '{}'); } catch (e) { return {}; } }
  function saveOrders(o) { try { localStorage.setItem(LS_ORD, JSON.stringify(o)); } catch (e) {} }

  /* ── UŽSAKYMO ŽINGSNIAI: kontaktai → maketas → apmokėjimas ──────────────
     Maketas ir apmokėjimas yra savarankiški žingsniai, o ne laukeliai formos
     apačioje — todėl klientas fiziškai negali jų praleisti nepastebėjęs. */
  var step = 1, files = [], noArt = false;
  var MAXMB = 100;
  var OKEXT = ['pdf', 'ai', 'cdr', 'psd', 'tif', 'tiff', 'jpg', 'jpeg', 'png', 'eps', 'zip'];

  function orderTotal() { return cartTotal() + (deliv === 'courier' ? 4.9 : 0); }

  function paintSums() {
    var t = orderTotal();
    $('#sumStep1').textContent = eur(t);
    $('#payAmt').textContent = eur(t);
    var net = t / VAT;
    $('#paySum').innerHTML =
      '<div class="po-row"><span>Prekės ir paslaugos</span><b>' + eur(cartTotal()) + '</b></div>' +
      (deliv === 'courier' ? '<div class="po-row"><span>Pristatymas kurjeriu</span><b>4,90 €</b></div>' : '') +
      '<div class="po-row sm"><span>Suma be PVM</span><span>' + eur(net) + '</span></div>' +
      '<div class="po-row sm"><span>PVM 21 %</span><span>' + eur(t - net) + '</span></div>' +
      '<div class="po-row big"><span>Mokėti</span><b>' + eur(t) + '</b></div>';
  }

  function gotoStep(n) {
    step = n;
    $$('#orderModal .step').forEach(function (p) { p.hidden = +p.dataset.pane !== n; });
    $$('#stepsBar li').forEach(function (li) {
      var s = +li.dataset.step;
      li.classList.toggle('on', s === n);
      li.classList.toggle('done', s < n);
    });
    paintSums();
    var pane = $('#orderModal .step[data-pane="' + n + '"]');
    if (pane) pane.scrollIntoView({ block: 'nearest' });
  }

  // 1 → 2 leidžiame tik užpildžius privalomus kontaktus.
  function validContacts() {
    var f = $('#orderForm'), miss = [];
    ['name', 'email', 'tel'].forEach(function (k) {
      var el = f[k], ok = el.value.trim() !== '';
      if (ok && k === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      if (ok && k === 'tel') ok = el.value.replace(/\D/g, '').length >= 8;
      el.closest('.fld').classList.toggle('bad', !ok);
      if (!ok) miss.push(k);
    });
    if (miss.length) toast('Patikslinkite: ' + (miss.indexOf('name') > -1 ? 'vardas ' : '') +
      (miss.indexOf('email') > -1 ? 'el. paštas ' : '') + (miss.indexOf('tel') > -1 ? 'telefonas' : ''));
    return !miss.length;
  }

  $$('[data-next]').forEach(function (b) {
    b.onclick = function () {
      var to = +b.dataset.next;
      if (to === 2 && !validContacts()) return;
      if (to === 3 && !files.length && !noArt) {
        toast('Įkelkite maketą arba pažymėkite, kad maketo dar neturite');
        return;
      }
      gotoStep(to);
    };
  });
  $$('[data-back]').forEach(function (b) { b.onclick = function () { gotoStep(+b.dataset.back); }; });

  // Įmonės laukas atskleidžia PVM kodo eilutę — smulkmena, bet būtent jos
  // klientai pasigenda pirkdami įmonės vardu.
  $('#orderForm').company.oninput = function () { $('#fVat').hidden = !this.value.trim(); };

  /* ── MAKETO ĮKĖLIMAS su tikra patikra ────────────────────────────────── */
  function fileErr(f) {
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (OKEXT.indexOf(ext) < 0) return 'netinkamas formatas (.' + ext + ')';
    if (f.size > MAXMB * 1024 * 1024) return 'per didelis (' + (f.size / 1048576).toFixed(0) + ' MB)';
    return null;
  }
  function fmtSize(b) {
    return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }
  function renderFiles() {
    var ul = $('#oFileList');
    ul.innerHTML = '';
    files.forEach(function (f, i) {
      var err = fileErr(f), li = document.createElement('li');
      li.className = err ? 'bad' : 'ok';
      li.innerHTML = '<span class="fi">' + (err ? '✕' : '✓') + '</span>' +
        '<b>' + f.name.replace(/[<>&]/g, '') + '</b>' +
        '<i>' + (err ? err : fmtSize(f.size) + ' · formatas tinkamas') + '</i>' +
        '<button type="button" class="rmf" aria-label="Šalinti">×</button>';
      li.querySelector('.rmf').onclick = function () { files.splice(i, 1); renderFiles(); };
      ul.appendChild(li);
    });
    if (files.length && !files.some(fileErr)) {
      var ok = document.createElement('li');
      ok.className = 'note';
      ok.innerHTML = 'Automatinė patikra praėjo. Realioje sistemoje čia dar tikrinama skiriamoji geba, ' +
        'apipjovimo laukai ir CMYK — o dizaineris peržiūri prieš spaudą.';
      ul.appendChild(ok);
    }
  }
  function addFiles(list) {
    Array.prototype.slice.call(list).forEach(function (f) { files.push(f); });
    renderFiles();
    if (files.length) $('#noArt').checked = noArt = false;
  }
  $('#oFile').onchange = function () { addFiles(this.files); this.value = ''; };
  $('#noArt').onchange = function () {
    noArt = this.checked;
    if (noArt) { files = []; renderFiles(); }
  };

  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
  });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

  $$('#pays .pay').forEach(function (p) {
    p.onclick = function () { setTimeout(function () { $$('#pays .pay').forEach(function (x) { x.classList.toggle('on', x.querySelector('input').checked); }); }, 0); };
  });

  $('#orderForm').onsubmit = function (e) {
    e.preventDefault();
    if (step !== 3) return;
    if (files.some(fileErr)) { gotoStep(2); toast('Pašalinkite netinkamus failus'); return; }
    if (!$('#agree').checked) { toast('Pažymėkite, kad sutinkate su sąlygomis'); return; }

    var f = e.target, code = 'MS-' + (1000 + Math.floor(Math.random() * 8999));
    var pay = (f.querySelector('input[name=pay]:checked') || {}).value || 'bank';
    var all = orders();
    all[code] = {
      ts: Date.now(),
      name: f.name.value.trim(),
      company: f.company.value.trim(),
      email: f.email.value.trim(),
      tel: f.tel.value.trim(),
      note: f.note.value.trim(),
      items: cart.map(function (i) { return { name: i.name, spec: i.spec, gross: i.gross }; }),
      total: orderTotal(),
      deliv: deliv,
      pay: pay,
      paid: pay !== 'invoice',            // sąskaita įmonei apmokama vėliau
      files: files.map(function (x) { return { name: x.name, size: x.size }; }),
      noArt: noArt,
      stage: 0
    };
    saveOrders(all);
    cart = []; saveCart(); renderCart();

    f.reset(); files = []; noArt = false; renderFiles(); $('#fVat').hidden = true;
    closeModals();
    $('#doneCode').textContent = code;
    $('#donePay').textContent = pay === 'invoice'
      ? 'Išankstinę sąskaitą išsiuntėme el. paštu — apmokėjus pradedame gamybą.'
      : 'Apmokėjimas gautas — užsakymas jau gamyboje.';
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
    // Jei vadybininkas būseną pakeitė valdymo sistemoje — rodome JO nustatytą.
    var st = o.manual ? (o.stage || 0) : stageOf(o.ts);
    var html = '<div class="track"><ol>';
    STAGES.forEach(function (s, i) {
      html += '<li class="' + (i < st ? 'done' : i === st ? 'now' : '') + '"><span class="d">' + (i < st ? '✓' : '') + '</span>' +
        '<b>' + s.t + '</b><span>' + s.s + '</span></li>';
    });
    var payTxt = o.pay === 'invoice'
      ? (o.paid ? 'sąskaita apmokėta' : 'laukiama apmokėjimo pagal sąskaitą')
      : 'apmokėta internetu';
    html += '</ol><p class="miss">Užsakymas ' + code + ' · ' + o.items.length + ' pozicij' + (o.items.length === 1 ? 'a' : 'os') +
      ' · ' + eur(o.total) + ' · ' + payTxt +
      ' · ' + (o.deliv === 'courier' ? 'pristatymas kurjeriu' : 'atsiėmimas Danės g. 6') +
      (o.files && o.files.length ? ' · maketas gautas (' + o.files.length + ' fail' + (o.files.length === 1 ? 'as' : 'ai') + ')' : (o.noArt ? ' · maketą ruošia dizaineris' : '')) +
      '.<br>Demonstracijoje būsena pajuda kas kelias minutes — realioje sistemoje ją keičia vadybininkas valdymo sistemoje.</p></div>';
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
  wireFiles('#cFile', '#cFileList');   // #oFile turi savo logiką su patikra (žr. 6 sk.)

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

  // Atskiri produktų puslapiai (p/*.html) atsiunčia klientą į skaičiuoklę su
  // jau parinktu produktu: ../index.html?p=lipd#skaiciuokle
  var wanted = (location.search.match(/[?&]p=([a-z]+)/) || [])[1];
  buildProduct(wanted && PRODUCTS.some(function (p) { return p.id === wanted; }) ? wanted : 'viz');
})();
