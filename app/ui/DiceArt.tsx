import type {ArtTheme} from './appearance';

// Skins only supply presentation colors. The face value always comes from game events.
export interface DiceSkin {light:string;face:string;shade:string;ink:string;}
export const INK_DICE:DiceSkin={light:'#cfe5f6',face:'#9dc3e6',shade:'#6f9ec9',ink:'#293c3b'};

export default function DiceArt({theme,value,rolling=false,skin=INK_DICE}:{theme:ArtTheme;value?:number;rolling?:boolean;skin?:DiceSkin}){
 const pixel=theme==='pixel';
 return <svg className={`attack-die ${pixel?'pixel-die':''} ${rolling?'is-rolling':''}`} viewBox="0 0 200 200" role="img" aria-label={rolling?'Rolling a twenty-sided die':value===undefined?'Twenty-sided die':`Twenty-sided die showing ${value}`}>
  {pixel?<path className="die-shadow" d="M55 177h90v5h10v5H45v-5h10Z"/>:<ellipse className="die-shadow" cx="100" cy="182" rx="52" ry="6"/>}
  <g className="die-body" stroke={skin.ink} strokeWidth={pixel?3:3.2} strokeLinejoin={pixel?'miter':'round'}>
   {pixel?<g shapeRendering="crispEdges">
    <path d="M96 16h8v5h12v6h12v6h12v6h12v6h12v8h8v88h-8v8h-12v6h-12v6h-12v6h-12v6h-12v5h-8v-5H84v-6H72v-6H60v-6H48v-6H36v-8h-8V53h8v-8h12v-6h12v-6h12v-6h12v-6h12Z" fill={skin.shade}/>
    <path d="M96 20h8v28h12v10h12v10h12v10h12v10h16V56h-12v-8h-12v-6h-12v-6h-12v-6h-12v-5H96Z" fill={skin.light}/>
    <path d="M96 20v28H84v10H72v10H60v10H48v10H32V56h12v-8h12v-6h12v-6h12v-6h12v-5h4Z" fill={skin.face}/>
    <path d="M96 48h8v12h8v12h8v12h8v12h8v12h8v20H56v-20h8V96h8V84h8V72h8V60h8Z" fill={skin.light}/>
    <path d="M56 128h88v8h-8v8h-8v8h-8v8h-8v8h-8v8h-8v-8h-8v-8h-8v-8h-8v-8h-8v-8h-8Z" fill={skin.face}/>
   </g>:<>
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
