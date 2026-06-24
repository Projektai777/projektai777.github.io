// =============================================================
// VISŲ VERSLŲ KONFIGŪRACIJA — vienas įrašas = vienas klientas.
// Naujo verslo prijungimas: atsidarykite /tools/setup.html,
// užpildykite formą ir įklijuokite sugeneruotą bloką čia.
//
// pin_hash = SHA-256("slug:PIN") — pats PIN niekur nesaugomas.
// =============================================================

export default {

  demo: {
    business_name: 'Coffee Box Kaunas',
    logo_url: '',                       // tuščia = rodoma pirma raidė
    primary_color: '#FF5733',
    stamps_needed: 10,
    reward_text: 'Nemokamas didelis kapučinas',
    pin_hash: '88bf6316a604b0e00e239641f1e554ac86271ec4be44757ac87edb4269e0c331', // PIN: 1234
  },

  berneliai: {
    business_name: 'Bernelių užeiga',
    logo_url: 'logos/berneliai-logo.png', // official wordmark logo
    logo_wide: true,                      // wordmark -> show as a wide plate, hide the redundant name heading
    icon_url: 'logos/berneliai.png',      // square emblem -> home-screen / app icon (better than the wide wordmark)
    hero_url: 'logos/berneliai-hero.jpg', // soft photo header behind the logo
    primary_color: '#b91c1c',
    stamps_needed: 10,
    reward_text: '10-as patiekalas nemokamai',
    stamp_icon: '🍴',                     // restaurant-flavored stamp (default for any tenant; override per business)
    // milestones = tarpiniai prizai (rodo, kad sistema lanksti)
    milestones: [
      { at: 5, text: 'Nemokamas gardus kompotas' },
      { at: 10, text: '10-as patiekalas nemokamai' },
    ],
    birthday_reward: 'Nemokamas desertas gimtadienio proga', // gimtadienio dovana (rodo kortelėje)
    // Google atsiliepimo nuoroda — po prizo atsiėmimo svečiui pasiūloma palikti atsiliepimą.
    // Tikram klientui įdėkite tikslų „rašyti atsiliepimą" URL; čia – paieška pagal pavadinimą.
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=Berneli%C5%B3+u%C5%BEeiga',
    preview: true, // rodo pardavimų funkcijas (auto-pildymą, darbuotojo gidą, CTA) — pašalinti įdiegus klientui
    pin_hash: 'e1bee1f8c7bc8cc8f481f0d9dc9f1e607818850ab96c5910a4537d4788d5dd35', // PIN: 1234
  },

  // kitasverslas: {
  //   business_name: 'Plovykla PRO',
  //   logo_url: '/logos/plovykla.png',
  //   primary_color: '#0ea5e9',
  //   stamps_needed: 5,
  //   reward_text: 'Nemokamas plovimas',
  //   pin_hash: '...',
  // },

};
