/* Commander generic skills: purchased independently of each immutable signature skill. */
(function(root) {
  'use strict';
  const GENERIC_SKILLS = {
    infantry_leader:{name:'Infantry Leader',branch:'Infantry',kind:'crit',step:0.06},
    armor_leader:{name:'Armor Leader',branch:'Armor',kind:'crit',step:0.06},
    artillery_leader:{name:'Artillery Leader',branch:'Artillery',kind:'crit',step:0.06},
    raider:{name:'Raider',branch:'Infantry',kind:'damage',step:0.06},
    armored_assault:{name:'Armored Assault',branch:'Armor',kind:'damage',step:0.06},
    accuracy:{name:'Accuracy',branch:'Artillery',kind:'damage',step:0.06},
    blitzkrieg:{name:'Blitzkrieg',branch:'Armor',kind:'avoid',step:0.12},
    guerrilla:{name:'Guerrilla',branch:'Infantry',kind:'avoid',step:0.12},
    crossfire:{name:'Crossfire',kind:'counter',step:0.05},
    fortification:{name:'Fortification',kind:'defense',step:0.03},
    economic_expert:{name:'Economic Expert',kind:'credits',step:0.04},
    industrial_expert:{name:'Industrial Expert',kind:'industry',step:0.04},
    technology_expert:{name:'Technology Expert',kind:'science',step:0.04},
    bayonet_charge:{name:'Bayonet Charge',branch:'Infantry',kind:'hpPenalty',step:0.2},
    tide_of_iron:{name:'Tide of Iron',branch:'Armor',kind:'hpPenalty',step:0.2},
    artillery_barrage:{name:'Artillery Barrage',branch:'Artillery',kind:'hpPenalty',step:0.2},
    replacement:{name:'Replacement',branch:'Infantry',kind:'regen',step:0.01},
    machinist:{name:'Machinist',branch:'Armor',kind:'regen',step:0.01},
    artillery_maintenance:{name:'Artillery Maintenance',branch:'Artillery',kind:'regen',step:0.01},
  };
  (root.KnightmareData ||= {}).GENERIC_SKILLS = GENERIC_SKILLS;
  if (typeof module !== 'undefined') module.exports = { GENERIC_SKILLS };
})(typeof window !== 'undefined' ? window : globalThis);
