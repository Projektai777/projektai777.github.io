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

    // demo skips the 60s cooldown so you can click through a full card
    if (!isDemo && c.last && now - c.last < 60 * 1000) {
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
function render() {
  const full = card.stamps >= tenant.stamps_needed;
  document.getElementById('themeColor').content = tenant.primary_color;
  document.documentElement.style.setProperty('--brand', tenant.primary_color);
  document.title = `${tenant.business_name} — lojalumo kortelė`;

  const grid = Array.from({ length: tenant.stamps_needed }, (_, i) =>
    `<div class="stamp ${i < card.stamps ? 'filled' : ''}" style="animation-delay:${i * 40}ms">${i < card.stamps ? '★' : ''}</div>`
  ).join('');

  const remaining = tenant.stamps_needed - card.stamps;
  const statusLine = full
    ? `🎉 Jūsų prizas: <strong>${tenant.reward_text}</strong>!`
    : remaining === 1
      ? `Liko <strong>1 antspaudas</strong> iki prizo!`
      : `Prizas: ${tenant.reward_text}`;

  app.innerHTML = `
    ${isDemo ? `<div class="demo-badge">DEMO · darbuotojo PIN: 1234</div>` : ''}
    <header>
      ${tenant.logo_url
        ? `<img class="logo" src="${tenant.logo_url}" alt="">`
        : `<div class="logo logo-fallback">${tenant.business_name.trim()[0].toUpperCase()}</div>`}
      <h1>${tenant.business_name}</h1>
      <p class="subtitle">Lojalumo kortelė</p>
    </header>

    <section class="card-box ${full ? 'card-full' : ''}">
      <div class="card-accent"></div>
      <div class="stamp-grid" style="--cols:${Math.min(tenant.stamps_needed, 5)}">${grid}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${(card.stamps / tenant.stamps_needed) * 100}%"></div></div>
      <p class="progress">${card.stamps} / ${tenant.stamps_needed}</p>
      <p class="reward ${full ? 'reward-ready' : ''}">${statusLine}</p>
    </section>

    <button class="cta" id="actionBtn">
      ${full ? '🎁 Atsiimti prizą' : 'Gauti antspaudą'}
    </button>
    <p class="small-print">Mygtuką spaudžia darbuotojas pirkimo metu.</p>
    ${isDemo ? '<p class="small-print">Demonstracinė versija · projektai777.koduojam@gmail.com</p>' : ''}
  `;

  document.getElementById('actionBtn').onclick = () =>
    openPinPad(full ? 'redeem_reward' : 'add_stamp');

  if (full) confetti();
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
        toast('Prizas atsiimtas! Ačiū 🎉');
      } else {
        card.stamps = res.stamps;
        toast(res.full ? 'Kortelė pilna! 🎉' : 'Antspaudas pridėtas ⭐');
      }
      render();
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
  try {
    if (!slug && !isDemo) {
      // Installed-PWA launch loses the ?b= param: restore the last card.
      const last = localStorage.getItem('lojalumas_last');
      if (last) { location.replace(`?b=${encodeURIComponent(last)}`); return; }
      app.innerHTML = '<div class="loading">Nuskenuokite parduotuvės QR kodą.</div>';
      return;
    }
    tenant = demoOverrides(await backend.loadTenant());
    localStorage.setItem('lojalumas_last', slug);
    card = await backend.loadOrCreateCard(tenant.id);
    render();
  } catch (e) {
    app.innerHTML = `<div class="loading">Kortelė nerasta. Patikrinkite QR kodą.</div>`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
