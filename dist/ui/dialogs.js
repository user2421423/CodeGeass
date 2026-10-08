/* Knightmare Conquest UI: Dialogs: factory and Elite Forces, HQ research, commanders, Knightmare archive, world powers, manuals, menu. */
'use strict';
const BRANCH_LIST = ['Infantry', 'Armor', 'Artillery'];
const ELITE_FACTORY_TAB = 'Elite Forces',
  NAVAL_TAB = 'Naval';
// The factory tabs: the three branches, a Naval tab for a power with a navy (Conquest), and Elite Forces.
const shopTabs = () => [
  ...BRANCH_LIST,
  ...(E.navalTypes(game, game.player).length ? [NAVAL_TAB] : []),
  ...(game.mode === 'campaign' ? [] : [ELITE_FACTORY_TAB]),
];
function openShop(id, branch = shop.branch) {
  const s = game.stations.find(s => s.id === id);
  if (!s || s.owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = branch;
  if (branch === ELITE_FACTORY_TAB) return openEliteShop(id);
  const free = E.recruitOptions(game, s, game.player);
  const lineup = E.lineupOf(game, game.player),
    catalog =
      branch === NAVAL_TAB
        ? E.navalTypes(game, game.player)
        : game.buildable?.[game.player] || E.CLASS_ORDER.map(cls => lineup[cls]),
    // Campaign factions can deliberately reuse one frame for several class slots (Euro Britannia is the main
    // example). The factory should show that frame once, not duplicate the card for every slot it fills.
    types = [...new Set(catalog)].filter(
      k => k && (branch === NAVAL_TAB ? E.TYPES[k].naval : E.TYPES[k].branch === branch && !E.TYPES[k].naval),
    );
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Knightmare factory"><div class="dialog-head"><div><div class="eyebrow">${F(s.owner).name} · ${s.name} · Factory level ${s.tier}</div><h2>Roll out a Knightmare unit</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry, sakuradite: game.economy[game.player].sakuradite || 0 }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${shopTabs().map(b => `<button data-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div><label for="stack-select">Unit strength &nbsp;</label><select class="select" id="stack-select">${[1, 2, 3].map(n => `<option value="${n}" ${shop.stack === n ? 'selected' : ''}>${n} ${n === 1 ? 'frame' : 'frames'}</option>`).join('')}</select></div></div>${s.producedTurn === game.turn ? '<div class="info-strip">This factory has finished production for this turn.</div>' : branch === NAVAL_TAB ? '<p class="description">Naval units are built at the city’s port and wait on its sea hex: amphibious Knightmares need a level-1 port, Carrier-Battleships level 2. Build or upgrade the port in the city panel.</p>' : !free.length ? '<div class="info-strip">No free land hex. Move friendly units away from the city.</div>' : '<p class="description">One unit per city per turn. New units deploy on the city or a free land hex next to it and act next turn. Tier II and III frames also cost Sakuradite.</p>'}<div class="cards">${types
    .map(k => {
      const t = E.TYPES[k],
        n = t.naval === 'ship' ? 1 : shop.stack,
        p = E.price(k, n, game, game.player),
        can = E.canBuy(game, s, k, n),
        capacity = t.capacity ? E.carrierCapacity(game, { type: k, side: game.player }) : 0;
      return `<article class="unit-card ${s.tier < t.tier ? 'locked' : ''}">${ART.unit(k, 'catalog-ship', s.owner)}<span class="unit-code">${t.role} · Tier ${t.tier} · ×${n}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p>${t.desc}</p><p class="lore">${t.weapon}</p><div class="unit-spec"><span>HP ${Math.round(t.hp * (1 + 0.7 * (n - 1)))}</span><span>${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (n - 1)))}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span>${t.seaMove ? `<span>Sea ${t.seaMove}</span>` : ''}${capacity ? `<span>Carries ${capacity}</span>` : ''}<span>${ICONS.use('rng')}${rangeText({ type: k, side: game.player })}</span></div><div class="cost">${costHTML(p)}</div>${act(`data-recruit="${k}"`, 'Roll out', can ? null : E.buyReason(game, s, k, n))}</article>`;
    })
    .join('')}</div></section></div>`;
  focusDialog();
}

function openEliteShop(id) {
  const s = game.stations.find(v => v.id === id);
  if (!s || s.owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = ELITE_FACTORY_TAB;
  const p = loadProfile();
  E.eliteProfile(p);
  saveProfile(p);
  const ids = Object.keys(E.ELITE_FORCES).filter(k => E.ELITE_FORCES[k].availableTo.includes(game.player));
  const tabs = shopTabs()
    .map(b => `<button data-branch="${b}" class="${b === ELITE_FACTORY_TAB ? 'active' : ''}">${b}</button>`)
    .join('');
  const cards = ids.map(k => {
    const e = E.ELITE_FORCES[k],
      rec = E.eliteRecord(p, k),
      level = Math.max(1, rec.level || 1),
      stats = E.eliteStats(k, level),
      t = E.TYPES[e.type],
      cost = E.elitePrice(k, level),
      why = E.eliteDeployReason(game, s, k, p),
      ability = rec.level >= 5 ? e.lv5Text : rec.level >= 3 ? e.lv3Text : 'Signature ability unlocks at Elite Lv.3.';
    return `<article class="unit-card elite-card ${rec.level ? '' : 'locked'}">${ART.unit(e.type, 'catalog-ship', t.side)}<span class="unit-code">${e.rarity} · ${rec.level ? `Elite Lv.${rec.level}` : 'Locked'} · unique ×1</span><h3>${t.name}</h3><span class="weapon-focus">${e.skill}</span><p>${ability}</p><p class="lore">${t.weapon}</p><div class="unit-spec"><span>HP ${stats.hp}</span><span>${ICONS.use('atk')}${stats.attack}</span><span>${ICONS.use('def')}${stats.armor}</span><span>${ICONS.use('mov')}${stats.move}</span><span>${ICONS.use('rng')}${stats.min === stats.max ? stats.max : stats.min + '–' + stats.max}</span></div><div class="cost">${costHTML(cost)}</div>${act(`data-elite-deploy="${k}"`, rec.level ? 'Deploy elite' : 'Locked', why, rec.level ? 'Once per operation · one unique frame' : `Fragments ${rec.fragments}/${E.ELITE_UNLOCK_FRAGMENTS}`)}</article>`;
  }).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Elite Force factory"><div class="dialog-head"><div><div class="eyebrow">${F(s.owner).name} · ${s.name} · Factory level ${s.tier}</div><h2>Deploy an Elite Force</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry, sakuradite: game.economy[game.player].sakuradite || 0 }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${tabs}</div><div><span class="label">Unique frames · ×1 only</span></div></div><div class="info-strip">An unlocked Elite Force may deploy once per operation. It uses this city's production for the turn and enters combat next turn.</div><div class="cards">${cards || '<p class="description">No Elite Forces are currently available to this faction.</p>'}</div></section></div>`;
  focusDialog();
}
let eliteBack = 'game',
  eliteFaction = 'britannia';
