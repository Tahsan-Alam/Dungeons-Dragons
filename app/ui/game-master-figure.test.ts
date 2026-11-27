import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AETHER,NARRATOR_ACCESSORIES,NARRATOR_FORMS} from '../../game/creation.ts';
import {GAME_MASTERS} from '../../game/presets.ts';
import {HERO_COLORS} from '../../game/types.ts';
import {ownGameMaster} from '../../game/own-game-master.ts';
import {DRAWN_GM_FACE,customGameMasterSvg,gameMasterDrawing,gameMasterLook} from './game-master-figure.ts';

test('a drawn Game Master keeps one look for one name and shape',()=>{
 for(const form of NARRATOR_FORMS){
  const a=customGameMasterSvg({name:'Mother Ash',form,accessory:'none',color:HERO_COLORS[4],voice:'cedar'});
  assert.equal(customGameMasterSvg({name:' mother ash ',form,accessory:'none',color:HERO_COLORS[4],voice:'cedar'}),a);
 }
});

test('how they tell it decides what they carry',()=>{
 const look=(voice:'cedar'|'willow'|'stone')=>gameMasterLook({name:'The Lamplighter',form:'owl',accessory:'none',color:HERO_COLORS[2],voice}).prop;
 assert.equal(look('cedar'),'lantern');
 assert.equal(look('willow'),'book');
 assert.equal(look('stone'),'hourglass');
});

test('every shape and accessory draws a well-formed figure in the built-in kit',()=>{
 for(const form of NARRATOR_FORMS)for(const accessory of NARRATOR_ACCESSORIES)for(const voice of ['cedar','willow','stone','vesper'] as const)for(const name of ['Mother Ash','Bramble','The Ferryman']){
  const svg=customGameMasterSvg({name,form,accessory,color:HERO_COLORS[7],voice});
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 400 520"/);
  assert.ok(!/NaN|undefined/.test(svg),`${form} ${accessory} ${voice}`);
  assert.equal((svg.match(/<g[ >]/g)??[]).length,(svg.match(/<\/g>/g)??[]).length);
  assert.ok(svg.length<24000,`${form} stays small (${svg.length})`);
 }
});

test('built-in Game Masters keep their paintings; everyone else is drawn',()=>{
 for(const gm of GAME_MASTERS)assert.deepEqual(gameMasterDrawing(gm.profile),{art:gm.art,face:gm.face});
 const own=ownGameMaster({name:'Captain Wren',who:'',tone:'wry',form:'fox',accessory:'glasses',color:HERO_COLORS[0]})!;
 const drawn=gameMasterDrawing(own);
 assert.match(drawn.art,/^data:image\/svg\+xml;charset=utf-8,/);
 assert.deepEqual(drawn.face,DRAWN_GM_FACE);
 assert.equal(gameMasterDrawing(null).art,gameMasterDrawing(AETHER).art,'no narrator shows Aether');
 const {avatar:_,...old}=own;
 assert.match(gameMasterDrawing(old).art,/^data:image\/svg/,'a save from before shapes is still drawn');
});
