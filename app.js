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

// =============================================================
// i18n — Lithuanian default, English toggle (LT | EN).
// Customer-facing card + owner pitch are fully translated so a
// tourist-facing venue can show the card in English. Choice is
// remembered per device (and overridable with ?lang=en).
// =============================================================
let lang = (params.get('lang') || localStorage.getItem('lojalumas_lang') || 'lt').toLowerCase();
if (lang !== 'en') lang = 'lt';

const STR = {
  lt: {
    subtitle: 'Lojalumo kortelė',
    demoBadge: 'DEMO · darbuotojo PIN: 1234',
    tiersTitle: 'Prizai pakeliui:',
    tierStamps: (n) => `${n} antspaudai`,
    prizeReady: (r) => `🎉 Jūsų prizas: <strong>${r}</strong>!`,
    oneLeft: 'Liko <strong>1 antspaudas</strong> iki prizo!',
    prizeIs: (r) => `Prizas: ${r}`,
    redeem: '🎁 Atsiimti prizą',
    getStamp: 'Gauti antspaudą',
    staffPress: 'Mygtuką spaudžia darbuotojas pirkimo metu.',
    autoFill: '✨ Užpildyti kortelę (demonstracija)',
    reset: '↺ Pradėti iš naujo',
    installCta: '📲 Įdiegti į telefoną',
    installHint: 'Atidarykite naršyklės meniu (⋮ arba ⋯) ir pasirinkite „Įdiegti programėlę" / „Pridėti prie pradžios ekrano". Veikia kaip programėlė, be App Store.',
    installHintIos: 'Paspauskite „Bendrinti" (Share) ⬆️ naršyklės apačioje ir pasirinkite „Įtraukti į pradžios ekraną".',
    installBtn: 'Pridėti',
    ownerLink: '📊 Kuo tai naudinga verslui? →',
    privacy: '🔒 Jokių asmens duomenų — kortelė saugoma tik Jūsų telefone.',
    demoFooter: 'Demonstracinė versija · projektai777.koduojam@gmail.com',
    celebrateTitle: 'Sveikiname!',
    celebrateBtn: 'Puiku!',
    celebratePrize: (r) => `Jūsų prizas:<br><strong>${r}</strong>`,
    pinTitle: 'Darbuotojo PIN',
    pinHint: 'Parodykite telefoną darbuotojui',
    pinCancel: 'Atšaukti',
    toastRedeemed: 'Prizas atsiimtas! Ačiū 🎉',
    toastStamp: 'Antspaudas pridėtas ⭐',
    toastEmail: '📋 El. paštas nukopijuotas',
    reached: (txt) => `🎁 Pasiekta: ${txt}`,
    errBadPin: 'Neteisingas PIN',
    errRate: 'Per daug bandymų. Palaukite 10 min.',
    errFast: 'Palaukite minutę tarp antspaudų',
    errNotFull: 'Kortelė dar nepilna',
    errDemoOver: 'Demonstracija baigėsi. Dėl pilnos versijos susisiekite el. paštu.',
    errGeneric: 'Klaida. Bandykite dar kartą.',
    errNet: 'Ryšio klaida. Patikrinkite internetą.',
    flowTitle: 'Kaip tai veikia darbuotojui?',
    flow: [
      ['Svečias atidaro kortelę', 'Nuskaito QR kodą prie kasos arba paspaudžia nuorodą telefone'],
      ['Darbuotojas įveda PIN', 'Patvirtina pirkimą trumpu 4 skaitmenų kodu'],
      ['Pridedamas antspaudas', 'Kortelė užsipildo po vieną su kiekvienu apsilankymu'],
      ['Surinko — gauna prizą', 'Svečias atsiima dovaną ir grįžta vėl jos užsidirbti'],
    ],
    // review nudge
    reviewTitle: 'Patiko pas mus?',
    reviewLead: 'Jūsų atsiliepimas labai padėtų. Tai užtruks vos minutę.',
    reviewBtn: '⭐ Palikite atsiliepimą',
    reviewLater: 'Kitą kartą',
    // birthday
    bdayPromptTitle: '🎂 Gimtadienio dovana',
    bdayPromptLead: 'Įveskite gimtadienį ir gaukite dovaną tą dieną — be jokių registracijų.',
    bdaySave: 'Išsaugoti',
    bdaySaved: (r) => `🎂 Jūsų gimtadienio dovana paruošta: <strong>${r}</strong>. Pasimatysime tą dieną!`,
    bdayToday: (r) => `🎉 Su gimtadieniu! Jūsų dovana: <strong>${r}</strong> — parodykite šį ekraną darbuotojui.`,
    bdayChange: 'Pakeisti datą',
    // owner page
    back: '← Atgal į kortelę',
    ownerTag: 'SAVININKO APŽVALGA · iliustracinis pavyzdys',
    whyTitle: 'Kodėl tai apsimoka?',
    whyLead: 'Lojalumo kortelė duoda svečiui priežastį grįžti būtent pas Jus — kad surinktų antspaudus ir atsiimtų prizą. Daugiau grįžtančių svečių reiškia daugiau pakartotinių apsilankymų.',
    chartReturn: 'Klientų grįžtamumas',
    chartNoApp: 'Be programos',
    chartApp: 'Su programa',
    chartNote: '*Iliustracinis pavyzdys, paremtas bendromis lojalumo programų tendencijomis.',
    visitsTitle: 'Apsilankymai per mėnesį',
    visitsNote: 'Svečiai, renkantys antspaudus, grįžta dažniau. *Pavyzdys.',
    roiTitle: 'Kiek tai gali uždirbti?',
    roiLead: 'Pastumkite slankiklius pagal savo verslą — pamatysite apytikslį papildomų pajamų potencialą.',
    roiSpend: 'Vidutinis čekis',
    roiCustomers: 'Klientų per dieną',
    roiResultLabel: 'Papildomos pajamos per metus*',
    roiPerMonth: (v) => `≈ ${v} per mėnesį`,
    roiAssume: '*Skaičiuojama atsargiai: ~25% svečių naudoja kortelę ir grįžta vidutiniškai 1 kartą per mėnesį dažniau. Realūs skaičiai priklauso nuo verslo.',
    qrTitle: 'Išbandykite kitu telefonu',
    qrLead: 'Nuskaitykite QR kodą kitu telefonu — kortelė atsidarys taip, kaip ją matys Jūsų svečias.',
    qrSteps: 'Nuskaitykite QR · rinkite antspaudus · atsiimkite prizą',
    printStandee: '🖨️ Spausdinti stovelį prie kasos →',
    ownerContact: 'Norite to savo restoranui?',
    ownerContactSub: 'Susisiekime →',
    ownerPrivacy: '🔒 Jokių asmens duomenų — viskas saugoma svečio telefone.',
    loadingScan: 'Nuskenuokite parduotuvės QR kodą.',
    loadingNotFound: 'Kortelė nerasta. Patikrinkite QR kodą.',
  },
  en: {
    subtitle: 'Loyalty card',
    demoBadge: 'DEMO · staff PIN: 1234',
    tiersTitle: 'Rewards along the way:',
    tierStamps: (n) => `${n} stamps`,
    prizeReady: (r) => `🎉 Your reward: <strong>${r}</strong>!`,
    oneLeft: '<strong>1 stamp</strong> left until your reward!',
    prizeIs: (r) => `Reward: ${r}`,
    redeem: '🎁 Claim reward',
    getStamp: 'Get a stamp',
    staffPress: 'A staff member taps this button at checkout.',
    autoFill: '✨ Fill the card (demo)',
    reset: '↺ Start over',
    installCta: '📲 Install on your phone',
    installHint: 'Open the browser menu (⋮ or ⋯) and choose “Install app” / “Add to Home screen”. Works like an app, no App Store.',
    installHintIos: 'Tap the Share button ⬆️ at the bottom of the browser and choose “Add to Home Screen”.',
    installBtn: 'Add',
    ownerLink: '📊 How does this help the business? →',
    privacy: '🔒 No personal data — the card is stored only on your phone.',
    demoFooter: 'Demo version · projektai777.koduojam@gmail.com',
    celebrateTitle: 'Congratulations!',
    celebrateBtn: 'Great!',
    celebratePrize: (r) => `Your reward:<br><strong>${r}</strong>`,
    pinTitle: 'Staff PIN',
    pinHint: 'Show your phone to a staff member',
    pinCancel: 'Cancel',
    toastRedeemed: 'Reward claimed! Thank you 🎉',
    toastStamp: 'Stamp added ⭐',
    toastEmail: '📋 Email copied',
    reached: (txt) => `🎁 Reached: ${txt}`,
    errBadPin: 'Wrong PIN',
    errRate: 'Too many attempts. Wait 10 min.',
    errFast: 'Wait a minute between stamps',
    errNotFull: 'The card isn’t full yet',
    errDemoOver: 'The demo has ended. Contact us by email for the full version.',
    errGeneric: 'Something went wrong. Please try again.',
    errNet: 'Connection error. Check your internet.',
    flowTitle: 'How does it work for staff?',
    flow: [
      ['Guest opens the card', 'Scans the QR code at the counter or taps the link on their phone'],
      ['Staff enters the PIN', 'Confirms the purchase with a short 4-digit code'],
      ['A stamp is added', 'The card fills up one stamp at a time, visit by visit'],
      ['Card full — reward earned', 'The guest claims the gift and comes back to earn it again'],
    ],
    reviewTitle: 'Enjoyed your visit?',
    reviewLead: 'A quick review would mean a lot. It takes less than a minute.',
    reviewBtn: '⭐ Leave a review',
    reviewLater: 'Maybe later',
    bdayPromptTitle: '🎂 Birthday gift',
    bdayPromptLead: 'Add your birthday and get a gift on the day — no sign-up needed.',
    bdaySave: 'Save',
    bdaySaved: (r) => `🎂 Your birthday gift is ready: <strong>${r}</strong>. See you on the day!`,
    bdayToday: (r) => `🎉 Happy birthday! Your gift: <strong>${r}</strong> — show this screen to a staff member.`,
    bdayChange: 'Change date',
    back: '← Back to the card',
    ownerTag: 'OWNER OVERVIEW · illustrative example',
    whyTitle: 'Why does it pay off?',
    whyLead: 'A loyalty card gives guests a reason to come back to you specifically — to collect stamps and claim a reward. More returning guests means more repeat visits.',
    chartReturn: 'Customer return rate',
    chartNoApp: 'Without app',
    chartApp: 'With app',
    chartNote: '*Illustrative example based on general loyalty-program trends.',
    visitsTitle: 'Visits per month',
    visitsNote: 'Guests collecting stamps come back more often. *Example.',
    roiTitle: 'How much could it earn?',
    roiLead: 'Drag the sliders to match your business — see the rough extra-revenue potential.',
    roiSpend: 'Average bill',
    roiCustomers: 'Customers per day',
    roiResultLabel: 'Extra revenue per year*',
    roiPerMonth: (v) => `≈ ${v} per month`,
    roiAssume: '*Calculated conservatively: ~25% of guests use the card and return on average 1 extra time per month. Real numbers depend on your business.',
    qrTitle: 'Try it on another phone',
    qrLead: 'Scan the QR code with another phone — the card opens exactly as your guest will see it.',
    qrSteps: 'Scan the QR · collect stamps · claim your reward',
    printStandee: '🖨️ Print a counter standee →',
    ownerContact: 'Want this for your business?',
    ownerContactSub: 'Let’s talk →',
    ownerPrivacy: '🔒 No personal data — everything is stored on the guest’s phone.',
    loadingScan: 'Scan the shop’s QR code.',
    loadingNotFound: 'Card not found. Check the QR code.',
  },
};

