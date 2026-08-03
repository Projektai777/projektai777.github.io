/* Atliktų darbų puslapis: filtrai, objekto langas, užklausos forma.
   Viskas veikia naršyklėje — demonstracinėje versijoje niekas niekur nesiunčiama.
   Užklausos gula į localStorage, kad jas būtų galima pamatyti admin.html skydelyje. */
(function () {
  'use strict';

  var LS_REQ = 'santekai_demo_uzklausos';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var catName = function (id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i].name;
    return id;
  };
  // Kortelės ženkliukui — pirma objekto sritis, bet ne bendrinis „Visi".
  var primaryCat = function (p) { return catName(p.cats[0]); };

  /* ---------------- filtrai + tinklelis ---------------- */
  var active = 'visi';

  function cover(p, cls) {
    if (p.photo) {
      return '<img src="' + p.photo + '" alt="' + esc(p.title) + '" loading="lazy" width="640" height="400">' +
        (p.photoReal ? '' : '<span class="photo-note">Pavyzdinė nuotrauka</span>');
    }
    return coverSvg(p.cover || 'default') + '<span class="photo-note">Vieta Jūsų nuotraukai</span>';
  }

  function renderFilters() {
    $('filters').innerHTML = CATS.map(function (c) {
      var n = c.id === 'visi' ? PROJECTS.length : PROJECTS.filter(function (p) { return p.cats.indexOf(c.id) > -1; }).length;
      if (!n) return '';
      return '<button role="tab" data-cat="' + c.id + '" aria-selected="' + (c.id === active) + '">' +
        esc(c.name) + ' <b style="font-weight:400;opacity:.65">(' + n + ')</b></button>';
    }).join('');
  }

  function renderGrid() {
    var list = active === 'visi' ? PROJECTS : PROJECTS.filter(function (p) { return p.cats.indexOf(active) > -1; });
    $('empty').hidden = list.length > 0;
    $('grid').innerHTML = list.map(function (p) {
      return '<button class="card" data-id="' + p.id + '">' +
        '<div class="card-img"><span class="chip">' + esc(primaryCat(p)) + '</span>' + cover(p) + '</div>' +
        '<div class="card-body">' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="meta">' + esc(p.place) + ' · ' + p.year + ' · ' + esc(p.duration) + '</p>' +
          '<p class="sum">' + esc(p.summary) + '</p>' +
          '<div class="tags">' + p.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<span class="more">Peržiūrėti objektą →</span>' +
        '</div></button>';
    }).join('');
  }

  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cat]');
    if (!b) return;
    active = b.dataset.cat;
    renderFilters();
    renderGrid();
  });

  /* ---------------- objekto langas ---------------- */
  var lastFocus = null;

  function openProject(id) {
    var p = null;
    for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) p = PROJECTS[i];
    if (!p) return;
    lastFocus = document.activeElement;
    $('modalBody').innerHTML =
      '<div class="m-img">' + cover(p) + '</div>' +
      '<div class="m-body">' +
        '<h3 id="mTitle">' + esc(p.title) + '</h3>' +
        '<p class="meta">' + esc(primaryCat(p)) + ' · ' + esc(p.place) + '</p>' +
        '<div class="facts">' +
          '<div><span>Objektas</span><b>' + esc(p.object) + '</b></div>' +
          '<div><span>Vieta</span><b>' + esc(p.place) + '</b></div>' +
          '<div><span>Metai</span><b>' + p.year + '</b></div>' +
          '<div><span>Trukmė</span><b>' + esc(p.duration) + '</b></div>' +
        '</div>' +
        '<h4>Kas buvo padaryta</h4>' +
        '<ul>' + p.works.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
        '<div class="result"><b>Rezultatas.</b> ' + esc(p.result) + '</div>' +
        '<div class="m-cta">' +
          '<a class="btn" href="#uzklausa" data-close data-obj="' + esc(p.title) + '">Noriu panašaus sprendimo</a>' +
          '<a class="btn ghost" href="tel:+37060708355">📞 Skambinti</a>' +
        '</div>' +
      '</div>';
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('x').focus();
  }

  function closeModal() {
    $('modal').hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  $('grid').addEventListener('click', function (e) {
    var c = e.target.closest('.card');
    if (c) openProject(c.dataset.id);
  });
  $('x').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (e) {
    if (e.target === $('modal')) return closeModal();
    var a = e.target.closest('[data-close]');
    if (a) {
      // Iš objekto lango einant į formą — iškart parenkame tą objekto tipą.
      var sel = $('objektas');
      var want = a.dataset.obj;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === want) { sel.selectedIndex = i; break; }
      }
      closeModal();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('modal').hidden) closeModal();
  });

  /* ---------------- forma ---------------- */
  var photos = [];

  function fillObjektas() {
    var opts = ['<option value="">— pasirinkite —</option>'];
    var seen = {};
    PROJECTS.forEach(function (p) {
      if (!seen[p.title]) { seen[p.title] = 1; opts.push('<option>' + esc(p.title) + '</option>'); }
    });
    opts.push('<option>Kita — aprašysiu žinutėje</option>');
    $('objektas').innerHTML = opts.join('');
  }

  function drawThumbs() {
    $('thumbs').innerHTML = photos.map(function (p, i) {
      return '<div class="thumb"><img src="' + p.url + '" alt="' + esc(p.name) + '">' +
        '<button type="button" data-i="' + i + '" aria-label="Pašalinti">×</button></div>';
    }).join('');
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return /^image\//.test(f.type); });
    files.slice(0, 8 - photos.length).forEach(function (f) {
      photos.push({ name: f.name, url: URL.createObjectURL(f) });
    });
    drawThumbs();
  }

  $('thumbs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b) return;
    URL.revokeObjectURL(photos[b.dataset.i].url);
    photos.splice(+b.dataset.i, 1);
    drawThumbs();
  });

  $('drop').addEventListener('click', function () { $('files').click(); });
  $('files').addEventListener('change', function (e) { addFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.remove('over'); });
  });
  $('drop').addEventListener('drop', function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

  // Lietuviškas telefonas: +3706xxxxxxx, 86xxxxxxx, 6xxxxxxx — tikriname skaitmenų kiekį, ne formatą.
  function phoneOk(v) {
    var d = v.replace(/\D/g, '');
    return d.length >= 8 && d.length <= 12;
  }

  function ref() {
    var n = Math.floor(1000 + Math.random() * 9000);
    return 'SAN-' + n;
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var v = {
      vardas: f.vardas.value.trim(),
      telefonas: f.telefonas.value.trim(),
      pastas: f.pastas.value.trim(),
      objektas: f.objektas.value,
      zinute: f.zinute.value.trim(),
    };
    var problem = '';
    if (v.vardas.length < 2) problem = 'Įrašykite vardą.';
    else if (!phoneOk(v.telefonas)) problem = 'Patikrinkite telefono numerį.';
    else if (v.zinute.length < 10) problem = 'Trumpai aprašykite, ką reikia padaryti.';
    if (problem) {
      $('err').textContent = problem;
      $('err').hidden = false;
      return;
    }
    $('err').hidden = true;

    var nr = ref();
    var all = [];
    try { all = JSON.parse(localStorage.getItem(LS_REQ) || '[]'); } catch (_) { all = []; }
    all.unshift({
      nr: nr, at: new Date().toISOString(), vardas: v.vardas, telefonas: v.telefonas,
      pastas: v.pastas, objektas: v.objektas, zinute: v.zinute, nuotraukos: photos.length,
    });
    try { localStorage.setItem(LS_REQ, JSON.stringify(all.slice(0, 50))); } catch (_) {}

    $('ref').textContent = nr;
    f.hidden = true;
    $('done').hidden = false;
    $('done').scrollIntoView({ block: 'center' });
  });

  $('again').addEventListener('click', function () {
    photos.forEach(function (p) { URL.revokeObjectURL(p.url); });
    photos = [];
    drawThumbs();
    $('form').reset();
    $('form').hidden = false;
    $('done').hidden = true;
    $('form').scrollIntoView({ block: 'center' });
  });

  /* ---------------- meniu telefone ---------------- */
  $('burger').addEventListener('click', function () {
    var open = $('navLinks').classList.toggle('open');
    $('burger').setAttribute('aria-expanded', String(open));
  });
  $('navLinks').addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      $('navLinks').classList.remove('open');
      $('burger').setAttribute('aria-expanded', 'false');
    }
  });

  renderFilters();
  renderGrid();
  fillObjektas();
})();
