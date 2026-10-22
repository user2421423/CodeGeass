/* The Tianzi loyalist uprising becomes a full Chinese civil war. */
(function(root){'use strict';
const define=root.KNIGHTMARE_ALT_HISTORY?.define||
 (typeof require==='function'?require('./scenarios-alternate-common.js').define:null);
define({
 openingTreasury:{"loyalists":{"credits":2000,"industry":500,"science":500,"sakuradite":144},"eunuchs":{"credits":2000,"industry":500,"science":500,"sakuradite":162}},
 id:'chinese-civil-war',parent:'battle-luoyang',title:'Chinese Civil War — The Imperial Restoration',
 phase:'tianzi-restoration',
 map:{britannia:'loyalists',cf:'eunuchs'},
 equipment:{loyalists:'cf',eunuchs:'cf'},
 reinforcements:{loyalists:34},
 // Zhao Hao, Gao Hai, Cheng Zhong, Xia Wang and Huang Qian are the High Eunuchs;
 // General Cao keeps his post under them. Hong Gu sides with the Empress.
 commanders:{
  loyalists:['xingke','tianzi','xianglin','honggu','leifeng','meiling','lifeng'],
  eunuchs:['zhaohao','gaohai','chengzhong','xiawang','huangqian','cao']
 },
 eliteSignatures:{xingke:'shen_hu'},
 opening:'Li Xingke leads a Tianzi-loyalist rising toward Luoyang; the High Eunuchs defend their hold over the Vermilion Forbidden City.',
 text:{
  era:'China · Alternate 2018 a.t.b.',
  intro:'The High Eunuchs survive the original coup and mobilize loyal garrisons. Li Xingke unites imperial loyalists to restore Empress Tianzi’s authority.',
  diplomacy:'Tianzi loyalists and the High Eunuchs are at war. Both use Chinese Federation Knightmares; Britannia and the Black Knights do not intervene.',
  elite:'Both Chinese armies use the native 2017 Federation Elite Force roster, including Shen Hu and Wang Hu. All four difficulties remain available.',
  focus:{loyalists:'Xuchang',eunuchs:'Luoyang'}
 },
 blurbs:{
  loyalists:'Lead Xingke and the imperial reformers against the fortified heart of the eunuch government.',
  eunuchs:'Defend Luoyang, field the existing Chinese army and put down the imperial restoration.'
 }
});})(typeof window!=='undefined'?window:globalThis);