function eliteDialog(faction = eliteFaction) {
  eliteFaction = faction;
  const p = loadProfile();
  E.eliteProfile(p);
  saveProfile(p);
  const ids = Object.keys(E.ELITE_FORCES).filter(k => E.ELITE_FORCES[k].faction === faction);
  const tabs = [
    ['britannia', 'Britannia'],
    ['eu', 'E.U.'],
    ['cf', 'Chinese Federation'],
    ['black_knights', 'Black Knights'],
  ].map(([k, name]) => `<button data-elite-side="${k}" class="${k === faction ? 'active' : ''}">${name}</button>`).join('');
  const cards = ids.map(k => {
    const e = E.ELITE_FORCES[k],
      rec = E.eliteRecord(p, k),
      level = Math.max(1, rec.level || 1),
      stats = E.eliteStats(k, level),
      t = E.TYPES[e.type],
      next = Math.min(E.ELITE_MAX_LEVEL, rec.level + 1),
      cost = rec.level >= E.ELITE_MAX_LEVEL ? 0 : E.ELITE_UPGRADE_FRAGMENTS[next],
      why = E.eliteUpgradeReason(p, k),
      label = rec.level === 0 ? 'Unlock' : rec.level >= E.ELITE_MAX_LEVEL ? 'Maximum level' : `Upgrade to Lv.${next}`;
    return `<article class="unit-card elite-card ${rec.level ? '' : 'locked'}">${ART.unit(e.type, 'catalog-ship', t.side)}<span class="unit-code">${e.rarity} · ${rec.level ? `Lv.${rec.level}/${E.ELITE_MAX_LEVEL}` : 'Locked'}</span><h3>${t.name}</h3><span class="weapon-focus">${e.skill}</span><p>${rec.level >= 5 ? e.lv5Text : rec.level >= 3 ? e.lv3Text : e.lv3Text}</p><p class="lore">Lv.5: ${e.lv5Text}</p><div class="unit-spec"><span>HP ${stats.hp}</span><span>${ICONS.use('atk')}${stats.attack}</span><span>${ICONS.use('def')}${stats.armor}</span><span>${ICONS.use('mov')}${stats.move}</span><span>${ICONS.use('rng')}${stats.min === stats.max ? stats.max : stats.min + '–' + stats.max}</span></div><div class="elite-fragments"><b>${rec.fragments}</b> fragments${cost ? ` · ${cost} needed for ${rec.level ? 'next level' : 'unlock'}` : ''}</div>${act(`data-elite-upgrade="${k}"`, label, why, cost ? `Spend ${cost} fragments` : '', '', false)}</article>`;
  }).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Elite Forces HQ"><div class="dialog-head"><div><div class="eyebrow">Command HQ · persistent across operations</div><h2>Elite Forces</h2><p>Collect fragments → unlock a unique Knightmare → raise it to Elite Lv.5. Signature abilities unlock at Lv.3 and reach their final form at Lv.5.</p></div><button class="small close" data-action="elite-close">Close</button></div><div class="tabs">${tabs}</div><div class="info-strip">Each unlocked Elite Force may deploy only once per operation and always fights as a single unique frame. Cornelia's Gloucester, Leila's Alexander, Chuyen and Tohdoh's Gekka begin with the 30 fragments needed to unlock.</div><div class="cards">${cards}</div></section></div>`;
  focusDialog();
}
let researchBranch = 'infantry',
  researchBack = 'game';
