/* Crossing the Rocky Mountains — E.U. World Campaign penultimate operation.
 * WGS84 geodetic city/pass/river control points. Geographic relief envelopes
 * are topographic feature approximations, NOT DEM/USGS survey contours.
 * The shared GSHHG regional renderer does not yet admit this ID: the integrator
 * must add the ID and optional relief overlay; see INTEGRATOR REQUIREMENTS below.
 * Standalone registration is deliberately self-contained. No shared files edited.
 *
 * INTEGRATOR REQUIREMENTS (no changes made on this branch):
 * 1. Load <script src="scenarios-rocky-mountains.js"></script> after engine.js
 *    and before war-campaign.js, UI startup, and game.js in dist/index.html.
 * 2. In dist/ui/geography.js paintJapan(), add:
 *      const rockies = g.scenario.id === 'eu-rocky-mountains';
 *    include rockies in centreSampledRegion (line selecting regional WGS84
 *    atlas) so LAYERS.land, rather than JAPAN_LAND, supplies the underlay.
 *    No new projection is needed: zero-rotation WGS84 map with the exact
 *    centre-sampled bounds math already used by California and Urals.
 * 3. The preexisting GSHHG atlas supplies correct continental geography but
 *    DOES NOT include high-resolution Rocky Mountain elevation shading.
 *    For full relief, render g.scenario.reliefPolygons/roads/rivers/lakes using
 *    this region's WGS84 transform, or replace approximate relief polygons
 *    with georeferenced USGS 3DEP / equivalent DEM-derived hypsometry.
 *    The module exports paintRelief(ctx,g,{R,SQ,left,right,top,bottom})
 *    for the integrator to call after geographic ownership fill.
 *    Current relief features are geographic control-point approximations,
 *    not a claim that genuine DEM has been embedded.
 * 4. In dist/engine.js prepareEliteEurope() allowlists (both lists near the
 *    function), add eu-rocky-mountains as a Britannia/E.U. theatre. This
 *    module temporarily invokes that existing logic under the allowlisted
 *    eu-pendragon ID during construction and immediately restores its own ID.
 * 5. Add eu-rocky-mountains to Scenario menu and E.U. World Campaign
 *    immediately before the east-approach eu-pendragon battle. The separate
 *    Pendragon owner handles its map/deployment conversion.
 */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-rocky-mountains',SIDES=['eu','britannia'];
const COLS=224,ROWS=168;
const BOUNDS={west:-116.05,east:-98.20,north:45.40,south:36.20};
const K=Math.cos(40.80*Math.PI/180);
const PROJECTION={centerLon:-107.125,centerLat:40.8,angle:0,
 uMin:-8.925*K,uMax:8.925*K,vMin:-4.60,vMax:4.60};
