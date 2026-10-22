/* Scenario Mode exclusive. See docs/SIX_EXCLUSIVE_SCENARIOS.md. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const define=root.KNIGHTMARE_EXCLUSIVE?.define||(typeof require==='function'?require('./scenarios-exclusive-common.js').define:null);

const config={
  treasury:{"geass_order":{"credits":1152,"industry":500,"science":231,"sakuradite":99},"anti_geass":{"credits":1733,"industry":500,"science":336,"sakuradite":141}},
  "id": "geass-war",
  "title": "The Geass War",
  "parent": "european-war",
  "intro": "Geass and Code supersede nationality. Zero, Charles, Marianne, Rolo, Bismarck, C.C., Leila, Shin, Marrybell, Mao and Shamna unite in the east. Every other represented commander joins the conventional coalition in the west. Superior numbers confront the concentration of supernatural command abilities.",
  "rosters": {
    "geass_order": [
      "britannia",
      "bk",
      "eu",
      "cf"
    ],
    "anti_geass": [
      "eu",
      "cf",
      "bk",
      "britannia",
      "eb"
    ]
  },
  "commanders": {
    "geass_order": [
      "zero",
      "charles",
      "marianne",
      "rolo",
      "bismarck",
      "cc",
      "leila",
      "shin",
      "marrybell",
      "mao",
      "shamna"
    ],
    "anti_geass": [
      "suzaku",
      "cornelia",
      "schneizel",
      "gino",
      "anya",
      "jeremiah",
      "guilford",
      "darlton",
      "ashley",
      "akito",
      "ryo",
      "ayano",
      "yukiya",
      "oscar",
      "klaus",
      "anna",
      "smilas",
      "fernando",
      "marirrosa",
      "xingke",
      "xianglin",
      "honggu",
      "cao",
      "gaohai",
      "zhaohao",
      "leifeng",
      "meiling",
      "lifeng",
      "rakshata",
      "kallen",
      "tohdoh",
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
      "kewell",
      "dorothea",
      "nonette",
      "manfredi",
      "gaudefroy",
      "raymond",
      "farnese",
      "augustus",
      "oldrin",
      "norland",
      "kaguya",
      "lloyd",
      "pierre",
      "sophie",
      "sarah",
      "olivia",
      "romero",
      "masaki",
      "toru",
      "miguel",
      "joe",
      "tianzi",
      "ren",
      "xiawang",
      "chengzhong",
      "huangqian",
      "sawasaki",
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
      "vritra",
      "zidien",
      "euphemia",
      "cecile",
      "eduardo",
      "ferilli"
    ]
  },
  "focus": {
    "geass_order": "Moscow",
    "anti_geass": "Warsaw"
  },
  "forces": {
    "geass_order": 110,
    "anti_geass": 100
  },
  "signatures": {
    "bismarck": "lancelot",
    "rolo": "vincent_ward",
    "marianne": "mordred",
    "marrybell": "lancelot",
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
    "geass_order",
    "anti_geass"
  ],
  "navy": [
    "geass_order",
    "anti_geass"
  ],
  "blurbs": {
    "geass_order": "All represented Geass users and C.C.; concentrated command powers, eastern strongholds and mixed equipment.",
    "anti_geass": "The non-Geass roster: a larger conventional army and multinational production."
  }
};
config.owner=row => row[1]>=24 ? 'geass_order' : 'anti_geass';
const api=define(config);
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
