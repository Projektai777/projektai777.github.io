/* PA recruit — CANONICAL MESSAGE REGISTRY (single source of truth).
 *
 * ONE file drives THREE places, so editing here propagates everywhere:
 *   1. The demo review tab (pastatuapdaila-demo.html → "✉️ Žinutės") loads this as
 *      a browser script (window.PA) and renders every message type automatically —
 *      add/remove an entry in MESSAGES[] and the tab updates on next load.
 *   2. The real Worker (pa-worker/src/worker.js) imports adPost() so the actual
 *      /need ad-post text is generated from the SAME template shown in the demo.
 *   3. The sample-sender (pa-radar/send-samples.js) requires this and emails the
 *      exact same examples to our own inbox.
 *
 * UMD wrapper below makes it safe as a browser <script>, a Node require(), and a
 * Cloudflare Worker ES import (esbuild picks up module.exports as the default).
 *
 * Each MESSAGES entry:
 *   id       stable key
 *   dir      'out' = we SEND it | 'in' = we RECEIVE it
 *   channel  human label shown as the badge: 'SMS' | 'El. paštas' | 'Telegram / Viber / Portalas' | 'Anketa' | 'Radaras'
 *   to       who it goes to / comes from
 *   phase    rollout phase (1 = live-ready, 2, 3)
 *   subject  (emails only) the real subject line
 *   body     example content (Lithuanian, example values already filled)
 *   note     one-line explanation for the client/Ignas
 */
