/* Knightmare Conquest UI: Dialogs: factory and Elite Forces, HQ research, commanders, Knightmare archive, world powers, manuals, menu. */
'use strict';
const BRANCH_LIST = ['Infantry', 'Armor', 'Artillery'];
const ELITE_FACTORY_TAB = 'Elite Forces',
  ELITE_NAVAL_TAB = 'Elite Amphibious',
  NAVAL_TAB = 'Naval',
  AIRSHIP_TAB = 'Airship';
// The city factory's tabs: the three branches, the faction's airship and Elite Forces. Naval units are built at
// the port (its own shipyard, NAVAL_TAB only), which has a separate one-unit-per-turn slot.
const shopTabs = (port = false) =>
  game.mode === 'campaign' && game.difficulty === 'elite'
    ? (port ? [] : [ELITE_FACTORY_TAB])
    : port ? [NAVAL_TAB, ELITE_NAVAL_TAB]
      : [...BRANCH_LIST, ...(E.airshipType(game, game.player) ? [AIRSHIP_TAB] : []), ELITE_FACTORY_TAB];
function openShop(id, branch = shop.branch) {
  const s = game.stations.find(s => s.id === id);
  if (!s || !interactive() || ((branch === NAVAL_TAB || branch === ELITE_NAVAL_TAB) ? (s.portOwner || s.owner) !== game.player : s.owner !== game.player)) return;
  if (game.mode === 'campaign' && game.difficulty === 'elite') branch = ELITE_FACTORY_TAB;
  shop.station = id;
  shop.branch = branch;
  if (branch === ELITE_FACTORY_TAB || branch === ELITE_NAVAL_TAB) return openEliteShop(id, branch === ELITE_NAVAL_TAB);
  const port = branch === NAVAL_TAB;
  const free = E.recruitOptions(game, s, game.player);
  const lineup = E.lineupOf(game, game.player),
    catalog =
      branch === NAVAL_TAB
        ? E.navalTypes(game, game.player)
        : branch === AIRSHIP_TAB
          ? [E.airshipType(game, game.player)]
          : game.buildable?.[game.player] || E.CLASS_ORDER.map(cls => lineup[cls]),
    // Campaign factions can deliberately reuse one frame for several class slots (Euro Britannia is the main
    // example). The factory should show that frame once, not duplicate the card for every slot it fills.
    types = [...new Set(catalog)].filter(
      k => k && (branch === NAVAL_TAB ? E.TYPES[k].naval : branch === AIRSHIP_TAB ? E.TYPES[k].air :
        E.TYPES[k].branch === branch && !E.TYPES[k].naval),
    );
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="${port ? 'Port shipyard' : 'Knightmare factory'}"><div class="dialog-head"><div><div class="eyebrow">${F(port ? (s.portOwner || s.owner) : s.owner).name} · ${port ? `Port of ${s.name} · Port level ${s.portLevel || 0}` : `${s.name} · Factory level ${s.tier}`}</div><h2>${port ? 'Launch a naval unit' : 'Roll out a Knightmare unit'}</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry, science: game.economy[game.player].science || 0, sakuradite: game.economy[game.player].sakuradite || 0 }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${shopTabs(port).map(b => `<button data-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div><label for="stack-select">Unit strength &nbsp;</label><select class="select" id="stack-select">${[1, 2, 3].map(n => `<option value="${n}" ${shop.stack === n ? 'selected' : ''}>${n} ${n === 1 ? 'frame' : 'frames'}</option>`).join('')}</select></div></div>${port ? (s.portProducedTurn === game.turn ? '<div class="info-strip">This port has launched its unit for this turn.</div>' : '<p class="description">Naval units launch onto this port hex, which must be empty: amphibious Knightmares need a level-1 port, Carrier-Battleships level 2. One a turn, separate from the city factory.</p>') : !free.length ? '<div class="info-strip">A unit is on the city. Move it off to build here again, even this turn.</div>' : '<p class="description">An empty city factory can build again in the same turn. New units deploy on the city hex and act next turn. Advanced frames also cost Sakuradite and small amounts of Research.</p>'}<div class="cards">${types
    .map(k => {
      const t = E.TYPES[k],
        n = t.naval === 'ship' ? 1 : shop.stack,
        p = E.decreePrice(E.recruitCost(game, s, k, n), s.owner === game.player ? s : null),
        can = E.canBuy(game, s, k, n),
        capacity = t.capacity ? E.carrierCapacity(game, { type: k, side: game.player }) : 0;
      return `<article class="unit-card ${!port && s.tier < t.tier ? 'locked' : ''}">${ART.unit(k, 'catalog-ship', game.player)}<span class="unit-code">${t.role} · Tier ${t.tier} · ×${n}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p>${t.desc}</p><p class="lore">${t.weapon}</p><div class="unit-spec"><span>HP ${Math.round(t.hp * (1 + 0.7 * (n - 1)))}</span><span>${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (n - 1)))}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${E.movement(game, { type: k, side: game.player })}</span>${t.seaMove ? `<span>Sea ${t.seaMove}</span>` : ''}${capacity ? `<span>Carries ${capacity}</span>` : ''}<span>${ICONS.use('rng')}${rangeText({ type: k, side: game.player })}</span></div><div class="cost">${costHTML(p)}</div>${act(`data-recruit="${k}"`, 'Roll out', can ? null : E.buyReason(game, s, k, n))}</article>`;
    })
    .join('')}</div></section></div>`;
  focusDialog();
}

