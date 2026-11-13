
// Skins only supply presentation colors. The face value always comes from game events.
export interface DiceSkin {light:string;face:string;shade:string;ink:string;}
export const INK_DICE:DiceSkin={light:'var(--world-dice-light, #cfe5f6)',face:'var(--world-dice-face, #9dc3e6)',shade:'var(--world-dice-shade, #6f9ec9)',ink:'var(--world-ink, #293c3b)'};

export default function DiceArt({value,rolling=false,skin=INK_DICE}:{value?:number;rolling?:boolean;skin?:DiceSkin}){
 return <svg className={`attack-die ${rolling?'is-rolling':''}`} viewBox="0 0 200 200" role="img" aria-label={rolling?'Rolling a twenty-sided die':value===undefined?'Twenty-sided die':`Twenty-sided die showing ${value}`}>
  {<ellipse className="die-shadow" cx="100" cy="182" rx="52" ry="6"/>}
  <g className="die-body" stroke={skin.ink} strokeWidth={3.2} strokeLinejoin={'round'}>
   {<>
    <path d="m100 17 71 38 2 83-72 40-73-41 2-82Z" fill={skin.shade}/>
    <path d="m100 17 1 31-71 7Z" fill={skin.light}/>
    <path d="m100 17 71 38-70-7Z" fill={skin.face}/>
    <path d="m30 55 71-7-45 80Z" fill={skin.face}/>
    <path d="m171 55-70-7 43 80Z" fill={skin.light}/>
    <path d="m101 48 43 80-88 1Z" fill={skin.light}/>
    <path d="m56 129 45 49 43-50Z" fill={skin.face}/>
    <path d="m28 137 28-8 45 49m72-40-29-10" fill="none"/>
   </>}
   {!rolling?<text x="100" y="112" textAnchor="middle" fill={skin.ink} stroke="none" fontFamily="ui-monospace, monospace" fontSize={value===undefined?23:32} fontWeight="800">{value??'d20'}</text>:null}
  </g>
 </svg>;
}
