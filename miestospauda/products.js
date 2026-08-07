/* © 2026 Lojalumas — DEMO „Miesto Spauda".
   PREKIŲ KATALOGAS IR KAINODARA — VIENINTELIS ŠALTINIS.
   Šį failą naudoja TRYS vietos, todėl kaina visur ta pati ir negali išsiskirti:
     1) app.js          — skaičiuoklė ir krepšelis svetainėje;
     2) tools/ms-build-pages.js — atskirų produktų puslapių generavimas (SEO);
     3) admin.html      — kainų redagavimas valdymo sistemoje.
   Realiam klientui čia sudedami JO tikri įkainiai — struktūra lieka ta pati.
   Kainodara: kaina = paruošimas + bazinė × dydis × medžiaga × spauda × apdaila
                      × kiekis × kiekio nuolaida. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Visi kainodaros skaičiai gyvena čia ir VISI redaguojami valdymo sistemoje —
     PVM, dvipusės spaudos ir skubos koeficientai, kiekio nuolaidos. Kode nieko
     "prikalto" nelieka, kad savininkui niekada nereikėtų programuotojo kainoms. */
  var CFG = {
    vat: 1.21,     // PVM daugiklis (1,21 = 21 %)
    sides: 1.35,   // dvipusė spauda, palyginti su vienpuse
    rush: 1.4      // skubaus užsakymo antkainis
  };
  var VAT = CFG.vat;   // paliktas suderinamumui su senesniu kodu

  var PRODUCTS = [
    {
      id: 'viz', name: 'Vizitinės kortelės', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 5, base: 0.085, days: 2, defQty: 500, qtys: [100, 250, 500, 1000, 2500],
      img: 'skaitm.jpg',
      lead: 'Vizitinės kortelės Klaipėdoje — skaitmeninė spauda ant kreidinio, perdirbto ar dizainerinio popieriaus. Matinis, blizgus ir soft-touch laminavimas, folijavimas, suapvalinti kampai.',
      bullets: ['Standartinis 90 × 50 mm ir dar 3 formatai', 'Popierius nuo 300 iki 350 g', 'Maketą patikriname nemokamai', 'Terminas — 2 darbo dienos'],
      kw: 'vizitinės kortelės, vizitinių kortelių spauda, Klaipėda',
      faq: [
        ['Kokio formato failą siųsti vizitinėms?', 'Geriausia PDF su 3 mm apipjovimo laukais, 300 dpi, CMYK. Priimame ir AI, CDR, PSD, TIFF, JPG — maketą patikriname nemokamai.'],
        ['Kiek trunka vizitinių kortelių spauda?', 'Standartiškai 2 darbo dienos nuo maketo patvirtinimo. Skubiems darbams taikome +40 % ir pagaminame kitą darbo dieną.']
      ],
      sizes: [
        { n: '90 × 50 mm (standartinė)', k: 1 },
        { n: '85 × 55 mm', k: 1.06 },
        { n: '50 × 90 mm (vertikali)', k: 1.06 },
        { n: '90 × 50 mm, suapvalinti kampai', k: 1.24 }
      ],
      mats: [
        { n: 'Kreidinis 300 g', k: 1 },
        { n: 'Kreidinis 350 g', k: 1.12 },
        { n: 'Perdirbtas 300 g (eko)', k: 1.3 },
        { n: 'Dizainerinis popierius 300 g', k: 1.6 }
      ],
      sides: true,
      fins: [
        { n: 'Be apdailos', k: 1 },
        { n: 'Matinis laminavimas', k: 1.25 },
        { n: 'Blizgus laminavimas', k: 1.2 },
        { n: 'Soft-touch laminavimas', k: 1.5, d: 1 },
        { n: 'Folijavimas (auksas / sidabras)', k: 1.95, d: 1 }
      ]
    },
    {
      id: 'skraj', name: 'Skrajutės', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 6, base: 0.055, days: 2, defQty: 1000, qtys: [100, 250, 500, 1000, 2500, 5000],
      img: 'skaitm.jpg',
      lead: 'Skrajučių spauda A6, A5, DL ir A4 formatais. Kreidinis, ofsetinis arba perdirbtas popierius, vienpusė ar dvipusė spauda, laminavimas ir lankstymas.',
      bullets: ['Tiražai nuo 100 iki 5000 vnt.', 'Kuo didesnis tiražas — tuo pigesnis vienetas', 'Lankstymas per pusę tame pačiame užsakyme', 'Terminas — 2 darbo dienos'],
      kw: 'skrajutės, skrajučių spauda, lankstinukai, Klaipėda',
      faq: [
        ['Koks skrajučių tiražas apsimoka?', 'Nuo 1000 vnt. vieneto kaina krenta apie 40 % lyginant su 100 vnt., nes paruošimo kaštai pasiskirsto tiražui.'],
        ['Ar galite skrajutes ir sulankstyti?', 'Taip, lankstymas per pusę yra apdailos pasirinkimas skaičiuoklėje — atskirai užsakyti nereikia.']
      ],
      sizes: [
        { n: 'A6 (105 × 148 mm)', k: 0.62 },
        { n: 'A5 (148 × 210 mm)', k: 1 },
        { n: 'DL (99 × 210 mm)', k: 0.9 },
        { n: 'A4 (210 × 297 mm)', k: 1.85 }
      ],
      mats: [
        { n: 'Kreidinis 130 g', k: 1 },
        { n: 'Kreidinis 170 g', k: 1.15 },
        { n: 'Ofsetinis 120 g', k: 0.95 },
        { n: 'Perdirbtas 140 g (eko)', k: 1.25 }
      ],
      sides: true,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Matinis laminavimas', k: 1.35 }, { n: 'Lankstymas per pusę', k: 1.15 }]
    },
    {
      id: 'lankst', name: 'Lankstinukai', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 12, base: 0.14, days: 3, defQty: 500, qtys: [100, 250, 500, 1000, 2500],
      img: 'skaitm.jpg',
      lead: 'Lankstinukai su vienu ar dviem lankstymais — A4 → DL, A4 → A5, A3 → A4. Kreidinis popierius 150–250 g, matinis laminavimas arba dalinis UV lakas.',
      bullets: ['Trys lankstymo schemos', 'Popierius iki 250 g', 'Dalinis UV lakas akcentams', 'Terminas — 3 darbo dienos'],
      kw: 'lankstinukai, lankstinukų spauda, bukletai, Klaipėda',
      faq: [
        ['Kuo lankstinukas skiriasi nuo skrajutės?', 'Lankstinukas turi bent vieną lankstymą, todėl telpa daugiau informacijos ir jis atrodo solidžiau. Skrajutė — vienas lapas.'],
        ['Ar reikia maketą ruošti su lankstymo linijomis?', 'Patogiausia atsiųsti PDF su pažymėtomis lankstymo vietomis, bet jei jų nėra — sudėliosime patys ir suderinsime prieš spaudą.']
      ],
      sizes: [
        { n: 'A4 → DL (2 lankstymai)', k: 1 },
        { n: 'A4 → A5 (1 lankstymas)', k: 0.88 },
        { n: 'A3 → A4 (1 lankstymas)', k: 1.7 }
      ],
      mats: [{ n: 'Kreidinis 150 g', k: 1 }, { n: 'Kreidinis 200 g', k: 1.2 }, { n: 'Kreidinis 250 g', k: 1.4 }],
      sides: true,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Matinis laminavimas', k: 1.3 }, { n: 'Dalinis UV lakas', k: 1.6, d: 1 }]
    },
    {
      id: 'plak', name: 'Plakatai', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'low',
      setup: 0, base: 3.4, days: 1, defQty: 10, qtys: [1, 5, 10, 25, 50, 100],
      img: 'p1.jpg',
      lead: 'Plakatų spauda A3, A2, A1 ir B1 formatais. Plakatinis popierius, blizgus fotopopierius arba drėgmei atsparus sintetinis pagrindas su laminavimu ir akutėmis.',
      bullets: ['Nuo 1 vnt. — minimalaus tiražo nėra', 'Drėgmei atsparus variantas lauko sąlygoms', 'Akutės kampuose pakabinimui', 'Terminas — 1 darbo diena'],
      kw: 'plakatai, plakatų spauda, A1 plakatai, Klaipėda',
      faq: [
        ['Ar galima plakatus kabinti lauke?', 'Taip — pasirinkite sintetinį drėgmei atsparų pagrindą ir laminavimą. Paprastas plakatinis popierius skirtas vidaus patalpoms.'],
        ['Ar spausdinate vieną plakatą?', 'Taip, minimalaus tiražo nėra — vienas A1 plakatas yra įprastas užsakymas.']
      ],
      sizes: [
        { n: 'A3 (297 × 420 mm)', k: 0.55 },
        { n: 'A2 (420 × 594 mm)', k: 1 },
        { n: 'A1 (594 × 841 mm)', k: 1.9 },
        { n: 'B1 (700 × 1000 mm)', k: 2.6 }
      ],
      mats: [
        { n: 'Plakatinis popierius 150 g', k: 1 },
        { n: 'Blizgus fotopopierius 200 g', k: 1.45 },
        { n: 'Sintetinis (atsparus drėgmei)', k: 1.8 }
      ],
      sides: false,
      fins: [{ n: 'Be apdailos', k: 1 }, { n: 'Laminavimas', k: 1.4 }, { n: 'Su akutėmis kampuose', k: 1.25 }]
    },
    {
      id: 'lipd', name: 'Lipdukai ir etiketės', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'high',
      setup: 8, base: 0.22, days: 2, defQty: 250, qtys: [50, 100, 250, 500, 1000, 2500],
      img: 'p2.jpg',
      lead: 'Lipdukai ir etiketės ant vidaus arba lauko lipnios plėvelės, skaidrios plėvelės ir popieriaus. Pjaustome stačiakampiais arba pagal kontūrą.',
      bullets: ['Lauko plėvelė laiko 3–5 metus', 'Pjovimas pagal kontūrą — bet kokia forma', 'Skaidri plėvelė vitrinoms', 'Terminas — 2 darbo dienos'],
      kw: 'lipdukai, etiketės, lipdukų spauda, Klaipėda',
      faq: [
        ['Kiek laiko lipdukas išlieka lauke?', 'Su lauko plėvele — 3–5 metus, priklausomai nuo saulės. Vidaus plėvelė lauke greitai išblunka.'],
        ['Ar galite pjauti pagal mano logotipo formą?', 'Taip, pasirinkite apdailą „Pjauti pagal kontūrą" — pjovimo kelią paruošiame iš Jūsų vektorinio failo.']
      ],
      sizes: [
        { n: 'iki 50 × 50 mm', k: 0.6 },
        { n: 'iki 100 × 100 mm', k: 1 },
        { n: 'iki 150 × 150 mm', k: 1.7 },
        { n: 'A5 dydžio', k: 2.4 }
      ],
      mats: [
        { n: 'Lipni plėvelė (vidaus)', k: 1 },
        { n: 'Lipni plėvelė (lauko, 3–5 m.)', k: 1.4 },
        { n: 'Skaidri plėvelė', k: 1.35 },
        { n: 'Popierinė etiketė', k: 0.85 }
      ],
      sides: false,
      fins: [{ n: 'Stačiakampiai', k: 1 }, { n: 'Pjauti pagal kontūrą', k: 1.45, d: 1 }, { n: 'Laminuoti (matiniai)', k: 1.3 }]
    },
    {
      id: 'drobe', name: 'Spauda ant drobės', cat: 'Plačiaformatė spauda', unit: 'vnt.', vol: 'low',
      setup: 0, base: 24, days: 3, defQty: 1, qtys: [1, 2, 3, 5, 10],
      img: 'p1.jpg',
      lead: 'Nuotraukos ir paveikslai ant drobės — su mediniu porėmiu arba be jo, nuo 30 × 40 iki 80 × 120 cm. Galima padengti apsauginiu laku.',
      bullets: ['Keturi dydžiai iki 80 × 120 cm', 'Su porėmiu — parą galima kabinti', 'Apsauginis lakas nuo nubrozdinimų', 'Terminas — 3 darbo dienos'],
      kw: 'spauda ant drobės, nuotrauka ant drobės, Klaipėda',
      faq: [
        ['Kokios raiškos nuotraukos reikia?', 'Kuo didesnė drobė, tuo didesnio failo reikia. 40 × 60 cm pakanka apie 3000 × 4500 px — atsiųskite originalą, patikrinsime nemokamai.'],
        ['Ar drobė ateina paruošta kabinti?', 'Su porėmiu — taip, iškart galima kabinti. Be porėmio gausite tik atspaustą drobę įrėminimui.']
      ],
      sizes: [
        { n: '30 × 40 cm', k: 0.7 },
        { n: '40 × 60 cm', k: 1 },
        { n: '60 × 90 cm', k: 1.75 },
        { n: '80 × 120 cm', k: 2.6 }
      ],
      mats: [{ n: 'Drobė ant porėmio', k: 1 }, { n: 'Drobė be porėmio', k: 0.72 }, { n: 'Drobė + apsauginis lakas', k: 1.2 }],
      sides: false,
      fins: [{ n: 'Be rėmo', k: 1 }, { n: 'Medinis rėmas', k: 1.45, d: 1 }]
    },
    {
      id: 'kviet', name: 'Vestuviniai kvietimai', cat: 'Šventinė atributika', unit: 'vnt.', vol: 'high',
      setup: 15, base: 0.7, days: 4, defQty: 100, qtys: [30, 50, 100, 150, 250],
      img: 'kalend.jpg',
      lead: 'Vestuviniai kvietimai ant dizainerinio, perlamutrinio ar faktūrinio popieriaus. Vienlapiai, atverčiami arba su įdėklu ir vokeliu, su kaspinu, folijavimu ar reljefine spauda.',
      bullets: ['Tiražai nuo 30 vnt.', 'Perlamutrinis ir linen popierius', 'Folijavimas ir reljefinė spauda', 'Terminas — 4 darbo dienos'],
      kw: 'vestuviniai kvietimai, kvietimų spauda, Klaipėda',
      faq: [
        ['Ar galite sukurti kvietimo dizainą?', 'Taip. Dizaino darbai skaičiuojami atskirai ir visada suderinami iš anksto — pasiūlyme matysite atskira eilute.'],
        ['Kada užsakyti kvietimus?', 'Rekomenduojame likus bent 3 mėnesiams iki šventės — liks laiko dizainui, korektūrai ir išsiuntimui svečiams.']
      ],
      sizes: [{ n: 'Vienlapis 100 × 200 mm', k: 1 }, { n: 'Atverčiamas 145 × 145 mm', k: 1.35 }, { n: 'Su įdėklu ir vokeliu', k: 1.75 }],
      mats: [{ n: 'Dizainerinis popierius 300 g', k: 1 }, { n: 'Perlamutrinis 300 g', k: 1.25 }, { n: 'Faktūrinis (linen) 300 g', k: 1.3 }],
      sides: true,
      fins: [
        { n: 'Be apdailos', k: 1 },
        { n: 'Su atlasiniu kaspinu', k: 1.4, d: 1 },
        { n: 'Folijavimas', k: 1.8, d: 2 },
        { n: 'Reljefinė spauda', k: 1.9, d: 2 }
      ]
    },
    {
      id: 'kalend', name: 'Kalendoriai', cat: 'Skaitmeninė spauda', unit: 'vnt.', vol: 'high',
      setup: 20, base: 2.6, days: 4, defQty: 100, qtys: [25, 50, 100, 250, 500],
      img: 'kalend.jpg',
      lead: 'Stalo trišoniai, sieniniai A3 dvylikos lapų ir vienlapiai A2 kalendoriai su Jūsų logotipu. Su spirale, pakabinimu ir laminuotu viršeliu.',
      bullets: ['Trys kalendorių tipai', 'Spiralė ir pakabinimas', 'Laminuotas viršelis ilgaamžiškumui', 'Terminas — 4 darbo dienos'],
      kw: 'kalendoriai, kalendorių spauda, verslo dovanos, Klaipėda',
      faq: [
        ['Kada reikia užsakyti kitų metų kalendorius?', 'Geriausia rugsėjį–lapkritį. Gruodį gamyba užimta, o terminai ilgėja.'],
        ['Ar galima kiekvieno mėnesio nuotrauką savo?', 'Taip — sieniniam A3 kalendoriui reikės 12 nuotraukų, jas sudėliosime į maketą ir atsiųsime patvirtinti.']
      ],
      sizes: [{ n: 'Stalo, trišonis', k: 1 }, { n: 'Sieninis A3, 12 lapų', k: 1.55 }, { n: 'Sieninis vienlapis A2', k: 0.75 }],
      mats: [{ n: 'Kreidinis 200 g', k: 1 }, { n: 'Kreidinis 250 g', k: 1.15 }],
      sides: false,
      fins: [{ n: 'Su spirale', k: 1 }, { n: 'Su spirale ir pakabinimu', k: 1.1 }, { n: 'Laminuotas viršelis', k: 1.25 }]
    },
    {
      id: 'puod', name: 'Puodeliai su spauda', cat: 'Verslo dovanos', unit: 'vnt.', vol: 'low',
      setup: 0, base: 6.4, days: 3, defQty: 25, qtys: [1, 5, 10, 25, 50, 100],
      img: 'stendas.jpg',
      lead: 'Puodeliai su Jūsų spauda — balti, spalvoti viduje arba keičiantys spalvą nuo karšto gėrimo. Spauda iš vienos pusės arba aplink, su dovanų dėžute.',
      bullets: ['Nuo 1 vnt. — tinka ir dovanai', 'Magic puodeliai su spalvos efektu', 'Dovanų dėžutė', 'Terminas — 3 darbo dienos'],
      kw: 'puodeliai su spauda, verslo dovanos, magic puodeliai, Klaipėda',
      faq: [
        ['Ar puodelius galima plauti indaplovėje?', 'Rekomenduojame plauti rankomis — taip spauda išlieka ryški žymiai ilgiau.'],
        ['Ar galima užsakyti vieną puodelį?', 'Taip, minimalaus kiekio nėra. Didesniems kiekiams vieneto kaina mažėja.']
      ],
      sizes: [{ n: 'Baltas 330 ml', k: 1 }, { n: 'Spalvotas viduje 330 ml', k: 1.2 }, { n: 'Keičiantis spalvą (magic)', k: 1.75 }],
      mats: null,
      sides: false,
      fins: [{ n: 'Spauda iš vienos pusės', k: 1 }, { n: 'Spauda aplink', k: 1.3 }, { n: 'Su dovanų dėžute', k: 1.35 }]
    },
    {
      id: 'auto', name: 'Automobilio apklijavimas', cat: 'Išorinė reklama', unit: 'm²', vol: 'low',
      setup: 45, base: 27, days: 4, defQty: 5, qtys: [1, 3, 5, 10, 20],
      img: 'auto.jpg',
      lead: 'Automobilių apklijavimas reklamine plėvele — durys, šonai arba visas kėbulas. Perforuota plėvelė langams, apsauginis laminatas ir montavimas vietoje.',
      bullets: ['Plėvelės garantija iki 5–7 metų', 'Perforuota plėvelė langams — matyti iš vidaus', 'Montavimas mūsų dirbtuvėse', 'Terminas — 4 darbo dienos'],
      kw: 'automobilių apklijavimas, reklama ant automobilio, plėvelė, Klaipėda',
      faq: [
        ['Ar plėvelė gadina automobilio dažus?', 'Ne — kokybiška plėvelė nuimama nepažeidžiant gamyklinio dažymo ir netgi apsaugo jį nuo smulkių įbrėžimų.'],
        ['Kiek kvadratinių metrų reikia mano automobiliui?', 'Šonų apklijavimui paprastai 4–6 m², visam kėbului — 15–20 m². Atsiųskite automobilio modelį ir suskaičiuosime tiksliai.']
      ],
      sizes: [{ n: 'Lygus paviršius (durys, šonas)', k: 1 }, { n: 'Su iškilimais / apvadais', k: 1.25 }, { n: 'Visas kėbulas', k: 1.4 }],
      mats: [
        { n: 'Lipni plėvelė (3 m. garantija)', k: 1 },
        { n: 'Litavimo plėvelė (5–7 m.)', k: 1.35 },
        { n: 'Perforuota plėvelė langams', k: 1.5 }
      ],
      sides: false,
      fins: [{ n: 'Be laminato', k: 1 }, { n: 'Su apsauginiu laminatu', k: 1.3, d: 1 }, { n: 'Su montavimu vietoje', k: 1.45, d: 1 }]
    }
  ];

  var VOL = {
    high: [[100, 1], [250, .86], [500, .72], [1000, .6], [2500, .5], [Infinity, .44]],
    low: [[1, 1], [5, .95], [10, .9], [25, .84], [50, .78], [Infinity, .72]]
  };

  function volFactor(p, qty) {
    var t = VOL[p.vol], i;
    for (i = 0; i < t.length; i++) if (qty <= t[i][0]) return t[i][1];
    return t[t.length - 1][1];
  }

  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return PRODUCTS[0];
  }

  /* Kaina pagal pasirinkimą. sel = {qty,size,mat,sides,fin,rush} (indeksai).
     Koeficientai imami iš CFG, todėl pakeitus juos valdymo sistemoje kaina
     iškart persiskaičiuoja visur — ir skaičiuoklėje, ir produktų puslapiuose. */
  function price(p, sel) {
    var qty = Math.max(1, sel.qty || 1);
    var k = 1;
    var pick = function (arr, i) { return arr && arr[i] ? arr[i] : (arr && arr[0]) || { k: 1 }; };
    if (p.sizes && p.sizes.length) k *= pick(p.sizes, sel.size || 0).k;
    if (p.mats && p.mats.length) k *= pick(p.mats, sel.mat || 0).k;
    if (p.sides) k *= (sel.sides === 1 ? 1 : CFG.sides);
    if (p.fins && p.fins.length) k *= pick(p.fins, sel.fin || 0).k;
    var net = p.setup + p.base * k * qty * volFactor(p, qty);
    if (sel.rush) net *= CFG.rush;
    return { net: net, gross: net * CFG.vat, unit: net * CFG.vat / qty, qty: qty };
  }

  function eur(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function eur4(n) { return (n < 1 ? n.toFixed(3) : n.toFixed(2)).replace('.', ',') + ' €'; }

  /* ── Valdymo sistemos pakeitimai ────────────────────────────────────────
     Savininkas valdymo sistemoje redaguoja VISKĄ: bendrus koeficientus (PVM,
     dvipusė, skuba), kiekio nuolaidų lentelę, produktų sąrašą ir kiekvieno
     produkto formatus, medžiagas bei apdailas su jų koeficientais.

     Saugoma forma:
       { cfg:{vat,sides,rush}, vol:{high:[[qty,k]…],low:[…]},
         products:[ {id,name,cat,unit,vol,setup,base,days,qtys,sides,
                     sizes:[{n,k}],mats:[{n,k}]|null,fins:[{n,k}],
                     img,lead,bullets,kw,faq} … ] }

     Pradinės reikšmės lieka ŠIAME faile, todėl išjungus ar ištrynus pakeitimus
     svetainė veikia kaip anksčiau — pakeitimai tik UŽDEDAMI ant viršaus. */
  var DEFAULTS = JSON.parse(JSON.stringify({ cfg: CFG, vol: VOL, products: PRODUCTS }));

  function applyOverrides(ov) {
    if (!ov) return;

    if (ov.cfg) {
      ['vat', 'sides', 'rush'].forEach(function (k) {
        if (typeof ov.cfg[k] === 'number' && ov.cfg[k] > 0) CFG[k] = ov.cfg[k];
      });
      VAT = CFG.vat;
    }

    if (ov.vol) {
      ['high', 'low'].forEach(function (t) {
        if (Array.isArray(ov.vol[t]) && ov.vol[t].length) {
          // Paskutinė pakopa visada turi apimti likusius kiekius.
          var rows = ov.vol[t].map(function (r) { return [r[0] === null ? Infinity : r[0], r[1]]; });
          rows[rows.length - 1][0] = Infinity;
          VOL[t] = rows;
        }
      });
    }

    if (Array.isArray(ov.products) && ov.products.length) {
      // Sąrašas gali būti perrikiuotas, papildytas ar sutrumpintas — todėl
      // pakeičiame turinį, o ne kiekvieną lauką atskirai.
      var kept = ov.products.map(function (o) {
        var base = DEFAULTS.products.filter(function (d) { return d.id === o.id; })[0] || {};
        var merged = {};
        Object.keys(base).forEach(function (k) { merged[k] = base[k]; });
        Object.keys(o).forEach(function (k) { if (o[k] !== undefined && o[k] !== null) merged[k] = o[k]; });
        if (o.mats === null) merged.mats = null;          // sąmoningai be medžiagų

        /* Sutvarkome, ko valdymo sistema neklausia, bet kodui reikia. Naujas
           produktas ateina be defQty, o pakeitus siūlomus kiekius senasis
           defQty gali nebepatekti į sąrašą — tada skaičiuoklė startuotų nuo
           neegzistuojančio kiekio. */
        if (!Array.isArray(merged.qtys) || !merged.qtys.length) merged.qtys = [100, 250, 500];
        if (merged.qtys.indexOf(merged.defQty) < 0) merged.defQty = merged.qtys[Math.floor(merged.qtys.length / 2)];
        if (merged.vol !== 'low') merged.vol = 'high';
        if (!merged.sizes || !merged.sizes.length) merged.sizes = [{ n: 'Standartinis', k: 1 }];
        if (!merged.fins || !merged.fins.length) merged.fins = [{ n: 'Be apdailos', k: 1 }];
        if (!merged.img) merged.img = 'skaitm.jpg';
        if (!merged.lead) merged.lead = merged.name || '';
        if (!Array.isArray(merged.bullets)) merged.bullets = [];
        if (!Array.isArray(merged.faq)) merged.faq = [];
        if (!merged.kw) merged.kw = '';
        return merged;
      });
      PRODUCTS.length = 0;
      kept.forEach(function (p) { PRODUCTS.push(p); });
    }
  }

  /* Pradinės reikšmės valdymo sistemai — kad mygtukas „Grąžinti pradines"
     visada turėtų į ką grįžti, net jei pakeitimai jau pritaikyti. */
  function defaults() { return JSON.parse(JSON.stringify(DEFAULTS)); }

  return {
    get VAT() { return CFG.vat; },
    CFG: CFG, PRODUCTS: PRODUCTS, VOL: VOL,
    volFactor: volFactor, byId: byId, price: price,
    eur: eur, eur4: eur4, applyOverrides: applyOverrides, defaults: defaults,
    LS: { cart: 'ms_demo_cart', orders: 'ms_demo_orders', prices: 'ms_demo_prices', content: 'ms_demo_content' }
  };
});
