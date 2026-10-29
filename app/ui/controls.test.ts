import test from 'node:test';
import assert from 'node:assert/strict';
import {actionForKey,bindingConflict,defaultPreferences,eventBinding,normalizePreferences,panelSizes,resizePanel,CONTROL_ACTIONS,createEdgeRevealGate,bindingLabel,validBinding} from './controls.ts';
test('every action has two independent slots and defaults are unique',()=>{const {bindings}=defaultPreferences();const seen=new Set();for(const[action]of CONTROL_ACTIONS){assert.equal(bindings[action].length,2);for(const key of bindings[action])if(key){assert.ok(!seen.has(key),key);seen.add(key)}}assert.equal(actionForKey(bindings,'Space'),'replayPlay');assert.equal(actionForKey(bindings,'m'),'move');assert.equal(actionForKey(bindings,'1'),'move')});
test('custom bindings detect conflicts across alternate and primary slots',()=>{const{bindings}=defaultPreferences();assert.equal(bindingConflict(bindings,'move',1,'a'),'attack');assert.equal(bindingConflict(bindings,'move',0,'1'),null);assert.equal(bindingConflict(bindings,'move',1,'1'),'move');bindings.move[1]='z';assert.equal(actionForKey(bindings,'z'),'move');assert.equal(actionForKey(bindings,'m'),undefined)});
test('normalization recovers malformed storage without duplicate bindings',()=>{const normalized=normalizePreferences({bindings:{move:['z','z'],attack:['z','q']},panels:{left:Infinity,right:-3},confirmEnd:'yes'});assert.deepEqual(normalized.bindings.move,['z',null]);assert.deepEqual(normalized.bindings.attack,[null,'q']);assert.equal(normalized.panels,null);assert.equal(normalized.confirmEnd,false);assert.equal(normalized.bindings.guard[0],'4');assert.deepEqual(normalizePreferences(null),defaultPreferences())});
test('key recognition preserves symbols and excludes browser modifier shortcuts',()=>{const e={key:'A',shiftKey:false,ctrlKey:false,metaKey:false,altKey:false};assert.equal(eventBinding(e),'a');assert.equal(eventBinding({...e,shiftKey:true}),'Shift+a');assert.equal(eventBinding({...e,key:'+'} ),'+');assert.equal(eventBinding({...e,key:' '}),'Space');assert.equal(eventBinding({...e,ctrlKey:true}),null);assert.equal(eventBinding({...e,metaKey:true}),null);assert.equal(eventBinding({...e,key:'Tab'}),null)});
test('smart default columns preserve a useful board at every desktop width',()=>{for(const width of[1001,1024,1280,1440,1920,2560]){const sizes=panelSizes(width);assert.ok(sizes.center>=400);assert.ok(sizes.left>=160&&sizes.left<=350);assert.ok(sizes.right>=200&&sizes.right<=420);assert.ok(Math.abs(sizes.left+sizes.right+sizes.center+16-width)<=1)}});
test('saved panels scale and clamp without collapsing the board',()=>{for(const width of[1001,1280,1920]){const sizes=panelSizes(width,{left:.4,right:.4});assert.ok(sizes.center>=400);const left=resizePanel(width,sizes,'left',9999),right=resizePanel(width,sizes,'right',9999);assert.ok(width-left.left-left.right-16>=399);assert.ok(width-right.left-right.right-16>=399);assert.equal(resizePanel(width,sizes,'left',-99).left,160);assert.equal(resizePanel(width,sizes,'right',-99).right,200)}});
test('small or invalid layout measurements remain finite',()=>{for(const width of[0,100,390,NaN]){const s=panelSizes(width);assert.ok(Number.isFinite(s.left)&&Number.isFinite(s.right)&&Number.isFinite(s.center));assert.ok(s.center>=0)}});

test('dismissed hover panel stays closed under a stationary edge pointer',()=>{const gate=createEdgeRevealGate();assert.equal(gate.canOpen(),true);gate.dismiss();gate.pointerMoved(3,400,390,844);assert.equal(gate.canOpen(),false);gate.pointerMoved(7,400,390,844);assert.equal(gate.canOpen(),false);gate.pointerMoved(30,400,390,844);assert.equal(gate.canOpen(),true);gate.dismiss();gate.pointerMoved(388,400,390,844);assert.equal(gate.canOpen(),false);gate.pointerMoved(388,200,390,844);assert.equal(gate.canOpen(),true)});

