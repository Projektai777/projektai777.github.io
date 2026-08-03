/* Objektų duomenys — VIENINTELĖ vieta, kur gyvena atlikti darbai.
   Ir puslapis, ir valdymo skydelis (admin.html) skaito iš čia, todėl jie negali išsiskirti.
   Tikroje versijoje šis sąrašas ateitų iš duomenų bazės, o objektus pildytume mes
   (arba pats klientas per admin.html — kaip patogiau).

   PASTABA: objektai žemiau — PAVYZDINIAI. Adresai, trukmės ir apimtys sugalvoti,
   kad matytųsi puslapio struktūra. Vietoje jų sudedami tikri Santekai darbai. */

var CATS = [
  { id: 'visi',          name: 'Visi objektai' },
  { id: 'daugiabuciai',  name: 'Daugiabučiai' },
  { id: 'sildymas',      name: 'Šildymas ir katilinės' },
  { id: 'butai',         name: 'Butai ir namai' },
  { id: 'kanalizacija',  name: 'Kanalizacija' },
  { id: 'komerciniai',   name: 'Komerciniai objektai' },
];

var PROJECTS = [
  {
    id: 'silumos-punktas-silainiai',
    title: 'Šilumos punkto renovacija',
    cats: ['daugiabuciai', 'sildymas'],
    object: 'Daugiabutis, 60 butų',
    place: 'Kaunas, Šilainiai',
    year: 2026,
    duration: '6 darbo dienos',
    photo: './img/silumos-punktas.webp',
    photoReal: true,
    summary: 'Pakeistas susidėvėjęs šilumos punktas — naujas plokštelinis šilumokaitis, siurbliai ir automatika.',
    works: [
      'Demontuotas senas šilumos punktas ir susidėvėję vamzdynai',
      'Sumontuotas naujas plokštelinis šilumokaitis',
      'Pakeisti cirkuliaciniai siurbliai ir uždaromoji armatūra',
      'Įrengta automatika su temperatūros reguliavimu pagal orus',
      'Vamzdynai izoliuoti, sistema išbandyta slėgiu',
    ],
    result: 'Šildymo sąnaudos sumažėjo, gyventojai nebejaučia temperatūros svyravimų. Punktas perduotas su rašytine garantija.',
    tags: ['Šilumokaitis', 'Automatika', 'Izoliacija'],
  },
  {
    id: 'radiatoriai-zaliakalnis',
    title: 'Radiatorių keitimas bute',
    cats: ['butai'],
    object: 'Butas, 3 kambariai',
    place: 'Kaunas, Žaliakalnis',
    year: 2026,
    duration: '2 darbo dienos',
    photo: './img/radiatoriai.webp',
    summary: 'Pakeisti seni ketiniai radiatoriai, sumontuoti termostatiniai ventiliai.',
    works: [
      'Demontuoti seni ketiniai radiatoriai',
      'Perskaičiuota reikalinga galia kiekvienam kambariui',
      'Sumontuoti nauji aliuminiai radiatoriai',
      'Įrengti termostatiniai ventiliai',
      'Sistema užpildyta ir nuorinta',
    ],
    result: 'Kambariuose temperatūra reguliuojama atskirai, radiatoriai nebešąla iš apačios.',
    tags: ['Termostatai', 'Perskaičiuota galia'],
  },
  {
    id: 'vamzdynai-centras',
    title: 'Buto vamzdynų keitimas',
    cats: ['butai'],
    object: 'Butas, 2 kambariai',
    place: 'Kaunas, Centras',
    year: 2026,
    duration: '3 darbo dienos',
    photo: './img/vamzdziai.webp',
    summary: 'Pakeisti šalto ir karšto vandens bei kanalizacijos vamzdynai sename name.',
    works: [
      'Pakeisti šalto ir karšto vandens vamzdynai',
      'Presuoti daugiasluoksniai vamzdžiai — be srieginių jungčių sienose',
      'Pakeista buto kanalizacija iki stovo',
      'Sumontuoti filtrai ir uždaromieji ventiliai',
      'Sistema išbandyta slėgiu prieš uždengiant',
    ],
    result: 'Vandens slėgis atsistatė, jungčių sienose nebeliko — nėra ko prakiurti.',
    tags: ['Presavimas', 'Filtrai', 'Slėgio bandymas'],
  },
  {
    id: 'stovai-dainava',
    title: 'Stovų keitimas laiptinėje',
    cats: ['daugiabuciai'],
    object: 'Daugiabutis, 1 laiptinė, 20 butų',
    place: 'Kaunas, Dainava',
    year: 2026,
    duration: '9 darbo dienos',
    cover: 'stovai',
    summary: 'Pakeisti šalto ir karšto vandens stovai visoje laiptinėje — butuose ardyta minimaliai.',
    works: [
      'Pakeisti šalto ir karšto vandens stovai nuo rūsio iki viršutinio aukšto',
      'Sumontuoti PPR vamzdynai su ventiliais kiekviename bute',
      'Pakeisti vandens skaitikliai',
      'Atstatytos angos ir apdaila po darbų',
      'Gyventojai apie vandens atjungimą informuoti iš anksto',
    ],
    result: 'Laiptinė atnaujinta be didelio remonto butuose. Nuo 350 € už butą (be PVM, be medžiagų).',
    tags: ['PPR vamzdynai', 'Skaitikliai', 'Minimalus ardymas'],
  },
  {
    id: 'cipp-vilijampole',
    title: 'Kanalizacijos remontas be sienų ardymo',
    cats: ['daugiabuciai', 'kanalizacija'],
    object: 'Daugiabutis, lietaus nuvedimas',
    place: 'Kaunas, Vilijampolė',
    year: 2025,
    duration: '4 darbo dienos',
    cover: 'cipp',
    summary: 'CIPP Lining technologija — naujas vamzdis įleistas į seną, sienos neardytos.',
    works: [
      'Atlikta vamzdyno TV diagnostika',
      'Vamzdynas išplautas aukštu slėgiu',
      'Įleistas naujas vamzdis CIPP Lining technologija',
      'Pakartotinė TV diagnostika po darbų',
      'Butuose neardyta nieko — dirbta tik rūsyje ir laiptinėje',
    ],
    result: 'Pratekėjimai sustabdyti, vandens pralaidumas nesumažėjo. Gyventojai liko namuose.',
    tags: ['CIPP Lining', 'TV diagnostika', 'Be ardymo'],
  },
  {
    id: 'svok-aleksotas',
    title: 'ŠVOK sistema biurų pastate',
    cats: ['komerciniai', 'sildymas'],
    object: 'Biurų pastatas, 640 m²',
    place: 'Kaunas, Aleksotas',
    year: 2025,
    duration: '3 savaitės',
    photo: './img/svok.webp',
    summary: 'Šildymo, vėdinimo ir oro kondicionavimo sistema nuo projekto iki paleidimo.',
    works: [
      'Parengtas ŠVOK projektas',
      'Sumontuota vėdinimo sistema su rekuperacija',
      'Įrengti kondicionieriai atviro plano patalpose',
      'Prijungtas oro–vandens šilumos siurblys',
      'Sistema suderinta ir perduota su naudojimo instrukcija',
    ],
    result: 'Biure palaikoma pastovi temperatūra ir gaivus oras, sąnaudos valdomos centralizuotai.',
    tags: ['Rekuperacija', 'Šilumos siurblys', 'Projektas'],
  },
];

