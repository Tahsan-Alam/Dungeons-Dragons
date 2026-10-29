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

/** Pure presentation geometry. Tile coordinates, movement, and saved state stay unchanged. */
export function createBoardProjection(mode:BoardViewMode,widthTiles:number,heightTiles:number):BoardProjection{
 const worldWidth=widthTiles*50,worldHeight=heightTiles*50;
 if(mode==='2d')return {mode,width:worldWidth,height:worldHeight,groundTransform:'',point:(x,y)=>({x,y}),tileCenter:(x,y)=>({x:x*50+25,y:y*50+25})};
 const offsetX=worldHeight*.8+32,offsetY=64;
 const point=(x:number,y:number)=>({x:.8*x-.8*y+offsetX,y:.4*x+.4*y+offsetY});
 return {mode,width:(worldWidth+worldHeight)*.8+64,height:(worldWidth+worldHeight)*.4+96,groundTransform:`matrix(.8 .4 -.8 .4 ${offsetX} ${offsetY})`,point,tileCenter:(x,y)=>point(x*50+25,y*50+25)};
}
