// =============================================================
// Lojalumas — multi-tenant PWA stamp card
// Tenant is resolved from the URL path:  kortele.lt/coffeebox
// All branding/config comes from the tenant_public view.
//
// Stamps are authorised with a ROTATING staff code (TOTP, see totp.js):
// staff read a 6-digit code / QR off the password-gated /tools/staff.html
// and the customer enters or scans it on their OWN phone — the phone never
// changes hands. The code rotates every 30 s, so it can't be reused.
//
// © 2026 Lojalumas. All rights reserved. Proprietary — see LICENSE.
// Unauthorized copying, hosting, or redistribution is prohibited.
// =============================================================

import TENANTS from './tenants.js';
import { verifyCode, currentCode, TOTP_DIGITS } from './totp.js';

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

// =============================================================
// Anonymous stamp counter (optional server). Lets the OWNER see how many
// stamps were granted per day — a staff member quietly QR-sharing with friends
// then shows up as an unusual burst. COUNT-ONLY: we send no device id, phone,
// IP, or anything that links a scan to a person, so this stays GDPR-clean like
// the rest of the product. The endpoint lives in counter-endpoint.json so the
// backend (Cloudflare Worker today) is swappable without touching this file.
// Best-effort: if the server is unreachable the card works exactly as before —
// the stamp is still granted on the guest's phone; only the tally pauses.
// =============================================================
const Counter = {
  _base: undefined, // undefined = not loaded; null = disabled/unavailable
  async _resolve() {
    if (this._base !== undefined) return this._base;
    try {
      const r = await fetch('counter-endpoint.json', { cache: 'no-store' });
      const j = await r.json();
      this._base = (j && j.enabled && j.base) ? j.base.replace(/\/$/, '') : null;
    } catch { this._base = null; }
    return this._base;
  },
  // Fire-and-forget; never throws, never blocks the stamp UX.
  hit(kind /* 'stamp' | 'redeem' */) {
    if (isPreview) return; // demo/preview aren't real stamps — don't pollute counts
    this._resolve().then((base) => {
      if (!base) return;
      const q = `b=${encodeURIComponent(slug)}&kind=${kind === 'redeem' ? 'redeem' : 'stamp'}`;
      fetch(`${base}/grant?${q}`, { method: 'POST', keepalive: true }).catch(() => {});
    }).catch(() => {});
  },
  async stats() {
    const base = await this._resolve();
    if (!base) return null;
    try {
      const r = await fetch(`${base}/stats?b=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const j = await r.json();
      return j && j.ok ? j : null;
    } catch { return null; }
  },
};

// =============================================================
// Anonymous card recovery ("coat-check ticket"). Backs the card up under a random
// CODE that identifies the CARD, not the person — no name/phone/email/device id,
// so it stays GDPR-clean. Lose the phone -> enter the code on a new phone ->
// stamps restored. Same optional server as Counter (counter-endpoint.json); if it
// is disabled the whole feature hides and the card works exactly as before.
// =============================================================
const Recovery = {
  _codeKey: `lojalumas_rcode_${slug}`,
  async available() { return !isPreview && !!(await Counter._resolve()); }, // off in demo/preview
  code() { return localStorage.getItem(this._codeKey) || null; },
  _setCode(c) { if (c) localStorage.setItem(this._codeKey, c); },
  // Upload current stamps. Reuses the stored code so re-saves update the same
  // backup. Returns the code on success, or null (never throws).
  async save(stamps) {
    const base = await Counter._resolve();
    if (!base || isPreview) return null;
    try {
      const existing = this.code();
      const q = `b=${encodeURIComponent(slug)}&stamps=${stamps}${existing ? `&code=${encodeURIComponent(existing)}` : ''}`;
      const r = await fetch(`${base}/recover/save?${q}`, { method: 'POST' });
      const j = await r.json();
      if (j && j.ok && j.code) { this._setCode(j.code); return j.code; }
    } catch { /* offline — keep working, backup just isn't updated */ }
    return null;
  },
  // Best-effort background save after a stamp changes (doesn't block UI).
  autoSave(stamps) { if (this.code()) this.save(stamps); }, // only if a backup already exists
  async load(code) {
    const base = await Counter._resolve();
    if (!base) return null;
    try {
      const r = await fetch(`${base}/recover/load?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const j = await r.json();
      return j && j.ok ? j : null;
    } catch { return null; }
  },
};

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
    demoBadge: 'DEMO · darbuotojo QR keičiasi kas 30 s',
    tiersTitle: 'Prizai pakeliui:',
    tierStamps: (n) => `${n} antspaudai`,
    prizeReady: (r) => `🎉 Jūsų prizas: <strong>${r}</strong>!`,
    oneLeft: 'Liko <strong>1 antspaudas</strong> iki prizo!',
    prizeIs: (r) => `Prizas: ${r}`,
    redeem: '🎁 Atsiimti prizą',
    getStamp: '📷 Atidaryti kamerą',
    staffPress: 'Darbuotojas parodys QR kodą — nuskaitykite jį telefonu, kad gautumėte antspaudą.',
    staffPressDemo: 'Demonstracija: palieskite, kad pamatytumėte, kaip svečias nuskaito darbuotojo QR ir gauna antspaudą.',
    savedHint: 'Jūsų antspaudai išsaugomi telefone — diegti nieko nereikia.',
    autoFill: '✨ Užpildyti kortelę (demonstracija)',
    reset: '↺ Pradėti iš naujo',
    ownerLink: '📊 Kuo tai naudinga verslui? →',
    privacy: '🔒 Jokių asmens duomenų — kortelė saugoma tik Jūsų telefone.',
    demoFooter: 'Demonstracinė versija · projektai777.koduojam@gmail.com',
    celebrateTitle: 'Sveikiname!',
    celebrateBtn: 'Puiku!',
    celebratePrize: (r) => `Jūsų prizas:<br><strong>${r}</strong>`,
    scanTitle: 'Nuskaitykite darbuotojo QR',
    scanHint: 'Nukreipkite kamerą į darbuotojo QR kodą — antspaudas užsiskaitys automatiškai.',
    scanFallback: 'Atidarykite telefono kameros programėlę ir nukreipkite ją į darbuotojo QR kodą — kortelė atsidarys ir antspaudas užsiskaitys pats.',
    scanCancel: 'Atšaukti',
    toastRedeemed: 'Prizas atsiimtas! Ačiū 🎉',
    toastStamp: 'Antspaudas pridėtas ⭐',
    toastEmail: '📋 El. paštas nukopijuotas',
    reached: (txt) => `🎁 Pasiekta: ${txt}`,
    errBadPin: 'Neteisingas arba pasenęs kodas',
    errRate: 'Per daug bandymų. Palaukite 10 min.',
    errDailyDone: 'Šiandien antspaudas jau gautas. Užsukite rytoj! 🙂',
    errNotFull: 'Kortelė dar nepilna',
    errDemoOver: 'Demonstracija baigėsi. Dėl pilnos versijos susisiekite el. paštu.',
    errGeneric: 'Klaida. Bandykite dar kartą.',
    errNet: 'Ryšio klaida. Patikrinkite internetą.',
    flowTitle: 'Kaip tai veikia darbuotojui?',
    flow: [
      ['Darbuotojas parodo QR', 'Atsidaro savo kodų puslapį — QR keičiasi kas 30 s'],
      ['Svečias nuskaito sava kamera', 'Tuo pačiu nuskaitymu iškart atsidaro kortelė IR pridedamas antspaudas (telefono atiduoti nereikia)'],
      ['Antspaudas pridėtas', 'Po vieną su kiekvienu apsilankymu (1 per dieną)'],
      ['Surinko — gauna prizą', 'Svečias atsiima dovaną ir grįžta vėl jos užsidirbti'],
    ],
    // review nudge
    reviewTitle: 'Patiko pas mus?',
    reviewLead: 'Jūsų atsiliepimas labai padėtų. Tai užtruks vos minutę.',
    reviewBtn: '⭐ Palikite atsiliepimą',
    reviewLater: 'Kitą kartą',
    // birthday
    bdayPromptTitle: '🎂 Gimtadienio dovana',
    bdayShowId: (r) => `Gimtadienio proga Jūsų laukia <strong>${r}</strong>. Tą dieną parodykite asmens dokumentą darbuotojui ir paspauskite „Atsiimti dovaną" — jokių registracijų ar sąlygų. <strong>⚠️ Dovaną atsiimkite tik vietoje, restorane, darbuotojo akivaizdoje</strong> — atsiėmus iš anksto, tą dieną jos nebegalėsite panaudoti.`,
    bdayClaimBtn: '🎁 Atsiimti dovaną',
    bdayConfirmQ: 'Dovaną galima atsiimti tik kartą per dieną ir tik vietoje, restorane, darbuotojo akivaizdoje. Atsiimti dabar?',
    bdayConfirmYes: '✓ Taip, atsiimti',
    bdayConfirmNo: 'Atšaukti',
    pinHintBday: '⚠️ Darbuotojas: patikrinkite kliento asmens dokumentą (gimimo datą), tada parodykite kodą.',
    bdayClaimed: (ago) => `✅ Gimtadienio dovana jau atsiimta ${ago}.`,
    agoNow: 'ką tik',
    agoSec: (n) => `prieš ${n} s`,
    agoMin: (n) => `prieš ${n} min`,
    agoHour: (n) => `prieš ${n} val.`,
    bdayNote: 'Atnaujinama kasdien (vidurnaktį); gimimo datos nesaugome.',
    bdayNoteDemo: ' Demo režime galima kartoti.',
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
    qrLeadDemo: 'Nuskaitykite šį QR kitu telefonu — šiame demonstraciniame režime jis veikia kaip darbuotojo kodas: kortelė atsidarys ir iškart bus pridėtas antspaudas, lygiai kaip tikram svečiui.',
    qrSteps: 'Nuskaitykite QR · rinkite antspaudus · atsiimkite prizą',
    startTitle: 'Kaip pradedame?',
    startSteps: [
      ['📩', 'Paliekate užklausą', 'Parašote mums — atsakome per 1 darbo dieną.'],
      ['🎨', 'Pritaikome pagal Jus', 'Suderiname dizainą, prizus ir funkcijas pagal Jūsų verslą — be jokių įsipareigojimų.'],
      ['📄', 'Pasirašome aiškią sutartį', 'Fiksuota 1000 € kaina, 1 metai palaikymo, jokių prenumeratų.'],
      ['✅', 'Atsiskaitote', 'Kai rezultatas atitinka tai, ko reikia Jūsų verslui.'],
    ],
    ctaLead: 'Vienkartinė investicija, kuri dirba kiekvieną dieną — be mėnesinių mokesčių.',
    ownerContact: 'Pasiruošę pradėti?',
    ownerContactSub: 'Susisiekime →',
    ownerPrivacy: '🔒 Jokių asmens duomenų — viskas saugoma svečio telefone.',
    faqTitle: 'Dažniausiai užduodami klausimai',
    faq: [
      ['Kaip veikia lojalumo kortelė?',
        'Darbuotojas parodo QR kodą (jis keičiasi kas 30 sekundžių). Svečias jį nuskaito savo telefono kamera — ir iškart, tuo pačiu nuskaitymu, atsidaro Jūsų prekės ženklo kortelė ir pridedamas antspaudas. Nieko diegti ar atidaryti iš anksto nereikia, telefono atiduoti taip pat. Kitą kartą svečias atsidaro tą pačią kortelę ir vėl nuskaito darbuotojo QR (vienas antspaudas per dieną). Surinkęs reikiamą skaičių, atsiima prizą ir grįžta vėl jo užsidirbti.'],
      ['Ar reikia specialios įrangos ar programėlės iš App Store?',
        'Ne. Viskas veikia telefono naršyklėje — nereikia atsisiuntimų iš App Store / Google Play. Svečias gali pridėti kortelę į pradžios ekraną ir naudoti ją kaip programėlę.'],
      ['Kiek tai kainuoja?',
        '<strong>1000 € vienkartinis mokestis</strong> už visą sukurtą produktą — <strong>jokių mėnesinių ar metinių mokesčių</strong>. Talpinimą tvarkome mes, o sprendimas neturi nei duomenų bazės, nei SMS ar el. laiškų siuntimo, todėl ir jokių nuolatinių jų išlaidų nėra (jei norite savo domeno, jį pridedate įprastai — tai vienintelė nuo Jūsų priklausanti smulki išlaida). Įskaičiuoti <strong>pirmi metai nemokamo palaikymo</strong> (klaidų taisymas, smulkūs pakeitimai). Palyginkite: dauguma lojalumo programėlių yra prenumeratos po ~25–80 €/mėn. (~300–960 €/metus, ir taip be galo), o versijos su <strong>Jūsų</strong> prekės ženklu ir domenu — pačios brangiausios, dažnai 60–80 €/mėn. ir daugiau. Būtent tokį, pilnai prie Jūsų prekės ženklo pritaikytą sprendimą gaunate čia — tik už vieną vienkartinį mokestį. <strong>Palyginti su tokia prenumerata, sprendimas atsiperka jau maždaug per pirmus metus, o kiekvieni tolesni metai — visiškai nemokami.</strong> O pigiausios ~30 €/mėn. prenumeratos pigios neatsitiktinai: už jas gaunate griežtą šabloną su <strong>svetimu</strong> prekės ženklu, be savo domeno, ir liekate įkalinti svetimoje platformoje mokėdami be galo. Rinkdamiesi tokią prenumeratą prarandate būtent tai, ką su mumis gaunate iškart — pilną pritaikymą <strong>Jūsų</strong> prekės ženklui, savo domeną, nepriklausomybę ir vieną vienkartinį mokėjimą. O ir grynais pinigais: net prieš tokią pigiausią prenumeratą maždaug nuo trečių metų esate priekyje ir toliau nemokate nieko. <strong>Kodėl tai geriau už prenumeratą:</strong> nemokate be galo, niekas „neįkalina" Jūsų svetimoje platformoje, produktas lieka su <strong>Jūsų</strong> prekės ženklu, o pakeitimai daromi būtent Jums, o ne pagal griežtą šabloną. Rimtos agentūros individualų tokį sprendimą paprastai įkainoja <strong>3 000–8 000 €</strong> (pilna mobilioji iOS/Android programėlė su integracijomis — 15 000 € ir daugiau), dažnai dar su mėnesiniu palaikymo mokesčiu — todėl 1000 € vienkartinė kaina yra itin palanki. Ir nors mokate kelis kartus mažiau, nieko neprarandate: tai <strong>ne griežtas šablonas, o pagal Jūsų verslą individualiai sukurta ir labai lanksti web programėlė</strong> — prizų pakopas, spalvas, kalbas, gimtadienio dovanas ar net visiškai naujas funkcijas pritaikome būtent Jums, ir bet kada galime papildyti ar pakeisti. Veikia tiesiog telefono naršyklėje (jokių diegimų iš App Store), o kortelę vis tiek galima įsidėti į pradžios ekraną kaip programėlę.'],
      ['Kuo skiriatės nuo kitų lojalumo programėlių?',
        '<strong>Jokių mėnesinių mokesčių.</strong> Dauguma lojalumo programėlių — prenumeratos (~25–80 €/mėn., ir taip be galo), įspraudžiančios Jus į griežtą šabloną su svetimu prekės ženklu. Pas mus sumokate <strong>vieną kartą</strong>, o programėlę <strong>pritaikome būtent Jūsų verslui</strong>: prizų pakopas, spalvas, kalbas (LT, EN ar bet kurią kitą), gimtadienio dovanas, net visiškai naujas funkcijas. Viskas su <strong>Jūsų prekės ženklu</strong> (ir, jei norite, Jūsų domenu) — produktą naudojate neterminuotai, be priklausomybės nuo svetimos platformos. Palaikymas greitas ir asmeniškas, o klientams nereikia jokios registracijos (privatumas). Finansiškai irgi laimite: lyginant su panašia prekės ženklo prenumerata (~60–80 €/mėn.), <strong>vienkartinis mokestis atsiperka maždaug per pirmus metus</strong>, o vėliau nemokate nieko.'],
      ['Ar tai saugu? Kaip su privatumu ir sukčiavimu?',
        '<strong>Privatumas:</strong> nerenkame jokių asmens duomenų — kortelė saugoma tik svečio telefone, todėl nelieka ir GDPR (Bendrasis duomenų apsaugos reglamentas) rūpesčių dėl klientų sąrašų. <strong>Sukčiavimas:</strong> antspaudą galima pridėti tik nuskaičius darbuotojo QR kodą, kuris keičiasi kas 30 sekundžių, tad svečias negali prisidėti jo pats ir negali pakartotinai panaudoti pamatyto kodo; be to, vienam telefonui leidžiamas tik <strong>vienas antspaudas per dieną</strong> (atsistato vidurnaktį). <strong>Darbuotojų kontrolė:</strong> savininko apžvalgoje rodomas <strong>anoniminis dienos antspaudų skaitiklis</strong> — staiga šoktelėjęs skaičius iškart parodo neįprastą veiklą (pvz. jei darbuotojas dalintųsi QR kodu su pažįstamais). Skaičiuojami tik antspaudai — <strong>jokių asmens duomenų</strong>, todėl GDPR atžvilgiu lieka tokia pat švari kaip ir visa sistema. Specialios dovanos (pvz. gimtadienio) atiduodamos tik darbuotojui patikrinus asmens dokumentą ir tik kartą per metus. <strong>Saugiausias prizo tipas — nuolaida</strong> (pvz. −20 % sąskaitai): net jei klientas rastų būdą apgauti sistemą, jis vis tiek turi išleisti pinigų, nes nuolaida taikoma tik apmokamam pirkiniui — skirtingai nei visiškai nemokamas prizas.'],
      ['Kas gali atidaryti darbuotojų QR kodo puslapį?',
        'Tik Jūs (savininkas) ir Jūsų personalas. Darbuotojų kodo puslapis apsaugotas <strong>slaptažodžiu, kurį žinote tik Jūs</strong>, ir jį atidarote <strong>savo restorano planšetėse ar telefonuose</strong>, kuriais naudojasi personalas. Svečiai šio puslapio nemato ir prie jo neprieina — jie tik nuskaito ekrane rodomą QR kodą. Taip antspaudą gali pridėti tik darbuotojas.'],
      ['Ar galima naudoti su mano įmonės domenu ir svetaine?',
        'Taip. Kortelę galime paleisti Jūsų pačių adresu, pvz. <em>kortele.jusuimone.lt</em>. Turintiems domeną: Jūs (arba Jūsų svetainės administratorius) pridedate <strong>vieną mūsų pateiktą DNS įrašą</strong> naujam adresui — esami įrašai (svetainė, el. paštas) lieka nepaliesti, o talpinimą ir saugų <strong>HTTPS</strong> ryšį sutvarkome mes. <strong>Slaptažodžių ar prieigos prie Jūsų svetainės duoti nereikia</strong>, ir bet kada tai galima atšaukti. Kortelė veikia atskirai ir nekeičia esamos svetainės — tiesiog galite pridėti mygtuką „Lojalumo kortelė". Viskas su Jūsų prekės ženklu.'],
      ['Ar klientams reikia registruotis? Ką jie gauna?',
        'Ne — jokios registracijos, el. pašto ar telefono numerio. Svečias atidaro kortelę ir iškart pradeda rinkti antspaudus, viskas išsaugoma jo telefone. Paprasta ir greita, todėl kortele naudojasi daugiau svečių.'],
      ['Kaip greitai galima pradėti? Ko reikia iš manęs?',
        'Paprastai per kelias dienas. Iš Jūsų reikia: logotipo, spalvų, prizo sąlygų (pvz. „10-as patiekalas nemokamai"). Mes viską sukonfigūruojame, atsiunčiame kortelės nuorodą ir darbuotojų kodų puslapį, kurį atsidaro personalas.'],
      ['Ar galima pritaikyti pagal mano verslo poreikius?',
        'Taip — viską galima pritaikyti: prizų skaičių ir pakopas, spalvas, tekstus, kalbą (LT, EN ar bet kurią kitą), gimtadienio dovanas, atsiliepimų skatinimą, net visiškai naujas funkcijas. Pasakykite, ko reikia Jūsų verslui, ir tai įgyvendinsime.'],
      ['Kaip vyksta sutartis ir atsiskaitymas?',
        'Pasirašome trumpą, aiškią paslaugų sutartį: kas sukuriama, kaina, terminai, 1 metų palaikymas ir kad gatavą produktą galite naudoti neterminuotai (be prenumeratų). Atsiskaitoma dviem dalimis: 30 % avansas pasirašius, 70 % pridavus darbus (banko pavedimu, gaunate sąskaitą faktūrą). Jokios biurokratijos iš Jūsų pusės. Jei domina, sutarties pavyzdį galime atsiųsti el. paštu.'],
      ['Kaip veikia 1 metų palaikymas?',
        'Pirmus <strong>12 mėn. palaikymas — nemokamas</strong>. Tereikia parašyti, ir smulkius pakeitimus (tekstai, spalvos, prizai) dažniausiai įgyvendiname <strong>per kelias valandas</strong>. Didelės naujos funkcijos, nauji puslapiai ar atskiri projektai — pagal atskirą sutartį ir įkainį (kad būtų sąžininga abiem pusėms). Po metų produktas toliau veikia be jokių privalomų mokesčių; pakeitimai — pagal poreikį už fiksuotą kainą, jokių prenumeratų.'],
    ],
    loadingScan: 'Nuskenuokite parduotuvės QR kodą.',
    loadingNotFound: 'Kortelė nerasta. Patikrinkite QR kodą.',
    recTitle: '💾 Išsaugokite kortelę',
    recNewLead: 'Pakeitę ar pametę telefoną neprarasite antspaudų — išsaugokite atkūrimo kodą ir bet kada atkurkite kortelę kitame telefone. Jokių asmens duomenų: kodas susietas su kortele, ne su Jumis.',
    recSaveBtn: '💾 Išsaugoti kortelę',
    recSaving: 'Saugoma…',
    recSavedLead: 'Jūsų atkūrimo kodas. Užsirašykite arba nufotografuokite — pametę telefoną įveskite jį naujame ir antspaudai grįš.',
    recCopy: 'Kopijuoti',
    recNote: '🔒 Saugokite kodą saugiai — kas jį turi, gali atkurti šią kortelę. Jokių asmens duomenų nesaugome.',
    recHaveCode: 'Turite kodą iš kito telefono? Atkurti →',
    recPlaceholder: 'pvz. BERN-7F3K-9QX2',
    recRestoreBtn: 'Atkurti kortelę',
    recRestoring: 'Atkuriama…',
    recSavedToast: '💾 Kortelė išsaugota',
    recCopiedToast: '📋 Kodas nukopijuotas',
    recRestoredToast: '✅ Kortelė atkurta',
    recBadCode: 'Kodas nerastas. Patikrinkite ir bandykite dar kartą.',
    demoStaffTitle: '🔑 Darbuotojo puslapis (demonstracijai)',
    demoStaffLead: 'Atidarykite darbuotojo kodų puslapį kitame įrenginyje ir suveskite slaptažodį, kad pamatytumėte besikeičiantį QR kodą:',
    demoStaffOpen: 'Atidaryti darbuotojo puslapį →',
    demoStaffPass: 'Slaptažodis',
  },
  en: {
    subtitle: 'Loyalty card',
    demoBadge: 'DEMO · staff QR rotates every 30 s',
    tiersTitle: 'Rewards along the way:',
    tierStamps: (n) => `${n} stamps`,
    prizeReady: (r) => `🎉 Your reward: <strong>${r}</strong>!`,
    oneLeft: '<strong>1 stamp</strong> left until your reward!',
    prizeIs: (r) => `Reward: ${r}`,
    redeem: '🎁 Claim reward',
    getStamp: '📷 Open camera',
    staffPress: 'Staff will show a QR code — scan it with your phone to get a stamp.',
    staffPressDemo: 'Demo: tap to see how a guest scans the staff QR and gets a stamp.',
    savedHint: 'Your stamps are saved on your phone — no install needed.',
    autoFill: '✨ Fill the card (demo)',
    reset: '↺ Start over',
    ownerLink: '📊 How does this help the business? →',
    privacy: '🔒 No personal data — the card is stored only on your phone.',
    demoFooter: 'Demo version · projektai777.koduojam@gmail.com',
    celebrateTitle: 'Congratulations!',
    celebrateBtn: 'Great!',
    celebratePrize: (r) => `Your reward:<br><strong>${r}</strong>`,
    scanTitle: 'Scan the staff QR',
    scanHint: 'Point your camera at the staff QR code — the stamp is added automatically.',
    scanFallback: 'Open your phone’s camera app and point it at the staff QR code — the card opens and the stamp is added for you.',
    scanCancel: 'Cancel',
    toastRedeemed: 'Reward claimed! Thank you 🎉',
    toastStamp: 'Stamp added ⭐',
    toastEmail: '📋 Email copied',
    reached: (txt) => `🎁 Reached: ${txt}`,
    errBadPin: 'Wrong or expired code',
    errRate: 'Too many attempts. Wait 10 min.',
    errDailyDone: 'You already got a stamp today. Come back tomorrow! 🙂',
    errNotFull: 'The card isn’t full yet',
    errDemoOver: 'The demo has ended. Contact us by email for the full version.',
    errGeneric: 'Something went wrong. Please try again.',
    errNet: 'Connection error. Check your internet.',
    flowTitle: 'How does it work for staff?',
    flow: [
      ['Staff shows the QR', 'Opens their code page — the QR changes every 30 s'],
      ['Guest scans with their camera', 'That one scan opens the card AND adds the stamp (no phone handover)'],
      ['Stamp added', 'One stamp per visit (1 per day)'],
      ['Card full — reward earned', 'The guest claims the gift and comes back to earn it again'],
    ],
    reviewTitle: 'Enjoyed your visit?',
    reviewLead: 'A quick review would mean a lot. It takes less than a minute.',
    reviewBtn: '⭐ Leave a review',
    reviewLater: 'Maybe later',
    bdayPromptTitle: '🎂 Birthday gift',
    bdayShowId: (r) => `On your birthday you get <strong>${r}</strong>. On the day, just show your ID to a staff member and tap “Claim gift” — no sign-up, no conditions. <strong>⚠️ Claim the gift only at the restaurant, in front of staff</strong> — if you claim it early, you won’t be able to use it that day.`,
    bdayClaimBtn: '🎁 Claim gift',
    bdayConfirmQ: 'The gift can be claimed only once a day, and only at the restaurant in front of staff. Claim now?',
    bdayConfirmYes: '✓ Yes, claim',
    bdayConfirmNo: 'Cancel',
    pinHintBday: '⚠️ Staff: check the customer’s ID (date of birth), then show the code.',
    bdayClaimed: (ago) => `✅ Birthday gift already claimed ${ago}.`,
    agoNow: 'just now',
    agoSec: (n) => `${n} s ago`,
    agoMin: (n) => `${n} min ago`,
    agoHour: (n) => `${n} h ago`,
    bdayNote: 'Resets daily at midnight; your date of birth is never stored.',
    bdayNoteDemo: ' Demo/preview can replay it.',
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
    qrLeadDemo: 'Scan this QR with another phone — in this demo it acts as the staff code: the card opens and a stamp is added right away, exactly like a real guest.',
    qrSteps: 'Scan the QR · collect stamps · claim your reward',
    startTitle: 'How we start',
    startSteps: [
      ['📩', 'You reach out', 'Drop us a line — we reply within 1 business day.'],
      ['🎨', 'We tailor it to you', 'We adjust the design, rewards and features to your business — no commitment.'],
      ['📄', 'We sign a clear contract', 'Fixed €1000, 1 year of support, no subscriptions.'],
      ['✅', 'You pay', 'Once the result matches what your business needs.'],
    ],
    ctaLead: 'A one-time investment that works every day — no monthly fees.',
    ownerContact: 'Ready to start?',
    ownerContactSub: 'Let’s talk →',
    ownerPrivacy: '🔒 No personal data — everything is stored on the guest’s phone.',
    faqTitle: 'Frequently asked questions',
    faq: [
      ['How does the loyalty card work?',
        'A staff member shows a QR code (it changes every 30 seconds). The guest scans it with their phone camera — and in that single scan your branded card opens AND a stamp is added straight away. Nothing to install or open beforehand, and the phone never changes hands. On the next visit the guest reopens the same card and scans the staff QR again (one stamp per day). Once full, they claim the reward and come back to earn it again.'],
      ['Do I need special hardware or an app from the App Store?',
        'No. Everything runs in the phone’s browser — no downloads from the App Store / Google Play. The guest can add the card to their home screen and use it like an app.'],
      ['How much does it cost?',
        'A <strong>one-time fee of €1000</strong> for the finished product — <strong>no monthly or yearly fees</strong>. We handle the hosting, and the solution has no database and sends no SMS or emails, so there are no recurring costs for any of that either (if you want your own domain, you add it as usual — that’s the only small cost on your side). The <strong>first year of support</strong> (bug fixes, small changes) is included. For comparison: most loyalty apps are subscriptions of ~€25–80/month (~€300–960/year, every year forever), and versions with <strong>your own</strong> brand and domain are the priciest tier — often €60–80/month and up. That fully branded solution is exactly what you get here — for a single one-time fee. <strong>Compared with that kind of subscription, it pays for itself in about the first year, and every year after is completely free.</strong> And the cheapest ~€30/month subscriptions are cheap for a reason: for that you get a rigid template under <strong>someone else’s</strong> brand, with no domain of your own, locked into their platform and paying forever. Choosing such a subscription means giving up exactly what you get with us from day one — full branding to <strong>your</strong> business, your own domain, independence, and a single one-time payment. And on pure cash too: even against that cheapest subscription you’re ahead from around the third year and pay nothing after that. <strong>Why it beats a subscription:</strong> you don’t pay forever, no one locks you into someone else’s platform, the product stays under <strong>your</strong> brand, and changes are built specifically for you instead of a rigid template. A serious agency typically prices a comparable custom build at <strong>€3,000–8,000</strong> (a full native iOS/Android app with integrations runs €15,000+), usually plus a monthly maintenance fee — which makes the one-time €1000 exceptional value. And paying far less costs you nothing in capability: this is <strong>not a rigid template but a highly flexible web app built specifically for your business</strong> — reward tiers, colours, languages, birthday gifts, even entirely new features are tailored to you, and we can add or change them anytime. It runs right in the phone’s browser (no App Store installs), yet the card can still be added to the home screen and used like an app.'],
      ['How are you different from other loyalty apps?',
        '<strong>No monthly fees.</strong> Most loyalty apps are subscriptions (~€25–80/month, forever) that squeeze you into a rigid template under someone else’s brand. With us you pay <strong>once</strong>, and we <strong>tailor the app to your business</strong>: reward tiers, colours, languages (LT, EN or any other), birthday gifts, even entirely new features. Everything under <strong>your brand</strong> (and your domain if you like) — you use the product indefinitely, with no dependence on someone else’s platform. Support is fast and personal, and customers need no sign-up (privacy). It wins financially too: against a comparable branded subscription (~€60–80/month), <strong>the one-time fee pays for itself in about the first year</strong>, and after that you pay nothing.'],
      ['Is it safe? What about privacy and cheating?',
        '<strong>Privacy:</strong> we collect no personal data — the card lives only on the guest’s phone, so there are no GDPR (General Data Protection Regulation) headaches over customer lists. <strong>Cheating:</strong> a stamp can only be added by scanning the staff QR, which changes every 30 seconds, so guests can’t add their own and can’t reuse a code they once saw; on top of that each phone is limited to <strong>one stamp per day</strong> (resets at midnight). <strong>Staff oversight:</strong> the owner overview shows an <strong>anonymous daily stamp counter</strong> — a sudden spike instantly flags unusual activity (e.g. a staff member sharing the QR code with friends). Only stamps are counted — <strong>no personal data</strong> — so it stays as GDPR-clean as the rest of the system. Special gifts (e.g. birthday) are released only after staff check an ID, and only once per year. <strong>The safest type of reward is a discount</strong> (e.g. −20% off the bill): even if a customer found a way to cheat, they still have to spend money, because the discount applies only to a paid purchase — unlike an entirely free reward.'],
      ['Who can open the staff QR page?',
        'Only you (the owner) and your staff. The staff code page is protected by a <strong>password that only you know</strong>, and you open it on <strong>your restaurant’s own tablets or phones</strong> used by staff. Guests never see or reach this page — they only scan the QR shown on screen. That’s how only a staff member can add a stamp.'],
      ['Can it run on my own domain and website?',
        'Yes. We can host the card at your own address, e.g. <em>card.yourbusiness.lt</em>. If you have a domain: you (or your web admin) add <strong>one DNS record we provide</strong> for the new address — your existing records (website, email) stay untouched, and we handle hosting and secure <strong>HTTPS</strong>. <strong>No passwords or access to your site are needed</strong>, and it can be undone at any time. The card runs separately and doesn’t change your existing site — you can simply add a “Loyalty card” button. All under your brand.'],
      ['Do customers need to register? What do they get?',
        'No — no registration, email or phone number. The guest opens the card and starts collecting stamps right away; everything is saved on their phone. Simple and fast, so more guests actually use it.'],
      ['How fast can we start? What do you need from me?',
        'Usually within a few days. From you we need: your logo, colours, the reward terms (e.g. “every 10th dish free”). We configure everything and send you the card link plus a staff code page for your team to open.'],
      ['Can it be customized to my business?',
        'Yes — everything can be tailored: number of stamps and tiers, colours, texts, language (LT, EN or any other), birthday gifts, review prompts, even entirely new features. Tell us what your business needs and we’ll build it.'],
      ['How do the contract and payment work?',
        'We sign a short, clear service agreement: what’s built, the price, deadlines, 1 year of support, and that you can use the finished product indefinitely (no subscriptions). Payment is in two parts: 30% deposit on signing, 70% on delivery (by bank transfer, with an invoice). No bureaucracy on your side. If you’re interested, we can email you a sample of the contract.'],
      ['How does the 1-year support work?',
        'For the first <strong>12 months support is free</strong>. Just say the word and small changes (texts, colours, rewards) are usually done <strong>within hours</strong>. Large new features, extra pages or separate projects go under a separate contract and fee (fair to both sides). After the year the product keeps working with no mandatory fees; changes are done as needed for a fixed price — no subscriptions.'],
    ],
    loadingScan: 'Scan the shop’s QR code.',
    loadingNotFound: 'Card not found. Check the QR code.',
    recTitle: '💾 Save your card',
    recNewLead: 'Change or lose your phone without losing your stamps — save a recovery code and restore your card on any phone, anytime. No personal data: the code is tied to the card, not to you.',
    recSaveBtn: '💾 Save my card',
    recSaving: 'Saving…',
    recSavedLead: 'Your recovery code. Write it down or screenshot it — if you lose your phone, enter it on the new one and your stamps come back.',
    recCopy: 'Copy',
    recNote: '🔒 Keep the code safe — anyone who has it can restore this card. We store no personal data.',
    recHaveCode: 'Have a code from another phone? Restore →',
    recPlaceholder: 'e.g. BERN-7F3K-9QX2',
    recRestoreBtn: 'Restore card',
    recRestoring: 'Restoring…',
    recSavedToast: '💾 Card saved',
    recCopiedToast: '📋 Code copied',
    recRestoredToast: '✅ Card restored',
    recBadCode: 'Code not found. Check it and try again.',
    demoStaffTitle: '🔑 Staff page (for the demo)',
    demoStaffLead: 'Open the staff code page on another device and enter the password to see the rotating QR code:',
    demoStaffOpen: 'Open the staff page →',
    demoStaffPass: 'Password',
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
  set('#scanTitle', t('scanTitle'));
  set('.scan-hint', t('scanHint'));
  set('#scanCancel', t('scanCancel'));
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
// localStorage; each one is authorised with a rotating staff code
// (TOTP) verified against the tenant's staff_secret (see totp.js).
const staticBackend = {
  _key: `lojalumas_card_${slug}`,
  _load() {
    return JSON.parse(localStorage.getItem(this._key) || '{"stamps":0,"last":0,"fails":[]}');
  },
  _save(c) {
    localStorage.setItem(this._key, JSON.stringify(c));
  },
  async loadTenant() {
    const t = TENANTS[slug];
    if (!t) throw new Error('tenant_not_found');
    return t;
  },
  async loadOrCreateCard() {
    return { id: slug, ...this._load() };
  },
  async rpc(fn, { p_code }) {
    const t = TENANTS[slug];
    const c = this._load();
    const now = Date.now();

    // Demo abuse guard: the demo code is effectively public, so each device gets ONE
    // full card cycle and 14 days — enough for any sales demo, useless
    // as a free production card (every customer's phone locks itself).
    if (isDemo) {
      if (!c.first) { c.first = now; this._save(c); }
      if ((c.cycles || 0) >= 1 || now - c.first > 14 * 24 * 3600 * 1000) {
        return { ok: false, error: 'demo_over' };
      }
    }

    // brute-force gate: 5 wrong codes in 10 min locks the pad
    c.fails = (c.fails || []).filter((ts) => now - ts < 10 * 60 * 1000);
    if (c.fails.length >= 5) return { ok: false, error: 'rate_limited' };

    // The staff code is a rotating TOTP (see totp.js / staff.html). It's
    // valid only for ~30 s, so a code the customer once saw is useless later.
    if (!(await verifyCode(t.staff_secret, p_code))) {
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

    // Birthday gift: claimed by the SAME staff-QR scan that grants a stamp (tied to
    // a real, rotating-code-verified visit). The staff ID check (see pinHintBday) is
    // the only anti-fraud gate — we never store/check the birthday date. We record a
    // DEVICE-GLOBAL claim time so any tenant card on this device shows "already
    // claimed X ago" until local midnight (can't farm the gift across restaurants).
    if (fn === 'redeem_birthday') {
      if (!isPreview) markBirthdayClaimed(now); // demo/preview never pollutes the real cross-tenant flag
      // Also grant the day's stamp, unless one was already added today.
      if (isPreview || c.day !== todayLocal()) {
        c.stamps = Math.min(c.stamps + 1, t.stamps_needed);
        c.last = now;
        c.day = todayLocal();
        this._save(c);
      }
      return { ok: true, stamps: c.stamps, full: c.stamps >= t.stamps_needed };
    }

    // Daily cooldown: one stamp per phone per LOCAL calendar day, resets at
    // local midnight. demo/preview skip it so you can click through a full card.
    if (!isPreview && c.day === todayLocal()) {
      return { ok: false, error: 'daily_done' };
    }
    c.stamps = Math.min(c.stamps + 1, t.stamps_needed);
    c.last = now;
    c.day = todayLocal();
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

// Point the "add to home screen" shortcut at the tenant's own logo.
//
// IMPORTANT: Android installs a PWA by minting a WebAPK on Google's servers,
// which must FETCH the manifest + icon from real web URLs. A blob:/data: manifest
// is local to the browser, so the mint hangs forever ("Installing…" never
// finishes). So the manifest must be a REAL hosted file: each branded tenant ships
// `manifests/<slug>.webmanifest` (a real file, real icon URL). Tenants without one
// keep the default static manifest.webmanifest (generic icon, but still installs).
// The apple-touch-icon (iOS) is set client-side and can be a data: URL safely —
// iOS "Add to Home Screen" has no server-side minting step.
async function setAppIcon() {
  // iOS icon: prefer a ready-made square icon file (app_icon); else square-pad the
  // logo on the fly (data URL is fine on iOS — no server minting). Else fall back.
  let appleIconUrl;
  if (tenant.app_icon) {
    appleIconUrl = new URL(tenant.app_icon, location.href).href;
  } else {
    const source = tenant.icon_url || tenant.logo_url;
    const absSource = source ? new URL(source, location.href).href : null;
    appleIconUrl = (await makeSquareIcon(absSource)) || new URL('./icon-512.png', location.href).href;
  }
  const apple = document.getElementById('appleIcon');
  if (apple) apple.href = appleIconUrl;

  // Android/desktop install: swap to the tenant's real manifest file if it has one.
  if (tenant.app_manifest) {
    const link = document.getElementById('manifest');
    if (link) link.href = tenant.app_manifest; // resolves against the page URL
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
      <span class="tier-text"><b>${t('tierStamps', m.at)}</b> · ${milestoneText(m)}</span></div>`;
  }).join('');
  return `<div class="tiers"><p class="tiers-title">${t('tiersTitle')}</p>${items}</div>`;
}

// NOTE: there is deliberately NO proactive "add to home screen" banner. The app
// is still fully installable (real manifest + icons, see setAppIcon), so the
// browser's own "Install app" menu works; we just don't nag. Customers who want
// one-tap re-scanning install it themselves — the camera button is the hook.

function staffFlowHtml() {
  const icons = ['📱', '📷', '⭐', '🎁'];
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

// Local calendar day (YYYY-MM-DD) — the daily-stamp cooldown resets at LOCAL
// midnight, so it follows the customer's own timezone, not UTC.
function localDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayLocal() { return localDay(new Date()); }

// ---- Birthday gift: one claim PER DEVICE PER LOCAL DAY, shared across ALL tenants
// on this origin (anti-cheat: the gift can't be farmed at several restaurants the
// same day). We store ONLY the claim time — never a birthday date. Resets at local
// midnight. Demo/preview behave exactly like live (claim → timer); the "Pradėti iš
// naujo" reset button (preview only) clears the flag so a prospect can replay the flow.
const BDAY_KEY = 'lojalumas_bday';
function markBirthdayClaimed(ts) {
  try { localStorage.setItem(BDAY_KEY, String(ts)); } catch { /* storage blocked/full */ }
}
function clearBirthdayClaim() {
  try { localStorage.removeItem(BDAY_KEY); } catch { /* storage blocked */ }
}
// Claim timestamp if the gift was already taken earlier TODAY (local), else null.
function birthdayClaimedAt() {
  const raw = Number(localStorage.getItem(BDAY_KEY) || 0);
  if (!raw) return null;
  return localDay(new Date(raw)) === todayLocal() ? raw : null;
}
// Localized "x ago" for the claim timer — ticks by the SECOND in the first minute
// (so it visibly counts), then minutes/hours (same-day only).
function bdayAgo(ts) {
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 3) return t('agoNow');
  if (secs < 60) return t('agoSec', secs);
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t('agoMin', mins);
  return t('agoHour', Math.floor(mins / 60));
}

// ---------- birthday reward ----------
// No birthday capture: staff check the customer's ID (the sole anti-fraud gate); the
// customer then taps "Atsiimti dovaną" + confirms, which records a device-global claim
// timestamp directly (NO QR scan, NO stamp). Once claimed, the banner shows "already
// claimed X ago" (at every restaurant) until local midnight; we never store a birthday date.
function claimBirthday() {
  markBirthdayClaimed(Date.now()); // record in demo too, so the demo behaves like live (banner → timer)
  render();                  // banner switches to "already claimed X ago"
  celebrate(birthdayReward());
}
function birthdayHtml() {
  if (!tenant.birthday_reward) return '';
  // Small print: daily reset + no birthday stored (the demo-replay note only in preview).
  const note = `<p class="bday-note">${t('bdayNote')}${isPreview ? t('bdayNoteDemo') : ''}</p>`;
  const claimedAt = birthdayClaimedAt();
  if (claimedAt) {
    return `<div class="bday-card bday-claimed">
      <h3>${t('bdayPromptTitle')}</h3>
      <p class="bday-done" data-bday-since="${claimedAt}">${t('bdayClaimed', bdayAgo(claimedAt))}</p>
      ${note}</div>`;
  }
  return `<div class="bday-card bday-today">
    <h3>${t('bdayPromptTitle')}</h3>
    <p>${t('bdayShowId', birthdayReward())}</p>
    <button class="bday-claim" id="bdayClaim">${t('bdayClaimBtn')}</button>
    ${note}</div>`;
}
let bdayTimer = null;
function wireBirthday() {
  const claim = document.getElementById('bdayClaim');
  // Two-step confirm: the gift is once-a-day, so guard against an accidental tap.
  // After "Taip, atsiimti" the claim is recorded immediately (no QR scan) — the
  // staff ID check (see bdayShowId) is the anti-fraud gate, and the banner flips
  // straight to the "already claimed X ago" timer.
  if (claim) claim.onclick = () => {
    if (document.getElementById('bdayConfirm')) return; // already confirming
    claim.style.display = 'none'; // (not [hidden]: .bday-claim sets display:block, which wins)
    claim.insertAdjacentHTML('afterend',
      `<div class="bday-confirm" id="bdayConfirm">
        <p class="bday-confirm-q">${t('bdayConfirmQ')}</p>
        <button class="bday-claim" id="bdayConfirmYes">${t('bdayConfirmYes')}</button>
        <button class="bday-cancel" id="bdayConfirmNo">${t('bdayConfirmNo')}</button>
      </div>`);
    const reset = () => { const c = document.getElementById('bdayConfirm'); if (c) c.remove(); claim.style.display = ''; };
    document.getElementById('bdayConfirmNo').onclick = reset;
    document.getElementById('bdayConfirmYes').onclick = () => { reset(); claimBirthday(); };
  };
  // Keep the "claimed X ago" timer live (render() rebuilds the DOM, so re-arm here).
  if (bdayTimer) { clearInterval(bdayTimer); bdayTimer = null; }
  const done = document.querySelector('.bday-done[data-bday-since]');
  if (done) {
    const ts = Number(done.getAttribute('data-bday-since'));
    bdayTimer = setInterval(() => {
      const el = document.querySelector('.bday-done[data-bday-since]');
      if (!el) { clearInterval(bdayTimer); bdayTimer = null; return; }
      el.textContent = t('bdayClaimed', bdayAgo(ts));
    }, 1000);
  }
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

// DEMO-ONLY helper: shows the password-gated staff page link + the demo password
// so a prospect can open the staff QR on a second device and try the real flow.
// Gated to slug 'demo' (see the isDemo check at the call site) — never shows for a
// real client, whose staff password must stay private.
function demoStaffHtml() {
  const staffUrl = new URL('tools/staff.html', new URL('./', location.href)).href + '?b=demo';
  return `<section class="panel demo-staff">
    <h3>${t('demoStaffTitle')}</h3>
    <p class="panel-lead">${t('demoStaffLead')}</p>
    <a class="cta cta-demo" href="${staffUrl}" target="_blank" rel="noopener">${t('demoStaffOpen')}</a>
    <p class="demo-pass">${t('demoStaffPass')}: <code>123456</code></p>
  </section>`;
}

function render() {
  setTheme();
  const full = card.stamps >= tenant.stamps_needed;
  // Running as an installed PWA? Then "no install needed" is moot — skip that hint.
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const stampIcon = tenant.stamp_icon || '🍴'; // restaurant-flavored default; per-tenant override
  const grid = Array.from({ length: tenant.stamps_needed }, (_, i) => {
    const filled = i < card.stamps;
    const milestone = (tenant.milestones || []).some((m) => m.at === i + 1);
    const glyph = filled ? stampIcon : (milestone ? '🎁' : '');
    return `<div class="stamp ${filled ? 'filled' : ''} ${milestone ? 'stamp-milestone' : ''}" style="animation-delay:${i * 40}ms">${glyph}</div>`;
  }).join('');

  const remaining = tenant.stamps_needed - card.stamps;
  const statusLine = full
    ? t('prizeReady', rewardText())
    : remaining === 1
      ? t('oneLeft')
      : t('prizeIs', rewardText());

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
    <p class="small-print">${isDemo ? t('staffPressDemo') : t('staffPress')}</p>
    ${installed ? '' : `<p class="small-print">${t('savedHint')}</p>`}
    ${isPreview && !full ? `<button class="cta cta-demo" id="autoFillBtn">${t('autoFill')}</button>` : ''}
    ${isPreview ? `<button class="reset-link" id="resetBtn">${t('reset')}</button>` : ''}
    ${birthdayHtml()}
    ${isPreview ? staffFlowHtml() : ''}
    ${isPreview ? ctaHtml() : ''}
    <section class="panel recovery hidden" id="recovery"></section>
    <p class="privacy">${t('privacy')}</p>
    ${isDemo ? demoStaffHtml() : ''}
    ${isDemo ? `<p class="small-print">${t('demoFooter')}</p>` : ''}
  `;

  document.getElementById('actionBtn').onclick = () => stampAction(full ? 'redeem_reward' : 'add_stamp');
  const af = document.getElementById('autoFillBtn'); if (af) af.onclick = autoFill;
  const rs = document.getElementById('resetBtn'); if (rs) rs.onclick = resetCard;
  wireLangToggle();
  wireBirthday();
  wireReview();
  wireRecovery();
}

// Card recovery UI — populated async because availability depends on a fetch
// (the optional counter server). Two states: (a) no backup yet -> "save your
// card" button + restore-from-code link; (b) backup exists -> show the code with
// copy + a re-save button. Hidden entirely when the server is off (free static).
async function wireRecovery() {
  const box = document.getElementById('recovery');
  if (!box) return;
  if (!(await Recovery.available())) return; // server off / demo -> stays hidden

  const restoreUi = `
    <button class="rec-restore-link" id="recRestoreLink">${t('recHaveCode')}</button>
    <div class="rec-restore hidden" id="recRestoreBox">
      <input id="recInput" type="text" inputmode="text" autocapitalize="characters" placeholder="${t('recPlaceholder')}">
      <button class="cta cta-demo" id="recLoadBtn">${t('recRestoreBtn')}</button>
    </div>`;

  const renderBox = () => {
    const code = Recovery.code();
    box.innerHTML = code ? `
      <h3>${t('recTitle')}</h3>
      <p class="panel-lead">${t('recSavedLead')}</p>
      <div class="rec-code"><code id="recCode">${code}</code><button class="rec-copy" id="recCopy">${t('recCopy')}</button></div>
      <p class="rec-note">${t('recNote')}</p>
      ${restoreUi}` : `
      <h3>${t('recTitle')}</h3>
      <p class="panel-lead">${t('recNewLead')}</p>
      <button class="cta cta-demo" id="recSaveBtn">${t('recSaveBtn')}</button>
      ${restoreUi}`;
    box.classList.remove('hidden');
    wireButtons();
  };

  const wireButtons = () => {
    const saveBtn = document.getElementById('recSaveBtn');
    if (saveBtn) saveBtn.onclick = async () => {
      saveBtn.disabled = true; saveBtn.textContent = t('recSaving');
      const code = await Recovery.save(card.stamps);
      if (code) { toast(t('recSavedToast')); renderBox(); }
      else { saveBtn.disabled = false; saveBtn.textContent = t('recSaveBtn'); toast(t('errNet'), true); }
    };
    const copyBtn = document.getElementById('recCopy');
    if (copyBtn) copyBtn.onclick = () => {
      const code = Recovery.code();
      const done = () => toast(t('recCopiedToast'));
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
      else fallbackCopy(code, done);
    };
    const link = document.getElementById('recRestoreLink');
    if (link) link.onclick = () => document.getElementById('recRestoreBox')?.classList.toggle('hidden');
    const loadBtn = document.getElementById('recLoadBtn');
    if (loadBtn) loadBtn.onclick = async () => {
      const input = document.getElementById('recInput');
      const codeIn = (input.value || '').trim().toUpperCase();
      if (!codeIn) return;
      loadBtn.disabled = true; loadBtn.textContent = t('recRestoring');
      const data = await Recovery.load(codeIn);
      loadBtn.disabled = false; loadBtn.textContent = t('recRestoreBtn');
      if (!data) { toast(t('recBadCode'), true); return; }
      // Restore stamps onto this device's card and adopt the code so future saves update it.
      card.stamps = Math.min(data.stamps, tenant.stamps_needed);
      if (backend._save) backend._save({ stamps: card.stamps, last: 0, fails: [], first: card.first, cycles: card.cycles });
      Recovery._setCode(codeIn);
      toast(t('recRestoredToast'));
      render(); // full card re-render: restored stamps + recovery box now shows the code
    };
  };

  renderBox();
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
    celebrate(rewardText());
  } else {
    const m = (tenant.milestones || []).find((x) => x.at === card.stamps);
    if (m) toast(t('reached', milestoneText(m)));
  }
}

function resetCard() {
  card.stamps = 0;
  showReview = false;
  clearBirthdayClaim(); // replay the birthday flow too (reset only shows in preview)
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

// Scannable QR (scan with another phone). drawQr just paints whatever URL it's
// given; wireOwnerQr decides WHAT to encode (plain link vs. live staff grant).
function drawQr(targetUrl) {
  const el = document.getElementById('standeeQr');
  if (!el) return;
  el.innerHTML = `<img class="qr-img" alt="QR — ${tenant.business_name}" src="${qrSrc(targetUrl, 400)}">`;
}

// Owner-page "try on another phone" QR.
//   - Real client (not preview): just the card link — opening it grants nothing.
//   - DEMO/preview: it doubles as the STAFF QR. It carries the live rotating
//     staff code (?grant=CODE), so scanning it on another phone actually adds a
//     stamp — the whole flow, hands-free, with no separate staff page open. The
//     code expires in 30 s, so we refresh the QR as it rotates (same TOTP as
//     /tools/staff.html), only re-fetching the image when the code changes.
let ownerQrTimer = null;
function wireOwnerQr(cardUrl) {
  clearInterval(ownerQrTimer); ownerQrTimer = null; // re-render (e.g. lang toggle) -> reset
  if (!isPreview || !tenant.staff_secret) { drawQr(cardUrl); return; }
  let lastCode = null;
  const paint = async () => {
    if (!document.getElementById('standeeQr')) { clearInterval(ownerQrTimer); ownerQrTimer = null; return; }
    const code = await currentCode(tenant.staff_secret);
    if (code === lastCode) return;            // only redraw when the code actually rotates
    lastCode = code;
    drawQr(`${cardUrl}&grant=${code}`);
  };
  paint();
  ownerQrTimer = setInterval(paint, 1000);
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

// "How we start" 4-step process — sets the flow: reach out -> we tailor -> sign -> pay.
function startHtml() {
  const steps = t('startSteps').map(([icon, title, desc], i) => `
    <div class="start-step">
      <div class="start-num">${i + 1}</div>
      <div class="start-body"><span class="start-icon">${icon}</span><b>${title}</b><p>${desc}</p></div>
    </div>`).join('');
  return `<section class="panel start"><h3>${t('startTitle')}</h3><div class="start-steps">${steps}</div></section>`;
}

// FAQ accordion for the owner/sales page (native <details>, no JS needed).
function faqHtml() {
  const items = t('faq').map(([q, a]) => `
    <details class="faq-item">
      <summary>${q}</summary>
      <div class="faq-a">${a}</div>
    </details>`).join('');
  return `<section class="panel faq">
    <h3>${t('faqTitle')}</h3>
    ${items}
  </section>`;
}

// NOTE: real anonymous stats are NOT shown on this PUBLIC owner/sales page (it
// keeps the illustrative demo charts, since a prospect's real numbers would be
// empty). Real per-tenant stats live ONLY on the password-protected staff page
// (tools/staff.html), which reads the same Counter /stats endpoint.

function renderOwner() {
  setTheme();
  const cardUrl = `${location.origin}${location.pathname}?b=${encodeURIComponent(slug)}`;
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
      <p class="panel-lead">${t(isPreview ? 'qrLeadDemo' : 'qrLead')}</p>
      <div class="standee-mock">
        <div class="standee-top"></div>
        <p class="sm-name">${tenant.business_name}</p>
        <p class="sm-reward">${rewardText()}</p>
        <div id="standeeQr"></div>
        <p class="sm-steps">${t('qrSteps')}</p>
      </div>
    </section>

    ${faqHtml()}

    ${startHtml()}

    <p class="cta-lead">${t('ctaLead')}</p>
    <button class="cta cta-contact" id="copyEmailBtn">${t('ownerContact')}<span>${t('ownerContactSub')}</span></button>
    <p class="privacy">${t('ownerPrivacy')}</p>
  `;
  wireOwnerQr(cardUrl);
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

// ---------- staff-QR scanner ----------
// NO manual code entry: the stamp is authorised purely by SCANNING the rotating
// staff QR (TOTP, see totp.js / staff.html). Two ways in, same outcome:
//   1. The customer's NATIVE phone camera scans the staff QR -> opens the card
//      URL with ?grant=CODE -> auto-applied on boot (see runGrant below).
//   2. The customer already has the card open (e.g. an installed PWA) and taps
//      "Open camera" -> this in-page scanner reads the staff QR live.
// The 30 s rotation is what kills code reuse — same "good-enough" model as before.
const scanModal = document.getElementById('scanModal');
let scanStream = null;       // active MediaStream while the camera is on
let scanning = false;        // true while the detect loop is running
let scanAction = 'add_stamp';

// Pull the rotating code out of a scanned staff QR. The QR encodes the card URL
// with ?grant=CODE; we also accept a bare numeric code as a fallback.
function extractCode(raw) {
  if (!raw) return null;
  try {
    const g = new URL(raw, location.href).searchParams.get('grant');
    if (g) { const d = g.replace(/\D/g, ''); if (d.length >= TOTP_DIGITS) return d.slice(0, TOTP_DIGITS); }
  } catch { /* not a URL — fall through to bare digits */ }
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= TOTP_DIGITS ? digits.slice(0, TOTP_DIGITS) : null;
}

// Stop the camera + detect loop (does NOT close the dialog).
function releaseCamera() {
  scanning = false;
  if (scanStream) { scanStream.getTracks().forEach((tr) => tr.stop()); scanStream = null; }
  const v = document.getElementById('scanVideo');
  if (v) { try { v.pause(); } catch { /* ignore */ } v.srcObject = null; }
}

// Browsers without BarcodeDetector or camera access (e.g. iOS Safari): point the
// customer at their phone's native camera app, which opens the staff QR's URL
// and stamps on boot.
function showScanFallback() {
  const frame = scanModal && scanModal.querySelector('.scan-frame');
  if (frame) frame.hidden = true; // hide the empty camera box
  // The "point your camera" hint is moot with no in-page camera — hide it so only
  // the fallback instruction shows (avoids two overlapping paragraphs).
  const hint = scanModal && scanModal.querySelector('.scan-hint');
  if (hint) hint.hidden = true;
  const fb = document.getElementById('scanFallback');
  if (fb) { fb.hidden = false; fb.textContent = t('scanFallback'); }
}

async function openScanner(action) {
  scanAction = action;
  const hint = scanModal.querySelector('.scan-hint');
  const fb = document.getElementById('scanFallback');
  const video = document.getElementById('scanVideo');
  if (hint) {
    hint.hidden = false; // reset after a previous fallback may have hidden it
    // Birthday gift: remind staff to check the customer's ID (the real anti-fraud
    // step) — same warning the old pad showed.
    hint.textContent = action === 'redeem_birthday' ? t('pinHintBday') : t('scanHint');
    hint.classList.toggle('pin-hint-warn', action === 'redeem_birthday');
  }
  if (fb) { fb.hidden = true; fb.textContent = ''; }
  if (video) video.hidden = false;
  const frame = scanModal.querySelector('.scan-frame');
  if (frame) frame.hidden = false; // reset after a previous fallback
  scanModal.showModal();

  // BarcodeDetector is native (no library) — fits the project's no-dep model.
  let detector = null;
  try { if ('BarcodeDetector' in window) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
  if (!detector || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { showScanFallback(); return; }

  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch { showScanFallback(); return; }
  video.srcObject = scanStream;
  try { await video.play(); } catch { /* playsinline + muted cover autoplay policies */ }

  scanning = true;
  const tick = async () => {
    if (!scanning) return;
    try {
      const codes = await detector.detect(video);
      const code = codes && codes.length ? extractCode(codes[0].rawValue) : null;
      if (code) { scanModal.close(); await runGrant(scanAction, code); return; }
    } catch { /* transient decode error (e.g. no frame yet) — keep scanning */ }
    if (scanning) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// In a real shop the customer scans the staff QR; in the DEMO there is no staff
// QR to point at, so simulate a successful scan with the live code — a solo
// prospect still sees the stamp / celebration.
async function stampAction(action) {
  if (isDemo) return runGrant(action, await currentCode(tenant.staff_secret));
  return openScanner(action);
}

// Wire the scanner dialog once on boot: cancel closes it; closing ALWAYS frees
// the camera (covers the cancel button, Esc, and the auto-close after a scan).
function wireScanner() {
  if (!scanModal) return;
  const cancel = document.getElementById('scanCancel');
  if (cancel) cancel.onclick = () => scanModal.close();
  scanModal.addEventListener('close', releaseCamera);
}

// Shared by the in-page scanner and the scanned-QR boot path (?grant=CODE).
async function runGrant(action, code) {
  try {
    const res = await backend.rpc(action, { p_slug: slug, p_card: card.id, p_code: code });
    if (res.ok) {
      if (action === 'redeem_reward') {
        Counter.hit('redeem'); // anonymous tally (server optional; no personal data)
        card.stamps = 0;
        Recovery.autoSave(card.stamps); // keep an existing backup current
        showReview = !!tenant.google_review_url; // nudge a review right after the reward
        render();
        toast(t('toastRedeemed'));
      } else if (action === 'redeem_birthday') {
        if (typeof res.stamps === 'number') card.stamps = res.stamps; // one scan also stamped
        Recovery.autoSave(card.stamps);
        render();                 // banner switches to "already claimed X ago"
        celebrate(birthdayReward());
      } else {
        Counter.hit('stamp'); // anonymous tally (server optional; no personal data)
        card.stamps = res.stamps;
        Recovery.autoSave(card.stamps);
        render();
        if (res.full) celebrate(rewardText());
        else toast(t('toastStamp'));
      }
    } else {
      const msg = {
        bad_pin: t('errBadPin'),
        rate_limited: t('errRate'),
        daily_done: t('errDailyDone'),
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
  wireScanner();
  applyStaticStrings();
  const celebrateCloseBtn = document.getElementById('celebrateClose');
  if (celebrateCloseBtn) celebrateCloseBtn.onclick = () => document.getElementById('celebrateModal').close();
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
      // Customer scanned the staff QR -> ?grant=CODE. Auto-apply it: redeem if
      // the card is already full, otherwise add a stamp. Then strip the code
      // from the URL so a refresh/bookmark can't replay it.
      const grant = params.get('grant');
      if (grant) {
        const full = card.stamps >= tenant.stamps_needed;
        history.replaceState({}, '', `?b=${encodeURIComponent(slug)}${lang === 'en' ? '&lang=en' : ''}`);
        await runGrant(full ? 'redeem_reward' : 'add_stamp', grant);
      }
    }
  } catch (e) {
    app.innerHTML = `<div class="loading">${t('loadingNotFound')}</div>`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
