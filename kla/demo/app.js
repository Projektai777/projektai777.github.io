/* © 2026 Ignas — forwarding-system prototype logic.
   Everything here runs in the browser: no backend, no network, no storage.
   All data is invented. ES5 style on purpose, to match ../app.js.

   The point of this file is to make three things demonstrable rather than claimed:
     1. it is data-driven (search, filters and margin are computed, not painted),
     2. role-based access control is visible (switch role -> fields disappear),
     3. the Outlook invoice robot has a defined behaviour when it FAILS.

   NOTE on masking: here it happens in the browser because there is no server.
   In the real system the check belongs on the server and the hidden values are
   never sent at all — the Saugumas view says exactly that, so the prototype does
   not imply browser-side hiding is the security model. */
(function () {
  'use strict';

  /* ── data ───────────────────────────────────────────────────────────── */

  var STATUS = {
    naujas:   { t: 'Naujas',    c: 'st-n' },
    kelyje:   { t: 'Kelyje',    c: 'st-k' },
    iskrauta: { t: 'Iškrauta',  c: 'st-i' },
    apmoketa: { t: 'Apmokėta',  c: 'st-a' }
  };

  /* The one order an external carrier is allowed to see. */
  var CARRIER_ORDER = 'EKS-2026-0418';

  /* Us, the forwarder. A forwarder's order to its subcontracted carrier is issued by
     the FORWARDER — the end client must not appear on it at all, or the carrier can
     go round us next time. This is the whole point of the masking demo. */
  var FORWARDER = 'UAB „Ekspedicija" (Jūsų įmonė)';

  var ORDERS = [
    {
      id: 'EKS-2026-0418', client: 'UAB „Nemuno metalas"', from: 'Kaunas, LT', to: 'Warszawa, PL',
      cargo: 'Plieno ritiniai, 21 t', mode: 'FTL', tags: [],
      carrier: 'UAB „Vėtra Trans"', plate: 'JKL 123 / JV 456',
      load: '2026-08-04', unload: '2026-08-06', sell: 1850, buy: 1420, status: 'kelyje',
      docs: [['Vežėjo užsakymas', 'ok'], ['CMR', 'wait'], ['Sąskaita klientui', 'none']],
      events: [
        ['08-03 09:12', 'Užsakymas gautas el. paštu — laukai nuskaityti automatiškai, vadybininkas patvirtino'],
        ['08-03 10:40', 'Vežėjas priskirtas. Draudimas galioja iki 2027-01-19 — patikrinta automatiškai'],
        ['08-04 07:55', 'Pakrauta. Klientui išsiųstas pranešimas be vadybininko'],
        ['08-04 15:02', 'Gauta vežėjo sąskaita — suma nesutampa su sutarta, sustabdyta']
      ]
    },
    {
      id: 'EKS-2026-0417', client: 'UAB „Baltijos chemija"', from: 'Klaipėda, LT', to: 'Hamburg, DE',
      /* Real ADR entry, not a decorative label: UN 1824 = sodium hydroxide solution,
         class 8 (corrosive), packing group II. A forwarder spots a fake one instantly. */
      cargo: 'Natrio šarmo tirpalas, 24 t', mode: 'FTL',
      tags: ['ADR 8 kl.', 'UN 1824', 'II pak. gr.'],
      carrier: 'UAB „Rytas Logistics"', plate: 'MNO 456 / RL 210',
      load: '2026-08-05', unload: '2026-08-08', sell: 2340, buy: 1890, status: 'naujas',
      docs: [['Vežėjo užsakymas', 'wait'], ['CMR', 'none'], ['Sąskaita klientui', 'none']],
      events: [
        ['08-02 16:20', 'Užsakymas gautas per klientų formą — perrašymo nereikėjo'],
        ['08-03 08:05', 'ADR: vežėjo pažymėjimas ir vairuotojo ADR pažyma galioja — patikrinta automatiškai'],
        ['08-03 08:06', 'Į vežimo dokumentą įrašyta: UN 1824, NATRIO HIDROKSIDO TIRPALAS, 8, II']
      ]
    },
    {
      id: 'EKS-2026-0412', client: 'SIA „Riga Foods"', from: 'Rīga, LV', to: 'Kaunas, LT',
      cargo: 'Šaldytas maistas, 19 t', mode: 'FTL', tags: ['Temperatūrinis −18 °C'],
      carrier: 'UAB „AP Transport"', plate: 'PQR 789 / AP 331',
      load: '2026-07-28', unload: '2026-07-29', sell: 1240, buy: 980, status: 'iskrauta',
      docs: [['Vežėjo užsakymas', 'ok'], ['CMR', 'ok'], ['Sąskaita klientui', 'wait']],
      events: [
        ['07-27 11:03', 'Užsakymas patvirtintas'],
        ['07-29 13:41', 'CMR nufotografuotas vairuotojo telefonu — pats prisidėjo prie užsakymo'],
        ['07-30 09:00', 'Priminimas: galima išrašyti sąskaitą, visi dokumentai yra']
      ]
    },
    {
      id: 'EKS-2026-0409', client: 'UAB „Vakarų mediena"', from: 'Šiauliai, LT', to: 'Praha, CZ',
      cargo: 'Pjautinė mediena, 22 t', mode: 'FTL', tags: [],
      carrier: 'UAB „Vėtra Trans"', plate: 'STU 012 / VT 118',
      load: '2026-07-21', unload: '2026-07-24', sell: 1690, buy: 1310, status: 'apmoketa',
      docs: [['Vežėjo užsakymas', 'ok'], ['CMR', 'ok'], ['Sąskaita klientui', 'ok']],
      events: [
        ['07-20 14:12', 'Užsakymas patvirtintas'],
        ['07-24 17:30', 'Iškrauta, dokumentai surinkti'],
        ['08-01 10:15', 'Kliento mokėjimas užfiksuotas automatiškai']
      ]
    },
    {
      id: 'EKS-2026-0405', client: 'Sp. z o.o. „Wisła Trade"', from: 'Gdańsk, PL', to: 'Vilnius, LT',
      cargo: 'Buitinė technika, 12 t', mode: 'LTL', tags: [],
      carrier: 'UAB „Rytas Logistics"', plate: 'VWX 345 / RL 205',
      load: '2026-07-15', unload: '2026-07-17', sell: 980, buy: 810, status: 'apmoketa',
      docs: [['Vežėjo užsakymas', 'ok'], ['CMR', 'ok'], ['Sąskaita klientui', 'ok']],
      events: [
        ['07-14 09:30', 'Užsakymas patvirtintas'],
        ['07-17 12:00', 'Iškrauta'],
        ['07-25 08:40', 'Apmokėta']
      ]
    },
    {
      id: 'EKS-2026-0421', client: 'UAB „Aukštaitijos agro"', from: 'Panevėžys, LT', to: 'Almaty, KZ',
      cargo: 'Grūdų sėklos, 20 t', mode: 'FTL', tags: ['Muitinė', 'CIS'],
      carrier: 'UAB „Step Line"', plate: 'YZA 678 / SL 077',
      load: '2026-08-07', unload: '2026-08-16', sell: 4850, buy: 4120, status: 'naujas',
      docs: [['Vežėjo užsakymas', 'wait'], ['Muitinės deklaracija', 'wait'], ['CMR', 'none']],
      events: [
        ['08-03 12:44', 'Užklausa gauta. Maršrutas su muitine — dokumentų sąrašas sudarytas automatiškai'],
        ['08-03 13:10', 'Priminimas: eksporto deklaracija reikalinga likus 48 val. iki pakrovimo']
      ]
    },
    {
      id: 'EKS-2026-0414', client: 'UAB „Nemuno metalas"', from: 'Kaunas, LT', to: 'Malmö, SE',
      cargo: 'Metalo konstrukcijos, 17 t', mode: 'FTL', tags: ['Keltas'],
      carrier: 'UAB „AP Transport"', plate: 'BCD 901 / AP 340',
      load: '2026-07-30', unload: '2026-08-02', sell: 2190, buy: 1780, status: 'iskrauta',
      docs: [['Vežėjo užsakymas', 'ok'], ['CMR', 'ok'], ['Sąskaita klientui', 'none']],
      events: [
        ['07-29 15:00', 'Užsakymas patvirtintas'],
        ['08-02 11:20', 'Iškrauta, kelto bilietas prisegtas prie užsakymo']
      ]
    }
  ];

  /* Role rules. `only` = sees a single assigned order. */
  var ROLES = {
    vad: { name: 'Vadybininkas', full: 'Vadybininkas (ekspeditorius)',
           client: 1, sell: 1, margin: 1, edit: 1, audit: 0, exp: 0, only: 0,
           bar: 'Pilnas darbas su savo užsakymais: mato kainas ir maržą, gali kurti ir keisti. Nemato veiksmų žurnalo ir negali eksportuoti klientų bazės.' },
    buh: { name: 'Buhalterė', full: 'Buhalterė',
           client: 1, sell: 1, margin: 1, edit: 0, audit: 0, exp: 0, only: 0,
           bar: 'Mato visą finansinę pusę, bet užsakymų keisti negali — kainos ir vežėjai jai užrakinti. Taip išvengiama „pataisiau, kad sutaptų".' },
    vdv: { name: 'Vadovas', full: 'Vadovas',
           client: 1, sell: 1, margin: 1, edit: 1, audit: 1, exp: 1, only: 0,
           bar: 'Mato viską, įskaitant veiksmų žurnalą, ir gali eksportuoti duomenis. Eksportas taip pat patenka į žurnalą — vadovas nėra išimtis.' },
    vez: { name: 'Išorinis vežėjas', full: 'Išorinis vežėjas',
           client: 0, sell: 0, margin: 0, edit: 0, audit: 0, exp: 0, only: CARRIER_ORDER,
           bar: 'Mato TIK jam priskirtą užsakymą ir TIK savo kainą. Kliento pavadinimas, Jūsų pardavimo kaina ir marža jam net nesiunčiami.' }
  };

  var MASK = '••••••';

  /* ── helpers ────────────────────────────────────────────────────────── */

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function eur(n) {
    return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function clock() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function fold(s) {
    return String(s).toLowerCase()
      .replace(/[ąà]/g, 'a').replace(/[čć]/g, 'c').replace(/[ęėé]/g, 'e')
      .replace(/į/g, 'i').replace(/š/g, 's').replace(/[ųū]/g, 'u').replace(/ž/g, 'z');
  }

  /* ── state ──────────────────────────────────────────────────────────── */

  var role = 'vad';
  var filter = '';
  var query = '';
  var audit = [];
  var mailRan = false;

  function can(k) { return !!ROLES[role][k]; }

  function visible() {
    var list = ROLES[role].only
      ? ORDERS.filter(function (o) { return o.id === ROLES[role].only; })
      : ORDERS.slice();
    if (filter) list = list.filter(function (o) { return o.status === filter; });
    if (query) {
      var q = fold(query);
      list = list.filter(function (o) {
        return fold(o.id + ' ' + o.client + ' ' + o.from + ' ' + o.to + ' ' + o.carrier + ' ' + o.cargo).indexOf(q) > -1;
      });
    }
    return list;
  }

  /* ── audit log ──────────────────────────────────────────────────────── */

  function log(what, kind) {
    audit.unshift({ t: clock(), r: ROLES[role].name, w: what, k: kind || '' });
    if (audit.length > 40) audit.pop();
    paintAudit();
  }

  function paintAudit() {
    var cnt = $('auditCnt'), ol = $('alog');
    if (cnt) cnt.textContent = audit.length + (audit.length === 1 ? ' įrašas' : ' įrašai');
    if (!ol) return;
    ol.innerHTML = audit.map(function (a) {
      return '<li class="' + (a.k ? 'al-' + a.k : '') + '"><span class="al-t">' + a.t + '</span>' +
             '<span class="al-r">' + esc(a.r) + '</span>' +
             '<span class="al-w">' + esc(a.w) + '</span>' +
             '<span class="al-i">10.0.0.14</span></li>';
    }).join('') || '<li class="rl-idle">Kol kas tuščia — paspaudinėkite po sistemą ir grįžkite.</li>';
  }

  /* ── views ──────────────────────────────────────────────────────────── */

  var TITLES = { orders: 'Užsakymai', mail: 'Pašto robotas', integr: 'Integracijos', sec: 'Saugumas' };

  function show(v) {
    ['orders', 'mail', 'integr', 'sec'].forEach(function (k) {
      $('v-' + k).hidden = (k !== v);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sn'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-view') === v);
    });
    $('viewTitle').textContent = TITLES[v];
    window.scrollTo(0, 0);
    log('Atidarė skiltį „' + TITLES[v] + '"');
  }

  /* ── orders table ───────────────────────────────────────────────────── */

  function paintKpis() {
    var box = $('kpis'), list = ROLES[role].only
      ? ORDERS.filter(function (o) { return o.id === ROLES[role].only; })
      : ORDERS;

    if (!can('sell')) {
      box.innerHTML = '<div class="kpi kpi-w"><b>' + list.length + '</b><i>Jums priskirti užsakymai</i></div>' +
        '<div class="kpi kpi-l"><b>' + MASK + '</b><i>Pajamos — nerodoma</i></div>' +
        '<div class="kpi kpi-l"><b>' + MASK + '</b><i>Marža — nerodoma</i></div>' +
        '<div class="kpi kpi-l"><b>' + MASK + '</b><i>Marža % — nerodoma</i></div>';
      return;
    }
    var act = list.filter(function (o) { return o.status === 'naujas' || o.status === 'kelyje'; }).length;
    var sell = 0, buy = 0;
    list.forEach(function (o) { sell += o.sell; buy += o.buy; });
    var m = sell - buy;
    box.innerHTML =
      '<div class="kpi"><b>' + act + '</b><i>Aktyvūs užsakymai</i></div>' +
      '<div class="kpi"><b>' + eur(sell) + '</b><i>Pardavimai (rodomi užsakymai)</i></div>' +
      '<div class="kpi"><b>' + eur(m) + '</b><i>Marža</i></div>' +
      '<div class="kpi"><b>' + (sell ? (m / sell * 100).toFixed(1) : '0.0') + ' %</b><i>Maržos dalis</i></div>';
  }

  function paintTable() {
    var list = visible(), tb = $('tbody');
    tb.innerHTML = list.map(function (o) {
      var m = o.sell - o.buy;
      return '<tr tabindex="0" data-id="' + o.id + '">' +
        '<td class="mono">' + esc(o.id) + '</td>' +
        '<td>' + (can('client') ? esc(o.client) : '<span class="mk">' + MASK + '</span>') + '</td>' +
        '<td class="rt">' + esc(o.from) + ' <span aria-hidden="true">→</span> ' + esc(o.to) + '</td>' +
        '<td class="mono">' + esc(o.load) + '</td>' +
        '<td>' + esc(o.carrier) + '</td>' +
        '<td class="r">' + (can('sell') ? eur(o.sell) : '<span class="mk">' + MASK + '</span>') + '</td>' +
        '<td class="r">' + eur(o.buy) + '</td>' +
        '<td class="r">' + (can('margin') ? '<b>' + eur(m) + '</b>' : '<span class="mk">' + MASK + '</span>') + '</td>' +
        '<td><span class="st ' + STATUS[o.status].c + '">' + STATUS[o.status].t + '</span></td>' +
      '</tr>';
    }).join('');
    $('empty').hidden = list.length > 0;
  }

  /* ── order drawer ───────────────────────────────────────────────────── */

  var DOCS = { ok: ['Gauta', 'd-ok'], wait: ['Laukiama', 'd-w'], none: ['Nėra', 'd-n'] };

  /* Carrier order in three languages. Lithuanian forwarders working EU + CIS need
     LT/EN/RU documents as a matter of course — this is a requirement, not decoration. */
  var DOCLANG = {
    lt: { t: 'VEŽIMO UŽSAKYMAS', a: 'Užsakovas', b: 'Vežėjas', c: 'Krovinys', d: 'Pakrovimas',
          e: 'Iškrovimas', f: 'Sutarta kaina (be PVM)', g: 'Mokėjimo terminas',
          h: '45 dienos nuo tvarkingo CMR ir sąskaitos gavimo',
          i: 'Vežėjas patvirtina, kad turi galiojantį vežėjo atsakomybės draudimą ir licenciją.',
          j: 'Užsakovas — ekspeditorius. Galutinio kliento duomenys vežėjui neteikiami.' },
    en: { t: 'TRANSPORT ORDER', a: 'Ordering party', b: 'Carrier', c: 'Cargo', d: 'Loading',
          e: 'Unloading', f: 'Agreed price (excl. VAT)', g: 'Payment term',
          h: '45 days from receipt of a clean CMR and invoice',
          i: 'The carrier confirms it holds valid carrier liability insurance and a licence.',
          j: 'The ordering party is the forwarder. End-client details are not disclosed to the carrier.' },
    ru: { t: 'ЗАКАЗ НА ПЕРЕВОЗКУ', a: 'Заказчик', b: 'Перевозчик', c: 'Груз', d: 'Погрузка',
          e: 'Выгрузка', f: 'Согласованная цена (без НДС)', g: 'Срок оплаты',
          h: '45 дней с момента получения чистого CMR и счёта',
          i: 'Перевозчик подтверждает наличие действующего страхования ответственности и лицензии.',
          j: 'Заказчик — экспедитор. Данные конечного клиента перевозчику не передаются.' }
  };

  function docHtml(o, lang) {
    var L = DOCLANG[lang];
    /* The ordering party is US, not our client — deliberately. The end client's name
       never goes on a carrier order, in any role. */
    return '<div class="doc">' +
      '<p class="doc-t">' + L.t + ' ' + esc(o.id) + '</p>' +
      '<dl class="doc-d">' +
        '<dt>' + L.a + '</dt><dd>' + esc(FORWARDER) + '</dd>' +
        '<dt>' + L.b + '</dt><dd>' + esc(o.carrier) + ' · ' + esc(o.plate) + '</dd>' +
        '<dt>' + L.c + '</dt><dd>' + esc(o.cargo) + '</dd>' +
        '<dt>' + L.d + '</dt><dd>' + esc(o.from) + ' · ' + esc(o.load) + '</dd>' +
        '<dt>' + L.e + '</dt><dd>' + esc(o.to) + ' · ' + esc(o.unload) + '</dd>' +
        '<dt>' + L.f + '</dt><dd><b>' + eur(o.buy) + '</b></dd>' +
        '<dt>' + L.g + '</dt><dd>' + L.h + '</dd>' +
      '</dl>' +
      '<p class="doc-n">' + L.i + '</p>' +
      '<p class="doc-w">' + L.j + '</p>' +
    '</div>';
  }

  function openOrder(id) {
    var o = null, i;
    for (i = 0; i < ORDERS.length; i++) if (ORDERS[i].id === id) o = ORDERS[i];
    if (!o) return;
    if (ROLES[role].only && ROLES[role].only !== id) return;

    var m = o.sell - o.buy;
    $('drKey').textContent = o.id;
    $('drTitle').innerHTML = (can('client') ? esc(o.client) : '<span class="mk">' + MASK + '</span>');

    var money = can('sell')
      ? '<div class="f"><span>Pardavimo kaina</span><b>' + eur(o.sell) + '</b></div>' +
        '<div class="f"><span>Vežėjo kaina</span><b>' + eur(o.buy) + '</b></div>' +
        '<div class="f"><span>Marža</span><b class="pos">' + eur(m) + ' · ' + (m / o.sell * 100).toFixed(1) + ' %</b></div>'
      : '<div class="f"><span>Jūsų kaina</span><b>' + eur(o.buy) + '</b></div>' +
        '<div class="f f-l"><span>Užsakovo kaina</span><b class="mk">' + MASK + '</b></div>' +
        '<div class="f f-l"><span>Marža</span><b class="mk">' + MASK + '</b></div>';

    $('drBody').innerHTML =
      '<div class="dr-tags"><span class="st ' + STATUS[o.status].c + '">' + STATUS[o.status].t + '</span>' +
        '<span class="tg">' + esc(o.mode) + '</span>' +
        o.tags.map(function (t) { return '<span class="tg">' + esc(t) + '</span>'; }).join('') + '</div>' +

      '<div class="fgrid">' +
        '<div class="f"><span>Maršrutas</span><b>' + esc(o.from) + ' → ' + esc(o.to) + '</b></div>' +
        '<div class="f"><span>Krovinys</span><b>' + esc(o.cargo) + '</b></div>' +
        '<div class="f"><span>Pakrovimas</span><b>' + esc(o.load) + '</b></div>' +
        '<div class="f"><span>Iškrovimas</span><b>' + esc(o.unload) + '</b></div>' +
        '<div class="f"><span>Vežėjas</span><b>' + esc(o.carrier) + '</b></div>' +
        '<div class="f"><span>Vilkikas / priekaba</span><b class="mono">' + esc(o.plate) + '</b></div>' +
        money +
      '</div>' +

      (can('edit') ? '' : '<p class="drlock"><span aria-hidden="true">🔒</span> Šiam vaidmeniui užsakymas rodomas tik skaitymui.</p>') +

      '<h3 class="dr-s">Dokumentai</h3>' +
      '<ul class="docs">' + o.docs.map(function (d) {
        return '<li><span>' + esc(d[0]) + '</span><em class="' + DOCS[d[1]][1] + '">' + DOCS[d[1]][0] + '</em></li>';
      }).join('') + '</ul>' +

      '<h3 class="dr-s">Vežėjo užsakymas <i class="dr-si">generuojamas trimis kalbomis</i></h3>' +
      '<div class="langtabs" id="langTabs">' +
        '<button class="lt on" data-l="lt">Lietuvių</button>' +
        '<button class="lt" data-l="en">English</button>' +
        '<button class="lt" data-l="ru">Русский</button>' +
      '</div>' +
      '<div id="docBox">' + docHtml(o, 'lt') + '</div>' +

      '<h3 class="dr-s">Kas vyko su šiuo užsakymu</h3>' +
      '<ol class="tline">' + o.events.map(function (e) {
        return '<li><span class="tl-t mono">' + esc(e[0]) + '</span><span>' + esc(e[1]) + '</span></li>';
      }).join('') + '</ol>';

    $('langTabs').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.lt') : null;
      if (!b) return;
      Array.prototype.forEach.call(this.querySelectorAll('.lt'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      $('docBox').innerHTML = docHtml(o, b.getAttribute('data-l'));
      log('Peržiūrėjo ' + o.id + ' vežimo užsakymą (' + b.textContent + ')');
    });

    $('drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    $('drX').focus();
    log('Atidarė užsakymą ' + o.id);
  }

  function closeDrawer() {
    $('drawer').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── new order ──────────────────────────────────────────────────────── */

  function newMargin() {
    var s = parseFloat($('nSell').value), b = parseFloat($('nBuy').value);
    if (isNaN(s) || isNaN(b)) { $('nMargin').textContent = '—'; $('nMarginP').textContent = ''; return; }
    var m = s - b;
    $('nMargin').textContent = eur(m);
    $('nMargin').className = m < 0 ? 'neg' : 'pos';
    $('nMarginP').textContent = s > 0 ? '(' + (m / s * 100).toFixed(1) + ' %)' + (m < 0 ? ' — nuostolingas!' : '') : '';
  }

  /* ── mail robot ─────────────────────────────────────────────────────── */

  var MAILS = [
    { from: 'sąskaitos@vetra-trans.example', subj: 'Sąskaita faktūra VT Nr. 2026-1187', att: 'SF_VT_2026-1187.pdf' },
    { from: 'finance@ap-transport.example', subj: 'INVOICE 2026/554', att: 'invoice_2026_554.pdf' },
    { from: 'info@degalinesx.example', subj: 'Sąskaita už degalus', att: 'skenas_IMG_4471.jpg' }
  ];

  /* Amounts are compared NET-to-NET on purpose: the agreed carrier price is a net
     figure, and freight VAT is not always 21 % (export-related services can be 0 %),
     so comparing an agreed net price against an invoice gross total is simply wrong. */
  var STEPS = [
    ['📨', 'Naujas laiškas aplanke „Sąskaitos": <b>Sąskaita faktūra VT Nr. 2026-1187</b>', ''],
    ['🔍', 'Priedas atpažintas kaip PDF sąskaita faktūra. Laiškas <b>neatidaromas</b> — skaitomas tik priedas.', ''],
    ['🛡', 'Priedas patikrintas antivirusine ir atidarytas atskiroje, izoliuotoje aplinkoje — kad kenkėjiškas failas nepasiektų sistemos.', ''],
    ['📑', 'Nuskaityti laukai: tiekėjas, PVM kodas, sąskaitos nr., data, mokėjimo terminas, suma be PVM, PVM, suma su PVM, gavėjo IBAN, užsakymo nr.', ''],
    ['🔗', 'Susieta su užsakymu <b>EKS-2026-0418</b> pagal užsakymo numerį dokumente. Dublikatų patikra: tokios sąskaitos dar nebuvo.', ''],
    ['⚖️', 'Patikra <b>be PVM</b>: sutarta <b>1 420,00 €</b>, sąskaitoje <b>1 460,00 €</b> — <b>nesutampa (+40,00 €)</b>.', 'warn'],
    ['⛔', 'Sustabdyta. Užduotis vadybininkui: „Patikrinkite vežėjo sąskaitą EKS-2026-0418". Į apskaitą neperduota.', 'warn'],
    ['📨', 'Naujas laiškas: <b>INVOICE 2026/554</b>', ''],
    ['🔗', 'Susieta su <b>EKS-2026-0412</b>. Be PVM: sutarta 980,00 €, sąskaitoje <b>980,00 €</b> — sutampa. IBAN toks pat kaip ankstesnėse.', ''],
    ['✅', 'Užregistruota prie užsakymo. Paruošta perkelti į <b>Rivilę</b>. Žmogus laiško neatidarė.', 'ok'],
    ['📨', 'Naujas laiškas: <b>Sąskaita už degalus</b> (priedas — nuotrauka)', ''],
    ['🖐', 'Nuskaityti nepavyko: prasta skenavimo kokybė. <b>Nespėliojama.</b> Perduota žmogui su žyma „nenuskaityta".', 'warn'],
    ['📊', 'Ciklas baigtas: 3 laiškai · 1 užregistruotas automatiškai · 2 perduoti žmogui · 0 atidaryta ranka.', 'ok']
  ];

  var CARDS =
    '<div class="card">' +
      '<div class="card-h"><h3>Ką robotas ištraukė</h3><span class="pill pill-i">2 iš 3 laiškų</span></div>' +
      '<div class="xgrid">' +
        '<div class="xc xc-w">' +
          '<div class="xc-h"><b>SF_VT_2026-1187.pdf</b><span class="pill pill-w">Perduota žmogui</span></div>' +
          '<dl class="xd">' +
            '<dt>Tiekėjas</dt><dd>UAB „Vėtra Trans"</dd>' +
            '<dt>PVM kodas</dt><dd>LT100001234515</dd>' +
            '<dt>Sąskaitos nr.</dt><dd>VT 2026-1187</dd>' +
            '<dt>Data</dt><dd>2026-08-04</dd>' +
            '<dt>Mokėti iki</dt><dd>2026-09-18</dd>' +
            '<dt>Suma be PVM</dt><dd><b>1 460,00 €</b></dd>' +
            '<dt>PVM 21 %</dt><dd>306,60 €</dd>' +
            '<dt>Viso su PVM</dt><dd>1 766,60 €</dd>' +
            '<dt>Gavėjo IBAN</dt><dd>LT12 7300 0101 2345 6789</dd>' +
            '<dt>Užsakymas</dt><dd>EKS-2026-0418</dd>' +
          '</dl>' +
          '<p class="xc-n"><b>Neatitikimas:</b> sutarta 1 420,00 € be PVM, sąskaitoje 1 460,00 € be PVM. Skirtumas +40,00 €. Automatiškai nepatvirtinta.</p>' +
        '</div>' +
        '<div class="xc xc-ok">' +
          '<div class="xc-h"><b>invoice_2026_554.pdf</b><span class="pill pill-ok">Užregistruota</span></div>' +
          '<dl class="xd">' +
            '<dt>Tiekėjas</dt><dd>UAB „AP Transport"</dd>' +
            '<dt>PVM kodas</dt><dd>LT100007654321</dd>' +
            '<dt>Sąskaitos nr.</dt><dd>2026/554</dd>' +
            '<dt>Data</dt><dd>2026-07-30</dd>' +
            '<dt>Mokėti iki</dt><dd>2026-09-13</dd>' +
            '<dt>Suma be PVM</dt><dd><b>980,00 €</b></dd>' +
            '<dt>PVM 21 %</dt><dd>205,80 €</dd>' +
            '<dt>Viso su PVM</dt><dd>1 185,80 €</dd>' +
            '<dt>Gavėjo IBAN</dt><dd>LT98 7044 0600 9876 5432</dd>' +
            '<dt>Užsakymas</dt><dd>EKS-2026-0412</dd>' +
          '</dl>' +
          '<p class="xc-n">Sutampa su sutarta kaina (be PVM). Tiekėjas pažįstamas, IBAN nepasikeitęs, dublikatų nerasta. Prisegta prie užsakymo, eilėje į Rivilę.</p>' +
        '</div>' +
      '</div>' +
      '<p class="mini">Tie patys laukai bet kokios formos sąskaitoje — robotas neieško „tos pačios vietos lape", jis ieško prasmės. Kiekvienas neaiškus atvejis keliauja žmogui, o ne spėjamas.</p>' +
    '</div>';

  function paintInbox(readCount) {
    var ul = $('inbox');
    ul.innerHTML = MAILS.map(function (m, i) {
      var done = i < readCount;
      return '<li class="' + (done ? 'mr' : 'mu') + '">' +
        '<span class="m-d" aria-hidden="true">' + (done ? '✓' : '●') + '</span>' +
        '<span class="m-b"><b>' + esc(m.subj) + '</b><i>' + esc(m.from) + '</i>' +
        '<em class="m-a">📎 ' + esc(m.att) + '</em></span></li>';
    }).join('');
    var left = MAILS.length - readCount;
    $('inboxCnt').textContent = left ? left + ' neperskaityti' : 'apdorota';
  }

  function runRobot() {
    if (mailRan) return;
    mailRan = true;
    var btn = $('runBtn');
    btn.disabled = true;
    btn.textContent = 'Vykdoma…';
    $('rlog').innerHTML = '';
    log('Paleido pašto robotą', 'ok');

    var i = 0, seen = 0;
    (function tick() {
      if (i >= STEPS.length) {
        btn.textContent = '↻ Paleisti iš naujo';
        btn.disabled = false;
        mailRan = false;
        $('mailOut').innerHTML = CARDS;
        return;
      }
      var s = STEPS[i];
      var li = document.createElement('li');
      li.className = 'rl' + (s[2] ? ' rl-' + s[2] : '');
      li.innerHTML = '<span class="rl-i" aria-hidden="true">' + s[0] + '</span><span class="rl-x">' + s[1] + '</span>';
      $('rlog').appendChild(li);
      /* each 📨 step opens the NEXT mail, so everything before it is already handled */
      if (s[0] === '📨') { paintInbox(seen); seen++; }
      if (i === STEPS.length - 1) paintInbox(MAILS.length);
      i++;
      setTimeout(tick, 520);
    })();
  }

  /* ── permission matrix ──────────────────────────────────────────────── */

  function paintMatrix() {
    var keys = [['only', 'inv'], ['client', ''], ['sell', ''], ['margin', ''], ['edit', ''], ['audit', ''], ['exp', '']];
    $('mtxBody').innerHTML = Object.keys(ROLES).map(function (k) {
      var R = ROLES[k];
      var cells = keys.map(function (p) {
        var v = p[1] === 'inv' ? (R.only ? 'Tik vienas' : 'Visi') : (R[p[0]] ? '✓' : '—');
        var cls = p[1] === 'inv' ? (R.only ? 'no' : 'yes') : (R[p[0]] ? 'yes' : 'no');
        return '<td class="' + cls + '">' + v + '</td>';
      }).join('');
      return '<tr class="' + (k === role ? 'me' : '') + '"><td><b>' + esc(R.full) + '</b>' +
             (k === role ? '<span class="now">dabar</span>' : '') + '</td>' + cells + '</tr>';
    }).join('');
  }

  /* ── role change ────────────────────────────────────────────────────── */

  function setRole(r) {
    role = r;
    $('roleBar').innerHTML = '<span class="rb-i" aria-hidden="true">' + (can('audit') ? '🗝️' : can('edit') ? '✏️' : '👁️') +
      '</span><span><b>' + esc(ROLES[r].full) + '.</b> ' + ROLES[r].bar + '</span>';
    $('roleBar').className = 'rolebar' + (r === 'vez' ? ' rb-x' : '');
    $('newBtn').disabled = !can('edit');
    $('newBtn').title = can('edit') ? '' : 'Šis vaidmuo negali kurti užsakymų';
    if (!can('edit')) $('newBox').hidden = true;
    $('auditWrap').hidden = !can('audit');
    $('auditLock').hidden = can('audit');
    paintKpis(); paintTable(); paintMatrix();
    closeDrawer();
    log('Pakeitė vaidmenį į „' + ROLES[r].full + '"', 'ok');
  }

  /* ── wiring ─────────────────────────────────────────────────────────── */

  document.querySelector('.snav').addEventListener('click', function (e) {
    var b = e.target.closest('.sn');
    if (b) show(b.getAttribute('data-view'));
  });

  $('roleSel').addEventListener('change', function () { setRole(this.value); });

  /* Searches and filters are logged too — an audit trail that skips "who looked for
     what" is not an audit trail, and the sidebar promises this. */
  var qTimer = null;
  $('q').addEventListener('input', function () {
    query = this.value;
    paintTable();
    clearTimeout(qTimer);
    var v = this.value.trim();
    if (v) qTimer = setTimeout(function () { log('Ieškojo: „' + v + '"'); }, 700);
  });

  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('.fchip');
    if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('.fchip'), function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    filter = b.getAttribute('data-s');
    paintTable();
    log('Filtravo pagal būseną: ' + b.textContent);
  });

  $('tbody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (tr) openOrder(tr.getAttribute('data-id'));
  });
  $('tbody').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr');
    if (tr) { e.preventDefault(); openOrder(tr.getAttribute('data-id')); }
  });

  $('drX').addEventListener('click', closeDrawer);
  $('drBg').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  $('newBtn').addEventListener('click', function () {
    if (!can('edit')) return;
    $('newBox').hidden = !$('newBox').hidden;
    if (!$('newBox').hidden) $('nClient').focus();
  });
  $('newCancel').addEventListener('click', function () { $('newBox').hidden = true; });
  ['nSell', 'nBuy'].forEach(function (id) { $(id).addEventListener('input', newMargin); });

  $('newBox').addEventListener('submit', function (e) {
    e.preventDefault();
    var sell = parseFloat($('nSell').value), buy = parseFloat($('nBuy').value);
    if (isNaN(sell) || isNaN(buy)) return;
    var n = 422 + ORDERS.filter(function (o) { return o.id.indexOf('EKS-2026-04') === 0; }).length;
    var o = {
      id: 'EKS-2026-0' + n, client: $('nClient').value.trim(), from: $('nFrom').value.trim(),
      to: $('nTo').value.trim(), cargo: $('nCargo').value.trim(), mode: 'FTL', tags: ['Naujas įrašas'],
      carrier: '— dar nepriskirtas —', plate: '—', load: '2026-08-10', unload: '2026-08-12',
      sell: sell, buy: buy, status: 'naujas',
      docs: [['Vežėjo užsakymas', 'none'], ['CMR', 'none'], ['Sąskaita klientui', 'none']],
      events: [[clock().slice(0, 5), 'Užsakymas sukurtas rankiniu būdu šiame prototipe']]
    };
    ORDERS.unshift(o);
    this.reset();
    newMargin();
    this.hidden = true;
    filter = ''; query = ''; $('q').value = '';
    Array.prototype.forEach.call($('filters').querySelectorAll('.fchip'), function (x, i) {
      x.classList.toggle('on', i === 0);
    });
    paintKpis(); paintTable();
    log('Sukūrė užsakymą ' + o.id + ' (' + eur(sell - buy) + ' marža)', 'ok');
  });

  $('runBtn').addEventListener('click', runRobot);

  /* ── boot ───────────────────────────────────────────────────────────── */

  paintInbox(0);
  setRole('vad');
  audit = [];
  log('Prisijungė prie sistemos', 'ok');
})();