function tokenCost(n, have) {
  return `<span class="cost-line"><span class="cost-item${n > have ? ' short' : ''}">${ICONS.use('token', 'cost-ico')}${count(n)}</span></span>`;
}
// HQ research: command tokens from victories buy permanent technology kept across every operation.
function researchDialog(branch = researchBranch) {
  researchBranch = branch;
  const p = loadProfile(),
    research = E.normalizeResearch(p.research || {}),
    tokens = p.tokens || 0,
    wins = p.wins || 0,
    tree = E.TECH_TREE[branch];
  const tiers = [1, 2, 3, 4]
    .map(
      t =>
        `<span class="tier ${wins >= E.TECH_TIERS[t] ? 'open' : ''}">Tier ${E.ROMAN[t]} · ${E.TECH_TIERS[t] ? (wins >= E.TECH_TIERS[t] ? 'unlocked' : `${E.TECH_TIERS[t]} victories`) : 'open'}</span>`,
    )
    .join('');
  const cards = Object.keys(tree.nodes)
    .map(k => {
      const id = `${branch}.${k}`,
        n = E.TECH_NODES[id],
        l = research[id] || 0,
        done = l >= n.max,
        req = n.req ? E.TECH_NODES[`${branch}.${n.req[0]}`] : null;
      return `<section class="tech-card hq"><span class="label">${tree.name} · Level ${l} / ${n.max}</span><h3>${n.name}</h3><ol class="doctrine">${n.values.map((v, i) => `<li class="${i < l ? 'unlocked' : ''}"><b>${E.ROMAN[i + 1]}</b> ${n.text(v)} <small>Tier ${E.ROMAN[n.tiers[i]]}</small></li>`).join('')}</ol>${req ? `<small class="req">Requires ${req.name} ${E.ROMAN[n.req[1]]}</small>` : ''}<div class="tech-levels">${n.values.map((_, i) => `<i class="${i < l ? 'unlocked' : ''}"></i>`).join('')}</div>${act(`data-research="${id}"`, done ? 'Fully researched' : `Research ${E.ROMAN[l + 1]}`, done ? 'Fully researched' : E.researchReason(p, id), done ? '' : tokenCost(E.researchCost(id, l), tokens), '', !done)}</section>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ research"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation and faction</div><h2>HQ research</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(tokens)}</b> command tokens · ${wins} ${wins === 1 ? 'victory' : 'victories'}</p></div><button class="small close" data-action="research-close">Close</button></div>${tokens || Object.keys(research).length ? '' : `<div class="info-strip">Command tokens are earned by the first victory with each faction at each difficulty: ${E.TOKEN_REWARD.victory} per victory plus ${E.TOKEN_REWARD.conquest} for the conquest and 1 per ${E.TOKEN_REWARD.research} research banked (up to ${E.TOKEN_REWARD.researchCap}), ×1.5 on Hard and ×2 on Challenge, and ${E.TOKEN_REWARD.first} more for your first win ever.</div>`}<div class="tier-row">${tiers}</div><div class="tabs">${Object.entries(
    E.TECH_TREE,
  )
    .map(([k, b]) => `<button data-research-branch="${k}" class="${k === branch ? 'active' : ''}">${b.name}</button>`)
    .join('')}</div><p class="description">${tree.desc}</p><div class="tech-grid">${cards}</div></section></div>`;
  focusDialog();
}
function ratingStars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, E.MAX_RATING - n));
}
// A clickable portrait: opens the Commander Info card, for your own commander (personal) or an operation's.
function generalPortrait(k, cls = '', personal = false) {
  return ART.portrait(k, cls).replace(
    '<span ',
    `<span data-general="${k}" data-personal="${personal ? 1 : 0}" role="button" tabindex="0" title="${esc(C(k).name)}: commander info" `,
  );
}
function commanderBaseHTML(k) {
  const text = E.commanderStatsText(k);
  return text ? `<p class="commander-base-stats"><span class="label">Base stats</span><br>${esc(text)}</p>` : '';
}
const BRANCH_ICONS = { infantry: 'scout', armor: 'medium', artillery: 'rocket' };
// A token-priced button. When unavailable it stays hoverable (aria-disabled) so the reason shows as a tooltip.
function tokenButton(attrs, cost, why, label = '', cls = '') {
  const have = loadProfile().tokens || 0;
  return `<button class="small token-buy ${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `aria-disabled="true" title="${esc(why)}"` : ''}>${label}${tokenCost(cost, have)}</button>`;
}
// Where HQ screens return to: the start menu or the map.
let hqBack = 'game';
// Commander Info. Personal: your persistent commander, upgraded with command tokens. Otherwise: the operation's
// commander, shown read-only.
function generalDialog(k, personal = false) {
  const a = C(k),
    profile = loadProfile(),
    owned = E.owns(profile, k),
    own = a.side === (hqBack === 'start' ? a.side : game.player),
    o = personal
      ? E.roster(profile)[k] || { rank: 0, ratings: { ...E.officer(game, k).ratings }, medals: [] }
      : E.officer(game, k),
    editable = personal && owned,
    unit = game.units.find(u => u.hp > 0 && u.cmd === k && !!u.personal === personal),
    top = o.rank >= E.RANKS.length - 1,
    stars = n => Array.from({ length: E.MAX_RATING }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  generalOpen = { k, personal };
  const ratings = Object.entries(E.BRANCH_NAMES)
    .map(
      ([b, name]) =>
        `<div class="gi-rating" title="${name}: ${o.ratings[b]} of ${E.MAX_RATING} stars. ${b === 'mobility' ? '1–2★ gives no bonus, 3★ gives +1 movement, 4★ gives +2, 5★ gives +3, and 6★ gives +4 movement.' : 'Each star above 3 adds 4% damage and cuts damage taken 3% in this branch.'}"><span class="gi-badge ${b === 'mobility' ? 'mobility' : ''}">${b === 'mobility' ? ICONS.use('mov', 'gi-mobility-glyph', 'Mobility') : ART.unit(E.typeFor(a.side, BRANCH_ICONS[b]), '', a.side)}</span><span class="gi-rating-info"><span class="gi-name">${name}</span><span class="gi-stars">${stars(o.ratings[b])}</span></span>${editable && o.ratings[b] < E.MAX_RATING ? tokenButton(`data-buy-star="${b}" data-officer="${k}" aria-label="Buy a ${name} star"`, E.starCost(profile, k, b), E.starReason(profile, k, b)) : ''}</div>`,
    )
    .join('');
  const medals = editable
    ? `<div class="gi-medals"><span class="label">Medals ${o.medals.length}/${E.medalSlots(o)}</span>${o.medals.map(m => `<button class="small medal-chip" data-unequip="${m}" data-officer="${k}" title="${esc(E.MEDALS[m].desc)} · click to remove">🎖 ${E.MEDALS[m].name} ×</button>`).join('')}${[...new Set(profile.medals || [])].map(m => act(`data-equip="${m}" data-officer="${k}"`, `Wear ${E.MEDALS[m].name}`, E.equipReason(profile, k, m), E.MEDALS[m].desc, 'small')).join('')}</div>`
    : '';
  const skills = Object.entries(o.generics || {});
  const capacity = E.genericSlots(k);
  const skillPanel = `<div class="gi-ability" style="margin-top:12px"><span class="label">Generic skills · ${skills.length}/${capacity} slots</span>
    <p style="font-size:12px">The unique skill stays fixed. Generic skills are bought with command tokens.</p>
    ${skills.map(([id, level]) => `<div style="padding:8px 0;border-bottom:1px solid #ffffff22"><b>${esc(E.GENERIC_SKILLS[id]?.name || id)} · Lv.${level}/5</b><small style="display:block">${esc(E.genericDescription(id, level))}</small>
    ${editable ? `${level < 5 ? tokenButton(`data-buy-generic="${id}" data-officer="${k}"`, E.genericCost(level), E.genericReason(profile, k, id), 'Upgrade ') : '<span class="label">MAX</span>'}
      ${tokenButton(`data-remove-generic="${id}" data-officer="${k}"`, E.GENERIC_RESPEC_COST, E.removeGenericReason(profile, k, id), 'Replace ')}` : ''}</div>`).join('')}
    ${editable && skills.length < capacity ? `<details style="margin-top:8px"><summary>Learn generic skill (${capacity - skills.length} empty)</summary>
      <div style="max-height:230px;overflow:auto">${Object.entries(E.GENERIC_SKILLS).filter(([id]) => !o.generics?.[id]).map(([id, skill]) =>
        `<div style="padding:6px 0;border-bottom:1px solid #ffffff22"><b>${esc(skill.name)}</b><small style="display:block">${esc(E.genericDescription(id, 5))}</small>
          ${tokenButton(`data-buy-generic="${id}" data-officer="${k}"`, E.genericCost(0), E.genericReason(profile, k, id), 'Learn ')}</div>`).join('')}</div></details>` : capacity === 0 ? '<p>No generic slots at this tier.</p>' : ''}</div>`;
  const footer = personal
    ? owned
      ? !top
        ? `<div class="gi-promote-row"><div><span class="label">Next rank</span><b>${E.RANKS[o.rank + 1]}</b><small>Unit frame ${Math.round(E.RANK_HP[o.rank] * 100)}% → ${Math.round(E.RANK_HP[o.rank + 1] * 100)}%</small></div>${tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(profile, k), 'Promote ')}</div>`
        : '<div class="gi-promote-row"><b>Highest rank</b></div>'
      : `<div class="gi-promote-row"><div><span class="label">Not yet one of your commanders</span><b>Recruit ${a.short}</b><small>A one-time price; then assignable in every operation and upgradable here.</small></div>${tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div>`
    : `<div class="gi-promote-row"><div><span class="label">${own ? 'Operation commander' : 'Rival commander'}</span><b>Fixed for this operation</b><small>${own ? `Operation commanders cannot be upgraded. Your own ${a.short} is developed in HQ → Commanders.` : `${F(a.side).name}. Ratings and rank shown as of this operation.`}</small></div></div>`;
  modal.innerHTML = `<div class="overlay"><section class="dialog wide general-info ${a.side}" role="dialog" aria-modal="true" aria-label="Commander info"><div class="gi-head"><button class="small close" data-action="general-close" aria-label="Close">✕</button><h2>Commander Info</h2></div><div class="gi-body"><div class="gi-left"><div class="gi-nameplate"><span class="gi-stars-top">${'★'.repeat(a.stars)}</span><b>${a.name}</b></div><div class="gi-portrait">${ART.portrait(k, 'gi-portrait-art')}</div><div class="gi-rank"><div class="gi-rank-line"><span class="gi-insignia">✦</span><span>${E.RANKS[o.rank]}</span></div><div class="gi-rank-line"><span class="gi-heart">❤</span><span>${Math.round(E.RANK_HP[o.rank] * 100)}% unit frame</span></div><div class="gi-kind ${personal ? 'mine' : ''}">${personal ? 'Your commander' : own ? 'Operation commander' : 'Rival commander'}</div></div></div><div class="gi-right"><div class="gi-ratings">${ratings}</div><div class="gi-ability"><span class="label">${a.skill} · ${a.title}</span><p>${a.desc}</p>${commanderBaseHTML(k)}<small>${a.role} specialist · Signature frame: ${a.hull}${unit ? ` · Commanding ${E.TYPES[unit.type].short} ×${unit.stack}` : ''}${game.missionKills?.[k] ? ` · ${game.missionKills[k]} kills this operation` : ''}</small></div><div class="gi-ladder"><span class="label">Rank · ${o.rank + 1} of ${E.RANKS.length}</span><div class="gi-pips">${E.RANKS.map((r, i) => `<i class="${i < o.rank ? 'done' : i === o.rank ? 'now' : ''}" title="${r} · ${Math.round(E.RANK_HP[i] * 100)}% unit frame${i ? ` · ${E.PROMOTE_COST[i]} tokens` : ''}"></i>`).join('')}</div></div>${skillPanel}${medals}${footer}</div></div><div class="gi-foot">${personal || own ? '<button class="small" data-action="generals">HQ commanders</button>' : ''}${hqBack === 'game' ? '<button class="small" data-action="admirals">Assign commanders</button>' : ''}</div></section></div>`;
  focusDialog();
}
function commanderCard(u) {
  const a = C(u.cmd),
    o = E.officerOf(game, u);
  return `<div class="admiral-card">${generalPortrait(u.cmd, '', !!u.personal)}<b>${E.RANKS[o.rank]} ${a.name}</b><p>${a.skill} · ${a.desc}</p>${commanderBaseHTML(u.cmd)}<p class="officer-line">${u.personal ? 'Your commander' : 'Operation commander'} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame · ${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `${name} ${o.ratings[b]}★`)
    .join(' · ')}</p></div>`;
}
// In an operation: assign your commanders to units. Operation commanders are listed but stay where they are.
// Friendly activation and enemy designation use the same explicit target picker.
function commandDialog(u) {
  const action = C(u.cmd).action, options = E.actionTargets(game, u), friendly = action.kind === 'command';
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="${esc(action.name)}"><div class="eyebrow">${esc(action.name)} · every 3 turns</div><h2>${friendly ? 'Which unit acts again?' : 'Designate an enemy'}</h2><p>${esc(action.desc)}</p><div class="station-buttons">${options.map(v => `<button data-command="${v.id}">${v.cmd ? esc(C(v.cmd).short) + ' · ' : ''}${esc(E.TYPES[v.type].short)} ×${v.stack} · ${esc(nearestCityName(v))}</button>`).join('')}</div><div class="dialog-footer"><button data-action="close">Cancel</button></div></section></div>`;
  focusDialog();
}
function admiralDialog() {
  if (!interactive()) return;
  generalOpen = null;
  hqBack = 'game';
  const u = selectedUnit(),
    own = u?.side === game.player ? u : null,
    mine = Object.keys(game.roster || {}).filter(k => E.serves(k, game.player)),
    scenario = game.units.filter(v => v.hp > 0 && v.side === game.player && v.cmd && !v.personal);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Unit commanders"><div class="dialog-head"><div><div class="eyebrow">High command · ${F(game.player).name}</div><h2>Commanders</h2><p>${costHTML({ credits: game.economy[game.player].credits }, true)} available · ${own && !own.cmd ? 'Assign one of your commanders to ' + E.TYPES[own.type].name + ' ×' + own.stack : 'Select one of your units without a commander to assign one.'}</p></div><button class="small close" data-action="close">Close</button></div><div class="info-strip">Your commanders are yours to keep: assign them to any unit in any operation, even beside the operation's own version, and develop them in HQ → Commanders. Operation commanders come with the war and cannot be upgraded.</div><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(k => officerCard(k, own)).join('') || '<p class="description">No commanders for this faction yet. Recruit them in HQ → Commanders.</p>'}</div>${scenario.length ? `<h3 class="officer-section">Operation commanders</h3><div class="scenario-commanders">${scenario.map(v => `<div class="scenario-chip">${generalPortrait(v.cmd, 'chip-portrait', false)}<span><b>${C(v.cmd).short}</b><small>${E.TYPES[v.type].short} ×${v.stack} · ${E.RANKS[E.officerOf(game, v).rank]}</small></span></div>`).join('')}</div>` : ''}<div class="dialog-footer"><button data-action="generals">HQ commanders · upgrade &amp; recruit</button></div></section></div>`;
  focusDialog();
}
function officerCard(k, own) {
  const a = C(k),
    o = game.roster[k],
    busy = game.units.find(v => v.hp > 0 && v.personal && v.cmd === k);
  return `<section class="officer">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame · ${a.skill}</span><p>${a.desc}</p>${commanderBaseHTML(k)}<div class="ratings">${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`)
    .join(
      '',
    )}</div>${o.medals.length ? `<p class="officer-line">🎖 ${o.medals.map(m => E.MEDALS[m].name).join(', ')}</p>` : ''}<div class="officer-actions">${busy ? `<button class="small" disabled>Commanding ${E.TYPES[busy.type].short}</button>` : act(`data-admiral="${k}"`, 'Assign to selected unit', E.assignReason(game, own, k), costHTML({ credits: a.cost }))}</div></section>`;
}
// HQ → Commanders, as in WC4: your persistent roster for each faction, and the commanders still to recruit.
let generalsSide = 'britannia';
function generalsDialog(side = generalsSide) {
  generalsSide = side;
  generalOpen = null;
  const profile = loadProfile(),
    list = Object.entries(E.COMMANDERS).filter(([, a]) => (side === 'bk' ? ['bk', 'jlf'].includes(a.side) : a.side === side)),
    mine = list.filter(([k]) => E.owns(profile, k)),
    locked = list.filter(([k]) => !E.owns(profile, k)),
    card = ([k, a]) => {
      const owned = E.owns(profile, k),
        o = owned ? E.roster(profile)[k] : { rank: 0, ratings: { ...E.officer(game, k).ratings } };
      return `<section class="officer ${owned ? '' : 'locked-officer'}">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${owned ? `${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame` : 'Recruitable'} · ${a.role} · ${a.skill}</span><p>${a.desc}</p>${commanderBaseHTML(k)}<div class="ratings">${Object.entries(
        E.BRANCH_NAMES,
      )
        .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`)
        .join(
          '',
        )}</div><div class="officer-actions">${owned ? `<button class="small" data-general-open="${k}">Upgrade</button>` : tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div></section>`;
    };
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ commanders"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation</div><h2>Commanders</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(profile.tokens || 0)}</b> command tokens · ${Object.keys(E.roster(profile)).length} commanders</p></div><button class="small close" data-action="generals-close">Close</button></div><div class="tabs">${[...E.MAJORS, 'bk'].map(s => `<button data-generals-side="${s}" class="${s === side ? 'active' : ''}">${F(s).name}</button>`).join('')}</div><p class="description">Your commanders can lead any unit of their faction in any operation, even when the operation already fields its own version of them. Promote them and buy branch or Mobility stars with command tokens; medals you earn are worn here.${side === 'bk' ? ' In Conquest, Black Knights and JLF commanders lead Chinese Federation units.' : ''}</p><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(card).join('')}</div>${locked.length ? `<h3 class="officer-section">Recruit · ${locked.length}</h3><div class="admiral-grid officers">${locked.map(card).join('')}</div>` : ''}</section></div>`;
  focusDialog();
}
let archiveSide = null,
  archiveBack = 'game';
