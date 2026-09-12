/* Projektai777 portfolio - the living background + page behaviour.
   One 2D canvas, six interchangeable themes, one budget: the frame must stay cheap.
   - devicePixelRatio capped at 1.5, particle counts scale with viewport area and are capped
   - nothing runs while the tab is hidden; frame rate halves once the reader is deep in the page
   - prefers-reduced-motion: the canvas stays a still, calm frame (one draw, no loop)
   Pointer, touch and scroll all feed the same shared state, so every theme reacts to all three. */
(function () {
  'use strict';
  var PF = window.PF || {};
  var canvas = document.getElementById('fx');
  var ctx = canvas && canvas.getContext('2d', { alpha: false });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BG = '#070a0d';
  var ACC = [125, 255, 179];
  var ACC2 = [111, 211, 255];

  // ---------- shared state every theme reads ----------
  var S = {
    w: 0, h: 0, dpr: 1, t: 0,
    px: -1e4, py: -1e4, pActive: false, pvx: 0, pvy: 0, // pointer in CSS px, velocity
    down: false,
    impulses: [],      // {x,y,t0,power} taps / clicks
    wind: 0,           // scroll velocity, decays
    scrollY: 0,
    deep: false        // reader far below the hero
  };
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // prefers-reduced-motion: the background holds a settled frame and moves ONLY while the visitor is
  // touching or moving over it (and for a moment after), at 60 % of the particles and half rate. Nothing
  // moves on its own, which is what the setting asks for; a dead, never-reacting canvas read as broken on
  // this PC (Windows "animation effects" off), which is why it is not simply frozen (glance 2026-09-12).
  function budget(perPx, min, max) { var n = Math.round(clamp((S.w * S.h) / perPx, min, max)); return reduce ? Math.round(n * 0.6) : n; }
  var lastInput = 0;
  function input() { lastInput = performance.now(); }
  function impulse(x, y, power) { S.impulses.push({ x: x, y: y, t0: S.t, power: power || 1 }); if (S.impulses.length > 10) S.impulses.shift(); }

  // ---------- themes ----------
  // Every theme: init() builds its particles for the current size; frame(dt) draws one frame.
  // `trail: true` means the theme fades the previous frame instead of clearing it.
  var themes = {};

  // 1. SYNAPSE - neurons drifting, links to neighbours, pulses of light running along the links.
  themes.synapse = {
    init: function () {
      var n = budget(9000, 60, 150); this.nodes = [];
      for (var i = 0; i < n; i++) this.nodes.push({ x: rnd(0, S.w), y: rnd(0, S.h), vx: rnd(-.15, .15), vy: rnd(-.15, .15), r: rnd(1.2, 2.6), f: rnd(0, 6.28) });
      this.pulses = []; this.R = S.w < 720 ? 110 : 150; this.links = [];
    },
    frame: function (dt) {
      var ns = this.nodes, R = this.R, R2 = R * R, i, j, a, b, d2;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      for (i = 0; i < ns.length; i++) {
        a = ns[i];
        var dx = S.px - a.x, dy = S.py - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (S.pActive && d < 220 && d > 1) { a.vx += dx / d * 0.012; a.vy += dy / d * 0.012; }
        a.vx += S.wind * 0.004 * (a.r - 1.9); a.vy -= S.wind * 0.02;
        a.vx *= 0.985; a.vy *= 0.985;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < -20) a.x = S.w + 20; else if (a.x > S.w + 20) a.x = -20;
        if (a.y < -20) a.y = S.h + 20; else if (a.y > S.h + 20) a.y = -20;
      }
      // links: O(n^2) on <=150 nodes is ~11k checks - cheaper than a grid at this size
      this.links.length = 0;
      ctx.lineWidth = 1;
      for (i = 0; i < ns.length; i++) for (j = i + 1; j < ns.length; j++) {
        a = ns[i]; b = ns[j]; var ddx = a.x - b.x, ddy = a.y - b.y; d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2) {
          var k = 1 - d2 / R2; this.links.push(i, j);
          ctx.strokeStyle = rgba(ACC, 0.05 + k * 0.22); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // fire pulses: from nodes near the pointer, from taps, and a slow random background hum
      var L = this.links.length / 2;
      if (L) {
        var want = (S.pActive ? 0.09 : 0.03) * dt + (S.impulses.length ? 0.4 : 0);
        while (want > 0 && this.pulses.length < 90) {
          if (Math.random() > want) break; want -= 1;
          var li = (Math.random() * L) | 0; a = ns[this.links[li * 2]]; b = ns[this.links[li * 2 + 1]];
          var near = S.pActive && Math.hypot(a.x - S.px, a.y - S.py) < 240;
          if (near || !S.pActive || Math.random() < 0.35) this.pulses.push({ a: a, b: b, p: 0, s: rnd(0.9, 1.8) });
        }
      }
      for (i = 0; i < S.impulses.length; i++) {
        var im = S.impulses[i]; if (S.t - im.t0 > 60) continue;
        for (j = 0; j < ns.length; j++) { a = ns[j]; if (Math.hypot(a.x - im.x, a.y - im.y) < 130 && Math.random() < 0.08) { a.f = 0; a.vx += (a.x - im.x) * 0.02; a.vy += (a.y - im.y) * 0.02; } }
      }
      for (i = this.pulses.length - 1; i >= 0; i--) {
        var p = this.pulses[i]; p.p += 0.012 * p.s * dt;
        if (p.p >= 1) { this.pulses.splice(i, 1); p.b.f = 0; continue; }
        var x = p.a.x + (p.b.x - p.a.x) * p.p, y = p.a.y + (p.b.y - p.a.y) * p.p;
        ctx.fillStyle = rgba(ACC, 0.9); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill();
      }
      for (i = 0; i < ns.length; i++) {
        a = ns[i]; a.f += 0.05 * dt; var glow = Math.max(0, 1 - a.f * 0.35);
        ctx.fillStyle = rgba(ACC, 0.35 + glow * 0.65); ctx.beginPath(); ctx.arc(a.x, a.y, a.r + glow * 2.2, 0, 6.283); ctx.fill();
      }
    }
  };

  // 2. RESONANCE - a grid of points; every touch and every pointer move drops a ripple through it.
  themes.resonance = {
    init: function () {
      var sp = S.w < 720 ? 30 : 34; this.sp = sp;
      this.cols = Math.ceil(S.w / sp) + 1; this.rows = Math.ceil(S.h / sp) + 1;
      this.ripples = []; this.lastEmit = 0; this.hum = 0;
    },
    frame: function (dt) {
      var rs = this.ripples, i, r;
      // emit a small ripple as the pointer moves; taps make big ones
      var speed = Math.hypot(S.pvx, S.pvy);
      if (S.pActive && speed > 0.4 && S.t - this.lastEmit > 8) { rs.push({ x: S.px, y: S.py, t0: S.t, amp: clamp(speed * 0.35, 0.6, 2.2), life: 110 }); this.lastEmit = S.t; }
      while (S.impulses.length) { var im = S.impulses.shift(); rs.push({ x: im.x, y: im.y, t0: S.t, amp: 3.2, life: 170 }); }
      for (i = rs.length - 1; i >= 0; i--) if (S.t - rs[i].t0 > rs[i].life) rs.splice(i, 1);
      if (rs.length > 14) rs.splice(0, rs.length - 14);
      this.hum += (Math.abs(S.wind) * 0.06 - this.hum) * 0.08;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      var sp = this.sp, hum = this.hum, T = S.t * 0.025;
      for (var cy = 0; cy < this.rows; cy++) for (var cx = 0; cx < this.cols; cx++) {
        var x = cx * sp, y = cy * sp, dz = Math.sin(cx * 0.55 + T) * Math.cos(cy * 0.5 - T * 0.8) * (0.25 + hum);
        var ox = 0, oy = 0;
        for (i = 0; i < rs.length; i++) {
          r = rs[i]; var age = S.t - r.t0, dx = x - r.x, dy = y - r.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          var front = age * 3.2, band = d - front; if (band > 60 || band < -140) continue;
          var w = Math.sin(band * 0.09) * Math.exp(-band * band / 4200) * r.amp * (1 - age / r.life);
          ox += dx / d * w * 6; oy += dy / d * w * 6; dz += w;
        }
        var a = clamp(0.26 + Math.abs(dz) * 0.5, 0.26, 1), rad = 1.3 + Math.abs(dz) * 1.6;
        ctx.fillStyle = dz > 0.25 ? rgba(ACC, a) : dz < -0.25 ? rgba(ACC2, a) : rgba([120, 135, 140], a);
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, 6.283); ctx.fill();
      }
    }
  };

  // 3. ORBIT - particles caught by gravity wells; the pointer is one of them, taps fling.
  themes.orbit = {
    trail: true,
    init: function () {
      var n = budget(3200, 160, 420); this.ps = [];
      for (var i = 0; i < n; i++) this.ps.push({ x: rnd(0, S.w), y: rnd(0, S.h), vx: rnd(-1, 1), vy: rnd(-1, 1), c: Math.random() < 0.25 ? ACC2 : ACC, r: rnd(1.4, 2.8) });
      this.wells = [{ x: S.w * 0.3, y: S.h * 0.4, a: 0, s: 1 }, { x: S.w * 0.72, y: S.h * 0.6, a: 2.1, s: -1 }];
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
    },
    frame: function (dt) {
      ctx.fillStyle = 'rgba(7,10,13,0.22)'; ctx.fillRect(0, 0, S.w, S.h);
      var ws = this.wells, i, j, w;
      for (i = 0; i < ws.length; i++) { w = ws[i]; w.a += 0.004 * dt * w.s; w.x = S.w * (0.5 + Math.cos(w.a) * 0.28); w.y = S.h * (0.5 + Math.sin(w.a * 0.8) * 0.26); }
      var pw = S.pActive ? { x: S.px, y: S.py } : null;
      for (i = 0; i < this.ps.length; i++) {
        var p = this.ps[i];
        for (j = 0; j < ws.length + (pw ? 1 : 0); j++) {
          w = j < ws.length ? ws[j] : pw; var dx = w.x - p.x, dy = w.y - p.y, d2 = dx * dx + dy * dy + 900, d = Math.sqrt(d2);
          var g = (j < ws.length ? 900 : 1600) / d2;
          p.vx += dx / d * g * dt; p.vy += dy / d * g * dt;
          p.vx += -dy / d * g * 0.5 * dt; p.vy += dx / d * g * 0.5 * dt; // tangential kick keeps orbits
        }
        for (j = 0; j < S.impulses.length; j++) {
          var im = S.impulses[j], age = S.t - im.t0; if (age > 40) continue;
          var ex = p.x - im.x, ey = p.y - im.y, ed = Math.sqrt(ex * ex + ey * ey) + 1; if (ed < 260) { var f = (1 - ed / 260) * 1.8 * (1 - age / 40); p.vx += ex / ed * f; p.vy += ey / ed * f; }
        }
        p.vy -= S.wind * 0.03 * dt;
        var sp = Math.hypot(p.vx, p.vy); if (sp > 6) { p.vx *= 6 / sp; p.vy *= 6 / sp; }
        p.vx *= 0.995; p.vy *= 0.995;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -30 || p.x > S.w + 30 || p.y < -30 || p.y > S.h + 30) { p.x = rnd(0, S.w); p.y = rnd(0, S.h); p.vx = rnd(-1, 1); p.vy = rnd(-1, 1); }
        ctx.fillStyle = rgba(p.c, 0.45 + clamp(sp / 6, 0, 0.55)); ctx.fillRect(p.x, p.y, p.r, p.r);
      }
    }
  };

  // 4. SENTIENT - a swarm that spells a greeting, scatters when touched, then follows the reader.
  themes.sentient = {
    init: function () {
      var n = budget(2400, 260, 640); this.ps = []; this.targets = this.sample(PF.word || 'Hello', n);
      for (var i = 0; i < n; i++) this.ps.push({ x: rnd(0, S.w), y: rnd(0, S.h), vx: 0, vy: 0, seed: rnd(0, 6.28), c: Math.random() < 0.2 ? ACC2 : ACC });
      this.scatterUntil = 0; this.mode = 'word';
    },
    sample: function (word, n) {
      // the word sits where the hero leaves room: the right half on wide screens, below the copy on phones
      var wide = S.w > 900;
      var off = document.createElement('canvas'), w = (wide ? Math.min(S.w * 0.42, 620) : Math.min(S.w, 900)) | 0, h = Math.min(S.h * 0.5, wide ? 260 : 200) | 0;
      off.width = w; off.height = h; var c = off.getContext('2d');
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var size = Math.min(h * 0.8, w / (word.length * 0.62)); c.font = 'italic 500 ' + size + 'px "Playfair Display", Georgia, serif';
      c.fillText(word, w / 2, h / 2);
      var data = c.getImageData(0, 0, w, h).data, pts = [], step = 3;
      for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
      var out = [], ox = wide ? S.w * 0.74 - w / 2 : (S.w - w) / 2, oy = (wide ? S.h * 0.45 : S.h * 0.8) - h / 2;
      if (!pts.length) return null;
      for (var i = 0; i < n; i++) { var p = pts[(Math.random() * pts.length) | 0]; out.push([p[0] + ox, p[1] + oy]); }
      return out;
    },
    frame: function (dt) {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      var ps = this.ps, i, tg = this.targets;
      while (S.impulses.length) { var im = S.impulses.shift(); this.scatterUntil = S.t + 70; for (i = 0; i < ps.length; i++) { var p0 = ps[i], ex = p0.x - im.x, ey = p0.y - im.y, ed = Math.hypot(ex, ey) + 1; if (ed < 320) { var f = (1 - ed / 320) * 14; p0.vx += ex / ed * f + rnd(-2, 2); p0.vy += ey / ed * f + rnd(-2, 2); } } }
      var scatter = S.t < this.scatterUntil, follow = S.deep || !tg, T = S.t * 0.02;
      for (i = 0; i < ps.length; i++) {
        var p = ps[i], tx, ty;
        if (follow) { var ang = p.seed + T * 0.5, rad = 40 + 120 * (0.5 + 0.5 * Math.sin(p.seed * 3 + T)); tx = (S.pActive ? S.px : S.w * 0.5 + Math.cos(T * 0.3) * S.w * 0.3) + Math.cos(ang) * rad; ty = (S.pActive ? S.py : S.h * 0.5 + Math.sin(T * 0.4) * S.h * 0.2) + Math.sin(ang) * rad * 0.6; }
        else { tx = tg[i][0] + Math.sin(T + p.seed) * 1.5; ty = tg[i][1] + Math.cos(T * 1.3 + p.seed) * 1.5; }
        if (!scatter) { p.vx += (tx - p.x) * 0.012 * dt; p.vy += (ty - p.y) * 0.012 * dt; }
        if (S.pActive && !follow) { var dx = p.x - S.px, dy = p.y - S.py, d = Math.hypot(dx, dy) + 0.1; if (d < 110) { var r = (1 - d / 110) * 1.6; p.vx += dx / d * r * dt; p.vy += dy / d * r * dt; } }
        p.vy -= S.wind * 0.02 * dt;
        p.vx *= scatter ? 0.97 : 0.88; p.vy *= scatter ? 0.97 : 0.88;
        p.x += p.vx * dt; p.y += p.vy * dt;
        var sp = Math.hypot(p.vx, p.vy);
        ctx.fillStyle = rgba(p.c, 0.5 + clamp(sp * 0.15, 0, 0.5)); ctx.fillRect(p.x, p.y, 1.8, 1.8);
      }
    }
  };

  // 5. CONSTELLATION - a slow star field with depth; the pointer draws constellations, scrolling gives parallax.
  themes.constellation = {
    init: function () {
      var n = budget(6000, 90, 240); this.st = [];
      for (var i = 0; i < n; i++) this.st.push({ x: rnd(0, S.w), y: rnd(0, S.h * 1.4), z: rnd(0.25, 1), tw: rnd(0, 6.28), c: Math.random() < 0.18 ? ACC2 : [225, 235, 232] });
      this.pins = [];
    },
    frame: function (dt) {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
      var st = this.st, i, j, s, R = S.w < 720 ? 120 : 170, R2 = R * R, near = [];
      var par = (S.scrollY % (S.h * 1.4));
      while (S.impulses.length) { var im = S.impulses.shift(); this.pins.push({ x: im.x, y: im.y, t0: S.t }); if (this.pins.length > 3) this.pins.shift(); }
      for (i = this.pins.length - 1; i >= 0; i--) if (S.t - this.pins[i].t0 > 240) this.pins.splice(i, 1);
      for (i = 0; i < st.length; i++) {
        s = st[i]; s.x += (0.03 + S.wind * 0.01) * s.z * dt; if (s.x > S.w + 10) s.x = -10; else if (s.x < -10) s.x = S.w + 10;
        s.tw += 0.03 * dt * s.z;
        var sy = s.y - par * s.z * 0.5; sy = ((sy % (S.h * 1.4)) + S.h * 1.4) % (S.h * 1.4) - S.h * 0.2;
        var sx = s.x + (S.pActive ? (S.px - S.w / 2) * 0.02 * s.z : 0);
        s.sx = sx; s.sy = sy;
        var a = 0.25 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(s.tw));
        ctx.fillStyle = rgba(s.c, a); ctx.beginPath(); ctx.arc(sx, sy, 0.6 + s.z * 1.5, 0, 6.283); ctx.fill();
      }
      var anchors = S.pActive ? [{ x: S.px, y: S.py, k: 1 }] : [];
      for (i = 0; i < this.pins.length; i++) anchors.push({ x: this.pins[i].x, y: this.pins[i].y, k: 1 - (S.t - this.pins[i].t0) / 240 });
      ctx.lineWidth = 1;
      for (var q = 0; q < anchors.length; q++) {
        var an = anchors[q]; near.length = 0;
        for (i = 0; i < st.length; i++) { s = st[i]; var dx = s.sx - an.x, dy = s.sy - an.y; if (dx * dx + dy * dy < R2) near.push(s); }
        for (i = 0; i < near.length; i++) {
          ctx.strokeStyle = rgba(ACC, 0.16 * an.k); ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(near[i].sx, near[i].sy); ctx.stroke();
          for (j = i + 1; j < near.length; j++) { var ex = near[i].sx - near[j].sx, ey = near[i].sy - near[j].sy, d2 = ex * ex + ey * ey; if (d2 < R2 * 0.35) { ctx.strokeStyle = rgba(ACC, (0.35 - d2 / (R2 * 0.35) * 0.3) * an.k); ctx.beginPath(); ctx.moveTo(near[i].sx, near[i].sy); ctx.lineTo(near[j].sx, near[j].sy); ctx.stroke(); } }
          ctx.fillStyle = rgba(ACC, 0.9 * an.k); ctx.beginPath(); ctx.arc(near[i].sx, near[i].sy, 1.8, 0, 6.283); ctx.fill();
        }
      }
    }
  };

  // 6. CODE - falling glyphs (Lithuanian letters among them) that part around the pointer.
  themes.rain = {
    trail: true,
    init: function () {
      this.fs = S.w < 720 ? 14 : 16; var cols = Math.ceil(S.w / this.fs); this.cols = [];
      for (var i = 0; i < cols; i++) this.cols.push({ y: rnd(-S.h, 0), s: rnd(2, 6), gl: '' });
      this.chars = 'ĄČĘĖĮŠŲŪŽ01アイウエオカキクケコサシスセソタチツテトナニヌネノ<>/{}[]=+*#@%&$ΣΔλπ';
      ctx.fillStyle = BG; ctx.fillRect(0, 0, S.w, S.h);
    },
    frame: function (dt) {
      ctx.fillStyle = 'rgba(7,10,13,0.16)'; ctx.fillRect(0, 0, S.w, S.h);
      var fs = this.fs, cs = this.cols, ch = this.chars; ctx.font = '500 ' + fs + 'px "JetBrains Mono", monospace'; ctx.textBaseline = 'top';
      var burst = 0; for (var k = 0; k < S.impulses.length; k++) if (S.t - S.impulses[k].t0 < 30) burst = 1;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i], x = i * fs, speed = c.s * (1 + Math.max(0, S.wind) * 0.15) * dt;
        var dx = x - S.px, dy = c.y - S.py, d = Math.sqrt(dx * dx + dy * dy);
        if (S.pActive && d < 120) { if (Math.abs(dx) < 50) { c.y -= speed * 0.4; continue; } }
        c.y += speed * (burst ? 2.5 : 1);
        var g = ch[(Math.random() * ch.length) | 0];
        ctx.fillStyle = rgba(ACC, 0.8); ctx.fillText(g, x, c.y);
        ctx.fillStyle = rgba(ACC, 0.28); ctx.fillText(c.gl, x, c.y - fs);
        c.gl = g;
        if (c.y > S.h + fs * 4) { c.y = rnd(-S.h * 0.6, -fs); c.s = rnd(2, 6); }
      }
      if (S.pActive) { ctx.strokeStyle = rgba(ACC2, 0.18); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(S.px, S.py, 58 + Math.sin(S.t * 0.08) * 4, 0, 6.283); ctx.stroke(); }
    }
  };

  // ---------- engine ----------
  var order = ['synapse', 'resonance', 'orbit', 'sentient', 'constellation', 'rain'];
  var cur = null, curName = '';
  var btn = document.getElementById('themeBtn'), nameEl = document.getElementById('themeName');
  function readPref() { try { var v = localStorage.getItem('pf-theme'); return order.indexOf(v) >= 0 ? v : null; } catch (e) { return null; } }
  function savePref(n) { try { localStorage.setItem('pf-theme', n); } catch (e) { } }
  function resize() {
    S.w = window.innerWidth; S.h = window.innerHeight; S.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(S.w * S.dpr); canvas.height = Math.round(S.h * S.dpr);
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    if (cur) cur.init();
  }
  function setTheme(name, save) {
    curName = name; cur = themes[name]; cur.init();
    if (nameEl) nameEl.textContent = (PF.themes && PF.themes[name]) || name;
    if (save) savePref(name);
    if (btn) { btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin'); }
  }
  function next() { setTheme(order[(order.indexOf(curName) + 1) % order.length], true); }
  window.__pf = { S: S, themes: themes }; // read-only debug handle for tools/portfolio-verify.js

  if (ctx) {
    var last = 0, skip = false, resizeT = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      if (reduce && now - lastInput > 1500) { last = now; return; } // reduced motion: still unless interacted with
      if ((S.deep || reduce) && (skip = !skip)) return; // half rate deep in the page or under reduced motion
      var dt = clamp((now - last) / 16.67, 0.2, 2.5); last = now; S.t += dt;
      S.wind *= 0.92; S.pvx *= 0.8; S.pvy *= 0.8;
      for (var i = S.impulses.length - 1; i >= 0; i--) if (S.t - S.impulses[i].t0 > 300) S.impulses.splice(i, 1);
      cur.frame(dt);
    }
    resize();
    setTheme(readPref() || order[0], false);
    if (reduce) { for (var w = 0; w < 40; w++) cur.frame(1); } // settle a still frame to start from
    requestAnimationFrame(function (n) { last = n; loop(n); });
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); });

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
      var y = window.scrollY; S.wind = clamp(S.wind + (y - lastY) * 0.05, -12, 12); lastY = y; S.scrollY = y; S.deep = y > S.h * 1.6; touched();
    }, { passive: true });

    if (btn) btn.addEventListener('click', function () { input(); next(); if (reduce) { for (var w = 0; w < 40; w++) cur.frame(1); } });
    window.addEventListener('keydown', function (e) { if ((e.key === 't' || e.key === 'T') && !/input|textarea/i.test(document.activeElement && document.activeElement.tagName)) next(); });
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
