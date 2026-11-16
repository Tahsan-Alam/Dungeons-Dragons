export type BoardViewMode='2d'|'2.5d';
export type ProjectedPoint={x:number;y:number};
export type BoardProjection={
 mode:BoardViewMode;
 width:number;
 height:number;
 groundTransform:string;
 point:(worldX:number,worldY:number)=>ProjectedPoint;
 tileCenter:(x:number,y:number)=>ProjectedPoint;
};

/** How far the scene camera looks down: a tile keeps its width and shows this fraction of its depth. */
export const SCENE_DEPTH=.56;
/** Room above the back row for standing figures, wings and raised blades. */
const SCENE_TOP=150,SCENE_SIDE=48,SCENE_BOTTOM=40;

/**
 * Pure presentation geometry. Tile coordinates, movement, and saved state stay unchanged.
 * 2D is the tactical map, seen from above. 2.5D is the scene: a camera facing the board from the front and above,
 * so rows recede up the screen and every figure stands upright on its tile.
 */
export function createBoardProjection(mode:BoardViewMode,widthTiles:number,heightTiles:number):BoardProjection{
 const worldWidth=widthTiles*50,worldHeight=heightTiles*50;
 if(mode==='2d')return {mode,width:worldWidth,height:worldHeight,groundTransform:'',point:(x,y)=>({x,y}),tileCenter:(x,y)=>({x:x*50+25,y:y*50+25})};
 const point=(x:number,y:number)=>({x:x+SCENE_SIDE,y:y*SCENE_DEPTH+SCENE_TOP});
 return {mode,width:worldWidth+SCENE_SIDE*2,height:worldHeight*SCENE_DEPTH+SCENE_TOP+SCENE_BOTTOM,groundTransform:`matrix(1 0 0 ${SCENE_DEPTH} ${SCENE_SIDE} ${SCENE_TOP})`,point,tileCenter:(x,y)=>point(x*50+25,y*50+25)};
}
