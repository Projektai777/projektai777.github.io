/* Projektai777 portfolio - the living background + page behaviour.
   ONE theme since 2026-09-12 (owner: "i choose rezonance style, so hide the theme button"): a grid of points, every
   touch and pointer move drops a soft ripple through it. One 2D canvas, one budget: the frame must stay cheap.
   - devicePixelRatio capped at 1.5; the grid scales with the viewport
   - nothing runs while the tab is hidden; NO half-rate mode - the owner wants it smooth no matter what and the grid is cheap
   - the canvas is sized from its own box (CSS 100lvh on phones), so the mobile address bar showing/hiding no longer
     resizes the buffer, resets the ripples or leaves a blank strip - the two "cuts off on mobile" causes (2026-09-12)
   - ripples survive a resize; the ripple cap never drops a live ripple abruptly
   - prefers-reduced-motion: a settled frame that moves only while the visitor interacts (a frozen canvas read as broken)
   Pointer, touch and scroll all feed the same shared state. */
(function () {
  'use strict';
  var PF = window.PF || {};
  var canvas = document.getElementById('fx');
  var ctx = canvas && canvas.getContext('2d', { alpha: false });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BG = '#070a0d';
  var ACC = [125, 255, 179];
  var ACC2 = [111, 211, 255];

  // ---------- shared state ----------
  var S = {
    w: 0, h: 0, dpr: 1, t: 0,
    px: -1e4, py: -1e4, pActive: false, pvx: 0, pvy: 0, // pointer in CSS px, velocity
    impulses: [],      // {x,y,t0,power} taps / clicks
    wind: 0,           // scroll velocity, decays
    scrollY: 0
  };
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var lastInput = 0;
  function input() { lastInput = performance.now(); }
  function impulse(x, y, power) { S.impulses.push({ x: x, y: y, t0: S.t, power: power || 1 }); if (S.impulses.length > 10) S.impulses.shift(); }

  // ---------- RESONANCE ----------
  // Strength is HALF of the original (owner 2026-09-12: "reduce the strength of the effect 2x"): ripple amplitudes
  // 0.3..1.1 for movement and 1.6 for a tap (were 0.6..2.2 and 3.2), scroll hum halved.
  var MAX_RIPPLES = 24;
  var resonance = {
    ripples: [], lastEmit: 0, hum: 0, sp: 34, cols: 0, rows: 0,
    init: function () {
      // the grid is rebuilt for the new size; the ripples are kept, so a resize never "cuts" the animation
      var sp = S.w < 720 ? 30 : 34; this.sp = sp;
      this.cols = Math.ceil(S.w / sp) + 1; this.rows = Math.ceil(S.h / sp) + 2;
    },
    push: function (x, y, amp, life) {
      var rs = this.ripples;
      // at the cap a NEW ripple is skipped; a live one is never removed, so every ripple finishes its fade
      // (glance 2026-09-12: replacing the most faded one could still cut a ripple with 40 % of its amplitude left)
      if (rs.length >= MAX_RIPPLES) return;
      rs.push({ x: x, y: y, t0: S.t, amp: amp, life: life });
    },
    frame: function () {
      var rs = this.ripples, i, r;
      var speed = Math.hypot(S.pvx, S.pvy);
      if (S.pActive && speed > 0.4 && S.t - this.lastEmit > 6) { this.push(S.px, S.py, clamp(speed * 0.175, 0.3, 1.1), 110); this.lastEmit = S.t; }
      while (S.impulses.length) { var im = S.impulses.shift(); this.push(im.x, im.y, 1.6, 170); }
      for (i = rs.length - 1; i >= 0; i--) if (S.t - rs[i].t0 > rs[i].life) rs.splice(i, 1);
      this.hum += (Math.abs(S.wind) * 0.03 - this.hum) * 0.08;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      var sp = this.sp, hum = this.hum, T = S.t * 0.025;
      for (var cy = 0; cy < this.rows; cy++) for (var cx = 0; cx < this.cols; cx++) {
        var x = cx * sp, y = cy * sp, dz = Math.sin(cx * 0.55 + T) * Math.cos(cy * 0.5 - T * 0.8) * (0.25 + hum);
        var ox = 0, oy = 0;
        for (i = 0; i < rs.length; i++) {
          r = rs[i]; var age = S.t - r.t0, dx = x - r.x, dy = y - r.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          var front = age * 3.2, band = d - front; if (band > 60 || band < -140) continue;
          // the ripple fades in over its first frames and out towards the end of its life: no pop at either end
          var env = clamp(age / 6, 0, 1) * (1 - age / r.life);
          var w = Math.sin(band * 0.09) * Math.exp(-band * band / 4200) * r.amp * env;
          ox += dx / d * w * 6; oy += dy / d * w * 6; dz += w;
        }
        var a = clamp(0.26 + Math.abs(dz) * 0.5, 0.26, 1), rad = 1.3 + Math.abs(dz) * 1.6;
        ctx.fillStyle = dz > 0.25 ? rgba(ACC, a) : dz < -0.25 ? rgba(ACC2, a) : rgba([120, 135, 140], a);
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, 6.283); ctx.fill();
      }
    }
  };
  window.__pf = { S: S, themes: { resonance: resonance } }; // read-only debug handle for tools/portfolio-verify.js

  // ---------- engine ----------
  function resize() {
    // the canvas box (CSS: 100lvh on phones) is the truth, not window.innerHeight, which jumps with the address bar
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (Math.abs(w - S.w) < 2 && Math.abs(h - S.h) < 2 && dpr === S.dpr) return; // nothing really changed
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
      if (reduce && now - lastInput > 1500) { last = now; return; } // reduced motion: still unless interacted with
      var dt = clamp((now - last) / 16.67, 0.2, 2.5); last = now; S.t += dt;
      S.wind *= 0.92; S.pvx *= 0.8; S.pvy *= 0.8;
      for (var i = S.impulses.length - 1; i >= 0; i--) if (S.t - S.impulses[i].t0 > 300) S.impulses.splice(i, 1);
      resonance.frame();
    }
    resize();
    if (reduce) { for (var w0 = 0; w0 < 40; w0++) resonance.frame(); } // settle a still frame to start from
    requestAnimationFrame(function (n) { last = n; loop(n); });
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });

    var hint = document.getElementById('hint'), hinted = false;
    function touched() { input(); if (!hinted && hint) { hinted = true; setTimeout(function () { hint.classList.add('gone'); }, 2500); } }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return; // touchmove below keeps the touch path passive
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

  // ---------- page: reveal on scroll ----------
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });

  // ---------- contact form ----------
  var form = document.getElementById('cform'), msg = document.getElementById('formMsg'), sendBtn = document.getElementById('sendBtn');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var data = {}; new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.page = location.href;
    var L = PF.form || {}; msg.className = 'form-msg mono'; msg.textContent = L.sending || '…'; sendBtn.disabled = true;
    var fail = function () {
      msg.className = 'form-msg mono err';
      var mail = PF.email || ''; var body = encodeURIComponent(data.message + '\n\n' + data.name + ' <' + data.email + '>' + (data.company ? '\n' + data.company : ''));
      msg.innerHTML = ''; msg.appendChild(document.createTextNode((L.err || 'Error.') + ' '));
      var a = document.createElement('a'); a.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Užklausa iš svetainės') + '&body=' + body; a.textContent = mail; msg.appendChild(a);
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
