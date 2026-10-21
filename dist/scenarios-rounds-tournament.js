/* Scenario Mode exclusive. See docs/SIX_EXCLUSIVE_SCENARIOS.md. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const define=root.KNIGHTMARE_EXCLUSIVE?.define||(typeof require==='function'?require('./scenarios-exclusive-common.js').define:null);
const knights=["bismarck", "suzaku", "gino", "anya", "dorothea", "nonette"];
const anchors=[["Reno", -119.814, 39.53], ["Las Vegas", -115.14, 36.17], ["Tooele", -112.298, 40.53], ["Ely", -114.888, 39.247], ["Bishop", -118.399, 37.361], ["Pendragon", -117, 37.5]];
const config={
  "id": "rounds-tournament",
  "title": "Knights of the Round Tournament",
  "parent": "eu-pendragon",
  "intro": "An imperial field exercise across the Great Basin becomes a war of six independent Round Knights. Bismarck, Suzaku, Gino, Anya, Dorothea and Nonette each command a private army. Every banner is an enemy; the last Knight holding every city wins.",
  "rosters": {
    "knight_bismarck": [
      "britannia"
    ],
    "knight_suzaku": [
      "britannia"
    ],
    "knight_gino": [
      "britannia"
    ],
    "knight_anya": [
      "britannia"
    ],
    "knight_dorothea": [
      "britannia"
    ],
    "knight_nonette": [
      "britannia"
    ]
  },
  "commanders": {
    "knight_bismarck": [
      "bismarck"
    ],
    "knight_suzaku": [
      "suzaku"
    ],
    "knight_gino": [
      "gino"
    ],
    "knight_anya": [
      "anya"
    ],
    "knight_dorothea": [
      "dorothea"
    ],
    "knight_nonette": [
      "nonette"
    ]
  },
  "focus": {
    "knight_bismarck": "Reno",
    "knight_suzaku": "Las Vegas",
    "knight_gino": "Tooele",
    "knight_anya": "Ely",
    "knight_dorothea": "Bishop",
    "knight_nonette": "Pendragon"
  },
  "forces": {
    "knight_bismarck": 14,
    "knight_suzaku": 14,
    "knight_gino": 14,
    "knight_anya": 14,
    "knight_dorothea": 14,
    "knight_nonette": 14
  },
  "signatures": {
    "bismarck": "lancelot",
    "suzaku": "lancelot_albion",
    "gino": "vincent_ward",
    "anya": "mordred",
    "dorothea": "sutherland_air",
    "nonette": "cornelia_gloucester"
  },
  "blurbs": {
    "knight_bismarck": "Independent tournament army led by Bismarck. Equal opening war chest and fourteen formations; every other Knight is hostile.",
    "knight_suzaku": "Independent tournament army led by Suzaku. Equal opening war chest and fourteen formations; every other Knight is hostile.",
    "knight_gino": "Independent tournament army led by Gino. Equal opening war chest and fourteen formations; every other Knight is hostile.",
    "knight_anya": "Independent tournament army led by Anya. Equal opening war chest and fourteen formations; every other Knight is hostile.",
    "knight_dorothea": "Independent tournament army led by Dorothea. Equal opening war chest and fourteen formations; every other Knight is hostile.",
    "knight_nonette": "Independent tournament army led by Nonette. Equal opening war chest and fourteen formations; every other Knight is hostile."
  },
  "reserve": {
    "knight_bismarck": 0,
    "knight_suzaku": 0,
    "knight_gino": 0,
    "knight_anya": 0,
    "knight_dorothea": 0,
    "knight_nonette": 0
  }
};
config.owner=row => {let best=0,score=Infinity;for(let i=0;i<anchors.length;i++){const d=((row[1]-anchors[i][1])*.79)**2+(row[2]-anchors[i][2])**2;if(d<score){score=d;best=i;}}return 'knight_'+knights[best];};
config.treasury=Object.fromEntries(knights.map(k=>['knight_'+k,{credits:600,industry:300,science:100,sakuradite:35}]));
// Weighted geographic districts were balanced against all seventy cities.
// One distance field per Knight keeps territory contiguous around its headquarters.
const weights=[-.9916666667,1.8333333333,-4.3166666667,.2833333333,1.1083333333,2.0833333333];
config.owner=row=>{
 const nearest=knights.map((_,i)=>[i,((row[1]-anchors[i][1])*.79)**2+(row[2]-anchors[i][2])**2+weights[i]])
  .sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0][0];
 return 'knight_'+knights[nearest];
};
const api=define(config);
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
