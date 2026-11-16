import { readFileSync, writeFileSync } from "node:fs";
import {
  raw,
  poly,
  merged,
  bounds,
  area,
  ringArea,
  solved,
  type Pose,
  type Point,
} from "../src/geometry";
import oldLevels from "../src/levels.json";
const tile = JSON.parse(readFileSync("scripts/wood-tilings.json", "utf8"));
function match(id: number, vertices: Point[]): Pose {
  const x = vertices.reduce((s, p) => s + p[0], 0) / vertices.length,
    y = vertices.reduce((s, p) => s + p[1], 0) / vertices.length;
  for (let f = 0; f < 2; f++)
    for (let angle = 0; angle < 8; angle++) {
      const p = { x, y, angle, flip: !!f };
      if (
        poly(id, p).every((v) =>
          vertices.some((w) => Math.hypot(v[0] - w[0], v[1] - w[1]) < 1e-5),
        )
      )
        return p;
    }
  throw Error("Cannot fit " + id);
}
const shift = (p: Pose, x: number, y: number) => ({
  ...p,
  x: p.x + x,
  y: p.y + y,
});
const levels: any[] = [];
function add(name: string, story: string, poses: Pose[], outline?: Point[]) {
  const target = poses.map((p, i) => poly(i, p));
  const multi = merged(target);
  if (Math.abs(area(multi) - 8) > 0.00001 || !solved(poses, target))
    throw Error(name + " invalid");
  const outlines = outline ? [outline] : multi.map((p) => p[0]);
  levels.push({
    id: levels.length + 1,
    name,
    story,
    poses,
    outline: outlines[0],
    outlines,
    version: 4,
    difficulty: 0,
  });
}
const square = oldLevels[0].poses.map((p) => {
  const a = -Math.PI / 4;
  return {
    ...p,
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a),
    angle: (p.angle + 7) % 8,
  };
});
const sb = bounds(square.map((p, i) => poly(i, p)));
add("小木盘", "把木块收好，准备出发。", square, [
  [sb.minX, sb.minY],
  [sb.maxX, sb.minY],
  [sb.maxX, sb.maxY],
  [sb.minX, sb.maxY],
  [sb.minX, sb.minY],
]);
add("小帐篷", "搭个帐篷，去野餐吧。", tile.triangle);
const house: Pose[] = [];
house[0] = match(0, [
  [-1, 2],
  [1, 0],
  [1, 2],
]);
house[1] = match(1, [
  [1, 0],
  [3, 2],
  [1, 2],
]);
for (let i = 2; i < 7; i++) house[i] = shift(tile.sq[i], 0, 2);
add("小房子", "给小伙伴盖一间房子。", house);
const boat: Pose[] = [];
boat[0] = match(0, [
  [0.5, 2],
  [2.5, 0],
  [2.5, 2],
]);
boat[1] = match(1, [
  [2.5, 0],
  [4.5, 2],
  [2.5, 2],
]);
for (let i = 2; i < 7; i++) boat[i] = shift(tile.hull[i], 0, 2);
add("小帆船", "扬起船帆，出发！", boat);
const rocket: Pose[] = [];
rocket[0] = match(0, [
  [0, 1],
  [2, 1],
  [0, 3],
]);
rocket[1] = match(1, [
  [2, 1],
  [2, 3],
  [0, 3],
]);
rocket[2] = match(2, [
  [1, 0],
  [2, 1],
  [0, 1],
]);
rocket[3] = match(3, [
  [0.5, 3],
  [1.5, 3],
  [1.5, 4],
  [0.5, 4],
]);
rocket[4] = match(4, [
  [0, 1],
  [-1, 2],
  [-1, 3],
  [0, 2],
]);
rocket[5] = match(5, [
  [2, 1],
  [3, 2],
  [2, 2],
]);
rocket[6] = match(6, [
  [2, 2],
  [3, 2],
  [3, 3],
]);
add("小火箭", "三、二、一，飞向月亮！", rocket);
add("小石桥", "搭一座桥，让小伙伴过河。", tile.bridge);
// A tree uses a broad triangular crown and a narrow wooden trunk.
const tree: Pose[] = [];
tree[0] = match(0, [
  [0, 2],
  [2, 0],
  [2, 2],
]);
tree[1] = match(1, [
  [2, 0],
  [4, 2],
  [2, 2],
]);
for (const i of [2, 4, 5, 6]) tree[i] = shift(tile.tree[i], 0, 2);
tree[3] = match(3, [
  [1.5, 3],
  [2.5, 3],
  [2.5, 4],
  [1.5, 4],
]);
add("小松树", "种一棵树，等春天来。", tree);
// A sitting bird: two large triangles make the body, with a raised head, beak and tail.
const bird: Pose[] = [];
bird[0] = match(0, [
  [0, 1],
  [2, 1],
  [2, 3],
]);
bird[1] = match(1, [
  [0, 1],
  [2, 3],
  [0, 3],
]);
bird[2] = match(2, [
  [0, 3],
  [2, 3],
  [1, 4],
]);
bird[3] = match(3, [
  [1, 0],
  [2, 0],
  [2, 1],
  [1, 1],
]);
bird[4] = match(4, [
  [-1, 1],
  [0, 2],
  [0, 3],
  [-1, 2],
]);
bird[5] = match(5, [
  [2, 0],
  [3, 1],
  [2, 1],
]);
bird[6] = match(6, [
  [-1, 0],
  [0, 1],
  [-1, 1],
]);
add("小鸟", "小鸟准备好，要起飞啦。", bird);
writeFileSync("src/wood-levels.json", JSON.stringify(levels));
console.log(
  levels.map((l) => ({ id: l.id, name: l.name, outlines: l.outlines.length })),
);
