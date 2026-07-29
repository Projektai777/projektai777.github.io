/* EF grid — page behaviour. No libraries, no build step.
   Handles: EN/LT language switching, CMS hydration, the two carousels the Figma
   design specifies, and the mobile nav. */
(function () {
  'use strict';

  var LANGS = ['en', 'lt'];
  var STORE = 'efgrid_lang';

  // Page-level strings that aren't in the body copy.
  var META = {
    en: {
      title: 'EF grid — Medium & High Voltage Grid Infrastructure',
      desc: 'EF grid specializes in medium and high voltage construction, delivering the infrastructure that connects energy projects to the national grid. Biruliškių g. 8, Kaunas.',
    },
    lt: {
      title: 'EF grid — vidutinės ir aukštos įtampos elektros tinklų infrastruktūra',
      desc: '„EF grid“ specializuojasi vidutinės ir aukštos įtampos statyboje — statome infrastruktūrą, jungiančią energetikos projektus prie nacionalinio elektros tinklo. Biruliškių g. 8, Kaunas.',
    },
  };

  var state = { lang: 'en', text: {}, img: {} };
  var defaults = [];   // [{el, en, lt}] captured before anything is rewritten
  var ariaDefaults = []; // [{el, en, lt}]

  // ---- capture the built-in wording -------------------------------------
  // The element's own text IS the English copy; data-lt carries the Lithuanian.
  // Captured once at boot, because applying a language overwrites textContent.
  function capture() {
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      defaults.push({ el: el, key: el.getAttribute('data-cms'), en: el.textContent, lt: el.getAttribute('data-lt') || null });
    });
    document.querySelectorAll('[data-lt-aria]').forEach(function (el) {
      ariaDefaults.push({ el: el, en: el.getAttribute('aria-label') || '', lt: el.getAttribute('data-lt-aria') });
    });
  }

  function detectLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.indexOf(q) > -1) return q;
    try {
      var saved = localStorage.getItem(STORE);
      if (saved && LANGS.indexOf(saved) > -1) return saved;
    } catch (e) { /* private mode */ }
    // A Lithuanian visitor lands on Lithuanian; everyone else gets the English
    // the design was written in.
    return (navigator.language || '').toLowerCase().indexOf('lt') === 0 ? 'lt' : 'en';
  }

  // ---- apply ------------------------------------------------------------
  function apply() {
    var lang = state.lang;
    var over = state.text[lang] || {};

    defaults.forEach(function (d) {
      var value = over[d.key];
      if (typeof value !== 'string' || !value.trim()) {
        value = lang === 'lt' && d.lt ? d.lt : d.en;
      }
      d.el.textContent = value;
      // keep mailto:/tel: in step with the visible contact details
      if (d.el.tagName === 'A' && (d.key === 'foot.email' || d.key === 'foot.phone')) {
        d.el.href = (d.key === 'foot.email' ? 'mailto:' : 'tel:') + value.replace(/\s+/g, '');
      }
    });

    ariaDefaults.forEach(function (a) {
      a.el.setAttribute('aria-label', lang === 'lt' ? a.lt : a.en);
    });

    Object.keys(state.img).forEach(function (key) {
      var url = state.img[key];
      if (typeof url !== 'string' || !url) return;
      document.querySelectorAll('[data-cms-img="' + CSS.escape(key) + '"]').forEach(function (el) { el.src = url; });
      document.querySelectorAll('[data-cms-bg="' + CSS.escape(key) + '"]').forEach(function (el) {
        el.style.setProperty('--bg', 'url("' + url + '")');
      });
    });

    document.documentElement.lang = lang;
    document.title = META[lang].title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', META[lang].desc);

    document.querySelectorAll('.lang [data-lang]').forEach(function (btn) {
      var on = btn.getAttribute('data-lang') === lang;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-on', on);
    });
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0 || lang === state.lang) return;
    state.lang = lang;
    try { localStorage.setItem(STORE, lang); } catch (e) { /* private mode */ }
    var url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    apply();
  }

  // ---- CMS hydration ----------------------------------------------------
  // The page already contains the real content in both languages; this only
  // layers the client's edits on top. If the Worker is down, slow or blocked,
  // the page is unchanged and fully readable — never load-bearing.
  function hydrate() {
    fetch('./cms-endpoint.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg || !cfg.enabled || !cfg.base) return null;
        return fetch(cfg.base.replace(/\/$/, '') + '/content').then(function (r) { return r.ok ? r.json() : null; });
      })
      .then(function (content) {
        if (!content) return;
        var text = content.text || {};
        // Tolerate the pre-i18n shape, where text was a flat map of English keys.
        var looksFlat = !text.en && !text.lt && Object.keys(text).length > 0;
        state.text = looksFlat ? { en: text } : text;
        state.img = content.img || {};
        apply();
      })
      .catch(function () { /* offline or blocked — built-in wording stands */ });
  }

  // ---- boot -------------------------------------------------------------
  capture();
  state.lang = detectLang();
  apply();      // instant, from the wording already in the page
  hydrate();    // then layer the client's edits

  document.querySelectorAll('.lang [data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
  });

  // ---- mobile nav -------------------------------------------------------
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- carousels --------------------------------------------------------
  function step(track) {
    var first = track.children[0];
    if (!first) return 0;
    var styles = getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function maxShift(track) {
    return Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
  }

  var offsets = {};

  function place(track) {
    var id = track.id;
    track.style.transform = 'translateX(' + -offsets[id] + 'px)';
    document.querySelectorAll('[data-track="' + id + '"]').forEach(function (btn) {
      var dir = Number(btn.dataset.dir);
      btn.disabled = dir < 0 ? offsets[id] <= 0 : offsets[id] >= maxShift(track) - 1;
    });
  }

  document.querySelectorAll('[data-track]').forEach(function (btn) {
    var track = document.getElementById(btn.dataset.track);
    if (!track) return;
    if (!(track.id in offsets)) offsets[track.id] = 0;
    btn.addEventListener('click', function () {
      var next = offsets[track.id] + Number(btn.dataset.dir) * step(track);
      offsets[track.id] = Math.min(Math.max(0, next), maxShift(track));
      place(track);
    });
  });

  Object.keys(offsets).forEach(function (id) {
    var track = document.getElementById(id);
    if (track) {
      track.style.transition = 'transform .45s cubic-bezier(.4,0,.2,1)';
      place(track);
    }
  });

  window.addEventListener('resize', function () {
    Object.keys(offsets).forEach(function (id) {
      var track = document.getElementById(id);
      if (!track) return;
      offsets[id] = Math.min(offsets[id], maxShift(track));
      place(track);
    });
  });

  // ---- nav: mark the section you are in ---------------------------------
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var targets = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (targets.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }
})();
