// =============================================================
// VISŲ VERSLŲ KONFIGŪRACIJA — vienas įrašas = vienas klientas.
// Naujo verslo prijungimas: atsidarykite /tools/setup.html,
// užpildykite formą ir įklijuokite sugeneruotą bloką čia.
//
// staff_secret    = atsitiktinis raktas, iš kurio /tools/staff.html
//                   generuoja kas 30 s besikeičiantį QR kodą (kaip 2FA).
//                   Klientas jį nuskaito sava kamera — antspaudas užsiskaito
//                   automatiškai, telefono atiduoti nereikia.
// staff_pass_hash = SHA-256("slug:slaptažodis") — darbuotojo puslapio
//                   slaptažodis (atrakina /tools/staff.html). Pats
//                   slaptažodis niekur nesaugomas.
//
// DU REŽIMAI:
//  • STATINIS (demo / pardavimų peržiūra) — `staff_secret` ČIA, kortelė veikia be
//    serverio. Tinka demonstracijoms; antspaudų skaičius saugomas telefone.
//  • SERVERINIS / SAUGUS (tikram klientui, įdiegus) — pridėkite `server: true` IR
//    PAŠALINKITE `staff_secret` + `staff_pass_hash` iš šio failo. Paslaptis ir
//    antspaudų skaičius lieka TIK Worker'yje (žr. worker/README.md → /admin/tenant),
//    todėl klientas negali jų perskaityti ar suklastoti. Antspaudui pridėti reikia
//    interneto (kortelė rodoma ir be jo). Geofence + antspaudų statistika pagal įrenginį — Worker'yje.
//    Įdiegimo žingsniai: worker/README.md „Going live (secure tier)".
// =============================================================

