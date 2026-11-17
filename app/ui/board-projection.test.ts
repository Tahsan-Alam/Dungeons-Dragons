import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoardProjection} from './board-projection.ts';
import {boardPathKeyframes,initialBoardFrame,followBoardTarget} from './board-motion.ts';

test('2D projection keeps existing board coordinates and dimensions exactly',()=>{
 const projection=createBoardProjection('2d',20,14);
 assert.equal(projection.width,1000);assert.equal(projection.height,700);assert.equal(projection.groundTransform,'');
 assert.deepEqual(projection.point(100,200),{x:100,y:200});assert.deepEqual(projection.tileCenter(2,3),{x:125,y:175});
});
test('the scene camera faces the board: rows recede up the screen and leave headroom for figures',()=>{
 const p=createBoardProjection('2.5d',20,14);
 assert.deepEqual(p.point(0,0),{x:48,y:150});assert.deepEqual(p.point(1000,700),{x:1048,y:542});
 assert.equal(p.width,1096);assert.equal(p.height,582);assert.equal(p.groundTransform,'matrix(1 0 0 0.56 48 150)');
 for(const[x,y]of[[0,0],[1000,0],[0,700],[1000,700]]){const point=p.point(x,y);assert.ok(point.x>=48&&point.x<=p.width-48);assert.ok(point.y>=150&&point.y<=p.height-40);}
 for(let y=0;y<14;y++)for(let x=0;x<20;x++){const point=p.tileCenter(x,y);assert.ok(point.x>0&&point.x<p.width&&point.y>0&&point.y<p.height);}
});
test('projected cardinal routes and hitbox centers use the same coordinates',()=>{
 const p=createBoardProjection('2.5d',20,14),path=[{x:2,y:2},{x:3,y:2},{x:3,y:3}],frames=boardPathKeyframes(path,p);
 const a=p.tileCenter(2,2),b=p.tileCenter(3,2),c=p.tileCenter(3,3);
 assert.deepEqual({x:b.x-a.x,y:b.y-a.y},{x:50,y:0});assert.deepEqual({x:c.x-b.x,y:c.y-b.y},{x:0,y:28});
 assert.equal(frames[0].transform,`translate(${a.x}px, ${a.y}px)`);assert.equal(frames[2].transform,`translate(${c.x}px, ${c.y}px)`);
 assert.deepEqual(frames.map(frame=>frame.offset),[0,.5,1]);
});
test('mobile framing and following use upright actor positions in the projected board',()=>{
 const p=createBoardProjection('2.5d',20,14),viewport={width:360,height:500};
 const frame=initialBoardFrame(viewport,p,{x:10,y:7},p.tileCenter),center=p.tileCenter(10,7),scale=Math.min(viewport.width/p.width,viewport.height/p.height);
 assert.ok(Math.abs(viewport.width/2+(frame.pan.x+(center.x-p.width/2)*frame.zoom)*scale-viewport.width/2)<.001);
 const target={x:16,y:7},pan=followBoardTarget(viewport,p,frame,target,p.tileCenter);assert.ok(pan);
 const next=p.tileCenter(target.x,target.y),screenX=viewport.width/2+(pan.x+(next.x-p.width/2)*frame.zoom)*scale;
 assert.ok(screenX>=72&&screenX<=viewport.width-72);
});