function t(key, ...args) {
  const v = (STR[lang] && STR[lang][key] !== undefined) ? STR[lang][key] : STR.lt[key];
  return typeof v === 'function' ? v(...args) : v;
}

// Tenant CONTENT (reward/milestone/birthday text) is authored in Lithuanian.
// Show the optional *_en variant when the UI is in English; otherwise the LT
// original. Business names stay as-is (proper nouns).
function tc(ltVal, enVal) { return (lang === 'en' && enVal) ? enVal : ltVal; }
const rewardText = () => tc(tenant.reward_text, tenant.reward_text_en);
const milestoneText = (m) => tc(m.text, m.text_en);
const birthdayReward = () => tc(tenant.birthday_reward, tenant.birthday_reward_en);

function setLang(next) {
  lang = next === 'en' ? 'en' : 'lt';
  localStorage.setItem('lojalumas_lang', lang);
  document.documentElement.lang = lang;
  applyStaticStrings();
  rerender();
}

function langToggleHtml() {
  const on = (l) => l === lang ? ' lang-on' : '';
  return `<div class="lang-toggle" id="langToggle" role="group" aria-label="Language">
    <button class="lang-btn${on('lt')}" data-lang="lt">LT</button>
    <button class="lang-btn${on('en')}" data-lang="en">EN</button>
  </div>`;
}
function wireLangToggle() {
  const el = document.getElementById('langToggle');
  if (!el) return;
  el.onclick = (e) => { const l = e.target.dataset?.lang; if (l && l !== lang) setLang(l); };
}