export default {

  demo: {
    business_name: 'Demonstracinė kavinė',
    logo_url: '',                       // tuščia = rodoma pirma raidė
    primary_color: '#FF5733',
    stamps_needed: 10,
    reward_text: 'Nemokamas didelis kapučinas',
    reward_text_en: 'Free large cappuccino', // EN variantas (rodomas kai įjungtas EN)
    staff_demo_pass: '123456', // PREVIEW-ONLY: rodomas savininko puslapyje (darbuotojo pusės peržiūrai)
    staff_secret: '61d7201b3e2e02a883c9e4a42f527949',     // rotating-code raktas
    staff_pass_hash: 'a1634fed17a756915fbda189de23ab9626c1badaf3785bbb790951f25b72ccea', // /tools/staff.html slaptažodis: 123456
  },

  berneliai: {
    business_name: 'Bernelių užeiga',
    logo_url: 'logos/berneliai-logo.png', // official wordmark logo
    logo_wide: true,                      // wordmark -> show as a wide plate, hide the redundant name heading
    icon_url: 'logos/berneliai.png',      // square brand image
    app_icon: 'logos/berneliai-icon-512.png',          // real 512² PNG used as the home-screen icon (iOS + Android)
    app_manifest: 'manifests/berneliai.webmanifest',   // real manifest file -> Android WebAPK install actually completes
    hero_url: 'logos/berneliai-hero.jpg', // soft photo header behind the logo
    primary_color: '#b91c1c',
    stamps_needed: 10,
    reward_text: '25% nuolaida sąskaitai',
    reward_text_en: '25% off your bill',  // EN variantas (rodomas kai įjungtas EN)
    stamp_icon: '🍴',                     // restaurant-flavored stamp (default for any tenant; override per business)
    // milestones = tarpiniai prizai (rodo, kad sistema lanksti); text_en = EN variantas
    milestones: [
      { at: 5, text: '10% nuolaida sąskaitai', text_en: '10% off your bill' },
      { at: 10, text: '25% nuolaida sąskaitai', text_en: '25% off your bill' },
    ],
    birthday_reward: 'Nemokamas desertas', // gimtadienio dovana (rodo kortelėje)
    birthday_reward_en: 'Free birthday dessert',
    // Google atsiliepimo nuoroda — po prizo atsiėmimo svečiui pasiūloma palikti atsiliepimą.
    // Tikram klientui įdėkite tikslų „rašyti atsiliepimą" URL; čia – paieška pagal pavadinimą.
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=Berneli%C5%B3+u%C5%BEeiga',
    preview: true, // rodo pardavimų funkcijas (auto-pildymą, darbuotojo gidą, CTA) — pašalinti įdiegus klientui
    staff_demo_pass: 'berneliai2026', // PREVIEW-ONLY: rodomas savininko puslapyje, kad prospektas galėtų pažiūrėti darbuotojo pusę; pašalinti įdiegus
    staff_secret: '3798bc6a93d45c798242d999ea43b6bf',     // rotating-code raktas
    staff_pass_hash: 'ae4964eeffe94ad8cbd2ec334814ec1b6b9b568d4729fadd74daf9caf7209ab1', // /tools/staff.html slaptažodis: berneliai2026
  },

  // STATINIO QR ("ant stalo") demo — ATSKIRA, nepriklausoma berneliai versija.
  // Skirtumas nuo `berneliai`: NĖRA besikeičiančio darbuotojo QR ir telefono atidavimo.
  // Svečias nuskaito VIENĄ nekintantį QR plakatą, pritvirtintą ant stalo/sienos/prie kasos
  // (URL: …/?b=berneliai_qr&q=1). `poster: true` įjungia šį režimą (žr. isPoster app.js).
  // Apsauga (tikram klientui, server:true): /pscan Worker'yje — ŠVELNUS geofence (vieta tik
  // patikrinama, nesaugoma) + darbo valandos + vienas antspaudas vienam ŽMOGUI per dieną
  // (serverio pasirašytas pid) + plakato „kill-switch". Nuolaidą galutinai pritaiko personalas
  // prie kasos. Demo (preview, BE server) veikia kliento pusėje ir atleista — testuojama iš bet kur.
  // Atskiras slug => atskira localStorage erdvė => JOKIO konflikto su `berneliai`.
  berneliai_qr: {
    business_name: 'Bernelių užeiga',
    logo_url: 'logos/berneliai-logo.png',
    logo_wide: true,
    icon_url: 'logos/berneliai.png',
    app_icon: 'logos/berneliai-icon-512.png',
    app_manifest: 'manifests/berneliai_qr.webmanifest',
    hero_url: 'logos/berneliai-hero.jpg',
    primary_color: '#b91c1c',
    stamps_needed: 10,
    reward_text: '25% nuolaida sąskaitai',
    reward_text_en: '25% off your bill',
    stamp_icon: '🍴',
    milestones: [
      { at: 5, text: '10% nuolaida sąskaitai', text_en: '10% off your bill' },
      { at: 10, text: '25% nuolaida sąskaitai', text_en: '25% off your bill' },
    ],
    birthday_reward: 'Nemokamas desertas',
    birthday_reward_en: 'Free birthday dessert',
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=Berneli%C5%B3+u%C5%BEeiga',
    poster: true,  // NAUJA: statinio QR ("ant stalo") režimas
    preview: true, // demo: kliento pusėje, atleista nuo cooldown/geofence — galima kartoti laisvai
    // staff_secret + staff_pass_hash privalomi (check-tenants.js) IR naudojami demo simuliacijai
    // (currentCode -> staticBackend.verifyCode); tikram klientui šie laukai keliauja į Worker'į.
    // staff_demo_pass NEnurodytas tyčia — statinio QR režime NĖRA darbuotojo puslapio.
    staff_secret: 'c07a962faa7211225b8cc2ac3eae5fc5',
    staff_pass_hash: 'c805bb919d215fdc15f106a46ca138c43fe958640becff5516ce0ba2c10b0183', // demo slaptažodis: berneliaiqr2026
  },

  kebabinn: {
    business_name: 'KEBAB inn',
    logo_url: 'logos/kebabinn-logo.png',  // official horizontal wordmark
    logo_wide: true,                      // wordmark -> wide plate, hides redundant name heading
    icon_url: 'logos/kebabinn.png',       // square brand image (flame + ūsai)
    app_icon: 'logos/kebabinn-icon-512.png',           // 512² home-screen icon (iOS + Android)
    app_manifest: 'manifests/kebabinn.webmanifest',    // real manifest -> Android WebAPK install completes
    hero_url: 'logos/kebabinn-hero.jpg',  // firminis kebabas ant kreminio fono
    primary_color: '#ed2127',             // brand red (iš kebabinn.lt --brand-red)
    stamps_needed: 10,
    reward_text: '25% nuolaida sąskaitai',
    reward_text_en: '25% off your bill',  // EN variantas (rodomas kai įjungtas EN)
    stamp_icon: '🍴',                     // toks pat antspaudas kaip Bernelių (vienodas stilius)
    // milestones = tarpiniai prizai (rodo, kad sistema lanksti); text_en = EN variantas
    milestones: [
      { at: 5, text: '10% nuolaida sąskaitai', text_en: '10% off your bill' },
      { at: 10, text: '25% nuolaida sąskaitai', text_en: '25% off your bill' },
    ],
    birthday_reward: 'Nemokamas firminis kebabas', // gimtadienio dovana (rodo kortelėje)
    birthday_reward_en: 'Free signature kebab',
    // Tikri KEBAB inn padaliniai — rodomi darbuotojo statistikoje (filialų sąrašas, grafikai,
    // anomalijų žymos). Pavadinimai pagal jų pačių „KEBAB inn @ ..." vietas. w = apkrovos svoris.
    demo_branches: [
      { name: 'Gariūnai', w: 0.6, city: 'Vilnius' },            // Gariūnų g. 55
      { name: 'Lazdynai', w: 0.45, city: 'Vilnius' },           // Architektų g. 130
      { name: 'Naujamiestis', w: 0.4, city: 'Vilnius' },        // Savanorių pr. 15A
      { name: 'Šiaurės Miestelis', w: 0.35, city: 'Vilnius' },  // P. Lukšio g. 22
      { name: 'Eišiškės', w: 0.3, city: 'Vilnius' },            // Eišiškių pl. 82
      { name: 'Naujininkai', w: 0.3, city: 'Vilnius' },         // Dariaus ir Girėno g. 17
      { name: 'Greitkelis', w: 0.45, city: 'Kaunas' },          // Ateities pl. 50B
      { name: 'Aleksotas', w: 0.35, city: 'Kaunas' },           // Europos pr. 43
      { name: 'Kėdainiai', w: 0.25, city: 'Kėdainiai' },        // J. Basanavičiaus g. 51
    ],
    // Google atsiliepimo nuoroda — po prizo atsiėmimo svečiui pasiūloma palikti atsiliepimą.
    // Tikram klientui įdėkite tikslų „rašyti atsiliepimą" URL; čia – paieška pagal pavadinimą.
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=KEBAB+inn',
    preview: true, // rodo pardavimų funkcijas (auto-pildymą, darbuotojo gidą, CTA) — pašalinti įdiegus klientui
    staff_demo_pass: 'kebabinn2026', // PREVIEW-ONLY: rodomas savininko puslapyje, kad prospektas pamatytų darbuotojo pusę; pašalinti įdiegus
    staff_secret: '82817f34fc753ec35f83a8d796a689c7',     // rotating-code raktas
    staff_pass_hash: '1cc34dd7af7a3501dd99af8d4d098d8e0ec83e7c1513d9343eb787cbda1bcfc5', // /tools/staff.html slaptažodis: kebabinn2026
  },

  rugile: {
    business_name: 'Rugilės blakstienos',
    logo_url: 'logos/rugile.png',         // square brand mark (white eye + lashes on rose)
    icon_url: 'logos/rugile.png',         // square brand image
    app_icon: 'logos/rugile-icon-512.png',             // 512² home-screen icon (iOS + Android)
    app_manifest: 'manifests/rugile.webmanifest',      // real manifest -> Android WebAPK install completes
    hero_url: 'logos/rugile-hero.jpg',    // soft blush photo header behind the logo
    primary_color: '#b23a6a',             // rose (lash-studio blush, deep enough for white button text)
    stamps_needed: 10,
    reward_text: '25% nuolaida procedūrai',
    reward_text_en: '25% off your treatment', // EN variantas (rodomas kai įjungtas EN)
    stamp_icon: '✨',                      // blakstienų/grožio antspaudas
    // milestones = tarpiniai prizai (rodo, kad sistema lanksti); text_en = EN variantas
    milestones: [
      { at: 5, text: '10% nuolaida procedūrai', text_en: '10% off your treatment' },
      { at: 10, text: '25% nuolaida procedūrai', text_en: '25% off your treatment' },
    ],
    birthday_reward: '−20% gimtadienio nuolaida', // gimtadienio dovana (rodo kortelėje)
    birthday_reward_en: 'Birthday: 20% off',
    // Viena studija Kaune — rodoma darbuotojo statistikoje (vieta, grafikai, anomalijų žymos).
    // w = apkrovos svoris (solo meistrei laikomas saikingas).
    demo_branches: [
      { name: 'Kaunas', w: 0.8 },         // Rugilės blakstienų studija, Kaunas
    ],
    // Google atsiliepimo nuoroda — po prizo atsiėmimo svečiui pasiūloma palikti atsiliepimą.
    // Tikram klientui įdėkite tikslų „rašyti atsiliepimą" URL; čia – paieška pagal pavadinimą.
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=Rugil%C4%97s+blakstienos+Kaunas',
    preview: true, // rodo pardavimų funkcijas (auto-pildymą, darbuotojo gidą, CTA) — pašalinti įdiegus klientui
    staff_demo_pass: 'rugile2026', // PREVIEW-ONLY: rodomas savininko puslapyje, kad prospektas pamatytų darbuotojo pusę; pašalinti įdiegus
    staff_secret: '3f5145aa6c20ee2f264990f9ab00d654',     // rotating-code raktas
    staff_pass_hash: 'd7c89cdfdb36ffd19be0e9de7dd6376a4b2a738852b82dee9005d82f6c9524dc', // /tools/staff.html slaptažodis: rugile2026
  },

  // Automobilių plovykla Telšiuose (Dainius, autobondas.lt) — susidomėjęs klientas
  // (lojalumo kortelė su nemokamu plovimu). Logotipas ir „vandens lašų" fonas — jų pačių.
  autobondas: {
    business_name: 'Auto Bondas',
    logo_url: 'logos/autobondas-logo.png', // oficialus ovalus logotipas (wordmark)
    logo_wide: true,                       // wordmark -> platus skydelis, paslepia perteklinį pavadinimą
    icon_url: 'logos/autobondas.png',      // kvadratinis firminis ženklas
    hero_url: 'logos/autobondas-hero.jpg', // švarūs vandens lašai ant stiklo (plovyklos motyvas)
    primary_color: '#095498',              // logotipo mėlyna
    stamps_needed: 8,
    reward_text: 'Nemokamas plovimas',
    reward_text_en: 'Free car wash',       // EN variantas (rodomas kai įjungtas EN)
    stamp_icon: '🚗',                      // atsarginis emoji (rodomas, jei paveikslėlio nėra)
    // FIRMINIS paveikslėlio antspaudas (2026-07-14): švarus automobilis muilo burbule,
    // sugeneruotas pagal firminę mėlyną. Kiti 4 variantai — design/stamp-icons/ (pasikeisti:
    // perkopijuoti kitą į public/logos/autobondas-stamp.png). Prizo langeliai lieka 🎁.
    stamp_icon_url: 'logos/autobondas-stamp.png',
    // VIENAS prizas (savininko pageidavimas 2026-07-14): jokių tarpinių milestone —
    // tik nemokamas plovimas užpildžius kortelę; gimtadienio dovana — taip pat nemokamas plovimas.
    birthday_reward: 'Nemokamas plovimas', // gimtadienio dovana (rodo kortelėje)
    birthday_reward_en: 'Free birthday car wash',
    // Viena vieta Telšiuose — rodoma darbuotojo statistikoje (vieta, grafikai).
    demo_branches: [
      { name: 'Telšiai', w: 0.8 },         // Kęstučio g. 20c, Telšiai
    ],
    // Google atsiliepimo nuoroda — po prizo atsiėmimo klientui pasiūloma palikti atsiliepimą.
    // Tikram klientui įdėkite tikslų „rašyti atsiliepimą" URL; čia – paieška pagal pavadinimą.
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=Auto+Bondas+Tel%C5%A1iai',
    preview: true, // rodo pardavimų funkcijas (auto-pildymą, darbuotojo gidą, CTA) — pašalinti įdiegus klientui
    staff_demo_pass: 'autobondas2026', // PREVIEW-ONLY: rodomas savininko puslapyje; pašalinti įdiegus
    staff_secret: 'a2f1e0b143941c2127a6fa7aa6b9687e',     // rotating-code raktas
    staff_pass_hash: 'ded97b32282d7f7d1e8c4431f6950468e22c000142a847e2ab038e7bcbfae2cb', // /tools/staff.html slaptažodis: autobondas2026
  },

  // STATINIS pavyzdys (demo / peržiūra) — paslaptis čia:
  // kitasverslas: {
  //   business_name: 'Plovykla PRO',
  //   logo_url: '/logos/plovykla.png',
  //   primary_color: '#0ea5e9',
  //   stamps_needed: 5,
  //   reward_text: 'Nemokamas plovimas',
  //   staff_secret: '...',
  //   staff_pass_hash: '...',
  // },

  // SERVERINIS / SAUGUS pavyzdys (tikram klientui) — JOKIO staff_secret/staff_pass_hash
  // čia; jie gyvena tik Worker'yje (provisioned per /admin/tenant). Pridėkite `server: true`:
  // realusklientas: {
  //   business_name: 'Plovykla PRO',
  //   logo_url: '/logos/plovykla.png',
  //   primary_color: '#0ea5e9',
  //   stamps_needed: 5,
  //   reward_text: 'Nemokamas plovimas',
  //   server: true, // paslaptis + antspaudų skaičius Worker'yje; geofence + statistika pagal įrenginį ten pat
  // },

};