/* Objektams be nuotraukos — brėžinio stiliaus viršelis pagal darbų sritį.
   Ne „trūkstamas paveikslėlis", o sąmoninga vieta, į kurią įdedama Jūsų nuotrauka. */
var COVER_ART = {
  stovai: '<path d="M30 10v180M70 10v180" stroke="#f9520b" stroke-width="7"/><path d="M30 60h40M30 120h40" stroke="#8fb3d9" stroke-width="4"/><circle cx="50" cy="60" r="9" fill="#0d1b2a" stroke="#f9520b" stroke-width="4"/><circle cx="50" cy="120" r="9" fill="#0d1b2a" stroke="#f9520b" stroke-width="4"/>',
  magistrale: '<path d="M5 60h60a20 20 0 0 1 20 20v40a20 20 0 0 0 20 20h90" stroke="#f9520b" stroke-width="8" fill="none"/><path d="M5 150h40a20 20 0 0 0 20-20V90" stroke="#8fb3d9" stroke-width="5" fill="none"/><rect x="120" y="30" width="46" height="34" rx="4" fill="none" stroke="#8fb3d9" stroke-width="4"/>',
  cipp: '<ellipse cx="45" cy="100" rx="16" ry="46" fill="none" stroke="#8fb3d9" stroke-width="5"/><ellipse cx="165" cy="100" rx="16" ry="46" fill="none" stroke="#8fb3d9" stroke-width="5"/><path d="M45 54h120M45 146h120" stroke="#8fb3d9" stroke-width="5"/><path d="M60 100h95" stroke="#f9520b" stroke-width="14" stroke-linecap="round"/><path d="M60 78h95M60 122h95" stroke="#f9520b" stroke-width="4" opacity=".5"/>',
  svok: '<rect x="20" y="40" width="70" height="120" rx="6" fill="none" stroke="#8fb3d9" stroke-width="5"/><path d="M90 70h50a15 15 0 0 1 15 15v30a15 15 0 0 0 15 15h20" stroke="#f9520b" stroke-width="8" fill="none"/><path d="M35 70h40M35 95h40M35 120h40" stroke="#f9520b" stroke-width="4"/>',
  default: '<circle cx="100" cy="100" r="52" fill="none" stroke="#8fb3d9" stroke-width="5"/><path d="M100 48v104M48 100h104" stroke="#f9520b" stroke-width="6"/>',
};

function coverSvg(kind) {
  var art = COVER_ART[kind] || COVER_ART.default;
  return '<svg class="cover-svg" viewBox="0 0 200 200" role="img" aria-label="Objekto iliustracija" preserveAspectRatio="xMidYMid slice">' +
    '<defs><pattern id="g-' + kind + '" width="20" height="20" patternUnits="userSpaceOnUse">' +
    '<path d="M20 0H0v20" fill="none" stroke="rgba(143,179,217,.16)" stroke-width="1"/></pattern></defs>' +
    '<rect width="200" height="200" fill="#0d1b2a"/><rect width="200" height="200" fill="url(#g-' + kind + ')"/>' +
    '<g fill="none" stroke-linecap="round">' + art + '</g></svg>';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATS: CATS, PROJECTS: PROJECTS, coverSvg: coverSvg };
}
