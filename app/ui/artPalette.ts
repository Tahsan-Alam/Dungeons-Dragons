/** Shared world colors. Art style changes geometry, never the scene's palette. */
const LIGHT_WORLD={
 ink:'#293C3B',dark:'#435652',
 sky:'#EAF2FA',sun:'#D9DDF8',mountain:'#B6CCCF',mountainEdge:'#86A6AB',hill:'#92B5A5',
 grass:'#C8E0CF',ruinGrass:'#D5DEDC',coastGrass:'#BFDCD8',grassDetail:'#86AF99',
 road:'#DCE2E8',roadDetail:'#BAC7CE',
 water:'#92BEDA',waterLight:'#CEE5F6',shore:'#ADCEDC',
 leaf:'#75A58D',leafLight:'#A7CDB9',leafDark:'#477C69',
 bark:'#8B8D85',barkLight:'#B6B8AD',
 stone:'#B5BEC7',stoneLight:'#DCE2E7',stoneDark:'#778993',stoneDeep:'#526570',
 skin:'#F2CFAA',skinShade:'#DFA579',hair:'#6B5140',enemySkin:'#99C4AB',
 metal:'#D9E3E9',metalLight:'#F0F5F8',
 accent:'#ABA4E2',accentLight:'#E7E3FF',accentDark:'#7E78B2',
 flower:'#A49DD4',flowerLight:'#E7E3FF',mushroom:'#AF94BF',
 chest:'#A6A8D0',chestOpen:'#9DAFB6',chestTrim:'#DADCF1',
 gateway:'#B6CECF',gatewayActive:'#B2A9E7',
 leafAlternate:'#96BEA9',leafThird:'#619987',route:'#477C69',glyph:'#477C69',marker:'#293C3B',healthTrack:'#293C3B',
 reachable:'#528C79',target:'#D88D91',active:'#B1B4E8',health:'#377D68',enemyHealth:'#B66E80',
} as const;
export const ART_PALETTE=Object.fromEntries(Object.entries(LIGHT_WORLD).map(([name,color])=>[name,`var(--world-${name.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}, ${color})`])) as {readonly [K in keyof typeof LIGHT_WORLD]:string};
export const TREE_TONES=[ART_PALETTE.leaf,ART_PALETTE.leafAlternate,ART_PALETTE.leafThird] as const;
