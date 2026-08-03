/* © 2026 Ignas — pasiūlymo pristatymo puslapio logika.
   Tik trys dalykai: mobilus meniu, „kas Jus erzina" žymėjimas ir laiko skaičiuoklė.
   Nieko nesiunčia į serverį — žymėjimas gyvuoja tik atidarytame puslapyje. */
(function () {
  'use strict';

  /* ── mobilus meniu ───────────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var drop = document.getElementById('navDrop');
  if (burger && drop) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drop.hidden = open;
    });
    drop.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { drop.hidden = true; burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ── „kas Jus labiausiai erzina" ─────────────────────────────────── */
  var grid = document.getElementById('painGrid');
  var sum = document.getElementById('painSum');
  var psN = document.getElementById('psN');
  var psList = document.getElementById('psList');

  if (grid && sum) {
    var picked = [];
    Array.prototype.forEach.call(grid.querySelectorAll('.pain'), function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
        var title = btn.querySelector('b').textContent;
        var i = picked.indexOf(title);
        if (on) { if (i > -1) picked.splice(i, 1); }
        else if (i === -1) { picked.push(title); }
        paintSum();
      });
    });

    function paintSum() {
      if (!picked.length) { sum.hidden = true; return; }
      sum.hidden = false;
      psN.textContent = String(picked.length);
      psList.innerHTML = '';
      picked.forEach(function (t) {
        var li = document.createElement('li');
        li.textContent = t;
        psList.appendChild(li);
      });
    }
  }

  /* ── laiko skaičiuoklė ───────────────────────────────────────────── */
  var people = document.getElementById('cPeople');
  var mins = document.getElementById('cMin');
  var share = document.getElementById('cShare');

  if (people && mins && share) {
    var oPeople = document.getElementById('oPeople');
    var oMin = document.getElementById('oMin');
    var oShare = document.getElementById('oShare');
    var rMonth = document.getElementById('rMonth');
    var rYear = document.getElementById('rYear');
    var rDays = document.getElementById('rDays');
    var WORKDAYS = 21;   // vidutiniškai per mėnesį
    var WORKDAY_H = 8;

    function calc() {
      var p = +people.value, m = +mins.value, s = +share.value / 100;
      oPeople.textContent = String(p);
      oMin.textContent = m + ' min.';
      oShare.textContent = s * 100 + ' %';

      var hMonth = (p * m * s * WORKDAYS) / 60;
      var hYear = hMonth * 12;
      rMonth.textContent = Math.round(hMonth);
      rYear.textContent = Math.round(hYear);
      rDays.textContent = Math.round(hYear / WORKDAY_H);
    }
    [people, mins, share].forEach(function (el) { el.addEventListener('input', calc); });
    calc();
  }

  /* ── spausdinimas ────────────────────────────────────────────────── */
  var printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();
