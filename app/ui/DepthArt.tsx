'use client';
import {memo} from 'react';
import type {GameState,Tile} from '../../game/types';
import type {BoardProjection} from './board-projection';
import {ART_PALETTE as P} from './artPalette';
import {Tree} from './Art';
import './depth-art.css';

type Point={x:number;y:number};
const points=(vertices:Point[])=>vertices.map(p=>`${p.x},${p.y}`).join(' ');
function local(projection:BoardProjection,x:number,y:number){const origin=projection.point(0,0),p=projection.point(x,y);return{x:p.x-origin.x,y:p.y-origin.y}}
function footprint(projection:BoardProjection,width:number,depth:number){return[local(projection,-width/2,-depth/2),local(projection,width/2,-depth/2),local(projection,width/2,depth/2),local(projection,-width/2,depth/2)]}

/** A single footprint creates all three visible faces, with no image or texture copies. */
function Prism({projection,width,depth,height,top=P.stoneLight,left=P.stone,right=P.stoneDark}:{projection:BoardProjection;width:number;depth:number;height:number;top?:string;left?:string;right?:string}){
 const floor=footprint(projection,width,depth),raised=floor.map(p=>({...p,y:p.y-height}));
 return <g className="depth-prism" stroke={P.ink} strokeOpacity=".25" strokeWidth={1} strokeLinejoin="round">
  <polygon points={points([raised[3],raised[2],floor[2],floor[3]])} fill={left}/>
  <polygon points={points([raised[2],raised[1],floor[1],floor[2]])} fill={right}/>
  <polygon points={points(raised)} fill={top}/>
  <path d={`M${raised[3].x} ${raised[3].y} ${raised[2].x} ${raised[2].y} ${raised[1].x} ${raised[1].y}`} fill="none" stroke={P.metalLight} strokeOpacity=".18" strokeWidth={1}/>
 </g>;
}

/** Only ground is transformed. Props and people remain upright and depth-sort separately. */
export const DepthTerrain=memo(function DepthTerrain({game,grid,projection}:{game:GameState;grid:boolean;projection:BoardProjection}){
 const w=game.width*50,h=game.height*50;
 const corners=[projection.point(0,0),projection.point(w,0),projection.point(w,h),projection.point(0,h)];
 const base=game.options.biome==='ruins'?P.ruinGrass:P.grass;
 return <g className={`depth-terrain`} pointerEvents="none">
  <polygon points={points([corners[3],corners[2],{...corners[2],y:corners[2].y+9},{...corners[3],y:corners[3].y+9}])} fill={P.leafDark}/>
  <polygon points={points([corners[2],corners[1],{...corners[1],y:corners[1].y+9},{...corners[2],y:corners[2].y+9}])} fill={P.stoneDeep}/>
  <g transform={projection.groundTransform}>
   <rect width={w} height={h} fill={base}/>
   {game.tiles.map(tile=>{
    const x=tile.x*50,y=tile.y*50,seed=(tile.x*17+tile.y*31)%11;
    return <g key={`${tile.x}-${tile.y}`} transform={`translate(${x} ${y})`}>
     {tile.kind==='path'?<><rect width="50" height="50" fill={P.road}/><path d={seed%2?'M8 12h10m17 22h6':'M29 10h8M10 38h6'} fill="none" stroke={P.roadDetail} strokeWidth={1.5}/></>:tile.kind==='water'?<><rect width="50" height="50" fill={P.water}/><path d={'M5 14q6-3 12 0t10 0m2 16q6-3 12 0'} fill="none" stroke={P.waterLight} strokeOpacity=".6" strokeWidth={1.5}/></>:seed<3?<path d={'m18 36-3-6m5 6 2-9m0 9 4-4'} fill={'none'} stroke={P.grassDetail} strokeOpacity=".55" strokeWidth="1.4"/>:null}
     {grid?<path d="M0 50V0h50" fill="none" stroke={P.grassDetail} strokeWidth=".8" opacity=".23"/>:null}
    </g>;
   })}
  </g>
  <polyline points={points([corners[3],corners[2],corners[1]])} fill="none" stroke={P.grassDetail} strokeWidth="1" opacity=".65"/>
 </g>;
});

