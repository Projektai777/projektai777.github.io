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
// =============================================================

export default {

  demo: {
    business_name: 'Coffee Box Kaunas',
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

  // kitasverslas: {
  //   business_name: 'Plovykla PRO',
  //   logo_url: '/logos/plovykla.png',
  //   primary_color: '#0ea5e9',
  //   stamps_needed: 5,
  //   reward_text: 'Nemokamas plovimas',
  //   staff_secret: '...',
  //   staff_pass_hash: '...',
  // },

};
