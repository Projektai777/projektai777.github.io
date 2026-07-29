/* EF grid — page behaviour. No libraries, no build step.
   The Figma design contains arrow controls on the Sectors and Projects blocks;
   this wires them up and handles the mobile nav. Plus CMS hydration. */
(function () {
  'use strict';

  // ---- CMS hydration ----------------------------------------------------
  // The page already contains the real content; this only layers the client's
  // edits on top. If the Worker is down, slow or blocked, the page is unchanged
  // and fully readable — the CMS is never load-bearing.
  (function hydrate() {
    fetch('./cms-endpoint.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg || !cfg.enabled || !cfg.base) return null;
        return fetch(cfg.base.replace(/\/$/, '') + '/content').then(function (r) {
          return r.ok ? r.json() : null;
        });
      })
      .then(function (content) {
        if (!content) return;
        var text = content.text || {};
        var img = content.img || {};

        Object.keys(text).forEach(function (key) {
          var value = text[key];
          if (typeof value !== 'string' || !value.trim()) return;
          document.querySelectorAll('[data-cms="' + CSS.escape(key) + '"]').forEach(function (el) {
            el.textContent = value;
            // keep mailto:/tel: in step with the visible contact details
            if (el.tagName === 'A' && /^foot\.(email|phone)$/.test(key)) {
              el.href = (key === 'foot.email' ? 'mailto:' : 'tel:') + value.replace(/\s+/g, '');
            }
          });
        });

        Object.keys(img).forEach(function (key) {
          var url = img[key];
          if (typeof url !== 'string' || !url) return;
          document.querySelectorAll('[data-cms-img="' + CSS.escape(key) + '"]').forEach(function (el) {
            el.src = url;
          });
          document.querySelectorAll('[data-cms-bg="' + CSS.escape(key) + '"]').forEach(function (el) {
            el.style.setProperty('--bg', 'url("' + url + '")');
          });
        });
      })
      .catch(function () { /* offline or blocked — defaults stand */ });
  })();

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
  // Each arrow points at a track by id and shifts it by one item width.
  function step(track) {
    var first = track.children[0];
    if (!first) return 0;
    var styles = getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function maxShift(track) {
    // how far the track can move before its last item is flush with the viewport edge
    var overflow = track.scrollWidth - track.parentElement.clientWidth;
    return Math.max(0, overflow);
  }

  var offsets = {};

  function apply(track) {
    var id = track.id;
    track.style.transform = 'translateX(' + -offsets[id] + 'px)';
    document.querySelectorAll('[data-track="' + id + '"]').forEach(function (btn) {
      var dir = Number(btn.dataset.dir);
      var atStart = offsets[id] <= 0;
      var atEnd = offsets[id] >= maxShift(track) - 1;
      btn.disabled = dir < 0 ? atStart : atEnd;
    });
  }

  document.querySelectorAll('[data-track]').forEach(function (btn) {
    var track = document.getElementById(btn.dataset.track);
    if (!track) return;
    if (!(track.id in offsets)) offsets[track.id] = 0;

    btn.addEventListener('click', function () {
      var dir = Number(btn.dataset.dir);
      var next = offsets[track.id] + dir * step(track);
      offsets[track.id] = Math.min(Math.max(0, next), maxShift(track));
      apply(track);
    });
  });

  Object.keys(offsets).forEach(function (id) {
    var track = document.getElementById(id);
    if (track) {
      track.style.transition = 'transform .45s cubic-bezier(.4,0,.2,1)';
      apply(track);
    }
  });

  window.addEventListener('resize', function () {
    Object.keys(offsets).forEach(function (id) {
      var track = document.getElementById(id);
      if (!track) return;
      offsets[id] = Math.min(offsets[id], maxShift(track));
      apply(track);
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
