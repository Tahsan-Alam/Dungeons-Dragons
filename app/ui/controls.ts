export const CONTROL_KEY = 'painted-realms.controls.v1';
export const CONTROL_ACTIONS = [
 ['move','Move','Actions'],['attack','Attack','Actions'],['ability','Class power','Actions'],['guard','Guard','Actions'],['potion','Potion','Actions'],['interact','Chest / gateway','Actions'],['end','End turn','Actions'],
 ['fit','Fit board','Board'],['focus','Center on your hero','Board'],['zoomIn','Zoom in','Board'],['zoomOut','Zoom out','Board'],['grid','Toggle grid','Board'],['panUp','Pan up','Board'],['panDown','Pan down','Board'],['panLeft','Pan left','Board'],['panRight','Pan right','Board'],
 ['replayPlay','Play / pause replay','Replay'],['replayPrevious','Previous replay step','Replay'],['replayNext','Next replay step','Replay'],['replayStart','Replay start','Replay'],['replayEnd','Replay end','Replay'],
 ['party','Party panel','Navigation'],['story','Journal panel','Navigation'],['settings','Settings','Navigation'],['menu','Save and return to games','Navigation'],
] as const;
export type ControlAction = typeof CONTROL_ACTIONS[number][0];
export type Bindings = Record<ControlAction,[string|null,string|null]>;
export interface ControlPreferences {bindings:Bindings;panels:{left:number;right:number}|null;confirmEnd:boolean;edgeReveal:boolean;}
export const DEFAULT_BINDINGS:Bindings={move:['1','m'],attack:['2','a'],ability:['3','p'],guard:['4','g'],potion:['5','h'],interact:['f',null],end:['e',null],fit:['0','Home'],focus:['c',null],zoomIn:['+','='],zoomOut:['-','_'],grid:['b',null],panUp:['ArrowUp',null],panDown:['ArrowDown',null],panLeft:['ArrowLeft',null],panRight:['ArrowRight',null],party:['[',null],story:[']',null],settings:[',',null],menu:['Escape',null],replayPlay:['Space',null],replayPrevious:['PageUp',null],replayNext:['PageDown',null],replayStart:['Shift+s',null],replayEnd:['End',null]};
export function defaultPreferences():ControlPreferences{return {bindings:structuredClone(DEFAULT_BINDINGS),panels:null,confirmEnd:false,edgeReveal:false};}
const validNamed=new Set(['Home','End','PageUp','PageDown','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Space','Enter','Backspace','Delete']);
export function validBinding(key:unknown):key is string{return typeof key==='string'&&(key.length===1&&!/[\u0000-\u001f]/.test(key)||validNamed.has(key)||/^Shift\+[a-z]$/.test(key));}
export function normalizePreferences(value:unknown):ControlPreferences{
 const defaults=defaultPreferences();if(!value||typeof value!=='object')return defaults;const v=value as Partial<ControlPreferences>;
 const used=new Set<string>();const bindings={} as Bindings;
 for(const [action] of CONTROL_ACTIONS){const pair=v.bindings?.[action];bindings[action]=[0,1].map(slot=>{const key=Array.isArray(pair)?pair[slot]:defaults.bindings[action][slot];if(!validBinding(key)||used.has(key))return null;used.add(key);return key}) as [string|null,string|null];}
 return {bindings,panels:v.panels&&Number.isFinite(v.panels.left)&&Number.isFinite(v.panels.right)?{left:Math.max(.1,Math.min(.4,v.panels.left)),right:Math.max(.1,Math.min(.4,v.panels.right))}:null,confirmEnd:v.confirmEnd===true,edgeReveal:v.edgeReveal===true};
}
export function bindingConflict(bindings:Bindings,action:ControlAction,slot:number,key:string):ControlAction|null{for(const [other]of CONTROL_ACTIONS)for(let i=0;i<2;i++)if((other!==action||i!==slot)&&bindings[other][i]===key)return other;return null;}
export function eventBinding(event:Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'altKey'|'shiftKey'>):string|null{
 if(event.ctrlKey||event.metaKey||event.altKey)return null;let key=event.key===' '?'Space':event.key;if(key.length===1&&/[a-z]/i.test(key))key=event.shiftKey?`Shift+${key.toLowerCase()}`:key.toLowerCase();return validBinding(key)?key:null;
}
export function bindingLabel(key:string|null){if(!key)return '—';return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'Esc',' ':'Space'} as Record<string,string>)[key]||key.replace(/^Shift\+/,'⇧ ').toUpperCase();}
export function actionForKey(bindings:Bindings,key:string|null):ControlAction|undefined{return key?CONTROL_ACTIONS.find(([action])=>bindings[action].includes(key))?.[0]:undefined;}
export function panelSizes(width:number,preferred:ControlPreferences['panels']=null){
 const w=Math.max(0,Number.isFinite(width)?width:0),available=Math.max(0,w-16),centerMin=Math.min(400,available*.5);let left=preferred?w*preferred.left:Math.max(190,Math.min(280,w*.17));let right=preferred?w*preferred.right:Math.max(230,Math.min(350,w*.22));
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