function legacyPreferences(){
 const current=defaultPreferences();const bindings:Record<string,[string|null,string|null]>={...current.bindings};
 for(const direction of['Up','Down','Left','Right']){delete bindings[`move${direction}`];bindings[`pan${direction}`]=[`Arrow${direction}`,null]}
 return {...current,bindings};
}
function assertUnique(bindings:ReturnType<typeof defaultPreferences>['bindings']){const keys=Object.values(bindings).flat().filter(key=>key!==null);assert.equal(new Set(keys).size,keys.length)}
test('arrow keys move the hero; Shift arrows pan with distinct defaults',()=>{
 const {bindings}=defaultPreferences();
 for(const direction of['Up','Down','Left','Right']){assert.equal(actionForKey(bindings,`Arrow${direction}`),`move${direction}`);assert.equal(actionForKey(bindings,`Shift+Arrow${direction}`),`pan${direction}`)}
 assert.equal(eventBinding({key:'ArrowUp',shiftKey:true,ctrlKey:false,metaKey:false,altKey:false}),'Shift+ArrowUp');
 assert.equal(eventBinding({key:'ArrowUp',shiftKey:false,ctrlKey:false,metaKey:false,altKey:false}),'ArrowUp');
 assert.equal(eventBinding({key:'Home',shiftKey:true,ctrlKey:false,metaKey:false,altKey:false}),'Shift+Home');
 assert.equal(bindingLabel('Shift+ArrowUp'),'⇧ ↑');assert.equal(validBinding('Shift+ArrowLeft'),true);assert.equal(validBinding('Shift+Tab'),false);assert.equal(validBinding('Ctrl+ArrowUp'),false);
});
test('legacy default arrow panning migrates once to movement and shifted panning',()=>{
 const legacy=legacyPreferences(),migrated=normalizePreferences(legacy);
 assert.deepEqual(migrated,defaultPreferences());assert.deepEqual(normalizePreferences(migrated),migrated);assertUnique(migrated.bindings);
 assert.deepEqual(legacy.bindings.panUp,['ArrowUp',null],'normalization does not mutate stored data');
});
test('intentional legacy pan and alternate bindings survive without duplicate movement keys',()=>{
 const legacy=legacyPreferences();legacy.bindings.panUp=['w','ArrowUp'];legacy.bindings.panDown=[null,null];legacy.bindings.guard=['ArrowLeft','g'];legacy.bindings.panLeft=[null,null];
 const migrated=normalizePreferences(legacy);
 assert.deepEqual(migrated.bindings.panUp,['w','ArrowUp']);assert.deepEqual(migrated.bindings.moveUp,[null,null]);
 assert.deepEqual(migrated.bindings.panDown,[null,null]);assert.deepEqual(migrated.bindings.moveDown,['ArrowDown',null]);
 assert.deepEqual(migrated.bindings.guard,['ArrowLeft','g']);assert.deepEqual(migrated.bindings.moveLeft,[null,null]);
 assert.deepEqual(migrated.bindings.panRight,['Shift+ArrowRight',null]);assertUnique(migrated.bindings);assert.deepEqual(normalizePreferences(migrated),migrated);
});
test('custom shifted bindings take priority over migrated pan defaults',()=>{
 const legacy=legacyPreferences();legacy.bindings.attack=['Shift+ArrowUp','a'];const migrated=normalizePreferences(legacy);
 assert.deepEqual(migrated.bindings.attack,['Shift+ArrowUp','a']);assert.deepEqual(migrated.bindings.panUp,[null,null]);assert.deepEqual(migrated.bindings.moveUp,['ArrowUp',null]);assertUnique(migrated.bindings);
});
test('new directional preferences are not mistaken for legacy pan settings',()=>{
 const current=defaultPreferences();current.bindings.moveUp=[null,null];current.bindings.panUp=['ArrowUp',null];
 const normalized=normalizePreferences(current);assert.deepEqual(normalized.bindings.moveUp,[null,null]);assert.deepEqual(normalized.bindings.panUp,['ArrowUp',null]);assertUnique(normalized.bindings);
});
test('board-first defaults devote most desktop width to the board while preserving custom resizing',()=>{
 for(const width of[1001,1024,1280,1366,1440,1920,2560]){const sizes=panelSizes(width);assert.ok(sizes.left>=180&&sizes.left<=220);assert.ok(sizes.right>=200&&sizes.right<=240);assert.ok(sizes.center>width*.59,`${width}: ${sizes.center} board pixels`)}
 assert.deepEqual(panelSizes(1366),{left:191,right:219,center:940});
 const custom=panelSizes(1366,{left:.24,right:.26});assert.ok(custom.left>220&&custom.right>240,'intentional side-panel widths remain available');
});

test('chapter scenes default on for older saves and preserve explicit opt-out',()=>{assert.equal(defaultPreferences().showChapterScenes,true);assert.equal(normalizePreferences({}).showChapterScenes,true);assert.equal(normalizePreferences({showChapterScenes:false}).showChapterScenes,false);assert.equal(normalizePreferences({showChapterScenes:'false'}).showChapterScenes,true)});
