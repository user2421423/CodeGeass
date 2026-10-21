/* Scenario Mode exclusive. See docs/SIX_EXCLUSIVE_SCENARIOS.md. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const define=root.KNIGHTMARE_EXCLUSIVE?.define||(typeof require==='function'?require('./scenarios-exclusive-common.js').define:null);

const config={
  "id": "protagonists-antagonists",
  "title": "Protagonists vs Antagonists",
  "parent": "european-war",
  "intro": "Former enemies choose a new side. Zero, Suzaku, Kallen, Akito, Xingke and Leila lead the protagonists from western Europe. Charles, Schneizel, Bismarck, Shin and the imperial regimes gather in the east. Redemption and opposition to the ruling regimes decide ambiguous allegiances.",
  "rosters": {
    "protagonists": [
      "bk",
      "eu",
      "cf",
      "britannia"
    ],
    "antagonists": [
      "britannia",
      "eb",
      "cf",
      "eu"
    ]
  },
  "commanders": {
    "protagonists": [
      "suzaku",
      "cornelia",
      "gino",
      "anya",
      "jeremiah",
      "rolo",
      "guilford",
      "darlton",
      "ashley",
      "leila",
      "akito",
      "ryo",
      "ayano",
      "yukiya",
      "oscar",
      "klaus",
      "anna",
      "fernando",
      "marirrosa",
      "xingke",
      "xianglin",
      "honggu",
      "leifeng",
      "meiling",
      "lifeng",
      "rakshata",
      "zero",
      "kallen",
      "tohdoh",
      "cc",
      "ohgi",
      "chiba",
      "asahina",
      "senba",
      "urabe",
      "sugiyama",
      "minami",
      "tamaki",
      "katase",
      "inoue",
      "villetta",
      "dorothea",
      "nonette",
      "oldrin",
      "sakuya",
      "kaguya",
      "lloyd",
      "sophie",
      "sarah",
      "olivia",
      "romero",
      "masaki",
      "toru",
      "joe",
      "tianzi",
      "ren",
      "xiawang",
      "chengzhong",
      "huangqian",
      "diethard",
      "sayoko",
      "benio",
      "kinoshita",
      "kizuna",
      "toruyoshida",
      "savitri",
      "kirihara",
      "mutsuki",
      "ichijiku",
      "ayame",
      "indira",
      "chaojielun",
      "zidien",
      "euphemia",
      "cecile"
    ],
    "antagonists": [
      "charles",
      "schneizel",
      "bismarck",
      "shin",
      "gaohai",
      "zhaohao",
      "cao",
      "sawasaki",
      "norland",
      "marianne",
      "smilas",
      "marrybell",
      "kewell",
      "manfredi",
      "gaudefroy",
      "raymond",
      "farnese",
      "augustus",
      "pierre",
      "eduardo",
      "ferilli",
      "miguel",
      "vritra"
    ]
  },
  "focus": {
    "protagonists": "Warsaw",
    "antagonists": "Minsk"
  },
  "forces": {
    "protagonists": 100,
    "antagonists": 100
  },
  "signatures": {
    "zero": "shinkiro",
    "kallen": "guren_seiten",
    "suzaku": "lancelot_albion",
    "tohdoh": "tohdoh_gekka",
    "cc": "gawain",
    "xingke": "shen_hu",
    "leila": "leila_alexander",
    "akito": "akito_liberte",
    "anya": "mordred",
    "cornelia": "cornelia_gloucester"
  },
  "airships": [
    "protagonists",
    "antagonists"
  ],
  "navy": [
    "protagonists",
    "antagonists"
  ],
  "blurbs": {
    "protagonists": "Zero, Suzaku, Kallen and the resistance allies, with multinational factories.",
    "antagonists": "Imperial and authoritarian command led by Charles, Schneizel and Bismarck."
  }
};
config.owner=row => row[3]==='eb' ? 'antagonists' : 'protagonists';
const api=define(config);
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