// The elite's mechanical category comes from its actual class, not its freely
// worded role (such as "Elite Ace" or "Elite Command").
const ELITE_CLASS_LABELS = {
  scout: 'Scout Infantry', assault: 'Assault Infantry', raider: 'Raider Infantry',
  light: 'Light Armor', medium: 'Medium Armor', heavy: 'Heavy Armor',
  super: 'Super-heavy Armor', support: 'Support Artillery',
  rocket: 'Rocket Artillery', siege: 'Siege Artillery',
};
function eliteClassLabel(t) {
  if (t.naval === 'amphibious') return 'Amphibious';
  if (t.naval === 'ship') return 'Naval Ship';
  return ELITE_CLASS_LABELS[t.cls] || `${t.branch} · ${t.cls}`;
}
function openEliteShop(id, navalOnly = false) {
  const s = game.stations.find(v => v.id === id),
    owner = navalOnly ? (s?.portOwner || s?.owner) : s?.owner;
  if (!s || owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = navalOnly ? ELITE_NAVAL_TAB : ELITE_FACTORY_TAB;
  const p = loadProfile();
  E.eliteProfile(p);
  saveProfile(p);
  const ids = Object.keys(E.ELITE_FORCES).filter(k => {
    const e = E.ELITE_FORCES[k], t = E.TYPES[e.type];
    const allowed = E.eliteEligible(game, game.player, k);
    return allowed && !!t.naval === navalOnly &&
      (!e.scenarioOnly || (game.mode === 'scenario' && game.difficulty === 'elite'));
  }).sort(compareEliteDisplayOrder);
  const tabs = shopTabs(navalOnly)
    .map(b => `<button data-branch="${b}" class="${b === shop.branch ? 'active' : ''}">${b}</button>`)
    .join('');
  const cards = ids.map(k => {
    const e = E.ELITE_FORCES[k],
      rec = e.scenarioOnly && game.mode === 'scenario' && game.difficulty === 'elite'
        ? { level: 1, fragments: 0 } : E.eliteRecord(p, k),
      level = Math.max(1, rec?.level || 1),
      stats = E.eliteStats(k, level),
      t = E.TYPES[e.type],
      cost = E.decreePrice(E.eliteRecruitCost(game, s, k), s.owner === owner ? s : null),
      why = E.eliteDeployReason(game, s, k, p),
      ability = level >= 5 ? e.lv5Text : level >= 3 ? e.lv3Text : 'Signature ability unlocks at Elite Lv.3.';
    return `<article class="unit-card elite-card ${rec?.level ? '' : 'locked'}">${eliteCardPresentationHTML(k, level, E.movement(game, { type: e.type, side: owner, elite: k, eliteLevel: level }))}<div class="elite-fragments">${rec?.level ? 'HQ Lv.' + level : 'Locked'} · Unique ×1</div><div class="cost">${costHTML(cost)}</div>${act(`data-elite-deploy="${k}"`, rec?.level ? 'Deploy elite' : 'Locked', why, rec?.level ? 'Once per operation · one unique frame' : `Fragments ${rec?.fragments}/${E.ELITE_UNLOCK_FRAGMENTS}`)}</article>`;
  }).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Elite Force ${navalOnly ? 'shipyard' : 'factory'}"><div class="dialog-head"><div><div class="eyebrow">${F(owner).name} · ${s.name} · ${navalOnly ? `Port level ${s.portLevel || 0}` : `Factory level ${s.tier}`}</div><h2>Deploy ${navalOnly ? 'Naval Elite Forces' : 'an Elite Force'}</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry, science: game.economy[game.player].science || 0, sakuradite: game.economy[game.player].sakuradite || 0 }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${tabs}</div><div><span class="label">Unique frames · ×1 only</span></div></div><div class="info-strip">${game.mode === 'campaign'
    ? 'Story Mode: HQ-unlocked Elite Forces deploy at their upgraded HQ level (up to Lv.5), once per type per mission and only at eligible factories or ports. Scripted starting units retain their difficulty rules and do not use the deployment allowance.'
    : game.mode === 'scenario' && game.warCampaign ? 'World Campaign: HQ-unlocked Elite Forces deploy at their upgraded level (up to Lv.5), once per type per regional battle.'
    : game.mode === 'scenario' ? 'Standalone scenarios: HQ-unlocked Elite Forces deploy at their upgraded HQ level (up to Lv.5), once per type per operation. Automatically converted starting units remain Lv.1.'
    : navalOnly ? 'Amphibious elites require HQ unlocks and deploy at their upgraded HQ level in scenarios. Converted starting elites remain Lv.1.' : 'HQ-unlocked Elite Forces can be deployed once per operation. Euro Britannia borrows Britannian Elite Forces only in the European War.'}</div><div class="cards">${cards || '<p class="description">No Elite Forces are currently available to this faction.</p>'}</div></section></div>`;
  focusDialog();
}
let eliteBack = 'game',
  eliteFaction = 'britannia';
function eliteDialog(faction = eliteFaction) {
  eliteFaction = faction;
  const p = loadProfile();
  E.eliteProfile(p);
  saveProfile(p);
  const ids = Object.keys(E.ELITE_FORCES).filter(k => !E.ELITE_FORCES[k].scenarioOnly && E.ELITE_FORCES[k].faction === faction).sort(compareEliteDisplayOrder);
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
    return `<article class="unit-card elite-card ${rec.level ? '' : why ? 'locked' : 'unlock-ready'}">${ART.unit(e.type, 'catalog-ship', t.side)}<span class="unit-code">${eliteClassLabel(t)} · ${e.rarity} · ${rec.level ? `Lv.${rec.level}/${E.ELITE_MAX_LEVEL}` : 'Locked'}</span><h3>${t.name}</h3><span class="weapon-focus">${t.role} · ${e.skill}</span><p>${rec.level >= 5 ? 'Active Lv.5: ' + e.lv5Text : rec.level >= 3 ? 'Active Lv.3: ' + e.lv3Text : 'Unlocks at Lv.3: ' + e.lv3Text}</p><p class="lore">Lv.5: ${e.lv5Text}</p><div class="unit-spec"><span>HP ${stats.hp}</span><span>${ICONS.use('atk')}${stats.attack}</span><span>${ICONS.use('def')}${stats.armor}</span><span>${ICONS.use('mov')}${stats.move}</span><span>${ICONS.use('rng')}${stats.min === stats.max ? stats.max : stats.min + '–' + stats.max}</span></div><div class="elite-fragments"><b>${rec.fragments}</b> fragments${cost ? ` · ${cost} needed for ${rec.level ? 'next level' : 'unlock'}` : ''}</div>${act(`data-elite-upgrade="${k}"`, label, why, '', why ? '' : 'elite-upgrade-ready', false)}</article>`;
  }).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Elite Forces HQ"><div class="dialog-head"><div><div class="eyebrow">Command HQ · persistent across operations</div><h2>Elite Forces</h2><p>Collect fragments → unlock a unique Knightmare → raise it to Elite Lv.5. Signature abilities unlock at Lv.3 and reach their final form at Lv.5.</p></div><button class="small close" data-action="elite-close">Close</button></div><div class="tabs">${tabs}</div><div class="info-strip">Each unlocked Elite Force may deploy once per operation. Cornelia's Gloucester and the Guren Mk II unlock at Lv.1 after their third Story Mode missions. Fragment rewards go to one selected eligible Elite. Normal: Rare; Hard: Epic; Challenge: Legendary; Elite: any rarity.</div>${pendingEliteChoiceHTML(p)}<div class="cards">${cards}</div></section></div>`;
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
    wins = E.researchVictoryCount(p),
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
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ research"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation and faction</div><h2>HQ research</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(tokens)}</b> command tokens · ${wins} qualifying ${wins === 1 ? 'victory' : 'victories'} (${p.wins || 0} Conquest · ${Object.values(p.researchStoryCompletions || {}).filter(Boolean).length} Story · ${Object.values(p.researchWorldCompletions || {}).filter(Boolean).length} World)</p></div><button class="small close" data-action="research-close">Close</button></div>${tokens || Object.keys(research).length ? '' : `<div class="info-strip">HQ research prices: 100 / 200 / 300 / 400 / 500 command tokens per technology level. Unlock tiers by winning eligible Conquests and completing full Story Mode or World Campaign arcs (one credit per completed arc). Individual campaign missions do not count.</div>`}<div class="tier-row">${tiers}</div><div class="tabs">${Object.entries(
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
      ? E.roster(profile)[k] || E.defaultOfficer(k, true)
      : E.officer(game, k),
    editable = personal && owned,
    unit = game.units.find(u => u.hp > 0 && u.cmd === k && !!u.personal === personal),
    top = o.rank >= E.PROMOTE_COST.length - 1,
    stars = (n, cap) => Array.from({ length: E.MAX_RATING }, (_, i) =>
      `<i class="${i >= cap ? 'locked' : i < n ? 'on' : ''}" title="${i >= cap ? 'Locked by rank' : i < n ? 'Owned' : 'Available'}">${i >= cap ? '×' : '★'}</i>`).join('');
  generalOpen = { k, personal };
  const ratings = Object.entries(E.BRANCH_NAMES)
    .map(
      ([b, name]) =>
        `<div class="gi-rating" title="${name}: ${Math.min(o.ratings[b], E.ratingCap(o.rank,b))} of ${E.ratingCap(o.rank,b)} active stars. ${b === 'mobility' ? 'Every Mobility star adds +1 movement (1★ = +1 through 6★ = +6).' : 'Every combat star adds +5 flat base attack in this branch (1★ = +5 to 6★ = +30); stars above 3 also reduce damage taken by 3% each.'}"><span class="gi-badge ${b === 'mobility' ? 'mobility' : ''}">${b === 'mobility' ? ICONS.use('mov', 'gi-mobility-glyph', 'Mobility') : ART.unit(E.typeFor(a.side, BRANCH_ICONS[b]), '', a.side)}</span><span class="gi-rating-info"><span class="gi-name">${name}</span><span class="gi-stars">${stars(o.ratings[b], E.ratingCap(o.rank,b))}</span></span>${editable && o.ratings[b] < E.MAX_RATING ? tokenButton(`data-buy-star="${b}" data-officer="${k}" aria-label="Buy a ${name} star"`, E.starCost(profile, k, b), E.starReason(profile, k, b)) : ''}</div>`,
    )
    .join('');
  const medals = `<section class="honors-panel"><div class="honors-panel-head"><span class="label">Military honors · ${personal ? 'Permanent service record' : 'Operation recognition'}</span><button class="small" data-action="honors">Hall of Honors</button></div>${honorsForCommander(o, personal ? null : k)}${personal && !owned ? '<small>Recruit this commander to begin a permanent service record.</small>' : ''}</section>`;
  const skills = Object.entries(o.generics || {});
  const capacity = E.genericSlots(k, o);
  const skillPanel = `<div class="gi-ability" style="margin-top:12px"><span class="label">${E.commissionName(o.commission || a.commission)} Commission · Generic skills ${skills.length}/${capacity} slots</span>
    ${editable && E.commissionOf(k,o) !== 'legendary' ? `<p>${tokenButton(`data-upgrade-commission="${k}"`, E.commissionUpgradePrice(profile, k), E.upgradeCommissionReason(profile, k), 'Upgrade Commission ')}</p>` : ''}
    <p style="font-size:12px">The unique skill stays fixed. Generic skills are bought with command tokens.</p>
    ${skills.map(([id, level]) => `<div style="padding:8px 0;border-bottom:1px solid #ffffff22"><b>${esc(E.GENERIC_SKILLS[id]?.name || id)} · Lv.${level}/5</b><small style="display:block">${esc(E.genericDescription(id, level))}</small>
    ${editable ? `${level < 5 ? tokenButton(`data-buy-generic="${id}" data-officer="${k}"`, E.genericCost(level), E.genericReason(profile, k, id), 'Upgrade ') : '<span class="label">MAX</span>'}
      <small style="display:block">Replace: refund ${count(E.genericRefundPreview(profile, k, id))} tokens (90% of invested amount), minus the 40-token fee.</small>
      ${tokenButton(`data-remove-generic="${id}" data-officer="${k}"`, E.GENERIC_RESPEC_COST, E.removeGenericReason(profile, k, id), 'Replace ')}` : ''}</div>`).join('')}
    ${editable && skills.length < capacity ? `<details style="margin-top:8px"><summary>Learn generic skill (${capacity - skills.length} empty)</summary>
      <div style="max-height:230px;overflow:auto">${Object.entries(E.GENERIC_SKILLS).filter(([id]) => !o.generics?.[id]).map(([id, skill]) =>
        `<div style="padding:6px 0;border-bottom:1px solid #ffffff22"><b>${esc(skill.name)}</b><small style="display:block">${esc(E.genericDescription(id, 5))}</small>
          ${tokenButton(`data-buy-generic="${id}" data-officer="${k}"`, E.genericCost(0), E.genericReason(profile, k, id), 'Learn ')}</div>`).join('')}</div></details>` : capacity === 0 ? '<p>No generic slots at this tier.</p>' : ''}</div>`;
  const seatPanel = editable
    ? `<div class="gi-ability"><span class="label">Global High Command · ${E.highCommandUsed(profile)}/${E.highCommandCapacity(profile)}</span>
       <p>${E.commandStageName(o.rank)} · positions shared across every faction.</p>
       ${o.rank >= 8 ? `<button class="small" data-retire-commission="${k}" title="Demote to Major General, forfeit fifth/sixth stars, refund 90% of lost expenditures">Retire High Command · refund ${E.retireCommissionPreview(profile,k)} tokens</button>` : ''}
       ${E.highCommandExpansionPrice(profile) != null
         ? tokenButton('data-expand-high-command="1"', E.highCommandExpansionPrice(profile), E.expandHighCommandReason(profile), 'Expand High Command ')
         : '<small>All six purchasable positions unlocked; Challenge Pass final milestone adds a bonus position.</small>'}</div>`
    : '';
  const development = editable ? E.commanderPlan(profile, k) : null;
  const plannerPanel = development ? `<details class="commander-plan">
    <summary>Development planner · ${count(development.total)} tokens remaining</summary>
    <div class="commander-plan-rows">
      <div><span>Promotions to Supreme Commander</span><b>${count(development.promotions)}</b></div>
      ${Object.entries(development.stars).map(([branch, tokens]) =>
        `<div><span>${esc(E.BRANCH_NAMES[branch])} to 6★</span><b>${count(tokens)}</b></div>`).join('')}
      <div><span>Legendary Commission</span><b>${count(development.commission)}</b></div>
      ${development.skills.map((tokens, i) =>
        `<div><span>Generic skill slot ${i + 1} to Lv.5</span><b>${count(tokens)}</b></div>`).join('')}
      <div class="commander-plan-total"><span>Remaining token investment</span><b>${count(development.total)}</b></div>
    </div><small>Includes all four 6★ ratings, three Lv.5 generic skills and Supreme Commander rank. Costs of shared High Command seat expansions are separate. ${development.highCommandSeat ? 'All current High Command seats are occupied.' : ''}</small>
  </details>` : '';
  const footer = personal
    ? owned
      ? !top
        ? `<div class="gi-promote-row"><div><span class="label">Next rank</span><b>${E.RANKS[o.rank + 1]}</b><small>Unit frame ${Math.round(E.RANK_HP[o.rank] * 100)}% → ${Math.round(E.RANK_HP[o.rank + 1] * 100)}%</small></div>${tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(profile, k), 'Promote ')}</div>`
        : '<div class="gi-promote-row"><b>Highest rank</b></div>'
      : `<div class="gi-promote-row"><div><span class="label">Not yet one of your commanders</span><b>Recruit ${a.short}</b><small>A one-time price; then assignable in every operation and upgradable here.</small></div>${tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div>`
    : `<div class="gi-promote-row"><div><span class="label">${own ? 'Operation commander' : 'Rival commander'}</span><b>Fixed for this operation</b><small>${own ? `Operation commanders cannot be upgraded. Your own ${a.short} is developed in HQ → Commanders.` : `${F(a.side).name}. Ratings and rank shown as of this operation.`}</small></div></div>`;
  const deploymentDetails = [
    unit ? `Commanding ${E.TYPES[unit.type].short} ×${unit.stack}` : '',
    game.missionKills?.[k] ? `${game.missionKills[k]} kills this operation` : '',
  ].filter(Boolean).join(' · ');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide general-info ${a.side}" role="dialog" aria-modal="true" aria-label="Commander info"><div class="gi-head"><button class="small close" data-action="general-close" aria-label="Close">✕</button><h2>Commander Info</h2></div><div class="gi-body"><div class="gi-left"><div class="gi-nameplate"><span class="gi-stars-top">${E.commissionName(o.commission || a.commission)} Commission · ${E.genericSlots(k,o)} generic slots</span><b>${a.name}</b></div><div class="gi-portrait">${ART.portrait(k, 'gi-portrait-art')}</div><div class="gi-rank"><div class="gi-rank-line"><span class="gi-insignia">✦</span><span>${E.RANKS[o.rank]} · ${E.commandStageName(o.rank)}</span></div><div class="gi-rank-line"><span class="gi-heart">❤</span><span>${Math.round(E.RANK_HP[o.rank] * 100)}% unit frame</span></div><div class="gi-kind ${personal ? 'mine' : ''}">${personal ? 'Your commander' : own ? 'Operation commander' : 'Rival commander'}</div>${personal && o.honors?.length ? `<div class="honors-mini gi-honor-rack">${o.honors.slice(0,3).map(h=>honorIcon(h.id)).join('')}${o.honors.length>3?`<small>+${o.honors.length-3}</small>`:''}</div>` : ''}</div></div><div class="gi-right"><div class="gi-ratings">${ratings}</div><div class="gi-ability"><span class="label">${a.skill} · ${a.title}</span><p><b>${a.action ? 'Active' : 'Passive'}${a.action ? ' · Range '+(a.action.range||0)+' · '+(a.action.cooldown===0?'Once per turn':'Cooldown '+(a.action.cooldown||3)+' turns') : ''}</b></p><p>${a.desc}</p>${unit && E.commanderStatusText(game,unit) ? `<small>${esc(E.commanderStatusText(game,unit))}</small>` : ''}${commanderBaseHTML(k)}${deploymentDetails ? `<small>${esc(deploymentDetails)}</small>` : ''}</div><div class="gi-ladder"><span class="label">Rank · ${o.rank + 1} of ${editable ? E.PROMOTE_COST.length : E.RANKS.length}</span><div class="gi-pips">${(editable ? E.RANKS.slice(0, E.PROMOTE_COST.length) : E.RANKS).map((r, i) => `<i class="${i < o.rank ? 'done' : i === o.rank ? 'now' : ''}" title="${r} · ${Math.round(E.RANK_HP[i] * 100)}% unit frame${i ? ` · ${E.PROMOTE_COST[i]} tokens` : ''}"></i>`).join('')}</div></div>${skillPanel}${plannerPanel}${seatPanel}${medals}${footer}</div></div><div class="gi-foot">${personal || own ? '<button class="small" data-action="generals">HQ commanders</button>' : ''}${hqBack === 'game' ? '<button class="small" data-action="admirals">Assign commanders</button>' : ''}</div></section></div>`;
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
  const action = C(u.cmd).action, options = E.actionTargets(game, u);
  const cities = ['city', 'enemyCity'].includes(action.target), self = action.target === 'self', hex = action.target === 'hex';
  const enemy = ['enemy', 'enemyCommander', 'enemyCity'].includes(action.target) || ['designate', 'stratagem'].includes(action.kind);
  const zeroDual = u.cmd === 'zero' && action.kind === 'command';
  const button = v => hex
    ? `<button data-command="${v.id}">Hex ${v.c}, ${v.r} · ${esc(E.TERRAIN[v.terrain]?.name||v.terrain)} · near ${esc(nearestCityName(v))}</button>`
    : `<button data-command="${v.id}">${zeroDual ? (v.side === u.side ? 'Ally · Reset actions · ' : 'Enemy · Suppress counters · ') : ''}${cities ? esc(v.name)+' · '+Math.ceil(v.shield)+' / '+v.maxShield+' shields' : (v.cmd ? esc(C(v.cmd).short) + ' · ' : '') + esc(E.TYPES[v.type].short) + ' ×' + v.stack + ' · ' + esc(nearestCityName(v))}</button>`;
  const choices = zeroDual
    ? `<p><b>Friendly command</b></p>${options.filter(v => v.side === u.side).map(button).join('') || '<p>No eligible allies have acted.</p>'}<p><b>Enemy command</b></p>${options.filter(v => v.side !== u.side).map(button).join('') || '<p>No enemies in range.</p>'}`
    : options.map(button).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="${esc(action.name)}"><div class="eyebrow">${esc(action.name)} · ${action.cooldown===0?'Once per turn':'Every '+(action.cooldown||3)+' turns'}</div><h2>${zeroDual ? 'Select an ally or enemy' : self ? 'Activate ability' : hex ? 'Choose a summoning hex' : cities ? 'Select a city' : enemy ? 'Select an enemy' : 'Select an ally'}</h2><p>${esc(action.desc)}</p><div class="station-buttons">${choices}</div><div class="dialog-footer"><button data-action="close">Cancel</button></div></section></div>`;
  focusDialog();
}
function admiralDialog() {
  // Tutorial loans Suzaku locally; never import or modify the player's permanent roster.
  if (!(typeof isTutorial === 'function' && isTutorial())) E.applyRoster(game, loadProfile());
  if (!interactive()) return;
  generalOpen = null;
  hqBack = 'game';
  const u = selectedUnit(),
    own = u?.side === game.player ? u : null,
    mine = Object.keys(game.roster || {}).filter(k => E.serves(k, game.player, game)),
    scenario = game.units.filter(v => v.hp > 0 && v.side === game.player && v.cmd && !v.personal);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Unit commanders"><div class="dialog-head"><div><div class="eyebrow">High command · ${F(game.player).name}</div><h2>Commanders</h2><p>${costHTML({ credits: game.economy[game.player].credits }, true)} available · ${own && !own.cmd && E.TYPES[own.type].naval !== 'ship' ? 'Assign one of your commanders to ' + E.TYPES[own.type].name + ' ×' + own.stack : 'Select one of your units without a commander to assign one.'}</p></div><button class="small close" data-action="close">Close</button></div><div class="info-strip">Your commanders are yours to keep: assign them to any unit in any operation, even beside the operation's own version, and develop them in HQ → Commanders. Operation commanders come with the war and cannot be upgraded.</div><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(k => officerCard(k, own)).join('') || '<p class="description">No commanders for this faction yet. Recruit them in HQ → Commanders.</p>'}</div>${scenario.length ? `<h3 class="officer-section">Operation commanders</h3><div class="scenario-commanders">${scenario.map(v => `<div class="scenario-chip">${generalPortrait(v.cmd, 'chip-portrait', false)}<span><b>${C(v.cmd).short}</b><small>${E.TYPES[v.type].short} ×${v.stack} · ${E.RANKS[E.officerOf(game, v).rank]}</small></span></div>`).join('')}</div>` : ''}<div class="dialog-footer"><button data-action="generals">HQ commanders · upgrade &amp; recruit</button></div></section></div>`;
  focusDialog();
}
function officerCard(k, own) {
  const a = C(k),
    o = game.roster[k],
    busy = game.units.find(v => v.hp > 0 && v.personal && v.cmd === k);
  return `<section class="officer">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${E.commissionName(o.commission || a.commission)} Commission</span><h3>${a.name}</h3><span class="label">${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame · ${a.skill}</span><p>${a.desc}</p>${commanderBaseHTML(k)}<div class="ratings">${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(Math.min(o.ratings[b] || 0, E.ratingCap(o.rank, b)))}</span></div>`)
    .join(
      '',
    )}</div>${o.honors?.length ? `<div class="honors-mini">${o.honors.slice(0,3).map(h=>honorIcon(h.id)).join('')}</div>` : ''}<div class="officer-actions">${busy ? `<button class="small" disabled>Commanding ${E.TYPES[busy.type].short}</button>` : act(`data-admiral="${k}"`, 'Assign to selected unit', E.assignReason(game, own, k), costHTML({ credits: E.assignmentCost(game, k) }))}</div></section>`;
}
// HQ → Commanders: your persistent roster for each faction, and the commanders still to recruit.
// Euro Britannia has eight exclusive officers and four officers shared with Britannia.
// Keep this list aligned with the 2018 U.F.N. Euro Britannian starting roster.
const EURO_BRITANNIAN_COMMANDERS = ['julius', 'shin', 'ashley', 'manfredi', 'farnese', 'augustus', 'kewell', 'norland', 'gaudefroy', 'raymond', 'suzaku', 'schneizel', 'oldrin', 'marrybell'];
let generalsSide = 'all';
function generalsDialog(side = generalsSide) {
  generalsSide = side;
  generalOpen = null;
  const profile = loadProfile(),
    list = Object.entries(E.COMMANDERS).filter(([k, a]) => side === 'all' || (side === 'bk' ? ['bk', 'jlf'].includes(a.side) : side === 'eb' ? EURO_BRITANNIAN_COMMANDERS.includes(k) : side === 'britannia' ? a.side === 'britannia' : a.side === side)),
    mine = list.filter(([k]) => E.owns(profile, k)),
    locked = list.filter(([k]) => !E.owns(profile, k)),
    card = ([k, a]) => {
      const owned = E.owns(profile, k),
        o = owned ? E.roster(profile)[k] : E.defaultOfficer(k, true);
      return `<section class="officer ${owned ? '' : 'locked-officer'}">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${E.commissionName(o.commission || a.commission)} Commission</span><h3>${a.name}</h3><span class="label">${owned ? `${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame` : 'Recruitable'} · ${a.role} · ${a.skill}</span><p>${a.desc}</p>${commanderBaseHTML(k)}<div class="ratings">${Object.entries(
        E.BRANCH_NAMES,
      )
        .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(Math.min(o.ratings[b] || 0, E.ratingCap(o.rank, b)))}</span></div>`)
        .join(
          '',
        )}</div><div class="officer-actions">${owned ? `<button class="small" data-general-open="${k}">Upgrade</button>` : tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div></section>`;
    };
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ commanders"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation</div><h2>Commanders</h2><button class="small honors-launch" data-action="honors">Hall of Honors</button><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(profile.tokens || 0)}</b> command tokens · ${Object.keys(E.roster(profile)).length} commanders · Global High Command ${E.highCommandUsed(profile)}/${E.highCommandCapacity(profile)} ${E.highCommandExpansionPrice(profile) != null ? tokenButton('data-expand-high-command="1"', E.highCommandExpansionPrice(profile), E.expandHighCommandReason(profile), 'Expand High Command ') : ''}</p></div><button class="small close" data-action="generals-close">Close</button></div><div class="tabs">${['all', ...E.MAJORS, 'bk', 'eb'].map(s => `<button data-generals-side="${s}" class="${s === side ? 'active' : ''}">${s === 'all' ? 'All factions' : F(s).name}</button>`).join('')}</div><p class="description">Your commanders can lead any unit of their faction in any operation, even when the operation already fields its own version of them. Promote them and buy branch or Mobility stars with command tokens; medals become permanent personal honors, with no combat bonuses.${side === 'bk' ? ' In Conquest, Black Knights and JLF commanders lead Chinese Federation units.' : ''}</p><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(card).join('')}</div>${locked.length ? `<h3 class="officer-section">Recruit · ${locked.length}</h3><div class="admiral-grid officers">${locked.map(card).join('')}</div>` : ''}</section></div>`;
  focusDialog();
}
let archiveSide = null,
  archiveBack = 'game',
  archiveView = null,
  archiveBranch = 'Infantry';
