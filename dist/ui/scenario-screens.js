/* Regional scenarios: the Invasion and Division of Japan and the European War, with faction/map previews. */
'use strict';
let scenarioSide = 'britannia';
let scenarioKind = 'invasion-japan';
let scenarioDifficulty = 'normal';
let scenarioRoutingGroup = null;
const SCENARIO_KINDS = [
  ['invasion-japan','The Invasion of Japan','44 cities · 3 sides'],
  ['division-japan','The Division of Japan','44 cities · 3 sides'],
  ['european-war','The European War','44 cities · 2 sides'],
  ['operation-stonehenge','Operation Stonehenge','37 cities · 2 sides'],
  ['bering-strait','The Bering Strait Crisis','28 cities · 2 sides'],
  ['conquest-indochina','The Conquest of Indochina','44 cities · 2 sides'],
  ['bf-south-china','Invasion of South China','64 cities · 2 sides'],
  ['philippines-invasion','The Invasion of the Philippines','37 cities · 2 sides'],
  ['invasion-korea','Invasion of Korea','55 cities · 2 sides'],
  ['war-for-australia','The War for Australia','48 cities · 3 sides'],
  ['area-18','The Conquest of Area 18','50 cities · 3 sides'],
  ['britannia-iraq-iran','Iraq–Iran Campaign','84 cities · 2 sides'],
  ['britannia-siberia','Invasion of Siberia','49 cities · 2 sides'],
  ['invasion-south-africa','Invasion of South Africa','47 cities · 2 sides'],
  ['crossing-urals','Crossing the Urals','40 cities · 2 sides'],
  ['invasion-turkey','Invasion of Turkey','59 cities · 2 sides'],
  ['britannia-western-russia','Invasion of St. Petersburg and Moscow','41 cities · 2 sides'],
  ['invasion-brazil','Invasion of Brazil','57 cities · 2 sides'],
  ['invasion-california','Invasion of California','63 cities · 2 sides'],
  ['invasion-canada','Invasion of Canada','74 cities · 2 sides'],
  ['invasion-caribbean','Invasion of the Caribbean','41 cities · 2 sides'],
  ['eu-great-lakes','Battle for the Great Lakes','56 cities · 2 sides'],
  ['bf-yangtze','Battle of the Yangtze River','60 cities · 2 sides'],
  ['eu-greenland','Invasion of Greenland','18 cities · 2 sides'],
  ['invasion-hawaii','Invasion of Hawaii','30 bases · 2 sides'],
  ['cf-new-zealand','Chinese Federation Invasion of New Zealand','63 cities · 2 sides'],
  ['invasion-american-east-coast','Invasion of the American East Coast','62 cities · 2 sides'],
  ['eu-panama','Panama Campaign','30 cities · 2 sides'],
  ['bf-malacca','Battle of the Strait of Malacca','54 cities · 2 sides'],
  ['eu-pendragon','Battle of Pendragon — E.U. Eastern Offensive','2 sides · Finale'],
  ['cf-pendragon','Battle of Pendragon — Chinese Western Offensive','2 sides · Finale'],
  ['cf-panama','Chinese Pacific Invasion of Panama','30 cities · 2 sides'],
  ['cf-pacific-northwest','Invasion of the Pacific Northwest','63 cities · 2 sides'],
  ['cf-central-america','Central American Offensive','81 cities · 2 sides'],
  ['cf-mexico','Conquest of the Mexican Heartland','80 cities · 2 sides'],
  ['eu-rocky-mountains','Crossing the Rocky Mountains','101 cities · 2 sides'],
  ['battle-luoyang','Battle of Luoyang','83 cities · 2 sides · final offensive']
];
const SCENARIO_BLURBS = {
  'cf-new-zealand': {
    cf: 'Lead seven carrier-led landing fleets against North Island and South Island simultaneously. Force Cook Strait, establish beachheads, cross the Southern Alps and take every Britannian city.',
    britannia: 'Hold both New Zealand islands with fortified Army Groups, naval bases and mobile reserves. Intercept Chinese carrier fleets in Cook Strait and counterattack every bridgehead.'
  },
  'battle-luoyang': {
    britannia: 'Converge from the Korean, Yangtze and eastern fronts; breach the Yellow River defense, seize the Imperial Capital and conquer every remaining Federation city.',
    cf: 'Defend the capital behind successive fortified belts, guard the crossings and counterattack isolated Britannian Army Groups with strategic reserves.'
  },
  'bf-south-china': {
    britannia: 'Command coordinated offensives from Indochina against Yunnan and Guangxi, while four carrier groups invade the Gulf of Tonkin, Hainan, Pearl Delta and eastern Guangdong. Capture every Chinese city.',
    cf: 'Defend Kunming, Nanning, Guangzhou and Shenzhen with fortified mountain corridors, industrial reserves and coastal fleets. Counterattack through the border passes and repel landings.'
  },
  'invasion-brazil': {
    eu: 'Launch six carrier-supported landing fronts from the Atlantic. Take Belém, Fortaleza, Recife, Salvador, Rio and the south; secure ports and advance inland to Brasília and beyond.',
    britannia: 'Defend all 57 Brazilian cities. Use the fortified ports, Amazon forests and central highlands to defeat the incoming fleets and counterattack occupied beaches.'
  },
  'invasion-california': {
    cf: 'Advance south from Federation-held Oregon while Chinese carrier fleets land near San Francisco, the central coast and southern California.',
    britannia: 'Defend San Francisco, Los Angeles, San Diego and the Central Valley with layered Army Groups, Pacific naval interception and reinforcements from Sierra passes.'
  },
  'invasion-canada': {
    eu: 'Command six northern footholds and launch five carrier-led invasions from the Atlantic, Hudson Strait, Labrador Sea and Arctic. Seize ports, then converge on the industrial heartland.',
    britannia: 'Hold Canada\'s fortified ports, prairie supply routes, Rocky Mountain passes and Great Lakes industrial network. Move reserves between threatened fronts.'
  },
  'bf-yangtze': {
    britannia: 'Lead seven enormous Army Groups across the Yangtze. Seize bridgeheads from Yichang to Nanjing, destroy Chinese river squadrons, and exploit breakthroughs toward the north.',
    cf: 'Hold the river crossing corridors, defend Wuhan and Nanjing, contest river ports, and commit inland reserves to crush isolated Britannian bridgeheads.'
  },
  'eu-great-lakes': {
    eu: 'Lead five coordinated offensives out of Ontario. Cross the inland seas, break Detroit and Buffalo, then take Chicago and the industrial belt.',
    britannia: 'Defend Chicago, Detroit, Cleveland and Buffalo with heavy formations, fortified cities, shipborne reserves and inland fleets.'
  },
  'invasion-american-east-coast': {
    eu: 'Lead six offshore carrier groups against New England, New York, Chesapeake Bay, the Carolinas, Georgia and Florida. Seize every Britannian city.',
    britannia: 'Fortify industrial capitals and harbors, contest landing beaches, defend the Appalachian approaches and counterattack E.U. bridgeheads.'
  },
  'bf-malacca': {
    britannia: 'Advance from southern Thailand while carrier task forces contest the narrow strait. Land on Sumatra, take Penang and Malacca, then storm Singapore and the island ports.',
    cf: 'Hold both shores with fortified cities, coastal army reserves and strong fleets. Defend Penang, Port Klang, Medan, Dumai and Singapore; intercept Britannian amphibious landings.'
  },
  'eu-panama': {
    eu: 'Invade exclusively from the Caribbean, take Colon and Gatun, then push through the canal toward Panama City and Balboa.',
    britannia: 'Defend Colón, Gatún, Balboa and Panama City. Hold the two canal bridges, protect naval bases and organize inland counteroffensives.'
  },
  'eu-pendragon': {eu:'Attack from Utah and eastern Nevada after crossing the Rockies. Break Britannian eastern defenses and capture every city.',britannia:'Defend Pendragon against Europia United attacking westward from Utah.'},
  'cf-pendragon': {cf:'Attack eastward from California and western Nevada with massive Chinese Army Groups to conquer every imperial city.',britannia:'Hold the western and northern imperial defenses against the Federation.'},
  'cf-panama': {cf:'Seize Balboa and Panama City by carrier-led invasion from the Pacific only, then fight toward Colon.',britannia:'Defend the Pacific canal mouth, lock system, Panama City and Colon.'},
  'cf-pacific-northwest': {cf:'Land carrier-led armies near Puget Sound, Columbia estuary and Oregon, then fight through the Cascades.',britannia:'Repel simultaneous Pacific landings and defend the mountain passes and inland reserves.'},
  'cf-central-america': {cf:'Advance north from Panama through three great land corridors, supported by Pacific amphibious landings.',britannia:'Hold Costa Rica through Guatemala with mountain defenses and fleet interception.'},
  'cf-mexico': {cf:'Invade from Guatemala and land on both coasts, converge on the Mexican Plateau and take every enemy city.',britannia:'Defend Mexico City, Puebla, Guadalajara and the major mountain approaches.'},
  'eu-rocky-mountains': {eu:'Cross the Rockies from eastern plains through several passes, defeat Britannian reserves and reach Utah.',britannia:'Defend the mountain passes and move reserves against E.U. breakthroughs.'},
'crossing-urals': {
britannia:'Drive west from Yekaterinburg and Chelyabinsk through the mountain pass corridors.',
eu:'Hold Perm, Ufa and the defended industrial passes; counterattack eastern spearheads.'
},
  'britannia-western-russia': {
    britannia: 'Advance west from the Volga through three Army Group axes, breach Moscow and St. Petersburg, then conquer all E.U. cities.',
    eu: 'Hold Moscow, St. Petersburg, the Upper Volga and the wooded river approaches. Commit reserves to blunt the Britannian offensive.'
  },
  'war-for-australia': {
    britannia: 'Hold Sydney, Melbourne, Brisbane and Australia’s eastern industrial heartland. Counter northern advances and Western amphibious landings.',
    cf: 'Push south from Darwin through the Outback, fight for Cape York, and launch amphibious assaults on the eastern and western coasts.',
    eu: 'Defend Perth and Adelaide, exploit the southern coastal corridor, and launch carrier-led landings to outflank eastern strongholds.'
  },
  'invasion-japan': {
    britannia: 'Defend Honshu and contain the Chinese Federation at the Kanmon Strait while cooperating temporarily with the Black Knights.',
    bk: 'Command Zero’s resistance enclaves in central Japan. For now the Black Knights are temporarily allied to Britannia.',
    cf: 'Command all of Kyushu as the Federation invasion base and push north into Honshu.'
  },
  'division-japan': {
    britannia: 'Hold the industrial heartland and Mount Fuji while defending against enemies to the north and west.',
    eu: 'Fight south from Hokkaido and Tohoku, or break out of the Chiba–Narita bridgehead beside Tokyo.',
    cf: 'Command western Honshu, Shikoku and Kyushu. Exploit strategic depth, multiple ports and your broad army front.'
  },
  'european-war': {
    eu: 'Hold the industrial cities of western and central Europe against the eastern offensive.',
    eb: 'Lead Euro Britannia’s elite spearheads from Russia and eastern Europe toward Paris.'
  },
  'operation-stonehenge': {
    britannia: 'Lead a carrier-borne amphibious invasion with no starting cities. Take E.U. ports to gain production capacity.',
    eu: 'Hold the British Isles, France and Iberia; repel Britannian carriers and amphibious landing forces.'
  },
  'invasion-caribbean': {
    eu: 'Command six loaded carrier forces, capture island harbours and advance from Cuba and the Bahamas through Hispaniola to the Lesser Antilles.',
    britannia: 'Defend the major islands and harbours, concentrate naval patrols and counterattack isolated beachheads.'
  },
  'eu-greenland': {
    eu: 'Start offshore with four carrier-supported Army Groups. Seize Greenland’s fjord ports and advance around the ice sheet to each Britannian base.',
    britannia: 'Hold Nuuk, Sisimiut, Ilulissat, Tasiilaq and the northern garrisons. Concentrate coastal reserves, patrol the straits and counterattack invaded harbours.'
  },
  'invasion-hawaii': {
    cf: 'Lead four Chinese carrier-led amphibious invasions into Britannian Hawaii from the western Pacific. Capture every island base.',
    britannia: 'Defend Pearl Harbor, Honolulu and the outer island garrisons. Use naval interception and island reserves to destroy Chinese transports.'
  },
  'invasion-south-africa': {
    britannia: 'Begin without cities. Land carrier-borne Knightmares at the Cape, along the southern coast, in KwaZulu-Natal or Namibia; seize ports before pushing inland.',
    eu: 'Hold all mainland cities, ports and industrial corridors. Intercept the carrier fleets, defend beaches and counterattack seized harbours.'
  },
  'conquest-indochina': {
    britannia: 'Hold Vinh and Vientiane against the first offensives. Use the Dong Hoi–Hue–Da Nang line, Thai highlands and reserves at Savannakhet and Nakhon Ratchasima; then counterattack Hanoi, Nanning and Kunming.',
    cf: 'Concentrate offensives along the Red River, Mekong Valley and northern Thai highlands. Break the forward fortifications, isolate Britannian reserves and capture every southern city.'
  },
  'philippines-invasion': {
    britannia: 'Launch the all-out invasion from Koror, Peleliu and Yap: escort amphibious Knightmares, land on multiple Philippine islands and capture Chinese ports.',
    cf: 'Hold Luzon, the Visayas, Mindanao and Palawan. Defend the major ports, contest the sea, contain landings and counter-invade Palau and Yap.'
  },
  'invasion-korea': {
    britannia: 'Lead five simultaneous carrier-led assaults from Japanese bases: Korea Strait, Jeju and the Yellow Sea, Incheon, Wonsan, and the north-east coast. Fight inland through western plains and mountain passes.',
    cf: 'Hold Seoul, Pyongyang, Busan and both Korean coasts. Concentrate fortified reserve armies at the Imjin, Han, Nakdong and Yalu lines while your fleets intercept Britannian landings.'
  },
  'britannia-siberia': {
    britannia: 'Launch the great westward offensive from Magadan, Oymyakon and Ust-Maya. Break E.U. defenses on the Lena and drive for the Trans-Siberian railway.',
    eu: 'Defend Yakutsk and Khandyga, protect the industrial railway hubs, preserve mobile reserves and counterattack Britannian columns.'
  },
  'bering-strait': {
    britannia: 'Command the Alaskan land army and carrier fleets. Cross the Bering Strait or strike Kamchatka through the Aleutians.',
    eu: 'Defend eastern Siberia and Chukotka, then counter-invade Alaska using fortified northern ports and Kamchatka bases.'
  },
  'invasion-turkey': {
    britannia: 'Lead the northern land offensive from Syria and Iraq, pierce the Taurus passes and land expeditionary fleets at Anatolian ports. Take every E.U. city.',
    eu: 'Defend Istanbul, Ankara and the Anatolian interior, hold the Bosporus and Dardanelles, then counterattack into Syria and Mesopotamia.'
  },
  'britannia-iraq-iran': {
    britannia:'Advance from Syria and Arabia, cross the Tigris–Euphrates plains, break the Zagros defenses and seize Tehran. The Persian Gulf fleets can strike the Iranian coast.',
    cf:'Hold northern and southern Iraq, counterattack the river crossings and preserve powerful reserves behind the Zagros passes and on the Iranian Plateau.'
  },
  'area-18': {
    britannia: 'Consolidate Arabia and Mesopotamia, break the Levantine line and drive east into Persia. Your fleets hold Gulf and Red Sea bases.',
    eu: 'Launch coordinated offensives from Syria, the Levant and Suez. Defend the northern Iraqi front against two rival armies.',
    cf: 'Command Persia from Tehran and the Zagros to Herat. Use mountain passes and the Persian Gulf to contest Britannian expansion.'
  }
};
const SCENARIO_TEXT = {
  'cf-panama': {
    era:'Panama · Chinese Pacific Offensive',
    intro:'The Chinese Federation invades Britannian Panama exclusively from the Pacific. Seize every city and the canal without a turn limit.',
    diplomacy:'Chinese Pacific carrier forces land around Balboa and Panama City; the canal is navigable and ports are independently capturable.',
    elite:'Standard Federation and Britannian Elite Forces with existing level and recruitment rules; carriers remain conventional.',
    focus:{cf:'',britannia:'Panama City'}
  },
  'cf-pacific-northwest': {
    era:'Pacific Northwest · Federation World Campaign',
    intro:'China lands five carrier-led invasions along the Washington and Oregon coast and advances across the Cascades. Total city conquest.',
    diplomacy:'Britannia owns all inland cities; independent ports and mountain passes determine where beachheads can expand.',
    elite:'Chinese and Britannian Elite Forces follow the standard four-difficulty system.',
    focus:{cf:'',britannia:'Seattle'}
  },
  'cf-central-america': {
    era:'Central America · Federation World Campaign',
    intro:'The Federation advances north from Panama through Costa Rica to Guatemala, supported by Pacific fleets. Capture all 81 cities.',
    diplomacy:'Mountain corridors, rivers, jungle and Pacific amphibious landings shape the invasion; all ports are independently capturable.',
    elite:'Standard Elite preparation and ongoing recruitment, using the proper Federation and Britannian rosters.',
    focus:{cf:'',britannia:'San José'}
  },
  'cf-mexico': {
    era:'Mexican Heartland · Federation World Campaign',
    intro:'China attacks north from conquered Guatemala and makes coastal landings against Mexico’s plateau and industrial cities.',
    diplomacy:'The Mexican Plateau, Sierra Madre ranges and separate Gulf/Pacific coasts shape large-scale Army Group warfare.',
    elite:'Elite uses established faction rosters, AI factories and commander levels.',
    focus:{cf:'Quetzaltenango',britannia:'Mexico City'}
  },
  'cf-pendragon': {
    era:'Pendragon · Chinese Western Finale',
    intro:'China attacks the imperial capital from California and western Nevada, facing powerful Britannian defenses. Capture all enemy cities.',
    diplomacy:'The Great Basin and imperial fortress system shape the final offensive; no turn cap or capital-only victory.',
    elite:'Existing Chinese Federation and Britannian Elite Force roster and commander rules apply.',
    focus:{cf:'Reno',britannia:'Pendragon'}
  },
  'eu-rocky-mountains': {
    era:'Rocky Mountains · E.U. Penultimate Offensive',
    intro:'Europia United attacks westward through Wyoming and Colorado mountain corridors toward Utah. Conquer all 101 Britannian cities.',
    diplomacy:'Mountain passes, plains approaches and defensive reserves shape the offensive; rivers do not permit ocean shipping.',
    elite:'Standard Europia United and Britannian Elite Forces, research and rival commander scaling.',
    focus:{eu:'Denver',britannia:'Salt Lake City'}
  },
  'cf-new-zealand': {
    era: 'New Zealand · Chinese Federation World Campaign',
    intro: 'The Chinese Federation has no mainland cities: seven carrier-led task forces invade North Island, South Island and Stewart Island while Britannia defends all cities and major naval bases. Total conquest without a turn limit.',
    diplomacy: 'Both sides are hostile from turn one. Carrier cargo must land amphibiously; Cook Strait remains navigable; shipyards are independently capturable. Army Groups cover both island campaigns.',
    elite: 'Elite uses standardized Chinese and Britannian Elite Force rosters, rival Level 5 commanders and established difficulty scaling; carrier hulls remain conventional.',
    focus: {cf:'',britannia:'Wellington'}
  },
  'battle-luoyang': {
    era: 'Henan · World Campaign Finale',
    intro: 'The decisive multi-front assault on Luoyang. A vast inland battlefield with a playable Yellow River barrier, named Army Groups and no turn limit. Every enemy city must fall.',
    diplomacy: 'Britannia and the Chinese Federation fight from turn 1. Luoyang has the hardest layered defense of this war; taking it alone cannot end the battle.',
    elite: 'Elite uses the existing faction elite roster and shared scenario scaling, including maximum-rank rival commanders. No artificially invulnerable city or unique combat modifiers.',
    focus: {britannia:'Xuchang',cf:'Luoyang'}
  },
  'bf-south-china': {
    era: 'South China · Alternate 2017',
    intro: 'Britannia attacks southern China on several continental fronts while carrier battle groups open a second front along the coast. Conquer all 64 theatre cities on a large regional map without a turn limit.',
    diplomacy: 'Britannia and the Chinese Federation are hostile from turn 1. Inland Army Groups and offshore invasion fleets operate independently; Chinese reserves and fleets defend mountain corridors, cities and strategic ports.',
    elite: 'Elite South China uses the standard faction Elite Force conversion and rival commander upgrades. Carrier fleets remain conventional; no unit balance or global campaign rules are changed.',
    focus: {britannia:'Lang Son',cf:'Guangzhou'}
  },
  'invasion-brazil': {
    era: 'Brazil · Alternate 2017',
    intro: 'Europia United begins with no Brazilian cities and launches six major transatlantic naval landings against Britannia. Total conquest of all 57 cities wins without a turn limit.',
    diplomacy: 'E.U. and Britannia are hostile from turn 1; EU fleets carry the entire first landing force. Capturing coastal ports creates forward bases for inland operations.',
    elite: 'Elite Brazil replaces eligible land formations with standard faction Elite Forces; carriers remain conventional. AI commander and production scaling follow standard scenario Elite rules.',
    focus: {eu:'',britannia:'Brasília'}
  },
  'invasion-california': {
    era:'California and Southern Oregon · Alternate 2017',
    intro:'Europia United launches four carrier-led landings coordinated with a northern land invasion. Britannia controls all California cities; the E.U. holds 12 southern Oregon staging towns.',
    diplomacy:'Two sides at war from turn 1. Capture every hostile city without a turn limit. Pendragon remains a separate final campaign battle.',
    elite:'Existing Elite Force rules replace eligible land formations; fleets retain conventional naval roles and rival commanders follow the current difficulty rules.',
    focus:{eu:'Medford',britannia:'Sacramento'}
  },
  'invasion-canada': {
    era: 'Canada · Alternate 2017',
    intro: 'Following Greenland, Europia United launches coordinated naval and northern invasions against Britannian Canada. All 74 theatre cities must fall; no turn limit.',
    diplomacy: 'Two hostile powers. Five amphibious invasion axes and continental defense with independently capturable ports and no scripted deadline.',
    elite: 'Elite Canada uses established single-frame Elite Forces and veteran enemy commanders. Carriers remain conventional; all faction mechanics are unchanged.',
    focus: {eu:'Iqaluit',britannia:'Ottawa'}
  },
  'bf-yangtze': {
    era: 'Central and Eastern Yangtze · Alternate 2017',
    intro: 'After South China, Britannia reaches the great Yangtze barrier. Cross its nine defended bridge corridors, seize every one of 60 cities, and advance deep into Federation territory. No turn limit.',
    diplomacy: 'Britannia and the Chinese Federation are hostile from the opening turn. River ships use the navigable main channel; ports are independently capturable. Tributaries are visual and geographic obstacles, not imaginary blue-water shortcuts.',
    elite: 'Elite Yangtze uses established Britannian and Chinese Elite Force replacements. Riverine fleets retain standard naval models and commander, production and income scaling follow existing Elite rules.',
    focus: {britannia:'Jingzhou',cf:'Wuhan'}
  },
  'eu-great-lakes': {
    era:'Great Lakes · Alternate 2017',
    intro:'After conquering Canada, Europia invades the Britannian Great Lakes industrial heartland. Fight across all five navigable lakes and seize all 56 cities without a turn limit.',
    diplomacy:'E.U. and Britannia are hostile from turn 1. Mackinac, St. Marys, Detroit and St. Clair are navigable. The Welland Canal bypasses Niagara Falls. Harbours can be captured separately.',
    elite:'Elite Great Lakes converts eligible land formations to established faction Elite Forces; naval vessels remain conventional and enemy aces gain their normal Elite bonuses.',
    focus:{eu:'Toronto',britannia:'Detroit'}
  },
  'eu-greenland': {
    era:'Greenland · Alternate 2017',
    intro:'Europia United launches a carrier-borne assault to take Greenland’s North Atlantic bases. Capture every enemy city; no turn limit.',
    diplomacy:'Britannia controls every city. Europia starts at sea with no city, but can seize independent harbours and reinforce coastal landing zones.',
    elite:'Elite Greenland uses the standard E.U. and Britannian elite conversion and increased AI resources; the geography and carrier rules are unchanged.',
    focus:{eu:'Nuuk',britannia:'Nuuk'}
  },
  'invasion-american-east-coast': {
    era: 'American Atlantic Seaboard · Alternate 2017',
    intro: 'Europia United starts at sea without cities. Six simultaneous amphibious fronts attack Britannia from Maine to Florida, with no turn limit.',
    diplomacy: 'Both powers are at war from turn 1. Capturable ports and fortified coastal cities control inland supply and naval staging.',
    elite: 'Elite East Coast uses standard faction Elite Force rosters. Rival named commanders begin at Level 5; carriers remain conventional.',
    focus: {eu:'',britannia:'New York City'}
  },
  'bf-malacca': {
    era:'Strait of Malacca · Alternate 2017',
    intro:'Britannia advances from its Indochinese positions into the Strait of Malacca. Fight through 54 regional cities on the Malay Peninsula, eastern Sumatra and the Singapore approaches. Total city conquest; no turn limit.',
    diplomacy:'Two hostile powers from turn one. The main sea channel is navigable, both shores have capturable ports and separate coastal land fronts. Seizing the strait denies an important Federation sea approach, but does not trigger a fictional global naval blockade.',
    elite:'Standard Britannian and Chinese Federation Elite Forces replace eligible land formations. Enemy veteran commanders, production and technologies use established Elite rules; carriers remain conventional.',
    focus:{britannia:'Phuket',cf:'Singapore'}
  },
  'eu-panama': {
    era:'Panama · Atlantic Offensive',
    intro:'Europia United attacks Britannian Panama solely from the Caribbean, fighting south through the canal. Every city must fall; no turn limit.',
    diplomacy:'The Panama Canal is navigable for fleets between the Atlantic and Pacific. Only the Centennial and Bridge of the Americas crossings permit land transit across the canal; ports are independently capturable.',
    elite:'Elite Panama starts with faction-specific Elite Forces at standard scenario levels; rival named commanders reach Lv.5. Carrier hulls stay conventional.',
    focus:{eu:'',britannia:'Colon'}
  },
  'eu-pendragon': {era:'Pendragon · Eastern Imperial Last Stand',intro:'The final E.U. offensive attacks west from Utah and eastern Nevada. Capture every city, not merely Pendragon. No turn limit.',diplomacy:'Europia United and Britannia are hostile from turn 1. The desert approaches, major road corridors and fortified capital ring are all traversable.',elite:'Elite Pendragon: eligible single-frame Elite Forces replace land formations; rival named commanders start at Level 5. Factories and research follow the established Elite AI rules.',focus:{eu:'Tooele',britannia:'Pendragon'}},
'crossing-urals': {
era:'The Urals · Alternate 2017',
intro:'Britannia advances from Siberia into E.U.-held industrial Russia. Capture every city without a turn limit.',
diplomacy:'Both sides are hostile from the start. Routes through the mountains are slower except at named valleys.',
elite:'Elite Urals uses the existing land Elite Force conversion, rival commanders and difficulty scaling.',
focus:{britannia:'Yekaterinburg',eu:'Perm'}
},
  'britannia-western-russia': {
    era: 'Western Russia · Alternate 2017',
    intro: 'After crossing the Urals, Britannia invades E.U.-controlled western Russia. Capture all 41 cities to win; no turn limit.',
    diplomacy: 'Two hostile powers from turn 1. Moscow and St. Petersburg are exceptionally fortified, but neither is invulnerable.',
    elite: 'Elite Western Russia: single-frame eligible Elite Forces; AI named commanders begin at Level 5. AI has stronger research and production, while player unlocks follow HQ rules.',
    focus: {britannia:'Kazan',eu:'Moscow'}
  },
  'war-for-australia': {
    era: 'Australia · Alternate 2018',
    intro: 'Britannia holds the east, China the north, and Europia the west. Three-way continental and naval war. Conquer every rival city.',
    diplomacy: 'All three powers are enemies from turn 1. No alliances, scripted diplomacy, or turn limit.',
    elite: 'Elite Australia: rivals gain 60% extra turn income and veteran three-frame land formations; all sides use their established faction units and commander rosters.',
    focus: {britannia:'Sydney',cf:'Darwin',eu:'Perth'}
  },
  'invasion-japan': {
    era: 'Japan · 2017 a.t.b.',
    intro: 'Three playable powers in the Japanese theatre, with an alliance that ends on turn 10.',
    diplomacy: 'Britannia and the Black Knights are allied until turn 10.',
    elite: 'All starting units are elite; AI-controlled starting commanders have Lv.5 frames, while player units and uncommanded AI units start at Lv.1. Rival factions recruit unlimited elites with Supreme Commander officers, full research, and Challenge advantages. Player elite recruitment requires HQ unlocks; mission carriers are available without permanent unlocks.',
    focus: {britannia:'Nagoya',bk:'Kyoto',cf:'Fukuoka'}
  },
  'division-japan': {
    era: 'Japan · Alternate 2017',
    intro: 'Alternate 2017: Britannia, Europia and China fight for a divided Japan from the first turn.',
    diplomacy: 'No alliances: all three powers are hostile from turn 1.',
    elite: 'All starting units are elite; AI-controlled starting commanders have Lv.5 frames, while player units and uncommanded AI units start at Lv.1. Rival factions recruit unlimited elites with Supreme Commander officers, full research, and Challenge advantages. Player elite recruitment requires HQ unlocks; mission carriers are available without permanent unlocks.',
    focus: {britannia:'Nagoya',eu:'Sendai',cf:'Hiroshima'}
  },
  'european-war': {
    era: 'Europe · 2017 a.t.b.',
    intro: 'Euro Britannia versus Europia United. No scripted turn limit: capture every enemy city.',
    diplomacy: 'Both sides are hostile from turn 1. Europia United has the larger industrial economy; Euro Britannia begins with a heavier eastern field army.',
    elite: 'Elite Europe: both armies and fleets begin as single-frame Lv.1 elites, except AI named commanders at Lv.5. Euro Britannia borrows Britannian Elite Forces. AI factories produce unlimited Lv.1 elites with full research; player Elite Force unlocks follow HQ rules.',
    focus: {eu:'Warsaw',eb:'Minsk'}
  },
  'operation-stonehenge': {
    era: 'Western Europe · Alternate 2017',
    intro: 'Britannia invades from the Atlantic with troops loaded on carriers and amphibious Knightmares at sea. The E.U. holds every city.',
    diplomacy: 'Only Britannia and Europia United are at war. Britannia must seize the entire theatre; the E.U. can win by destroying the invaders.',
    elite: 'Elite Stonehenge: land and amphibious units start as Elite Forces. Carriers remain conventional.',
    focus: {britannia:'',eu:'Paris'}
  },
  'invasion-caribbean': {
    era: 'Caribbean Sea · Alternate 2017',
    intro: 'Six E.U. task forces begin offshore with no cities; Britannia holds 41 island cities across the Caribbean.',
    diplomacy: 'Capture every hostile city to win. No turn limit and no F.L.E.I.J.A.',
    elite: 'Elite Caribbean converts eligible land forces and amphibious troops under the standard regional Elite rules; naval carriers remain conventional.',
    focus: {eu:'',britannia:'Havana'}
  },
  'invasion-hawaii': {
    era: 'Hawaiian Islands · Alternate 2017',
    intro: 'After the Bering Strait, Europia United launches four carrier-borne invasions of the Britannian Hawaiian Islands. The E.U. owns no city on turn one; seize all 30 bases to win.',
    diplomacy: 'Britannia controls eight fortified islands, airfields and independently capturable ports. No alliances or turn limit.',
    elite: 'Elite Hawaii: eligible transported land formations convert to Elite Forces. Naval carriers and amphibious fleets retain standardized mechanics.',
    focus: {eu:'',britannia:'Pearl Harbor'}
  },
  'invasion-south-africa': {
    era: 'Southern Africa · Alternate 2017',
    intro: 'Four Britannian carrier groups attack E.U.-controlled southern Africa from the Atlantic and Indian Oceans. Britannia owns no cities at the start.',
    diplomacy: 'Only Britannia and Europia United are at war. No turn limit: conquer every enemy city or eliminate the invading expedition.',
    elite: 'Elite South Africa: eligible Lv.1 Elite Forces replace transported land formations; named AI commanders reach Lv.5. Carriers and fleet escorts remain conventional.',
    focus: {britannia:'',eu:'Cape Town'}
  },
  'conquest-indochina': {
    era: 'Indochina · Alternate 2017',
    intro: 'Defense of Indochina: Britannia must withstand a three-axis Federation land offensive before advancing into Chinese-controlled northern Vietnam and southern China. Win only by capturing all 44 cities; there is no turn limit.',
    diplomacy: 'Britannia and the Federation are hostile from turn 1. Cities, independent naval ports and army concentrations change hands normally. F.L.E.I.J.A. is disabled.',
    elite: 'Elite Indochina applies the established faction Elite Force conversion, stronger rival commanders and difficulty scaling. Carriers remain conventional.',
    focus: {britannia:'Vinh',cf:'Hanoi'}
  },
  'britannia-siberia': {
    era: 'Siberia · Alternate 2017',
    intro: 'Following the Bering Strait victory, Britannia attacks west from Russian Far Eastern footholds. Capture every one of 49 Siberian cities to win.',
    diplomacy: 'Britannia and Europia United are hostile from turn 1. No F.L.E.I.J.A., scripted alliances or turn limit.',
    elite: 'Elite Siberia uses the established Elite Force conversion, rival veteran commanders and scenario research rules. No global faction unit changes.',
    focus: {britannia:'Ust-Maya',eu:'Yakutsk'}
  },
  'bering-strait': {
    era: 'Bering Strait · Alternate 2017',
    intro: 'Britannia versus Europia United: a two-front naval and amphibious war from Alaska to Kamchatka. Conquer every enemy city.',
    diplomacy: 'Britannia and Europia United are at war from turn 1. There is no Chinese Federation involvement or scripted deadline.',
    elite: 'Elite Bering: land and amphibious forces begin as Lv.1 Elite Forces; enemy named commanders begin at Lv.5. Carriers remain conventional. Rival AI has advanced research and elite factories; players follow HQ unlock rules.',
    focus: {britannia:'Nome',eu:'Provideniya'}
  },
  'philippines-invasion': {
    era: 'Philippine Archipelago · Alternate 2017',
    intro: 'Britannia launches an offshore carrier-supported assault on the Chinese Federation’s fortified Philippine archipelago. China controls every Philippine city on turn 1.',
    diplomacy: 'Britannia and the Chinese Federation are at war immediately. No scripted alliance or deadline. Victory requires taking all 37 theatre cities.',
    elite: 'Elite Philippines: starting land and amphibious formations become single-frame Elite Forces; AI named commanders begin at Lv.5. Carriers remain conventional. Elite recruitment follows the existing HQ and AI difficulty rules.',
    focus: {britannia:'Koror',cf:'Manila'}
  },
  'invasion-korea': {
    era: 'Korean Peninsula and Japan · Alternate 2017',
    intro: 'Britannia launches five major amphibious fronts from its Japanese bases. The Federation holds all 46 Korean cities; nine Japanese staging cities provide the Britannian supply base. Capture every theatre city to win.',
    diplomacy: 'Two hostile powers. Sea routes, separate capturable harbours, dense Korean mountain corridors and major rivers define the battle. No turn limit or scripted alliance.',
    elite: 'Elite Korea uses the established faction-specific land and amphibious Elite Forces and upgraded AI commanders. Carriers remain standard naval vessels.',
    focus: {britannia:'Fukuoka',cf:'Seoul'}
  },
  'invasion-turkey': {
    era: 'Anatolia · Alternate 2017',
    intro: 'Britannia attacks north from the Middle East while its expeditionary fleets target the Mediterranean coast. Europia United defends Turkey and the straits. Capture all 59 cities.',
    diplomacy: 'Two powers are at war from turn 1. The Bosporus and Dardanelles are navigable; ports may change hands. No turn limit.',
    elite: 'Elite Turkey uses standard faction Elite Force replacements for land and amphibious troops while ships remain conventional. AI income and commanders follow established Elite settings.',
    focus: {britannia:'Antakya',eu:'Ankara'}
  },
  'britannia-iraq-iran': {
    era:'Iraq and Iran · Alternate 2017',
    intro:'Britannia invades Iraq and Iran from western expeditionary bases. Fight across Mesopotamia, breach the Zagros and capture the Iranian Plateau. All 84 theatre cities count; no turn limit.',
    diplomacy:'Only Britannia and the Chinese Federation fight. Two theaters, independent Gulf ports, major reserves and a contested Strait of Hormuz; no three-faction Area 18 forces.',
    elite:'Elite Iraq–Iran uses both factions’ standard Elite Force rosters, veteran rival commanders and existing production rules. Carrier hulls remain conventional.',
    focus:{britannia:'Deir ez-Zor',cf:'Baghdad'}
  },
  'area-18': {
    era: 'Middle East · Alternate 2017',
    intro: 'Three great powers fight across Arabia, Mesopotamia, the Levant and Persia. Conquer every rival city.',
    diplomacy: 'Britannia, Europia United and the Chinese Federation are all hostile from turn 1. No betrayals, nuclear weapons or campaign deadline.',
    elite: 'Elite Area 18: each power begins with eligible Lv.1 Elite Forces. Rival named commanders start at Lv.5; carriers remain conventional. Research and Elite Force production follow existing scenario rules.',
    focus: {britannia:'Baghdad',eu:'Damascus',cf:'Kermanshah'}
  }
};
function scenarioModel(kind = scenarioKind) {
  return E.scenarios?.byId?.[kind] || E.scenarios?.japan;
}
function scenarioDialog() {
  const model = scenarioModel();
  if (!model) return;
  if (!model.sides.includes(scenarioSide)) scenarioSide = model.sides[0];
  const text = SCENARIO_TEXT[scenarioKind] || SCENARIO_TEXT['invasion-japan'];
  const saved = getSave(SCENARIO_KEY), resume = saved && !saved.over && scenarioModel(saved.scenario?.id);
  const preview = model.create(scenarioSide,scenarioDifficulty,246801);
  const choices = SCENARIO_KINDS.filter(([id])=>E.scenarios?.byId?.[id]).map(([id,title,note])=>
    '<button class="small'+(id===scenarioKind?' active':'')+
    '" data-scenario-kind="'+id+'" aria-pressed="'+(id===scenarioKind)+'">'+
    title+' · '+note+'</button>').join('');
  const cards=model.sides.map(s=>{
    const owner=E.FACTIONS[s];
    const cities=preview.stations.filter(c=>c.owner===s).length;
    const units=preview.units.reduce((n,u)=>n+(u.side===s?1:0)+
      (u.cargo||[]).filter(v=>v.side===s).length,0);
    return '<button class="faction '+s+(s===scenarioSide?' active':'')+'" data-scenario-faction="'+s+'">'+
      (ART.flagSVG(s) ? '<span class="faction-banner" aria-hidden="true">'+ART.flagSVG(s)+'</span>' : '')+
      '<span class="label" style="color:'+(s==='bk'?'#f0c94a':owner.color)+'">'+owner.short+'</span>'+
      '<h3>'+owner.name+'</h3><p>'+(SCENARIO_BLURBS[scenarioKind]?.[s]||'')+'</p>'+
      '<p class="doctrine">'+cities+' cities · '+units+' starting formations</p>'+
      '<span class="select-mark">'+(s===scenarioSide?'✓ Selected':'Select faction')+'</span></button>';
  }).join('');
  const difficulties = Object.entries(E.DIFFICULTIES)
    .filter(([id])=>['normal','hard','challenge','elite'].includes(id))
    .sort((a,b)=>['normal','hard','challenge','elite'].indexOf(a[0])-
      ['normal','hard','challenge','elite'].indexOf(b[0]))
    .map(([id,d])=>'<option value="'+id+'"'+
      (scenarioDifficulty===id?' selected':'')+'>'+d.name+'</option>').join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide scenario-select" role="dialog" aria-modal="true" aria-label="Scenario selection">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario Mode · '+text.era+'</div>'+
    '<h2>'+model.title+'</h2><p>'+text.intro+'</p><div class="scenario-choices">'+choices+'</div>'+
    '</div><button class="small close" data-action="scenario-close">Back</button></div>'+
    (resume ? '<div class="conquest-row"><div><label>Saved scenario</label><h3 class="conquest-title">'+esc(resume.title)+'</h3>'+
      '<p class="mode-note">'+E.FACTIONS[saved.player].name+' · '+(E.DIFFICULTIES[saved.difficulty]?.name || 'Normal')+' · turn '+saved.turn+'</p></div>'+
      '<button class="primary" data-action="continue-scenario">Continue</button></div>' : '')+
    '<canvas id="scenario-preview-map" class="scenario-preview-map" aria-label="Regional scenario preview with cities and armies"></canvas>'+
    '<div class="choice-grid '+(model.sides.length===2?'two':'three')+'">'+cards+'</div>'+
    '<div class="setup-row"><div><label for="scenario-difficulty">Difficulty</label>'+
    '<select id="scenario-difficulty" class="select">'+difficulties+'</select>'+
    '<p class="mode-note">'+(scenarioDifficulty==='elite'?text.elite:'Hard and Challenge strengthen rival armies and income.')+'</p></div>'+
    '<div><label>Opening diplomacy</label><p>'+text.diplomacy+'</p></div></div>'+
    '<div class="dialog-footer"><small class="notice">'+model.cols+' × '+model.rows+
      ' hexes · '+preview.stations.length+' cities · '+preview.units.length+
      ' starting formations · Saved automatically in its own scenario slot. Total conquest victory.</small>'+
      '<button class="primary" data-action="start-scenario">Command '+E.FACTIONS[scenarioSide].short+'</button></div>'+
    '</section></div>';
  const canvas=modal.querySelector('#scenario-preview-map');
  if(canvas){
    const dpr=Math.min(window.devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(600,Math.round(rect.width*dpr));
    canvas.height=Math.max(330,Math.round(rect.height*dpr));
    const b=canvas.getContext('2d');
    if(b)paintMap(b,preview,canvas.width,canvas.height,dpr,true);
  }
  focusDialog();
}
function startScenario(side=scenarioSide, campaignContext=null) {
  const model=scenarioModel();
  if(!model?.sides.includes(side))return;
  resetSession();
  game=model.create(side,scenarioDifficulty,Date.now()>>>0);
  if (campaignContext) game.warCampaign={...campaignContext};
  scenarioRoutingGroup=null;
  setWorld();
  // Start inside each faction's theatre instead of fitting empty sea.
  const focusName=(SCENARIO_TEXT[scenarioKind]||SCENARIO_TEXT['invasion-japan']).focus[side];
  const focus=game.stations.find(s=>s.name===focusName)||
    game.stations.find(s=>s.owner===side)||
    game.units.find(u=>u.side===side&&u.hp>0);
  const units=game.units.filter(u=>u.side===side&&u.hp>0)
    .sort((a,b)=>E.distance(a,focus,game)-E.distance(b,focus,game));
  selection={kind:'unit',id:units[0]?.id};
  zoom=homeZoom();
  closeModal();
  render();
  centerOn(focus||selectedUnit()||homeOf());
  save();
  toast(model.title+' loaded. All enemy cities must fall. Progress saves automatically each turn.',true);
}

function scenarioGroupsDialog() {
  if(game.mode!=='scenario')return;
  const groups=game.scenario.groups.filter(gr=>gr.side===game.player);
  const rows=groups.map(gr=>{
    const listed=[...game.units,...game.units.flatMap(u=>u.cargo||[])];
    const units=gr.units.map(id=>listed.find(u=>u.id===id)).filter(u=>u&&u.hp>0);
    const editable=E.armyGroup(game,gr.editableId);
    const destination=gr.destination?' · Destination '+gr.destination.c+','+gr.destination.r:'';
    return '<div class="conquest-row scenario-army-row"><div>'+
      '<label>'+units.length+' operational formations'+destination+'</label>'+
      '<h3 class="conquest-title">'+esc(gr.name)+'</h3>'+
      '<p class="mode-note">'+units.map(u=>esc(E.TYPES[u.type].name)).slice(0,6).join(' · ')+
      (units.length>6?' · …':'')+'</p></div>'+
      '<div class="scenario-group-buttons"><button data-scenario-group-focus="'+gr.id+'">Locate</button>'+
      '<button class="small" data-scenario-group-import="'+gr.id+'">'+(editable?'Manage editable group':'Make editable group')+'</button>'+ 
      (editable?'':'<button class="primary" data-scenario-group-route="'+gr.id+'"'+(!units.length?' disabled':'')+'>Set destination</button>')+'</div>'+
      '</div>';
  }).join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Scenario army groups">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario · Operational Command</div>'+
    '<h2>Army Groups & Fleets</h2><p>Group orders assign standing destinations to each reachable formation. '+
    'They advance at the beginning of each of your turns.</p></div>'+
    '<button class="small close" data-action="close">Return</button></div>'+
    rows+'<div class="dialog-footer"><small>Import a starting formation to add, remove, and direct its units using the full Army Groups controls.</small><button data-action="army-groups">Army Groups</button></div>'+
    '</section></div>';
  focusDialog();
}
function scenarioGroupFocus(id) {
  const gr=game.scenario?.groups?.find(v=>v.id===id&&v.side===game.player);
  const u=gr?.units.map(id=>game.units.find(v=>v.id===id&&v.hp>0)).find(Boolean)||
    (game.scenario?.id==='invasion-korea'&&game.units.find(ship=>ship.hp>0&&
      (ship.cargo||[]).some(c=>gr?.units.includes(c.id)&&c.hp>0)));
  closeModal();
  if(u)selectUnit(u.id,true);
}
function scenarioGroupStart(id) {
  if(game.mode!=='scenario' || !interactive() || !game.scenario.groups.some(
      gr=>gr.id===id&&gr.side===game.player))return;
  scenarioRoutingGroup=id;
  routing=null;
  deploying=null;
  closeModal();
  toast('Click a destination hex for the selected army group. Press Escape to cancel.',true);
}

function scenarioGroupImport(id) {
  if (game.mode !== 'scenario' || !interactive()) return;
  const staging = game.scenario?.groups?.find(gr => gr.id === id && gr.side === game.player);
  if (!staging) return;
  const existing = E.armyGroup(game, staging.editableId);
  if (existing) return armyGroupsDialog(existing.id);
  const created = E.createArmyGroup(game);
  if (!created.ok) return toast(created.reason);
  const group = created.group;
  group.name = staging.name;
  const members = staging.units.filter(unitId =>
    game.units.some(u => u.id === unitId && u.hp > 0 && u.side === game.player));
  // The Korean land invasion groups begin aboard carriers. Editing their
  // formation before landing imports the carrier hosts, never cargo ghosts.
  if(game.scenario?.id==='invasion-korea'){
    const embarked=new Set(staging.units);
    for(const ship of game.units)if(ship.side===game.player&&ship.hp>0&&
      (ship.cargo||[]).some(c=>embarked.has(c.id)&&c.hp>0)&&!members.includes(ship.id))
      members.push(ship.id);
  }
  let assigned = 0;
  for (const unitId of members.slice(0, 24))
    if (E.addArmyGroupUnit(game, group.id, unitId).ok) assigned++;
  if (staging.destination) E.orderArmyGroup(game, group.id, staging.destination.c, staging.destination.r);
  staging.editableId = group.id;
  refreshAndSave();
  armyGroupsDialog(group.id);
  toast(group.name + ': ' + assigned + ' formations imported' +
    (members.length > 24 ? ' · 24-unit group limit reached' : '') + '.');
}
