/* Scenario Mode exclusive. See docs/SIX_EXCLUSIVE_SCENARIOS.md. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const define=root.KNIGHTMARE_EXCLUSIVE?.define||(typeof require==='function'?require('./scenarios-exclusive-common.js').define:null);

const config={
  "id": "bk-civil-war",
  "title": "Black Knights Civil War",
  "parent": "invasion-japan",
  "intro": "Zero refuses to abandon the Black Knights after his identity is exposed. Kallen, C.C. and his personal loyalists hold Tokyo and the north; Ohgi and Tohdoh rally the regional commands from Kyoto. Command, intelligence and front-line loyalties divide the organization.",
  "rosters": {
    "zero_loyalists": [
      "bk"
    ],
    "bk_command": [
      "bk"
    ]
  },
  "commanders": {
    "zero_loyalists": [
      "zero",
      "kallen",
      "cc",
      "sayoko",
      "diethard",
      "kaguya",
      "inoue",
      "benio",
      "savitri",
      "kirihara"
    ],
    "bk_command": [
      "ohgi",
      "tohdoh",
      "chiba",
      "asahina",
      "senba",
      "urabe",
      "sugiyama",
      "minami",
      "tamaki",
      "kinoshita",
      "katase"
    ]
  },
  "signatures": {
    "zero": "shinkiro",
    "kallen": "guren_seiten",
    "cc": "gawain",
    "tohdoh": "tohdoh_gekka"
  },
  "focus": {
    "zero_loyalists": "Tokyo Settlement",
    "bk_command": "Kyoto"
  },
  "forces": {
    "zero_loyalists": 44,
    "bk_command": 58
  },
  "airships": [
    "zero_loyalists",
    "bk_command"
  ],
  "blurbs": {
    "zero_loyalists": "Zero and Kallen: fewer formations, exceptional signature frames and a concentrated northern base.",
    "bk_command": "Ohgi and Tohdoh: more regional commands, troops and cities in western Japan."
  }
};
config.owner=row => (row[1]>=138 && row[2]>=35.2) || row[2]>=37.5 ? 'zero_loyalists' : 'bk_command';
const api=define(config);
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