// [settlement, longitude, latitude, owner, economic tier, fortified].
const CITIES=[
 [
  "North Platte",
  -100.765,
  41.124,
  "eu",
  3,
  true
 ],
 [
  "Ogallala",
  -101.72,
  41.128,
  "eu",
  2,
  false
 ],
 [
  "Sidney",
  -102.978,
  41.143,
  "eu",
  3,
  true
 ],
 [
  "Kimball",
  -103.663,
  41.235,
  "eu",
  2,
  false
 ],
 [
  "Scottsbluff",
  -103.667,
  41.867,
  "eu",
  3,
  true
 ],
 [
  "Alliance",
  -102.871,
  42.102,
  "eu",
  2,
  true
 ],
 [
  "Chadron",
  -103.002,
  42.83,
  "eu",
  2,
  false
 ],
 [
  "Torrington",
  -104.183,
  42.062,
  "eu",
  3,
  true
 ],
 [
  "Lusk",
  -104.453,
  42.763,
  "eu",
  2,
  false
 ],
 [
  "Douglas",
  -105.384,
  42.759,
  "eu",
  2,
  true
 ],
 [
  "Wheatland",
  -104.953,
  42.055,
  "eu",
  3,
  true
 ],
 [
  "Fort Morgan",
  -103.803,
  40.25,
  "eu",
  3,
  true
 ],
 [
  "Sterling",
  -103.207,
  40.625,
  "eu",
  3,
  true
 ],
 [
  "Brush",
  -103.623,
  40.259,
  "eu",
  2,
  false
 ],
 [
  "Akron",
  -103.213,
  40.163,
  "eu",
  2,
  false
 ],
 [
  "Greeley",
  -104.71,
  40.423,
  "eu",
  3,
  true
 ],
 [
  "Longmont",
  -105.103,
  40.167,
  "eu",
  2,
  true
 ],
 [
  "Limon",
  -103.692,
  39.263,
  "eu",
  3,
  true
 ],
 [
  "Burlington",
  -102.282,
  39.306,
  "eu",
  2,
  false
 ],
 [
  "Goodland",
  -101.711,
  39.35,
  "eu",
  2,
  false
 ],
 [
  "Hays",
  -99.326,
  38.879,
  "eu",
  2,
  false
 ],
 [
  "Garden City",
  -100.864,
  37.971,
  "eu",
  2,
  true
 ],
 [
  "Lamar",
  -102.618,
  38.087,
  "eu",
  3,
  true
 ],
 [
  "La Junta",
  -103.547,
  37.986,
  "eu",
  2,
  false
 ],
 [
  "Pueblo",
  -104.609,
  38.254,
  "eu",
  3,
  true
 ],
 [
  "Walsenburg",
  -104.781,
  37.623,
  "eu",
  2,
  false
 ],
 [
  "Trinidad",
  -104.5,
  37.169,
  "eu",
  3,
  true
 ],
 [
  "Colby",
  -101.052,
  39.396,
  "eu",
  2,
  false
 ],
 [
  "Wray",
  -102.223,
  40.075,
  "eu",
  2,
  false
 ],
 [
  "Cheyenne",
  -104.82,
  41.14,
  "britannia",
  3,
  true
 ],
 [
  "Laramie",
  -105.591,
  41.312,
  "britannia",
  3,
  true
 ],
 [
  "Casper",
  -106.313,
  42.867,
  "britannia",
  3,
  true
 ],
 [
  "Rawlins",
  -107.238,
  41.791,
  "britannia",
  3,
  true
 ],
 [
  "Rock Springs",
  -109.202,
  41.587,
  "britannia",
  3,
  true
 ],
 [
  "Green River (WY)",
  -109.466,
  41.528,
  "britannia",
  2,
  true
 ],
 [
  "Riverton",
  -108.38,
  43.025,
  "britannia",
  2,
  true
 ],
 [
  "Lander",
  -108.73,
  42.834,
  "britannia",
  2,
  true
 ],
 [
  "Dubois",
  -109.632,
  43.533,
  "britannia",
  2,
  false
 ],
 [
  "Pinedale",
  -109.863,
  42.866,
  "britannia",
  2,
  true
 ],
 [
  "Jackson",
  -110.763,
  43.479,
  "britannia",
  3,
  true
 ],
 [
  "Evanston",
  -110.963,
  41.269,
  "britannia",
  3,
  true
 ],
 [
  "Kemmerer",
  -110.537,
  41.793,
  "britannia",
  2,
  false
 ],
 [
  "Cody",
  -109.057,
  44.527,
  "britannia",
  2,
  true
 ],
 [
  "Thermopolis",
  -108.211,
  43.646,
  "britannia",
  2,
  false
 ],
 [
  "Worland",
  -107.955,
  44.017,
  "britannia",
  2,
  false
 ],
 [
  "Sheridan",
  -106.956,
  44.797,
  "britannia",
  3,
  true
 ],
 [
  "Buffalo",
  -106.698,
  44.349,
  "britannia",
  2,
  true
 ],
 [
  "Denver",
  -104.991,
  39.739,
  "britannia",
  3,
  true
 ],
 [
  "Boulder",
  -105.271,
  40.015,
  "britannia",
  3,
  true
 ],
 [
  "Fort Collins",
  -105.084,
  40.585,
  "britannia",
  3,
  true
 ],
 [
  "Golden",
  -105.221,
  39.756,
  "britannia",
  2,
  true
 ],
 [
  "Colorado Springs",
  -104.822,
  38.834,
  "britannia",
  3,
  true
 ],
 [
  "Cañon City",
  -105.243,
  38.441,
  "britannia",
  2,
  true
 ],
 [
  "Estes Park",
  -105.522,
  40.377,
  "britannia",
  2,
  true
 ],
 [
  "Idaho Springs",
  -105.514,
  39.743,
  "britannia",
  2,
  true
 ],
 [
  "Georgetown",
  -105.697,
  39.707,
  "britannia",
  2,
  true
 ],
 [
  "Winter Park",
  -105.784,
  39.891,
  "britannia",
  2,
  true
 ],
 [
  "Granby",
  -105.939,
  40.087,
  "britannia",
  2,
  false
 ],
 [
  "Silverthorne",
  -106.074,
  39.633,
  "britannia",
  3,
  true
 ],
 [
  "Breckenridge",
  -106.038,
  39.482,
  "britannia",
  2,
  true
 ],
 [
  "Leadville",
  -106.293,
  39.25,
  "britannia",
  3,
  true
 ],
 [
  "Vail",
  -106.374,
  39.641,
  "britannia",
  2,
  true
 ],
 [
  "Steamboat Springs",
  -106.832,
  40.486,
  "britannia",
  3,
  true
 ],
 [
  "Craig",
  -107.546,
  40.515,
  "britannia",
  2,
  false
 ],
 [
  "Aspen",
  -106.818,
  39.191,
  "britannia",
  2,
  true
 ],
 [
  "Glenwood Springs",
  -107.325,
  39.55,
  "britannia",
  3,
  true
 ],
 [
  "Rifle",
  -107.783,
  39.535,
  "britannia",
  2,
  false
 ],
 [
  "Grand Junction",
  -108.551,
  39.064,
  "britannia",
  3,
  true
 ],
 [
  "Montrose",
  -107.876,
  38.478,
  "britannia",
  3,
  true
 ],
 [
  "Delta (CO)",
  -108.069,
  38.742,
  "britannia",
  2,
  false
 ],
 [
  "Gunnison",
  -106.927,
  38.545,
  "britannia",
  3,
  true
 ],
 [
  "Crested Butte",
  -106.987,
  38.87,
  "britannia",
  2,
  true
 ],
 [
  "Buena Vista",
  -106.132,
  38.843,
  "britannia",
  2,
  false
 ],
 [
  "Salida",
  -105.999,
  38.534,
  "britannia",
  3,
  true
 ],
 [
  "Alamosa",
  -105.874,
  37.469,
  "britannia",
  3,
  true
 ],
 [
  "Pagosa Springs",
  -107.011,
  37.269,
  "britannia",
  2,
  false
 ],
 [
  "Durango",
  -107.88,
  37.276,
  "britannia",
  3,
  true
 ],
 [
  "Cortez",
  -108.586,
  37.348,
  "britannia",
  2,
  true
 ],
 [
  "Telluride",
  -107.812,
  37.938,
  "britannia",
  2,
  true
 ],
 [
  "Ouray",
  -107.671,
  38.023,
  "britannia",
  2,
  true
 ],
 [
  "Salt Lake City",
  -111.891,
  40.761,
  "britannia",
  3,
  true
 ],
 [
  "Ogden",
  -111.973,
  41.224,
  "britannia",
  3,
  true
 ],
 [
  "Provo",
  -111.659,
  40.233,
  "britannia",
  3,
  true
 ],
 [
  "Logan",
  -111.834,
  41.736,
  "britannia",
  2,
  true
 ],
 [
  "Park City",
  -111.498,
  40.646,
  "britannia",
  2,
  true
 ],
 [
  "Heber City",
  -111.413,
  40.507,
  "britannia",
  2,
  false
 ],
 [
  "Tooele",
  -112.298,
  40.53,
  "britannia",
  2,
  true
 ],
 [
  "Brigham City",
  -112.015,
  41.51,
  "britannia",
  2,
  false
 ],
 [
  "Vernal",
  -109.528,
  40.455,
  "britannia",
  3,
  true
 ],
 [
  "Roosevelt",
  -109.989,
  40.299,
  "britannia",
  2,
  true
 ],
 [
  "Price",
  -110.81,
  39.6,
  "britannia",
  3,
  true
 ],
 [
  "Helper",
  -110.855,
  39.684,
  "britannia",
  2,
  false
 ],
 [
  "Moab",
  -109.549,
  38.573,
  "britannia",
  2,
  true
 ],
 [
  "Green River (UT)",
  -110.159,
  38.995,
  "britannia",
  2,
  false
 ],
 [
  "Richfield",
  -112.086,
  38.772,
  "britannia",
  2,
  true
 ],
 [
  "Nephi",
  -111.834,
  39.709,
  "britannia",
  2,
  false
 ],
 [
  "Spanish Fork",
  -111.654,
  40.115,
  "britannia",
  2,
  false
 ],
 [
  "Ephraim",
  -111.583,
  39.359,
  "britannia",
  2,
  false
 ],
 [
  "Duchesne",
  -110.403,
  40.164,
  "britannia",
  2,
  true
 ],
 [
  "Beaver",
  -112.642,
  38.276,
  "britannia",
  2,
  false
 ],
 [
  "Delta (UT)",
  -112.578,
  39.352,
  "britannia",
  2,
  false
 ]
];
// The IDs/group labels are regional commands, not arbitrary score objectives.
// [side, originating city, unit class, number of detachments, commander, Army Group].
const FORMATIONS=[
 [
  "eu",
  "Scottsbluff",
  "heavy",
  8,
  "akito",
  "Northern Army"
 ],
 [
  "eu",
  "Scottsbluff",
  "rocket",
  5,
  "yukiya",
  "Northern Army"
 ],
 [
  "eu",
  "Torrington",
  "assault",
  7,
  "ryo",
  "Northern Army"
 ],
 [
  "eu",
  "Torrington",
  "medium",
  5,
  "olivia",
  "Northern Army"
 ],
 [
  "eu",
  "Alliance",
  "heavy",
  6,
  "pierre",
  "Northern Army"
 ],
 [
  "eu",
  "Wheatland",
  "siege",
  5,
  "smilas",
  "Northern Army"
 ],
 [
  "eu",
  "Douglas",
  "raider",
  5,
  null,
  "Northern Army"
 ],
 [
  "eu",
  "Sidney",
  "support",
  4,
  "anna",
  "Northern Army"
 ],
 [
  "eu",
  "Lusk",
  "medium",
  5,
  null,
  "Northern Army"
 ],
 [
  "eu",
  "Greeley",
  "heavy",
  9,
  "leila",
  "Central Army"
 ],
 [
  "eu",
  "Greeley",
  "assault",
  7,
  "ayano",
  "Central Army"
 ],
 [
  "eu",
  "Longmont",
  "medium",
  6,
  "oscar",
  "Central Army"
 ],
 [
  "eu",
  "Fort Morgan",
  "rocket",
  6,
  "margaret",
  "Central Army"
 ],
 [
  "eu",
  "Limon",
  "heavy",
  8,
  "klaus",
  "Central Army"
 ],
 [
  "eu",
  "Limon",
  "siege",
  6,
  "eduardo",
  "Central Army"
 ],
 [
  "eu",
  "Sterling",
  "medium",
  5,
  null,
  "Central Army"
 ],
 [
  "eu",
  "Akron",
  "support",
  4,
  null,
  "Central Army"
 ],
 [
  "eu",
  "Pueblo",
  "heavy",
  9,
  "fernando",
  "Southern Army"
 ],
 [
  "eu",
  "Pueblo",
  "rocket",
  6,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "La Junta",
  "assault",
  7,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Trinidad",
  "heavy",
  7,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Trinidad",
  "siege",
  4,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Lamar",
  "medium",
  7,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Walsenburg",
  "scout",
  4,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Garden City",
  "support",
  4,
  null,
  "Southern Army"
 ],
 [
  "eu",
  "Goodland",
  "medium",
  4,
  null,
  "Central Army"
 ],
 [
  "britannia",
  "Cheyenne",
  "heavy",
  7,
  "cornelia",
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Cheyenne",
  "rocket",
  5,
  "cecile",
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Laramie",
  "heavy",
  8,
  "guilford",
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Laramie",
  "siege",
  5,
  null,
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Casper",
  "heavy",
  7,
  "darlton",
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Casper",
  "rocket",
  5,
  null,
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Buffalo",
  "medium",
  5,
  null,
  "Northern Mountain Line"
 ],
 [
  "britannia",
  "Rawlins",
  "heavy",
  7,
  "bismarck",
  "Continental Divide Line"
 ],
 [
  "britannia",
  "Rawlins",
  "rocket",
  5,
  null,
  "Continental Divide Line"
 ],
 [
  "britannia",
  "Riverton",
  "assault",
  6,
  "gino",
  "Continental Divide Line"
 ],
 [
  "britannia",
  "Lander",
  "heavy",
  6,
  null,
  "Continental Divide Line"
 ],
 [
  "britannia",
  "Rock Springs",
  "heavy",
  8,
  "jeremiah",
  "Western Basin Line"
 ],
 [
  "britannia",
  "Rock Springs",
  "siege",
  5,
  null,
  "Western Basin Line"
 ],
 [
  "britannia",
  "Pinedale",
  "medium",
  6,
  null,
  "Western Basin Line"
 ],
 [
  "britannia",
  "Jackson",
  "heavy",
  6,
  null,
  "Western Basin Line"
 ],
 [
  "britannia",
  "Denver",
  "heavy",
  8,
  "suzaku",
  "Front Range Line"
 ],
 [
  "britannia",
  "Denver",
  "rocket",
  6,
  null,
  "Front Range Line"
 ],
 [
  "britannia",
  "Boulder",
  "heavy",
  7,
  "oldrin",
  "Front Range Line"
 ],
 [
  "britannia",
  "Boulder",
  "siege",
  5,
  null,
  "Front Range Line"
 ],
 [
  "britannia",
  "Fort Collins",
  "heavy",
  7,
  "villetta",
  "Front Range Line"
 ],
 [
  "britannia",
  "Colorado Springs",
  "heavy",
  8,
  "kewell",
  "Front Range Line"
 ],
 [
  "britannia",
  "Colorado Springs",
  "rocket",
  5,
  null,
  "Front Range Line"
 ],
 [
  "britannia",
  "Golden",
  "assault",
  5,
  null,
  "Front Range Line"
 ],
 [
  "britannia",
  "Idaho Springs",
  "heavy",
  7,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Silverthorne",
  "heavy",
  8,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Silverthorne",
  "rocket",
  5,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Leadville",
  "heavy",
  7,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Vail",
  "medium",
  6,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Winter Park",
  "medium",
  5,
  null,
  "Central Divide Line"
 ],
 [
  "britannia",
  "Glenwood Springs",
  "heavy",
  8,
  null,
  "Western Slope Line"
 ],
 [
  "britannia",
  "Glenwood Springs",
  "rocket",
  5,
  null,
  "Western Slope Line"
 ],
 [
  "britannia",
  "Grand Junction",
  "heavy",
  8,
  null,
  "Western Slope Line"
 ],
 [
  "britannia",
  "Montrose",
  "medium",
  7,
  null,
  "Western Slope Line"
 ],
 [
  "britannia",
  "Steamboat Springs",
  "medium",
  6,
  null,
  "Western Slope Line"
 ],
 [
  "britannia",
  "Salida",
  "heavy",
  7,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Salida",
  "siege",
  5,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Gunnison",
  "heavy",
  7,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Gunnison",
  "rocket",
  5,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Alamosa",
  "heavy",
  7,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Durango",
  "heavy",
  7,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Durango",
  "siege",
  5,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Cortez",
  "medium",
  5,
  null,
  "Southern Mountain Line"
 ],
 [
  "britannia",
  "Vernal",
  "heavy",
  6,
  null,
  "Utah Outer Line"
 ],
 [
  "britannia",
  "Price",
  "heavy",
  7,
  null,
  "Utah Outer Line"
 ],
 [
  "britannia",
  "Moab",
  "medium",
  5,
  null,
  "Utah Outer Line"
 ],
 [
  "britannia",
  "Salt Lake City",
  "heavy",
  9,
  "schneizel",
  "Wasatch Reserve"
 ],
 [
  "britannia",
  "Salt Lake City",
  "rocket",
  6,
  null,
  "Wasatch Reserve"
 ],
 [
  "britannia",
  "Ogden",
  "heavy",
  7,
  null,
  "Wasatch Reserve"
 ],
 [
  "britannia",
  "Provo",
  "heavy",
  8,
  null,
  "Wasatch Reserve"
 ],
 [
  "britannia",
  "Provo",
  "siege",
  5,
  null,
  "Wasatch Reserve"
 ],
 [
  "britannia",
  "Evanston",
  "assault",
  7,
  null,
  "Wyoming Reserve"
 ],
 [
  "britannia",
  "Green River (WY)",
  "heavy",
  7,
  null,
  "Wyoming Reserve"
 ],
 [
  "britannia",
  "Craig",
  "raider",
  5,
  null,
  "Western Slope Reserve"
 ],
 [
  "britannia",
  "Rifle",
  "heavy",
  6,
  null,
  "Western Slope Reserve"
 ],
 [
  "britannia",
  "Ouray",
  "medium",
  5,
  null,
  "Southern Reserve"
 ],
 [
  "britannia",
  "Pagosa Springs",
  "heavy",
  5,
  null,
  "Southern Reserve"
 ]
];
const FUNDING={eu:{credits:1820,industry:1210,science:156,sakuradite:85},
 britannia:{credits:1730,industry:1260,science:152,sakuradite:90}};
