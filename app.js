(function () {
  'use strict';
  var PF = window.PF || {};
  var canvas = document.getElementById('fx');
  var ctx = canvas && canvas.getContext('2d', { alpha: false });
  var BG = '#070a0d';
  var ACC = [125, 255, 179];
  var ACC2 = [111, 211, 255];
  var GREY = [120, 135, 140];
  function mix(c, d, k) { return [Math.round(c[0] + (d[0] - c[0]) * k), Math.round(c[1] + (d[1] - c[1]) * k), Math.round(c[2] + (d[2] - c[2]) * k)]; }
  var ACC_SOFT = mix(ACC, GREY, 0.5), ACC2_SOFT = mix(ACC2, GREY, 0.5);

  var S = {
    w: 0, h: 0, dpr: 1, t: 0,
    px: -1e4, py: -1e4, pActive: false, pvx: 0, pvy: 0,
    impulses: [],
    wind: 0,
    scrollY: 0
  };
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var lastInput = 0;
  function input() { lastInput = performance.now(); }
  function impulse(x, y, power) { S.impulses.push({ x: x, y: y, t0: S.t, power: power || 1 }); if (S.impulses.length > 10) S.impulses.shift(); }

  var MAX_RIPPLES = 24;
  var resonance = {
    ripples: [], lastEmit: 0, hum: 0, sp: 34, cols: 0, rows: 0,
    init: function () {
      var sp = S.w < 720 ? 30 : 34; this.sp = sp;
      this.cols = Math.ceil(S.w / sp) + 1; this.rows = Math.ceil(S.h / sp) + 2;
    },
    push: function (x, y, amp, life) {
      var rs = this.ripples;
      if (rs.length >= MAX_RIPPLES) return;
      rs.push({ x: x, y: y, t0: S.t, amp: amp, life: life });
    },
    frame: function () {
      var rs = this.ripples, i, r;
      var speed = Math.hypot(S.pvx, S.pvy);
      if (S.pActive && speed > 0.4 && S.t - this.lastEmit > 6) { this.push(S.px, S.py, clamp(speed * 0.0875, 0.15, 0.55), 110); this.lastEmit = S.t; }
      while (S.impulses.length) { var im = S.impulses.shift(); this.push(im.x, im.y, 0.8, 170); }
      for (i = rs.length - 1; i >= 0; i--) if (S.t - rs[i].t0 > rs[i].life) rs.splice(i, 1);
      this.hum += (Math.abs(S.wind) * 0.015 - this.hum) * 0.08;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      var sp = this.sp, hum = this.hum, T = S.t * 0.025;
      for (var cy = 0; cy < this.rows; cy++) for (var cx = 0; cx < this.cols; cx++) {
        var x = cx * sp, y = cy * sp, dz = Math.sin(cx * 0.55 + T) * Math.cos(cy * 0.5 - T * 0.8) * (0.25 + hum);
        var ox = 0, oy = 0;
        for (i = 0; i < rs.length; i++) {
          r = rs[i]; var age = S.t - r.t0, dx = x - r.x, dy = y - r.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          var front = age * 3.2, band = d - front; if (band > 60 || band < -140) continue;
          var env = clamp(age / 6, 0, 1) * (1 - age / r.life);
          var w = Math.sin(band * 0.09) * Math.exp(-band * band / 4200) * r.amp * env;
          ox += dx / d * w * 6; oy += dy / d * w * 6; dz += w;
        }
        var a = clamp(0.26 + Math.abs(dz) * 0.5, 0.26, 1), rad = 1.3 + Math.abs(dz) * 1.6;
        ctx.fillStyle = dz > 0.4 ? rgba(ACC_SOFT, a) : dz < -0.4 ? rgba(ACC2_SOFT, a) : rgba(GREY, a);
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, 6.283); ctx.fill();
      }
    }
  };
  window.__pf = { S: S, themes: { resonance: resonance } };

  function resize() {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (Math.abs(w - S.w) < 2 && Math.abs(h - S.h) < 2 && dpr === S.dpr) return;
    S.w = w; S.h = h; S.dpr = dpr;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resonance.init();
  }

  if (ctx) {
    var last = 0, resizeT = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      var dt = clamp((now - last) / 16.67, 0.2, 2.5); last = now; S.t += dt;
      S.wind *= 0.92; S.pvx *= 0.8; S.pvy *= 0.8;
      for (var i = S.impulses.length - 1; i >= 0; i--) if (S.t - S.impulses[i].t0 > 300) S.impulses.splice(i, 1);
      resonance.frame();
    }
    resize();
    requestAnimationFrame(function (n) { last = n; loop(n); });
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });

    var hint = document.getElementById('hint'), hinted = false;
    function touched() { input(); if (!hinted && hint) { hinted = true; setTimeout(function () { hint.classList.add('gone'); }, 2500); } }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      S.pvx = e.clientX - S.px; S.pvy = e.clientY - S.py; if (Math.abs(S.pvx) > 200) { S.pvx = 0; S.pvy = 0; }
      S.px = e.clientX; S.py = e.clientY; S.pActive = true; touched();
    }, { passive: true });
    window.addEventListener('pointerleave', function () { S.pActive = false; });
    document.addEventListener('mouseleave', function () { S.pActive = false; });
    window.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('a,button,input,textarea,label,summary,select')) return;
      S.px = e.clientX; S.py = e.clientY; S.pActive = true; impulse(e.clientX, e.clientY, 1); touched();
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = e.touches[0]; if (!t) return; S.pvx = t.clientX - S.px; S.pvy = t.clientY - S.py; if (Math.abs(S.pvx) > 200) { S.pvx = 0; S.pvy = 0; }
      S.px = t.clientX; S.py = t.clientY; S.pActive = true; touched();
    }, { passive: true });
    window.addEventListener('touchend', function () { setTimeout(function () { S.pActive = false; }, 900); }, { passive: true });
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY; S.wind = clamp(S.wind + (y - lastY) * 0.05, -12, 12); lastY = y; S.scrollY = y; touched();
    }, { passive: true });
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.lm-list a[hreflang], .langs a[hreflang]') : null;
    if (a) { try { localStorage.setItem('pf-lang', a.getAttribute('hreflang')); } catch (err) {  } }
  });
  (function () {
    var lm = document.getElementById('lm'), btn = document.getElementById('lm-btn'), list = document.getElementById('lm-list');
    if (!lm || !btn || !list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('a'));
    function isOpen() { return lm.classList.contains('open'); }
    function setOpen(o, back) {
      lm.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (!o && back) btn.focus();
    }
    function focusItem(i) { if (items.length) items[(i + items.length) % items.length].focus(); }
    function currentIndex() { for (var i = 0; i < items.length; i++) if (items[i].getAttribute('aria-current') === 'page') return i; return 0; }
    btn.addEventListener('click', function (e) {
      var o = !isOpen(); setOpen(o);
      if (o && e.detail === 0) focusItem(currentIndex());
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); focusItem(e.key === 'ArrowDown' ? currentIndex() : items.length - 1); }
    });
    list.addEventListener('keydown', function (e) {
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
      else if (e.key === 'End') { e.preventDefault(); focusItem(items.length - 1); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); setOpen(false, true); } });
    document.addEventListener('click', function (e) { if (isOpen() && !lm.contains(e.target)) setOpen(false); });
    list.addEventListener('click', function () { setOpen(false); });
    lm.addEventListener('focusout', function (e) { if (isOpen() && e.relatedTarget && !lm.contains(e.relatedTarget)) setOpen(false); });
  })();

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });

  (function () {
    var rails = document.querySelectorAll('.rail'), root = document.documentElement, W = PF.work || {};
    if (!rails.length) return;
    try { if (localStorage.getItem('pf-swiped')) root.classList.add('pf-swiped'); } catch (e) {  }
    function tried() {
      if (root.classList.contains('pf-swiped')) return;
      root.classList.add('pf-swiped');
      try { localStorage.setItem('pf-swiped', '1'); } catch (e) {  }
    }
    var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    Array.prototype.forEach.call(rails, function (rail) {
      var row = rail.querySelector('.cards');
      if (!row) return;
      function step(d) {
        var c = row.querySelector('.card'), gap = parseFloat(getComputedStyle(row).columnGap) || 0;
        row.scrollBy({ left: d * ((c ? c.offsetWidth : row.clientWidth * 0.8) + gap), behavior: 'smooth' });
      }
      ['prev', 'next'].forEach(function (dir) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'rail-btn ' + dir; b.innerHTML = ARROW;
        b.setAttribute('aria-label', W[dir] || ''); b.setAttribute('aria-controls', row.id);
        b.addEventListener('click', function (e) { tried(); kb = e.detail === 0 ? b : null; step(dir === 'next' ? 1 : -1); });
        rail.appendChild(b);
      });
      var x0 = row.scrollLeft, kb = null;
      function update() {
        var max = row.scrollWidth - row.clientWidth;
        rail.classList.toggle('more-l', row.scrollLeft > 2);
        rail.classList.toggle('more-r', row.scrollLeft < max - 2);
        if (max > 2) row.setAttribute('tabindex', '0'); else row.removeAttribute('tabindex');
        var f = document.activeElement;
        if (f && f.parentNode === rail && f.classList.contains('rail-btn') && getComputedStyle(f).display === 'none') row.focus({ preventScroll: true });
        else if (kb && (!f || f === document.body || f === kb) && getComputedStyle(kb).display === 'none') { kb = null; row.focus({ preventScroll: true }); }
      }
      row.addEventListener('scroll', function () { if (Math.abs(row.scrollLeft - x0) > 8) tried(); update(); }, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(update).observe(row); else window.addEventListener('resize', update);
      update();
    });
  })();

  var form = document.getElementById('cform'), msg = document.getElementById('formMsg'), sendBtn = document.getElementById('sendBtn');
  if (form && sendBtn) sendBtn.disabled = false;

  var msgrLink = document.querySelector('#formMsgr a[data-desk]');
  if (msgrLink && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) msgrLink.href = msgrLink.getAttribute('data-desk');

  var taWrap = document.getElementById('taWrap'), phCycle = document.getElementById('phCycle');
  var ta = form && form.querySelector('textarea[name=message]');
  var examples = ((PF.form || {}).examples || []).filter(function (x) { return typeof x === 'string' && x; });
  if (taWrap && phCycle && ta && examples.length) {
    var exI = 0, EX_SHOW = 4600, EX_FADE = 650;
    var filled = function () { taWrap.classList.toggle('has-text', ta.value.length > 0); };
    phCycle.textContent = examples[0];
    taWrap.classList.add('cycling'); filled();
    requestAnimationFrame(function () { phCycle.classList.add('on'); });
    var nextExample = function () {
      setTimeout(function () {
        if (document.hidden || ta.value.length > 0) return nextExample();
        phCycle.classList.remove('on');
        setTimeout(function () {
          exI = (exI + 1) % examples.length; phCycle.textContent = examples[exI]; phCycle.classList.add('on'); nextExample();
        }, EX_FADE);
      }, EX_SHOW);
    };
    if (examples.length > 1) nextExample();
    ta.addEventListener('input', filled);
    form.addEventListener('reset', function () { setTimeout(filled, 0); });
    window.addEventListener('pageshow', filled);
  }

  function openFaq() {
    var d = /^#faq-\d+$/.test(location.hash) && document.getElementById(location.hash.slice(1));
    if (d && d.tagName === 'DETAILS') d.open = true;
  }
  openFaq();
  window.addEventListener('hashchange', openFaq);

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var data = {}; new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.page = location.href;
    var L = PF.form || {}; msg.className = 'form-msg mono'; msg.textContent = L.sending || '…'; sendBtn.disabled = true;
    var fail = function () {
      msg.className = 'form-msg mono err';
      var picks = []; ['website', 'crm', 'automation', 'ai_tools', 'ai', 'ads', 'gbp', 'leads'].forEach(function (k) { var v = data['interest_' + k]; if (v) picks.push(v.slice(0, 60)); });
      var mail = PF.email || ''; var body = encodeURIComponent(data.message + (picks.length ? '\n\n' + (L.picks || 'Domina') + ': ' + picks.join(', ') : '') + '\n\n' + data.name + ' <' + data.email + '>' + (data.company ? '\n' + data.company : ''));
      msg.innerHTML = ''; msg.appendChild(document.createTextNode((L.err || 'Error.') + ' '));
      var a = document.createElement('a'); a.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(L.subject || 'Užklausa iš svetainės') + '&body=' + body; a.textContent = mail; msg.appendChild(a);
      sendBtn.disabled = false;
    };
    if (!PF.contact) return fail();
    var ctl = 'AbortController' in window ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, 12000);
    fetch(PF.contact, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: ctl && ctl.signal })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j && j.ok ? j : Promise.reject(j); }); })
      .then(function () { if (timer) clearTimeout(timer); msg.className = 'form-msg mono'; msg.textContent = L.ok || 'OK'; form.reset(); sendBtn.disabled = false; })
      .catch(function () { if (timer) clearTimeout(timer); fail(); });
  });
})();
