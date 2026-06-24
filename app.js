// =============================================================
// Lojalumas — multi-tenant PWA stamp card
// Tenant is resolved from the URL path:  kortele.lt/coffeebox
// All branding/config comes from the tenant_public view.
// The PIN is NEVER in this file — it is verified server-side.
// =============================================================

import TENANTS from './tenants.js';

// Optional paid tier: set these to a Supabase project to get central
// analytics + server-side PIN security. Leave as-is for the free,
// fully static mode where everything comes from tenants.js.
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

// Tenant comes from ?b=slug (works on any host, incl. GitHub Pages
// subpaths) or, as a fallback, the last URL path segment (Vercel rewrites).
const params = new URLSearchParams(location.search);
const slug = (params.get('b') || location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
const app = document.getElementById('app');
const isStatic = !!TENANTS[slug] || SUPABASE_URL.includes('YOUR-PROJECT');
const isDemo = slug === 'demo';
const view = (params.get('view') || '').toLowerCase(); // ?view=owner -> savininko apžvalga (atskiras puslapis)
let isPreview = false;       // set after tenant loads: demo OR tenant.preview (rodo pardavimų funkcijas)
let deferredInstall = null;  // captured 'beforeinstallprompt' (Android "Pridėti")

// Personalized sales demos: /?b=demo&n=Kavinė+Aroma&c=%23064e3b&r=Prizas&s=8
// lets an outreach email show the prospect THEIR OWN branded card with
// zero per-prospect config. Only the demo tenant accepts overrides.
function demoOverrides(t) {
  if (!isDemo) return t;
  const clean = (v) => (v || '').replace(/[<>&"']/g, '').slice(0, 60); // URL data goes into innerHTML
  return {
    ...t,
    business_name: clean(params.get('n')) || t.business_name,
    primary_color: /^#[0-9a-fA-F]{6}$/.test(params.get('c') || '') ? params.get('c') : t.primary_color,
    reward_text: clean(params.get('r')) || t.reward_text,
    stamps_needed: Math.min(Math.max(parseInt(params.get('s'), 10) || t.stamps_needed, 3), 20),
  };
}

// ---------- tiny Supabase REST helpers (no SDK needed) ----------
async function sbSelect(view, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${view}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`select ${view} failed`);
  return r.json();
}

async function sbInsert(table, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert ${table} failed`);
  return (await r.json())[0];
}

async function sbRpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn} failed`);
  return r.json();
}

// ---------- backends ----------
// Both expose the same 3 methods, so the rest of the app doesn't care
// whether it's talking to Supabase or the in-browser demo store.

const supabaseBackend = {
  async loadTenant() {
    const rows = await sbSelect('tenant_public', `slug=eq.${encodeURIComponent(slug)}`);
    if (!rows.length) throw new Error('tenant_not_found');
    return rows[0];
  },
  async loadOrCreateCard(tenantId) {
    const key = `lojalumas_card_${slug}`;
    const savedId = localStorage.getItem(key);
    if (savedId) {
      const rows = await sbSelect('cards', `id=eq.${savedId}&select=*`);
      if (rows.length) return rows[0];
    }
    const created = await sbInsert('cards', { tenant_id: tenantId });
    localStorage.setItem(key, created.id);
    return created;
  },
  rpc: sbRpc,
};

// Static mode: no server at all. Stamps live in the phone's
// localStorage; the PIN is verified against a SHA-256 hash from
// tenants.js, so it never appears in the source in readable form.
const staticBackend = {
  _key: `lojalumas_card_${slug}`,
  _load() {
    return JSON.parse(localStorage.getItem(this._key) || '{"stamps":0,"last":0,"fails":[]}');
  },
  _save(c) {
    localStorage.setItem(this._key, JSON.stringify(c));
  },
  async _hash(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },
  async loadTenant() {
    const t = TENANTS[slug];
    if (!t) throw new Error('tenant_not_found');
    return t;
  },
  async loadOrCreateCard() {
    return { id: slug, ...this._load() };
  },
  async rpc(fn, { p_pin }) {
    const t = TENANTS[slug];
    const c = this._load();
    const now = Date.now();

    // Demo abuse guard: the demo PIN is public, so each device gets ONE
    // full card cycle and 14 days — enough for any sales demo, useless
    // as a free production card (every customer's phone locks itself).
    if (isDemo) {
      if (!c.first) { c.first = now; this._save(c); }
      if ((c.cycles || 0) >= 1 || now - c.first > 14 * 24 * 3600 * 1000) {
        return { ok: false, error: 'demo_over' };
      }
    }

    // brute-force gate: 5 wrong PINs in 10 min locks the pad
    c.fails = (c.fails || []).filter((ts) => now - ts < 10 * 60 * 1000);
    if (c.fails.length >= 5) return { ok: false, error: 'rate_limited' };

    if (await this._hash(`${slug}:${p_pin}`) !== t.pin_hash) {
      c.fails.push(now);
      this._save(c);
      return { ok: false, error: 'bad_pin' };
    }

    if (fn === 'redeem_reward') {
      if (c.stamps < t.stamps_needed) return { ok: false, error: 'card_not_full' };
      c.stamps = 0;
      if (isDemo) c.cycles = (c.cycles || 0) + 1; // demo: one cycle per device
      this._save(c);
      return { ok: true };
    }

    // demo/preview skip the 60s cooldown so you can click through a full card
    if (!isPreview && c.last && now - c.last < 60 * 1000) {
      return { ok: false, error: 'too_fast' };
    }
    c.stamps = Math.min(c.stamps + 1, t.stamps_needed);
    c.last = now;
    this._save(c);
    return { ok: true, stamps: c.stamps, full: c.stamps >= t.stamps_needed };
  },
};

const backend = isStatic ? staticBackend : supabaseBackend;

// ---------- state ----------
let tenant = null;
let card = null;

// ---------- rendering ----------
function setTheme() {
  document.getElementById('themeColor').content = tenant.primary_color;
  document.documentElement.style.setProperty('--brand', tenant.primary_color);
  document.title = `${tenant.business_name} — lojalumo kortelė`;
  setAppIcon();
}

// Make the "add to home screen" shortcut use the SAME logo as the card page,
// per tenant. Falls back to the static icon when a tenant has no logo.
function setAppIcon() {
  // absolute, so it resolves correctly inside the blob-URL manifest below
  const icon = new URL(tenant.logo_url || './icon-192.png', location.href).href;
  const apple = document.getElementById('appleIcon');
  if (apple) apple.href = icon;

  // Rewrite the PWA manifest so the installed icon + label match the tenant.
  const manifest = {
    name: tenant.business_name,
    short_name: tenant.business_name,
    start_url: location.pathname + location.search,
    display: 'standalone',
    background_color: '#f5f5f4',
    theme_color: tenant.primary_color || '#1f2937',
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
  const link = document.getElementById('manifest');
  if (link) {
    if (link.dataset.blob) URL.revokeObjectURL(link.dataset.blob);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    );
    link.href = url;
    link.dataset.blob = url;
  }
}

function headerHtml() {
  const wide = tenant.logo_wide ? ' wide' : '';
  const logo = tenant.logo_url
    ? `<img class="logo${wide}" src="${tenant.logo_url}" alt="${tenant.business_name}">`
    : `<div class="logo logo-fallback">${tenant.business_name.trim()[0].toUpperCase()}</div>`;
  // a wordmark logo already contains the name, so skip the redundant <h1>
  const name = tenant.logo_wide ? '' : `<h1>${tenant.business_name}</h1>`;
  const inner = `${logo}${name}<p class="subtitle">Lojalumo kortelė</p>`;
  if (tenant.hero_url) {
    return `<header class="has-hero" style="--hero:url('${tenant.hero_url}')"><div class="hero-content">${inner}</div></header>`;
  }
  return `<header>${inner}</header>`;
}

function tiersHtml() {
  if (!tenant.milestones || !tenant.milestones.length) return '';
  const items = tenant.milestones.map((m) => {
    const done = card.stamps >= m.at;
    return `<div class="tier ${done ? 'tier-done' : ''}">
      <span class="tier-badge">${done ? '✓' : m.at}</span>
      <span class="tier-text"><b>${m.at} antspaudai</b> · ${m.text}</span></div>`;
  }).join('');
  return `<div class="tiers"><p class="tiers-title">Prizai pakeliui:</p>${items}</div>`;
}

function installHintHtml() {
  return `<div class="install-hint" id="installHint">
    <span>📲 Pridėkite prie pradžios ekrano — veikia kaip programėlė, be App Store.</span>
    <button class="install-btn" id="installBtn" hidden>Pridėti</button></div>`;
}
function wireInstall() {
  const btn = document.getElementById('installBtn');
  if (!btn || !deferredInstall) return;
  btn.hidden = false;
  btn.onclick = async () => { deferredInstall.prompt(); deferredInstall = null; btn.hidden = true; };
}

function staffFlowHtml() {
  const steps = [
    { n: 1, icon: '📱', t: 'Svečias atidaro kortelę', s: 'Nuskaito QR kodą prie kasos arba paspaudžia nuorodą telefone' },
    { n: 2, icon: '🔢', t: 'Darbuotojas įveda PIN', s: 'Patvirtina pirkimą trumpu 4 skaitmenų kodu' },
    { n: 3, icon: '⭐', t: 'Pridedamas antspaudas', s: 'Kortelė užsipildo po vieną su kiekvienu apsilankymu' },
    { n: 4, icon: '🎁', t: 'Surinko — gauna prizą', s: 'Svečias atsiima dovaną ir grįžta vėl jos užsidirbti' },
  ];
  const cells = steps.map((st, i) => `
    <div class="flow-step">
      <div class="flow-num">${st.n}</div>
      <div class="flow-body"><span class="flow-icon">${st.icon}</span><b>${st.t}</b><p>${st.s}</p></div>
    </div>${i < steps.length - 1 ? '<div class="flow-arrow">▼</div>' : ''}`).join('');
  return `<section class="flow-wrap"><h3 class="flow-title">Kaip tai veikia darbuotojui?</h3><div class="flow">${cells}</div></section>`;
}

function ctaHtml() {
  const ownerUrl = `?b=${encodeURIComponent(slug)}&view=owner`;
  return `<a class="pitch-owner" href="${ownerUrl}">📊 Kuo tai naudinga verslui? →</a>`;
}

function render() {
  setTheme();
  const full = card.stamps >= tenant.stamps_needed;

  const grid = Array.from({ length: tenant.stamps_needed }, (_, i) => {
    const filled = i < card.stamps;
    const milestone = (tenant.milestones || []).some((m) => m.at === i + 1);
    return `<div class="stamp ${filled ? 'filled' : ''} ${milestone ? 'stamp-milestone' : ''}" style="animation-delay:${i * 40}ms">${filled ? '★' : (milestone ? '🎁' : '')}</div>`;
  }).join('');

  const remaining = tenant.stamps_needed - card.stamps;
  const statusLine = full
    ? `🎉 Jūsų prizas: <strong>${tenant.reward_text}</strong>!`
    : remaining === 1
      ? `Liko <strong>1 antspaudas</strong> iki prizo!`
      : `Prizas: ${tenant.reward_text}`;

  app.innerHTML = `
    ${isDemo ? `<div class="demo-badge">DEMO · darbuotojo PIN: 1234</div>` : ''}
    ${headerHtml()}

    <section class="card-box ${full ? 'card-full' : ''}">
      <div class="card-accent"></div>
      <div class="stamp-grid" style="--cols:${Math.min(tenant.stamps_needed, 5)}">${grid}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${(card.stamps / tenant.stamps_needed) * 100}%"></div></div>
      <p class="progress">${card.stamps} / ${tenant.stamps_needed}</p>
      <p class="reward ${full ? 'reward-ready' : ''}">${statusLine}</p>
    </section>
    ${tiersHtml()}

    <button class="cta" id="actionBtn">${full ? '🎁 Atsiimti prizą' : 'Gauti antspaudą'}</button>
    <p class="small-print">Mygtuką spaudžia darbuotojas pirkimo metu.</p>
    ${isPreview && !full ? `<button class="cta cta-demo" id="autoFillBtn">✨ Užpildyti kortelę (demonstracija)</button>` : ''}
    ${isPreview ? `<button class="reset-link" id="resetBtn">↺ Pradėti iš naujo</button>` : ''}
    ${installHintHtml()}
    ${isPreview ? staffFlowHtml() : ''}
    ${isPreview ? ctaHtml() : ''}
    <p class="privacy">🔒 Jokių asmens duomenų — kortelė saugoma tik Jūsų telefone.</p>
    ${isDemo ? '<p class="small-print">Demonstracinė versija · projektai777.koduojam@gmail.com</p>' : ''}
  `;

  document.getElementById('actionBtn').onclick = () => openPinPad(full ? 'redeem_reward' : 'add_stamp');
  const af = document.getElementById('autoFillBtn'); if (af) af.onclick = autoFill;
  const rs = document.getElementById('resetBtn'); if (rs) rs.onclick = resetCard;
  wireInstall();
}

// ---------- confetti (no library) ----------
function confetti() {
  const colors = [tenant.primary_color, '#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = `${Math.floor(Math.exp(Math.sin(i * 12.9898) * 4.5) * 7919) % 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${(i % 12) * 0.12}s`;
    p.style.animationDuration = `${2 + (i % 5) * 0.35}s`;
    p.style.setProperty('--drift', `${((i * 37) % 120) - 60}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4500);
  }
}

// ---------- celebration ----------
function celebrate(rewardText) {
  const dlg = document.getElementById('celebrateModal');
  const txt = document.getElementById('celebrateText');
  if (txt) txt.innerHTML = `Jūsų prizas:<br><strong>${rewardText}</strong>`;
  if (dlg && !dlg.open) dlg.showModal();
  confetti();
}

// ---------- demo helpers (preview only) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoFill() {
  const btn = document.getElementById('autoFillBtn');
  if (btn) btn.disabled = true;
  // Fill only up to the NEXT milestone; the user clicks again to continue to full.
  const next = (tenant.milestones || [])
    .map((m) => m.at).filter((a) => a > card.stamps).sort((a, b) => a - b)[0];
  const target = next || tenant.stamps_needed;
  while (card.stamps < target) {
    card.stamps += 1;
    if (backend._save) backend._save({ stamps: card.stamps, last: 0, fails: [], first: card.first, cycles: card.cycles });
    render();
    await sleep(280);
  }
  if (card.stamps >= tenant.stamps_needed) {
    celebrate(tenant.reward_text);
  } else {
    const m = (tenant.milestones || []).find((x) => x.at === card.stamps);
    if (m) toast(`🎁 Pasiekta: ${m.text}`);
  }
}

function resetCard() {
  card.stamps = 0;
  if (backend._save) backend._save({ stamps: 0, last: 0, fails: [] });
  render();
}

// ---------- owner dashboard (?view=owner) ----------
function qrSrc(url, size) {
  // qrserver.com renders a scannable QR for any URL — no JS lib, no dead CDN.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(url)}`;
}

function barChart(title, a, b, labelA, labelB, note) {
  return `<div class="chart">
    <h4>${title}</h4>
    <div class="bars">
      <div class="bar-col"><div class="bar bar-a" style="--h:${a}%"><span>${a}%</span></div><div class="bar-label">${labelA}</div></div>
      <div class="bar-col"><div class="bar bar-b" style="--h:${b}%"><span>${b}%</span></div><div class="bar-label">${labelB}</div></div>
    </div>${note ? `<p class="chart-note">${note}</p>` : ''}</div>`;
}

function sparkline(points) {
  const w = 280, h = 80, n = points.length;
  const xy = points.map((p, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - (p / 100) * h).toFixed(1)}`);
  const area = `0,${h} ${xy.join(' ')} ${w},${h}`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="${area}" class="spark-fill"/>
    <polyline points="${xy.join(' ')}" class="spark-line"/>
  </svg>`;
}

// Scannable QR (encodes the live card URL — scan with another phone to test).
function drawQr(targetUrl) {
  const el = document.getElementById('standeeQr');
  if (!el) return;
  el.innerHTML = `<img class="qr-img" alt="QR kodas — ${tenant.business_name}" src="${qrSrc(targetUrl, 400)}">`;
}

function renderOwner() {
  setTheme();
  const cardUrl = `${location.origin}${location.pathname}?b=${encodeURIComponent(slug)}`;
  const standeeUrl = `tools/standee.html?b=${encodeURIComponent(slug)}`;
  app.innerHTML = `
    <a class="back-link" href="?b=${encodeURIComponent(slug)}">← Atgal į kortelę</a>
    ${headerHtml()}
    <div class="owner-tag">SAVININKO APŽVALGA · iliustracinis pavyzdys</div>

    <section class="panel">
      <h3>Kodėl tai apsimoka?</h3>
      <p class="panel-lead">Lojalumo kortelė duoda svečiui priežastį grįžti būtent pas Jus — kad surinktų antspaudus ir atsiimtų prizą. Daugiau grįžtančių svečių reiškia daugiau pakartotinių apsilankymų.</p>
      ${barChart('Klientų grįžtamumas', 32, 61, 'Be programos', 'Su programa', '*Iliustracinis pavyzdys, paremtas bendromis lojalumo programų tendencijomis.')}
    </section>

    <section class="panel">
      <h3>Apsilankymai per mėnesį</h3>
      ${sparkline([28, 33, 41, 48, 58, 71])}
      <p class="chart-note">Svečiai, renkantys antspaudus, grįžta dažniau. *Pavyzdys.</p>
    </section>

    <section class="panel qr-test">
      <h3>Išbandykite kitu telefonu</h3>
      <p class="panel-lead">Nuskaitykite QR kodą kitu telefonu — kortelė atsidarys taip, kaip ją matys Jūsų svečias.</p>
      <div class="standee-mock">
        <div class="standee-top"></div>
        <p class="sm-name">${tenant.business_name}</p>
        <p class="sm-reward">${tenant.reward_text}</p>
        <div id="standeeQr"></div>
        <p class="sm-steps">Nuskaitykite QR · rinkite antspaudus · atsiimkite prizą</p>
      </div>
      <a class="pitch-owner" href="${standeeUrl}">🖨️ Spausdinti stovelį prie kasos →</a>
    </section>

    <button class="cta cta-contact" id="copyEmailBtn">Norite tai savo restoranui?<span>Susisiekime →</span></button>
    <p class="privacy">🔒 Jokių asmens duomenų — viskas saugoma svečio telefone.</p>
  `;
  drawQr(cardUrl);
  const ce = document.getElementById('copyEmailBtn');
  if (ce) ce.onclick = copyEmail;
}

const CONTACT_EMAIL = 'projektai777.koduojam@gmail.com';
function copyEmail() {
  const done = () => toast('📋 El. paštas nukopijuotas');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(done).catch(() => fallbackCopy(CONTACT_EMAIL, done));
  } else {
    fallbackCopy(CONTACT_EMAIL, done);
  }
}
function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* ignore */ }
  ta.remove();
  cb();
}