// These irregular region envelopes follow named ranges; boundaries are approximate.
const MASSIFS=[["Teton Range",[[-111.18,43.47],[-110.95,43.44],[-110.65,43.7],[-110.61,44.06],[-110.85,44.18],[-111.14,43.89]]],["Absaroka Range",[[-110.55,45.32],[-109.43,45.31],[-108.79,44.83],[-108.66,44.36],[-109.35,43.52],[-110.24,43.54],[-110.51,44.1]]],["Bighorn Mountains",[[-108.26,45.3],[-107.25,45.3],[-106.61,44.49],[-106.72,43.7],[-107.24,43.2],[-107.72,43.49],[-108.13,44.2]]],["Wind River Range",[[-110.24,43.42],[-109.44,43.57],[-108.71,43.12],[-108.58,42.58],[-109.04,42.29],[-109.71,42.59],[-110.14,42.91]]],["Wyoming Range",[[-111.16,43.4],[-110.61,43.23],[-110.28,42.56],[-110.09,41.97],[-110.55,41.67],[-111.08,42.34]]],["Laramie Range",[[-106.4,43.15],[-105.65,43.15],[-105.1,42.6],[-105.13,41.16],[-105.46,40.92],[-105.92,41.55],[-106.12,42.28]]],["Medicine Bow Mountains",[[-107.39,41.49],[-106.74,41.49],[-106.15,41.17],[-105.64,40.98],[-106.12,40.53],[-106.97,40.56]]],["Sierra Madre WY",[[-108.84,41.52],[-107.98,41.55],[-107.12,41.16],[-106.99,40.78],[-107.54,40.46],[-108.31,40.64]]],["Front Range",[[-106.28,41.03],[-105.57,40.95],[-105.08,40.47],[-105.24,39.65],[-105.38,39.19],[-105.55,38.67],[-106.34,38.7],[-106.42,39.38],[-106.22,40.07]]],["Never Summer and Park Range",[[-107.16,41],[-106.23,41.06],[-106.13,40.63],[-105.93,40.2],[-106.38,39.96],[-107.14,40.36]]],["Gore and Williams Fork",[[-107.45,40.38],[-106.77,40.43],[-106.2,39.87],[-106.04,39.4],[-106.57,39.3],[-107.21,39.66]]],["Sawatch Range",[[-107.21,39.6],[-106.65,39.6],[-106.1,39.38],[-105.88,38.72],[-106.03,38.11],[-106.75,38.08],[-107.32,38.79]]],["Elk Mountains",[[-108.08,39.46],[-107.29,39.69],[-106.75,39.29],[-106.77,38.84],[-107.38,38.47],[-107.99,38.8]]],["West Elk and Gunnison",[[-108.25,39.1],[-107.48,39.14],[-106.94,38.7],[-106.73,38.29],[-107.34,38.13],[-108.03,38.54]]],["Sangre de Cristo",[[-105.9,38.88],[-105.15,38.96],[-105.08,38.35],[-105.31,37.68],[-105.65,36.86],[-106.22,36.93],[-106.11,37.77]]],["San Juan Mountains",[[-108.66,38.46],[-107.8,38.58],[-106.74,38.49],[-106.13,37.86],[-106.55,37.18],[-107.39,36.92],[-108.19,37.13],[-108.65,37.79]]],["Wasatch Range",[[-112.09,42.66],[-111.45,42.59],[-111.24,41.76],[-111.36,41.17],[-111.18,40.43],[-111.01,39.54],[-111.4,38.6],[-112.03,38.74],[-112.08,39.86],[-112.25,40.87]]],["Uinta Mountains",[[-111.7,41.06],[-110.99,41.09],[-110.19,40.98],[-109.4,41.01],[-108.94,40.72],[-109.55,40.23],[-110.73,40.16],[-111.45,40.41]]],["Uncompahgre Plateau",[[-109.25,39.45],[-108.54,39.49],[-107.87,39.04],[-107.54,38.16],[-108,37.79],[-108.82,38.28]]],["Book Cliffs",[[-110.86,39.83],[-109.85,39.89],[-108.82,39.78],[-108.16,39.37],[-108.47,39],[-109.55,39.26],[-110.73,39.36]]],["La Sal and Abajo",[[-110.1,38.83],[-109.36,38.94],[-108.83,38.42],[-108.86,37.62],[-109.55,37.48],[-110.11,37.95]]]];
const LAKES=[["Great Salt Lake",[[-112.98,41.55],[-112.24,41.76],[-112.01,41.58],[-111.91,41.15],[-112.03,40.9],[-112.2,40.72],[-112.42,40.66],[-112.71,40.91],[-112.84,41.25]]]];
const BASINS=[["Great Basin",[[-116.05,36.2],[-112.15,36.2],[-112.02,38.62],[-112.38,39.91],[-113.17,41.74],[-116.05,42.4]],"desert"],["Colorado Plateau",[[-112.4,36.2],[-108.55,36.2],[-108.5,37.55],[-109.1,38.15],[-108.66,38.78],[-109.48,39.32],[-111.26,39.45],[-112.41,38.31]],"desert"],["Green River Basin",[[-111.34,41.34],[-108.49,41.33],[-108.33,42.37],[-109.24,42.81],[-110.64,42.44],[-111.19,41.91]],"plains"],["Laramie Basin",[[-106.16,41.07],[-105.18,41.07],[-105.09,41.72],[-105.51,42],[-106.1,41.67]],"plains"],["San Luis Valley",[[-106.18,37.02],[-105.5,37.01],[-105.5,38.17],[-105.92,38.21],[-106.13,37.76]],"plains"],["South Park",[[-106.22,38.96],[-105.45,38.99],[-105.39,39.48],[-105.83,39.52],[-106.23,39.22]],"plains"]];
// WGS84 route crossings; radius in degrees used solely for passable local gap.
const PASSES=[["Sherman Summit / I-80",-105.39,41.24,0.14,"I-80"],["Elk Mountain / I-80",-106.53,41.66,0.15,"I-80"],["Continental Divide / I-80",-107.72,41.66,0.16,"I-80"],["South Pass",-108.91,42.36,0.18,"South Pass Road"],["Togwotee Pass",-110.02,43.75,0.18,"US-26"],["Powder River Pass",-107.01,44.19,0.14,"US-16"],["Berthoud Pass",-105.78,39.8,0.12,"US-40"],["Eisenhower Tunnel",-105.88,39.68,0.15,"I-70"],["Loveland Pass",-105.88,39.66,0.12,"US-6"],["Vail Pass",-106.22,39.53,0.15,"I-70"],["Rabbit Ears Pass",-106.62,40.37,0.15,"US-40"],["Fremont Pass",-106.2,39.38,0.12,"CO-91"],["Monarch Pass",-106.33,38.5,0.17,"US-50"],["Independence Pass",-106.56,39.11,0.14,"CO-82"],["Wolf Creek Pass",-106.8,37.48,0.17,"US-160"],["Red Mountain Pass",-107.71,37.9,0.13,"US-550"],["La Veta Pass",-105.17,37.6,0.16,"US-160"],["Raton Pass",-104.44,36.99,0.14,"I-25"],["Parleys Summit",-111.62,40.74,0.13,"I-80 UT"],["Soldier Summit",-111.08,39.93,0.15,"US-6 UT"],["Daniels Summit",-111.29,40.3,0.14,"US-40 UT"],["Weber Canyon",-111.53,41.16,0.16,"I-84"],["Provo Canyon",-111.58,40.35,0.12,"US-189"]];
const ROADS={"I-80":[[-104.82,41.14],[-105.59,41.31],[-106.54,41.66],[-107.24,41.79],[-107.72,41.66],[-109.2,41.59],[-110.96,41.27],[-111.62,40.74],[-111.89,40.76]],"I-25":[[-104.45,42.76],[-105.38,42.76],[-106.31,42.87],[-104.95,42.05],[-104.82,41.14],[-105.08,40.59],[-104.99,39.74],[-104.82,38.83],[-104.61,38.25],[-104.5,37.17],[-104.44,36.99]],"I-70":[[-103.69,39.26],[-104.99,39.74],[-105.51,39.74],[-105.88,39.68],[-106.08,39.63],[-106.22,39.53],[-106.37,39.64],[-107.33,39.55],[-108.55,39.06]],"US-40":[[-105.25,40.01],[-105.78,39.8],[-105.94,40.09],[-106.62,40.37],[-106.83,40.49],[-107.55,40.52],[-109.53,40.46],[-111.29,40.3]],"US-50":[[-104.61,38.25],[-105.24,38.44],[-106,38.53],[-106.33,38.5],[-106.93,38.55],[-107.88,38.48],[-108.55,39.06]],"US-160":[[-104.5,37.17],[-105.17,37.6],[-105.87,37.47],[-106.8,37.48],[-107.01,37.27],[-107.88,37.28],[-108.59,37.35]],"South Pass Road":[[-106.31,42.87],[-108.38,43.02],[-108.73,42.83],[-108.91,42.36],[-109.2,41.59]],"US-26":[[-106.31,42.87],[-108.38,43.02],[-109.63,43.53],[-110.02,43.75],[-110.76,43.48]],"US-16":[[-106.7,44.35],[-107.01,44.19],[-107.96,44.02],[-108.21,43.65]],"US-6":[[-104.99,39.74],[-105.88,39.66],[-106.08,39.63]],"CO-91":[[-105.99,38.53],[-106.29,39.25],[-106.2,39.38],[-106.08,39.63]],"CO-82":[[-108.55,39.06],[-107.33,39.55],[-106.82,39.19],[-106.56,39.11],[-106.29,39.25]],"US-550":[[-107.88,37.28],[-107.71,37.9],[-107.67,38.02],[-107.88,38.48]],"I-80 UT":[[-110.96,41.27],[-111.5,40.65],[-111.62,40.74],[-111.89,40.76]],"US-6 UT":[[-110.81,39.6],[-111.08,39.93],[-111.66,40.23]],"US-40 UT":[[-109.53,40.46],[-110.4,40.16],[-111.29,40.3],[-111.41,40.51]],"I-84":[[-110.96,41.27],[-111.53,41.16],[-111.97,41.22]],"US-189":[[-111.66,40.23],[-111.58,40.35],[-111.41,40.51],[-111.5,40.65]]};
const RIVERS={"Colorado River":[[-105.86,40.47],[-106.09,40.13],[-106.52,39.96],[-106.83,39.68],[-107.11,39.55],[-107.32,39.55],[-108.33,39.07],[-108.55,39.06],[-109.05,38.84],[-109.56,38.57],[-110.11,38.36]],"Green River":[[-110.13,43.24],[-109.86,42.87],[-109.47,41.53],[-109.4,40.83],[-109.52,40.46],[-109.67,39.42],[-110.16,38.99],[-110.08,38.52],[-110.28,38.21]],"North Platte River":[[-106.42,40.6],[-106.83,40.98],[-107.24,41.79],[-106.31,42.87],[-105.38,42.76],[-104.18,42.06],[-103.67,41.87],[-102.98,41.14]],"South Platte River":[[-105.84,39.7],[-105.22,39.76],[-104.99,39.74],[-104.71,40.42],[-103.8,40.25],[-103.21,40.63],[-102.33,40.96]],"Arkansas River":[[-106.31,39],[-106.13,38.84],[-106,38.53],[-105.24,38.44],[-104.61,38.25],[-103.55,37.99],[-102.62,38.09],[-100.86,37.97]],"Rio Grande":[[-106.61,37.77],[-105.87,37.47],[-105.53,36.95]],"Gunnison River":[[-106.93,38.55],[-107.28,38.52],[-107.88,38.48],[-108.07,38.74],[-108.55,39.06]],"Yampa River":[[-106.83,40.49],[-107.55,40.52],[-108.7,40.53],[-109.45,40.85]],"Bear River":[[-110.87,41.26],[-110.96,41.27],[-111.82,41.74],[-112.03,41.51],[-112.25,41.48]],"Weber River":[[-110.87,40.93],[-111.53,41.16],[-111.97,41.22]],"Provo River":[[-111.29,40.56],[-111.58,40.35],[-111.67,40.24]]};
const DEFENSE_BELTS={
 northern:['Cheyenne','Laramie','Casper','Rawlins','Riverton','Lander','Rock Springs'],
 central:['Denver','Boulder','Colorado Springs','Idaho Springs','Silverthorne','Leadville','Glenwood Springs','Grand Junction'],
 southern:['Cañon City','Salida','Gunnison','Alamosa','Durango','Montrose'],
 western:['Vernal','Price','Evanston','Ogden','Provo','Salt Lake City']
};
const OPERATIONAL_AXES={
 northern:['Torrington','Douglas','Casper','Rawlins','Riverton','Rock Springs','Evanston','Ogden'],
 central:['Greeley','Longmont','Boulder','Denver','Idaho Springs','Silverthorne','Vail','Glenwood Springs','Grand Junction'],
 southern:['Pueblo','Colorado Springs','Cañon City','Salida','Gunnison','Montrose','Durango','Moab']
};
// Same half-staggered centre-cell WGS84 transform as California and Urals.
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,Math.round(
 (BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {c:Math.max(0,Math.min(COLS-1,Math.round(
 (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1)))),r};}
function contains(p,poly){let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>p.lat)!==(b[1]>p.lat)&&
   p.lon<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;}