;(function (factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;          // Node / wrangler
  if (typeof window !== 'undefined') { window.PA = api; }                            // browser
  else if (typeof self !== 'undefined') { try { self.PA = api; } catch (e) {} }      // worker global
})(function () {
  'use strict';

  var ANKETA  = 'https://projektai777.github.io/pa/anketa.html';
  var CONSOLE = 'https://projektai777.github.io/pa/index.html';
  var PHONE   = '+370 5 215 7211';
  var ORG     = 'AB „Panevėžio statybos trestas“ filialo „Pastatų apdaila“';

  // Canonical ad-post text — used by the REAL worker /need AND the demo preview.
  function adPost(need, src) {
    var pay  = need.pay  ? '\n💶 ' + need.pay   : '';
    var note = need.note ? '\n'   + need.note   : '';
    return '👷 IEŠKOME: ' + need.trade + ' — ' + (need.city || 'Vilnius') + '.' + pay + note + '\n'
      + 'Nuolatinis darbas su ' + ORG + ' objektais, laiku mokamas atlyginimas.\n'
      + '✍️ Anketa per 30 sek. (be CV): ' + ANKETA + '?s=' + src + '\n📞 ' + PHONE;
  }

  // Example values so the previews read like real messages.
  var S = {
    trade: 'Glaistymas ir dažymas', trade_lc: 'glaistytojo–dažytojo', city: 'Vilnius',
    pay: '1 700–2 400 €/mėn.', note: 'Darbo pradžia nuo rugpjūčio.', name: 'Tomas',
  };

  var MESSAGES = [
    // ─────────── SIUNČIAMA (out) ───────────
    { id: 'ad-post', dir: 'out', channel: 'Portalai / Viber / Telegram',
      to: 'Darbuotojams — skelbimas kanaluose', phase: 1,
      body: adPost({ trade: S.trade, city: S.city, pay: S.pay, note: S.note }, 'tg'),
      note: 'Tekstą sistema paruošia iškart, kai paspaudžiate „Pradėti paiešką“ — įkeliate vienu paspaudimu ' +
            '(nukopijuojate ir įklijuojate) į UZT, portalus ar darbo grupes. SVARBU: į SVETIMAS Facebook / Viber / ' +
            'Telegram grupes automatiškai rašyti negali niekas — „Meta“ 2024 m. visiškai uždarė grupių API, o ' +
            'Telegram/Viber botas gali rašyti tik ten, kur tos grupės administratorius jį įsileidžia. Todėl čia ' +
            'sąmoningai paliekame vieną paspaudimą žmogui — be išgalvotų pažadų.' },

    { id: 'radar-out', dir: 'out', channel: 'SMS',
      to: 'Darbo ieškančiam žmogui (radaro radinys)', phase: 2,
      body: 'Sveiki! Matėme Jūsų skelbimą skelbiu.lt „Ieško darbo“ skiltyje. ' + ORG +
            ' ieško ' + S.trade_lc + ' ' + S.city + ' — nuolatinis darbas, laiku mokamas atlyginimas.\n\n' +
            'Jei domina, užpildykite trumpą anketą (30 sek., be CV): ' + ANKETA + '?s=radaras\nArba skambinkite ' + PHONE + '.',
      note: 'PILOTINĖJE VERSIJOJE NEĮJUNGTA. Automatinėms SMS reikia mokamo SMS šliuzo (mokama už kiekvieną žinutę), ' +
            'todėl bandomuoju laikotarpiu jo neįjungiame — radaras parodo radinį pulte su nuoroda į skelbimą, ' +
            'o Jūs paskambinate pats. Nusprendus tęsti, SMS įjungiame kaip atskirą paslaugą.' },

    { id: 'base-offer', dir: 'out', channel: 'SMS',
      to: 'Tinkamiems žmonėms iš Jūsų bazės', phase: 3,
      body: '„Pastatų apdaila“: naujas objektas ' + S.city + ' — reikalingi glaistytojai–dažytojai. ' +
            'Darbas nuo kitos savaitės, laiku mokamas atlyginimas.\n\nJei domina — atsakykite TAIP, ir darbų vadovas Jums perskambins.',
      note: 'Naujas objektas → sistema pati atrenka tinkamus iš sukauptos bazės ir išsiunčia SMS. Reikia SMS šliuzo (mokama už žinutes) — atskira paslauga.' },

    { id: 'referral', dir: 'out', channel: 'SMS',
      to: 'Esamam darbuotojui (rekomendacija)', phase: 3,
      body: '„Pastatų apdaila“: ' + S.name + ', pažįstate gerą glaistytoją ar dažytoją? ' +
            'Pasidalinkite savo asmenine nuoroda: ' + ANKETA + '?s=rek-tomas\n\n' +
            'Jam atidirbus 2 savaites — Jums 50 € premija prie atlyginimo. Ačiū!',
      note: 'Kiekvienas darbuotojas gauna asmeninę nuorodą; premija už rekomenduotą žmogų. Nuorodas galima dalinti ir be SMS (ranka), automatiniam išsiuntimui reikia SMS šliuzo.' },

    { id: 'subcontractor', dir: 'out', channel: 'El. paštas',
      to: 'Statybos brigadoms / įmonėms (subrangovams)', phase: 2,
      subject: 'Kvietimas į „Pastatų apdaila“ partnerių (subrangovų) sąrašą',
      body: 'Sveiki,\n\n' + ORG + ' nuolat vykdo apdailos darbus objektuose Vilniuje ir visoje Lietuvoje ' +
            'ir ieško patikimų subrangovų — apdailos, tinkavimo, plytelių, gipso kartono ir fasadų brigadų.\n\n' +
            'Užsiregistravusios brigados naujų objektų pasiūlymus gauna pirmos. Registracija užtrunka apie 1 minutę, ' +
            'be jokių įsipareigojimų:\n' + ANKETA + '?s=b2b\n\nAiškios sutartys, laiku mokami atsiskaitymai.\n\n' +
            'Jei pasiūlymas neaktualus — atsakykite „nedomina“ ir daugiau nerašysime.\n\n' +
            'Pagarbiai,\nPastatų apdaila\n' + PHONE,
      note: 'Naudos tą pačią saugaus siuntimo infrastruktūrą kaip Lojalumas kampanija; su „nedomina“ atsisakymu.' },

    { id: 'applied-confirm', dir: 'out', channel: 'SMS',
      to: 'Ką tik užpildžiusiam anketą kandidatui', phase: 2,
      body: '„Pastatų apdaila“: ačiū, ' + S.name + '! Jūsų anketa gauta. Su Jumis susisieksime per 1 darbo dieną ' +
            'dėl darbo pokalbio. Skubu? Skambinkite ' + PHONE + '.',
      note: 'Patvirtinimas kandidatui iškart po anketos užpildymo. Reikia SMS šliuzo — atskira paslauga; pilotinėje versijoje kandidatas patvirtinimą mato ekrane po anketos išsiuntimo.' },

    // ─────────── GAUNAMA (in) ───────────
    { id: 'radar-find', dir: 'in', channel: 'Radaras',
      to: 'Sistema → Jūsų pultas (rastas skelbimas)', phase: 1,
      body: 'Plytelių klojėjas, 12 m. patirtis, ieškau darbo Vilniuje\nskelbiu.lt · „Ieško darbo“ · prieš 2 val.',
      note: 'ŠIRDIS. Automatiškai surenkama 2×/d. iš skelbiu.lt „Ieško darbo“ skilties (šiandien, 07-27: 48 skelbimai, iš jų 18 statybos/apdailos). Pulte atsidarote skelbimą, matote žmogaus telefoną ir skambinate.' },

    { id: 'anketa-received', dir: 'in', channel: 'Anketa',
      to: 'Iš kandidato → į Jūsų bazę', phase: 1,
      body: 'Gauta nauja anketa:\nVardas: Tomas Petraitis\nTelefonas: +370 6xx xxxxx\n' +
            'Specializacija: Glaistymas ir dažymas\nPatirtis: 3–10 m.\nMiestas: Vilnius\nKomentaras: galiu pradėti nuo pirmadienio',
      note: 'Iškart atsiranda pulto skiltyje „Kandidatai“ su mygtuku skambinti vienu paspaudimu.' },

    { id: 'manager-alert', dir: 'in', channel: 'El. paštas',
      to: 'Jums (savininkui / vadovui)', phase: 2,
      subject: 'Nauja anketa — Glaistymas ir dažymas (Vilnius)',
      body: 'Nauja darbuotojo anketa „Pastatų apdaila“ sistemoje:\n\nVardas: Tomas Petraitis\nTelefonas: +370 6xx xxxxx\n' +
            'Specializacija: Glaistymas ir dažymas\nPatirtis: 3–10 m.\nMiestas: Vilnius\nIš kur: Telegram\n\n' +
            'Peržiūrėti visus kandidatus: ' + CONSOLE,
      note: 'Papildoma paslauga. Pilotinėje versijoje naujas anketas matote pulte (skiltis „Kandidatai“) — atsidarote vakare ir skambinate. Pageidaujant įjungiame pranešimą el. paštu apie kiekvieną naują anketą.' },

    { id: 'reply-taip', dir: 'in', channel: 'SMS',
      to: 'Iš žmogaus → Jums (atsakymas į pasiūlymą)', phase: 3,
      body: 'TAIP',
      note: 'Atsakęs „TAIP“ žmogus automatiškai sugula į sąrašą darbų vadovui — skambinate tik norintiems.' },

    { id: 'reply-optout', dir: 'in', channel: 'El. paštas',
      to: 'Iš subrangovo → Jums (atsakymas į kvietimą)', phase: 2,
      body: 'Nedomina.',
      note: '„nedomina“ automatiškai pašalina įmonę iš sąrašo; „domina“ → brigada užsiregistruoja pati.' },
  ];

  return {
    MESSAGES: MESSAGES, SAMPLE: S, adPost: adPost,
    ANKETA: ANKETA, CONSOLE: CONSOLE, PHONE: PHONE, ORG: ORG,
  };
});
