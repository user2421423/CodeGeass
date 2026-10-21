/* Scenario Mode exclusive. See docs/SIX_EXCLUSIVE_SCENARIOS.md. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const define=root.KNIGHTMARE_EXCLUSIVE?.define||(typeof require==='function'?require('./scenarios-exclusive-common.js').define:null);

const config={
  "id": "ufn-civil-war",
  "title": "UFN Civil War",
  "parent": "battle-luoyang",
  "intro": "The Chinese Federation rejects UFN authority. The Black Knights launch an expedition from secured eastern railheads around Jining and Shangqiu into the Yellow River heartland. The Federation holds Luoyang, Zhengzhou and most of the homeland; neither government accepts a negotiated settlement.",
  "rosters": {
    "ufn": [
      "bk"
    ],
    "cf": [
      "cf"
    ]
  },
  "commanders": {
    "ufn": [
      "zero",
      "kallen",
      "cc",
      "tohdoh",
      "ohgi",
      "chiba",
      "asahina",
      "senba",
      "urabe",
      "sugiyama",
      "minami",
      "tamaki",
      "diethard",
      "sayoko",
      "kaguya",
      "benio"
    ],
    "cf": [
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
      "tianzi",
      "ren",
      "xiawang",
      "chengzhong",
      "huangqian",
      "sawasaki",
      "chaojielun",
      "vritra",
      "zidien"
    ]
  },
  "focus": {
    "ufn": "Shangqiu",
    "cf": "Luoyang"
  },
  "forces": {
    "ufn": 65,
    "cf": 105
  },
  "reserve": {
    "ufn": 5,
    "cf": 3
  },
  "signatures": {
    "zero": "shinkiro",
    "kallen": "guren_seiten",
    "cc": "gawain",
    "tohdoh": "tohdoh_gekka",
    "xingke": "shen_hu"
  },
  "airships": [
    "ufn",
    "cf"
  ],
  "blurbs": {
    "ufn": "Black Knights expedition: elite spearheads and a finite invasion reserve, but a small eastern foothold.",
    "cf": "Federation defenders: most cities, superior recurring industry and the Yellow River approaches."
  }
};
config.owner=row => row[1]>=114.4 ? 'ufn' : 'cf';
const api=define(config);
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