function segmentDistance(p,a,b){
 const k=Math.cos(p.lat*Math.PI/180),dx=(b[0]-a[0])*k,dy=b[1]-a[1];
 const t=Math.max(0,Math.min(1,((p.lon-a[0])*k*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot((p.lon-a[0]-t*(b[0]-a[0]))*k,p.lat-a[1]-t*(b[1]-a[1]));}
function lineDistance(p,line){let d=Infinity;
 for(let i=1;i<line.length;i++)d=Math.min(d,segmentDistance(p,line[i-1],line[i]));
 return d;}
function landscape(p,c,r){
 if(LAKES.some(([,poly])=>contains(p,poly)))return 'sea';
 const basin=BASINS.find(([,poly])=>contains(p,poly));
 const high=MASSIFS.some(([,poly])=>contains(p,poly));
 const pass=PASSES.some(([,lon,lat,radius])=>Math.hypot(
 (p.lon-lon)*Math.cos(p.lat*Math.PI/180),p.lat-lat)<radius);
 const road=Object.values(ROADS).some(line=>lineDistance(p,line)<.055);
 // No fictitious impassable peaks. Passes are explicit openings, and rivers
 // follow headwaters rather than forming artificial sea barriers.
 if(high){if(pass||road)return 'forest';
  return ((c*13+r*19)%11)<8?'mountain':'forest';}
 if(basin)return basin[2];
 // Foothills taper into the forests, unlike parallel strip-based mountain maps.
 const nearby=MASSIFS.some(([,poly])=>poly.some(pt=>
  Math.hypot((p.lon-pt[0])*.75,p.lat-pt[1])<.25));
 if(nearby&&(c*17+r*7)%5!==0)return 'forest';
 if(p.lon<-112.4&&p.lat<42.8)return 'desert';
 return 'plains';
}
function nearest(g,p,valid,radius=19){
 const origin=E.tile(g,p.c,p.r);
 if(origin&&valid(origin))return origin;
 // Expand one square ring at a time. Avoid scanning every tile in a full
 // 39x39 box for each of the hundreds of deployed starting detachments.
 for(let ring=1;ring<=radius;ring++){
  let best=null,dist=Infinity;
  for(let r=Math.max(0,p.r-ring);r<=Math.min(g.rows-1,p.r+ring);r++)
   for(let c=Math.max(0,p.c-ring);c<=Math.min(g.cols-1,p.c+ring);c++){
    if(Math.max(Math.abs(r-p.r),Math.abs(c-p.c))!==ring)continue;
    const t=E.tile(g,c,r);if(!t||!valid(t))continue;
    const n=E.distance(p,t,g);if(n<dist){best=t;dist=n;}
   }
  if(best)return best;
 }
 return null;
}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group member can reach the destination');}
function create(player='eu',difficulty='normal',seed=201740){
 if(!SIDES.includes(player))throw Error('Unsupported Rocky Mountains faction '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
    Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{eu:0,britannia:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:{eu:'eu',britannia:'britannia'},factions:{},lineup:{}};
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:'rockyMountains',title:'Crossing the Rocky Mountains',
  phase:'continental-divide-offensive',aiDoctrine:'europe',groups:[],funding:{},
  bounds:BOUNDS,projection:PROJECTION,roads:ROADS,rivers:RIVERS,lakes:LAKES,
  mountainPasses:PASSES,reliefPolygons:MASSIFS,terrainBasins:BASINS,
  defenseBelts:DEFENSE_BELTS,operationalAxes:OPERATIONAL_AXES,
  geographicDataStatus:'WGS84 control-point geography; high-resolution DEM raster not bundled',
  reserveResponseTurn:0};
 const roster=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  roster.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
   E.ELITE_FORCES[id].availableTo.includes(side))]));
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0;
  return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};
 });
 // Enforce historical settlement coordinates; displace a colliding settlement
 // only to the nearest free land hex. Natural water is never turned into land.
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
   !g.stations.some(s=>s.c===t.c&&s.r===t.r),12);
  if(!at)throw Error('No valid dry land for '+name);
  const capital=['Salt Lake City','Denver','Scottsbluff','Pueblo'].includes(name);
  const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort:!!fort,
   gun:fort?name+' Mountain Battery':null,lab:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?52:tier===3?34:16+5*tier)*.55),
   industry:Math.round((capital?30:7*tier)*.55),science:Math.max(1,Math.round((1+tier)*.55)),
   producedTurn:0});
  // Urban hex is traversable, while neighboring pass/massif tiles stay intact.
  at.terrain='plains';
 }
 // All continental land provinces inherit their nearest actual settlement;
 // Great Salt Lake tiles retain no owner and are impassable to ground troops.
 for(const t of g.tiles){if(t.terrain==='sea')continue;
  let city=null,d=Infinity;
  for(const s of g.stations){const n=E.distance(t,s,g);
   if(n<d){d=n;city=s;}}
  t.owner=city.owner;t.provinceCity=city.id;
 }
 const byLabel=new Map();
 function group(side,label,origin){const key=side+':'+label;
  if(!byLabel.has(key)){const gr={id:'army-'+byLabel.size,side,
   name:label,origin,units:[],role:label.toLowerCase().includes('reserve')?'reserve':'front'};
   byLabel.set(key,gr);g.scenario.groups.push(gr);}
  return byLabel.get(key);}
 for(const [side,name,cls,count,commander,label] of FORMATIONS){
  const s=g.stations.find(v=>v.name===name);
  if(!s||s.owner!==side)throw Error('Bad starting deployment '+name);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
    t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),19);
   if(!at)throw Error('No free staging hex at '+name);
   const cmd=i===0?commander:null;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
   group(side,label,name).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(
   Object.entries(FUNDING[side]).map(([resource,n])=>
    [resource,Math.round(n)-base[resource]]));
  const actual=E.income(g,side);
  for(const resource of Object.keys(FUNDING[side]))
   g.economy[side][resource]={"eu":{"credits":2000,"industry":500,"science":312,"sakuradite":170},"britannia":{"credits":2000,"industry":500,"science":304,"sakuradite":180}}[side][resource];
 }
 if(difficulty!=='normal'&&difficulty!=='elite'){
  for(const side of SIDES.filter(v=>v!==player))
   for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
    E.addDifficultyFrames(u,difficulty);
 }
 E.applyScenarioDifficulty(g,difficulty);
 g.startUnits=Object.fromEntries(SIDES.map(s=>
  [s,g.units.filter(u=>u.side===s).length]));
 E.log(g,'Three enormous E.U. armies drive toward the Continental Divide while Britannia holds the Front Range, Wyoming basins and Wasatch reserves.',player);
 return g;
}
// Threat reactions supplement, rather than replace, the normal regional AI.
// Called by the existing scenario turn hook only when the Britannian phase is active.
function onTurn(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.phase!=='britannia'||
  g.scenario.reserveResponseTurn===g.turn)return false;
 g.scenario.reserveResponseTurn=g.turn;
 const threats=PASSES.map(p=>({pass:p,at:locate(p[1],p[2])})).filter(({at})=>
  g.units.some(u=>u.side==='eu'&&u.hp>0&&E.distance(u,at,g)<=8));
 if(!threats.length)return false;
 const reserves=g.scenario.groups.filter(gr=>gr.side==='britannia'&&gr.role==='reserve')
  .flatMap(gr=>gr.units).map(uid=>g.units.find(u=>u.id===uid&&u.hp>0))
  .filter(Boolean);
 const allocated=new Set();
 for(const {at} of threats.slice(0,4)){
  let count=0;
  const order=reserves.filter(u=>!allocated.has(u.id)&&E.distance(u,at,g)<32)
   .sort((a,b)=>E.distance(a,at,g)-E.distance(b,at,g));
  for(const u of order){if(count>=3)break;
   const dest=E.tile(g,at.c,at.r);
   if(!dest||dest.terrain==='sea')continue;
   const result=E.setGoto(g,u.id,at.c,at.r);
   if(result.ok){allocated.add(u.id);count++;}
  }
 }
 return false;
}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
 .reduce((sum,s)=>sum+s.tier,0);}
