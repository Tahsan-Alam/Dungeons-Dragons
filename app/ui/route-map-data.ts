/* Generated from the approved World page (design canvas, version 113) by the team's map exporter. Coordinates are in the
   1200 x 760 space of public/art/world/lantern-marches.svg. Each road is one cubic Bézier: start, two controls, end. */
export type Point=readonly [number,number];
export type Segment=readonly [Point,Point,Point,Point];
export const MAP_SIZE={width:1200,height:760} as const;
export const ROADS={"w1":[[110,480],[170,470],[250,455],[320,445]],"w2":[[320,445],[410,440],[500,436],[610,430]],"shrine":[[320,445],[300,392],[268,326],[225,282]],"n1":[[610,430],[612,395],[618,370],[616,342]],"n2":[[616,342],[548,318],[664,262],[602,214]],"n3":[[602,214],[628,178],[612,140],[655,102]],"h1":[[610,430],[668,478],[716,512],[780,512]],"h2":[[780,512],[852,512],[898,540],[905,598]],"cw":[[905,598],[932,612],[962,624],[1000,636]],"q1":[[1000,636],[1024,614],[1046,600],[1072,592]],"q2":[[1072,592],[1100,584],[1120,570],[1142,562]]} as const satisfies Record<string,Segment>;
export type RoadId=keyof typeof ROADS;
export const WAYMARKS:Record<RoadId,readonly number[]>={"w1":[0.5],"w2":[0.3,0.62],"shrine":[0.5],"n1":[0.5],"n2":[0.5],"n3":[0.5],"h1":[0.5],"h2":[0.45],"cw":[],"q1":[0.5],"q2":[0.5]};
export const CROSSING:Point=[610,430];
export const FORD:Point=[452,330];