export const DepthProp=memo(function DepthProp({tile,projection,faded=false}:{tile:Tile;projection:BoardProjection;faded?:boolean}){
 const at=projection.tileCenter(tile.x,tile.y),seed=tile.x*7+tile.y*13,treeSize=.75+(tile.x%3)*.08;
 if(tile.kind!=='wall'&&!tile.decoration)return null;
 return <g transform={`translate(${at.x} ${at.y})`} className={`depth-prop`} pointerEvents="none" opacity={faded?.46:1}>
  {tile.kind==='wall'&&!tile.decoration?<><ellipse cy="5" rx="27" ry="12" fill={P.ink} opacity=".12"/><Prism projection={projection} width={38} depth={35} height={25+(seed%3)*3}/><path d="m-27-1 27 13 27-13M0 12v-14" fill="none" stroke={P.stoneDeep} strokeOpacity=".45" strokeWidth={1.2}/></>:tile.decoration==='tree'?<Tree x={0} y={-24*treeSize} size={treeSize} tone={tile.x+tile.y}/>:tile.decoration==='rock'?<><ellipse cy="3" rx="19" ry="8" fill={P.ink} opacity=".13"/><Prism projection={projection} width={25} depth={24} height={10+(seed%3)*3} top={P.stone} left={P.stoneDark} right={P.stoneDeep}/><path d="m-9-13 10-5 7 4-10 5Z" fill={P.stoneLight} opacity=".5"/></>:tile.decoration==='ruin'?<><ellipse cy="5" rx="22" ry="9" fill={P.ink} opacity=".12"/><Prism projection={projection} width={29} depth={25} height={8}/><g transform="translate(-7 -5)"><Prism projection={projection} width={12} depth={15} height={34}/></g><g transform="translate(9 -2)"><Prism projection={projection} width={11} depth={15} height={25}/></g><path d="m-16-15 10 5m8-5 11-5" fill="none" stroke={P.stoneDark} strokeWidth={1.3}/></>:tile.decoration==='flower'?<><ellipse cy="3" rx="11" ry="4" fill={P.ink} opacity=".08"/><path d="M-5 1V-10m11 11V-5" stroke={P.leafDark} strokeWidth="2"/>{<><circle cx="-5" cy="-12" r="4" fill={P.flower}/><circle cx="6" cy="-7" r="3.5" fill={P.flower}/><circle cx="-6" cy="-13" r="1.5" fill={P.flowerLight}/></>}</>:tile.decoration==='mushroom'?<><ellipse cy="3" rx="12" ry="5" fill={P.ink} opacity=".1"/><path d={'M-2 1v-12h5V1Z'} fill={P.barkLight}/><path d={'M-10-10q10-20 20 0Z'} fill={P.mushroom} stroke={P.ink} strokeWidth="1"/><path d={'m-5-13 2-2m6 1 1 1'} fill={P.accentLight} stroke={P.accentLight} strokeWidth="2"/></>:null}
 </g>;
});

export function DepthChest({x,y,opened,projection}:{x:number;y:number;opened:boolean;projection:BoardProjection}){
 const at=projection.tileCenter(x,y);
 return <g transform={`translate(${at.x} ${at.y})`} className={`depth-chest`} pointerEvents="none" role="img" aria-label="Chest">
  <ellipse cy="9" rx="23" ry="10" fill={P.ink} opacity=".15"/>
  {opened?<><path d="m-18-12 8-23 28 10-8 23Z" fill={P.chest} stroke={P.ink} strokeWidth={1.4}/><path d="m-14-14 6-15 22 8-6 15Z" fill={P.chestTrim}/></>:null}
  <Prism projection={projection} width={29} depth={22} height={15} top={opened?P.stoneDeep:P.chestTrim} left={opened?P.chestOpen:P.chest} right={P.accentDark}/>
  <path d="m-19-4 19 9 19-9M-11-8v12M11-8v12" fill="none" stroke={P.chestTrim} strokeWidth={2.2}/>
  <path d="M-3-1h6v7H-3Z" fill={P.chestTrim} stroke={P.ink} strokeWidth="1"/><path d="M0 1v3" stroke={P.ink} strokeWidth="1.5"/>
 </g>;
}

export function DepthGateway({x,y,active,projection}:{x:number;y:number;active:boolean;projection:BoardProjection}){
 const at=projection.tileCenter(x,y),base=active?P.gatewayActive:P.gateway;
 return <g transform={`translate(${at.x} ${at.y})`} className={`depth-gateway`} pointerEvents="none" role="img" aria-label="Gateway">
  <ellipse cy="5" rx="29" ry="12" fill={P.ink} opacity=".12"/>
  <Prism projection={projection} width={36} depth={36} height={4} top={base} left={P.stoneDark} right={P.stoneDeep}/>
  <path d="m-15-4 15-8 15 8-15 8Z" fill="none" stroke={P.glyph} strokeWidth="1.2" strokeDasharray={'3 3'} opacity=".8"/>
  <path d="m-9-4 17 0m-5-3 5 3-5 3" fill="none" stroke={P.glyph} strokeWidth="2" strokeLinejoin="round"/>
  {active?<><path d="m0-32 5 7-5 7-5-7Z" fill={P.accentLight} stroke={P.accentDark} strokeWidth={1}/><path d="M0-17v5" stroke={P.glyph} strokeWidth="1.4" opacity=".6"/></>:null}
 </g>;
}