function objective(g,side=g.player){const other=side==='eu'?'britannia':'eu';
 const n=g.stations.filter(s=>s.owner===other).length;
 return 'Capture every '+(other==='britannia'?'Britannian':'E.U.')+
 ' city in the Rocky Mountains theatre ('+n+' remain). No turn limit.';}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side) &&
  (side==='eu'||!E.allUnits(g).some(u=>u.side==='eu'&&u.hp>0)))
  return {winner:side,team:side,reason:side==='eu'?
   'Europia United has captured every Rocky Mountain city and opened the eastern approach to the final Battle of Pendragon.':
   'Britannia has destroyed the E.U. offensive and reclaimed every eastern staging city.'};
 return null;}
// Visual-only WGS84 relief data renderer. The integrator invokes this from
// paintJapan() using the shared renderer's R/SQ constants after faction tint.
// Mountain outlines are approximations, not DEM-derived elevation contours.
function paintRelief(ctx,g,{R,SQ,left,right,top,bottom}){
 if(g.scenario?.id!==ID)return;
 const sx=SQ*R*g.cols/(BOUNDS.east-BOUNDS.west);
 const sy=1.5*R*g.rows/(BOUNDS.north-BOUNDS.south);
 const xy=([lon,lat])=>[R-SQ*R*.5+(lon-BOUNDS.west)*sx,
  R-.75*R+(BOUNDS.north-lat)*sy];
 function path(poly){ctx.beginPath();poly.forEach((point,i)=>{
  const [x,y]=xy(point);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
 });ctx.closePath();}
 ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
 for(const [,poly,kind] of BASINS){
  ctx.fillStyle=kind==='desert'?'rgba(207,171,110,0.35)':'rgba(153,176,126,0.18)';
  path(poly);ctx.fill();
 }
 // Separate actual named mountain massifs, instead of uniform diagonal strips.
 for(const [,poly] of MASSIFS){
  ctx.fillStyle='rgba(112,101,85,0.42)';path(poly);ctx.fill();
  ctx.strokeStyle='rgba(221,208,176,0.28)';ctx.lineWidth=Math.max(.7,R*.11);
  ctx.stroke();
 }
 for(const [,poly] of LAKES){
  ctx.fillStyle='#245b75';path(poly);ctx.fill();
  ctx.strokeStyle='rgba(173,218,228,0.7)';ctx.lineWidth=Math.max(.8,R*.1);
  ctx.stroke();
 }
 ctx.globalAlpha=.65;ctx.lineJoin='round';ctx.lineCap='round';
 ctx.strokeStyle='#5bb4c8';ctx.lineWidth=Math.max(1.1,R*.18);
 for(const line of Object.values(RIVERS)){
  ctx.beginPath();line.forEach((point,i)=>{
   const [x,y]=xy(point);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  });ctx.stroke();
 }
 ctx.restore();
}
const api={id:ID,key:'rockyMountains',title:'Crossing the Rocky Mountains',
 cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,projection:PROJECTION,
 cityData:CITIES,armyGroups:FORMATIONS,operationalAxes:OPERATIONAL_AXES,
 mountainPasses:PASSES,reliefPolygons:MASSIFS,lakes:LAKES,rivers:RIVERS,roads:ROADS,
 create,onTurn,objective,winner,strategicScore,orderGroup,paintRelief,geo,locate};
api.meta={terrainCosts:{mountain:2},map:{centreSampled:true},
  elite:true,expeditionSide:'eu',
  text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
    era:"Rocky Mountains · E.U. Penultimate Offensive",
    intro:"Europia United attacks westward through Wyoming and Colorado mountain corridors toward Utah. Conquer all 101 Britannian cities.",
    diplomacy:"Mountain passes, plains approaches and defensive reserves shape the offensive; rivers do not permit ocean shipping.",
    elite:"Standard Europia United and Britannian Elite Forces, research and rival commander scaling.",
    focus:{
      eu:"Denver",
      britannia:"Salt Lake City"
    }
  },
  blurbs:{
    eu:"Cross the Rockies from eastern plains through several passes, defeat Britannian reserves and reach Utah.",
    britannia:"Defend the mountain passes and move reserves against E.U. breakthroughs."
  }};
E.scenarios={...(E.scenarios||{}),rockyMountains:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