const ARCHIVE_SIDES = [...E.MAJORS, 'eb', 'bk', 'jlf', 'neutral'],
  ARCHIVE_BRANCHES = [...BRANCH_LIST, 'Airship', 'Naval'];

// Separate playable rosters by era. Extra frames associated with a faction
// should not appear alongside its ten standard factory classes.
function archiveRoster(side, view) {
  if (side === 'cf') return E.LINEUPS.cf2017;
  return E.ROSTER[side] || {};
}
function archiveSpecialTypes(side) {
  const known = new Set(Object.values(E.ROSTER[side] || {}));
  if (side === 'cf') {
    for (const id of Object.values(E.LINEUPS.cf2017)) known.add(id);
  }
  return Object.keys(E.TYPES).filter(id => {
    const type = E.TYPES[id];
    return type.side === side && !type.elite && !type.naval && !known.has(id);
  });
}
function archiveViews(side) {
  if (side === 'cf') return [
    { id: 'world', label: 'Chinese Federation 2017',
      note: 'The native Gun-Ru, Chuyen and Shen Hu lineup used in all 2017 Conquest, scenarios, World Campaign and Story Mode encounters with the Federation.' },
    { id: 'story', label: 'Story / special',
      note: 'Special Chinese Federation machines outside the standard ten-class factory rosters. These are not generally buildable.' },
  ];
  if (side === 'neutral') return [
    { id: 'story', label: 'Special units',
      note: 'Neutral and Story Mode units. These are not a normal faction factory roster.' },
  ];
  const views = [
    { id: 'standard', label: 'Standard lineup',
      note: side === 'bk'
        ? 'The Black Knights field ten regular class slots. Additional character-specific machines belong under Story / special or Elite Forces.'
        : 'The faction\'s standard ten class slots. A mission may separately supply special starting units or a scenario-specific lineup.' },
  ];
  if (archiveSpecialTypes(side).length) views.push({
    id: 'story', label: 'Story / special',
    note: 'Additional campaign/story models not in the standard factory lineup. Some may appear as starting forces; this does not make them regular recruit options.',
  });
  return views;
}
function archiveDefaultView(side) {
  if (side !== 'cf') return side === 'neutral' ? 'story' : 'standard';
  return 'world';
}
function archiveTypes(side, branch, view = archiveDefaultView(side)) {
  if (view === 'story') return archiveSpecialTypes(side).filter(id => E.TYPES[id].branch === branch);
  if (branch === 'Airship') {
    const owner = side === 'eb' ? 'britannia' : side === 'jlf' ? 'bk' : side;
    return Object.keys(E.TYPES).filter(id => E.TYPES[id].air && E.TYPES[id].side === owner);
  }
  if (branch === 'Naval') {
    return E.NAVAL[side] ? [...new Set(Object.values(E.NAVAL[side]))] : [];
  }
  const lineup = archiveRoster(side, view);
  return [...new Set(E.CLASS_ORDER.map(cls => lineup[cls]))]
    .filter(id => id && E.TYPES[id] && !E.TYPES[id].elite && E.TYPES[id].branch === branch);
}
function archiveDialog(branch = 'Infantry', side = archiveSide || game.player, view = null) {
  if (!ARCHIVE_SIDES.includes(side)) side = game.player;
  if (side !== archiveSide) archiveView = null;
  archiveSide = side;
  const views = archiveViews(side);
  if (view) archiveView = view;
  if (!views.some(v => v.id === archiveView)) archiveView = archiveDefaultView(side);
  const branches = ARCHIVE_BRANCHES.filter(b => archiveTypes(side, b, archiveView).length);
  if (!branches.includes(branch)) branch = branches[0];
  archiveBranch = branch;
  const types = archiveTypes(side, branch, archiveView),
    f = F(side),
    landCount = new Set(BRANCH_LIST.flatMap(b => archiveTypes(side, b, archiveView))).size,
    note = views.find(v => v.id === archiveView).note +
      (branch === 'Naval' ? ' Naval units are launched from ports, not ordinary factories.' :
        branch === 'Airship' ? ' Airships are built at level-3 city factories.' : '');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Knightmare archive"><div class="dialog-head"><div><div class="eyebrow">Order of battle</div><h2>Knightmare archive</h2><p>${f.name} frames. Values shown for one frame.${f.doctrine ? ` <b>${f.doctrine}:</b> ${f.doctrineText}` : ''}</p></div><button class="small close" data-action="archive-close">Close</button></div><div class="tabs">${ARCHIVE_SIDES.map(s => `<button data-archive-side="${s}" class="${s === side ? 'active' : ''}">${F(s).short}</button>`).join('')}</div><div class="tabs" role="group" aria-label="Roster selection">${views.map(v => `<button data-archive-view="${v.id}" class="${v.id === archiveView ? 'active' : ''}">${v.label}</button>`).join('')}</div><p class="description">${landCount} distinct land model${landCount === 1 ? '' : 's'} in this selection${archiveView === 'story' ? ' (not a standard factory lineup)' : ' across the ten standard class slots'}.</p><div class="tabs">${branches.map(b => `<button data-archive-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div class="cards">${types
    .map(k => {
      const t = E.TYPES[k],
        capacity = t.capacity ? E.carrierCapacity(game, { type: k, side }) : 0;
      return `<article class="unit-card">${ART.unit(k, 'catalog-ship', side)}<span class="unit-code">${t.role} · ${t.wc} · Tier ${t.tier}${archiveView === 'story' ? ' · Special/story unit' : ''}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p style="margin-top:10px">${t.desc}</p><p class="lore">${t.lore}<br><b>${t.weapon}</b></p><div class="unit-spec"><span>HP ${t.hp}</span><span>${ICONS.use('atk')}${t.attack}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${t.min === t.max ? t.max : t.min + '–' + t.max}</span>${t.seaMove ? `<span>Sea ${t.seaMove}</span>` : ''}${capacity ? `<span>Carries ${capacity}</span>` : ''}</div><div class="cost">${costHTML(E.price(k, 1, game, side))}</div></article>`;
    })
    .join('')}</div><p class="description">${note} Elite Forces are listed separately in Elite Forces HQ.</p></section></div>`;
  focusDialog();
}
// A power's strategic weapons as intelligence sees them: projects under way and warheads ready.
function strategicText(side) {
  const projects = game.stations.filter(s => s.project?.side === side),
    eliminatorProjects = side === game.player ? game.stations.filter(s => s.eliminatorProject?.side === side) : [],
    eliminators = side === game.player ? game.stations.filter(s => s.owner === side && s.eliminator) : [],
    carriers = side === game.player ? E.eliminatorCharges(game, side).filter(h => h.unit) : [],
    warheads = game.arsenal?.[side] || 0,
    parts = [
      ...projects.map(s => `F.L.E.I.J.A. building in ${s.name} (turn ${s.project.ready})`),
      ...(warheads ? [`F.L.E.I.J.A. ×${warheads} ready`] : []),
      ...eliminatorProjects.map(s => `Eliminator building in ${s.name} (turn ${s.eliminatorProject.ready})`),
      ...eliminators.map(s => `Eliminator awaiting a carrier at ${s.name}`),
      ...carriers.map(h => `Eliminator carried by ${E.eliminatorHolderName(h)}`),
    ];
  return parts.length ? `<span class="fleija-text">${parts.join(' · ')}</span>` : '—';
}
// The war at a glance: each power's cities, income, army and capital.
function powersDialog() {
  const rows = (game.majors || E.MAJORS).map(side => {
    const inc = E.income(game, side),
      cities = game.stations.filter(s => s.owner === side).length,
      army = game.units.filter(u => u.hp > 0 && u.side === side).length,
      fall = game.fallen?.[side];
    return `<tr class="${side === game.player ? 'mine' : ''}"><td><span class="legend-dot" style="background:${F(side).color}"></span> ${F(side).name}</td><td>${fall ? `Surrendered to the ${F(fall.by).short} (turn ${fall.turn})` : F(side).capital}${game.era === 'ufn2018' ? `<small> · ${side === 'cf' ? 'Hostile to both Britannian powers' : 'Allied with ' + F(side === 'eb' ? 'britannia' : 'eb').short}</small>` : ''}</td><td>${cities}</td><td>${fall ? '—' : '+' + inc.credits}</td><td>${fall ? '—' : '+' + inc.sakuradite}</td><td>${fall ? '—' : strategicText(side)}</td><td>${army}</td></tr>`;
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
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="World powers"><div class="dialog-head"><div><div class="eyebrow">Turn ${game.turn} · No turn limit</div><h2>World powers</h2></div><button class="small close" data-action="close">Close</button></div><table class="powers"><thead><tr><th>Power</th><th>Capital</th><th>Cities</th><th>Income</th><th>Sakuradite</th><th>Strategic</th><th>Units</th></tr></thead><tbody>${rows}<tr><td><span class="legend-dot" style="background:#d8cfa6"></span> Neutral powers</td><td>${game.era === 'ufn2018' ? 'Sydney · Australia (neutral)' : 'Australia · Middle East'}</td><td>${neutral}</td><td>—</td><td>—</td><td>—</td><td>${game.units.filter(u => u.hp > 0 && u.side === 'neutral').length}</td></tr></tbody></table>${deposits ? `<span class="label">Sakuradite deposits</span><div class="deposit-list">${deposits}</div>` : ''}<p class="description">${game.era === 'ufn2018' ? 'Britannia and Euro Britannia are permanent allies with independent armies and economies. The U.F.N. fights both. Australia is neutral and never required for victory. Conquest continues until either the U.F.N. or the Britannian alliance controls all opposing cities; there is no turn limit.' : `A power surrenders only when it has lost every city: its armies disband and its mines pass to the conqueror. Capitals are the richest cities, not a knockout. Win only when every rival has surrendered. There is no turn limit.`}</p></section></div>`;
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
  return `The Sakuradite superweapon is conquest-only, not permanent HQ research. Research Lab III unlocks for every major power on turn ${f.labTurn} in the 2017 World War or turn ${f.ufnLabTurn} in the 2018 U.F.N. conquest; a city with a level-${f.lab} lab can then build a warhead for ${c.credits} credits, ${c.industry} industry, ${c.science} research and ${c.sakuradite} Sakuradite over ${f.turns} turns and builds nothing else meanwhile. Every power is alerted when work begins, and capturing the city ends the project. Launch one warhead from the arsenal button at any hex. In 2018 Britannia and Euro Britannia share a single construction/arsenal allowance; each pays for and launches its own warheads from its own economy, and a human Britannian commander has first claim over their allied AI when ready to build. In 2017 each faction has its own one-warhead allowance. Ground zero: every unit is erased, a city there is destroyed for the rest of the war and only its ruins remain (a power that loses its last city this way surrenders to the launcher; you cannot strike your own last city), a Sakuradite deposit there never produces again, and the land becomes a crater. The ring around it: units are left at ${Math.round(f.ringHP * 100)}% with collapsed morale; cities lose their defenses and a level of every building. The first successful detonation starts Eliminator research for every power: ${e.research} turns later, level-${e.lab} labs can build a F.L.E.I.J.A. Eliminator for ${ec.credits} credits, ${ec.industry} industry, ${ec.science} research and ${ec.sakuradite} Sakuradite over ${e.turns} turns. A finished charge waits in its city until a unit in or next to the city takes it (Take Eliminator on the unit, or Give in the city panel); it then moves with that unit, so you can assign it to an important commander. A carrier can hand it to an adjacent unit or store it in an adjacent city, once a turn. Up to ${e.max} charges per power, one per city or unit. A ready charge automatically neutralizes one incoming warhead aimed within ${e.range} hexes of whoever holds it (a waiting charge covers its city, including on its completion turn before the defender's phase). Destroying the carrier, or capturing or ruining a city holding a charge, destroys it. Enemy Eliminators and their carriers are classified. The blast itself spares no one, including your own forces.`;
}
function helpDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Field manual">
    <div class="dialog-head"><div><div class="eyebrow">Field manual</div><h2>Controls &amp; mechanics</h2></div><button class="small close" data-action="help-close">Close</button></div>

    <section class="shortcut-reference" aria-labelledby="keyboard-shortcuts-heading">
      <h3 id="keyboard-shortcuts-heading">Keyboard shortcuts</h3>
      <p class="shortcut-note">Battlefield shortcuts work when no dialog or text field is active. Unit commands require an eligible friendly unit; disabled actions cannot be forced with a shortcut.</p>
      <div class="shortcut-grid">
        <section class="shortcut-group" aria-label="Unit commands">
          <h4>Unit commands &amp; orders</h4>
          <dl>
            <div><dt><kbd>A</kbd></dt><dd>Assign a commander to a unit without one (not ships)</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Add a frame / reinforce an eligible non-Elite unit</dd></div>
            <div><dt><kbd>R</kbd></dt><dd>Repair the selected unit, when repairs are available</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>Hold position; use the unit's remaining actions</dd></div>
            <div><dt><kbd>G</kbd></dt><dd>Choose or change the selected unit's auto-move destination</dd></div>
            <div><dt><kbd>C</kbd></dt><dd>Clear a standing destination or cancel destination selection</dd></div>
            <div><dt><kbd>Z</kbd></dt><dd>Undo an eligible move before attacking</dd></div>
          </dl>
        </section>
        <section class="shortcut-group" aria-label="Map and turn commands">
          <h4>Map &amp; turn</h4>
          <dl>
            <div><dt><kbd>N</kbd></dt><dd>Go to the next ready unit</dd></div>
            <div><dt><kbd>Enter</kbd></dt><dd>End your turn (not when a button or link is focused)</dd></div>
            <div><dt><kbd>Space</kbd></dt><dd>Select / act on the hovered hex when the map canvas is focused</dd></div>
            <div><dt><kbd>Arrow keys</kbd></dt><dd>Move the hex cursor, centering the map if necessary</dd></div>
            <div><dt><kbd>V</kbd></dt><dd>Toggle the strategic army-group overlay in Conquest or Scenarios</dd></div>
            <div><dt><kbd>0</kbd></dt><dd>Zoom out to the world view</dd></div>
            <div><dt><kbd>+</kbd> / <kbd>=</kbd></dt><dd>Zoom in</dd></div>
            <div><dt><kbd>−</kbd></dt><dd>Zoom out</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Cancel targeting, routing or selection; close the carrier hold</dd></div>
          </dl>
        </section>
        <section class="shortcut-group" aria-label="Carrier commands">
          <h4>Carrier deployment</h4>
          <dl>
            <div><dt><kbd>D</kbd></dt><dd>Open or close the selected ship's carrier hold</dd></div>
            <div><dt><kbd>1</kbd></dt><dd>Choose the first cargo row while the hold is open</dd></div>
            <div><dt><kbd>2</kbd></dt><dd>Choose the second cargo row while the hold is open</dd></div>
          </dl>
        </section>
        <section class="shortcut-group" aria-label="Menus and keyboard navigation">
          <h4>Menus &amp; navigation</h4>
          <dl>
            <div><dt><kbd>Esc</kbd></dt><dd>Close a dialog or return to the previous screen where supported</dd></div>
            <div><dt><kbd>V</kbd></dt><dd>Toggle strategic overlay even while the Army Groups dialog is open</dd></div>
            <div><dt><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd></dt><dd>Move focus forward or backward within a dialog</dd></div>
            <div><dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt><dd>Activate focused mode cards or commander portraits</dd></div>
          </dl>
        </section>
      </div>
      <p class="shortcut-note">Other map controls: drag to pan and scroll to zoom. WASD does not pan.</p>
    </section>
    <div class="help-grid">
      <div><b>Movement &amp; combat</b><p>Select a unit; click <b>green</b> hexes to move and <b>red</b> hexes to attack. Units normally move and attack once per turn; attacking ends movement. Some Armor units can attack again after a kill. Defending units can counterattack when in range. Hold consumes the unit's remaining actions.</p></div>
      <div><b>Standing orders</b><p>Press <b>G</b>, then click a destination. The unit moves toward it automatically at the beginning of your turns, but never attacks automatically. Press <b>C</b> to stop. You can still attack after an automatic move if eligible.</p></div>
      <div><b>Carriers &amp; amphibious units</b><p>Carriers hold Knightmares: select a carrier, press <b>D</b> (or choose <b>Deploy units</b>), press <b>1</b> for the first cargo row or <b>2</b> for the second (or click Launch), then choose a highlighted land hex. Units can launch the same turn they board and act after launching. Amphibious frames, sea transports and carrier troops can capture undefended enemy cities on landing, even with defenses remaining; carriers cannot occupy cities. Portman-type amphibious units fight at sea and regain movement and attack once per turn when landing.</p></div>
      <div><b>Cities &amp; victory</b><p>Normally reduce city defenses, clear its garrison, then capture with Infantry or Armor. Naval landings can seize an empty city without bombardment. Cities fund construction and research; units occupying production hexes can block new builds. Conquest requires taking <b>every enemy city</b>, not just the capital.</p></div>
      <div><b>Upgrades, ports &amp; resources</b><p>Friendly cities enable frame reinforcement and repairs. Upgraded ports unlock heavier naval units but do not automatically heal docked ships. Spend credits and industry on units and buildings; use research to improve capabilities. Sakuradite is required by some advanced units and technologies.</p></div>
      <div><b>Terrain &amp; special weapons</b><p>Forests and mountains protect defenders; deserts and tundra can cause attrition. Coast hexes are part land, part water: land units stand and fight there as on land (an embarked unit that reaches one lands), warships sail through them, and one unit holds the hex. Morale changes combat strength. F.L.E.I.J.A. warheads can devastate units and cities, including your own forces—check the target carefully.</p></div>
    </div>
    <div class="info-strip">Tip: all selected-unit actions are in the bottom bar. Carrier cargo opens in the side panel; the map stays usable for landing selection.</div>
  </section></div>`;
  focusDialog();
}
function menuDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Game menu"><div class="eyebrow">Command headquarters</div><h2>Your orders, Commander.</h2><p>Your current operation is saved automatically in this browser.</p><div class="credits"><span class="label">Credits</span><p class="notice">${NOTICE}</p><p class="notice">Free, non-commercial fan game. Unit and character names follow the Code Geass wiki; drawn artwork is original, with published imagery credited in the project’s ASSETS.md.</p></div><div class="dialog-footer"><div><button class="primary" data-action="close">Resume</button>${game.mode === 'campaign' ? '<button data-action="mission-retry">Restart mission</button><button data-action="campaign">Mission select</button><button data-action="new">Main menu</button>' : '<button data-action="new">New operation</button>'}<button data-action="help">Field manual</button></div></div></section></div>`;
  focusDialog();
}
