export const CONTROL_KEY = 'painted-realms.controls.v1';
export const CONTROL_ACTIONS = [
 ['move','Move','Actions'],['moveUp','Move up','Actions'],['moveDown','Move down','Actions'],['moveLeft','Move left','Actions'],['moveRight','Move right','Actions'],['attack','Attack','Actions'],['ability','Class power','Actions'],['guard','Guard','Actions'],['potion','Potion','Actions'],['interact','Chest / gateway','Actions'],['end','End turn','Actions'],
 ['fit','Fit board','Board'],['focus','Center on your hero','Board'],['zoomIn','Zoom in','Board'],['zoomOut','Zoom out','Board'],['grid','Toggle grid','Board'],['panUp','Pan up','Board'],['panDown','Pan down','Board'],['panLeft','Pan left','Board'],['panRight','Pan right','Board'],
 ['replayPlay','Play / pause replay','Replay'],['replayPrevious','Previous replay step','Replay'],['replayNext','Next replay step','Replay'],['replayStart','Replay start','Replay'],['replayEnd','Replay end','Replay'],
 ['party','Party panel','Navigation'],['story','Adventure log','Navigation'],['settings','Settings','Navigation'],['menu','Save and return to adventures','Navigation'],
] as const;
export type ControlAction = typeof CONTROL_ACTIONS[number][0];
export type Bindings = Record<ControlAction,[string|null,string|null]>;
export interface ControlPreferences {bindings:Bindings;panels:{left:number;right:number}|null;confirmEnd:boolean;edgeReveal:boolean;showChapterScenes:boolean;}
export const DEFAULT_BINDINGS:Bindings={move:['1','m'],moveUp:['ArrowUp',null],moveDown:['ArrowDown',null],moveLeft:['ArrowLeft',null],moveRight:['ArrowRight',null],attack:['2','a'],ability:['3','p'],guard:['4','g'],potion:['5','h'],interact:['f',null],end:['e',null],fit:['0','Home'],focus:['c',null],zoomIn:['+','='],zoomOut:['-','_'],grid:['b',null],panUp:['Shift+ArrowUp',null],panDown:['Shift+ArrowDown',null],panLeft:['Shift+ArrowLeft',null],panRight:['Shift+ArrowRight',null],party:['[',null],story:[']',null],settings:[',',null],menu:['Escape',null],replayPlay:['Space',null],replayPrevious:['PageUp',null],replayNext:['PageDown',null],replayStart:['Shift+s',null],replayEnd:['End',null]};
export function defaultPreferences():ControlPreferences{return {bindings:structuredClone(DEFAULT_BINDINGS),panels:null,confirmEnd:false,edgeReveal:false,showChapterScenes:true};}
const validNamed=new Set(['Home','End','PageUp','PageDown','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Space','Enter','Backspace','Delete']);
export function validBinding(key:unknown):key is string{
 if(typeof key!=='string')return false;
 if(key.startsWith('Shift+')){const base=key.slice(6);return /^[a-z]$/.test(base)||validNamed.has(base)}
 return key.length===1&&!/[\u0000-\u001f]/.test(key)||validNamed.has(key);
}
const DIRECTIONAL_ACTIONS=['moveUp','moveDown','moveLeft','moveRight'] as const;
const LEGACY_PAN_KEYS:Partial<Record<ControlAction,string>>={panUp:'ArrowUp',panDown:'ArrowDown',panLeft:'ArrowLeft',panRight:'ArrowRight'};
/** Preserve explicit user assignments before adding defaults for newly introduced actions. */
export function normalizePreferences(value:unknown):ControlPreferences{
 const defaults=defaultPreferences();if(!value||typeof value!=='object')return defaults;const v=value as Partial<ControlPreferences>;
 const legacy=!DIRECTIONAL_ACTIONS.some(action=>Object.prototype.hasOwnProperty.call(v.bindings||{},action));
 const candidates=new Map<ControlAction,{pair:unknown[];explicit:boolean}>();
 for(const[action]of CONTROL_ACTIONS){
  const stored=v.bindings?.[action],oldArrow=LEGACY_PAN_KEYS[action];
  const oldDefault=legacy&&oldArrow&&Array.isArray(stored)&&stored.length===2&&stored[0]===oldArrow&&stored[1]===null;
  const explicit=Array.isArray(stored)&&!oldDefault;
  candidates.set(action,{pair:explicit?stored:defaults.bindings[action],explicit});
 }
 const used=new Set<string>(),bindings={} as Bindings;
 // Old custom keys take priority over new or migrated defaults, regardless of action order.
 for(const explicit of[true,false])for(const[action]of CONTROL_ACTIONS){const candidate=candidates.get(action)!;if(candidate.explicit!==explicit)continue;
  bindings[action]=[0,1].map(slot=>{const key=candidate.pair[slot];if(!validBinding(key)||used.has(key))return null;used.add(key);return key}) as [string|null,string|null];
 }
 return {bindings,panels:v.panels&&Number.isFinite(v.panels.left)&&Number.isFinite(v.panels.right)?{left:Math.max(.1,Math.min(.4,v.panels.left)),right:Math.max(.1,Math.min(.4,v.panels.right))}:null,confirmEnd:v.confirmEnd===true,edgeReveal:v.edgeReveal===true,showChapterScenes:v.showChapterScenes!==false};
}
export function bindingConflict(bindings:Bindings,action:ControlAction,slot:number,key:string):ControlAction|null{for(const [other]of CONTROL_ACTIONS)for(let i=0;i<2;i++)if((other!==action||i!==slot)&&bindings[other][i]===key)return other;return null;}
export function eventBinding(event:Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'altKey'|'shiftKey'>):string|null{
 if(event.ctrlKey||event.metaKey||event.altKey)return null;let key=event.key===' '?'Space':event.key;if(key.length===1&&/[a-z]/i.test(key))key=event.shiftKey?`Shift+${key.toLowerCase()}`:key.toLowerCase();else if(event.shiftKey&&validNamed.has(key))key=`Shift+${key}`;return validBinding(key)?key:null;
}
export function bindingLabel(key:string|null):string{if(!key)return '—';if(key.startsWith('Shift+'))return `⇧ ${bindingLabel(key.slice(6))}`;return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'Esc',' ':'Space'} as Record<string,string>)[key]||key.toUpperCase();}
export function actionForKey(bindings:Bindings,key:string|null):ControlAction|undefined{return key?CONTROL_ACTIONS.find(([action])=>bindings[action].includes(key))?.[0]:undefined;}
export function panelSizes(width:number,preferred:ControlPreferences['panels']=null){
 const w=Math.max(0,Number.isFinite(width)?width:0),available=Math.max(0,w-16),centerMin=Math.min(400,available*.5);let left=preferred?w*preferred.left:Math.max(180,Math.min(220,w*.14));let right=preferred?w*preferred.right:Math.max(200,Math.min(240,w*.16));
 left=Math.max(160,Math.min(350,left));right=Math.max(200,Math.min(420,right));const maxSides=Math.max(0,available-centerMin);if(left+right>maxSides){const scale=maxSides/(left+right);left*=scale;right*=scale;}
 return {left:Math.round(left),right:Math.round(right),center:Math.max(0,Math.round(available-left-right))};
}
export function resizePanel(width:number,current:{left:number;right:number},side:'left'|'right',next:number){
 const max=width-16-400-(side==='left'?current.right:current.left);return {...current,[side]:Math.max(side==='left'?160:200,Math.min(side==='left'?350:420,max,next))};
}
/** Dismissed hover panels stay closed until the pointer actually leaves an edge. */
export function createEdgeRevealGate(){
 let dismissed=false;
 return {canOpen:()=>!dismissed,dismiss:()=>{dismissed=true},pointerMoved:(x:number,y:number,width:number,height:number)=>{
  const atEdge=(x<=12||x>=width-12)&&y>=height*.35&&y<=height*.7;
  if(!atEdge)dismissed=false;
 }};
}