// Static strings that live in index.html (modals) — keep them in sync with lang.
function applyStaticStrings() {
  const set = (sel, val) => { const n = document.querySelector(sel); if (n) n.textContent = val; };
  set('#pinTitle', t('pinTitle'));
  set('.pin-hint', t('pinHint'));
  set('#pinCancel', t('pinCancel'));
  set('#celebrateModal h2', t('celebrateTitle'));
  set('#celebrateClose', t('celebrateBtn'));
}

function rerender() {
  if (view === 'owner') renderOwner();
  else if (card) render();
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
let showReview = false; // set right after a reward is redeemed -> review nudge banner

// ---------- rendering ----------
function setTheme() {
  document.getElementById('themeColor').content = tenant.primary_color;
  document.documentElement.style.setProperty('--brand', tenant.primary_color);
  document.title = `${tenant.business_name} — ${t('subtitle').toLowerCase()}`;
  setAppIcon();
}

// Build a SQUARE home-screen icon from the tenant's logo. The logo (often a
// wide wordmark) is drawn centered on a white square, so it (a) looks right as
// an app icon and (b) satisfies Chrome's install rule that needs a real >=192
// square PNG icon. Returns a data: URL, or null if it can't be drawn.
function makeSquareIcon(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous'; // harmless for our same-origin logos; avoids taint
    img.onload = () => {
      try {
        const S = 512, pad = Math.round(S * 0.12);
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, S, S);
        const box = S - pad * 2;
        const r = Math.min(box / img.naturalWidth, box / img.naturalHeight, 1);
        const w = img.naturalWidth * r, h = img.naturalHeight * r;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Point the "add to home screen" shortcut (Android manifest + iOS apple-touch)
// at the tenant's own logo. icon_url (a square asset) is preferred; otherwise we
// square-pad logo_url; if neither works we fall back to the bundled icon so the
// app stays installable no matter what.
async function setAppIcon() {
  const source = tenant.icon_url || tenant.logo_url;
  const absSource = source ? new URL(source, location.href).href : null;
  const icon = (await makeSquareIcon(absSource)) || new URL('./icon-512.png', location.href).href;

  const apple = document.getElementById('appleIcon');
  if (apple) apple.href = icon;

  // Rewrite the PWA manifest so the installed icon + label match the tenant.
  // NOTE: a blob: manifest has no path, so start_url/scope MUST be absolute
  // URLs (relative ones would resolve against the blob and break installability).
  const base = `${location.origin}${location.pathname}`;
  const manifest = {
    id: slug ? `${base}?b=${encodeURIComponent(slug)}` : base,
    name: tenant.business_name,
    short_name: tenant.business_name,
    start_url: slug ? `${base}?b=${encodeURIComponent(slug)}` : base,
    scope: base,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: tenant.primary_color || '#1f2937',
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
  const inner = `${logo}${name}<p class="subtitle">${t('subtitle')}</p>`;
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
      <span class="tier-text"><b>${t('tierStamps', m.at)}</b> · ${m.text}</span></div>`;
  }).join('');
  return `<div class="tiers"><p class="tiers-title">${t('tiersTitle')}</p>${items}</div>`;
}

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function installHintHtml() {
  if (isStandalone) return ''; // already installed — nothing to prompt
  const steps = isIos ? t('installHintIos') : t('installHint');
  // The button is ALWAYS shown (the app is installable): if Chrome gave us the
  // native prompt we fire it on tap; otherwise we reveal the menu steps, since
  // beforeinstallprompt doesn't fire on iOS or right after an uninstall.
  return `<div class="install-hint" id="installHint">
    <button class="install-btn" id="installBtn">${t('installCta')}</button>
    <p class="install-steps" id="installSteps" hidden>${steps}</p></div>`;
}
function wireInstall() {
  const btn = document.getElementById('installBtn');
  if (!btn) return;
  btn.onclick = async () => {
    const prompt = deferredInstall || window.__bip;
    if (prompt) {
      prompt.prompt();
      try { await prompt.userChoice; } catch { /* ignore */ }
      deferredInstall = null; window.__bip = null;
      return;
    }
    const steps = document.getElementById('installSteps');
    if (steps) steps.hidden = !steps.hidden; // reveal the manual instructions
  };
}

function staffFlowHtml() {
  const icons = ['📱', '🔢', '⭐', '🎁'];
  const cells = t('flow').map(([title, sub], i) => `
    <div class="flow-step">
      <div class="flow-num">${i + 1}</div>
      <div class="flow-body"><span class="flow-icon">${icons[i]}</span><b>${title}</b><p>${sub}</p></div>
    </div>${i < 3 ? '<div class="flow-arrow">▼</div>' : ''}`).join('');
  return `<section class="flow-wrap"><h3 class="flow-title">${t('flowTitle')}</h3><div class="flow">${cells}</div></section>`;
}

function ctaHtml() {
  const ownerUrl = `?b=${encodeURIComponent(slug)}&view=owner`;
  return `<a class="pitch-owner" href="${ownerUrl}">${t('ownerLink')}</a>`;
}

// ---------- birthday reward ----------
const bdayKey = `lojalumas_bday_${slug}`;
function loadBday() {
  try { return JSON.parse(localStorage.getItem(bdayKey) || 'null'); } catch { return null; }
}
function isBirthdayToday(md) {
  if (!md) return false;
  const d = new Date();
  const today = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return md === today;
}
function birthdayHtml() {
  if (!tenant.birthday_reward) return '';
  const saved = loadBday();
  const reward = tenant.birthday_reward;
  if (saved && saved.md) {
    if (isBirthdayToday(saved.md)) {
      return `<div class="bday-card bday-today">${t('bdayToday', reward)}</div>`;
    }
    return `<div class="bday-card">
      <p>${t('bdaySaved', reward)}</p>
      <button class="bday-change" id="bdayChange">${t('bdayChange')}</button></div>`;
  }
  return `<div class="bday-card bday-prompt">
    <h3>${t('bdayPromptTitle')}</h3>
    <p>${t('bdayPromptLead')}</p>
    <div class="bday-row">
      <input type="date" id="bdayInput" class="bday-input" aria-label="${t('bdayPromptTitle')}">
      <button class="bday-save" id="bdaySave">${t('bdaySave')}</button>
    </div></div>`;
}
function wireBirthday() {
  const save = document.getElementById('bdaySave');
  if (save) {
    save.onclick = () => {
      const val = document.getElementById('bdayInput')?.value; // yyyy-mm-dd
      if (!val || val.length < 10) return;
      const md = val.slice(5); // mm-dd — store only month+day, never the year (less data, still no PII)
      localStorage.setItem(bdayKey, JSON.stringify({ md }));
      render();
    };
  }
  const change = document.getElementById('bdayChange');
  if (change) change.onclick = () => { localStorage.removeItem(bdayKey); render(); };
}

// ---------- review nudge (after redeeming a reward) ----------
function reviewBannerHtml() {
  if (!showReview || !tenant.google_review_url) return '';
  return `<div class="review-nudge" id="reviewNudge">
    <h3>${t('reviewTitle')}</h3>
    <p>${t('reviewLead')}</p>
    <a class="review-go" href="${tenant.google_review_url}" target="_blank" rel="noopener">${t('reviewBtn')}</a>
    <button class="review-later" id="reviewLater">${t('reviewLater')}</button>
  </div>`;
}
function wireReview() {
  const later = document.getElementById('reviewLater');
  if (later) later.onclick = () => { showReview = false; render(); };
  const go = document.querySelector('#reviewNudge .review-go');
  if (go) go.addEventListener('click', () => { showReview = false; });
}

function render() {
  setTheme();
  const full = card.stamps >= tenant.stamps_needed;

  const stampIcon = tenant.stamp_icon || '🍴'; // restaurant-flavored default; per-tenant override
  const grid = Array.from({ length: tenant.stamps_needed }, (_, i) => {
    const filled = i < card.stamps;
    const milestone = (tenant.milestones || []).some((m) => m.at === i + 1);
    const glyph = filled ? stampIcon : (milestone ? '🎁' : '');
    return `<div class="stamp ${filled ? 'filled' : ''} ${milestone ? 'stamp-milestone' : ''}" style="animation-delay:${i * 40}ms">${glyph}</div>`;
  }).join('');

  const remaining = tenant.stamps_needed - card.stamps;
  const statusLine = full
    ? t('prizeReady', tenant.reward_text)
    : remaining === 1
      ? t('oneLeft')
      : t('prizeIs', tenant.reward_text);

  app.innerHTML = `
    ${langToggleHtml()}
    ${isDemo ? `<div class="demo-badge">${t('demoBadge')}</div>` : ''}
    ${headerHtml()}
    ${reviewBannerHtml()}

    <section class="card-box ${full ? 'card-full' : ''}">
      <div class="card-accent"></div>
      <div class="stamp-grid" style="--cols:${Math.min(tenant.stamps_needed, 5)}">${grid}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${(card.stamps / tenant.stamps_needed) * 100}%"></div></div>
      <p class="progress">${card.stamps} / ${tenant.stamps_needed}</p>
      <p class="reward ${full ? 'reward-ready' : ''}">${statusLine}</p>
    </section>
    ${tiersHtml()}

    <button class="cta" id="actionBtn">${full ? t('redeem') : t('getStamp')}</button>
    <p class="small-print">${t('staffPress')}</p>
    ${isPreview && !full ? `<button class="cta cta-demo" id="autoFillBtn">${t('autoFill')}</button>` : ''}
    ${isPreview ? `<button class="reset-link" id="resetBtn">${t('reset')}</button>` : ''}
    ${birthdayHtml()}
    ${installHintHtml()}
    ${isPreview ? staffFlowHtml() : ''}
    ${isPreview ? ctaHtml() : ''}
    <p class="privacy">${t('privacy')}</p>
    ${isDemo ? `<p class="small-print">${t('demoFooter')}</p>` : ''}
  `;

  document.getElementById('actionBtn').onclick = () => openPinPad(full ? 'redeem_reward' : 'add_stamp');
  const af = document.getElementById('autoFillBtn'); if (af) af.onclick = autoFill;
  const rs = document.getElementById('resetBtn'); if (rs) rs.onclick = resetCard;
  wireLangToggle();
  wireBirthday();
  wireReview();
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
  if (txt) txt.innerHTML = t('celebratePrize', rewardText);
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
    if (m) toast(t('reached', m.text));
  }
}

function resetCard() {
  card.stamps = 0;
  showReview = false;
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
  el.innerHTML = `<img class="qr-img" alt="QR — ${tenant.business_name}" src="${qrSrc(targetUrl, 400)}">`;
}

// ---------- ROI calculator (owner page) ----------
const euro = (n) => '€' + Math.round(n).toLocaleString('lt-LT');
function roiYearly(spend, customers) {
  // Conservative model: a share of guests join the card and come back ~1
  // extra time per month. Extra annual revenue = customers/day * adoption
  // * 12 extra visits/yr * average bill. Adoption fixed at 25% (defensible).
  const adoption = 0.25;
  return customers * adoption * 12 * spend;
}
function roiHtml() {
  const spend = 12, customers = 80; // sensible starting point for a café/restaurant
  return `<section class="panel roi">
    <h3>${t('roiTitle')}</h3>
    <p class="panel-lead">${t('roiLead')}</p>
    <label class="roi-field">
      <span class="roi-label">${t('roiSpend')}: <b id="roiSpendVal">${euro(spend)}</b></span>
      <input type="range" id="roiSpend" min="3" max="60" step="1" value="${spend}">
    </label>
    <label class="roi-field">
      <span class="roi-label">${t('roiCustomers')}: <b id="roiCustVal">${customers}</b></span>
      <input type="range" id="roiCust" min="10" max="400" step="5" value="${customers}">
    </label>
    <div class="roi-result">
      <span class="roi-result-label">${t('roiResultLabel')}</span>
      <span class="roi-amount" id="roiYear">${euro(roiYearly(spend, customers))}</span>
      <span class="roi-month" id="roiMonth">${t('roiPerMonth', euro(roiYearly(spend, customers) / 12))}</span>
    </div>
    <p class="chart-note">${t('roiAssume')}</p>
  </section>`;
}
function wireRoi() {
  const spendEl = document.getElementById('roiSpend');
  const custEl = document.getElementById('roiCust');
  if (!spendEl || !custEl) return;
  const update = () => {
    const spend = +spendEl.value, customers = +custEl.value;
    document.getElementById('roiSpendVal').textContent = euro(spend);
    document.getElementById('roiCustVal').textContent = customers;
    const yearly = roiYearly(spend, customers);
    document.getElementById('roiYear').textContent = euro(yearly);
    document.getElementById('roiMonth').textContent = t('roiPerMonth', euro(yearly / 12));
  };
  spendEl.oninput = update;
  custEl.oninput = update;
}

function renderOwner() {
  setTheme();
  const cardUrl = `${location.origin}${location.pathname}?b=${encodeURIComponent(slug)}`;
  const standeeUrl = `tools/standee.html?b=${encodeURIComponent(slug)}`;
  app.innerHTML = `
    ${langToggleHtml()}
    <a class="back-link" href="?b=${encodeURIComponent(slug)}">${t('back')}</a>
    ${headerHtml()}
    <div class="owner-tag">${t('ownerTag')}</div>

    <section class="panel">
      <h3>${t('whyTitle')}</h3>
      <p class="panel-lead">${t('whyLead')}</p>
      ${barChart(t('chartReturn'), 32, 61, t('chartNoApp'), t('chartApp'), t('chartNote'))}
    </section>

    <section class="panel">
      <h3>${t('visitsTitle')}</h3>
      ${sparkline([28, 33, 41, 48, 58, 71])}
      <p class="chart-note">${t('visitsNote')}</p>
    </section>

    ${roiHtml()}

    <section class="panel qr-test">
      <h3>${t('qrTitle')}</h3>
      <p class="panel-lead">${t('qrLead')}</p>
      <div class="standee-mock">
        <div class="standee-top"></div>
        <p class="sm-name">${tenant.business_name}</p>
        <p class="sm-reward">${tenant.reward_text}</p>
        <div id="standeeQr"></div>
        <p class="sm-steps">${t('qrSteps')}</p>
      </div>
      <a class="pitch-owner" href="${standeeUrl}">${t('printStandee')}</a>
    </section>

    <button class="cta cta-contact" id="copyEmailBtn">${t('ownerContact')}<span>${t('ownerContactSub')}</span></button>
    <p class="privacy">${t('ownerPrivacy')}</p>
  `;
  drawQr(cardUrl);
  wireLangToggle();
  wireRoi();
  const ce = document.getElementById('copyEmailBtn');
  if (ce) ce.onclick = copyEmail;
}

const CONTACT_EMAIL = 'projektai777.koduojam@gmail.com';
function copyEmail() {
  const done = () => toast(t('toastEmail'));
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
        showReview = !!tenant.google_review_url; // nudge a review right after the reward
        render();
        toast(t('toastRedeemed'));
      } else {
        card.stamps = res.stamps;
        render();
        if (res.full) celebrate(tenant.reward_text);
        else toast(t('toastStamp'));
      }
    } else {
      const msg = {
        bad_pin: t('errBadPin'),
        rate_limited: t('errRate'),
        too_fast: t('errFast'),
        card_not_full: t('errNotFull'),
        demo_over: t('errDemoOver'),
      }[res.error] || t('errGeneric');
      toast(msg, true);
    }
  } catch {
    toast(t('errNet'), true);
  }
}

function toast(text, isError = false) {
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'toast-err' : ''}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---------- boot ----------
(async () => {
  document.documentElement.lang = lang;
  buildPad();
  applyStaticStrings();
  const celebrateCloseBtn = document.getElementById('celebrateClose');
  if (celebrateCloseBtn) celebrateCloseBtn.onclick = () => document.getElementById('celebrateModal').close();
  deferredInstall = window.__bip || null; // event may have fired before this module ran
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; window.__bip = e; });
  window.addEventListener('appinstalled', () => { deferredInstall = null; window.__bip = null; });
  try {
    if (!slug && !isDemo) {
      // Installed-PWA launch loses the ?b= param: restore the last card.
      const last = localStorage.getItem('lojalumas_last');
      if (last) { location.replace(`?b=${encodeURIComponent(last)}`); return; }
      app.innerHTML = `<div class="loading">${t('loadingScan')}</div>`;
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
    app.innerHTML = `<div class="loading">${t('loadingNotFound')}</div>`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
