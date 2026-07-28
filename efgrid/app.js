/* EF grid — page behaviour. No libraries, no build step. */
(function () {
  'use strict';

  // ---- style variants -------------------------------------------------
  // Order matters: it is also the order used in the ?style=... share link.
  var CATS = ['btn', 'card', 'reveal', 'link', 'head', 'tick', 'img', 'nav', 'arrow', 'accent'];
  var KEY = 'efgrid_style';

  function readStyle() {
    var out = null;
    var q = new URLSearchParams(location.search).get('style');
    if (q) {
      var p = q.split(/[,\-]/).map(Number);
      if (p.length === CATS.length && p.every(function (n) { return n >= 1 && n <= 10; })) {
        out = {}; CATS.forEach(function (c, i) { out[c] = p[i]; });
      }
    }
    if (!out) { try { out = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { out = null; } }
    return out;
  }
  function applyStyle(s) {
    if (!s) return;
    CATS.forEach(function (c) { if (s[c]) document.documentElement.setAttribute('data-' + c, s[c]); });
  }
  applyStyle(readStyle());
  window.EFGRID = { CATS: CATS, KEY: KEY, apply: applyStyle };

  // The style picker (stiliai.html) loads this file too, only for EFGRID above.
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger'), menu = document.getElementById('menu');
  if (!nav || !burger || !menu) return;

  // ---- sticky header --------------------------------------------------
  var last = 0;
  addEventListener('scroll', function () {
    var y = pageYOffset;
    nav.classList.toggle('stuck', y > 40);
    nav.classList.toggle('down', y > 320 && y > last);
    last = y;
  }, { passive: true });

  // ---- mobile menu ----------------------------------------------------
  function closeMenu() {
    menu.classList.remove('open'); nav.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });

  // ---- reveal on scroll ----------------------------------------------
  // Deliberately NOT IntersectionObserver: the clip-path reveal variant sets a
  // clip on the element itself, which makes Chrome report a zero intersection
  // rect — the section would then never appear. getBoundingClientRect ignores
  // clipping, so every variant behaves the same.
  var els = [].slice.call(document.querySelectorAll('.reveal'));
  els.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; });
  function reveal() {
    var h = innerHeight, pending = 0;
    els.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < h * .88 && r.bottom > 0) el.classList.add('in'); else pending++;
    });
    if (!pending) removeEventListener('scroll', reveal);
  }
  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', reveal);
  addEventListener('load', reveal);
  reveal();

  // ---- carousels ------------------------------------------------------
  document.querySelectorAll('.arrows').forEach(function (box) {
    var rail = document.getElementById(box.dataset.rail);
    box.querySelectorAll('.arr').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = rail.firstElementChild;
        var step = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * .8;
        rail.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
      });
    });
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 4;
      box.querySelector('[data-dir="-1"]').disabled = rail.scrollLeft <= 4;
      box.querySelector('[data-dir="1"]').disabled = rail.scrollLeft >= max;
      box.querySelectorAll('.arr').forEach(function (b) { b.style.opacity = b.disabled ? .35 : 1; });
    }
    rail.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  });

  // ---- contact form (no backend — opens the visitor's mail client) ----
  var f = document.getElementById('cform');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(f);
    location.href = 'mailto:info@efgrid.com?subject=' +
      encodeURIComponent('Inquiry — ' + (d.get('name') || '')) +
      '&body=' + encodeURIComponent(d.get('msg') + '\n\n' + d.get('name') + '\n' + d.get('email'));
  });

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