// Every non-Elite frame: the three powers' lineups, navies and campaign-only frames, then the campaign sides and neutrals.
const ARCHIVE_SIDES = [...E.MAJORS, 'eb', 'bk', 'jlf', 'neutral'],
  ARCHIVE_BRANCHES = [...BRANCH_LIST, 'Naval'];
function archiveTypes(side, branch) {
  if (branch === 'Naval') return E.NAVAL[side] ? [...new Set(Object.values(E.NAVAL[side]))] : [];
  // A faction may deliberately map several WC4 class slots to one Code Geass frame. Show each actual frame once.
  const lineup = E.ROSTER[side] ? E.CLASS_ORDER.map(cls => E.ROSTER[side][cls]) : [],
    own = Object.keys(E.TYPES).filter(k => E.TYPES[k].side === side && !E.TYPES[k].naval);
  return [...new Set([...lineup, ...own])].filter(k => k && !E.TYPES[k].elite && E.TYPES[k].branch === branch);
}
function archiveDialog(branch = 'Infantry', side = archiveSide || game.player) {
  if (!ARCHIVE_SIDES.includes(side)) side = game.player;
  archiveSide = side;
  const branches = ARCHIVE_BRANCHES.filter(b => archiveTypes(side, b).length);
  if (!branches.includes(branch)) branch = branches[0];
  const types = archiveTypes(side, branch),
    f = F(side),
    note =
      branch === 'Naval'
        ? 'Navies are Conquest-only and built at ports. Every power’s equivalent units share the same numbers; only names and art differ.'
        : E.MAJORS.includes(side)
          ? 'Lineups follow the Code Geass wiki: Britannia with Euro Britannia, the E.U. with wZERO and the Star of Madrid, and the Federation with the Jabalpur-built Black Knights frames and the Burai Kai. Configurations are the game’s loadouts of a wiki frame. Campaign-only frames appear in story missions, not in Conquest factories.'
          : E.ROSTER[side]
            ? 'The frames this side fields in story missions, including those it shares with the major powers. Campaign-only frames are not built in Conquest.'
            : 'Neutral garrisons and the Geass Order’s Siegfried. Campaign-only frames are not built in Conquest.';
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Knightmare archive"><div class="dialog-head"><div><div class="eyebrow">Order of battle</div><h2>Knightmare archive</h2><p>${f.name} frames. Values shown for one frame.${f.doctrine ? ` <b>${f.doctrine}:</b> ${f.doctrineText}` : ''}</p></div><button class="small close" data-action="archive-close">Close</button></div><div class="tabs">${ARCHIVE_SIDES.map(s => `<button data-archive-side="${s}" class="${s === side ? 'active' : ''}">${F(s).short}</button>`).join('')}</div><div class="tabs">${branches.map(b => `<button data-archive-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div class="cards">${types
    .map(k => {
      const t = E.TYPES[k],
        capacity = t.capacity ? E.carrierCapacity(game, { type: k, side }) : 0;
      return `<article class="unit-card">${ART.unit(k, 'catalog-ship', side)}<span class="unit-code">${t.role} · ${t.wc} · Tier ${t.tier}${t.campaign ? ' · Campaign only' : ''}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p style="margin-top:10px">${t.desc}</p><p class="lore">${t.lore}<br><b>${t.weapon}</b></p><div class="unit-spec"><span>HP ${t.hp}</span><span>${ICONS.use('atk')}${t.attack}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${t.min === t.max ? t.max : t.min + '–' + t.max}</span>${t.seaMove ? `<span>Sea ${t.seaMove}</span>` : ''}${capacity ? `<span>Carries ${capacity}</span>` : ''}</div><div class="cost">${costHTML(E.price(k, 1, game, side))}</div></article>`;
    })
    .join('')}</div><p class="description">${note}</p></section></div>`;
  focusDialog();
}
// A power's strategic weapons as intelligence sees them: projects under way and warheads ready.
function strategicText(side) {
  const projects = game.stations.filter(s => s.project?.side === side),
    eliminatorProjects = game.stations.filter(s => s.eliminatorProject?.side === side),
    eliminators = game.stations.filter(s => s.owner === side && s.eliminator),
    warheads = game.arsenal?.[side] || 0,
    parts = [
      ...projects.map(s => `F.L.E.I.J.A. building in ${s.name} (turn ${s.project.ready})`),
      ...(warheads ? [`F.L.E.I.J.A. ×${warheads} ready`] : []),
      ...eliminatorProjects.map(s => `Eliminator building in ${s.name} (turn ${s.eliminatorProject.ready})`),
      ...eliminators.map(s => `Eliminator ready at ${s.name}`),
    ];
  return parts.length ? `<span class="fleija-text">${parts.join(' · ')}</span>` : '—';
}
// The war at a glance: each power's cities, income, army and capital.
function powersDialog() {
  const rows = E.MAJORS.map(side => {
    const inc = E.income(game, side),
      cities = game.stations.filter(s => s.owner === side).length,
      army = game.units.filter(u => u.hp > 0 && u.side === side).length,
      fall = game.fallen?.[side];
    return `<tr class="${side === game.player ? 'mine' : ''}"><td><span class="legend-dot" style="background:${F(side).color}"></span> ${F(side).name}</td><td>${fall ? `Surrendered to the ${F(fall.by).short} (turn ${fall.turn})` : F(side).capital}</td><td>${cities}</td><td>${fall ? '—' : '+' + inc.credits}</td><td>${fall ? '—' : '+' + inc.sakuradite}</td><td>${fall ? '—' : strategicText(side)}</td><td>${army}</td></tr>`;
  }).join('');
  const neutral = game.stations.filter(s => s.owner === 'neutral').length;
  // Who works each Sakuradite deposit.
  const deposits = (game.sites || [])
    .map(d => {
      const owner = E.depositOwner(game, d),
        host = d.city == null ? 'Mine' : game.stations.find(s => s.id === d.city)?.name;
      return `<span class="deposit-chip" style="border-color:${F(owner).color}">${ICONS.use('sakuradite', 'cost-ico')} ${esc(d.name)} <small>${host} · ${F(owner).short} · +${E.depositYield(game, d).sakuradite}</small></span>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="World powers"><div class="dialog-head"><div><div class="eyebrow">Turn ${game.turn} of ${E.ARMISTICE}</div><h2>World powers</h2></div><button class="small close" data-action="close">Close</button></div><table class="powers"><thead><tr><th>Power</th><th>Capital</th><th>Cities</th><th>Income</th><th>Sakuradite</th><th>Strategic</th><th>Units</th></tr></thead><tbody>${rows}<tr><td><span class="legend-dot" style="background:#d8cfa6"></span> Neutral powers</td><td>Australia · Middle East</td><td>${neutral}</td><td>—</td><td>—</td><td>—</td><td>${game.units.filter(u => u.hp > 0 && u.side === 'neutral').length}</td></tr></tbody></table>${deposits ? `<span class="label">Sakuradite deposits</span><div class="deposit-list">${deposits}</div>` : ''}<p class="description">A power surrenders only when it has lost every city: its armies disband and its mines pass to the conqueror. Capitals are the richest cities, not a knockout. Win when every rival has surrendered, or by holding the most cities at the ${E.ARMISTICE}-turn armistice.</p></section></div>`;
  focusDialog();
}
// The field manual's Sakuradite entry, built from the engine's numbers.
function sakuraditeManual() {
  const S = E.SAKURADITE,
    rates = S.extraction.map(r => Math.round(r * 100) + '%'),
    sites = E.RESOURCE_SITES.map(([name, , , base]) => `${name} ${base}`).join(', '),
    cost = Object.entries(S.cost)
      .reduce((a, [cls, n]) => ((a[n] ||= []).push(E.CLASSES[cls].role.toLowerCase()), a), {}),
    costText = Object.entries(cost)
      .map(([n, roles]) => `${roles.join(', ')} ${n}`)
      .join('; '),
    japan = E.RESOURCE_SITES.filter(([name]) => S.allocation.sites.includes(name)).reduce((a, d) => a + d[3], 0),
    world = E.RESOURCE_SITES.reduce((a, d) => a + d[3], 0),
    keep = Math.round(100 * (1 - 2 * S.allocation.share)),
    share = Math.round(100 * S.allocation.share),
    naval = E.NAVAL.britannia,
    elite = Object.entries(S.elite).map(([rarity, n]) => `${rarity} ${n}`).join(', ');
  return `The fourth resource. Japan holds ${japan} of the world's ${world} base output, and its Sakuradite is allocated internationally: the power controlling a Japanese deposit keeps ${keep}% of what it extracts and every other surviving major power receives ${share}% (a surrendered power's share stays with the controller). Deposits and base output a turn: ${sites}. A refinery extracts ${rates[0]} of a deposit's output with no upgrades, then ${rates[1]}, ${rates[2]} and ${rates[3]} (plus ${S.exportCredits} credits) at levels 1–3. Sakuradite per frame: ${costText}; basic frames need none. Type II amphibious ${E.price(naval.amphibious2).sakuradite}, Carrier-Battleship ${E.price(naval.carrier).sakuradite}. Elite Forces, whatever their level: ${elite}. A mine on its own hex has no defenses: move Infantry or Armor onto it to seize it. A deposit under a city changes hands with the city. Every power starts with ${S.start}.`;
}
function fleijaManual() {
  const f = E.FLEIJA,
    c = f.cost;
  const e = E.ELIMINATOR,
    ec = e.cost;
  return `The Sakuradite superweapon is conquest-only, not permanent HQ research. Research Lab III unlocks for every major power on turn ${f.labTurn}; a city with a level-${f.lab} lab can then build a warhead for ${c.credits} credits, ${c.industry} industry, ${c.science} research and ${c.sakuradite} Sakuradite over ${f.turns} turns and builds nothing else meanwhile. Every power is alerted when work begins, and capturing the city ends the project. Launch finished warheads from the arsenal button at any hex, as many as you hold. Ground zero: every unit is erased, a city there is destroyed for good (a power that loses its last city this way surrenders to the launcher), a Sakuradite deposit there never produces again, and the land becomes a crater. The ring around it: units are left at ${Math.round(f.ringHP * 100)}% with collapsed morale; cities lose their defenses and a level of every building. The first successful detonation starts Eliminator research for every power: ${e.research} turns later, level-${e.lab} labs can build a F.L.E.I.J.A. Eliminator for ${ec.credits} credits, ${ec.industry} industry, ${ec.science} research and ${ec.sakuradite} Sakuradite over ${e.turns} turns. One ready charge protects targets within ${e.range} hexes of its city and automatically neutralizes one incoming warhead; capturing or ruining that city destroys it. The blast itself spares no one, including your own forces.`;
}
function helpDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Field manual"><div class="dialog-head"><div><div class="eyebrow">Field manual</div><h2>War on a world of hexes</h2></div><button class="small close" data-action="help-close">Close</button></div><div class="help-grid"><div><b>Movement &amp; firing</b><p>Every unit can move once, then attack once per turn. Attacking ends its movement. Hostile formations use a bright red health ring; campaign allies do not. Your units that still have movement or an attack available make their existing health/token ring glow bright green, WC4-style. Select a unit, click a green hex to move, and click a red hex to attack at once; hover a red hex to see the expected damage. Undo (Z) returns a unit that moved but has not fired.</p></div><div><b>Three branches</b><p>As WC4's infantry, tanks and artillery, every Knightmare belongs to a branch. <b>Infantry</b>: cheap scouts, assault frames (+55% against Armor and city defenses) and five-hex raiders. <b>Armor</b>: line, mainline, heavy and super-heavy frames with breakthroughs. <b>Artillery</b>: fire support at range 1 and rocket and siege frames at exactly range 2. Artillery attacks draw no counter-fire and cannot capture cities.</p></div><div><b>Factions</b><p>Each power builds its own frames. ${E.MAJORS.map(side => `${F(side).short}: ${E.CLASS_ORDER.map(cls => E.TYPES[E.ROSTER[side][cls]].name).join(', ')}.`).join(' ')} Doctrines: Britannian Armor +8% damage, E.U. Artillery +10% damage, Federation Infantry 15% cheaper.</p></div><div><b>Standing orders</b><p>Select one of your units and choose <b>Set destination</b> (or press G), then click any hex. At the start of each of your turns the unit moves as far toward it as it can, and the order ends when it arrives. It never attacks on its own, so you can still fire with it after it moves. Warships stay at sea, and other units take to the sea only when the destination lies across it. Change the destination or press <b>Stop auto-move</b> at any time during your turn, and it stays put next turn. Units on standing orders are skipped when you cycle through ready units unless they have a target in range.</p></div><div><b>Oceans &amp; transports</b><p>The map wraps around the globe. A land unit with movement left may step onto a sea hex: it embarks as a transport and stops. Embarked units sail 5 hexes a turn (more with Naval Transports), cannot fire or counter-fire, and take 50% extra damage. Sailing onto a coast hex lands the unit and ends its move; landing on an undefended enemy city captures it.</p></div><div><b>Navies</b><p>In Conquest every power has the same navy under its own names (Britannia’s Portman, the E.U.’s Panzer-Frosch, the Federation’s Shui Gun-Ru, and each power’s Carrier-Battleship) and starts with four carriers and six amphibious formations. Amphibious Knightmares fight at sea, cross the coast without stopping and can attack after landing, but are weaker than a Sutherland on land (move 3 on land, 6 at sea, 10 beside a carrier; +25% against transports and warships; the type II adds +15% in the water). A Carrier-Battleship sails 10 hexes, fires at range 1–2 (any unit with the range returns its fire) and carries two formations: boarding ends a unit’s turn, and a launched unit lands on an empty land hex next to the ship with a full move and attack, but not on the turn it boarded. A sunk carrier takes its cargo with it.</p></div><div><b>Ports</b><p>Coastal cities build a port on a sea hex beside them (⚓ on the map): level 1 builds amphibious Knightmares, level 2 Carrier-Battleships, and naval units berthed there repair 10%, 20% or 30% a turn. Level 3 enables the tier IV naval research. Taking a city does not take a port an enemy ship still holds: clear the ships out first. The Naval research branch improves transports to 6 hexes, amphibious movement, landing craft, carrier gunnery and port repairs. Reinforced Naval Hulls increase the HP of amphibious Knightmares and carriers by up to 24%, Advanced Torpedoes add up to 20% damage against warships, and Warship Fire Control adds up to 20% carrier counter-fire damage. Tier IV also adds Advanced Naval Logistics for faster embark/landing tempo, Rapid Launch Systems (+15% on the first attack after launching), and Expanded Hangars (carrier capacity 2 → 3).</p></div><div><b>Capture cities &amp; capitals</b><p>Break a city's defenses and remove its garrison, then move an Infantry or Armor unit in. Cities produce credits, industry and research, and repair garrisons 8% each turn. Industrial Standardization boosts city industry by up to 10%, while Military Engineering adds up to 8 percentage points to city defense regeneration. A power surrenders only when it has lost every city, its capital included: its armies disband and its mines pass to the conqueror. Lose your last city and the war is lost.</p></div><div><b>Stacking &amp; breakthroughs</b><p>Build 1–3-frame units. Each extra frame adds 70% HP and 45% attack. Damage weakens a unit: its attack falls with its remaining frame, to 70% at half and 40% when nearly destroyed. After a kill, line and mainline frames may fire once more per turn; Commander skills can inspire nearby allies or permit a short reposition; they do not raise this normal kill-chain limit. Heavy and super-heavy frames fire again after every kill, and their first kill also restores movement.</p></div><div><b>Commanders &amp; morale</b><p>Commanders lead units: each has one signature ability and branch ratings (up to 6 stars). Operation commanders come with the war and are fixed. Your commanders live in HQ → Commanders: two per faction to start (Suzaku and Cornelia, Leila and Akito, Xingke and Xianglin); recruit the rest with command tokens, promote them through eleven ranks (unit frame 112% to 160%), buy stars and wear medals. High morale gives +25% damage; low −25%, diminished −50%; confused units cannot act. Permanent combat bonuses are shown under Base stats, separately from signature skills. Julius designates an enemy for concentrated fire; Xianglin enables nearby allies to attack a designated enemy without counter-fire. Leila restores movement to allies that have fired. Jeremiah cleanses morale penalties and protects nearby allies; Emperor Lelouch disrupts enemy morale. These actions recharge every 3 turns. Zero lets a friendly unit act again without resetting kill-chain limits. Black Knights and JLF commanders are recruited in HQ and serve the Chinese Federation in Conquest.</p></div><div><b>Terrain</b><p>Plains cost 1. Forests (−15% damage taken) and mountains (−25%) cost 2. Deserts cost 1 but drain 3% of a frame each turn; tundra costs 2 and drains 2.5%. The high Himalaya and the Greenland ice cap are impassable. Float units ignore terrain costs.</p></div><div><b>Factories &amp; buildings</b><p>Each city builds one unit per turn; new units act next turn. Every city has a Knightmare factory (heavier frames at levels 2 and 3, +10 industry) and a research lab (+8 research). Research Lab III unlocks on turn ${E.FLEIJA.labTurn}; cities on a Sakuradite deposit also build a Sakuradite refinery. In Conquest, <b>Production Command</b> can auto-upgrade buildings globally and bulk-upgrade all eligible cities. Each individual city has one simple queue: choose the exact unit it should try to auto-produce each turn, or leave it off for manual production. If that unit is unavailable, the queue waits rather than substituting another frame. Automatic purchases use the same rules as manual orders and never spend below your protected credit, industry or Sakuradite reserves.</p></div><div><b>Sakuradite</b><p>${sakuraditeManual()}</p></div><div><b>F.L.E.I.J.A.</b><p>${fleijaManual()}</p></div><div><b>Fortress batteries</b><p>Capitals and fortress cities (Tokyo Settlement, St. Petersburg, Gibraltar, Cairo, Liaodong, Singapore, Panama, Pearl Harbor) carry a battery. Select your city and click a red hex to strike an enemy unit within 3 hexes for 40% of its frame. It recharges for 2 turns and is silenced while the city's defenses are down. Rivals fire theirs too.</p></div><div><b>Elite Forces</b><p>Elite Forces are persistent unique Knightmares developed in Command HQ with fragments. They deploy as one frame only, once per operation, and cost Sakuradite by rarity (${Object.entries(E.SAKURADITE.elite).map(([r, n]) => `${r} ${n}`).join(', ')}). Levels improve their base frame; signature abilities unlock at Lv.3 and reach their final form at Lv.5.</p></div><div><b>HQ research &amp; command tokens</b><p>As in World Conqueror 4, technology is researched at Command HQ with command tokens and kept across every operation and faction. The first win with each faction at each difficulty pays 250 + 150 tokens plus banked research, ×1.5 on Hard and ×2 on Challenge, with 150 more for your first win ever. Six trees (Infantry, Armor, Artillery, Sakuradite, Naval, Cities); higher tiers open after 2, 4 and 7 wins.</p></div><div><b>Difficulty</b><p>Conquest uses the three WC4-style tiers: Hard gives rival powers tier I–II research, upgrades half their units and adds reinforcements; Challenge gives them every technology, upgrades every formation, adds more reinforcements and raises rival income 25%. Story missions use the same Hard and Challenge escalation. Mission Normal keeps enemies, defenses and turn limits at full strength; it adds a few formations on your side, removes a few enemy ones and gives you 50% more starting resources.</p></div><div><b>Rival turns</b><p>Each rival power moves after you, in order. Moves off screen resolve instantly; press Skip to finish a rival turn at once. Rivals fight each other as well as you, and the neutral powers (Australia, the Middle Eastern Federation) only defend.</p></div></div><div class="info-strip">Controls: N cycles ready units · Click or Enter on a red hex attacks · Z undoes the last move · G sets a unit's destination · Escape clears the selection or closes a menu · Arrow keys move the hex cursor and Enter selects · Drag or WASD pans · Scroll / + / − zooms · 0 shows the world · H centers on your capital · Click the minimap to jump.</div><p style="font-size:12px">${NOTICE} Unit names and roles follow the <a href="https://codegeass.fandom.com/wiki/Knightmare_Frame" target="_blank" rel="noopener noreferrer">Code Geass wiki</a>; drawn artwork is original; published imagery is credited in the project’s ASSETS.md. Gameplay draws on <a href="https://apps.apple.com/sg/app/world-conqueror-4/id1258468290" target="_blank" rel="noopener noreferrer">EasyTech’s World Conqueror 4</a>. Numbers are adapted for this game.</p></section></div>`;
  focusDialog();
}
function menuDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Game menu"><div class="eyebrow">Command headquarters</div><h2>Your orders, Commander.</h2><p>Your current operation is saved automatically in this browser.</p><div class="credits"><span class="label">Credits</span><p class="notice">${NOTICE}</p><p class="notice">Free, non-commercial fan game. Unit and character names follow the Code Geass wiki; drawn artwork is original, with published imagery credited in the project’s ASSETS.md. Gameplay draws on EasyTech’s World Conqueror 4.</p></div><div class="dialog-footer"><div><button class="primary" data-action="close">Resume</button>${game.mode === 'campaign' ? '<button data-action="mission-retry">Restart mission</button><button data-action="campaign">Mission select</button><button data-action="new">Main menu</button>' : '<button data-action="new">New operation</button>'}<button data-action="help">Field manual</button></div></div></section></div>`;
  focusDialog();
}