// ---------- PIN pad ----------
const modal = document.getElementById('pinModal');
const dots = document.getElementById('pinDots');
let pinBuffer = '';
let pinAction = 'add_stamp';

function buildPad() {
  const pad = document.getElementById('pinPad');
  pad.innerHTML = [1,2,3,4,5,6,7,8,9,'',0,'⌫']
    .map(k => `<button class="key" data-k="${k}" ${k === '' ? 'disabled' : ''}>${k}</button>`)
    .join('');
  pad.onclick = (e) => {
    const k = e.target.dataset?.k;
    if (k === undefined) return;
    if (k === '⌫') pinBuffer = pinBuffer.slice(0, -1);
    else if (pinBuffer.length < 4) pinBuffer += k;
    updateDots();
    if (pinBuffer.length === 4) submitPin();
  };
  document.getElementById('pinCancel').onclick = () => { modal.close(); };
}

function updateDots() {
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pinBuffer.length));
}

function openPinPad(action) {
  pinAction = action;
  pinBuffer = '';
  updateDots();
  modal.showModal();
}

async function submitPin() {
  const pin = pinBuffer;
  pinBuffer = '';
  updateDots();
  try {
    const res = await backend.rpc(pinAction, { p_slug: slug, p_card: card.id, p_pin: pin });
    if (res.ok) {
      modal.close();
      if (pinAction === 'redeem_reward') {
        card.stamps = 0;
        render();
        toast('Prizas atsiimtas! Ačiū 🎉');
      } else {
        card.stamps = res.stamps;
        render();
        if (res.full) celebrate(tenant.reward_text);
        else toast('Antspaudas pridėtas ⭐');
      }
    } else {
      const msg = {
        bad_pin: 'Neteisingas PIN',
        rate_limited: 'Per daug bandymų. Palaukite 10 min.',
        too_fast: 'Palaukite minutę tarp antspaudų',
        card_not_full: 'Kortelė dar nepilna',
        demo_over: 'Demonstracija baigėsi. Dėl pilnos versijos susisiekite el. paštu.',
      }[res.error] || 'Klaida. Bandykite dar kartą.';
      toast(msg, true);
    }
  } catch {
    toast('Ryšio klaida. Patikrinkite internetą.', true);
  }
}

function toast(text, isError = false) {
  const t = document.createElement('div');
  t.className = `toast ${isError ? 'toast-err' : ''}`;
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ---------- boot ----------
(async () => {
  buildPad();
  const celebrateCloseBtn = document.getElementById('celebrateClose');
  if (celebrateCloseBtn) celebrateCloseBtn.onclick = () => document.getElementById('celebrateModal').close();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; wireInstall(); });
  try {
    if (!slug && !isDemo) {
      // Installed-PWA launch loses the ?b= param: restore the last card.
      const last = localStorage.getItem('lojalumas_last');
      if (last) { location.replace(`?b=${encodeURIComponent(last)}`); return; }
      app.innerHTML = '<div class="loading">Nuskenuokite parduotuvės QR kodą.</div>';
      return;
    }
    tenant = demoOverrides(await backend.loadTenant());
    isPreview = isDemo || tenant.preview === true;
    localStorage.setItem('lojalumas_last', slug);
    if (view === 'owner') {
      renderOwner();
    } else {
      card = await backend.loadOrCreateCard(tenant.id);
      render();
    }
  } catch (e) {
    app.innerHTML = `<div class="loading">Kortelė nerasta. Patikrinkite QR kodą.</div>`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
