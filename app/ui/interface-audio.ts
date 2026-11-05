export type InterfaceSound='hover'|'click';
export const INTERFACE_SOUNDS={hover:'/audio/hover-thock.wav',click:'/audio/click-thock.wav'} as const;
/** Clicks take priority over hover/focus feedback. Rapid traversal never builds a sound queue. */
export function soundAllowed(kind:InterfaceSound,now:number,lastHover:number,lastClick:number){
 return kind==='click'?now-lastClick>=45:now-lastHover>=90&&now-lastClick>=120;
}
